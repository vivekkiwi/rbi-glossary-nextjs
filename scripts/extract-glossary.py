"""Re-extract the RBI English-Hindi banking glossary from the tagged source PDF.

How it works:
  * Entry boundaries come from the PDF's own structure tree: every glossary entry
    is a table row (TR) with an English cell and a Hindi cell (TD). This replaces
    guessing from line spacing, which InDesign's vertical justification makes
    unreliable.
  * pdfplumber reads the structure tree and the marked-content id (MCID) of every
    glyph, but decodes this font's Hindi wrongly.
  * PyMuPDF decodes the Hindi correctly (right matra order) but emits duplicate
    characters for ligature glyphs; those are removed (see clean_chars).
  * Each PyMuPDF line is assigned to the table cell that most of its glyphs belong
    to (matched to pdfplumber glyphs by position). Lines keep PyMuPDF's character
    order, so ligatures stay intact.

Source: "RBI Banking Glossary (New Edition)" PDF, 8th edition (2023).

Setup:  python3 -m venv .venv && .venv/bin/pip install pymupdf pdfplumber
Usage:  .venv/bin/python scripts/extract-glossary.py <glossary.pdf> public/terms.json report.txt
Writes the app format: [{"en", "hi", "letter"}], in glossary order. report.txt lists
anything that could not be placed in a cell (expect only page numbers/headers).
"""
import bisect
import json
import re
import sys
import unicodedata
from collections import defaultdict

import fitz
import pdfplumber

pdf_path, out_path, report_path = sys.argv[1:4]
FIRST_PAGE, LAST_PAGE = 10, 235  # glossary pages (printed pages 1-226)


def clean_chars(chars):
    """chars: list of dicts with c, w. Drop ligature duplicates.

    A duplicate is a 1-4 char run that repeats the run just before it, where that
    earlier run is zero-width (the invisible ToUnicode text of a ligature glyph).
    Legit doubled letters (ममता, सम्मान) never repeat a zero-width run.
    """
    out, i = [], 0
    while i < len(chars):
        for k in (4, 3, 2, 1):
            if i + k <= len(chars) and len(out) >= k:
                prev = out[-k:]
                if [c["c"] for c in prev] == [c["c"] for c in chars[i : i + k]] and all(c["w"] == 0 for c in prev):
                    i += k
                    break
        else:
            out.append(chars[i])
            i += 1
    return out


def norm(s):
    s = unicodedata.normalize("NFC", s.replace("\t", " ").replace(" ", " "))
    return re.sub(r"\s+", " ", s).strip()


def walk_rows(elements):
    """Yield lists of per-cell MCID lists, one per TR."""
    for el in elements:
        if el.get("type") == "TR":
            cells = []
            for td in el.get("children", []):
                if td.get("type") not in ("TD", "TH"):
                    continue
                ids = []

                def collect(e):
                    ids.extend(e.get("mcids") or [])
                    for c in e.get("children", []):
                        collect(c)

                collect(td)
                cells.append(ids)
            yield cells
        else:
            yield from walk_rows(el.get("children", []))


doc = fitz.open(pdf_path)
entries, problems = [], []
stats = defaultdict(int)

with pdfplumber.open(pdf_path) as pl:
    for pno in range(FIRST_PAGE - 1, LAST_PAGE):
        fpage, ppage = doc[pno], pl.pages[pno]

        # pdfplumber glyph positions -> MCID. Map into PyMuPDF space via the crop offset.
        # pdfplumber measures from the mediabox; PyMuPDF from the cropbox.
        mb, cb = fpage.mediabox, fpage.cropbox
        dx, dy = cb.x0 - mb.x0, (mb.y1 - cb.y1)

        # pdfplumber reports the innermost marked-content tag, and the Hindi text sits
        # in a nested span without its own MCID. Chars are in content-stream order, so
        # an MCID-less run between two known MCIDs belongs to the MCIDs missing in
        # that gap (the Hindi cell, which always sits between two English cells).
        rows = list(walk_rows(ppage.structure_tree))
        cell_of = {}
        for ri, cells in enumerate(rows):
            for ci, ids in enumerate(cells):
                for m in ids:
                    cell_of[m] = (ri, ci)
        pchars = ppage.chars
        seen = {c["mcid"] for c in pchars if c.get("mcid") is not None}
        missing = sorted(m for m in cell_of if m not in seen)
        i = 0
        while i < len(pchars):
            if pchars[i].get("mcid") is not None or not pchars[i]["text"].strip():
                i += 1
                continue
            j = i
            while j < len(pchars) and pchars[j].get("mcid") is None:
                j += 1
            before = next((pchars[k]["mcid"] for k in range(i - 1, -1, -1) if pchars[k].get("mcid") is not None), -1)
            after = pchars[j]["mcid"] if j < len(pchars) else 10**9
            gap = [m for m in missing if before < m < after]
            cells_in_gap = {cell_of[m] for m in gap}
            target = None
            if len(cells_in_gap) == 1:
                target = gap[0]
            elif not gap and before in cell_of:
                # Nested span inside the preceding MCID: the rest of that cell's text.
                target = before
                stats["continued_runs"] += 1
            if target is not None:
                for k in range(i, j):
                    pchars[k] = {**pchars[k], "mcid": target}
            else:
                stats["ambiguous_runs"] += 1  # page numbers and letter headers land here
                if before != -1:
                    problems.append(
                        f"p{pno+1}: untagged run between MCID {before} and {after} maps to "
                        f"{len(cells_in_gap)} cells: " + "".join(c["text"] for c in pchars[i:j])[:40]
                    )
            i = j

        glyphs = sorted(
            (round(c["x0"] - dx, 1), c["top"] - dy, c["bottom"] - dy, c["mcid"])
            for c in pchars
            if c.get("mcid") is not None
        )
        xs = [g[0] for g in glyphs]

        def mcid_at(x0, y0, y1):
            i = bisect.bisect_left(xs, x0 - 1.0)
            best = None
            while i < len(glyphs) and glyphs[i][0] <= x0 + 1.0:
                gx, gt, gb, m = glyphs[i]
                overlap = min(y1, gb) - max(y0, gt)
                if overlap > 0 and (best is None or overlap > best[0]):
                    best = (overlap, m)
                i += 1
            return best[1] if best else None

        # PyMuPDF characters grouped by MCID, in reading order.
        by_cell = defaultdict(list)
        raw = fpage.get_text("rawdict")
        for block in raw["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    chars = [
                        {"c": ch["c"], "w": round(ch["bbox"][2] - ch["bbox"][0], 2), "bbox": ch["bbox"]}
                        for ch in span["chars"]
                    ]
                    # Assign the span's glyphs to MCIDs; zero-width glyphs inherit the
                    # MCID of the visible glyph at their position.
                    last = None
                    for ch in chars:
                        x0, y0, x1, y1 = ch["bbox"]
                        m = mcid_at(x0, y0, y1) if ch["c"].strip() else None
                        if m is None:
                            m = last
                        else:
                            last = m
                        ch["m"] = m
                    # Back-fill leading chars (e.g. a leading space) with the first MCID seen.
                    first = next((c["m"] for c in chars if c["m"] is not None), None)
                    for c in chars:
                        if c["m"] is None:
                            c["m"] = first
                    # The whole span (one visual line inside one cell) goes to the cell
                    # most of its glyphs belong to. Text keeps PyMuPDF's natural order.
                    votes = defaultdict(int)
                    for c in chars:
                        if c["m"] in cell_of and c["c"].strip():
                            votes[cell_of[c["m"]]] += 1
                    text = "".join(c["c"] for c in clean_chars(chars))
                    if not text.strip():
                        continue
                    if not votes:
                        stats["unassigned_spans"] += 1
                        if not re.fullmatch(r"\s*(\d+[A-Z]?|[A-Z]|[^\x00-\x7f]*शब्द\s*)\s*", text):
                            problems.append(f"p{pno+1}: unassigned line {text!r}")
                        continue
                    cell = max(votes, key=votes.get)
                    if len(votes) > 1:
                        stats["mixed_spans"] += 1
                        problems.append(f"p{pno+1}: line split across cells {dict(votes)}: {text!r}")
                    by_cell[cell].append((round(span["bbox"][1], 1), span["bbox"][0], text))

        def cell_text(ri, ci):
            return norm(" ".join(t for _, _, t in sorted(by_cell.get((ri, ci), []))))

        for ri, cells in enumerate(rows):
            texts = [cell_text(ri, ci) for ci in range(len(cells))]
            stats["rows"] += 1
            if len(texts) != 2:
                problems.append(f"p{pno+1}: row with {len(texts)} cells: {texts}")
                continue
            en, hi = texts
            if not en and not hi:
                stats["empty_rows"] += 1
                continue
            if not en or not hi:
                problems.append(f"p{pno+1}: half-empty row en={en!r} hi={hi!r}")
                continue
            entries.append({"en": en, "hi": hi, "page": pno + 1})


# The app groups terms by letter A-Z. The glossary's "words starting with numbers"
# section (24x7 Banking, 2G Spectrum) has no letter, so it is reported and skipped.
out = []
for e in entries:
    if not re.match(r"[A-Za-z]", e["en"]):
        problems.append(f"p{e['page']}: skipped (starts with a number): {e['en']} = {e['hi']}")
        continue
    out.append({"en": e["en"], "hi": e["hi"], "letter": e["en"][0].upper()})
entries = out

with open(out_path, "w") as f:
    json.dump(entries, f, ensure_ascii=False, separators=(",", ":"))
with open(report_path, "w") as f:
    f.write(json.dumps(stats) + "\n" + "\n".join(problems) + "\n")
print("entries", len(entries), dict(stats), "problems", len(problems))

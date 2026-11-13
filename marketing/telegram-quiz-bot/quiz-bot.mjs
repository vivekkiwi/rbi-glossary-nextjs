#!/usr/bin/env node
// Shabdawali daily quiz bot: posts N Telegram quiz polls a day from a reviewed queue.
// No dependencies (Node 18+).
//
// Why a reviewed queue: a public quiz for Rajbhasha aspirants cannot post a wrong
// answer, and the old terms.json had misaligned rows. The glossary has since been
// re-extracted cleanly, but the bot still only uses pairs a human has checked
// (approved.tsv), which also lets you favour exam-relevant terms.
// Use CANDIDATES=N to get the next batch to review.
//
// Env:
//   TELEGRAM_BOT_TOKEN  bot token from @BotFather (required to send)
//   TELEGRAM_CHAT_ID    @yourchannel or numeric chat id (required to send)
//   START_DATE          YYYY-MM-DD of the first post (default 2026-11-17); line 1 of the queue posts that day
//   QUIZ_COUNT          polls per day (default 5). Changing it after launch shifts the schedule
//   SITE_URL            CTA link base (default https://www.shabdawali.com)
//   QUIZ_DATE           YYYY-MM-DD to post a specific day (default: today in IST)
//   DRY_RUN=1           print what would be sent instead of sending
//   PREVIEW_DAYS=N      print the next N days compactly, send nothing
//   CANDIDATES=N        print N unreviewed glossary pairs (TSV) to check and append to approved.tsv
//   TERMS_URL           glossary JSON for CANDIDATES (default https://www.shabdawali.com/terms.json)

import { readFileSync } from "node:fs";

const env = process.env;
const TOKEN = env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID;
const COUNT = Number(env.QUIZ_COUNT || 5);
const START_DATE = env.START_DATE || "2026-11-17";
const SITE_URL = (env.SITE_URL || "https://www.shabdawali.com").replace(/\/$/, "");
const TERMS_URL = env.TERMS_URL || "https://www.shabdawali.com/terms.json";
const DRY_RUN = env.DRY_RUN === "1";
const MAX_OPTION = 100; // Telegram: option ≤100 chars, explanation ≤200

const istToday = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (date, n) => new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10);
const dayIndex = (date) => Math.round((Date.parse(date) - Date.parse(START_DATE)) / 86400000);
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function loadQueue() {
  return readFileSync(new URL("./approved.tsv", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l, i) => {
      const [en, hi] = l.split("\t").map(clean);
      if (!en || !hi) throw new Error(`approved.tsv line ${i + 1}: expected "english<TAB>hindi"`);
      if (en.length > MAX_OPTION || hi.length > MAX_OPTION) throw new Error(`approved.tsv: "${en}" is over ${MAX_OPTION} chars`);
      return { en, hi };
    });
}

// Small seeded RNG so a given day always produces the same options (safe to re-run).
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Wrong options come from other reviewed pairs, preferring similar length so they look plausible.
function distractors(term, field, queue, rand) {
  const seen = new Set([term[field].toLowerCase()]);
  const ranked = shuffle(queue, rand).sort(
    (a, b) => Math.abs(a[field].length - term[field].length) - Math.abs(b[field].length - term[field].length),
  );
  const near = shuffle(ranked.slice(0, 12), rand);
  const out = [];
  for (const t of [...near, ...ranked]) {
    if (seen.has(t[field].toLowerCase())) continue;
    seen.add(t[field].toLowerCase());
    out.push(t[field]);
    if (out.length === 3) break;
  }
  return out;
}

function buildDay(queue, date) {
  const day = dayIndex(date);
  const start = day * COUNT;
  if (day < 0) return { day, quizzes: [], reason: `before START_DATE ${START_DATE}` };
  if (start + COUNT > queue.length) {
    return { day, quizzes: [], reason: `queue empty: need lines ${start + 1}-${start + COUNT} of approved.tsv, have ${queue.length}` };
  }
  const rand = rng(day + 1);
  const quizzes = queue.slice(start, start + COUNT).map((term, i) => {
    const enToHi = i % 2 === 0; // alternate direction
    const field = enToHi ? "hi" : "en";
    const options = shuffle([term[field], ...distractors(term, field, queue, rand)], rand);
    return {
      question: enToHi
        ? `Q${i + 1}. "${term.en}" का हिंदी पर्याय क्या है?`
        : `Q${i + 1}. "${term.hi}" का अंग्रेज़ी शब्द क्या है?`,
      options,
      correct_option_id: options.indexOf(term[field]),
      explanation: `${term.en} = ${term.hi}\n(RBI Banking Glossary)`.slice(0, 200),
    };
  });
  return { day, quizzes, daysLeft: Math.floor((queue.length - start) / COUNT) - 1 };
}

async function tg(method, body) {
  if (DRY_RUN) return console.log(`\n[${method}]`, JSON.stringify(body, null, 2));
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  await new Promise((r) => setTimeout(r, 1200)); // stay well under channel rate limits
}

async function candidates(n, queue) {
  const have = new Set(queue.map((t) => t.en.toLowerCase()));
  const raw = await (await fetch(TERMS_URL)).json();
  const words = (s) => s.split(/\s+/).length;
  // Drops the most common PDF-extraction damage. Still check every line by hand:
  // misaligned rows (right-looking Hindi for the wrong English) get past any filter.
  const broken = (t) =>
    /\s[ऀ-ःऺ-ॏ]|^[ऺ-ॏ]|्[\sा-ौ]|[ृेै]\s|[\/,;\-(]$|^[\/,;\-]|[0-9(]/.test(t.hi) ||
    /[0-9(]|[\/,;\-]$|\b(of|for|the|and|to|in|by|with|from|a|an|at|or|as)$/i.test(t.en) ||
    (words(t.en) >= 3 && words(t.hi) <= 2) || words(t.en) > 4;
  const pool = raw
    .map((t) => ({ en: clean(t.en), hi: clean(t.hi) }))
    .filter((t) => t.en && t.hi && !have.has(t.en.toLowerCase()) && !broken(t) && t.en.length < 45 && t.hi.length < 40);
  console.log(`# ${pool.length} unreviewed candidates; showing ${n}. Copy the correct lines into approved.tsv.`);
  for (const t of shuffle(pool, rng(queue.length)).slice(0, n)) console.log(`${t.en}\t${t.hi}`);
}

async function main() {
  const queue = loadQueue();

  if (env.CANDIDATES) return candidates(Number(env.CANDIDATES), queue);

  const date = env.QUIZ_DATE || istToday();

  if (env.PREVIEW_DAYS) {
    console.log(`Queue: ${queue.length} pairs = ${Math.floor(queue.length / COUNT)} days from ${START_DATE}`);
    for (let d = 0; d < Number(env.PREVIEW_DAYS); d++) {
      const dt = addDays(date, d);
      const { quizzes, reason } = buildDay(queue, dt);
      console.log(`\n== ${dt} ==${reason ? ` (nothing: ${reason})` : ""}`);
      for (const q of quizzes) {
        console.log(`${q.question}\n   ${q.options.map((o, i) => (i === q.correct_option_id ? `[${o}]` : o)).join("  ·  ")}`);
      }
    }
    return;
  }

  // Check the date first, so scheduled runs before launch pass even before the secrets exist.
  const { day, quizzes, reason, daysLeft } = buildDay(queue, date);
  if (reason?.startsWith("before")) return console.log(`Nothing to post on ${date}: ${reason}.`);
  if (!DRY_RUN && (!TOKEN || !CHAT_ID)) {
    throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID (repo secrets SHABDAWALI_TG_BOT_TOKEN / SHABDAWALI_TG_CHAT_ID), or DRY_RUN=1.");
  }
  if (reason) throw new Error(`${date}: ${reason}. Run CANDIDATES=40 and add reviewed pairs.`);

  const chat_id = CHAT_ID || "@dry_run";
  const utm = `utm_source=telegram&utm_medium=daily_quiz&utm_campaign=${date}`;

  await tg("sendMessage", {
    chat_id,
    text: `📘 आज के ${COUNT} RBI बैंकिंग शब्द | Daily Banking Shabdavali Quiz · ${date}\n\nRajbhasha Adhikari · SSC CHT/JHT · Bank exams`,
  });
  for (const quiz of quizzes) await tg("sendPoll", { chat_id, type: "quiz", is_anonymous: true, ...quiz });
  await tg("sendMessage", {
    chat_id,
    text: `✅ कितने सही हुए? पूरे 11,537 RBI शब्दों का अभ्यास करें. Letter A बिल्कुल मुफ़्त।\n${SITE_URL}/practice?${utm}`,
  });

  console.log(`${DRY_RUN ? "[dry run] " : ""}Posted ${quizzes.length} quizzes for ${date} (day ${day}). ${daysLeft} day(s) left in the queue.`);
  // GitHub Actions shows this as a warning on the run so you notice before the queue runs dry.
  if (daysLeft <= 3) console.log(`::warning::Quiz queue has ${daysLeft} day(s) left. Add reviewed pairs to approved.tsv.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

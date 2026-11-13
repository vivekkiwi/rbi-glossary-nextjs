# Shabdawali daily Telegram quiz bot

Posts a daily set to a Telegram channel: an intro message, 5 native **quiz polls** (alternating English→Hindi and Hindi→English, with the answer shown after voting), and a CTA to the free letter-A practice with UTM tags. It has no dependencies and needs only Node 18+.

## Why it posts from `approved.tsv` instead of the whole glossary

The original `terms.json` had broken Hindi, cut-off rows and misaligned pairs (e.g. `floor limit` = परिसंपत्तियां). It has since been re-extracted from the RBI PDF's own table structure (`scripts/extract-glossary.py`). A public quiz still deserves a human glance before it posts, and the queue lets you pick exam-relevant terms rather than random ones. So the bot posts only reviewed pairs.

The Hindi in `approved.tsv` matches the corrected `terms.json` verbatim. `CANDIDATES` reads the live file from shabdawali.com, so deploy the corrected glossary before reviewing new terms.

`approved.tsv` currently holds **130 reviewed pairs = 26 days (14 Nov – 9 Dec 2026)**.

## How it runs

`.github/workflows/shabdawali-quiz.yml` runs daily at 07:30 IST with `START_DATE: "2026-11-14"`. Line 1 of the queue posts that day. Scheduled runs only fire from `main`. Before the start date, each run logs "nothing to post" and passes, even before the secrets are set.

**Once a day, at most.** Each real post (the 07:30 run, or a manual **post-now**) saves a marker for that IST date, and any later real post the same day skips. So posting manually at 01:00 means the 07:30 run that day does nothing, and the next set goes out the following morning. If a run fails halfway, no marker is saved and a re-run posts the whole set again, so delete the partial posts first.

## Setup (≈10 minutes, in your Telegram and GitHub accounts)

1. **Create the bot:** in Telegram, message `@BotFather` → `/newbot`. Copy the token it gives you.
2. **Create the channel** (e.g. "RBI Banking Shabdavali | राजभाषा") and make it public (e.g. `@rbi_shabdavali`). Then **add the bot as an admin** with "Post messages" permission.
3. **Add two repo secrets** under GitHub → this repo → Settings → Secrets and variables → Actions → *New repository secret*:
   - `SHABDAWALI_TG_BOT_TOKEN`: the token from step 1
   - `SHABDAWALI_TG_CHAT_ID`: the channel's `@username` (e.g. `@rbi_shabdavali`)
4. **Merge to `main`.** To move the launch day, change `START_DATE` in the workflow.
5. **Optional test post** from your machine (posts for real, so use a private test channel):
   ```bash
   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=@your_test_channel QUIZ_DATE=2026-11-14 node quiz-bot.mjs
   ```

## Testing

From GitHub → **Actions** → **Shabdawali daily quiz** → **Run workflow**:

1. **`check` (default): posts nothing.** It confirms the token works, finds the channel, and checks that the bot is an admin allowed to post. A green run means the 07:30 schedule will work. A red run says exactly which step failed.
2. **`post-now`: posts today's set to the real channel right away**, and counts as today's post, so the 07:30 run skips. It always uses the real channel and ignores **test_chat**. Running it twice on the same day posts nothing the second time.
3. **`test-post`: posts a set for testing.** It defaults to the first day's set (Q1 "bank rate"). Put a private test channel's `@username` in **test_chat** (the bot must be its admin). It doesn't count as the day's post, so on the real channel it would duplicate a later post. Delete test posts if you use the real channel.

You can also check without posting from your own machine:
```bash
CHECK=1 TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=@rbi_shabdavali node quiz-bot.mjs
```

## Weekly upkeep (~10 minutes)

```bash
CANDIDATES=40 node quiz-bot.mjs            # 40 unreviewed pairs (filtered for obvious damage)
```
Check each line. Paste only correct ones at the **bottom** of `approved.tsv`, then commit. Never reorder or delete lines that have already been posted, because that shifts the schedule.

When ≤3 days remain, the Actions run shows a warning. When the queue is empty the run **fails** (GitHub emails you) and posts nothing.

## Other commands

```bash
PREVIEW_DAYS=7 node quiz-bot.mjs                     # see the next week's questions + answers
DRY_RUN=1 QUIZ_DATE=2026-11-20 node quiz-bot.mjs     # print the exact Telegram API payloads
```

Env options: `QUIZ_COUNT` (default 5; don't change after launch), `SITE_URL`, `START_DATE`. See the header of `quiz-bot.mjs`.

## Measuring it

The CTA link carries `utm_source=telegram&utm_medium=daily_quiz&utm_campaign=<date>`, so the site's analytics show which days drive practice starts and ₹499 purchases.

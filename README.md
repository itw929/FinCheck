# FinCheck

Paste a link to a money video. Get back what was said, what the regulator says,
and the source next to the claim so you can decide for yourself.

No AI decides whether a claim is true. The model reads, retrieves and labels.
Every number on screen is calculated by `engine.js` from those labels, in code
you can read.

---

## 1. Put the files in a repo

Everything goes in the root without folders or build step.

```
index.html            the site
engine.js             scoring. Shared by the site and the tools.
analyses.js           the cache. Generated. Do not hand-edit.

ingest.js             pulls captions + publish date
ANALYST_PROMPT.md     the prompt you paste into Claude
import-analysis.js    validates the labels and writes the cache
verify-fixtures.js    re-checks every quote against its page
test-engine.js        calibration and edge cases
generate.js           the fully automatic version, for later
SCHEMA.md             the data contract
```

```bash
git init
git add .
git commit -m "FinCheck"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/fincheck.git
git push -u origin main
```

## 2. Turn on GitHub Pages

Repo → **Settings** → **Pages** → Source: **Deploy from a branch** →
Branch: **main**, folder: **/ (root)** → Save.

Now you have
`https://YOUR-NAME.github.io/fincheck/`

`index.html` loads `engine.js` and `analyses.js`
with plain `<script src>` tags. It behaves identically opened from
the Finder and served from Pages, which means unreliable
conference WiFi can't break the demo.

`ingest.js` and `import-analysis.js` sit in the repo but never run there.
They are run locally.

## 3. Install

Node 18 or newer is needed since earlier versions have no global `fetch` and everything here
depends on it.

```bash
node --version     # must be v18+
```

Optional but recommended:

```bash
brew install yt-dlp        # macOS
pipx install yt-dlp        # anywhere with Python
winget install yt-dlp      # PowerShell
```

Without `yt-dlp`, `ingest.js` falls back to fetching the YouTube watch page
directly. TikTok and Instagram can work with yt-dlp as well.

Check the engine works:

```bash
node test-engine.js
```

You should see four archetypes scoring 69, 0, 8 and 60, then a calibration
table, then `ALL ARCHETYPE SCORES MATCH`.

---

## 4. Add a video

### Step one — pull the transcript

```bash
node ingest.js "https://www.youtube.com/shorts/XXXXXXXXXXX"
```

```
link      https://www.youtube.com/shorts/XXXXXXXXXXX
key       yt:XXXXXXXXXXX   (YouTube Shorts)
route     yt-dlp
title     Why nobody should overpay their student loan
creator   @somecreator
posted    2026-05-12
captions  captions_auto   14 lines, 168 words

wrote     transcripts/yt_XXXXXXXXXXX.json
wrote     transcripts/yt_XXXXXXXXXXX.prompt.txt
```

Two failure modes, both normal:

- **"No caption track on this video."** Many Shorts have none. Pick a
  different video. Creators who caption their videos are also the ones making
  the content you want to check.
- **"YouTube likely served a bot check."** Install `yt-dlp` and run it again.

### Step two — get the labels

Open `transcripts/yt_XXXXXXXXXXX.prompt.txt`. Paste the whole thing into
Claude, with web search on. Save what comes back as `paste.json`.

It returns labels: verdict, flags, confidence, omissions, one verbatim quote
per claim. The prompt ensures no analysis is performed by model.

### Step three — check any named firm yourself

If the video names a platform, broker or app, look it up:

**https://register.fca.org.uk**

Then add this to that claim's `source` in `paste.json`:

```json
"registerCheck": {
  "firmSearched": "EXACT NAME LTD",
  "state": "not_found",
  "checkedAt": "2026-08-28"
}
```

`state` is one of `authorised`, `not_found`, `similar_names_only`,
`on_warning_list`. The importer writes the wording for you, dated, factual.
Never write "scam" or "fraud" — the importer rejects it if you do.

This step is deliberately not the model's job. It is the highest-stakes check
in the product and it is a lookup, not a probability.

### Step four — import it

```bash
node import-analysis.js yt:XXXXXXXXXXX paste.json
```

This rejects any verdict, flag, type or confidence value that is not ours.
It rejects any source not on the allowlist. It fetches every source page
and drops any quote that is not character identical.

If anything fails, **nothing is written**:

```
--- errors (nothing was written) ---
  c2  SOURCE OFF THE ALLOWLIST — moneysavingexpert.com. Rejected.
  c4  verdict "very false" is not a real verdict
```

Fix it in the chat, re-export, run it again. Do not edit `paste.json` by hand
to make the error go away.

On success:

```
score      69  Check before you act
binding    Completeness via c1
axes       Factual 92 · Risk 100 · Incentive 100 · Completeness 69
quotes     verified_quote, paraphrase

wrote analyses.js — 5 video(s) in the cache.
```

### Step five — check it

```bash
open index.html
```

Or push and refresh your Pages URL.

If the WiFi is down when you need to import, `--offline` skips the network
check. Quotes come in unverified and downgrade to paraphrase. Re-run
`verify-fixtures.js` before you ship anything imported that way.

---

## 5. Before you commit, and on the morning of the demo

```bash
node test-engine.js        # calibration has not drifted
node verify-fixtures.js    # every quote still on its page, every link alive
```

`verify-fixtures.js` is the one that matters. Every card that says
"verbatim, verified against source" is ensured to a user who is about to click.

It also enforces one verified quote per source page, and refuses to let an
unchecked FCA lookup ship as though the firm were fine.

---

## Where things are decided

| | Decided by |
|---|---|
| Which lines are claims | the model |
| Whether a claim is accurate | a Tier 1 or Tier 2 page, quoted |
| Which flags apply | the model, except the two FCA ones |
| Whether a firm is authorised | the FCA register |
| Whether a quote is real | `import-analysis.js`, against the live page |
| Every number on the card | `engine.js`, from the labels |

## Later: the fully automatic version

`generate.js` does all five steps in one command with an API key, using the
`allowed_domains` parameter on the web search tool so the model physically
cannot return a source outside the allowlist. It has not been run. It is there
so you can say honestly on stage that the manual workflow is a deployment
constraint, not a design one.

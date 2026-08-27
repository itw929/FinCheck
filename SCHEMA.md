# FinCheck — the data contract

`generate.js` writes it. `engine.js` reads it. The site reads what the engine
returns. If you change the shape, change both files in the same commit.

`analyses.js` is **output**, not input. Nobody types it by hand. The three
archetypes currently in the repo are fixtures for the test harness; the eight
demo videos will be generated.

---

## The record

One object per video, in the `ANALYSES` array in `analyses.js`.

```jsonc
{
  "url":  "https://www.tiktok.com/@creator/video/7412345678901234567",
  "urlKey": "tt:7412345678901234567",   // the cache key. See normaliseUrl().
  "platform": "TikTok",
  "creator": "@creator",
  "title": "...",

  "publishedAt": "2026-05-12",   // yt-dlp upload_date. The reference date for
                                 // every temporal judgement in the record.
  "analysedAt":  "2026-08-27",

  "cacheVersion": 3,             // bump the constant to invalidate everything
  "transcriptState": "ok",       // "ok" | "unavailable"
  "transcriptSource": "captions",// "captions" | "whisper" | null
  "transcriptWords": 168,

  "claims": [ /* below */ ]
}
```

## A claim

```jsonc
{
  "id": "c1",
  "timestamp": "0:06",
  "text": "Your student loan gets wiped after 40 years so never overpay it.",

  "type": "regulatory_eligibility",
  // numeric_factual | regulatory_eligibility | performance_return
  // | firm_product | tax | opinion
  "timeBound": true,

  // ---- Layer 1: the verdict. One per claim, mutually exclusive. ----
  "verdict": "accurate_but_incomplete",
  // accurate | accurate_but_incomplete | outdated | misleading | false
  // | unverifiable
  // null + type "opinion" = set aside, never scored

  // ---- Layer 3: confidence, separate from the verdict ----
  "confidence": "high",          // high | medium | low

  // ---- Layer 2: the flags. Several per claim, orthogonal. ----
  "flags": ["risk_not_stated"],
  // Model may emit: risk_not_stated, survivorship_bias, pressure_tactics,
  //                 undisclosed_incentive, advice_in_disguise
  // Code only:      unauthorised_firm, warning_list_firm
  //                 (deterministic FCA lookup — the model gets no vote)

  "missing": [
    { "text": "Plan 1 loans are written off at 25 years", "materiality": "material" },
    { "text": "The threshold rises each April",           "materiality": "minor" }
  ],

  "explanation": "Two or three plain sentences addressed to the viewer.",

  "temporal": {
    "assessedAgainst": "2026-05-12",       // = publishedAt
    "verdictAtPublication": "accurate_but_incomplete",
    "changedSince": false,
    "whatChanged": null
  },

  "source": {
    "tier": 1,                              // 1 | 2 | null
    "name": "gov.uk",
    "url": "https://www.gov.uk/repaying-your-student-loan/what-you-pay",

    "quote": "6% of your income over the threshold if you're on a Postgraduate Loan plan",
    "quoteVerified": true,
    "quoteState": "verified_quote",
    // verified_quote  — found character-for-character on the page
    // paraphrase      — no single clean sentence, or the page's one quote
    //                   is already used elsewhere. Set `paraphrase` text.
    // register_check  — an FCA register result. Not a quotable sentence;
    //                   renders as a dated finding, never as a quotation.
    // no_source_found — nothing settles it. An honest outcome, not a gap.
    "paraphrase": null,                     // required when state is paraphrase
    "droppedQuote": null,                   // set when the verbatim check failed
    "textFragmentUrl": "https://www.gov.uk/...#:~:text=Any%20outstanding%20balance",

    "apiCitations": [ { "url": "...", "title": "...", "citedText": "..." } ],

    "registerCheck": {                      // only when the claim named a firm
      "firmSearched": "EXAMPLE PROP FIRM LTD",
      "state": "not_found",                 // authorised | not_found
                                            // | similar_names_only | on_warning_list
                                            // | unchecked
      "referenceNumber": null,
      "statement": "No exact match for \"EXAMPLE PROP FIRM LTD\" on the FCA Financial Services Register as at 2026-08-27.",
      "checkedAt": "2026-08-27"
    }
  }
}
```

**`"unchecked"` must never render as "authorised".** If the FCA key is missing
the card says we did not check, not that the firm is fine.

---

## What the engine gives back

```jsonc
{
  "state": "scored",   // scored | no_transcript | no_claims | insufficient_evidence
  "score": 8,
  "band": { "level": "critical", "label": "Do not act on this", "sub": "..." },

  "axes": { "factualAccuracy": 100, "riskDisclosure": 45,
            "incentiveTransparency": 8, "completeness": 87 },

  "bindingAxis": "incentiveTransparency",   // which axis produced the headline
  "bindingAxisLabel": "Incentive and conflict",
  "bindingClaimId": "c3",                   // which claim set that axis

  "confidence": "medium",   // worst confidence among the claims that set the
                            // binding axis — not the whole video
  "coverage": 0.67,         // share of claims a trusted source settled
  "lowCoverage": false,

  "caps": [ { "cap": 15, "reason": "A firm named in this video is not on..." } ],
  "capped": true,

  "claims":   [ /* enriched, with axes + deductions per claim */ ],
  "setAside": [ { "timestamp": "0:31", "reason": "Opinion, not a checkable claim" } ],
  "unassessed": 1,

  "workings": { "rule": "...", "perAxis": { /* worst + others, per axis */ },
                "preCapScore": 8 },
  "video": { /* metadata */ }
}
```

`bindingAxis` and `bindingClaimId` exist so the UI can write *"this scores 8
because of one claim at 0:41"* without recomputing anything. Use them.

---

## The scoring rule, in one sentence

> On each axis, the worst claim sets the level and every other claim can add a
> capped amount more. The headline is the lowest of the four axes. We never
> average.

Then two things sit on top:

- **Safety caps** — Warning List → 5, not on the register → 15, any false
  claim → 40. These are product judgements, not arithmetic, and the card names
  them in words when they fire.
- **Coverage cap** — `60 + 40 × coverage`. A video where we settled one claim
  in three cannot read "Broadly reliable". Not being able to check something
  never costs the *creator* points; it costs the *result* its confidence.

All tunable numbers are in the `CAL` block at the top of `engine.js`. When a
mentor says "that feels harsh", change a constant in front of them and re-run
`node test-engine.js`. Nothing else moves.

---

## Repo layout

```
/                     GitHub Pages serves this
  index.html          paste a link -> look up analyses.js -> render
  engine.js           scoring. Shared by the site and the generator.
  analyses.js         the cache. Committed. Generated, never hand-edited.
/tools                never served, never needs to be
  generate.js         needs ANTHROPIC_API_KEY. Runs on a laptop.
  verify-fixtures.js  re-runs the verbatim check over the whole cache.
  test-engine.js      calibration + edge cases. No network.
  urls.txt            the eight demo videos, one per line
```

`analyses.js` is a script, not JSON, so `index.html` loads it with a plain
`<script src>`. No `fetch`, no server, no build step — the site behaves
identically from `file://` and from GitHub Pages, and hostile conference wifi
cannot break the cached demo.

## The actual workflow, end to end

```
1.  node ingest.js "https://www.youtube.com/shorts/XXXX"
      Real. No API key. Pulls the caption track and the publish date,
      collapses rolling auto-captions into sentences, writes
      transcripts/yt_XXXX.json and transcripts/yt_XXXX.prompt.txt

2.  Paste transcripts/yt_XXXX.prompt.txt into Claude.
      Manual, because GitHub Pages cannot hold an API key.
      It returns labels only — verdicts, flags, confidence, omissions,
      one verbatim quote per claim. It never returns a score.

3.  Look up any named firm on the FCA register yourself.
      https://register.fca.org.uk  — a person or a script, never the model.
      Add a registerCheck block to the JSON.

4.  node import-analysis.js yt:XXXX paste.json
      Real. Rejects verdicts, flags and types that are not ours.
      Rejects any source not on the allowlist.
      Fetches each source page and drops any quote not on it.
      Builds the deep link from the verified quote.
      Writes analyses.js.

5.  Open index.html.
      engine.js computes every number from the labels. The card renders.
```

Step 2 is the only manual one, and it is manual for a reason you can say out
loud: no API key can live in a static site. Everything either side of it is
code, and step 4 is what stops a chat window's mistakes reaching a card.

## Before every commit

```
node test-engine.js        # calibration did not drift
node verify-fixtures.js    # every quote still on its page, every link alive
```

`verify-fixtures.js` is the one that matters. Every card that says "verbatim,
checked against the page" is a promise to the user, and a promise that fails on
their first click is worse than never making it. It also enforces one verified
quote per source page and refuses to let an unchecked FCA lookup ship.

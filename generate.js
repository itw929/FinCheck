#!/usr/bin/env node
/* ============================================================
   FinCheck — offline generator

   THIS FILE NEVER SHIPS. It runs on a laptop with an API key
   and writes analyses.json into the repo. The site reads that
   file and nothing else. No key ever reaches a browser.

   Usage:
     export ANTHROPIC_API_KEY=sk-ant-...
     node generate.js urls.txt
     node generate.js https://www.tiktok.com/@x/video/123 --force

   Requires: node 18+, yt-dlp on PATH.
     brew install yt-dlp     /     pipx install yt-dlp

   The contract between this file and engine.js is SCHEMA.md.
   If you change one, change the other.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const E = require("./engine.js");

/* ============================================================
   CONFIG
   ============================================================ */

const API = "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY;

const MODELS = {
  /* Job 1 is mechanical: read a script, return typed claims.
     Cheap model, temperature 0, JSON forced. */
  extract: "claude-haiku-4-5-20251001",
  /* Job 2 is the real work: retrieve and reason over sources. */
  verify: "claude-sonnet-5"
};

/* The allowlist. This is the product's spine.
   Bare domains, no scheme, no www. Max 64 entries per request,
   and allowed_domains and blocked_domains are mutually
   exclusive — sending both is a 400. */
const ALLOWLIST = {
  1: [
    "fca.org.uk",
    "register.fca.org.uk",
    "bankofengland.co.uk",
    "gov.uk",
    "hmrc.gov.uk",
    "moneyhelper.org.uk",
    "fscs.org.uk",
    "thepensionsregulator.gov.uk",
    "ons.gov.uk",
    "legislation.gov.uk"
  ],
  2: [
    "libf.ac.uk",          // London Foundation for Banking & Finance
    "ifs.org.uk",
    "resolutionfoundation.org",
    "oecd.org",
    "nao.org.uk",
    "parliament.uk"
  ],
  /* Tier 3 is deliberately NOT in the search allowlist. We link
     to it in the UI when a human adds it; we never let the model
     lean on it for a verdict. Keeping it out of allowed_domains
     is what makes "Tier 1 or Tier 2 only" a fact rather than a
     promise. */
  3: ["reuters.com", "which.co.uk", "investopedia.com"]
};

/* Written as .js, not .json, so the site can <script src> it.
   No fetch means no server, which means file:// and GitHub Pages
   behave identically and conference wifi cannot break the demo. */
const OUT = path.join(__dirname, "analyses.js");
const CACHE_VERSION = 3;   // bump to force re-analysis of everything

/* ============================================================
   1. INGESTION — link in, transcript + publication date out
   ============================================================ */

function yt(args) {
  return execFileSync("yt-dlp", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

/* vm.tiktok.com and tiktok.com/t/ shortlinks resolve to a
   different id. Resolve BEFORE building the cache key, or two
   links to the same video get two cache entries. */
async function resolveUrl(url) {
  const n = E.normaliseUrl(url);
  if (!n.shortlink) return url;
  const res = await fetch(url, { redirect: "follow", method: "HEAD" });
  return res.url || url;
}

function fetchMeta(url) {
  const raw = yt(["--dump-single-json", "--skip-download", "--no-warnings", url]);
  const j = JSON.parse(raw);
  return {
    title: j.title || null,
    creator: j.uploader || j.channel || j.uploader_id || null,
    /* upload_date is YYYYMMDD. This is our reference date for
       every temporal judgement. It is the date the video was
       POSTED, which is not necessarily when the information was
       true — we say so on the card rather than pretending. */
    publishedAt: j.upload_date
      ? `${j.upload_date.slice(0, 4)}-${j.upload_date.slice(4, 6)}-${j.upload_date.slice(6, 8)}`
      : null,
    durationSec: j.duration || null
  };
}

/* Captions first — no download, no audio, fastest and cleanest.
   Whisper only as a fallback, because TikTok and Instagram
   frequently have no usable caption track. */
function fetchTranscript(url, workdir) {
  const stem = path.join(workdir, "cap");
  try {
    yt([
      "--skip-download",
      "--write-auto-subs", "--write-subs",
      "--sub-langs", "en.*,en",
      "--convert-subs", "vtt",
      "--no-warnings",
      "-o", stem,
      url
    ]);
    const vtt = fs.readdirSync(workdir).find((f) => f.startsWith("cap") && f.endsWith(".vtt"));
    if (vtt) {
      return { source: "captions", cues: parseVtt(fs.readFileSync(path.join(workdir, vtt), "utf8")) };
    }
  } catch (e) { /* fall through */ }

  /* Fallback: pull audio and transcribe locally with whisper.cpp
     or faster-whisper. Costs nothing but time, runs offline, and
     it is honest to say on stage that the cached set used it. */
  try {
    yt(["-x", "--audio-format", "wav", "--no-warnings", "-o", path.join(workdir, "audio.%(ext)s"), url]);
    const out = execFileSync("whisper-cli", [
      "-m", process.env.WHISPER_MODEL || "models/ggml-base.en.bin",
      "-f", path.join(workdir, "audio.wav"),
      "-ovtt", "-of", path.join(workdir, "whisper")
    ], { encoding: "utf8" });
    void out;
    return { source: "whisper", cues: parseVtt(fs.readFileSync(path.join(workdir, "whisper.vtt"), "utf8")) };
  } catch (e) {
    return { source: null, cues: null };
  }
}

/* Keep timestamps. They are what makes the verdict card feel
   like it is pointing at the video rather than describing it. */
function parseVtt(vtt) {
  const cues = [];
  const blocks = vtt.replace(/\r/g, "").split("\n\n");
  for (const b of blocks) {
    const m = b.match(/(\d{2}):(\d{2}):(\d{2})\.\d{3}\s*-->/);
    if (!m) continue;
    const text = b.split("\n").filter((l) => !l.includes("-->") && !/^WEBVTT|^NOTE|^\d+$/.test(l))
      .join(" ").replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const secs = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
    const stamp = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    if (cues.length && cues[cues.length - 1].text === text) continue;   // dedupe rolling captions
    cues.push({ timestamp: stamp, text });
  }
  return cues;
}

/* ============================================================
   2. THE API CALL
   ============================================================ */

async function anthropic(body) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function textOf(msg) {
  return (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

/* Citations come back from the API attached to text blocks, so
   the URL on the card is retrieved, not generated. This is the
   difference between a link you can trust and a link a model
   invented. */
function citationsOf(msg) {
  const out = [];
  (msg.content || []).forEach((b) => {
    (b.citations || []).forEach((c) => {
      if (c.url) out.push({ url: c.url, title: c.title || null, citedText: c.cited_text || null });
    });
  });
  return out;
}

function parseJson(s) {
  const cleaned = s.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim();
  const start = cleaned.search(/[[{]/);
  return JSON.parse(cleaned.slice(start));
}

/* ============================================================
   3. JOB ONE — pull the claims out of the transcript
   Mechanical. Cheap model. Temperature 0. No judgement here at
   all: this step must not decide whether anything is true.
   ============================================================ */

const EXTRACT_PROMPT = `You are the claim-extraction stage of a financial fact-checking pipeline.

You will be given a timestamped transcript of a short-form video about money.

Your ONLY job is to identify which lines make a checkable claim about
finance or economics, and to type them. You must NOT decide whether any
claim is true, and you must NOT add any information that is not in the
transcript.

Return a JSON array. One object per claim:

{
  "timestamp": "0:14",
  "text": "<the claim, quoted from the transcript, lightly cleaned of filler>",
  "type": "numeric_factual" | "regulatory_eligibility" | "performance_return" | "firm_product" | "tax" | "opinion",
  "timeBound": true | false,
  "namedEntity": "<the exact firm, platform, product or scheme named, or null>",
  "searchQuery": "<one short query that would settle this claim against a UK regulator or government source>"
}

Rules:
- "opinion" is for preferences and predictions. "I'd never use a credit card"
  is an opinion. "Credit cards charge 24% APR" is numeric_factual. Mark
  opinions but do not skip them; the product shows the user what it set aside.
- "timeBound": true if the claim depends on a rate, threshold, allowance,
  tax band or rule that changes over time.
- "namedEntity" is critical. If the video names a platform, broker, app,
  prop firm or scheme, capture it exactly as said. A separate deterministic
  step looks it up on the FCA register.
- Do not merge two claims into one object. Do not invent timestamps.
- Return ONLY the JSON array. No preamble, no markdown fences.`;

async function extractClaims(cues) {
  const transcript = cues.map((c) => `[${c.timestamp}] ${c.text}`).join("\n");
  const msg = await anthropic({
    model: MODELS.extract,
    max_tokens: 4000,
    temperature: 0,
    system: EXTRACT_PROMPT,
    messages: [
      { role: "user", content: `TRANSCRIPT:\n${transcript}` },
      /* Prefilling the assistant turn with "[" forces JSON and
         removes the "Here is the JSON you asked for" preamble. */
      { role: "assistant", content: "[" }
    ]
  });
  return parseJson("[" + textOf(msg));
}

/* ============================================================
   4. JOB TWO — verify one claim against the allowlist
   allowed_domains is the whole trust argument. The model cannot
   return a source we did not approve, because the tool will not
   surface one. That is enforced at the API, not in a prompt.
   ============================================================ */

function verifyPrompt(publishedAt) {
  return `You are the verification stage of a UK financial fact-checking pipeline.

You will be given ONE claim made in a short-form video, and the date the
video was published: ${publishedAt || "unknown"}.

Search the sources available to you and decide how the claim stands against
them. You have no other sources; if the search returns nothing useful, say so
rather than answering from memory. Answering from memory is the single worst
thing you can do at this step.

TEMPORAL RULE: assess the claim against the rules, rates and thresholds in
force on the publication date above, not today. Then check separately whether
anything has changed since. A creator who was right in 2024 about a threshold
that moved in 2025 is "outdated", not "false", and the card must say so.

Return ONE JSON object:

{
  "verdict": "accurate" | "accurate_but_incomplete" | "outdated" | "misleading" | "false" | "unverifiable",
  "confidence": "high" | "medium" | "low",
  "explanation": "<two or three plain sentences. No jargon. Address the viewer.>",
  "flags": [ "risk_not_stated" | "survivorship_bias" | "pressure_tactics" | "undisclosed_incentive" | "advice_in_disguise" ],
  "missing": [ { "text": "<a condition, fee, tax or eligibility rule the video did not mention>",
                 "materiality": "material" | "minor" } ],
  "source": {
    "url": "<the page that settles it, exactly as returned by search>",
    "name": "<gov.uk, FCA, MoneyHelper...>",
    "tier": 1 | 2,
    "quote": "<ONE sentence, copied character-for-character from that page, max 30 words, or null>"
  },
  "temporal": {
    "assessedAgainst": "${publishedAt || "unknown"}",
    "verdictAtPublication": "<the verdict as of that date>",
    "changedSince": true | false,
    "whatChanged": "<one sentence, or null>"
  }
}

THE VERDICT BOUNDARY THAT MATTERS MOST:
If the omission changes what a reasonable person would KNOW, the verdict is
"accurate_but_incomplete". If it changes what they would DO, it is "misleading".
"A LISA gives you a 25% bonus" omitting the property price cap is incomplete.
Omitting the withdrawal charge that means you get back less than you put in is
misleading, because knowing it would stop someone opening one.

ON THE QUOTE: it will be checked character-for-character against the live page
by code after you answer. If it does not match exactly, it is discarded and the
card loses its strongest element. Copy, do not paraphrase, do not tidy
punctuation. If no single sentence settles it, return null and explain instead.

DO NOT flag "unauthorised_firm" or "warning_list_firm". Firm authorisation is
checked deterministically against the FCA register by separate code. You do not
get a vote on it.

Return ONLY the JSON object.`;
}

async function verifyClaim(claim, publishedAt, tier) {
  const msg = await anthropic({
    model: MODELS.verify,
    max_tokens: 2000,
    temperature: 0,
    system: verifyPrompt(publishedAt),
    tools: [{
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 4,
      /* Tier 1 first. Only if that finds nothing do we widen to
         Tier 2 — so the highest-authority source always wins,
         and the tier badge on the card is earned. */
      allowed_domains: tier === 1 ? ALLOWLIST[1] : ALLOWLIST[1].concat(ALLOWLIST[2])
    }],
    messages: [
      { role: "user", content: `CLAIM: ${claim.text}\nTYPE: ${claim.type}\nNAMED ENTITY: ${claim.namedEntity || "none"}\nSUGGESTED QUERY: ${claim.searchQuery || ""}` }
    ]
  });

  const parsed = parseJson(textOf(msg));
  parsed._citations = citationsOf(msg);
  parsed._tierSearched = tier;
  return parsed;
}

/* ============================================================
   5. THE VERBATIM CHECK
   The card promises "verified against source". This is the
   fifteen lines that make that true rather than aspirational.
   Three honest outcomes, never a fabricated one.
   ============================================================ */

function normaliseForMatch(s) {
  return String(s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/&nbsp;|\s+/g, " ")
    .trim();
}

async function verifyQuote(source) {
  if (!source || !source.url) return { state: "no_source_found", quote: null, textFragmentUrl: null };
  if (!source.quote) return { state: "paraphrase", quote: null, textFragmentUrl: source.url };

  let page;
  try {
    const res = await fetch(source.url, { headers: { "user-agent": "FinCheck/0.1 (hackathon prototype)" } });
    page = await res.text();
  } catch (e) {
    return { state: "paraphrase", quote: null, textFragmentUrl: source.url };
  }

  const text = normaliseForMatch(page.replace(/<script[\s\S]*?<\/script>/gi, "")
                                     .replace(/<style[\s\S]*?<\/style>/gi, "")
                                     .replace(/<[^>]+>/g, " "));
  const needle = normaliseForMatch(source.quote);

  if (!text.includes(needle)) {
    /* The quote is wrong. Drop it. A promise of verifiability
       that fails on the user's first click is worse than no
       promise at all. */
    return { state: "paraphrase", quote: null, textFragmentUrl: source.url, droppedQuote: source.quote };
  }

  /* Deep-link to the sentence. Browsers scroll to and highlight
     it, so the user does not have to Ctrl+F. And the fragment
     resolving IS the verbatim check, twice over. */
  const anchor = needle.split(/\s+/).slice(0, 10).join(" ");
  return {
    state: "verified_quote",
    quote: source.quote,
    textFragmentUrl: `${source.url}#:~:text=${encodeURIComponent(anchor)}`
  };
}

/* ============================================================
   6. THE FCA CHECK — the best feature, and no AI in it
   A named firm either appears on the register or it does not.
   Binary, instant, deterministic. Say that on stage.
   ============================================================ */

async function fcaCheck(firmName) {
  if (!firmName) return null;

  /* The FCA publishes a free Register API — register for a key at
     register.fca.org.uk. Set FCA_API_KEY and FCA_API_EMAIL.
     Without a key this returns "unchecked", which the UI must
     render as unchecked, never as "authorised". */
  if (!process.env.FCA_API_KEY) {
    return { firmSearched: firmName, state: "unchecked", checkedAt: today() };
  }

  try {
    const res = await fetch(
      `https://register.fca.org.uk/services/V0.1/Search?q=${encodeURIComponent(firmName)}&type=firm`,
      { headers: { "X-Auth-Email": process.env.FCA_API_EMAIL, "X-Auth-Key": process.env.FCA_API_KEY, accept: "application/json" } }
    );
    const j = await res.json();
    const hits = Array.isArray(j.Data) ? j.Data : [];
    const exact = hits.find((h) => normaliseForMatch(h.Name).toLowerCase() === firmName.toLowerCase());

    return {
      firmSearched: firmName,
      state: exact ? "authorised" : (hits.length ? "similar_names_only" : "not_found"),
      referenceNumber: exact ? exact["Reference Number"] : null,
      status: exact ? exact.Status : null,
      /* Wording matters legally. We report what the register says
         on a given date. We never say "scam" and we never say
         "fraudulent". */
      statement: exact
        ? `${firmName} appears on the FCA Financial Services Register.`
        : `No exact match for "${firmName}" on the FCA Financial Services Register as at ${today()}.`,
      checkedAt: today()
    };
  } catch (e) {
    return { firmSearched: firmName, state: "unchecked", checkedAt: today() };
  }
}

function flagsFromFca(check) {
  if (!check) return [];
  if (check.state === "on_warning_list") return ["warning_list_firm"];
  if (check.state === "not_found" || check.state === "similar_names_only") return ["unauthorised_firm"];
  return [];
}

function today() { return new Date().toISOString().slice(0, 10); }

/* ============================================================
   7. ORCHESTRATION
   ============================================================ */

async function analyse(inputUrl) {
  const url = await resolveUrl(inputUrl);
  const n = E.normaliseUrl(url);
  if (!n.key) throw new Error(`Unrecognised URL: ${inputUrl}`);

  const workdir = fs.mkdtempSync(path.join(require("os").tmpdir(), "fincheck-"));
  const meta = fetchMeta(url);
  const t = fetchTranscript(url, workdir);

  if (!t.cues || !t.cues.length) {
    return {
      url, urlKey: n.key, platform: n.platform, ...meta,
      analysedAt: today(), cacheVersion: CACHE_VERSION,
      transcriptState: "unavailable", transcriptSource: null, claims: []
    };
  }

  const extracted = await extractClaims(t.cues);
  const claims = [];

  for (let i = 0; i < extracted.length; i++) {
    const c = extracted[i];

    if (c.type === "opinion") {
      claims.push({ id: `c${i + 1}`, timestamp: c.timestamp, text: c.text, type: "opinion",
                    verdict: null, setAsideReason: "Opinion, not a checkable claim" });
      continue;
    }

    /* Tier 1, then Tier 2 only if Tier 1 settled nothing. */
    let v = await verifyClaim(c, meta.publishedAt, 1);
    if (v.verdict === "unverifiable") v = await verifyClaim(c, meta.publishedAt, 2);

    const quote = await verifyQuote(v.source);
    const register = await fcaCheck(c.namedEntity);

    claims.push({
      id: `c${i + 1}`,
      timestamp: c.timestamp,
      text: c.text,
      type: c.type,
      timeBound: c.timeBound,
      verdict: v.verdict,
      confidence: v.confidence,
      explanation: v.explanation,
      /* Model flags plus deterministic FCA flags. The model is
         not allowed to produce the FCA ones and code is not
         allowed to produce the judgement ones. */
      flags: (v.flags || []).concat(flagsFromFca(register)),
      missing: v.missing || [],
      temporal: v.temporal || null,
      source: {
        tier: v.source ? v.source.tier : null,
        name: v.source ? v.source.name : null,
        url: v.source ? v.source.url : null,
        quote: quote.quote,
        quoteVerified: quote.state === "verified_quote",
        quoteState: register && register.state !== "unchecked" && !quote.quote
          ? "register_check"
          : quote.state,
        paraphrase: quote.state === "paraphrase" && v.explanation
          ? `${v.source && v.source.name ? v.source.name : "The source"} sets this out on the linked page.`
          : null,
        droppedQuote: quote.droppedQuote || null,
        textFragmentUrl: quote.textFragmentUrl,
        apiCitations: v._citations,
        registerCheck: register
      }
    });
  }

  fs.rmSync(workdir, { recursive: true, force: true });

  return {
    url, urlKey: n.key, platform: n.platform, ...meta,
    analysedAt: today(),
    cacheVersion: CACHE_VERSION,
    transcriptState: "ok",
    transcriptSource: t.source,
    transcriptWords: t.cues.reduce((a, c) => a + c.text.split(/\s+/).length, 0),
    claims
  };
}

/* ============================================================
   8. CACHE — keyed on the normalised URL
   ============================================================ */

function loadCache() {
  if (!fs.existsSync(OUT)) return {};
  try {
    const { ANALYSES } = require(OUT);
    const byKey = {};
    (ANALYSES || []).forEach((r) => { if (r.urlKey) byKey[r.urlKey] = r; });
    return byKey;
  } catch (e) {
    console.error(`Could not read ${path.basename(OUT)} — starting fresh.`);
    return {};
  }
}

function saveCache(byKey) {
  const records = Object.values(byKey);
  fs.writeFileSync(OUT,
`/* ============================================================
   FinCheck — cached analyses

   GENERATED FILE. Do not edit by hand.
   Written by generate.js on ${new Date().toISOString()}.
   ${records.length} video(s), cacheVersion ${CACHE_VERSION}.
   ============================================================ */

const ANALYSES = ${JSON.stringify(records, null, 2)};

if (typeof module !== "undefined" && module.exports) module.exports = { ANALYSES };
`);
}

async function main() {
  if (!KEY) { console.error("Set ANTHROPIC_API_KEY."); process.exit(1); }

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) { console.error("Usage: node generate.js <url|urls.txt> [--force]"); process.exit(1); }

  const urls = fs.existsSync(target)
    ? fs.readFileSync(target, "utf8").split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("#"))
    : [target];

  const byKey = loadCache();

  for (const u of urls) {
    const k = E.normaliseUrl(u).key;
    if (k && byKey[k] && byKey[k].cacheVersion === CACHE_VERSION && !force) {
      console.log(`skip   ${k}  (cached)`);
      continue;
    }
    try {
      process.stdout.write(`build  ${u} ... `);
      const record = await analyse(u);
      byKey[record.urlKey] = record;
      const scored = E.scoreVideo(record);
      console.log(`${scored.state === "scored" ? scored.score : scored.state}  ${scored.band.label}`);
      saveCache(byKey);   // save after each, so a crash never loses the set
    } catch (e) {
      console.log(`FAILED — ${e.message}`);
    }
  }

  /* Sanity pass. Run this before you commit. If a quote failed
     the verbatim check, you want to know now, not on stage. */
  console.log("\n--- pre-commit check ---");
  Object.values(byKey).forEach((r) => {
    (r.claims || []).forEach((c) => {
      if (c.source && c.source.droppedQuote) {
        console.log(`  quote dropped   ${r.urlKey} ${c.id}: "${String(c.source.droppedQuote).slice(0, 50)}..."`);
      }
      if (c.source && c.source.registerCheck && c.source.registerCheck.state === "unchecked") {
        console.log(`  FCA unchecked   ${r.urlKey} ${c.id}: ${c.source.registerCheck.firmSearched}`);
      }
    });
  });
  console.log(`\n${Object.keys(byKey).length} videos in ${path.basename(OUT)}\n`);
}

if (require.main === module) main();
module.exports = { analyse, ALLOWLIST, verifyQuote, fcaCheck };

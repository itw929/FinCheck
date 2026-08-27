#!/usr/bin/env node
/* ============================================================
   FinCheck — import an analysis

     node import-analysis.js yt:dQw4w9WgXcQ paste.json

   Takes the JSON a chat model gave back, checks it, joins
   it to the transcript ingest.js pulled, and writes the cache.

   With the API you get `allowed_domains`, and the model
   physically cannot cite a source not approved. In a
   chat window you lose that. So it moves here: every URL is
   checked against the allowlist and every quote is fetched and
   matched character-for-character before it is allowed onto a
   card. A model that invents a plausible gov.uk URL gets
   caught by this script.

   This is intended to catch hallucinations and poor sources.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const E = require(path.join(__dirname, "engine.js"));
const { ALLOWLIST } = require(path.join(__dirname, "generate.js"));

const OUT = path.join(__dirname, "analyses.js");
const TDIR = path.join(__dirname, "transcripts");

const TYPES = ["numeric_factual", "regulatory_eligibility", "performance_return",
               "firm_product", "tax", "opinion"];
const CONFIDENCE = ["low", "medium", "high"];
/* The model is not permitted to emit the two FCA flags. */
const MODEL_FLAGS = Object.keys(E.FLAGS).filter((f) => f !== "unauthorised_firm" && f !== "warning_list_firm");
const SEARCHABLE = ALLOWLIST[1].concat(ALLOWLIST[2]);

/* --offline: skip the network quote check when the wifi is
   hostile. Quotes come in as UNVERIFIED and the card falls back
   to paraphrase. Never ship a cache imported this way without
   re-running verify-fixtures.js on a real connection. */
const OFFLINE = process.argv.includes("--offline");

const errors = [];
const warnings = [];
const err = (w, m) => errors.push(`${w}  ${m}`);
const warn = (w, m) => warnings.push(`${w}  ${m}`);

/* ---------------------------------------------------------- */

function normaliseForMatch(s) {
  return String(s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/&nbsp;|\s+/g, " ")
    .trim();
}

function stripHtml(html) {
  return normaliseForMatch(
    html.replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  );
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
}

function onAllowlist(url) {
  const h = hostOf(url);
  if (!h) return false;
  return SEARCHABLE.some((d) => h === d || h.endsWith("." + d));
}

function tierOf(url) {
  const h = hostOf(url);
  if (!h) return null;
  if (ALLOWLIST[1].some((d) => h === d || h.endsWith("." + d))) return 1;
  if (ALLOWLIST[2].some((d) => h === d || h.endsWith("." + d))) return 2;
  return null;
}

const pages = new Map();
async function getPage(url) {
  if (pages.has(url)) return pages.get(url);
  let r;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; FinCheck/0.1; hackathon prototype)" }
    });
    r = res.ok ? { ok: true, status: res.status, text: stripHtml(await res.text()) }
               : { ok: false, status: res.status, text: "" };
  } catch (e) { r = { ok: false, status: 0, text: "", error: e.message }; }
  pages.set(url, r);
  return r;
}

/* Build the deep link ourselves from the verified quote, so it
   cannot disagree with what is on the card. */
function fragmentFor(url, quote) {
  const anchor = normaliseForMatch(quote).split(/\s+/).slice(0, 10).join(" ");
  return `${url}#:~:text=${encodeURIComponent(anchor)}`;
}

/* ---------------------------------------------------------- */

async function importOne(key, pastePath) {
  const tPath = path.join(TDIR, `${key.replace(":", "_")}.json`);
  if (!fs.existsSync(tPath)) {
    console.error(`No transcript for ${key}. Run ingest.js first.`);
    process.exit(1);
  }
  const t = JSON.parse(fs.readFileSync(tPath, "utf8"));

  let raw = fs.readFileSync(pastePath, "utf8").trim();
  raw = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
  let paste;
  try { paste = JSON.parse(raw); }
  catch (e) {
    console.error(`That file is not valid JSON: ${e.message}`);
    console.error(`Ask the model to return the object again with no commentary around it.`);
    process.exit(1);
  }

  const inClaims = Array.isArray(paste) ? paste : paste.claims;
  if (!Array.isArray(inClaims)) { console.error(`No "claims" array in that file.`); process.exit(1); }

  const stamps = new Set(t.lines.map((l) => l.timestamp));
  const quotedPages = new Map();
  const out = [];

  for (let i = 0; i < inClaims.length; i++) {
    const c = inClaims[i] || {};
    const id = `c${i + 1}`;
    const where = `${id} @${c.timestamp || "?"}`.padEnd(16);

    if (!c.text) { err(where, "no claim text"); continue; }
    if (!TYPES.includes(c.type)) err(where, `type "${c.type}" is not one of: ${TYPES.join(", ")}`);
    if (c.timestamp && !stamps.has(c.timestamp)) {
      warn(where, `timestamp is not one from the transcript — the model may have guessed it`);
    }

    /* ---- opinions: set aside, never scored ---- */
    if (c.type === "opinion" || c.verdict === null) {
      out.push({
        id, timestamp: c.timestamp || null, text: c.text, type: "opinion",
        verdict: null,
        setAsideReason: c.setAsideReason || "Opinion, not a checkable claim"
      });
      continue;
    }

    /* ---- layer 1 ---- */
    if (!E.VERDICTS[c.verdict]) err(where, `verdict "${c.verdict}" is not a real verdict`);
    /* ---- layer 3 ---- */
    if (!CONFIDENCE.includes(c.confidence)) err(where, `confidence "${c.confidence}" must be low, medium or high`);
    /* ---- layer 2 ---- */
    const flags = [];
    (c.flags || []).forEach((f) => {
      if (f === "unauthorised_firm" || f === "warning_list_firm") {
        err(where, `the model is not allowed to set "${f}" — that comes from the FCA register lookup`);
      } else if (!MODEL_FLAGS.includes(f)) {
        err(where, `flag "${f}" is not one of: ${MODEL_FLAGS.join(", ")}`);
      } else flags.push(f);
    });

    const missing = (c.missing || []).map((m) =>
      typeof m === "string" ? { text: m, materiality: "material" }
        : { text: m.text, materiality: m.materiality === "minor" ? "minor" : "material" });

    /* ---- the source ---- */
    const s = c.source || {};
    let quoteState = s.quoteState || (s.quote ? "verified_quote" : s.url ? "paraphrase" : "no_source_found");
    let quote = s.quote || null;
    let fragment = null;
    let paraphrase = s.paraphrase || null;

    if (s.url && OFFLINE) {
      if (!onAllowlist(s.url)) {
        err(where, `SOURCE OFF THE ALLOWLIST — ${hostOf(s.url)}. Rejected.`);
        quoteState = "no_source_found"; quote = null;
      } else if (quote) {
        warn(where, "offline: quote NOT verified against the page — downgraded to paraphrase");
        quoteState = "paraphrase";
        paraphrase = paraphrase || `${s.name || hostOf(s.url)} sets this out on the linked page.`;
        quote = null;
      }
    } else if (s.url) {
      if (!onAllowlist(s.url)) {
        err(where, `SOURCE OFF THE ALLOWLIST — ${hostOf(s.url)}. Rejected. Re-run with a Tier 1 or Tier 2 page.`);
        quoteState = "no_source_found"; quote = null;
      } else {
        const page = await getPage(s.url);
        if (!page.ok) {
          err(where, `source URL returned ${page.status || "nothing"} — ${s.url}`);
          quoteState = "no_source_found"; quote = null;
        } else if (quote) {
          const needle = normaliseForMatch(quote);
          if (page.text.includes(needle)) {
            const already = quotedPages.get(s.url);
            if (already) {
              warn(where, `second verified quote from the same page as ${already} — downgraded to paraphrase`);
              quoteState = "paraphrase";
              paraphrase = paraphrase || `${s.name || hostOf(s.url)} sets this out on the linked page.`;
              quote = null;
            } else {
              quotedPages.set(s.url, id);
              quoteState = "verified_quote";
              fragment = fragmentFor(s.url, quote);
            }
          } else {
            warn(where, `QUOTE NOT ON THE PAGE — dropped. "${needle.slice(0, 55)}..."`);
            quoteState = "paraphrase";
            paraphrase = paraphrase || `${s.name || hostOf(s.url)} sets this out on the linked page.`;
            quote = null;
          }
        }
      }
    }

    if (quoteState === "paraphrase" && !paraphrase) {
      err(where, "paraphrase state with no paraphrase text");
    }

    /* ---- the FCA lookup: never the model's job ---- */
    let registerCheck = s.registerCheck || null;
    if (c.namedEntity && !registerCheck) {
      registerCheck = {
        firmSearched: c.namedEntity,
        state: "unchecked",
        referenceNumber: null,
        statement: null,
        checkedAt: null
      };
      warn(where, `names "${c.namedEntity}" and no register check. Look it up:
                 https://register.fca.org.uk/s/search?q=${encodeURIComponent(c.namedEntity)}
                 then add a registerCheck block to the JSON and re-import.`);
    }
    if (registerCheck && registerCheck.state && registerCheck.state !== "unchecked") {
      if (!registerCheck.checkedAt) err(where, "register check with no checkedAt date");
      if (registerCheck.state === "not_found" || registerCheck.state === "similar_names_only") {
        flags.push("unauthorised_firm");
      }
      if (registerCheck.state === "on_warning_list") flags.push("warning_list_firm");
      if (registerCheck.statement && /scam|fraud|criminal/i.test(registerCheck.statement)) {
        err(where, "register statement uses accusatory wording. Report what the register showed, with a date. Nothing more.");
      }
      if (registerCheck.state === "not_found" && !registerCheck.statement) {
        registerCheck.statement =
          `No exact match for "${registerCheck.firmSearched}" on the FCA Financial Services Register as at ${registerCheck.checkedAt}.`;
      }
      quoteState = "register_check";
      quote = null;
    }

    out.push({
      id,
      timestamp: c.timestamp || null,
      text: c.text,
      type: c.type,
      timeBound: !!c.timeBound,
      verdict: c.verdict,
      confidence: c.confidence,
      flags,
      missing,
      explanation: c.explanation || null,
      temporal: c.temporal || null,
      source: {
        tier: s.url ? tierOf(s.url) : null,
        name: s.name || (s.url ? hostOf(s.url) : null),
        url: s.url || null,
        quote,
        quoteVerified: quoteState === "verified_quote",
        quoteState,
        paraphrase,
        droppedQuote: (s.quote && !quote && quoteState !== "register_check") ? s.quote : null,
        textFragmentUrl: fragment || s.url || null,
        registerCheck
      }
    });
  }

  return {
    url: t.url,
    urlKey: t.urlKey,
    platform: t.platform,
    creator: t.creator,
    title: t.title,
    publishedAt: t.publishedAt,
    analysedAt: new Date().toISOString().slice(0, 10),
    cacheVersion: 3,
    transcriptState: "ok",
    transcriptSource: t.transcriptSource,
    transcriptWords: t.transcriptWords,
    ingestRoute: t.ingestRoute,
    claims: out
  };
}

/* ---------------------------------------------------------- */

function loadCache() {
  if (!fs.existsSync(OUT)) return [];
  try { return require(OUT).ANALYSES || []; }
  catch (e) { console.error("Could not read analyses.js — starting fresh."); return []; }
}

function saveCache(records) {
  fs.writeFileSync(OUT,
`/* ============================================================
   FinCheck — cached analyses

   GENERATED FILE. Do not edit by hand: hand-editing is how a
   quote stops matching its page. Re-import instead.

   Written ${new Date().toISOString()} — ${records.length} video(s).
   ============================================================ */

const ANALYSES = ${JSON.stringify(records, null, 2)};

if (typeof module !== "undefined" && module.exports) module.exports = { ANALYSES };
`);
}

async function main() {
  const [key, pastePath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!key || !pastePath) {
    console.error(`Usage: node import-analysis.js <urlKey> <analysis.json>
Example: node import-analysis.js yt:dQw4w9WgXcQ paste.json`);
    process.exit(1);
  }

  const record = await importOne(key, pastePath);

  if (warnings.length) {
    console.log(`\n--- warnings (imported anyway, but look at these) ---`);
    warnings.forEach((w) => console.log("  " + w));
  }
  if (errors.length) {
    console.log(`\n--- errors (nothing was written) ---`);
    errors.forEach((e) => console.log("  " + e));
    console.log(`\nFix these in the chat and re-export the JSON.\n`);
    process.exit(1);
  }

  const scored = E.scoreVideo(record);
  console.log(`\n--- ${record.title} ---`);
  console.log(`posted     ${record.publishedAt}`);
  console.log(`claims     ${record.claims.filter((c) => c.verdict).length} scored, ${record.claims.filter((c) => !c.verdict).length} set aside`);
  console.log(`score      ${scored.score}  ${scored.band.label}`);
  console.log(`binding    ${scored.bindingAxisLabel} via ${scored.bindingClaimId}`);
  console.log(`axes       ` + E.AXES.map((a) => `${a.label.split(" ")[0]} ${scored.axes[a.key]}`).join("  ·  "));
  console.log(`coverage   ${Math.round(scored.coverage * 100)}%   confidence ${scored.confidence}`);
  (scored.caps || []).forEach((c) => console.log(`cap        ${c.cap} — ${c.reason.slice(0, 70)}`));
  console.log(`quotes     ` + record.claims.filter((c) => c.source).map((c) => c.source.quoteState).join(", "));

  const cache = loadCache().filter((r) => r.urlKey !== record.urlKey);
  cache.push(record);
  saveCache(cache);
  console.log(`\nwrote analyses.js — ${cache.length} video(s) in the cache. Reload index.html.\n`);
}

main().catch((e) => { console.error(`\nFailed: ${e.message}\n`); process.exit(1); });

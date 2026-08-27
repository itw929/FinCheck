#!/usr/bin/env node
/* ============================================================
   FinCheck — fixture verifier

   Run:  node verify-fixtures.js

   Every card that says "verbatim, verified against source" is
   a promise. This re-checks that promise across the whole
   cache, offline from the API, using the same matching code
   the generator uses.

   Checks, per claim:
     1. Does the source URL still resolve?
     2. Does a "verified_quote" still appear on that page,
        character for character?
     3. Does the text fragment anchor actually appear?
     4. Is any page quoted more than once?
     5. Do register checks carry a date and a finding?

   Run it before every commit and on the morning of the demo.
   A dead link on a card that promises verifiability is worse
   than having no link at all.
   ============================================================ */

const path = require("path");
const { ANALYSES } = require(path.join(__dirname, "analyses.js"));
const E = require(path.join(__dirname, "engine.js"));

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
  );
}

const pageCache = new Map();

async function getPage(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  let result;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "FinCheck/0.1 (hackathon prototype; pre-commit verifier)" }
    });
    result = res.ok ? { ok: true, status: res.status, text: stripHtml(await res.text()) }
                    : { ok: false, status: res.status, text: "" };
  } catch (e) {
    result = { ok: false, status: 0, text: "", error: e.message };
  }
  pageCache.set(url, result);
  return result;
}

const problems = [];
const notes = [];

function fail(where, msg) { problems.push(`${where}  ${msg}`); }
function note(where, msg) { notes.push(`${where}  ${msg}`); }

async function main() {
  const quotedPages = new Map();   // url -> [claim refs]

  for (const record of ANALYSES) {
    const where0 = record.urlKey || record.url;

    /* The engine must be able to score it at all. */
    const scored = E.scoreVideo(record);
    note(where0.padEnd(20), `${scored.state}  score ${scored.score}  "${scored.band.label}"`);

    for (const claim of record.claims || []) {
      const where = `${where0} ${claim.id}`.padEnd(24);
      const s = claim.source;
      if (!claim.verdict || !s) continue;

      const state = s.quoteState || null;

      /* --- structural checks, no network --- */
      if (state === "verified_quote" && !s.quote) fail(where, "quoteState is verified_quote but there is no quote");
      if (state === "verified_quote" && !s.quoteVerified) fail(where, "quoteState is verified_quote but quoteVerified is false");
      if (s.quote && !state) fail(where, "has a quote but no quoteState");
      if (state === "paraphrase" && s.quote) fail(where, "paraphrase state must not carry a quote");
      if (state === "register_check" && !(s.registerCheck && s.registerCheck.checkedAt)) {
        fail(where, "register_check state with no dated register result");
      }
      if (s.registerCheck && s.registerCheck.state === "unchecked") {
        fail(where, `register check never ran for "${s.registerCheck.firmSearched}" — must not render as authorised`);
      }
      if (s.droppedQuote) note(where, `a quote was dropped by the verbatim check: "${String(s.droppedQuote).slice(0, 50)}..."`);

      /* --- one verified quote per source page --- */
      if (state === "verified_quote" && s.url) {
        const seen = quotedPages.get(s.url) || [];
        seen.push(where.trim());
        quotedPages.set(s.url, seen);
      }

      /* --- network checks --- */
      if (!s.url) continue;
      const page = await getPage(s.url);
      if (!page.ok) {
        fail(where, `source URL returned ${page.status || "no response"} — ${s.url}`);
        continue;
      }

      if (state === "verified_quote") {
        const needle = normaliseForMatch(s.quote);
        if (!page.text.includes(needle)) {
          fail(where, `QUOTE NOT ON PAGE — "${needle.slice(0, 60)}..."`);
        }
        if (s.textFragmentUrl && s.textFragmentUrl.includes("#:~:text=")) {
          const anchor = normaliseForMatch(
            decodeURIComponent(s.textFragmentUrl.split("#:~:text=")[1].split(",")[0])
          );
          if (!page.text.includes(anchor)) {
            fail(where, `text fragment will not resolve — "${anchor.slice(0, 50)}..."`);
          }
        } else {
          fail(where, "verified quote with no deep link — the user has to Ctrl+F");
        }
      }
    }
  }

  quotedPages.forEach((claims, url) => {
    if (claims.length > 1) {
      fail("(quote reuse)".padEnd(24), `${claims.length} verified quotes taken from one page: ${url}\n${" ".repeat(26)}${claims.join(", ")}`);
    }
  });

  console.log("\n--- records ---");
  notes.forEach((n) => console.log("  " + n));

  console.log(`\n--- ${problems.length ? "PROBLEMS" : "no problems"} ---`);
  problems.forEach((p) => console.log("  " + p));
  console.log("");

  process.exit(problems.length ? 1 : 0);
}

main();

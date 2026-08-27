/* ============================================================
   FinCheck — engine test harness (v3)

   Run:  node test-engine.js

   This prints the workings, not just the scores. When a mentor
   says "why is that 8?", you scroll here.
   ============================================================ */

const path = require("path");
const E = require(path.join(__dirname, "engine.js"));
const { ANALYSES } = require(path.join(__dirname, "analyses.js"));

const EXPECTED = [69, 0, 8, 60];
let pass = true;

const line = (ch = "=") => ch.repeat(70);

ANALYSES.forEach((a, i) => {
  const r = E.scoreVideo(a);
  const ok = r.score === EXPECTED[i];
  if (!ok) pass = false;

  console.log(`\n${line()}`);
  console.log(`ARCHETYPE ${i + 1}  ${a.title}`);
  console.log(line());
  console.log(`score       ${r.score}   expected ${EXPECTED[i]}   ${ok ? "OK" : "MISMATCH"}`);
  console.log(`band        ${r.band.label}  (${r.band.level})`);
  console.log(`binding     ${r.bindingAxisLabel} via claim ${r.bindingClaimId}  (pre-cap ${r.workings.preCapScore})`);
  console.log(`confidence  ${r.confidence}    coverage ${Math.round(r.coverage * 100)}%${r.lowCoverage ? "  [LOW]" : ""}`);
  console.log(`set aside   ${r.setAside.length} line(s)   unassessed ${r.unassessed}`);

  console.log(`\naxes:`);
  E.AXES.forEach((ax) => {
    const w = r.workings.perAxis[ax.key].workings;
    const val = r.axes[ax.key];
    const detail = w
      ? `worst ${w.worstClaimDeduction} (${w.worstClaimId}) + others ${w.otherClaimsDeduction}`
      : "not assessed";
    const marker = ax.key === r.bindingAxis ? " <-- headline" : "";
    console.log(`  ${ax.label.padEnd(24)} ${String(val === null ? "n/a" : val).padStart(3)}   ${detail}${marker}`);
  });

  if (r.caps.length) {
    console.log(`\ncaps fired:`);
    r.caps.forEach((c) => console.log(`  cap ${String(c.cap).padStart(2)} — ${c.reason.slice(0, 80)}`));
  }

  console.log(`\nclaims:`);
  r.claims.forEach((c) => {
    const flags = c.flagKeys.join(", ") || "none";
    console.log(`  ${String(c.timestamp || "-").padEnd(6)} ${c.verdictMeta.label.padEnd(24)} claimScore=${String(c.claimScore).padStart(3)}  conf=${c.confidence.padEnd(6)} src=${c.sourceState.padEnd(15)} flags: ${flags}`);
  });

  if (r.setAside.length) {
    console.log(`\nset aside:`);
    r.setAside.forEach((s) => console.log(`  ${String(s.timestamp || "-").padEnd(6)} ${s.reason}`));
  }
});

/* ---------------- URL normalisation ---------------- */
console.log(`\n${line()}\nURL NORMALISATION\n${line()}`);
[
  "https://www.youtube.com/shorts/abc123XY?si=trackingjunk",
  "https://youtu.be/abc123XY",
  "https://www.youtube.com/watch?v=abc123XY&t=10s",
  "https://m.youtube.com/watch?app=desktop&v=abc123XY",
  "https://www.tiktok.com/@moneywithmaya/video/7412345678901234567",
  "https://vm.tiktok.com/ZGeAbCdEf/",
  "https://www.instagram.com/reel/C8xY_zAbCdE/?igsh=abc",
  "https://www.instagram.com/moneymaya/reel/C8xY_zAbCdE/",
  "https://example.com/not-a-video"
].forEach((u) => {
  const n = E.normaliseUrl(u);
  console.log(`  ${(n.key || "NO MATCH").padEnd(26)} ${(n.platform || "-").padEnd(15)} ${n.shortlink ? "[resolve first] " : ""}${u.slice(0, 46)}`);
});

/* ---------------- edge cases ---------------- */
console.log(`\n${line()}\nEDGE CASES\n${line()}`);

function edge(label, analysis) {
  const r = E.scoreVideo(analysis);
  console.log(`  ${label.padEnd(28)} state=${r.state.padEnd(22)} score=${String(r.score).padStart(4)}  "${r.band.label}"`);
  return r;
}

edge("no transcript", { url: "https://youtu.be/aaa", transcriptState: "unavailable", claims: [] });

edge("opinions only", { url: "https://youtu.be/zzz", claims: [
  { type: "opinion", verdict: null, text: "I think banks are a scam" },
  { type: "opinion", verdict: null, text: "Crypto is boring" }
]});

edge("all unverifiable", { url: "https://youtu.be/yyy", claims: [
  { verdict: "unverifiable", type: "performance_return", confidence: "low", text: "I made 40% last year" },
  { verdict: "unverifiable", type: "performance_return", confidence: "low", text: "My mate made 60%" }
]});

edge("all accurate", { url: "https://youtu.be/xxx", claims: [
  { verdict: "accurate", type: "numeric_factual", confidence: "high", text: "ISA allowance is 20k" },
  { verdict: "accurate", type: "numeric_factual", confidence: "high", text: "It resets in April" }
]});

edge("6x incomplete", { url: "https://youtu.be/www", claims:
  Array.from({ length: 6 }, (_, i) => ({
    verdict: "accurate_but_incomplete", type: "numeric_factual", confidence: "high",
    text: `distinct claim number ${i}`, missing: ["one condition"]
  }))
});

edge("same claim said 3x", { url: "https://youtu.be/vvv", claims:
  Array.from({ length: 3 }, () => ({
    verdict: "false", type: "numeric_factual", confidence: "high",
    text: "You can put twenty grand into a LISA"
  }))
});

edge("accurate + warning list", { url: "https://youtu.be/uuu", claims: [
  { verdict: "accurate", type: "firm_product", confidence: "high",
    text: "This platform pays 12% guaranteed", flags: ["warning_list_firm", "risk_not_stated"] }
]});

edge("half unverifiable", { url: "https://youtu.be/ttt", claims: [
  { verdict: "accurate", type: "numeric_factual", confidence: "high", text: "a" },
  { verdict: "unverifiable", type: "performance_return", confidence: "low", text: "b" },
  { verdict: "unverifiable", type: "performance_return", confidence: "low", text: "c" }
]});

/* ---------------- calibration table ---------------- */
console.log(`\n${line()}\nSINGLE-CLAIM CALIBRATION — what one claim of each kind scores\n${line()}`);
Object.keys(E.VERDICTS).forEach((v) => {
  const r = E.scoreVideo({ url: "https://youtu.be/cal", claims: [
    { verdict: v, type: "numeric_factual", confidence: "high", text: `a ${v} claim`, missing: v === "accurate" ? [] : ["one condition"] }
  ]});
  console.log(`  ${v.padEnd(26)} ${String(r.score).padStart(3)}  ${r.band.label}`);
});
Object.keys(E.FLAGS).forEach((f) => {
  const r = E.scoreVideo({ url: "https://youtu.be/cal", claims: [
    { verdict: "accurate", type: "firm_product", confidence: "high", text: "a true claim", flags: [f] }
  ]});
  console.log(`  accurate + ${f.padEnd(23)} ${String(r.score).padStart(3)}  ${r.band.label}`);
});

console.log(`\n${pass ? "ALL ARCHETYPE SCORES MATCH" : "SCORES DID NOT MATCH — check calibration"}\n`);

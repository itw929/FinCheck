/* ============================================================
   FinCheck — scoring engine

   The overall score is the lowest of the four, not the average.

   The four axes ARE the score. Verdicts and flags feed
   the axes; the axes produce the headline. There is no second
   arithmetic. Everything on screen traces to one rule:

     On each axis, the worst claim sets the level, and every
     other claim can add up to 20 more points of damage.
     The headline is the lowest assessed axis. We never average.

   Pure functions only
   ============================================================ */

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FinCheckEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {

  /* =========================================================
     0. CALIBRATION
     Every variable number in FinCheck lives in this block.
     ========================================================= */

  const CAL = {
    /* How much every claim OTHER than the worst can add to an
       axis. Capped per axis: completeness fires on almost every
       video, so unbounded repetition there would label six
       true-but-incomplete claims "Misleading", which is exactly
       the reflexive-debunker failure we are trying to avoid. */
    REPEAT_WEIGHT: 0.25,
    REPEAT_CAP: {
      factualAccuracy: 20,
      riskDisclosure: 15,
      incentiveTransparency: 20,
      completeness: 12
    },

    /* Coverage cap. A video where we could only check one claim
       in three must not read "Broadly reliable". Continuous, so
       there is no cliff: 100% coverage caps at 100, and you need
       roughly 63% coverage before the top band is reachable. */
    COVERAGE_CAP_BASE: 60,
    COVERAGE_CAP_RANGE: 40,

    /* Completeness: the verdict earns the first omission. Each
       additional MATERIAL omission adds this much. */
    EXTRA_OMISSION_COST: 6,

    /* Per-claim ceilings, so no single claim can exceed the axis. */
    MAX_RISK_PER_CLAIM: 75,
    MAX_INCENTIVE_PER_CLAIM: 95,
    MAX_COMPLETENESS_PER_CLAIM: 55,

    /* Below this share of checkable claims, we do not present the
       score as settled. */
    MIN_COVERAGE: 0.5
  };

  /* =========================================================
     1. VERDICTS — one per claim, mutually exclusive.
     Purely about the claim's relationship to the evidence.

     accuracy      : the factual-accuracy axis value for this claim
                     (null = we could not assess it, which is NOT
                     the same as zero and must never be averaged in)
     completeness  : base damage to the completeness axis
     ========================================================= */

  const VERDICTS = {
    accurate: {
      accuracy: 100, completeness: 0, band: "pass",
      label: "Accurate", short: "Checks out"
    },
    accurate_but_incomplete: {
      accuracy: 92, completeness: 25, band: "warn",
      label: "Accurate but incomplete", short: "True, with caveats"
    },
    outdated: {
      accuracy: 60, completeness: 20, band: "warn",
      label: "Outdated", short: "Was true when posted"
    },
    misleading: {
      accuracy: 45, completeness: 35, band: "fail",
      label: "Misleading", short: "Creates a false impression"
    },
    false: {
      accuracy: 5, completeness: 35, band: "fail",
      label: "False", short: "Contradicted by a trusted source"
    },
    unverifiable: {
      accuracy: null, completeness: 0, band: "neutral",
      label: "Unverifiable", short: "No trusted source settles it"
    }
  };

  /* =========================================================
     2. FLAGS — several per claim, orthogonal to the verdict.
     Each flag names the axis it damages and what it costs.
     ========================================================= */

  const FLAGS = {
    warning_list_firm: {
      axis: "incentive", cost: 95,
      label: "On the FCA Warning List",
      detail: "The FCA has published a warning about this firm"
    },
    unauthorised_firm: {
      axis: "incentive", cost: 70,
      label: "Not FCA authorised",
      detail: "Firm does not appear on the FCA Financial Services Register"
    },
    undisclosed_incentive: {
      axis: "incentive", cost: 45,
      label: "Undisclosed incentive",
      detail: "Affiliate link, referral code or unmarked sponsorship"
    },
    advice_in_disguise: {
      axis: "incentive", cost: 30,
      label: "Advice in disguise",
      detail: "A specific product recommendation dressed as education"
    },
    risk_not_stated: {
      axis: "risk", cost: 40,
      label: "Risk not stated",
      detail: "Loss, lock-in, leverage or volatility unmentioned"
    },
    survivorship_bias: {
      axis: "risk", cost: 25,
      label: "Survivorship bias",
      detail: "One winning result presented as representative"
    },
    pressure_tactics: {
      axis: "risk", cost: 20,
      label: "Pressure tactics",
      detail: "Urgency, scarcity or fear of missing out"
    }
  };

  /* =========================================================
     3. SAFETY CAPS
     These are product judgements, not arithmetic. When one
     fires we say so on the card, in words, with the reason.
     ========================================================= */

  const CAPS = [
    {
      cap: 5,
      test: (claims) => claims.some((c) => c.flagKeys.includes("warning_list_firm")),
      reason: "A firm named in this video is on the FCA Warning List."
    },
    {
      cap: 15,
      test: (claims) => claims.some((c) => c.flagKeys.includes("unauthorised_firm")),
      reason: "A firm named in this video is not on the FCA Financial Services Register, so you would have no access to the Financial Ombudsman or FSCS compensation."
    },
    {
      cap: 40,
      test: (claims) => claims.some((c) => c.verdict === "false"),
      reason: "This video states something a Tier 1 source directly contradicts."
    }
  ];

  const BANDS = [
    { min: 85, level: "pass",     label: "Broadly reliable",     sub: "Nothing here contradicts a trusted source" },
    { min: 60, level: "warn",     label: "Check before you act", sub: "Parts of this are incomplete or out of date" },
    { min: 30, level: "fail",     label: "Misleading",           sub: "This gives a false impression" },
    { min: 0,  level: "critical", label: "Do not act on this",   sub: "Serious problems — see the flags below" }
  ];

  const AXES = [
    { key: "factualAccuracy",        label: "Factual accuracy",     question: "Are the verifiable statements correct?" },
    { key: "riskDisclosure",         label: "Risk disclosure",      question: "What could go wrong that they did not say?" },
    { key: "incentiveTransparency",  label: "Incentive and conflict", question: "Who profits if you act on this?" },
    { key: "completeness",           label: "Completeness",         question: "Which fees, conditions or eligibility rules are missing?" }
  ];

  const CONFIDENCE_ORDER = ["low", "medium", "high"];

  /* =========================================================
     4. Helpers
     ========================================================= */

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round(n) { return Math.round(n); }

  function verdictOf(claim) {
    return VERDICTS[claim.verdict] || VERDICTS.unverifiable;
  }

  function validFlags(claim) {
    return (claim.flags || []).filter((f) => FLAGS[f]);
  }

  /* `missing` accepts plain strings (treated as material) or
     objects { text, materiality: "material" | "minor" }. */
  function omissions(claim) {
    return (claim.missing || []).map((m) =>
      typeof m === "string"
        ? { text: m, materiality: "material" }
        : { text: m.text, materiality: m.materiality === "minor" ? "minor" : "material" }
    );
  }

  function normaliseText(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  }

  /* =========================================================
     5. Per-claim deductions, one function per axis.
     Each returns points of damage (0-100), or null for
     "this claim says nothing about this axis".
     ========================================================= */

  function accuracyDeduction(claim) {
    const a = verdictOf(claim).accuracy;
    return a === null ? null : 100 - a;
  }

  function flagCostOn(claim, axis) {
    return validFlags(claim)
      .filter((f) => FLAGS[f].axis === axis)
      .reduce((sum, f) => sum + FLAGS[f].cost, 0);
  }

  function riskDeduction(claim) {
    return Math.min(CAL.MAX_RISK_PER_CLAIM, flagCostOn(claim, "risk"));
  }

  function incentiveDeduction(claim) {
    return Math.min(CAL.MAX_INCENTIVE_PER_CLAIM, flagCostOn(claim, "incentive"));
  }

  function completenessDeduction(claim) {
    const base = verdictOf(claim).completeness;
    const material = omissions(claim).filter((o) => o.materiality === "material").length;
    /* The verdict already accounts for the first omission — that
       is what made it incomplete. Only the extras add. */
    const extra = Math.max(0, material - 1) * CAL.EXTRA_OMISSION_COST;
    return Math.min(CAL.MAX_COMPLETENESS_PER_CLAIM, base + extra);
  }

  const DEDUCTORS = {
    factualAccuracy: accuracyDeduction,
    riskDisclosure: riskDeduction,
    incentiveTransparency: incentiveDeduction,
    completeness: completenessDeduction
  };

  /* =========================================================
     6. Claim description — everything the UI draws
     ========================================================= */

  function describeClaim(claim, index) {
    const v = verdictOf(claim);
    const flagKeys = validFlags(claim);
    const oms = omissions(claim);

    const deductions = {};
    Object.keys(DEDUCTORS).forEach((k) => { deductions[k] = DEDUCTORS[k](claim); });

    const axes = {};
    Object.keys(deductions).forEach((k) => {
      axes[k] = deductions[k] === null ? null : clamp(100 - deductions[k], 0, 100);
    });

    const assessed = Object.values(axes).filter((n) => typeof n === "number");

    return Object.assign({}, claim, {
      id: claim.id || `c${index + 1}`,
      verdictMeta: { key: claim.verdict, label: v.label, short: v.short, band: v.band },
      flagKeys: flagKeys,
      flagsMeta: flagKeys.map((f) => Object.assign({ key: f }, FLAGS[f])),
      missing: oms,
      deductions: deductions,
      axes: axes,
      /* A claim is only as good as its weakest assessed axis.
         Unassessed axes are skipped, never counted as zero. */
      claimScore: assessed.length ? Math.min.apply(null, assessed) : null,
      confidence: CONFIDENCE_ORDER.includes(claim.confidence) ? claim.confidence : "low",
      sourceState: sourceStateOf(claim),
      temporalNote: temporalNoteOf(claim),
      repeats: claim.repeats || 1
    });
  }

  /* Four honest outcomes. Three come from the quote check; the
     fourth is a register result, which is not a quotable
     sentence and gets its own card. None of them is a fudge. */
  const SOURCE_STATES = ["verified_quote", "paraphrase", "register_check", "no_source_found"];

  function sourceStateOf(claim) {
    const s = claim.source || {};
    if (SOURCE_STATES.includes(s.quoteState)) return s.quoteState;
    /* Fall back to inferring it, for records written before the
       generator started setting the field explicitly. */
    if (s.registerCheck) return "register_check";
    if (s.quote && s.quoteVerified) return "verified_quote";
    if (s.paraphrase || (s.url && !s.quote)) return "paraphrase";
    return "no_source_found";
  }

  function temporalNoteOf(claim) {
    const t = claim.temporal;
    if (!t) return null;
    if (t.changedSince) {
      return {
        kind: "changed",
        text: `Accurate when this was posted. The rules or figures have changed since ${t.assessedAgainst || "publication"}.`
      };
    }
    if (t.verdictAtPublication && t.verdictAtPublication !== claim.verdict) {
      return { kind: "differs", text: `Assessed against ${t.assessedAgainst}, when this was ${VERDICTS[t.verdictAtPublication] ? VERDICTS[t.verdictAtPublication].label.toLowerCase() : t.verdictAtPublication}.` };
    }
    return { kind: "stable", text: `Checked against the rules in force on ${t.assessedAgainst || "the publication date"}.` };
  }

  /* =========================================================
     7. Axis aggregation — the one rule
     ========================================================= */

  function aggregateAxis(claims, key) {
    const ds = claims
      .map((c) => ({ id: c.id, d: c.deductions[key] }))
      .filter((x) => typeof x.d === "number")
      .sort((a, b) => b.d - a.d);

    if (!ds.length) return { score: null, worstClaimId: null, workings: null };

    const worst = ds[0];
    const restSum = ds.slice(1).reduce((a, b) => a + b.d, 0);
    const repeatCap = CAL.REPEAT_CAP[key] !== undefined ? CAL.REPEAT_CAP[key] : 20;
    const repeatDamage = Math.min(repeatCap, CAL.REPEAT_WEIGHT * restSum);
    const total = worst.d + repeatDamage;

    return {
      score: clamp(round(100 - total), 0, 100),
      worstClaimId: worst.d > 0 ? worst.id : null,
      workings: {
        worstClaimDeduction: round(worst.d),
        worstClaimId: worst.id,
        otherClaimsDeduction: Math.round(repeatDamage * 10) / 10,
        assessedClaims: ds.length
      }
    };
  }

  /* =========================================================
     8. Video-level scoring
     ========================================================= */

  /* Creators repeat themselves. Collapse identical claims so the
     same statement is not punished once per utterance. */
  function dedupe(rawClaims) {
    const seen = new Map();
    rawClaims.forEach((c) => {
      const k = normaliseText(c.text) + "|" + (c.verdict || "");
      if (!k.trim()) { seen.set(Symbol(), Object.assign({}, c)); return; }
      if (seen.has(k)) {
        const first = seen.get(k);
        first.repeats = (first.repeats || 1) + 1;
        first.alsoAt = (first.alsoAt || []).concat(c.timestamp ? [c.timestamp] : []);
      } else {
        seen.set(k, Object.assign({}, c, { repeats: 1 }));
      }
    });
    return Array.from(seen.values());
  }

  function aggregateConfidence(claims, bindingAxisKey) {
    /* Worst confidence among the claims that set the axis the
       headline came from. A shaky verdict on a claim that did not
       move the number should not make the whole result look
       uncertain, and vice versa. */
    const movers = claims.filter((c) => {
      const d = c.deductions[bindingAxisKey];
      return typeof d === "number" && d > 0;
    });
    const pool = movers.length ? movers : claims;
    if (!pool.length) return null;
    return pool
      .map((c) => c.confidence)
      .sort((a, b) => CONFIDENCE_ORDER.indexOf(a) - CONFIDENCE_ORDER.indexOf(b))[0];
  }

  function bandFor(score) {
    return BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
  }

  function scoreVideo(analysis) {
    const raw = Array.isArray(analysis.claims) ? analysis.claims : [];

    /* No transcript is not a pass. It is a different answer. */
    if (analysis.transcriptState === "unavailable" || analysis.transcript === null) {
      return nonScoringResult(analysis, {
        state: "no_transcript",
        headline: "No transcript available",
        detail: "We could not read what was said in this video, so we cannot check it."
      });
    }

    /* Opinions and non-claims never reach scoring. Counted so the
       UI can show what was set aside and why. */
    const scorable = raw.filter((c) => c.verdict && c.type !== "opinion");
    const setAside = raw
      .filter((c) => !c.verdict || c.type === "opinion")
      .map((c) => ({
        timestamp: c.timestamp || null,
        text: c.text || null,
        reason: c.setAsideReason || "Opinion, not a checkable claim"
      }));

    const claims = dedupe(scorable).map(describeClaim);

    if (!claims.length) {
      return nonScoringResult(analysis, {
        state: "no_claims",
        headline: "No financial claims found",
        detail: "Nothing in this video makes a checkable claim about money.",
        setAside: setAside
      });
    }

    const checked = claims.filter((c) => c.verdict !== "unverifiable");
    const coverage = checked.length / claims.length;

    if (!checked.length) {
      return nonScoringResult(analysis, {
        state: "insufficient_evidence",
        headline: "Not enough evidence to assess",
        detail: "No trusted source settles any of the claims in this video. That is a statement about our sources, not about the creator.",
        setAside: setAside,
        claims: claims
      });
    }

    /* --- the four axes --- */
    const axisResults = {};
    AXES.forEach((a) => { axisResults[a.key] = aggregateAxis(claims, a.key); });

    const axes = {};
    AXES.forEach((a) => { axes[a.key] = axisResults[a.key].score; });

    /* --- the headline: lowest assessed axis. Never an average. --- */
    const assessedAxes = AXES
      .map((a) => ({ key: a.key, label: a.label, score: axes[a.key] }))
      .filter((a) => typeof a.score === "number")
      .sort((a, b) => a.score - b.score);

    const binding = assessedAxes[0];
    let score = binding.score;

    const capsFired = CAPS.filter((c) => c.test(claims)).slice();

    /* Coverage is a cap, not an axis. Not being able to check
       something is our limit, not the creator's fault. It
       never costs the video points on an axis, but it does stop
       us presenting a thin result as a settled one. */
    const coverageCap = Math.round(CAL.COVERAGE_CAP_BASE + CAL.COVERAGE_CAP_RANGE * coverage);
    if (coverageCap < score) {
      capsFired.push({
        cap: coverageCap,
        reason: `We could only settle ${checked.length} of ${claims.length} claims against a trusted source, so this score is not presented as final.`
      });
    }

    capsFired.forEach((c) => { score = Math.min(score, c.cap); });

    return {
      state: "scored",
      score: score,
      band: bandFor(score),

      axes: axes,
      axisMeta: AXES,
      bindingAxis: binding.key,
      bindingAxisLabel: binding.label,
      bindingClaimId: axisResults[binding.key].worstClaimId,

      confidence: aggregateConfidence(claims, binding.key),
      coverage: Math.round(coverage * 100) / 100,
      lowCoverage: coverage < CAL.MIN_COVERAGE,

      claims: claims,
      setAside: setAside,
      unassessed: claims.length - checked.length,

      caps: capsFired.map((c) => ({ cap: c.cap, reason: c.reason })),
      capped: capsFired.length > 0 && score < binding.score,

      workings: {
        rule: "On each axis, the worst claim sets the level and every other claim can add up to 20 more points of damage. The headline is the lowest of the four axes. We never average.",
        perAxis: axisResults,
        preCapScore: binding.score
      },

      video: videoMeta(analysis)
    };
  }

  function nonScoringResult(analysis, extra) {
    return Object.assign({
      score: null,
      band: { level: "neutral", label: extra.headline, sub: extra.detail },
      axes: null,
      axisMeta: AXES,
      bindingAxis: null,
      bindingClaimId: null,
      confidence: null,
      coverage: null,
      lowCoverage: false,
      claims: extra.claims || [],
      setAside: extra.setAside || [],
      unassessed: (extra.claims || []).length,
      caps: [],
      capped: false,
      workings: null,
      video: videoMeta(analysis)
    }, extra);
  }

  function videoMeta(analysis) {
    return {
      url: analysis.url || null,
      urlKey: analysis.urlKey || (analysis.url ? normaliseUrl(analysis.url).key : null),
      platform: analysis.platform || null,
      creator: analysis.creator || null,
      title: analysis.title || null,
      publishedAt: analysis.publishedAt || null,
      analysedAt: analysis.analysedAt || null,
      transcriptSource: analysis.transcriptSource || null,
      transcriptWords: analysis.transcriptWords || null
    };
  }

  /* =========================================================
     9. URL normalisation — the cache key
     Two people sharing the same video produce different URLs.
     Everything below reduces them to one stable key.
     ========================================================= */

  const URL_PATTERNS = [
    { platform: "YouTube Shorts", prefix: "yt", re: /youtube\.com\/shorts\/([\w-]{5,})/i },
    { platform: "YouTube",        prefix: "yt", re: /youtube\.com\/live\/([\w-]{5,})/i },
    { platform: "YouTube",        prefix: "yt", re: /youtube\.com\/(?:watch|embed)\/?\?(?:.*&)?v=([\w-]{5,})/i },
    { platform: "YouTube",        prefix: "yt", re: /youtube\.com\/embed\/([\w-]{5,})/i },
    { platform: "YouTube",        prefix: "yt", re: /youtu\.be\/([\w-]{5,})/i },
    { platform: "TikTok",         prefix: "tt", re: /tiktok\.com\/@[\w.-]+\/video\/(\d{6,})/i },
    { platform: "TikTok",         prefix: "tt", re: /tiktok\.com\/(?:t\/)?([A-Za-z0-9]{6,})\/?$/i },
    { platform: "TikTok",         prefix: "tt", re: /vm\.tiktok\.com\/([A-Za-z0-9]{6,})/i },
    { platform: "Instagram",      prefix: "ig", re: /instagram\.com\/(?:[\w.]+\/)?reels?\/([\w-]{5,})/i },
    { platform: "Instagram",      prefix: "ig", re: /instagram\.com\/p\/([\w-]{5,})/i }
  ];

  function normaliseUrl(input) {
    const raw = String(input || "").trim();
    if (!raw) return { key: null, platform: null, id: null, shortlink: false };

    /* Drop the fragment. Tracking params (?si=, ?utm_*, ?igsh=)
       fall out because every pattern anchors on the path. */
    const cleaned = raw.split("#")[0];

    for (let i = 0; i < URL_PATTERNS.length; i++) {
      const p = URL_PATTERNS[i];
      const m = cleaned.match(p.re);
      if (m) {
        return {
          key: `${p.prefix}:${m[1]}`,
          platform: p.platform,
          id: m[1],
          /* Shortlinks resolve to a different id server-side, so the
             generator must follow the redirect before caching. */
          shortlink: /vm\.tiktok\.com|tiktok\.com\/t\//i.test(cleaned)
        };
      }
    }
    return { key: null, platform: null, id: null, shortlink: false };
  }

  /* =========================================================
     10. Public surface
     ========================================================= */
  return {
    scoreVideo: scoreVideo,
    describeClaim: describeClaim,
    normaliseUrl: normaliseUrl,
    aggregateAxis: aggregateAxis,
    VERDICTS: VERDICTS,
    FLAGS: FLAGS,
    BANDS: BANDS,
    AXES: AXES,
    CAPS: CAPS,
    CAL: CAL
  };
});

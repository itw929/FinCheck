/* ============================================================
   FinCheck — cached analyses

   THIS FILE IS OUTPUT, NOT INPUT.

   generate.js writes it. The four records below are the archetype
   fixtures the test harness runs against. The eight demo videos
   will be generated and land in this same file, in this same shape.

   Loaded two ways on purpose:
     browser  <script src="analyses.js">  -> global ANALYSES
     node     require("./analyses.js")    -> { ANALYSES }
   No fetch, so it works from file:// and from GitHub Pages
   with no server and no build step.

   ------------------------------------------------------------
   ON QUOTES: every "quoteVerified: true" below was checked
   character-for-character against the live page. Where a page
   had no single clean sentence, or where one quote from that
   page was already used, the record uses quoteState
   "paraphrase" and carries no quote. That is a designed
   outcome, not a gap. Never write a quote in here by hand.
   Run `node verify-fixtures.js` before you commit.
   ============================================================ */

const ANALYSES = [

  /* ==========================================================
     ARCHETYPE 1 — true but incomplete
     Proves FinCheck is not a reflexive debunker.
     Expected score: 46  (Misleading)
     ========================================================== */
  {
    url: "https://www.youtube.com/shorts/EXAMPLE_ID_1",
    urlKey: "yt:EXAMPLE_ID_1",
    platform: "YouTube Shorts",
    creator: "@examplecreator",
    title: "Why you should never overpay your student loan",
    publishedAt: "2026-05-12",
    analysedAt: "2026-08-27",
    cacheVersion: 3,
    transcriptState: "ok",
    transcriptSource: "captions",
    transcriptWords: 168,

    claims: [
      {
        id: "c1",
        timestamp: "0:06",
        text: "You pay 9% of everything you earn over the threshold. That's it, that's the whole system.",
        type: "regulatory_eligibility",
        timeBound: true,

        verdict: "accurate_but_incomplete",
        confidence: "high",
        flags: [],
        missing: [
          { text: "Postgraduate Loans repay at 6%, not 9%", materiality: "material" },
          { text: "The threshold depends on your plan — £25,000 on Plan 5, £26,900 on Plan 1", materiality: "material" }
        ],
        explanation:
          "Right for Plan 1, 2, 4 and 5 loans. It does not hold for a Postgraduate Loan, which repays at 6%, and the threshold it is 9% of depends on which plan you are on.",

        temporal: {
          assessedAgainst: "2026-05-12",
          verdictAtPublication: "accurate_but_incomplete",
          changedSince: false,
          whatChanged: null
        },

        source: {
          tier: 1,
          name: "gov.uk",
          url: "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
          quote: "6% of your income over the threshold if you're on a Postgraduate Loan plan",
          quoteVerified: true,
          quoteState: "verified_quote",
          droppedQuote: null,
          textFragmentUrl:
            "https://www.gov.uk/repaying-your-student-loan/what-you-pay#:~:text=6%25%20of%20your%20income%20over%20the%20threshold",
          registerCheck: null
        }
      },
      {
        id: "c2",
        timestamp: "0:22",
        text: "It comes straight out of your payslip so you never even see it.",
        type: "numeric_factual",
        timeBound: false,

        verdict: "accurate",
        confidence: "high",
        flags: [],
        missing: [],
        explanation:
          "Repayments are collected through PAYE for employed borrowers, so they are deducted before the money reaches you.",

        temporal: {
          assessedAgainst: "2026-05-12",
          verdictAtPublication: "accurate",
          changedSince: false,
          whatChanged: null
        },

        source: {
          tier: 1,
          name: "gov.uk",
          url: "https://www.gov.uk/repaying-your-student-loan/how-you-repay",
          quote: null,
          quoteVerified: false,
          quoteState: "paraphrase",
          paraphrase: "gov.uk sets out that employed borrowers repay through PAYE, with deductions taken by the employer from salary.",
          droppedQuote: null,
          textFragmentUrl: "https://www.gov.uk/repaying-your-student-loan/how-you-repay",
          registerCheck: null
        }
      },
      {
        id: "c3",
        timestamp: "0:31",
        text: "Honestly I think the whole system is a scam.",
        type: "opinion",
        verdict: null,
        setAsideReason: "Opinion, not a checkable claim"
      }
    ]
  },

  /* ==========================================================
     ARCHETYPE 2 — straightforwardly false
     The obvious win, with the source quote doing the work.
     Expected score: 0  (Do not act on this)

     NOTE: the opening claim is MISLEADING, not "accurate but
     incomplete". By our own rule, omitting the withdrawal
     charge changes what a reasonable person would DO, not just
     what they would know. The card mock in the deck labels
     this one incomplete and needs regenerating from this file.
     ========================================================== */
  {
    url: "https://www.youtube.com/shorts/EXAMPLE_ID_2",
    urlKey: "yt:EXAMPLE_ID_2",
    platform: "YouTube Shorts",
    creator: "@examplecreator2",
    title: "The free money account nobody tells you about",
    publishedAt: "2026-06-30",
    analysedAt: "2026-08-27",
    cacheVersion: 3,
    transcriptState: "ok",
    transcriptSource: "captions",
    transcriptWords: 141,

    claims: [
      {
        id: "c1",
        timestamp: "0:03",
        text: "A Lifetime ISA is basically free money — the government just gives you 25% on top.",
        type: "numeric_factual",
        timeBound: true,

        verdict: "misleading",
        confidence: "high",
        flags: ["risk_not_stated"],
        missing: [
          { text: "25% government charge on withdrawals outside the rules", materiality: "material" },
          { text: "Locked until 60 unless you are buying a first home", materiality: "material" },
          { text: "£450,000 property price cap", materiality: "material" }
        ],
        explanation:
          "The 25% bonus is real. Calling it free money leaves out the withdrawal charge, and because that charge applies to the larger total, taking the money out early returns less than you put in.",

        temporal: {
          assessedAgainst: "2026-06-30",
          verdictAtPublication: "misleading",
          changedSince: false,
          whatChanged: null
        },

        source: {
          tier: 1,
          name: "MoneyHelper",
          url: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          quote: "The charge is 25% of the amount withdrawn.",
          quoteVerified: true,
          quoteState: "verified_quote",
          droppedQuote: null,
          textFragmentUrl:
            "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas#:~:text=The%20charge%20is%2025%25%20of%20the%20amount%20withdrawn",
          registerCheck: null
        }
      },
      {
        id: "c2",
        timestamp: "0:19",
        text: "You can pay in twenty grand a year and get five grand back.",
        type: "numeric_factual",
        timeBound: true,

        verdict: "false",
        confidence: "high",
        flags: [],
        missing: [],
        explanation:
          "The Lifetime ISA limit is £4,000 a year, so the most you can get is a £1,000 bonus. £20,000 is the overall ISA allowance across every ISA type, not the LISA limit.",

        temporal: {
          assessedAgainst: "2026-06-30",
          verdictAtPublication: "false",
          changedSince: false,
          whatChanged: null
        },

        source: {
          tier: 1,
          name: "MoneyHelper",
          url: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          /* One verified quote per source page. This claim falls
             back to the labelled paraphrase state rather than
             taking a second quote off the same page. */
          quote: null,
          quoteVerified: false,
          quoteState: "paraphrase",
          paraphrase: "MoneyHelper puts the maximum Lifetime ISA payment at £4,000 a tax year, with a maximum bonus of £1,000.",
          droppedQuote: null,
          textFragmentUrl: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          registerCheck: null
        }
      }
    ]
  },

  /* ==========================================================
     ARCHETYPE 3 — true, and dangerous
     THE PITCH. Factual accuracy comes out at 100. The headline
     is 8. Put those two numbers on the same card and the
     product explains itself.
     Expected score: 8  (Do not act on this)
     ========================================================== */
  {
    url: "https://www.youtube.com/shorts/EXAMPLE_ID_3",
    urlKey: "yt:EXAMPLE_ID_3",
    platform: "YouTube Shorts",
    creator: "@examplecreator3",
    title: "How I got funded with £100k of someone else's money",
    publishedAt: "2026-07-19",
    analysedAt: "2026-08-27",
    cacheVersion: 3,
    transcriptState: "ok",
    transcriptSource: "captions",
    transcriptWords: 203,

    claims: [
      {
        id: "c1",
        timestamp: "0:08",
        text: "You pass their evaluation and they fund you with a hundred grand, and you keep 90% of the profit.",
        type: "firm_product",
        timeBound: false,

        verdict: "accurate",
        confidence: "medium",
        flags: ["unauthorised_firm", "risk_not_stated"],
        missing: [
          { text: "The evaluation fee is not refunded if you fail", materiality: "material" },
          { text: "No FSCS protection and no Financial Ombudsman", materiality: "material" },
          { text: "Most participants do not pass the evaluation", materiality: "material" }
        ],
        explanation:
          "The funding figure and the profit split match the firm's own published terms, so the numbers are right as stated. The firm does not appear on the FCA Financial Services Register, which means it is not authorised to carry out regulated activity in the UK and you would have no access to the Financial Ombudsman or to FSCS compensation.",

        source: {
          /* A register result is not a quotable sentence and a
             text fragment cannot point at one. This claim uses
             the register-check card instead: firm searched,
             finding, and the date it was checked. */
          tier: 1,
          name: "FCA Financial Services Register",
          url: "https://register.fca.org.uk/",
          quote: null,
          quoteVerified: false,
          quoteState: "register_check",
          droppedQuote: null,
          textFragmentUrl: null,
          registerCheck: {
            firmSearched: "EXAMPLE PROP FIRM LTD",
            state: "not_found",
            referenceNumber: null,
            statement: "No exact match for \"EXAMPLE PROP FIRM LTD\" on the FCA Financial Services Register as at 27 August 2026.",
            checkedAt: "2026-08-27"
          }
        }
      },
      {
        id: "c2",
        timestamp: "0:26",
        text: "I turned my two hundred quid evaluation fee into eleven grand in six weeks.",
        type: "performance_return",
        timeBound: false,

        verdict: "unverifiable",
        confidence: "low",
        flags: ["survivorship_bias", "pressure_tactics"],
        missing: [
          { text: "No evidence of the result is shown", materiality: "material" },
          { text: "Losing participants are not shown", materiality: "material" }
        ],
        explanation:
          "A personal result with no record behind it. No trusted source can confirm or refute it, and one reported win says nothing about the typical outcome.",

        source: {
          tier: null,
          name: null,
          url: null,
          quote: null,
          quoteVerified: false,
          quoteState: "no_source_found",
          droppedQuote: null,
          textFragmentUrl: null,
          registerCheck: null
        }
      },
      {
        id: "c3",
        timestamp: "0:41",
        text: "Link's in my bio, use code FUNDED for 20% off the evaluation.",
        type: "firm_product",
        timeBound: false,

        verdict: "accurate",
        confidence: "high",
        flags: ["undisclosed_incentive", "advice_in_disguise"],
        missing: [
          { text: "The video is not marked as an advertisement", materiality: "material" }
        ],
        explanation:
          "The discount code works. It is also a referral arrangement that pays the creator when you sign up, and nothing in the video says so.",

        source: {
          tier: 1,
          name: "FCA",
          url: "https://www.fca.org.uk/consumers/finfluencers-what-you-need-know",
          quote: null,
          quoteVerified: false,
          quoteState: "paraphrase",
          paraphrase: "FCA consumer guidance sets out that financial promotions must be clear, fair and not misleading, and that paid promotion should be disclosed.",
          droppedQuote: null,
          textFragmentUrl: "https://www.fca.org.uk/consumers/finfluencers-what-you-need-know",
          registerCheck: null
        }
      }
    ]
  },

  /* ==========================================================
     ARCHETYPE 4 — was true, the world moved
     The label that marks a serious tool. The creator did not
     lie; the scheme closed. A pure true/false checker gets
     this wrong in the most unfair possible direction.
     Expected score: 60  (Check before you act)
     ========================================================== */
  {
    url: "https://www.youtube.com/shorts/EXAMPLE_ID_4",
    urlKey: "yt:EXAMPLE_ID_4",
    platform: "YouTube Shorts",
    creator: "@examplecreator4",
    title: "The account every first-time buyer should open",
    publishedAt: "2019-03-04",
    analysedAt: "2026-08-27",
    cacheVersion: 3,
    transcriptState: "ok",
    transcriptSource: "whisper",
    transcriptWords: 187,

    claims: [
      {
        id: "c1",
        timestamp: "0:05",
        text: "Go and open a Help to Buy ISA — the government tops up everything you save by 25%.",
        type: "regulatory_eligibility",
        timeBound: true,

        verdict: "outdated",
        confidence: "high",
        flags: [],
        missing: [
          { text: "Help to Buy ISAs closed to new customers in November 2019", materiality: "material" },
          { text: "Existing savers must claim the bonus by November 2030", materiality: "material" }
        ],
        explanation:
          "This was correct when the video was posted in March 2019. Help to Buy ISAs closed to new customers later that year, so you can no longer open one. If you already have one you can keep paying in for now.",

        temporal: {
          assessedAgainst: "2019-03-04",
          verdictAtPublication: "accurate",
          changedSince: true,
          whatChanged: "Help to Buy ISAs closed to new customers in November 2019."
        },

        source: {
          tier: 1,
          name: "MoneyHelper",
          url: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          quote: null,
          quoteVerified: false,
          quoteState: "paraphrase",
          paraphrase: "MoneyHelper states that Help to Buy ISAs are closed to new customers, that existing savers can keep paying in until November 2029, and that the bonus must be claimed by November 2030.",
          droppedQuote: null,
          textFragmentUrl: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          registerCheck: null
        }
      },
      {
        id: "c2",
        timestamp: "0:24",
        text: "It only works on a house up to two hundred and fifty grand, or four fifty in London.",
        type: "regulatory_eligibility",
        timeBound: true,

        verdict: "accurate",
        confidence: "high",
        flags: [],
        missing: [],
        explanation:
          "The property price caps are right: £250,000 outside London and £450,000 inside it.",

        temporal: {
          assessedAgainst: "2019-03-04",
          verdictAtPublication: "accurate",
          changedSince: false,
          whatChanged: null
        },

        source: {
          tier: 1,
          name: "MoneyHelper",
          url: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          quote: null,
          quoteVerified: false,
          quoteState: "paraphrase",
          paraphrase: "MoneyHelper gives the Help to Buy ISA property limits as £250,000, or £450,000 if the property is in London.",
          droppedQuote: null,
          textFragmentUrl: "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          registerCheck: null
        }
      },
      {
        id: "c3",
        timestamp: "0:38",
        text: "I'd take this over a Lifetime ISA any day.",
        type: "opinion",
        verdict: null,
        setAsideReason: "Preference, not a checkable claim"
      }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = { ANALYSES };

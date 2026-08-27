/* ============================================================
   FinCheck — cached analyses

   GENERATED FILE. Do not edit by hand: hand-editing is how a
   quote stops matching its page. Re-import instead.

   Written 2026-08-27T15:57:14.565Z — 5 video(s).
   ============================================================ */

const ANALYSES = [
  {
    "url": "https://www.youtube.com/shorts/EXAMPLE_ID_1",
    "urlKey": "yt:EXAMPLE_ID_1",
    "platform": "YouTube Shorts",
    "creator": "@examplecreator",
    "title": "Why you should never overpay your student loan",
    "publishedAt": "2026-05-12",
    "analysedAt": "2026-08-27",
    "cacheVersion": 3,
    "transcriptState": "ok",
    "transcriptSource": "captions",
    "transcriptWords": 168,
    "claims": [
      {
        "id": "c1",
        "timestamp": "0:06",
        "text": "You pay 9% of everything you earn over the threshold. That's it, that's the whole system.",
        "type": "regulatory_eligibility",
        "timeBound": true,
        "verdict": "accurate_but_incomplete",
        "confidence": "high",
        "flags": [],
        "missing": [
          {
            "text": "Postgraduate Loans repay at 6%, not 9%",
            "materiality": "material"
          },
          {
            "text": "The threshold depends on your plan — £25,000 on Plan 5, £26,900 on Plan 1",
            "materiality": "material"
          }
        ],
        "explanation": "Right for Plan 1, 2, 4 and 5 loans. It does not hold for a Postgraduate Loan, which repays at 6%, and the threshold it is 9% of depends on which plan you are on.",
        "temporal": {
          "assessedAgainst": "2026-05-12",
          "verdictAtPublication": "accurate_but_incomplete",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "gov.uk",
          "url": "https://www.gov.uk/repaying-your-student-loan/what-you-pay",
          "quote": "6% of your income over the threshold if you're on a Postgraduate Loan plan",
          "quoteVerified": true,
          "quoteState": "verified_quote",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.gov.uk/repaying-your-student-loan/what-you-pay#:~:text=6%25%20of%20your%20income%20over%20the%20threshold",
          "registerCheck": null
        }
      },
      {
        "id": "c2",
        "timestamp": "0:22",
        "text": "It comes straight out of your payslip so you never even see it.",
        "type": "numeric_factual",
        "timeBound": false,
        "verdict": "accurate",
        "confidence": "high",
        "flags": [],
        "missing": [],
        "explanation": "Repayments are collected through PAYE for employed borrowers, so they are deducted before the money reaches you.",
        "temporal": {
          "assessedAgainst": "2026-05-12",
          "verdictAtPublication": "accurate",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "gov.uk",
          "url": "https://www.gov.uk/repaying-your-student-loan/how-you-repay",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "gov.uk sets out that employed borrowers repay through PAYE, with deductions taken by the employer from salary.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.gov.uk/repaying-your-student-loan/how-you-repay",
          "registerCheck": null
        }
      },
      {
        "id": "c3",
        "timestamp": "0:31",
        "text": "Honestly I think the whole system is a scam.",
        "type": "opinion",
        "verdict": null,
        "setAsideReason": "Opinion, not a checkable claim"
      }
    ]
  },
  {
    "url": "https://www.youtube.com/shorts/EXAMPLE_ID_2",
    "urlKey": "yt:EXAMPLE_ID_2",
    "platform": "YouTube Shorts",
    "creator": "@examplecreator2",
    "title": "The free money account nobody tells you about",
    "publishedAt": "2026-06-30",
    "analysedAt": "2026-08-27",
    "cacheVersion": 3,
    "transcriptState": "ok",
    "transcriptSource": "captions",
    "transcriptWords": 141,
    "claims": [
      {
        "id": "c1",
        "timestamp": "0:03",
        "text": "A Lifetime ISA is basically free money — the government just gives you 25% on top.",
        "type": "numeric_factual",
        "timeBound": true,
        "verdict": "misleading",
        "confidence": "high",
        "flags": [
          "risk_not_stated"
        ],
        "missing": [
          {
            "text": "25% government charge on withdrawals outside the rules",
            "materiality": "material"
          },
          {
            "text": "Locked until 60 unless you are buying a first home",
            "materiality": "material"
          },
          {
            "text": "£450,000 property price cap",
            "materiality": "material"
          }
        ],
        "explanation": "The 25% bonus is real. Calling it free money leaves out the withdrawal charge, and because that charge applies to the larger total, taking the money out early returns less than you put in.",
        "temporal": {
          "assessedAgainst": "2026-06-30",
          "verdictAtPublication": "misleading",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "MoneyHelper",
          "url": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          "quote": "The charge is 25% of the amount withdrawn.",
          "quoteVerified": true,
          "quoteState": "verified_quote",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas#:~:text=The%20charge%20is%2025%25%20of%20the%20amount%20withdrawn",
          "registerCheck": null
        }
      },
      {
        "id": "c2",
        "timestamp": "0:19",
        "text": "You can pay in twenty grand a year and get five grand back.",
        "type": "numeric_factual",
        "timeBound": true,
        "verdict": "false",
        "confidence": "high",
        "flags": [],
        "missing": [],
        "explanation": "The Lifetime ISA limit is £4,000 a year, so the most you can get is a £1,000 bonus. £20,000 is the overall ISA allowance across every ISA type, not the LISA limit.",
        "temporal": {
          "assessedAgainst": "2026-06-30",
          "verdictAtPublication": "false",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "MoneyHelper",
          "url": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "MoneyHelper puts the maximum Lifetime ISA payment at £4,000 a tax year, with a maximum bonus of £1,000.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-lifetime-isas",
          "registerCheck": null
        }
      }
    ]
  },
  {
    "url": "https://www.youtube.com/shorts/EXAMPLE_ID_3",
    "urlKey": "yt:EXAMPLE_ID_3",
    "platform": "YouTube Shorts",
    "creator": "@examplecreator3",
    "title": "How I got funded with £100k of someone else's money",
    "publishedAt": "2026-07-19",
    "analysedAt": "2026-08-27",
    "cacheVersion": 3,
    "transcriptState": "ok",
    "transcriptSource": "captions",
    "transcriptWords": 203,
    "claims": [
      {
        "id": "c1",
        "timestamp": "0:08",
        "text": "You pass their evaluation and they fund you with a hundred grand, and you keep 90% of the profit.",
        "type": "firm_product",
        "timeBound": false,
        "verdict": "accurate",
        "confidence": "medium",
        "flags": [
          "unauthorised_firm",
          "risk_not_stated"
        ],
        "missing": [
          {
            "text": "The evaluation fee is not refunded if you fail",
            "materiality": "material"
          },
          {
            "text": "No FSCS protection and no Financial Ombudsman",
            "materiality": "material"
          },
          {
            "text": "Most participants do not pass the evaluation",
            "materiality": "material"
          }
        ],
        "explanation": "The funding figure and the profit split match the firm's own published terms, so the numbers are right as stated. The firm does not appear on the FCA Financial Services Register, which means it is not authorised to carry out regulated activity in the UK and you would have no access to the Financial Ombudsman or to FSCS compensation.",
        "source": {
          "tier": 1,
          "name": "FCA Financial Services Register",
          "url": "https://register.fca.org.uk/",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "register_check",
          "droppedQuote": null,
          "textFragmentUrl": null,
          "registerCheck": {
            "firmSearched": "EXAMPLE PROP FIRM LTD",
            "state": "not_found",
            "referenceNumber": null,
            "statement": "No exact match for \"EXAMPLE PROP FIRM LTD\" on the FCA Financial Services Register as at 27 August 2026.",
            "checkedAt": "2026-08-27"
          }
        }
      },
      {
        "id": "c2",
        "timestamp": "0:26",
        "text": "I turned my two hundred quid evaluation fee into eleven grand in six weeks.",
        "type": "performance_return",
        "timeBound": false,
        "verdict": "unverifiable",
        "confidence": "low",
        "flags": [
          "survivorship_bias",
          "pressure_tactics"
        ],
        "missing": [
          {
            "text": "No evidence of the result is shown",
            "materiality": "material"
          },
          {
            "text": "Losing participants are not shown",
            "materiality": "material"
          }
        ],
        "explanation": "A personal result with no record behind it. No trusted source can confirm or refute it, and one reported win says nothing about the typical outcome.",
        "source": {
          "tier": null,
          "name": null,
          "url": null,
          "quote": null,
          "quoteVerified": false,
          "quoteState": "no_source_found",
          "droppedQuote": null,
          "textFragmentUrl": null,
          "registerCheck": null
        }
      },
      {
        "id": "c3",
        "timestamp": "0:41",
        "text": "Link's in my bio, use code FUNDED for 20% off the evaluation.",
        "type": "firm_product",
        "timeBound": false,
        "verdict": "accurate",
        "confidence": "high",
        "flags": [
          "undisclosed_incentive",
          "advice_in_disguise"
        ],
        "missing": [
          {
            "text": "The video is not marked as an advertisement",
            "materiality": "material"
          }
        ],
        "explanation": "The discount code works. It is also a referral arrangement that pays the creator when you sign up, and nothing in the video says so.",
        "source": {
          "tier": 1,
          "name": "FCA",
          "url": "https://www.fca.org.uk/consumers/finfluencers-what-you-need-know",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "FCA consumer guidance sets out that financial promotions must be clear, fair and not misleading, and that paid promotion should be disclosed.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.fca.org.uk/consumers/finfluencers-what-you-need-know",
          "registerCheck": null
        }
      }
    ]
  },
  {
    "url": "https://www.youtube.com/shorts/EXAMPLE_ID_4",
    "urlKey": "yt:EXAMPLE_ID_4",
    "platform": "YouTube Shorts",
    "creator": "@examplecreator4",
    "title": "The account every first-time buyer should open",
    "publishedAt": "2019-03-04",
    "analysedAt": "2026-08-27",
    "cacheVersion": 3,
    "transcriptState": "ok",
    "transcriptSource": "whisper",
    "transcriptWords": 187,
    "claims": [
      {
        "id": "c1",
        "timestamp": "0:05",
        "text": "Go and open a Help to Buy ISA — the government tops up everything you save by 25%.",
        "type": "regulatory_eligibility",
        "timeBound": true,
        "verdict": "outdated",
        "confidence": "high",
        "flags": [],
        "missing": [
          {
            "text": "Help to Buy ISAs closed to new customers in November 2019",
            "materiality": "material"
          },
          {
            "text": "Existing savers must claim the bonus by November 2030",
            "materiality": "material"
          }
        ],
        "explanation": "This was correct when the video was posted in March 2019. Help to Buy ISAs closed to new customers later that year, so you can no longer open one. If you already have one you can keep paying in for now.",
        "temporal": {
          "assessedAgainst": "2019-03-04",
          "verdictAtPublication": "accurate",
          "changedSince": true,
          "whatChanged": "Help to Buy ISAs closed to new customers in November 2019."
        },
        "source": {
          "tier": 1,
          "name": "MoneyHelper",
          "url": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "MoneyHelper states that Help to Buy ISAs are closed to new customers, that existing savers can keep paying in until November 2029, and that the bonus must be claimed by November 2030.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          "registerCheck": null
        }
      },
      {
        "id": "c2",
        "timestamp": "0:24",
        "text": "It only works on a house up to two hundred and fifty grand, or four fifty in London.",
        "type": "regulatory_eligibility",
        "timeBound": true,
        "verdict": "accurate",
        "confidence": "high",
        "flags": [],
        "missing": [],
        "explanation": "The property price caps are right: £250,000 outside London and £450,000 inside it.",
        "temporal": {
          "assessedAgainst": "2019-03-04",
          "verdictAtPublication": "accurate",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "MoneyHelper",
          "url": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "MoneyHelper gives the Help to Buy ISA property limits as £250,000, or £450,000 if the property is in London.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.moneyhelper.org.uk/en/savings/types-of-savings/a-guide-to-help-to-buy-isas",
          "registerCheck": null
        }
      },
      {
        "id": "c3",
        "timestamp": "0:38",
        "text": "I'd take this over a Lifetime ISA any day.",
        "type": "opinion",
        "verdict": null,
        "setAsideReason": "Preference, not a checkable claim"
      }
    ]
  },
  {
    "url": "https://www.youtube.com/shorts/4wIXnPaooag",
    "urlKey": "yt:4wIXnPaooag",
    "platform": "YouTube Shorts",
    "creator": "Sam's Wallet",
    "title": "5 financial literacy lessons I wish I learned in high school",
    "publishedAt": "2025-07-01",
    "analysedAt": "2026-08-27",
    "cacheVersion": 3,
    "transcriptState": "ok",
    "transcriptSource": "captions",
    "transcriptWords": 420,
    "ingestRoute": "yt-dlp",
    "claims": [
      {
        "id": "c1",
        "timestamp": "0:08",
        "text": "You learn about so many different subjects in school, but for some reason finances left out of the curriculum, and it's so useful, too.",
        "type": "opinion",
        "jurisdiction": "unclear",
        "verdict": null,
        "setAsideReason": "Opinion about what school curricula should include, not a checkable claim"
      },
      {
        "id": "c2",
        "timestamp": "0:14",
        "text": "Don't underestimate the trades — electricians, plumbers, carpenters, HVAC technicians, and welders. A lot of these programs are either free or they pay you while you learn, so there's no student debt.",
        "type": "regulatory_eligibility",
        "timeBound": false,
        "jurisdiction": "US",
        "verdict": "accurate_but_incomplete",
        "confidence": "medium",
        "flags": [],
        "missing": [
          {
            "text": "Not every registered apprenticeship is free of any cost to the apprentice, and slots are competitive and limited by trade and region — it isn't an automatic alternative to college for everyone",
            "materiality": "material"
          }
        ],
        "explanation": "The core claim holds up: DOL describes Registered Apprenticeship as an 'earn while you learn' model, and apprentices are paid a wage from day one, which is a real way to avoid taking on student debt. Where this is incomplete is the implication that this path is simply available to anyone who wants it — real programs vary by trade, region and cost, and getting a slot isn't automatic.",
        "temporal": {
          "assessedAgainst": "2025-07-01",
          "verdictAtPublication": "accurate_but_incomplete",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "U.S. Department of Labor",
          "url": "https://blog.dol.gov/2023/11/14/registered-apprenticeship-earn-while-you-learn",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "DOL describes Registered Apprenticeship as an 'earn while you learn' model in which apprentices are paid from day one while training in a skilled occupation, as an alternative to taking on college debt.",
          "droppedQuote": null,
          "textFragmentUrl": "https://blog.dol.gov/2023/11/14/registered-apprenticeship-earn-while-you-learn",
          "registerCheck": null
        }
      },
      {
        "id": "c3",
        "timestamp": "0:30",
        "text": "Take it from someone who took out $160,000 in student loans.",
        "type": "numeric_factual",
        "timeBound": false,
        "jurisdiction": "US",
        "verdict": "unverifiable",
        "confidence": "low",
        "flags": [],
        "missing": [],
        "explanation": "This is the creator's own personal debt figure. There's no public record that could confirm or refute one individual's loan balance, so this is a claim we simply can't check either way.",
        "temporal": {
          "assessedAgainst": "2025-07-01",
          "verdictAtPublication": "unverifiable",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": null,
          "name": null,
          "url": null,
          "quote": null,
          "quoteVerified": false,
          "quoteState": "no_source_found",
          "paraphrase": null,
          "droppedQuote": null,
          "textFragmentUrl": null,
          "registerCheck": null
        }
      },
      {
        "id": "c4",
        "timestamp": "0:39",
        "text": "When you get your paycheck or any check, do not use check cashing centers. They take anywhere from 1% as high as 12% of the check amount.",
        "type": "numeric_factual",
        "timeBound": false,
        "jurisdiction": "US",
        "verdict": "unverifiable",
        "confidence": "low",
        "flags": [],
        "missing": [
          {
            "text": "Fees vary a lot by state and by whether the check is government-issued; the documented examples we found run closer to 2%-5%, not confirmed as high as 12%",
            "materiality": "minor"
          }
        ],
        "explanation": "The general advice is sound — check-cashing outlets do charge a percentage of the check rather than a flat fee, and a free checking account avoids that entirely. But the specific 1%-to-12% range isn't something we could confirm: FDIC research on alternative financial services documents real examples closer to 2%-5%, and we found nothing establishing fees run as high as 12%.",
        "temporal": {
          "assessedAgainst": "2025-07-01",
          "verdictAtPublication": "unverifiable",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "FDIC",
          "url": "https://www.fdic.gov/system/files/2024-07/fdic140-quarterlyvol3no1-afs-final.pdf",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "FDIC research on alternative financial services documents check-cashing outlets charging a fee set as a percentage of the check's face value, with real-world examples in the 2%-5% range depending on the state and whether the check is government-issued.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.fdic.gov/system/files/2024-07/fdic140-quarterlyvol3no1-afs-final.pdf",
          "registerCheck": null
        }
      },
      {
        "id": "c5",
        "timestamp": "1:08",
        "text": "I kind of see this field growing more in the future because people don't really advertise on newspapers anymore. Everything is digital, and there's not a ton of people who can do this.",
        "type": "opinion",
        "jurisdiction": "unclear",
        "verdict": null,
        "setAsideReason": "Prediction about future demand for content/social-media skills, not a checkable claim"
      },
      {
        "id": "c6",
        "timestamp": "1:22",
        "text": "Investing as young as possible — that's going to be 18 years old for most people. I like low-cost index funds such as VOO in a Roth IRA.",
        "type": "firm_product",
        "timeBound": false,
        "jurisdiction": "US",
        "verdict": "accurate_but_incomplete",
        "confidence": "high",
        "flags": [
          "risk_not_stated"
        ],
        "missing": [
          {
            "text": "There is no IRS minimum age to contribute to a Roth IRA — the real requirement is having taxable compensation — so someone with earned income can start well before 18 via a custodial account",
            "materiality": "material"
          }
        ],
        "explanation": "A Roth IRA holding a low-cost S&P 500 fund like VOO is a reasonable long-term combination, and the tax-free growth is real. But 18 isn't an IRS rule — the actual requirement is earned income, so a teenager with a summer job could start earlier through a custodial Roth IRA. It's also worth knowing that, like any stock fund, VOO can lose value, which isn't mentioned here.",
        "temporal": {
          "assessedAgainst": "2025-07-01",
          "verdictAtPublication": "accurate_but_incomplete",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": 1,
          "name": "IRS",
          "url": "https://www.irs.gov/retirement-plans/traditional-and-roth-iras",
          "quote": null,
          "quoteVerified": false,
          "quoteState": "paraphrase",
          "paraphrase": "The IRS states you can contribute to a Roth IRA at any age, provided you (or your spouse, if filing jointly) have taxable compensation and your modified adjusted gross income is below the applicable limit.",
          "droppedQuote": null,
          "textFragmentUrl": "https://www.irs.gov/retirement-plans/traditional-and-roth-iras",
          "registerCheck": null
        }
      },
      {
        "id": "c7",
        "timestamp": "1:40",
        "text": "Attending a state college instead of a private one can sometimes be up to a fifth of the cost.",
        "type": "numeric_factual",
        "timeBound": false,
        "jurisdiction": "US",
        "verdict": "unverifiable",
        "confidence": "low",
        "flags": [],
        "missing": [],
        "explanation": "It's well established that public in-state tuition runs well below private nonprofit tuition, but the sources we're allowed to use (BLS, GAO) publish tuition trends and revenue shares, not a direct sticker-price ratio like 'a fifth of the cost' — so we can't confirm or rule out that specific multiple.",
        "temporal": {
          "assessedAgainst": "2025-07-01",
          "verdictAtPublication": "unverifiable",
          "changedSince": false,
          "whatChanged": null
        },
        "source": {
          "tier": null,
          "name": null,
          "url": null,
          "quote": null,
          "quoteVerified": false,
          "quoteState": "no_source_found",
          "paraphrase": null,
          "droppedQuote": null,
          "textFragmentUrl": null,
          "registerCheck": null
        }
      },
      {
        "id": "c8",
        "timestamp": "1:47",
        "text": "You may have heard of the adage, do what you love and the money will follow. Incomplete. Pick a career or major that you love along with it being recession proof.",
        "type": "opinion",
        "jurisdiction": "unclear",
        "verdict": null,
        "setAsideReason": "Career advice/opinion, not a checkable claim"
      }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = { ANALYSES };

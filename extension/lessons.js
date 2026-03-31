/**
 * lessons.js — Progressive AI literacy learning system
 *
 * Three encounter levels per data type:
 *   Level 0: First time seeing this type — awareness
 *   Level 1: 2nd–3rd encounter — deeper context (GDPR, why it matters)
 *   Level 2: 4th+ encounter — mastery acknowledgment + advanced insight
 *
 * Literacy score (0–100):
 *   +10 per unique data type ever encountered (max 6 types = 60 pts)
 *   +5  per anonymize action (capped at 8 actions = 40 pts)
 *   Total max = 100
 *
 * All data stored in chrome.storage.local under 'pfLiteracy'.
 */

/* global chrome */

const PFLessons = (function () {
  'use strict';

  // ── Lesson library ─────────────────────────────────────────────────────────
  const LESSONS = {
    EMAIL: [
      {
        headline: 'Good habit.',
        tip: 'Email addresses belong to real people. Keeping them out of AI tools means those contacts stay in control of their own data.',
        context: null,
      },
      {
        headline: 'Here\'s why it matters.',
        tip: 'AI tools log conversations — sometimes indefinitely. An email address pasted into a prompt can end up stored on a US server, outside GDPR reach.',
        context: 'Under GDPR, sharing someone\'s email without a legal basis is a data breach — even in what feels like a private chat.',
      },
      {
        headline: 'You\'ve got this.',
        tip: 'You\'ve anonymised email addresses multiple times now. That reflex is a real data protection habit — the kind that keeps your team out of regulatory trouble.',
        context: null,
      },
    ],
    PHONE: [
      {
        headline: 'Nice catch.',
        tip: 'Phone numbers are personal identifiers. Anonymising them is a small act of respect — and solid data hygiene.',
        context: null,
      },
      {
        headline: 'Going deeper.',
        tip: 'Phone numbers combined with a name create a profile. AI models can surface that combination in future responses — to you or to others.',
        context: 'GDPR classifies phone numbers as personal data. Pasting them into AI tools without consent can violate your obligations.',
      },
      {
        headline: 'Consistent and smart.',
        tip: 'You\'re handling phone numbers correctly every time. That consistency is what "sufficient AI literacy" looks like under EU law.',
        context: null,
      },
    ],
    IBAN: [
      {
        headline: 'Well handled.',
        tip: 'Bank details can end up in AI conversation logs. A quick anonymise keeps everyone\'s finances private.',
        context: null,
      },
      {
        headline: 'The real risk.',
        tip: 'IBANs don\'t just identify accounts — they\'re enough to initiate transfers in some systems. Once in an AI log, you can\'t take them back.',
        context: 'Financial data is among the highest-risk categories under GDPR. Leaking it — even accidentally — can trigger regulatory action.',
      },
      {
        headline: 'Strong instinct.',
        tip: 'You\'ve never let an IBAN through. That\'s exactly the behaviour that keeps your company\'s financial data secure.',
        context: null,
      },
    ],
    CREDIT_CARD: [
      {
        headline: 'Good call.',
        tip: 'Card numbers should stay off AI systems entirely. That reflex will serve you well.',
        context: null,
      },
      {
        headline: 'Why this one is critical.',
        tip: 'Card numbers are live financial credentials. An AI model doesn\'t need them to help you — there\'s no legitimate reason to include them in a prompt.',
        context: 'PCI-DSS and GDPR both require card data to be strictly controlled. An AI chat is not a controlled environment.',
      },
      {
        headline: 'Perfect record.',
        tip: 'You\'ve protected card data every time. That\'s the gold standard — and it\'s noted in your team\'s compliance record.',
        context: null,
      },
    ],
    ADDRESS: [
      {
        headline: 'Nice one.',
        tip: 'Home addresses are personal. Anonymising means the person behind that address stays protected.',
        context: null,
      },
      {
        headline: 'More than just an address.',
        tip: 'A full address reveals where someone lives, works, or operates. Combined with a name, it\'s enough to identify and locate a person.',
        context: 'Address data is personal data under GDPR. Sharing it with AI tools without purpose or consent is a compliance risk.',
      },
      {
        headline: 'Reliable habit.',
        tip: 'You consistently protect address data. Location information is one of the most sensitive categories — you\'re handling it right.',
        context: null,
      },
    ],
    PASSWORD: [
      {
        headline: 'Great catch.',
        tip: 'Credentials in prompts can slip into AI logs. You just kept your system secure.',
        context: null,
      },
      {
        headline: 'This one\'s serious.',
        tip: 'Passwords and API keys in AI prompts are a genuine security incident waiting to happen. AI providers have had prompt logs accessed before.',
        context: 'A leaked credential doesn\'t just affect you — if it\'s a shared system key, it exposes your entire infrastructure.',
      },
      {
        headline: 'Security-first thinking.',
        tip: 'You\'ve caught credentials every time. That\'s the kind of security culture that prevents real incidents.',
        context: null,
      },
    ],
    CUSTOM_TERM: [
      {
        headline: 'Smart move.',
        tip: 'Your organisation flagged that term for a reason. When in doubt, anonymise — you made the right call.',
        context: null,
      },
      {
        headline: 'Trust the policy.',
        tip: 'Custom terms are usually flagged because of a past incident, a legal requirement, or a business sensitivity. The policy exists to protect everyone.',
        context: null,
      },
      {
        headline: 'Policy-aware.',
        tip: 'You\'re consistently respecting your organisation\'s AI policy. That\'s exactly what your admin needs to see.',
        context: null,
      },
    ],
    DEFAULT: [
      {
        headline: 'Good instinct.',
        tip: 'Reviewing data before it reaches an AI tool is exactly the right habit. Keep it up.',
        context: null,
      },
      {
        headline: 'Building good habits.',
        tip: 'Every time you pause to review, you\'re training yourself to think about data the right way. It gets easier and more automatic over time.',
        context: null,
      },
      {
        headline: 'Solid track record.',
        tip: 'You\'ve built a consistent habit of reviewing before sending. That\'s what "AI literacy" actually means in practice.',
        context: null,
      },
    ],
  };

  // Priority order for selecting the primary lesson when multiple types detected
  const TYPE_PRIORITY = ['CREDIT_CARD', 'IBAN', 'PASSWORD', 'PHONE', 'EMAIL', 'ADDRESS', 'CUSTOM_TERM'];

  // ── Storage helpers ────────────────────────────────────────────────────────

  function loadLiteracy(callback) {
    try {
      chrome.storage.local.get(['pfLiteracy'], function (result) {
        callback(result.pfLiteracy || {
          score: 0,
          typesEncountered: [],
          typeEncounterCounts: {},
          totalAnonymized: 0,
        });
      });
    } catch (e) {
      callback({ score: 0, typesEncountered: [], typeEncounterCounts: {}, totalAnonymized: 0 });
    }
  }

  function saveLiteracy(data) {
    try {
      chrome.storage.local.set({ pfLiteracy: data });
    } catch (e) {
      // Non-fatal
    }
  }

  function computeScore(data) {
    const typePoints = Math.min((data.typesEncountered || []).length, 6) * 10;
    const actionPoints = Math.min(data.totalAnonymized || 0, 8) * 5;
    return Math.min(100, typePoints + actionPoints);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Record a detection event. Updates encounter counts + score.
   * Returns the lesson to show via callback(lesson, literacyData).
   */
  function recordDetection(detectedTypes, anonymized, callback) {
    loadLiteracy(function (data) {
      const primaryType = TYPE_PRIORITY.find((t) => detectedTypes.includes(t)) || 'DEFAULT';

      // Update encounter counts
      const counts = data.typeEncounterCounts || {};
      counts[primaryType] = (counts[primaryType] || 0) + 1;

      // Track unique types encountered
      const encountered = data.typesEncountered || [];
      if (!encountered.includes(primaryType)) {
        encountered.push(primaryType);
      }

      // Update anonymize count
      let totalAnonymized = data.totalAnonymized || 0;
      if (anonymized) totalAnonymized += 1;

      const updated = {
        ...data,
        typeEncounterCounts: counts,
        typesEncountered: encountered,
        totalAnonymized,
      };
      updated.score = computeScore(updated);

      saveLiteracy(updated);

      // Pick lesson level (0, 1, or 2)
      const encounterCount = counts[primaryType];
      const level = encounterCount <= 1 ? 0 : encounterCount <= 3 ? 1 : 2;
      const typeKey = LESSONS[primaryType] ? primaryType : 'DEFAULT';
      const lesson = LESSONS[typeKey][level] || LESSONS[typeKey][0];

      if (callback) callback(lesson, updated);
    });
  }

  /**
   * Get current literacy data via callback(data).
   */
  function getLiteracy(callback) {
    loadLiteracy(function (data) {
      data.score = computeScore(data);
      callback(data);
    });
  }

  /**
   * Get score label string for display.
   */
  function getScoreLabel(score) {
    if (score >= 80) return 'Advanced';
    if (score >= 50) return 'Developing';
    if (score >= 20) return 'Learning';
    return 'Getting started';
  }

  return { recordDetection, getLiteracy, getScoreLabel, LESSONS };
})();

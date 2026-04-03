/**
 * Deterministic pattern checker — no LLM needed.
 * Scans content against banned phrases, structures, and AI vocabulary
 * sourced from humanizer and stop-slop submodules.
 */

// --- Banned phrases (from stop-slop/references/phrases.md) ---

const THROAT_CLEARING = [
  "here's the thing",
  "here's what",
  "here's this",
  "here's that",
  "here's why",
  "the uncomfortable truth is",
  "it turns out",
  "the real",
  "let me be clear",
  "the truth is",
  "i'll say it again",
  "i'm going to be honest",
  "can we talk about",
  "here's what i find interesting",
  "here's the problem though",
];

const EMPHASIS_CRUTCHES = [
  "full stop.",
  "period.",
  "let that sink in",
  "this matters because",
  "make no mistake",
  "here's why that matters",
];

const BUSINESS_JARGON = [
  "navigate", "unpack", "lean into", "landscape", "game-changer",
  "double down", "deep dive", "take a step back", "moving forward",
  "circle back", "on the same page", "leverage", "utilize",
  "facilitate", "optimize", "streamline", "synergy", "ecosystem",
  "paradigm", "holistic",
];

const FILLER_ADVERBS = [
  "really", "just", "literally", "genuinely", "honestly",
  "simply", "actually", "deeply", "truly", "fundamentally",
  "inherently", "inevitably", "interestingly", "importantly", "crucially",
  "essentially", "basically", "ultimately", "significantly",
  "dramatically", "remarkably",
];

const FILLER_PHRASES = [
  "at its core",
  "in today's",
  "it's worth noting",
  "at the end of the day",
  "when it comes to",
  "in a world where",
  "the reality is",
  "in the grand scheme",
  "for all intents and purposes",
  "by and large",
  "it is important to note",
  "it should be mentioned",
  "needless to say",
  "in order to",
  "due to the fact that",
];

const META_COMMENTARY = [
  "hint:", "plot twist:", "spoiler:",
  "you already know this, but",
  "but that's another post",
  "is a feature, not a bug",
  "the rest of this essay",
  "let me walk you through",
  "in this section, we'll",
  "as we'll see",
  "i want to explore",
];

const VAGUE_DECLARATIVES = [
  "the reasons are structural",
  "the implications are significant",
  "this is the deepest problem",
  "the stakes are high",
  "the consequences are real",
  "the impact cannot be overstated",
  "this changes everything",
  "everything is different now",
];

const SIGNPOSTING = [
  "let's dive in",
  "let's explore",
  "let's break this down",
  "here's what you need to know",
  "without further ado",
  "now let's look at",
];

const AUTHORITY_TROPES = [
  "the real question is",
  "at its core",
  "in reality",
  "what really matters",
  "fundamentally",
  "the heart of the matter",
  "the deeper issue",
];

// --- AI vocabulary (from humanizer/SKILL.md pattern 7) ---

const AI_VOCABULARY = [
  "delve", "enhance", "foster", "garner", "interplay",
  "intricate", "intricacies", "pivotal", "showcase", "showcasing",
  "tapestry", "testament", "underscore", "vibrant", "enduring",
  "additionally", "align with", "crucial",
];

const PROMOTIONAL_WORDS = [
  "boasts", "groundbreaking", "renowned", "breathtaking",
  "must-visit", "stunning", "nestled", "in the heart of",
  "exemplifies", "commitment to", "cutting-edge", "revolutionary",
  "game-changing", "innovative", "disruptive", "next-generation",
];

const COPULA_AVOIDANCE = [
  "serves as", "stands as", "marks a", "represents a",
  "features a", "offers a",
];

// --- Structural patterns ---

const SYCOPHANTIC = [
  "i hope this helps",
  "of course!",
  "certainly!",
  "you're absolutely right",
  "would you like me to",
  "let me know if",
  "great question",
  "that's a really interesting",
  "excellent point",
];

/**
 * Run all deterministic checks against content.
 * Returns array of findings: { pattern, category, location, severity }
 */
function checkPatterns(content) {
  const findings = [];
  const lower = content.toLowerCase();
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // --- Phrase matching ---
  const phraseGroups = [
    { phrases: THROAT_CLEARING, category: "throat-clearing", severity: "HIGH" },
    { phrases: EMPHASIS_CRUTCHES, category: "emphasis-crutch", severity: "MEDIUM" },
    { phrases: BUSINESS_JARGON, category: "business-jargon", severity: "MEDIUM" },
    { phrases: FILLER_PHRASES, category: "filler-phrase", severity: "HIGH" },
    { phrases: META_COMMENTARY, category: "meta-commentary", severity: "MEDIUM" },
    { phrases: VAGUE_DECLARATIVES, category: "vague-declarative", severity: "HIGH" },
    { phrases: SIGNPOSTING, category: "signposting", severity: "HIGH" },
    { phrases: AUTHORITY_TROPES, category: "authority-trope", severity: "MEDIUM" },
    { phrases: AI_VOCABULARY, category: "ai-vocabulary", severity: "HIGH" },
    { phrases: PROMOTIONAL_WORDS, category: "promotional", severity: "HIGH" },
    { phrases: COPULA_AVOIDANCE, category: "copula-avoidance", severity: "MEDIUM" },
    { phrases: SYCOPHANTIC, category: "sycophantic", severity: "HIGH" },
  ];

  for (const { phrases, category, severity } of phraseGroups) {
    for (const phrase of phrases) {
      const idx = lower.indexOf(phrase.toLowerCase());
      if (idx !== -1) {
        const start = Math.max(0, idx - 10);
        const end = Math.min(content.length, idx + phrase.length + 10);
        const location = content.slice(start, end).replace(/\n/g, " ").trim();
        findings.push({
          pattern: phrase,
          category,
          location: `"...${location}..."`,
          severity,
        });
      }
    }
  }

  // --- Adverb detection (words ending in -ly) ---
  const words = content.match(/\b\w+ly\b/gi) || [];
  const adverbs = words.filter(w => {
    const l = w.toLowerCase();
    // Skip common non-adverbs
    return !["only", "apply", "reply", "supply", "fly", "july", "early",
             "family", "belly", "ally", "assembly", "bully", "daily",
             "friendly", "holy", "likely", "lonely", "lovely", "rally",
             "ugly", "multiply", "rely", "comply", "imply"].includes(l);
  });
  if (adverbs.length > 0) {
    findings.push({
      pattern: `${adverbs.length} adverbs found`,
      category: "adverbs",
      location: adverbs.slice(0, 5).join(", ") + (adverbs.length > 5 ? "..." : ""),
      severity: adverbs.length > 3 ? "HIGH" : "MEDIUM",
    });
  }

  // --- Em dash detection ---
  const emDashCount = (content.match(/—/g) || []).length;
  if (emDashCount > 0) {
    findings.push({
      pattern: `${emDashCount} em dash(es)`,
      category: "em-dash",
      location: `${emDashCount} instance(s) found`,
      severity: emDashCount > 2 ? "HIGH" : "LOW",
    });
  }

  // --- Rule of three detection ---
  const threeItemLists = content.match(/\b\w+,\s+\w+,\s+and\s+\w+/gi) || [];
  if (threeItemLists.length > 0) {
    findings.push({
      pattern: `${threeItemLists.length} rule-of-three list(s)`,
      category: "rule-of-three",
      location: threeItemLists[0],
      severity: "MEDIUM",
    });
  }

  // --- Passive voice detection (simple heuristic) ---
  const passivePatterns = /\b(was|were|is|are|been|being)\s+(being\s+)?\w+ed\b/gi;
  const passiveMatches = content.match(passivePatterns) || [];
  if (passiveMatches.length > 2) {
    findings.push({
      pattern: `${passiveMatches.length} passive voice constructions`,
      category: "passive-voice",
      location: passiveMatches.slice(0, 3).join("; "),
      severity: passiveMatches.length > 4 ? "HIGH" : "MEDIUM",
    });
  }

  // --- Binary contrast detection ---
  const binaryPatterns = [
    /not\s+(?:just|merely|only)\s+.{3,30}(?:but|—)/gi,
    /isn't\s+.{3,30}it's/gi,
    /not\s+.{3,20}\.\s+but\s+/gi,
  ];
  for (const pattern of binaryPatterns) {
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      findings.push({
        pattern: "binary contrast",
        category: "binary-contrast",
        location: `"${match.trim().slice(0, 60)}"`,
        severity: "HIGH",
      });
    }
  }

  // --- Negative listing detection ---
  const negativeListPattern = /(?:not a|no)\s+\w+[^.]*\.\s*(?:not a|no)\s+\w+/gi;
  const negativeMatches = content.match(negativeListPattern) || [];
  for (const match of negativeMatches) {
    findings.push({
      pattern: "negative listing",
      category: "negative-listing",
      location: `"${match.trim().slice(0, 60)}"`,
      severity: "HIGH",
    });
  }

  // --- Dramatic fragmentation (very short sentences in sequence) ---
  for (let i = 0; i < sentences.length - 1; i++) {
    const a = sentences[i].trim().split(/\s+/).length;
    const b = sentences[i + 1].trim().split(/\s+/).length;
    if (a <= 4 && b <= 4 && a > 0 && b > 0) {
      findings.push({
        pattern: "dramatic fragmentation",
        category: "fragmentation",
        location: `"${sentences[i].trim()}. ${sentences[i + 1].trim()}."`,
        severity: "MEDIUM",
      });
    }
  }

  // --- Sentence rhythm uniformity ---
  if (sentences.length >= 5) {
    const lengths = sentences.map(s => s.trim().split(/\s+/).length).filter(l => l > 0);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    const stddev = Math.sqrt(variance);
    if (stddev < 3) {
      findings.push({
        pattern: "metronomic rhythm",
        category: "rhythm",
        location: `std dev ${stddev.toFixed(1)} (avg ${avg.toFixed(0)} words/sentence)`,
        severity: "MEDIUM",
      });
    }
  }

  // --- Title case headings (lines that look like headings with Title Case) ---
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 80 && !trimmed.startsWith("#")) {
      const titleWords = trimmed.split(/\s+/);
      if (titleWords.length >= 3) {
        const capitalizedCount = titleWords.filter(w =>
          w.length > 3 && w[0] === w[0].toUpperCase() && w !== w.toUpperCase()
        ).length;
        if (capitalizedCount >= titleWords.length * 0.7 && capitalizedCount >= 3) {
          findings.push({
            pattern: "title case heading",
            category: "title-case",
            location: `"${trimmed.slice(0, 50)}"`,
            severity: "LOW",
          });
        }
      }
    }
  }

  return findings;
}

module.exports = { checkPatterns };

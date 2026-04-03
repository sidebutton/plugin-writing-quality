/**
 * Builds the LLM prompt for 5-dimension scoring.
 * Loads the scoring rubric from stop-slop and humanizer SKILL.md
 * for judgment-based evaluation that can't be done deterministically.
 */

const fs = require("node:fs");
const path = require("node:path");

function loadRef(relativePath) {
  try {
    return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf-8");
  } catch {
    return "";
  }
}

function buildScoringPrompt(content, context, deterministicFindings) {
  const humanizerSkill = loadRef("humanizer/SKILL.md");
  const stopSlopSkill = loadRef("stop-slop/SKILL.md");

  const findingsSummary = deterministicFindings.length > 0
    ? deterministicFindings.map(f => `- [${f.severity}] ${f.category}: ${f.pattern} at ${f.location}`).join("\n")
    : "No deterministic patterns found.";

  return `You are a writing quality scorer. A deterministic pattern checker has already scanned the content for banned phrases, structures, and AI vocabulary. Your job is to SCORE the content on 5 dimensions.

CONTENT:
${content}

BRAND CONTEXT:
${context || "No brand context provided."}

DETERMINISTIC FINDINGS (already detected — do not re-report these):
${findingsSummary}

SCORING RUBRIC:

Rate 1-10 on each dimension. Be strict — most marketing copy scores 4-6.

DIRECTNESS: Does it make statements or announce them?
- 9-10: Every sentence leads with its point. Zero filler.
- 7-8: Confident, direct assertions. No unnecessary framing.
- 5-6: Generally direct with occasional throat-clearing.
- 3-4: Frequent framing phrases. Gets to the point eventually.
- 1-2: Every paragraph opens with a throat-clearing phrase.

RHYTHM: Are sentence lengths varied or metronomic?
- 9-10: Reads like natural speech. Length matches content gravity.
- 7-8: Natural variation. Short punches mixed with longer explanations.
- 5-6: Some variation. A few short sentences mixed with medium ones.
- 3-4: Mostly uniform length. Lists always have three items.
- 1-2: Every sentence is 12-18 words. Reading feels like a metronome.

TRUST: Does the content respect the reader's intelligence?
- 9-10: Assumes competence. Presents evidence, trusts reader to evaluate.
- 7-8: States facts and lets the reader draw conclusions.
- 5-6: Mostly trusts the reader. Occasional unnecessary explanations.
- 3-4: Frequent hedging. Explains obvious implications.
- 1-2: Over-explains everything. Treats reader as a beginner.

AUTHENTICITY: Does the content sound like a specific human wrote it?
- 9-10: Unmistakably human. Takes stances, includes specific observations.
- 7-8: Sounds like a person. Has opinions and specific details.
- 5-6: Has a recognizable tone but doesn't take risks.
- 3-4: Mostly generic with occasional flashes of voice.
- 1-2: Generic corporate tone. Could be any company.

DENSITY: Is anything cuttable?
- 9-10: Nothing to cut. Every word earns its place.
- 7-8: Lean. A careful editor might cut 5%.
- 5-6: Mostly tight with occasional loose sentences.
- 3-4: Noticeable padding. Filler phrases throughout.
- 1-2: Bloated. Paragraphs could be halved without losing meaning.

OUTPUT FORMAT (follow exactly, nothing else):
directness|N
rhythm|N
trust|N
authenticity|N
density|N`;
}

module.exports = { buildScoringPrompt };

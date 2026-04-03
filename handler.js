#!/usr/bin/env node

/**
 * SideButton plugin handler for writing-quality.
 *
 * Receives JSON on stdin: { content, context?, mode? }
 * Returns MCP-formatted JSON on stdout.
 *
 * Modes:
 *   full          — deterministic pattern check + LLM scoring (default)
 *   patterns-only — deterministic only, no LLM call
 *   score-only    — LLM scoring only, skip pattern check
 */

const { checkPatterns } = require("./lib/pattern-checker");
const { buildScoringPrompt } = require("./lib/scoring-prompt");

async function callLLM(prompt) {
  // Use Anthropic API via ANTHROPIC_API_KEY env var
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set. LLM scoring requires an API key.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseScores(raw) {
  const scores = {};
  for (const line of raw.trim().split("\n")) {
    const [dim, val] = line.split("|").map((s) => s.trim());
    if (dim && val) {
      scores[dim] = parseInt(val, 10) || 0;
    }
  }
  scores.total =
    (scores.directness || 0) +
    (scores.rhythm || 0) +
    (scores.trust || 0) +
    (scores.authenticity || 0) +
    (scores.density || 0);
  return scores;
}

function formatOutput(findings, scores, mode, contentType) {
  const lines = [];

  // Content-type-aware threshold
  const threshold = contentType === "landing-page" ? 28 : 35;

  // Header
  const verdict = scores
    ? scores.total >= threshold
      ? "PASS"
      : "REVISE"
    : findings.length === 0
      ? "CLEAN"
      : "PATTERNS_FOUND";
  lines.push(`VERDICT: ${verdict}`);
  lines.push(`CONTENT_TYPE: ${contentType || "unknown"}`);
  lines.push(`MODE: ${mode}`);
  lines.push("");

  // Deterministic findings
  if (findings.length > 0) {
    lines.push(`PATTERN DETECTION (${findings.length} findings):`);
    for (const f of findings) {
      lines.push(`${f.category.toUpperCase()} | ${f.location} | ${f.severity} | ${f.pattern}`);
    }
    // Stats
    const high = findings.filter((f) => f.severity === "HIGH").length;
    const medium = findings.filter((f) => f.severity === "MEDIUM").length;
    const low = findings.filter((f) => f.severity === "LOW").length;
    lines.push(`\nSUMMARY: ${high} HIGH, ${medium} MEDIUM, ${low} LOW`);
  } else {
    lines.push("PATTERN DETECTION: CLEAN");
  }

  // Scores
  if (scores) {
    lines.push("");
    lines.push("SCORING:");
    lines.push(`directness|${scores.directness}`);
    lines.push(`rhythm|${scores.rhythm}`);
    lines.push(`trust|${scores.trust}`);
    lines.push(`authenticity|${scores.authenticity}`);
    lines.push(`density|${scores.density}`);
    lines.push(`total|${scores.total}`);

    // Dimension warnings
    const weak = Object.entries(scores)
      .filter(([k, v]) => k !== "total" && v < 5)
      .map(([k]) => k);
    if (weak.length > 0) {
      lines.push(`\nWARNING: ${weak.join(", ")} below 5 — automatic revision trigger`);
    }
  }

  return lines.join("\n");
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let args;
  try {
    args = JSON.parse(input);
  } catch {
    const result = {
      content: [{ type: "text", text: "Invalid JSON input" }],
      isError: true,
    };
    process.stdout.write(JSON.stringify(result));
    return;
  }

  const { content, context, mode = "full" } = args;

  if (!content) {
    const result = {
      content: [{ type: "text", text: 'Missing required field: "content"' }],
      isError: true,
    };
    process.stdout.write(JSON.stringify(result));
    return;
  }

  try {
    let findings = [];
    let scores = null;

    // Detect content type
    const isLandingPage = /pricing|cta|get started|sign up|book a|free trial|hero|landing/i.test(content)
      && content.split(/[.!?]/).length > 10;
    const contentType = isLandingPage ? "landing-page" : "prose";

    // Step 1: Deterministic pattern check
    if (mode !== "score-only") {
      findings = checkPatterns(content);
    }

    // Step 2: LLM scoring
    if (mode !== "patterns-only") {
      const prompt = buildScoringPrompt(content, context, findings);
      const raw = await callLLM(prompt);
      scores = parseScores(raw);
    }

    const output = formatOutput(findings, scores, mode, contentType);
    const result = {
      content: [{ type: "text", text: output }],
    };
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    const result = {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
    process.stdout.write(JSON.stringify(result));
  }
}

main();

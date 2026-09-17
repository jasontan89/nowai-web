// Agent Schema & Gemini Declaration Verification
import { DEFAULT_NOWAI_TOOLS } from "../lib/default-tools.js";
import { mcpToolsToGeminiDeclarations, buildSystemInstruction } from "../lib/gemini.js";

console.log("\n🧪 Running Agent Schema and Gemini Integration Verification\n");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Tool catalogue count
assert(DEFAULT_NOWAI_TOOLS.length >= 15, `Tool catalog has comprehensive coverage (${DEFAULT_NOWAI_TOOLS.length} tools)`);

// 2. Schema conversion
const geminiTools = mcpToolsToGeminiDeclarations(DEFAULT_NOWAI_TOOLS);
assert(Array.isArray(geminiTools) && geminiTools[0]?.functionDeclarations?.length === DEFAULT_NOWAI_TOOLS.length, "All tools converted to Gemini functionDeclarations");

// 3. Verify Gemini parameter types are uppercase
const firstDeclaration = geminiTools[0]?.functionDeclarations[0];
assert(firstDeclaration.parameters.type === "OBJECT", "Root parameter schema type is uppercase 'OBJECT'");

// Check all properties across all tools have uppercase types
let allUppercase = true;
for (const decl of geminiTools[0].functionDeclarations) {
  if (decl.parameters?.properties) {
    for (const [propName, prop] of Object.entries(decl.parameters.properties)) {
      if (prop.type !== prop.type.toUpperCase()) {
        allUppercase = false;
        console.error(`Property ${propName} has non-uppercase type: ${prop.type}`);
      }
    }
  }
}
assert(allUppercase, "All parameter properties use uppercase Gemini types (STRING, NUMBER, OBJECT, etc.)");

// 4. System Instruction checks
const systemInstruction = buildSystemInstruction(DEFAULT_NOWAI_TOOLS.map(t => t.name));
assert(systemInstruction.includes("NowAI"), "System prompt includes NowAI persona identity");
assert(systemInstruction.includes("Markdown tables"), "System prompt enforces structured Markdown tables");
assert(systemInstruction.includes("SAFETY & DESTRUCTIVE ACTIONS POLICY"), "System prompt enforces destructive action warning & confirmation policy");
assert(systemInstruction.includes("HTML is fully supported"), "System prompt instructs LLM on HTML badges and pills formatting");

console.log(`\n📊 Schema Verification Summary: ${passed} Passed, ${failed} Failed\n`);
if (failed > 0) process.exit(1);

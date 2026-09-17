import assert from "node:assert";

// Load .env.local
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      process.env[k] = v;
    }
  }
}

const MCP_URL = process.env.NOWAI_MCP_URL || "https://nowaikit-mcp.onrender.com";
const MCP_API_KEY = process.env.NOWAI_MCP_API_KEY || "61e2bfffedee6c55212072e2b8ba383e";
const INSTANCE_URL = process.env.SERVICENOW_INSTANCE_URL || "https://dev312295.service-now.com";

console.log("=== Testing Generic Prompt-Level Record Resolution ===");
console.log("MCP_URL:", MCP_URL);
console.log("INSTANCE_URL:", INSTANCE_URL);

async function callTool(name, args) {
  const res = await fetch(`${MCP_URL}/api/tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MCP_API_KEY}`,
    },
    body: JSON.stringify({ name, arguments: args }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result !== undefined ? data.result : data;
}

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  console.log("\n1. MCP Tools Discovery & Verification");
  await testAsync("Verify GET /api/tools exposes generic CRUD tools", async () => {
    const res = await fetch(`${MCP_URL}/api/tools`, {
      headers: { Authorization: `Bearer ${MCP_API_KEY}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert(Array.isArray(data.tools), "tools should be an array");
    const names = data.tools.map((t) => t.name);
    assert(names.includes("query_records"), "must include query_records");
    assert(names.includes("get_current_instance"), "must include get_current_instance");
  });

  console.log("\n2. Exact Count & Up to 100 Records on 'incident'");
  await testAsync("Fetch exact total count for active incidents", async () => {
    const countRes = await callTool("get_table_record_count", {
      table: "incident",
      query: "active=true",
    });
    const exactCount = parseInt(countRes.record_count, 10);
    console.log(`    Exact active incidents in ServiceNow: ${exactCount}`);
    assert(exactCount >= 40, "Expected at least 40 active incidents");
  });

  await testAsync("Fetch active incidents with limit=100 (should return all 44, not 10)", async () => {
    const recordsRes = await callTool("query_records", {
      table: "incident",
      query: "active=true",
      limit: 100,
    });
    const list = recordsRes.records || [];
    console.log(`    Returned active incidents: ${list.length}`);
    assert.strictEqual(list.length, 44, "Expected all 44 active incidents returned");
  });

  console.log("\n3. High-Volume Query (>100 records) on 'sys_user'");
  await testAsync("Fetch exact total count for sys_user table", async () => {
    const countRes = await callTool("get_table_record_count", {
      table: "sys_user",
      query: "",
    });
    const exactCount = parseInt(countRes.record_count, 10);
    console.log(`    Exact users in ServiceNow: ${exactCount}`);
    assert(exactCount > 100, `Expected > 100 users, got ${exactCount}`);

    // Generate list view deep-link
    const listUrl = `${INSTANCE_URL}/sys_user_list.do?sysparm_query=`;
    console.log(`    Generated ServiceNow List View URL: ${listUrl}`);
    assert.strictEqual(listUrl, "https://dev312295.service-now.com/sys_user_list.do?sysparm_query=");
  });

  await testAsync("Fetch sys_user records capped at 100 for conversational display", async () => {
    const recordsRes = await callTool("query_records", {
      table: "sys_user",
      query: "",
      limit: 100,
    });
    const list = recordsRes.records || [];
    console.log(`    Returned users: ${list.length}`);
    assert.strictEqual(list.length, 100, "Expected exactly 100 records returned for display");
  });

  console.log("\n4. Instance Verification");
  await testAsync("Verify get_current_instance returns correct ServiceNow URL", async () => {
    const instRes = await callTool("get_current_instance", {});
    assert.strictEqual(instRes.url, "https://dev312295.service-now.com");
  });

  console.log(`\n=== Verification Complete: ${passed}/${total} tests passed ===`);
  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});

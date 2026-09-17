// Comprehensive API and Security Verification Test Suite
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runTests() {
  console.log(`\n🧪 Running NowAI Web Agent Verification Suite against ${BASE_URL}\n`);
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

  // ─── TEST 1: Unauthenticated access to /api/tools must return 401 ───
  try {
    const res = await fetch(`${BASE_URL}/api/tools`);
    assert(res.status === 401, "TC-AUTH-04: Unauthenticated GET /api/tools returns 401 Unauthorized");
  } catch (e) {
    assert(false, `TC-AUTH-04 request failed: ${e.message}`);
  }

  // ─── TEST 2: Unauthenticated access to /api/chat must return 401 ───
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    assert(res.status === 401, "TC-AUTH-04: Unauthenticated POST /api/chat returns 401 Unauthorized");
  } catch (e) {
    assert(false, `TC-AUTH-04 request failed: ${e.message}`);
  }

  // ─── TEST 3: Invalid PIN must return 401 ───
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "999999_WRONG_PIN" }),
    });
    const data = await res.json();
    assert(res.status === 401 && data.success === false, "TC-AUTH-01: Invalid PIN rejected with 401");
  } catch (e) {
    assert(false, `TC-AUTH-01 request failed: ${e.message}`);
  }

  // ─── TEST 4: Valid PIN must return 200 and set-cookie ───
  let authCookie = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "1234" }), // Default PIN
    });
    const data = await res.json();
    const setCookie = res.headers.get("set-cookie");
    authCookie = setCookie ? setCookie.split(";")[0] : "";

    assert(res.status === 200 && data.success === true, "TC-AUTH-02: Valid PIN (1234) authenticated with 200");
    assert(authCookie.includes("nowai_session="), "TC-AUTH-02: HTTP-only nowai_session cookie issued");
  } catch (e) {
    assert(false, `TC-AUTH-02 request failed: ${e.message}`);
  }

  // ─── TEST 5: Authenticated call to /api/tools returns catalogue & suggestion chips ───
  try {
    const res = await fetch(`${BASE_URL}/api/tools`, {
      headers: { Cookie: authCookie },
    });
    const data = await res.json();
    assert(res.status === 200, "TC-MCP-01: Authenticated GET /api/tools returns 200");
    assert(Array.isArray(data.tools) && data.tools.length > 0, `TC-MCP-01: Returns tool list (found ${data.tools?.length} tools)`);
    assert(Array.isArray(data.chips) && data.chips.length > 0, `TC-MCP-02: Returns dynamic suggestion chips (${data.chips?.length} chips)`);

    // Verify key ServiceNow tools exist in catalog
    const hasIncidents = data.tools.some((t) => t.name === "query_incidents" || t.name === "get_incident");
    const hasUniversal = data.tools.some((t) => t.name === "query_records");
    assert(hasIncidents && hasUniversal, "TC-MCP-02: Incident and universal query tools present in catalogue");
  } catch (e) {
    assert(false, `TC-MCP-01 request failed: ${e.message}`);
  }

  // ─── TEST 6: Session status check /api/auth (GET) ───
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      headers: { Cookie: authCookie },
    });
    const data = await res.json();
    assert(res.status === 200 && data.authenticated === true, "TC-AUTH-02: Active session verified via GET /api/auth");
  } catch (e) {
    assert(false, `GET /api/auth check failed: ${e.message}`);
  }

  // ─── TEST 7: Logout clears session ───
  try {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: "DELETE",
      headers: { Cookie: authCookie },
    });
    const setCookie = res.headers.get("set-cookie") || "";
    assert(res.status === 200, "TC-AUTH-03: DELETE /api/auth returns 200");
    assert(setCookie.includes("Max-Age=0"), "TC-AUTH-03: Session cookie invalidated with Max-Age=0");
  } catch (e) {
    assert(false, `Logout failed: ${e.message}`);
  }

  console.log(`\n📊 Verification Summary: ${passed} Passed, ${failed} Failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

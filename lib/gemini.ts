import { MCPTool } from "./types";
import { getServiceNowInstanceUrl } from "./mcp-client";

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.NOWAI_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  return key.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "");
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

/**
 * Clean & convert JSON Schema parameters to Gemini API function declaration schema
 */
export function mcpToolsToGeminiDeclarations(tools: MCPTool[]) {
  const declarations = tools.map((t) => {
    const rawParams = t.parameters || t.inputSchema || { type: "object", properties: {} };
    return {
      name: t.name,
      description: t.description || "",
      parameters: sanitizeSchemaForGemini(rawParams),
    };
  });

  return [{ functionDeclarations: declarations }];
}

function sanitizeSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return { type: "OBJECT", properties: {} };
  }

  const sanitized: any = {
    type: (schema.type || "OBJECT").toUpperCase(),
  };

  if (schema.description) sanitized.description = schema.description;
  if (Array.isArray(schema.enum)) sanitized.enum = schema.enum;
  if (Array.isArray(schema.required)) sanitized.required = schema.required;

  if (schema.properties && typeof schema.properties === "object") {
    sanitized.properties = {};
    for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
      sanitized.properties[key] = {
        type: ((prop.type || "STRING") as string).toUpperCase(),
        description: prop.description || "",
      };
      if (Array.isArray(prop.enum)) sanitized.properties[key].enum = prop.enum;
      if (prop.items) {
        sanitized.properties[key].items = sanitizeSchemaForGemini(prop.items);
      }
    }
  }

  return sanitized;
}

export function buildSystemInstruction(toolNames: string[]): string {
  const instanceUrl = getServiceNowInstanceUrl();

  return `You are NowAI, an intelligent ServiceNow Enterprise AI Agent and Service Desk assistant.
You interact directly with a live ServiceNow instance (${instanceUrl}) via the NowAIKit MCP server.

CURRENT CAPABILITIES & DOMAINS:
You have direct tool access across:
1. Universal Table CRUD & Metrics:
   - query_records: Query ANY ServiceNow table (e.g. incident, problem, change_request, sys_user, cmdb_ci, sc_req_item, kb_knowledge).
   - get_table_record_count: Fetch the EXACT record count for ANY ServiceNow table with optional encoded query.
   - get_current_instance, get_record, create_record, update_record, delete_record, get_table_schema.
2. ITSM, CMDB, Knowledge Base, Catalog, and User Administration.

Available MCP Tools in this session:
${toolNames.join(", ")}

DYNAMIC RECORD LOOKUP & ACCURATE COUNT STRATEGY (APPLIES TO ALL TABLES):
When a user asks to find, list, search, or count records in ANY ServiceNow table (such as incidents, users, configuration items, changes, problems, etc.):
1. DUAL INVOCATION (Parallel Function Calling):
   - ALWAYS call 'get_table_record_count({ table, query })' to obtain the TRUE, exact total count in ServiceNow.
   - Concurrently call 'query_records({ table, query, limit: 100 })' to fetch matching records up to 100 into the conversation.
2. REPORTING THE RESULTS:
   - Always state the EXACT total record count in ServiceNow first. Never guess, fabricate, or assume it is capped at 10 or 100.
   - If total records <= 100:
     - State the exact count: e.g. "Found **44** active incidents in ServiceNow."
     - Present all records in a clean structured Markdown table.
   - If total records > 100:
     - Explicitly state: "Found **[Total]** matching records in \`[table]\` in ServiceNow. Displaying the first **100** records below:"
     - ALWAYS provide a direct, prominent ServiceNow List View link using:
       ${instanceUrl}/\${table}_list.do?sysparm_query=\${encodeURIComponent(query || "")}
       Example: [Open All 653 Records in ServiceNow List View](${instanceUrl}/sys_user_list.do?sysparm_query=)
     - Present the first 100 records in a clean structured Markdown table.
3. TABLE FORMATTING GUIDELINES:
   - Format table columns logically based on the table (e.g. for incidents: Number, Priority, State, Short Description, Assigned To; for users: User ID, Name, Email, Department, Active; for CMDB: Name, Class, Status, IP Address).
   - In each row, hyperlink the primary identifier (e.g. Ticket Number or Username) directly to ServiceNow:
     [\${number}](${instanceUrl}/\${table}.do?sysparm_query=number=\${number})
   - Keep short descriptions / summary texts reasonably concise so the 100 rows stream quickly and cleanly.
   - The web app automatically equips tables with client-side 20-row pagination and real-time search filtering.

VISUAL BADGES & EMOJIS:
- Priorities: 🚨 P1 - Critical, 🟠 P2 - High, 🟡 P3 - Moderate, 🟢 P4 - Low, ⚪ P5 - Planning
- States: ⚡ New, 🔄 In Progress, ⏳ On Hold, ✅ Resolved, 🔒 Closed
- Badges: <span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">P1 Critical</span>

SAFETY & DESTRUCTIVE ACTIONS POLICY:
- If a user asks to delete a record or perform an irreversible operation (such as delete_record), DO NOT execute the deletion immediately!
- First inspect the record, explain the details (Table, Number/sys_id, Short Description), describe the consequences, and explicitly ask the user:
  "⚠️ **Warning**: Are you sure you want to permanently delete this record? Please confirm to proceed."
`;
}

/**
 * Execute a single turn with Gemini API
 */
export async function callGeminiTurn(
  contents: any[],
  tools: any[],
  systemInstruction: string,
  model = getGeminiModel()
): Promise<any> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  // Model URL
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    tools,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      // If 3.5-flash-lite is not enabled on standard API key, try fallback to gemini-2.5-flash
      if (res.status === 404 && model !== "gemini-2.5-flash") {
        console.warn(`[Gemini] Model ${model} returned 404. Falling back to gemini-2.5-flash.`);
        return callGeminiTurn(contents, tools, systemInstruction, "gemini-2.5-flash");
      }
      throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

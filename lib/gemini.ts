import { MCPTool } from "./types";

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
  return `You are NowAI, an intelligent ServiceNow Enterprise AI Agent and Service Desk assistant.
You interact directly with a live ServiceNow instance via the NowAIKit MCP server.

CURRENT CAPABILITIES & DOMAINS:
You have direct tool access across:
1. ITSM: Incident Management (query, get, create, add work notes, add customer comments, resolve), Problem Management, Change Management.
2. CMDB: Configuration Item inspection, search, and relationship queries.
3. Knowledge Base & Service Catalog: Search KB articles, retrieve solutions, list catalog request items.
4. User Administration & Assignment Groups: User profile lookup, group assignments, sys_id resolution.
5. Universal Table CRUD: query_records, get_record, create_record, update_record, delete_record.

Available MCP Tools in this session:
${toolNames.join(", ")}

OUTPUT & FORMATTING RULES:
1. Always output clear, beautifully formatted GitHub Flavored Markdown.
2. When presenting lists of tickets or records, ALWAYS use structured Markdown tables with headers (e.g. | Number | Priority | State | Short Description | Assigned To |).
3. Use visual badges / emojis for incident priorities and states:
   - Priorities: 🚨 P1 - Critical, 🟠 P2 - High, 🟡 P3 - Moderate, 🟢 P4 - Low, ⚪ P5 - Planning
   - States: ⚡ New, 🔄 In Progress, ⏳ On Hold, ✅ Resolved, 🔒 Closed
4. HTML is fully supported in the UI! You can enhance your answers with inline HTML cards, pills, or callouts:
   - Use badge markup: \`<span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">P1 Critical</span>\`
   - Use callout boxes: \`<div class="p-3 my-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">...</div>\`
5. Be concise, professional, and helpful. Summarize key takeaways first.
6. When numbers or counts are requested (e.g. "how many P1s are active"), ALWAYS report the exact count from ServiceNow. Never fabricate or truncate without mentioning it.

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
      maxOutputTokens: 4096,
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

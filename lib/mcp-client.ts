import { MCPTool } from "./types";
import { DEFAULT_NOWAI_TOOLS } from "./default-tools";

interface CacheEntry {
  tools: MCPTool[];
  timestamp: number;
}

let cachedTools: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getMcpBaseUrl(): string {
  const rawUrl = process.env.NOWAI_MCP_URL || "";
  if (!rawUrl) return "";
  return rawUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/mcp$/, "")
    .replace(/\/api\/tool$/, "");
}

export function getMcpApiKey(): string {
  return (process.env.NOWAI_MCP_API_KEY || "").trim();
}

export function getServiceNowInstanceUrl(): string {
  const url = process.env.SERVICENOW_INSTANCE_URL || "https://dev312295.service-now.com";
  return url.trim().replace(/\/+$/, "");
}

/**
 * Fetch list of tools from the remote NowAIKit MCP server with fallback to known tools
 */
export async function listMcpTools(): Promise<{ tools: MCPTool[]; fromCache: boolean; isColdStart?: boolean }> {
  const baseUrl = getMcpBaseUrl();
  const apiKey = getMcpApiKey();

  // Return cache if fresh
  if (cachedTools && Date.now() - cachedTools.timestamp < CACHE_TTL_MS) {
    return { tools: cachedTools.tools, fromCache: true };
  }

  if (!baseUrl) {
    console.warn("[MCP] NOWAI_MCP_URL is not configured. Falling back to default tool definitions.");
    return { tools: DEFAULT_NOWAI_TOOLS, fromCache: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for tools list

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // 1. Try NowAIKit GET /api/tools endpoint first
    try {
      const toolsApiEndpoint = `${baseUrl}/api/tools`;
      const toolsRes = await fetch(toolsApiEndpoint, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      if (toolsRes.ok) {
        const data = await toolsRes.json();
        const remoteTools = data.tools || data.result?.tools || [];
        if (Array.isArray(remoteTools) && remoteTools.length > 0) {
          const formattedRemote: MCPTool[] = remoteTools.map((t: any) => ({
            name: t.name,
            description: t.description || "",
            parameters: t.inputSchema || t.parameters,
            category: categorizeTool(t.name),
          }));

          // Merge with DEFAULT_NOWAI_TOOLS to ensure core tools like get_table_record_count are guaranteed
          const existingNames = new Set(formattedRemote.map((t) => t.name));
          const merged = [
            ...formattedRemote,
            ...DEFAULT_NOWAI_TOOLS.filter((t) => !existingNames.has(t.name)),
          ];

          cachedTools = { tools: merged, timestamp: Date.now() };
          clearTimeout(timeoutId);
          return { tools: merged, fromCache: false };
        }
      }
    } catch {
      // Fallback to /mcp JSON-RPC
    }

    // 2. Try standard MCP JSON-RPC tools/list
    const mcpEndpoint = `${baseUrl}/mcp`;
    const res = await fetch(mcpEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "nowai-web-tools-list",
        method: "tools/list",
        params: {},
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawTools = data.result?.tools || [];
      if (Array.isArray(rawTools) && rawTools.length > 0) {
        const formattedTools: MCPTool[] = rawTools.map((t: any) => ({
          name: t.name,
          description: t.description || "",
          parameters: t.inputSchema || t.parameters,
          category: categorizeTool(t.name),
        }));

        const existingNames = new Set(formattedTools.map((t) => t.name));
        const merged = [
          ...formattedTools,
          ...DEFAULT_NOWAI_TOOLS.filter((t) => !existingNames.has(t.name)),
        ];

        cachedTools = {
          tools: merged,
          timestamp: Date.now(),
        };

        return { tools: merged, fromCache: false };
      }
    }
  } catch (err: any) {
    console.warn(`[MCP] Remote tools/list failed or timed out: ${err?.message || err}. Using default tools catalogue.`);
  }

  // Fallback to default catalog
  cachedTools = {
    tools: DEFAULT_NOWAI_TOOLS,
    timestamp: Date.now(),
  };

  return { tools: DEFAULT_NOWAI_TOOLS, fromCache: false, isColdStart: true };
}

/**
 * Execute an individual tool against NowAIKit MCP server
 */
export async function executeMcpTool(toolName: string, args: Record<string, any>): Promise<any> {
  const baseUrl = getMcpBaseUrl();
  const apiKey = getMcpApiKey();

  if (!baseUrl) {
    throw new Error("NOWAI_MCP_URL is not configured in environment variables.");
  }

  // Normalize tool and parameters dynamically
  let finalTool = toolName;
  const finalArgs = { ...args };

  // Generic limit safety: If query_records is called without limit, default to 100
  if (finalTool === "query_records" && (finalArgs.limit === undefined || finalArgs.limit === null)) {
    finalArgs.limit = 100;
  }
  // Alias query_incidents to query_records with table 'incident'
  if (finalTool === "query_incidents") {
    finalTool = "query_records";
    if (!finalArgs.table) finalArgs.table = "incident";
    if (finalArgs.limit === undefined || finalArgs.limit === null) {
      finalArgs.limit = 100;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  // 55-second timeout to allow Render free tier container spin-up if suspended
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    // 1. Try NowAIKit direct /api/tool endpoint first (matches nowai-bot)
    const targetUrl = `${baseUrl}/api/tool`;
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: finalTool,
        arguments: finalArgs,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.error) {
        const errMsg = typeof json.error === "string" ? json.error : json.error.message || JSON.stringify(json.error);
        throw new Error(errMsg);
      }
      return json.result !== undefined ? json.result : json;
    }

    // 2. If /api/tool gave 404, fallback to MCP protocol /mcp endpoint
    if (res.status === 404) {
      const mcpRes = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `call-${Date.now()}`,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (mcpRes.ok) {
        const mcpJson = await mcpRes.json();
        if (mcpJson.error) {
          throw new Error(mcpJson.error.message || JSON.stringify(mcpJson.error));
        }
        return mcpJson.result?.content || mcpJson.result;
      }
    }

    const errorText = await res.text();
    throw new Error(`NowAIKit HTTP ${res.status}: ${errorText || res.statusText}`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error(
        `Connection to NowAIKit MCP server timed out (55s). The Render free instance may be spinning up from sleep. Please try again shortly.`
      );
    }
    throw err;
  }
}

/**
 * Assign a category to a tool based on naming conventions
 */
function categorizeTool(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("inc") || lower.includes("chg") || lower.includes("prb") || lower.includes("problem") || lower.includes("change")) {
    return "ITSM";
  }
  if (lower.includes("cmdb") || lower.includes("ci") || lower.includes("asset")) {
    return "CMDB";
  }
  if (lower.includes("kb") || lower.includes("know") || lower.includes("cat") || lower.includes("sc_")) {
    return "Catalog & KB";
  }
  if (lower.includes("user") || lower.includes("group") || lower.includes("role") || lower.includes("profile")) {
    return "User Admin";
  }
  return "General";
}

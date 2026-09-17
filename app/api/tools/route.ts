import { NextRequest, NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/lib/auth";
import {
  listMcpTools,
  getServiceNowInstanceUrl,
  getServiceNowInstanceName,
} from "@/lib/mcp-client";
import { SuggestionChip } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (!isRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized. Please enter your PIN." }, { status: 401 });
  }

  try {
    const { tools, fromCache, isColdStart } = await listMcpTools();

    // Generate dynamic suggestion chips based on available tools
    const chips: SuggestionChip[] = [];

    // ITSM suggestions
    if (tools.some((t) => t.name === "query_incidents" || t.name === "query_records")) {
      chips.push({
        id: "chip-p1",
        label: "🚨 Active P1 Outages",
        prompt: "Show me all active P1 and P2 critical incidents with their current state, assignment group, and caller in a table.",
        category: "ITSM",
      });
      chips.push({
        id: "chip-triage",
        label: "📋 Triage Queue",
        prompt: "Show me unassigned active incidents requiring triage or assignment.",
        category: "ITSM",
      });
    }

    if (tools.some((t) => t.name === "create_incident")) {
      chips.push({
        id: "chip-new-inc",
        label: "➕ Draft Incident",
        prompt: "I want to create an incident for an email sync outage affecting the Finance department with high urgency.",
        category: "ITSM",
      });
    }

    // Change Management
    if (tools.some((t) => t.name.includes("change"))) {
      chips.push({
        id: "chip-chg",
        label: "🔄 Upcoming Changes",
        prompt: "List all active or upcoming change requests scheduled for this week.",
        category: "ITSM",
      });
    }

    // Problem Management
    if (tools.some((t) => t.name.includes("problem"))) {
      chips.push({
        id: "chip-prb",
        label: "⚠️ Known Problems",
        prompt: "Show open problem records and their current workarounds.",
        category: "ITSM",
      });
    }

    // CMDB & CI suggestions
    if (tools.some((t) => t.name.includes("ci") || t.name.includes("cmdb"))) {
      chips.push({
        id: "chip-ci",
        label: "🖥️ Inspect CI Server",
        prompt: "Search the CMDB for database servers or inspect configuration items with operational issues.",
        category: "CMDB",
      });
    }

    // Knowledge & Catalog
    if (tools.some((t) => t.name.includes("kb") || t.name.includes("know"))) {
      chips.push({
        id: "chip-kb",
        label: "📚 Search Knowledge Base",
        prompt: "Search the knowledge base for instructions on VPN setup and password resets.",
        category: "Catalog & KB",
      });
    }

    // User Admin
    if (tools.some((t) => t.name.includes("user") || t.name.includes("group"))) {
      chips.push({
        id: "chip-user",
        label: "👤 Look up User",
        prompt: "Look up user Abel Tuter and show all tickets currently assigned to him.",
        category: "User Admin",
      });
    }

    return NextResponse.json({
      tools,
      chips,
      fromCache,
      isColdStart,
      count: tools.length,
      instanceUrl: getServiceNowInstanceUrl(),
      instanceName: getServiceNowInstanceName(),
    });
  } catch (err: any) {
    console.error("[API /tools] Error:", err);
    return NextResponse.json(
      { error: "Failed to list MCP tools", details: err?.message },
      { status: 500 }
    );
  }
}

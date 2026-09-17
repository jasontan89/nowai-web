import { MCPTool } from "./types";

export const DEFAULT_NOWAI_TOOLS: MCPTool[] = [
  // ─── ITSM: Incidents ───
  {
    name: "query_incidents",
    description: "Search, filter, or list ServiceNow incidents using encoded queries or conditions (e.g. priority=1, state=1, active=true, category=network).",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "ServiceNow encoded query string (e.g. 'priority=1^active=true', 'state=1', 'category=software')" },
        limit: { type: "number", description: "Maximum records to return (default: 50, max: 100)." },
      },
    },
  },
  {
    name: "get_incident",
    description: "Get detailed information about a single ServiceNow incident by ticket number (e.g. INC0010045) or 32-character sys_id.",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        number_or_sysid: { type: "string", description: "Incident number (INC...) or 32-char sys_id" },
      },
      required: ["number_or_sysid"],
    },
  },
  {
    name: "create_incident",
    description: "Create a new ServiceNow incident ticket with short description, description, urgency (1-3), impact (1-3), category, and caller.",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        short_description: { type: "string", description: "Brief 1-sentence summary of the outage or issue" },
        description: { type: "string", description: "Detailed description of the incident including symptoms and impact" },
        urgency: { type: "string", description: "1 (High), 2 (Medium), 3 (Low)", enum: ["1", "2", "3"] },
        impact: { type: "string", description: "1 (High), 2 (Medium), 3 (Low)", enum: ["1", "2", "3"] },
        category: { type: "string", description: "Category (e.g., inquiry, software, hardware, network, database)" },
        caller_id: { type: "string", description: "User sys_id or user_name of the reporter" },
      },
      required: ["short_description"],
    },
  },
  {
    name: "add_work_note",
    description: "Append an internal technician work note to an existing incident.",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        number_or_sysid: { type: "string", description: "Incident number or sys_id" },
        work_notes: { type: "string", description: "Internal technician work note" },
      },
      required: ["number_or_sysid", "work_notes"],
    },
  },
  {
    name: "add_comment",
    description: "Add a customer-visible public comment to an existing incident.",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        number_or_sysid: { type: "string", description: "Incident number or sys_id" },
        comments: { type: "string", description: "Public customer-facing comment" },
      },
      required: ["number_or_sysid", "comments"],
    },
  },
  {
    name: "resolve_incident",
    description: "Mark an incident as Resolved with a resolution code and close notes.",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        number_or_sysid: { type: "string", description: "Incident number or sys_id" },
        close_code: { type: "string", description: "Resolution code (e.g. 'Solved (Work Around)', 'Solved (Permanently)', 'Not Solved (Not Reproducible)')" },
        close_notes: { type: "string", description: "Detailed notes explaining how the issue was diagnosed and resolved" },
      },
      required: ["number_or_sysid", "close_notes"],
    },
  },

  // ─── ITSM: Changes & Problems ───
  {
    name: "get_change_request",
    description: "Retrieve details of a ServiceNow change request (CHG...).",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "Change request number (e.g. CHG0030001) or sys_id" },
      },
      required: ["identifier"],
    },
  },
  {
    name: "query_changes",
    description: "Query and filter ServiceNow change requests (change_request table).",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "ServiceNow encoded query (e.g. active=true^type=normal)" },
        limit: { type: "number", description: "Maximum records to return" },
      },
    },
  },
  {
    name: "get_problem",
    description: "Retrieve details of a ServiceNow problem record (PRB...).",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "Problem number (e.g. PRB0040001) or sys_id" },
      },
      required: ["identifier"],
    },
  },
  {
    name: "query_problems",
    description: "Query and filter ServiceNow problem records (problem table).",
    category: "ITSM",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "ServiceNow encoded query (e.g. active=true)" },
        limit: { type: "number", description: "Maximum records to return" },
      },
    },
  },

  // ─── CMDB & Assets ───
  {
    name: "get_ci",
    description: "Fetch details of a Configuration Item (CI) from the CMDB by name or sys_id.",
    category: "CMDB",
    parameters: {
      type: "object",
      properties: {
        identifier: { type: "string", description: "CI Name (e.g. 'SAP Production DB', 'Router-01') or sys_id" },
      },
      required: ["identifier"],
    },
  },
  {
    name: "query_cmdb",
    description: "Search and filter CMDB Configuration Items (cmdb_ci table).",
    category: "CMDB",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Encoded query (e.g. operational_status=1^nameLIKEserver)" },
        limit: { type: "number", description: "Limit records (default 20)" },
      },
    },
  },

  // ─── Knowledge Base & Catalog ───
  {
    name: "search_kb",
    description: "Search ServiceNow Knowledge Base articles by keywords or topic.",
    category: "Catalog & KB",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Search query text (e.g. 'VPN connection setup', 'Password reset policy')" },
        limit: { type: "number", description: "Maximum articles to return" },
      },
      required: ["text"],
    },
  },
  {
    name: "get_kb",
    description: "Retrieve full article text and details of a Knowledge Base article by KB number (e.g. KB0010002) or sys_id.",
    category: "Catalog & KB",
    parameters: {
      type: "object",
      properties: {
        number_or_sysid: { type: "string", description: "KB number or sys_id" },
      },
      required: ["number_or_sysid"],
    },
  },
  {
    name: "get_catalog_items",
    description: "Search or list Service Catalog items (sc_cat_item).",
    category: "Catalog & KB",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Encoded query or search string for catalog items" },
        limit: { type: "number", description: "Max items to return" },
      },
    },
  },

  // ─── Users & Administration ───
  {
    name: "get_user",
    description: "Look up a ServiceNow user by username, email, full name, or sys_id.",
    category: "User Admin",
    parameters: {
      type: "object",
      properties: {
        user_identifier: { type: "string", description: "User ID, email, or full name (e.g. 'abel.tuter', 'admin')" },
      },
      required: ["user_identifier"],
    },
  },
  {
    name: "get_group",
    description: "Look up an assignment group by name or sys_id.",
    category: "User Admin",
    parameters: {
      type: "object",
      properties: {
        group_identifier: { type: "string", description: "Group name (e.g. 'Network', 'Service Desk', 'Hardware') or sys_id" },
      },
      required: ["group_identifier"],
    },
  },

  // ─── Universal Table CRUD & Metrics ───
  {
    name: "get_table_record_count",
    description: "Get the exact total record count for ANY ServiceNow table with optional encoded query filters. Always call this when finding, listing, or counting records to obtain the true total count in ServiceNow.",
    category: "General",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "ServiceNow table name (e.g. 'incident', 'sys_user', 'change_request', 'cmdb_ci')" },
        query: { type: "string", description: "ServiceNow encoded query string (optional, e.g. 'active=true^priority=1')" },
      },
      required: ["table"],
    },
  },
  {
    name: "get_current_instance",
    description: "Get the currently active ServiceNow instance name and base URL (e.g. https://dev312295.service-now.com).",
    category: "General",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "query_records",
    description: "Generic query against ANY ServiceNow table (e.g., incident, change_request, sys_user, cmdb_ci, sc_req_item). Returns matching records up to limit (default: 100).",
    category: "General",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "ServiceNow table name (e.g. 'incident', 'sys_user', 'cmdb_ci')" },
        query: { type: "string", description: "ServiceNow encoded query string (e.g. 'active=true^priority=1')" },
        limit: { type: "number", description: "Maximum number of records to return (default: 100, max: 1000)" },
        fields: { type: "string", description: "Comma-separated list of field names to return (e.g. 'number,short_description,state,priority')" },
        orderBy: { type: "string", description: "Field to sort by. Prefix with '-' for descending" },
      },
      required: ["table"],
    },
  },
  {
    name: "get_record",
    description: "Get a single record from any ServiceNow table by sys_id.",
    category: "General",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "ServiceNow table name" },
        sys_id: { type: "string", description: "32-character sys_id of the record" },
      },
      required: ["table", "sys_id"],
    },
  },
  {
    name: "create_record",
    description: "Insert a new record into any ServiceNow table.",
    category: "General",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "ServiceNow table name" },
        data: { type: "object", description: "Key-value dictionary of field values to set" },
      },
      required: ["table", "data"],
    },
  },
  {
    name: "update_record",
    description: "Update an existing record in any ServiceNow table.",
    category: "General",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "ServiceNow table name" },
        sys_id: { type: "string", description: "32-character sys_id of the record to update" },
        data: { type: "object", description: "Key-value dictionary of field values to update" },
      },
      required: ["table", "sys_id", "data"],
    },
  },
];

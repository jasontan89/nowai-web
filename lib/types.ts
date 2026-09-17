export interface MCPToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
  };
  default?: any;
}

export interface MCPToolParameters {
  type: "object" | "OBJECT";
  properties: Record<string, MCPToolParameterProperty>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: MCPToolParameters;
  parameters?: MCPToolParameters;
  category?: string;
}

export interface ToolExecutionRecord {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  status: "pending" | "running" | "completed" | "error";
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  toolCalls?: ToolExecutionRecord[];
  isStreaming?: boolean;
}

export type SSEEvent =
  | { type: "text_delta"; content: string }
  | { type: "tool_start"; tool: ToolExecutionRecord }
  | { type: "tool_result"; id: string; result: any; error?: string; durationMs: number }
  | { type: "done"; fullContent?: string }
  | { type: "error"; message: string; isColdStart?: boolean };

export interface SuggestionChip {
  id: string;
  label: string;
  prompt: string;
  category: "ITSM" | "CMDB" | "Catalog & KB" | "User Admin" | "General";
  icon?: string;
}

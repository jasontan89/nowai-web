"use client";

import React, { useState } from "react";
import { ToolExecutionRecord } from "@/lib/types";
import {
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
} from "lucide-react";

interface ToolActivityProps {
  tool: ToolExecutionRecord;
}

export const ToolActivity: React.FC<ToolActivityProps> = ({ tool }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isRunning = tool.status === "running";
  const isError = tool.status === "error" || Boolean(tool.error);
  const isCompleted = tool.status === "completed" && !tool.error;

  return (
    <div className="my-2 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 overflow-hidden text-xs sm:text-sm shadow-2xs transition-all">
      {/* Header / Summary Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isRunning && (
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
          )}
          {isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          {isError && (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}

          <div className="flex items-center gap-1.5 font-mono truncate">
            <span className="text-slate-500 dark:text-slate-400 font-sans text-xs">
              MCP Tool:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {tool.name}
            </span>
          </div>

          {tool.durationMs !== undefined && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-slate-400 dark:text-slate-500 text-[11px]">
              <Clock className="w-3 h-3" />
              {tool.durationMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isRunning
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse"
                : isError
                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isRunning ? "Executing..." : isError ? "Error" : "Completed"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-950/70 font-mono text-xs">
          {/* Arguments */}
          <div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1 font-sans text-xs font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Input Arguments:</span>
            </div>
            <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800">
              {JSON.stringify(tool.arguments || {}, null, 2)}
            </pre>
          </div>

          {/* Result or Error */}
          {tool.error ? (
            <div>
              <div className="flex items-center gap-1 text-rose-500 dark:text-rose-400 mb-1 font-sans text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>ServiceNow MCP Error:</span>
              </div>
              <pre className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 overflow-x-auto border border-rose-200 dark:border-rose-900/50">
                {tool.error}
              </pre>
            </div>
          ) : tool.result !== undefined ? (
            <div>
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1 font-sans text-xs font-medium">
                <Wrench className="w-3.5 h-3.5" />
                <span>ServiceNow Response:</span>
              </div>
              <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800">
                {typeof tool.result === "string"
                  ? tool.result
                  : JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

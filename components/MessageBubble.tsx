"use client";

import React, { useState } from "react";
import { ChatMessage } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolActivity } from "./ToolActivity";
import { Bot, User, Copy, Check } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(message.timestamp));

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5 my-4 pl-8">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-blue-600 text-white shadow-xs">
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 px-1">
            {formattedTime}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white shrink-0 shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 my-5 pr-4 sm:pr-8 group">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex flex-col max-w-[95%] sm:max-w-[88%] min-w-0 flex-1">
        {/* Assistant Name & Timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            NowAI
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono">
            ServiceNow Agent
          </span>
          <span className="text-[11px] text-slate-400">{formattedTime}</span>

          {message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Tool Activity Panels */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1.5 my-1.5">
            {message.toolCalls.map((tool) => (
              <ToolActivity key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {/* Message Content with Markdown & HTML Rendering */}
        {message.content ? (
          <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 shadow-2xs text-slate-900 dark:text-slate-100">
            <MarkdownRenderer content={message.content} />

            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-cursor-blink align-middle" />
            )}
          </div>
        ) : message.isStreaming ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>Reasoning & fetching data from ServiceNow...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, SuggestionChip, ToolExecutionRecord, SSEEvent } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { SuggestionChips } from "./SuggestionChips";
import { ThemeToggle } from "./ThemeToggle";
import {
  Send,
  Square,
  RotateCcw,
  LogOut,
  Sparkles,
  Layers,
  Search,
  Database,
  Users,
  Radio,
  ArrowDown,
  ExternalLink,
} from "lucide-react";

interface ChatInterfaceProps {
  onLogout: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLogout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chips, setChips] = useState<SuggestionChip[]>([]);
  const [mcpStatus, setMcpStatus] = useState<{
    count: number;
    isColdStart?: boolean;
    loaded: boolean;
    instanceUrl?: string;
    instanceName?: string;
  }>({ count: 0, loaded: false });
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch available tools and dynamic suggestion chips on mount
  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch("/api/tools");
        if (res.ok) {
          const data = await res.json();
          setChips(data.chips || []);
          setMcpStatus({
            count: data.count || 0,
            isColdStart: data.isColdStart,
            loaded: true,
            instanceUrl: data.instanceUrl,
            instanceName: data.instanceName,
          });
        }
      } catch (err) {
        console.warn("Failed to load tools status:", err);
      }
    }
    fetchTools();
  }, []);

  // Auto-scroll logic
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Track scroll position to toggle scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 150);
  };

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            180
          )}px`;
        }
      }, 50);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
        updated[updated.length - 1].isStreaming = false;
      }
      return updated;
    });
  };

  const handleClearChat = () => {
    if (isGenerating) handleStopGeneration();
    setMessages([]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    const assistantPlaceholder: ChatMessage = {
      id: `msg-ai-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: Date.now() + 1,
      toolCalls: [],
      isStreaming: true,
    };

    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantPlaceholder]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Chat API error (${res.status}): ${errText}`);
      }

      if (!res.body) throw new Error("No response body received");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace(/^data: /, "").trim();
          if (!jsonStr) continue;

          try {
            const event: SSEEvent = JSON.parse(jsonStr);

            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx < 0 || updated[lastIdx].role !== "assistant") return prev;

              const current = { ...updated[lastIdx] };

              if (event.type === "text_delta") {
                current.content += event.content;
              } else if (event.type === "tool_start") {
                current.toolCalls = [...(current.toolCalls || []), event.tool];
              } else if (event.type === "tool_result") {
                current.toolCalls = (current.toolCalls || []).map((t) => {
                  if (t.id === event.id) {
                    return {
                      ...t,
                      status: event.error ? "error" : "completed",
                      result: event.result,
                      error: event.error,
                      durationMs: event.durationMs,
                    };
                  }
                  return t;
                });
              } else if (event.type === "done") {
                current.isStreaming = false;
                if (event.fullContent && !current.content) {
                  current.content = event.fullContent;
                }
              } else if (event.type === "error") {
                current.isStreaming = false;
                current.content += `\n\n> ❌ **Error:** ${event.message}`;
              }

              updated[lastIdx] = current;
              return updated;
            });
          } catch (e) {
            console.error("Error parsing SSE event:", e);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content:
                updated[lastIdx].content +
                `\n\n> ❌ **Request Failed:** ${err?.message || "Connection error"}`,
              isStreaming: false,
            };
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
          updated[updated.length - 1].isStreaming = false;
        }
        return updated;
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* ─── Top Navigation Bar ─── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Badge */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs font-bold text-base">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight">NowAI</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-medium">
                MCP Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              ServiceNow Intelligent IT Operations Console
            </p>
          </div>
        </div>

        {/* Status indicator & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MCP Health Badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              mcpStatus.loaded
                ? mcpStatus.isColdStart
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-500/10 border-slate-500/30 text-slate-500"
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>
              {mcpStatus.loaded
                ? mcpStatus.isColdStart
                  ? "MCP Standby (Waking Up)"
                  : `MCP Live (${mcpStatus.count} Tools)`
                : "Connecting MCP..."}
            </span>
          </div>

          {/* ServiceNow Instance Badge */}
          {mcpStatus.instanceName && (
            <a
              href={mcpStatus.instanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              title={`Open ServiceNow instance: ${mcpStatus.instanceUrl}`}
            >
              <ExternalLink className="w-3 h-3" />
              <span>SN: {mcpStatus.instanceName}</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleClearChat}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reset Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors border border-slate-200 dark:border-slate-800"
            title="Lock session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ─── Scrollable Message Area ─── */}
      <main
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 max-w-4xl w-full mx-auto"
      >
        {messages.length === 0 ? (
          /* Welcome Screen / Empty State */
          <div className="h-full flex flex-col justify-center items-center text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm mb-4">
              <Sparkles className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ServiceNow Enterprise AI Agent
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1.5 mb-8">
              Autonomous reasoning with live NowAIKit MCP tools. Ask questions, manage tickets, inspect configuration items, and query tables in real-time.
            </p>

            {/* Feature Capability Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-left">
              <div
                onClick={() =>
                  handleSelectPrompt(
                    "Show me all active P1 and P2 critical incidents with priority, state, and short description."
                  )
                }
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-500/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
                  <Layers className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    ITSM Incident Ops
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Query triage queue, inspect single incidents, add technician work notes, or resolve tickets.
                </p>
              </div>

              <div
                onClick={() =>
                  handleSelectPrompt(
                    "Search the CMDB for database and web servers with active issues."
                  )
                }
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-emerald-500/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
                  <Database className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    CMDB & Assets
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Inspect Configuration Items (CIs), relationships, operational status, and asset inventory.
                </p>
              </div>

              <div
                onClick={() =>
                  handleSelectPrompt(
                    "Search the ServiceNow knowledge base for VPN setup and password reset guides."
                  )
                }
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-amber-500/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400">
                  <Search className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    Knowledge & Catalog
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Search KB articles, find troubleshooting steps, and browse service request catalog items.
                </p>
              </div>

              <div
                onClick={() =>
                  handleSelectPrompt(
                    "Look up technician Abel Tuter and show all incidents assigned to him."
                  )
                }
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-500/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1 text-purple-600 dark:text-purple-400">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    User & Group Admin
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Find technician profiles, retrieve sys_ids, inspect assignment groups, and check workloads.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Message Stream */
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-24 right-6 sm:right-10 p-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all z-20 active:scale-95"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* ─── Bottom Input & Suggestion Bar ─── */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 sm:p-4 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Dynamic Suggestion Chips */}
          <SuggestionChips
            chips={chips}
            onSelectPrompt={handleSelectPrompt}
            disabled={isGenerating}
          />

          {/* Textarea Input Container */}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all shadow-2xs"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask NowAI anything about your ServiceNow instance..."
              className="flex-1 max-h-44 p-2 sm:p-2.5 bg-transparent resize-none focus:outline-none text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed"
            />

            {isGenerating ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 shadow-xs"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-colors shrink-0 shadow-xs disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
            Powered by Google Gemini 3.5 & NowAIKit MCP Server on Render. Outputs formatted Markdown and HTML.
          </p>
        </div>
      </footer>
    </div>
  );
};

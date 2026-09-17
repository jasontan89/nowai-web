"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { DataTable } from "./DataTable";
import { Check, Copy, ExternalLink } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900/90 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50 text-xs text-slate-400 font-mono">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-700/60"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-content text-sm sm:text-base leading-relaxed space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children).replace(/\n$/, "");
            const isInline = !match && !codeText.includes("\n");

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-xs sm:text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : ""}
                value={codeText}
              />
            );
          },
          table({ children }) {
            return <DataTable defaultPageSize={20}>{children}</DataTable>;
          },
          a({ href, children }) {
            const isServiceNow = href?.includes("service-now.com");
            const isListView = isServiceNow && href?.includes("_list.do");

            if (isListView) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] no-underline"
                >
                  <span>{children}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-0.5 ${
                  isServiceNow
                    ? "text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    : "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
                }`}
              >
                <span>{children}</span>
                {isServiceNow && <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />}
              </a>
            );
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mt-3 mb-1.5 text-slate-900 dark:text-slate-100">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-2.5 mb-1 text-slate-900 dark:text-slate-100">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside space-y-1 my-2 pl-2">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside space-y-1 my-2 pl-2">{children}</ol>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500/50 pl-3 py-1 my-2 bg-blue-500/5 rounded-r text-slate-700 dark:text-slate-300 italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

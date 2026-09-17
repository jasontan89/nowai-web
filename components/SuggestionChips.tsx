"use client";

import React from "react";
import { SuggestionChip } from "@/lib/types";
import { Sparkles } from "lucide-react";

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  chips,
  onSelectPrompt,
  disabled = false,
}) => {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium">Quick Suggestions & Templates:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar">
        {chips.map((chip) => {
          return (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(chip.prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

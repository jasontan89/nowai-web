"use client";

import React, { useState, useEffect } from "react";
import { PinGate } from "@/components/PinGate";
import { ChatInterface } from "@/components/ChatInterface";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(Boolean(data.authenticated));
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
  };

  // Loading state while checking cookie
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Initializing NowAI Console...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  return <ChatInterface onLogout={handleLogout} />;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NowAI — ServiceNow Enterprise AI Agent",
  description:
    "Autonomous AI Chatbot for ServiceNow IT Operations with NowAIKit MCP tools, Google Gemini 3.5, and rich markdown & HTML output.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

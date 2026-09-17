# NowAI Web Agent Chatbot for ServiceNow

A modern, production-ready AI Agent web application connecting directly to your ServiceNow Personal Developer Instance (PDI) via the [NowAIKit](https://github.com/aartiq/nowaikit) MCP server on Render and Google Gemini.

Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**, designed for one-click deployment on **Vercel**.

---

## 🌟 Key Features

1. **Autonomous Tool-Calling Agent Loop**:
   - Google Gemini reasons autonomously, emits tool calls to ServiceNow via NowAIKit MCP, and chains multiple steps together (e.g., look up user sys_id → query incidents assigned to user → summarize findings).
   - Guardrails with max reasoning turns and safety policies for destructive operations.

2. **Server-Side MCP Bridge (Security First)**:
   - Your Render MCP URL and `NOWAIKIT_API_KEY` are kept securely server-side.
   - Handles Render free-tier cold starts gracefully with pre-catalog fallback and status indicators.

3. **Real-Time Token Streaming (SSE)**:
   - Token-by-token streaming response (ChatGPT-like experience).
   - Interleaved tool execution events: shows which tool is running in real-time.

4. **Rich Markdown & HTML Output**:
   - Structured tables with borders and horizontal scroll on mobile.
   - Code blocks with syntax highlighting and one-click copy.
   - Visual priority badges (`🚨 P1 - Critical`, `🟠 P2 - High`, `🟡 P3 - Moderate`, `🟢 P4 - Low`) and state pills (`⚡ New`, `🔄 In Progress`, `⏳ On Hold`, `✅ Resolved`).
   - HTML card and callout passthrough via `rehype-raw`.

5. **Collapsible Tool Activity Inspector**:
   - Compact status indicator when a tool runs (`query_incidents`, `get_incident`, etc.).
   - Expandable accordion to view raw JSON inputs and ServiceNow JSON responses.

6. **Dynamic Multi-Domain Suggestion Chips**:
   - Discovers tools from MCP server at runtime and generates suggestion chips across:
     - **ITSM**: Incidents, Problems, Changes
     - **CMDB & Assets**: Server CIs, database assets
     - **Catalog & Knowledge Base**: Search KB articles, browse request catalog
     - **User Administration**: Technician lookup, assignment groups

7. **Team PIN Gate & Dark Theme**:
   - Secured by team PIN gate (`NOWAI_PIN`).
   - Dark theme default with instant dark/light mode toggle and localStorage memory.

---

## 🏗️ Architecture

```
                                    ┌────────────────────────────────────┐
                                    │        Browser / Web Client        │
                                    └─────────────────┬──────────────────┘
                                                      │ (HTTPS / SSE)
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Vercel Serverless (Next.js App Router)                                                                │
│                                                                                                        │
│   ┌──────────────────────────────────────────────────┐   ┌─────────────────────────────────────────┐   │
│   │ /api/auth                                        │   │ /api/tools                              │   │
│   │ - PIN code validation                            │   │ - MCP tool discovery & caching          │   │
│   │ - HTTP-only session cookie                       │   │ - Dynamic multi-domain suggestion chips │   │
│   └──────────────────────────────────────────────────┘   └─────────────────────────────────────────┘   │
│                             │                                                 │                        │
│                             └───────────────────────┬─────────────────────────┘                        │
│                                                     ▼                                                  │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ /api/chat (Agentic Engine & SSE Streaming)                                                     │   │
│   │ - Multi-turn reasoning loop (Max 8 turns)                                                      │   │
│   │ - Schema conversion (MCP JSON Schema → Gemini functionDeclarations)                            │   │
│   │ - Google Gemini (Gemini 2.5 Flash / 3.5 Flash-Lite)                                            │   │
│   │ - Executes tools via Server-Side MCP client                                                    │   │
│   └───────────────────────────────────────────────┬────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┼────────────────────────────────────────────────────┘
                                                    │
                                 Streamable HTTP    │ POST /api/tool
                                 Bearer API Key     │ JSON-RPC tools/list
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Standalone NowAIKit MCP Server (Render Free Plan)                                                     │
│  - Docker deployment from aartiq/nowaikit                                                              │
│  - Secured with NOWAIKIT_API_KEY                                                                       │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │
                                                    │ ServiceNow REST Table API
                                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  ServiceNow PDI (devXXXXX.service-now.com)                                                             │
│  - incident, problem, change_request, cmdb_ci, sys_user, kb_knowledge, sc_cat_item                     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables

Configure these environment variables in `.env.local` for local development, or in your Vercel Project Settings:

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `NOWAI_MCP_URL` | **Yes** | URL of your NowAIKit MCP server on Render | `https://nowaikit-mcp-xxxx.onrender.com` |
| `NOWAI_MCP_API_KEY` | **Yes** | Bearer token set on Render (`NOWAIKIT_API_KEY`) | `your-mcp-bearer-token` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | No | Gemini model (Default: `gemini-2.5-flash`) | `gemini-2.5-flash` or `gemini-3.5-flash-lite` |
| `NOWAI_PIN` | No | Access gate PIN (Default: `1234`) | `1234` |

---

## 🚀 Quick Start (Local Development)

1. Navigate to the project directory:
   ```bash
   cd nowai-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your `NOWAI_MCP_URL`, `NOWAI_MCP_API_KEY`, and `GEMINI_API_KEY`.

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser. Enter PIN `1234` to unlock the assistant!

---

## 🚢 Deploying to Vercel

1. Push this `nowai-web` repository to GitHub:
   ```bash
   cd nowai-web
   git add .
   git commit -m "Initial commit: NowAI Web Agent Chatbot"
   git remote add origin https://github.com/<your-user>/nowai-web.git
   git push -u origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** → **Project**.
3. Import your `nowai-web` repository.
4. Under **Environment Variables**, add:
   - `NOWAI_MCP_URL`: `https://your-nowaikit-mcp.onrender.com`
   - `NOWAI_MCP_API_KEY`: `your-mcp-token`
   - `GEMINI_API_KEY`: `your-google-gemini-key`
   - `NOWAI_PIN`: `1234` (or your chosen PIN)
5. Click **Deploy**. Your NowAI Web Agent will be live in under 1 minute!

---

## 🧪 Running Verification Tests

Run the test suite against a running local or staging instance:

```bash
# Verify schema conversion and Gemini function declarations
npx tsx tests/agent-schema.test.mjs

# Verify authentication, route security, and tool discovery
npm run build
npm start
node tests/api-verification.mjs
```

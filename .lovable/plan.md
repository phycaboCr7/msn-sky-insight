# Weatherza Agent OS — Implementation Plan

A new full-screen "Agent OS" experience added inside Weatherza. The existing weather app stays untouched. Sign-in is required.

## Where it lives

- New route `/agent` (added to `App.tsx`) — opened from a new "Agent OS" launcher button on the home page.
- New folder `src/components/agent-os/` holds all UI.
- New edge function `supabase/functions/agent-os/index.ts` runs the agent loop server-side with the Vercel AI SDK + Lovable AI Gateway (Gemini).

## What the user sees

```text
┌────────────────────────────────────────────────────────────────┐
│  Weatherza Agent OS                              ● online      │
├──────────────┬─────────────────────────────┬───────────────────┤
│ Chat / Task  │   AI Computer (live)        │  Files / Tools    │
│              │                             │                   │
│ - prompt box │ - Thoughts stream           │ - Virtual FS tree │
│ - history    │ - Plan steps (checklist)    │ - Open file view  │
│ - status     │ - Tool-call cards           │ - Download btn    │
│              │ - xterm-styled terminal     │ - Tool palette    │
└──────────────┴─────────────────────────────┴───────────────────┘
```

Glassmorphism, indigo/orange theme, framer-motion transitions — matches existing site memory.

## Agent loop (server)

Edge function streams a Vercel AI SDK `streamText` call with `stopWhen: stepCountIs(50)`. Tools available to the model:


| Tool                  | Purpose                                                                                           | Backend                       |
| --------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| `think`               | Emits a visible reasoning step                                                                    | no-op, surfaces text          |
| `plan`                | Posts/updates a checklist of steps                                                                | structured output             |
| `web_search`          | Real search                                                                                       | Serper API (key already set)  |
| `web_scrape`          | Fetch + readability extract a URL                                                                 | edge fetch + simple HTML→text |
| `write_file`          | Create/overwrite virtual file                                                                     | Supabase `agent_files` table  |
| `read_file`           | Read virtual file                                                                                 | same table                    |
| `list_files`          | List user's virtual files                                                                         | same table                    |
| `run_python`          | **Client-executed** — server emits a `tool_request`, client runs in Pyodide and posts result back | round-trip                    |
| `make_pdf`            | **Client-executed** — jsPDF generates and saves to virtual FS                                     | round-trip                    |
| `remember` / `recall` | Long-term memory via embeddings                                                                   | `agent_memory` + pgvector     |
| `weather`             | Reuses existing weather edge function                                                             | internal call                 |


Stream parts (`message.parts`) are rendered as typed cards in the UI: `text`, `tool-think`, `tool-plan`, `tool-web_search`, etc., each with status (`input-streaming` → `output-available`).

## Visual terminal

`xterm.js` + `@xterm/addon-fit` mounted in the middle column. The agent loop pipes a formatted log line for every tool call (`$ web_search "rain in alwar"` then dimmed result summary). No real shell.

## Database

New migration:

- `agent_threads(id, user_id, title, created_at)`
- `agent_messages(id, thread_id, role, parts jsonb, created_at)` — stores AI SDK `UIMessage` parts
- `agent_files(id, user_id, thread_id, path, content, mime, updated_at)`
- `agent_memory(id, user_id, content, embedding vector(768), created_at)` — pgvector extension
- All with RLS scoped to `auth.uid()`.

## Tech additions

- `bun add ai @ai-sdk/openai-compatible @ai-sdk/react zod xterm @xterm/addon-fit jspdf`
- Edge function uses `npm:` imports.

## Sign-in gating

Agent route checks `supabase.auth.getSession()` on mount; if absent, shows a glass sign-in card (Google + email already configured in existing `authService`).

## What is NOT included (stack limits)

- No Next.js, no E2B, no Puppeteer, no real shell, no LangChain, no Monaco (kept lighter — code blocks use existing markdown highlighter). Terminal is visual-only by your choice. Browser preview shows scraped page text/screenshot link, not a live iframe automation.

## Step-by-step build order

1. DB migration (threads, messages, files, memory + pgvector + RLS).
2. Install deps.
3. Edge function `agent-os` with all server-side tools + streaming.
4. `src/components/agent-os/` scaffolding: `AgentShell`, `ChatPanel`, `ComputerPanel` (thoughts + plan + terminal), `FilesPanel`, `ToolCard`, `VirtualTerminal`.
5. Client-side tool bridge (Pyodide + PDF) that listens for `tool_request` parts and replies via a follow-up `useChat` send.
6. New `/agent` route + launcher button on Index page.
7. Auth gate.
8. Polish: framer-motion, glass theme, mobile fallback (stacked columns).
9. Verify build, smoke-test the loop with a "search news about delhi rain and save a PDF report" prompt.  
  
  
  
DO NOT UD LOVABL:E AI JUST UDE THIS GEMINI API KEY = AIzaSyBVubk0slkgP4OptnBoN6fc5UzEoRQCBAU
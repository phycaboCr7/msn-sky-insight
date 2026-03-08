

## Plan: Editable Code Blocks + Fix AI Response Completion

### Problem 1: Code blocks are read-only
The `CodeBlock` component renders code as a static `<pre><code>` element (line 298-300). Users cannot edit the code before running it.

### Problem 2: AI responses getting cut off
The `weatherza-chat` edge function has issues:
- For non-weather modes, the Lovable AI Gateway streams but if it fails, Gemini fallback uses non-streaming `generateContent` with a reasonable token limit — but the **Groq final fallback** has `max_tokens: 8192` which may be too low for code responses
- The stream watchdog timeout logs "no data for 8s" but actually waits 30s — this is fine
- The real issue: when Lovable AI Gateway returns a streaming response, if the model hits its limit or errors mid-stream, there's no retry logic. Also, the `finish_reason: "length"` (truncation) is never detected or handled

### Changes

**1. Make CodeBlock editable** (`src/components/WeatherzaAI.tsx`)
- Add a `useState` for editable code content initialized from `children`
- Replace `<pre><code>` with a `<textarea>` styled like a code block (monospace, dark bg, same colors)
- The Run, Graph, and Copy buttons will use the edited code instead of `children`
- Add an "Edit" toggle or make it always editable

**2. Fix AI completion** (`supabase/functions/weatherza-chat/index.ts`)
- Increase Groq `max_tokens` from `8192` to `16384` for non-weather fallback
- For Lovable AI Gateway, increase implicit token handling — the current request doesn't specify `max_tokens`, so add `max_tokens: 16384`
- Detect `finish_reason: "length"` in the SSE stream parser on the client side and show a "(response truncated)" indicator so users know it was cut off rather than thinking it errored

### Files to modify
1. `src/components/WeatherzaAI.tsx` — CodeBlock component: add editable textarea state, wire Run/Copy/Graph to use edited code
2. `supabase/functions/weatherza-chat/index.ts` — increase max_tokens across all model calls


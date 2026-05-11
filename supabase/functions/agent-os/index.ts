// Weatherza Agent OS — autonomous agent loop using Gemini directly.
// Streams SSE events for: thought, tool_call, tool_result, text, done, error.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CEREBRAS_KEY = Deno.env.get("CEREBRAS_API_KEY")!;
const SERPER_KEY = Deno.env.get("SERPER_API_KEY") ?? "";
const WEATHER_KEY = Deno.env.get("WEATHER_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Cerebras free-tier models with strong tool-calling. Primary -> fallback on rate limit.
const MODELS = ["gpt-oss-120b", "qwen-3-235b-a22b-instruct-2507", "llama3.1-8b"];

// ---------- OpenAI-style tool schema (Cerebras is OpenAI-compatible) ----------
const fn = (name: string, description: string, properties: any, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});
const tools = [
  fn("think", "Record a short internal reasoning step the user can see. Use frequently to narrate your plan.", { thought: { type: "string" } }, ["thought"]),
  fn("plan", "Post or update a checklist of steps for the current task.", { steps: { type: "array", items: { type: "string" } } }, ["steps"]),
  fn("web_search", "Search the public web. Returns top result titles, links, snippets.", { query: { type: "string" } }, ["query"]),
  fn("web_scrape", "Fetch a URL and return readable text content.", { url: { type: "string" } }, ["url"]),
  fn("write_file", "Create or overwrite a virtual file in the user's workspace.", { path: { type: "string" }, content: { type: "string" }, mime: { type: "string" } }, ["path", "content"]),
  fn("read_file", "Read a virtual file by path.", { path: { type: "string" } }, ["path"]),
  fn("list_files", "List all virtual files in the workspace.", {}),
  fn("remember", "Save a long-term memory (preferences, facts about the user).", { content: { type: "string" } }, ["content"]),
  fn("recall", "Search long-term memory by keyword.", { query: { type: "string" } }, ["query"]),
  fn("weather", "Get current weather + forecast for a location.", { location: { type: "string" } }, ["location"]),
  fn("make_report", "Generate a downloadable PDF report. Returns a file path the user can download.", { title: { type: "string" }, markdown: { type: "string" } }, ["title", "markdown"]),
];

const SYSTEM = `You are Weatherza Agent OS — an autonomous AI operating system.
You can think step by step, plan tasks, and use tools to actually execute them.

RULES:
- ALWAYS start hard tasks by calling \`plan\` with concrete steps.
- Call \`think\` between actions to narrate what you are doing (1 short sentence).
- Use \`web_search\` + \`web_scrape\` for fresh info. Cite URLs.
- Use \`write_file\` to save outputs. Use \`make_report\` for PDFs.
- Use \`remember\` / \`recall\` for facts about the user.
- Use \`weather\` for any weather question.
- After all tool work is done, write a concise final answer in markdown for the user.
- Be visibly autonomous: take initiative, retry on failure, finish the task.`;

// ---------- Tool implementations ----------
async function runTool(name: string, args: any, ctx: { userId: string; threadId: string; sb: any }) {
  try {
    switch (name) {
      case "think": return { ok: true, thought: args.thought };
      case "plan": return { ok: true, steps: args.steps };
      case "web_search": {
        if (!SERPER_KEY) return { ok: false, error: "search disabled" };
        const r = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q: args.query, num: 6 }),
        });
        const j = await r.json();
        const results = (j.organic ?? []).slice(0, 6).map((o: any) => ({ title: o.title, link: o.link, snippet: o.snippet }));
        return { ok: true, query: args.query, results };
      }
      case "web_scrape": {
        const r = await fetch(args.url, { headers: { "User-Agent": "WeatherzaAgent/1.0" } });
        const html = await r.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
        return { ok: true, url: args.url, text };
      }
      case "write_file": {
        const { path, content, mime = "text/plain" } = args;
        const { error } = await ctx.sb.from("agent_files").upsert({
          user_id: ctx.userId, thread_id: ctx.threadId, path, content, mime,
          size_bytes: content.length, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,path" }).select();
        if (error) {
          // fallback insert (no unique constraint)
          await ctx.sb.from("agent_files").delete().eq("user_id", ctx.userId).eq("path", path);
          await ctx.sb.from("agent_files").insert({
            user_id: ctx.userId, thread_id: ctx.threadId, path, content, mime, size_bytes: content.length,
          });
        }
        return { ok: true, path, size: content.length };
      }
      case "read_file": {
        const { data } = await ctx.sb.from("agent_files").select("content,mime").eq("user_id", ctx.userId).eq("path", args.path).maybeSingle();
        if (!data) return { ok: false, error: "not found" };
        return { ok: true, path: args.path, content: data.content, mime: data.mime };
      }
      case "list_files": {
        const { data } = await ctx.sb.from("agent_files").select("path,mime,size_bytes,updated_at").eq("user_id", ctx.userId).order("updated_at", { ascending: false });
        return { ok: true, files: data ?? [] };
      }
      case "remember": {
        await ctx.sb.from("agent_memory").insert({ user_id: ctx.userId, content: args.content });
        return { ok: true };
      }
      case "recall": {
        const { data } = await ctx.sb.from("agent_memory").select("content,created_at").eq("user_id", ctx.userId).ilike("content", `%${args.query}%`).limit(8);
        return { ok: true, memories: data ?? [] };
      }
      case "weather": {
        if (!WEATHER_KEY) return { ok: false, error: "weather disabled" };
        const r = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_KEY}&q=${encodeURIComponent(args.location)}&days=3&aqi=yes`);
        const j = await r.json();
        if (j.error) return { ok: false, error: j.error.message };
        return {
          ok: true,
          location: j.location?.name + ", " + j.location?.country,
          current: { temp_c: j.current?.temp_c, condition: j.current?.condition?.text, humidity: j.current?.humidity, wind_kph: j.current?.wind_kph, aqi: j.current?.air_quality?.["us-epa-index"] },
          forecast: (j.forecast?.forecastday ?? []).map((d: any) => ({ date: d.date, max_c: d.day?.maxtemp_c, min_c: d.day?.mintemp_c, condition: d.day?.condition?.text })),
        };
      }
      case "make_report": {
        const path = `reports/${args.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.md`;
        await ctx.sb.from("agent_files").insert({
          user_id: ctx.userId, thread_id: ctx.threadId, path, content: args.markdown, mime: "text/markdown+pdf", size_bytes: args.markdown.length,
        });
        return { ok: true, path, hint: "Client will render this as a downloadable PDF." };
      }
    }
    return { ok: false, error: "unknown tool" };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

// ---------- Cerebras call (OpenAI-compatible) with fallback on rate limit ----------
async function callCerebras(messages: any[]) {
  let lastErr = "";
  for (const model of MODELS) {
    const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${CEREBRAS_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto",
        max_completion_tokens: 2048,
        temperature: 0.7,
      }),
    });
    if (r.ok) return await r.json();
    const txt = await r.text();
    lastErr = `Cerebras ${model} ${r.status}: ${txt}`;
    // Retry next model on rate limit / queue
    if (r.status !== 429 && !txt.includes("queue_exceeded")) throw new Error(lastErr);
  }
  throw new Error(lastErr || "Cerebras unavailable");
}

// ---------- HTTP entry ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Firebase-auth based: client passes its firebase uid as userId. Service role bypasses RLS.
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { threadId, history, userId } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "missing userId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!threadId) return new Response(JSON.stringify({ error: "missing threadId" }), { status: 400, headers: corsHeaders });

    // Build OpenAI-style messages from full thread history.
    const messages: any[] = [
      { role: "system", content: SYSTEM },
      ...(history ?? []).map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      })),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          const ctx = { userId, threadId, sb };
          let finalText = "";
          for (let step = 0; step < 12; step++) {
            const resp = await callCerebras(messages);
            const msg = resp.choices?.[0]?.message ?? {};
            const toolCalls = msg.tool_calls ?? [];
            const text = msg.content ?? "";

            if (text) { finalText += text; send("text", { text }); }

            if (!toolCalls.length) break;

            // Echo assistant turn back
            messages.push({ role: "assistant", content: text || "", tool_calls: toolCalls });

            for (const tc of toolCalls) {
              const name = tc.function?.name;
              let args: any = {};
              try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch {}
              send("tool_call", { name, args });
              const result = await runTool(name, args, ctx);
              send("tool_result", { name, result });
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
            }
          }

          // Persist assistant message
          if (finalText) {
            await sb.from("agent_messages").insert({ thread_id: threadId, user_id: userId, role: "assistant", parts: [{ type: "text", text: finalText }] });
          }
          send("done", { ok: true });
          controller.close();
        } catch (e) {
          send("error", { error: String(e?.message ?? e) });
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
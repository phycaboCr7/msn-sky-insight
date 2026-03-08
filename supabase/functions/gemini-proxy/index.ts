import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Invalid prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isJson = type === "json";
    const temperature = isJson ? 0.7 : 0.6;
    const maxTokens = isJson ? 1024 : 512;

    // ─── 1. Lovable AI Gateway (primary) ───
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      try {
        console.log("gemini-proxy: trying Lovable AI Gateway");
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content || "";
          if (text) {
            console.log("gemini-proxy: Lovable AI success");
            return new Response(JSON.stringify({ text }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.warn(`gemini-proxy: Lovable AI error ${resp.status}`);
        }
      } catch (e) {
        console.error("gemini-proxy: Lovable AI fetch error:", e);
      }
    }

    // ─── 2. Gemini Direct (fallback) ───
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (GEMINI_API_KEY) {
      const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
      for (const model of models) {
        try {
          console.log(`gemini-proxy: trying Gemini ${model}`);
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature, topK: 40, topP: 0.95, maxOutputTokens: maxTokens },
              }),
            }
          );

          if (resp.ok) {
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              console.log(`gemini-proxy: Gemini ${model} success`);
              return new Response(JSON.stringify({ text }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } else {
            console.warn(`gemini-proxy: Gemini ${model} error ${resp.status}`);
          }
        } catch (e) {
          console.error(`gemini-proxy: Gemini ${model} error:`, e);
        }
      }
    }

    // ─── 3. Groq (last resort) ───
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (GROQ_API_KEY) {
      try {
        console.log("gemini-proxy: trying Groq fallback");
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data.choices?.[0]?.message?.content || "";
          if (text) {
            console.log("gemini-proxy: Groq success");
            return new Response(JSON.stringify({ text }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.warn(`gemini-proxy: Groq error ${resp.status}`);
        }
      } catch (e) {
        console.error("gemini-proxy: Groq error:", e);
      }
    }

    return new Response(JSON.stringify({ error: "All AI models failed. Please try again." }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

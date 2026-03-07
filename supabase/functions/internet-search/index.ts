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
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "No query provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    if (!SERPER_API_KEY) {
      throw new Error("SERPER_API_KEY is not configured");
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract relevant pieces
    const results: any = {};

    if (data.answerBox) {
      results.answerBox = {
        title: data.answerBox.title,
        answer: data.answerBox.answer || data.answerBox.snippet,
      };
    }

    if (data.knowledgeGraph) {
      results.knowledgeGraph = {
        title: data.knowledgeGraph.title,
        type: data.knowledgeGraph.type,
        description: data.knowledgeGraph.description,
      };
    }

    if (data.organic && data.organic.length > 0) {
      results.organic = data.organic.slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link,
      }));
    }

    if (data.news && data.news.length > 0) {
      results.news = data.news.slice(0, 3).map((n: any) => ({
        title: n.title,
        snippet: n.snippet,
        source: n.source,
        date: n.date,
      }));
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("internet-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const formData = await req.formData();
    const audioFile = formData.get("file");
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error("No audio file provided");
    }

    console.log("Transcribing audio:", audioFile.name, audioFile.size, "bytes");

    // Forward to Groq Whisper API
    const groqForm = new FormData();
    groqForm.append("file", audioFile, audioFile.name);
    groqForm.append("model", "whisper-large-v3");
    groqForm.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq Whisper error:", response.status, errorText);
      throw new Error(`Groq Whisper API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Transcription result:", data.text?.substring(0, 100));

    return new Response(JSON.stringify({ text: data.text || "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("transcribe-audio error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

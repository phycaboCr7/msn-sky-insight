import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    // Call AI
    const aiRes = await fetch(
      "https://api.openrouter.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [{ role: "user", content: prompt }],
          stream: false,
        }),
      }
    );

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI error: ${t}`);
    }

    const data = await aiRes.json();
    res.status(200).json(data);
  } catch (e) {
    console.error("Vercel API Error:", e);
    res.status(500).json({ error: "AI service unavailable" });
  }
}

console.log("PLAN.JS NEW VERSION RUNNING");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("PLAN API START");
    console.log("GEMINI KEY EXISTS:", !!apiKey);

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel"
      });
    }

    const {
      destination,
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    if (!destination || !days || !budget) {
      return res.status(400).json({
        error: "Missing trip information"
      });
    }

    const prompt = `
You are an expert AI travel planner.

Create a personalized travel plan.

Destination: ${destination}
Start date: ${start || "Not specified"}
Number of days: ${days}
Total budget: $${budget} USD
Travelers: ${travelers || 1}
Interests: ${
      Array.isArray(interests) && interests.length
        ? interests.join(", ")
        : "General sightseeing"
    }
Additional notes: ${notes || "None"}

Return ONLY valid JSON.

Use exactly this structure:

{
  "overview": "Short personalized trip overview",
  "stay": {
    "strategy": "Accommodation strategy",
    "areas": ["Area 1", "Area 2", "Area 3"],
    "tips": ["Tip 1", "Tip 2", "Tip 3"]
  },
  "transport": {
    "strategy": "Transportation strategy",
    "airport": "Airport transportation recommendation",
    "local": ["Local option 1", "Local option 2", "Local option 3"]
  },
  "experiences": {
    "summary": "Short description",
    "places": ["Place 1", "Place 2", "Place 3", "Place 4", "Place 5"],
    "food": ["Food experience 1", "Food experience 2", "Food experience 3"]
  },
  "budget": {
    "accommodation": 0,
    "transportation": 0,
    "food": 0,
    "activities": 0,
    "other": 0,
    "total": 0,
    "strategy": "Budget strategy"
  },
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "morning": "Morning plan",
      "afternoon": "Afternoon plan",
      "evening": "Evening plan"
    }
  ]
}

Rules:

- Create exactly ${days} day objects.
- Budget values must be numbers.
- Budget total must not exceed $${budget}.
- Make the itinerary realistic.
- Consider the user's interests.
- Do not claim live availability.
- Do not invent exact current prices.
- Treat prices as estimates.
- Return JSON only.
`;

    console.log("CALLING GEMINI...");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json"
          }
        })
      }
    );

    console.log("GEMINI STATUS:", response.status);

    const data = await response.json();

    console.log("GEMINI RESPONSE:", data);

    if (!response.ok) {
      return res.status(500).json({
        error: "Gemini request failed",
        gemini_status: response.status,
        details: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .filter(Boolean)
        .join("") || "";

    console.log("GEMINI TEXT EXISTS:", !!text);

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned no text"
      });
    }

    let cleanText = text.trim();

    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(
        firstBrace,
        lastBrace + 1
      );
    }

    let plan;

    try {
      plan = JSON.parse(cleanText);
    } catch (error) {
      console.error("JSON PARSE ERROR:", error);
      console.error("INVALID GEMINI TEXT:", cleanText);

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        details: error.message
      });
    }

    console.log("PLAN CREATED SUCCESSFULLY");

    return res.status(200).json({
      plan
    });

  } catch (error) {
    console.error("SERVER ERROR:", error);

    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
          }

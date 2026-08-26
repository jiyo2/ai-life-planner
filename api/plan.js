console.log("PLAN.JS NEW VERSION RUNNING");

export default async function handler(req, res) {
  console.log("PLAN API START");

  // ================================
  // METHOD CHECK
  // ================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // ================================
    // API KEY
    // ================================

    const apiKey = process.env.GEMINI_API_KEY;

    console.log("GEMINI KEY EXISTS:", Boolean(apiKey));

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel"
      });
    }

    // ================================
    // TRIP DATA
    // ================================

    const body = req.body || {};

    const destination = body.destination;
    const start = body.start || "Not specified";
    const days = Number(body.days);
    const budget = Number(body.budget);
    const travelers = body.travelers || "1 traveler";

    const interests = Array.isArray(body.interests)
      ? body.interests
      : [];

    const notes = body.notes || "";

    console.log("TRIP:", {
      destination,
      start,
      days,
      budget,
      travelers,
      interests
    });

    // ================================
    // VALIDATION
    // ================================

    if (!destination) {
      return res.status(400).json({
        error: "Destination is required"
      });
    }

    if (!Number.isFinite(days) || days < 1) {
      return res.status(400).json({
        error: "Invalid number of days"
      });
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({
        error: "Invalid budget"
      });
    }

    // ================================
    // PROMPT
    // ================================

    const prompt = `
You are AI Life Planner, a professional travel planning assistant.

Create a practical personalized travel plan.

TRIP INFORMATION

Destination: ${destination}
Start date: ${start}
Number of days: ${days}
Total budget: $${budget} USD
Travelers: ${travelers}
Interests: ${
      interests.length
        ? interests.join(", ")
        : "General sightseeing"
    }
Additional notes: ${notes || "None"}

IMPORTANT REQUIREMENTS

1. Create exactly ${days} itinerary days.
2. The total estimated budget must not exceed $${budget}.
3. Budget values must be numerical USD values.
4. Prices are estimates only.
5. Do not claim live availability.
6. Do not invent exact current prices.
7. Make the itinerary realistic for ${destination}.
8. Consider the traveler's interests.
9. Keep the recommendations useful and practical.
10. Return ONLY valid JSON.
11. Do not use Markdown.
12. Do not use code fences.

RETURN EXACTLY THIS JSON STRUCTURE:

{
  "overview": "A short personalized overview of the trip.",

  "stay": {
    "strategy": "Recommended accommodation strategy.",
    "areas": [
      "Recommended area 1",
      "Recommended area 2",
      "Recommended area 3"
    ],
    "tips": [
      "Accommodation tip 1",
      "Accommodation tip 2",
      "Accommodation tip 3"
    ]
  },

  "transport": {
    "strategy": "Recommended transportation strategy.",
    "airport": "Recommended airport transfer strategy.",
    "local": [
      "Local transportation option 1",
      "Local transportation option 2",
      "Local transportation option 3"
    ]
  },

  "experiences": {
    "summary": "Short description of the recommended experiences.",
    "places": [
      "Attraction 1",
      "Attraction 2",
      "Attraction 3",
      "Attraction 4",
      "Attraction 5"
    ],
    "food": [
      "Food experience 1",
      "Food experience 2",
      "Food experience 3"
    ]
  },

  "budget": {
    "accommodation": 0,
    "transportation": 0,
    "food": 0,
    "activities": 0,
    "other": 0,
    "total": 0,
    "strategy": "Explain how to stay within the user's budget."
  },

  "days": [
    {
      "day": 1,
      "title": "Day title",
      "morning": "Morning activities.",
      "afternoon": "Afternoon activities.",
      "evening": "Evening activities."
    }
  ]
}

FINAL CHECK:

- Exactly ${days} objects inside "days".
- "day" must be a number.
- All budget fields must be numbers.
- "total" must not exceed ${budget}.
- Return JSON only.
`;

    console.log("CALLING GEMINI...");

    // ================================
    // GEMINI REQUEST
    // ================================

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    const response = await fetch(geminiURL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
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
    });

    console.log(
      "GEMINI STATUS:",
      response.status
    );

    // ================================
    // READ GEMINI RESPONSE
    // ================================

    const data = await response.json();

    console.log(
      "GEMINI RESPONSE:",
      JSON.stringify(data)
    );

    // ================================
    // GEMINI ERROR
    // ================================

    if (!response.ok) {
      return res.status(500).json({
        error: "Gemini request failed",
        geminiStatus: response.status,
        details: data
      });
    }

    // ================================
    // EXTRACT TEXT
    // ================================

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    const text = parts
      .map((part) => part?.text || "")
      .filter(Boolean)
      .join("");

    console.log(
      "GEMINI TEXT EXISTS:",
      Boolean(text)
    );

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned no text",
        raw: data
      });
    }

    // ================================
    // CLEAN JSON
    // ================================

    let cleanText = text.trim();

    // Remove accidental Markdown fences

    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    // Find JSON object

    const firstBrace =
      cleanText.indexOf("{");

    const lastBrace =
      cleanText.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1 ||
      lastBrace <= firstBrace
    ) {
      console.error(
        "NO JSON OBJECT FOUND:",
        cleanText
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        text: cleanText
      });
    }

    cleanText = cleanText.substring(
      firstBrace,
      lastBrace + 1
    );

    // ================================
    // PARSE JSON
    // ================================

    let plan;

    try {
      plan = JSON.parse(cleanText);
    } catch (parseError) {
      console.error(
        "JSON PARSE ERROR:",
        parseError
      );

      console.error(
        "INVALID JSON:",
        cleanText
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        details: parseError.message
      });
    }

    // ================================
    // BASIC PLAN VALIDATION
    // ================================

    if (
      !plan ||
      typeof plan !== "object"
    ) {
      return res.status(500).json({
        error: "Invalid plan object"
      });
    }

    if (!plan.overview) {
      plan.overview =
        `Your personalized trip plan for ${destination}.`;
    }

    if (!plan.stay) {
      plan.stay = {
        strategy: "",
        areas: [],
        tips: []
      };
    }

    if (!plan.transport) {
      plan.transport = {
        strategy: "",
        airport: "",
        local: []
      };
    }

    if (!plan.experiences) {
      plan.experiences = {
        summary: "",
        places: [],
        food: []
      };
    }

    if (!plan.budget) {
      plan.budget = {
        accommodation: 0,
        transportation: 0,
        food: 0,
        activities: 0,
        other: 0,
        total: 0,
        strategy: ""
      };
    }

    if (!Array.isArray(plan.days)) {
      plan.days = [];
    }

    // ================================
    // SUCCESS
    // ================================

    console.log(
      "PLAN CREATED SUCCESSFULLY"
    );

    console.log(
      "DAYS RETURNED:",
      plan.days.length
    );

    return res.status(200).json({
      plan
    });

  } catch (error) {

    // ================================
    // SERVER ERROR
    // ================================

    console.error(
      "SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error: "Server error",
      message: error?.message || "Unknown error"
    });
  }
  }

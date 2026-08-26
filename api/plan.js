export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

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

    const numberOfDays = Number(days);
    const totalBudget = Number(budget);

    const prompt = `
You are an expert AI travel planner.

Create a personalized travel plan for this trip.

Destination: ${destination}
Start date: ${start || "Not specified"}
Number of days: ${numberOfDays}
Total budget: $${totalBudget} USD
Travelers: ${travelers || "1 traveler"}
Interests: ${
      Array.isArray(interests) && interests.length
        ? interests.join(", ")
        : "General sightseeing"
    }
Additional notes: ${notes || "None"}

IMPORTANT:

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT write any explanation before or after the JSON.

The JSON must use EXACTLY this structure:

{
  "overview": "Short personalized overview of the trip",

  "stay": {
    "strategy": "Practical accommodation strategy",
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
    "strategy": "Practical transportation strategy",
    "airport": "Airport arrival and departure transportation recommendation",
    "local": [
      "Local transportation option 1",
      "Local transportation option 2",
      "Local transportation option 3"
    ]
  },

  "experiences": {
    "summary": "Short description of the recommended experiences",
    "places": [
      "Attraction or place 1",
      "Attraction or place 2",
      "Attraction or place 3",
      "Attraction or place 4",
      "Attraction or place 5"
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
    "strategy": "Practical strategy for staying within the user's budget"
  },

  "days": [
    {
      "day": 1,
      "title": "Day title",
      "morning": "Morning activities",
      "afternoon": "Afternoon activities",
      "evening": "Evening activities"
    }
  ]
}

STRICT RULES:

1. Create EXACTLY ${numberOfDays} objects inside the "days" array.

2. The first day must have:
"day": 1

3. The last day must have:
"day": ${numberOfDays}

4. Every day must contain:
- day
- title
- morning
- afternoon
- evening

5. Budget fields must contain numbers only.

6. The sum of:
accommodation
+ transportation
+ food
+ activities
+ other

must equal the "total".

7. The "total" MUST NOT exceed $${totalBudget}.

8. Use realistic estimated costs.

9. Do not claim live hotel availability.

10. Do not claim live flight availability.

11. Do not invent exact current prices.

12. Prices are estimates only.

13. Make the itinerary practical and geographically sensible.

14. Consider the user's interests.

15. Keep the plan useful and specific rather than generic.

16. The response MUST be valid JSON that can be parsed directly using JSON.parse().
`;

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

    const data = await response.json();

    console.log("GEMINI STATUS:", response.status);
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

    if (!text) {
      console.error("EMPTY GEMINI RESPONSE:", data);

      return res.status(500).json({
        error: "Gemini returned no text"
      });
    }

    console.log("GEMINI TEXT:", text);

    let cleanText = text.trim();

    /* Remove accidental markdown fences if Gemini adds them */

    if (cleanText.startsWith("```")) {
      cleanText = cleanText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }

    /* Find JSON object if extra text was returned */

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
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError);
      console.error("TEXT RECEIVED FROM GEMINI:", cleanText);

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        message: parseError.message
      });
    }

    /* Basic validation */

    if (!plan.overview) {
      plan.overview = "Your personalized travel plan.";
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

    /* Make sure budget values are numbers */

    plan.budget.accommodation =
      Number(plan.budget.accommodation) || 0;

    plan.budget.transportation =
      Number(plan.budget.transportation) || 0;

    plan.budget.food =
      Number(plan.budget.food) || 0;

    plan.budget.activities =
      Number(plan.budget.activities) || 0;

    plan.budget.other =
      Number(plan.budget.other) || 0;

    plan.budget.total =
      plan.budget.accommodation +
      plan.budget.transportation +
      plan.budget.food +
      plan.budget.activities +
      plan.budget.other;

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

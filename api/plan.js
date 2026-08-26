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

    const prompt = `
You are an expert AI travel planner.

Create a personalized travel plan for the user.

Destination: ${destination}
Start date: ${start || "Not specified"}
Number of days: ${days}
Budget: $${budget} USD
Travelers: ${travelers || 1}
Interests: ${
      Array.isArray(interests) && interests.length
        ? interests.join(", ")
        : "General sightseeing"
    }
Additional notes: ${notes || "None"}

Create:
1. Trip overview
2. Accommodation strategy
3. Transportation strategy
4. Food recommendations
5. Activities and attractions
6. Day-by-day itinerary
7. Budget breakdown

Important:
- Respect the user's total budget.
- Keep recommendations practical.
- Do not claim live availability.
- Do not invent exact current prices.
- Clearly explain that prices are estimates when necessary.
- Make the itinerary useful and realistic.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
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
          ]
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

    const plan =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .filter(Boolean)
        .join("\n") || "";

    if (!plan) {
      return res.status(500).json({
        error: "Gemini returned no text",
        details: data
      });
    }

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

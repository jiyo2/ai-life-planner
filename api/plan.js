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

Create a personalized travel plan based on the user's information.

TRIP DETAILS:
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

Create a useful and realistic travel plan containing:

1. TRIP OVERVIEW
Give a short overview of the trip and the recommended travel style.

2. STAY
Recommend the best accommodation strategy for this budget.
Mention suitable areas or neighborhoods.
Do not claim that a specific hotel has availability.

3. GETTING AROUND
Explain the best transportation strategy.
Include airport/local transportation when relevant.

4. EXPERIENCES
Recommend attractions, activities, food experiences and things worth doing.

5. DAY-BY-DAY ITINERARY
Create a practical itinerary for every day of the trip.
Organize morning, afternoon and evening.

6. BUDGET STRATEGY
Break the total budget into:
- Accommodation
- Transportation
- Food
- Activities
- Other/Buffer

Make sure the estimated categories stay within the user's total budget.

IMPORTANT RULES:
- Do not claim live availability.
- Do not invent exact current prices.
- Prices should be described as estimates.
- Do not pretend that you have live booking access.
- Prioritize practical recommendations.
- Respect the user's total budget.
- Make the plan easy to read.
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

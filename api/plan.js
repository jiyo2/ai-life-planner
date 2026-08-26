export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing"
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

Respect the total budget.
Keep recommendations practical.
Do not claim live availability.
Do not invent exact current prices.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OPENAI ERROR:", data);

      return res.status(response.status).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    let plan = data.output_text || "";

    if (!plan && Array.isArray(data.output)) {
      plan = data.output
        .flatMap((item) => item.content || [])
        .map((item) => item.text || "")
        .filter(Boolean)
        .join("\n");
    }

    if (!plan) {
      return res.status(500).json({
        error: "OpenAI returned no text",
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing");

      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured"
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

Create a personalized travel plan using these details:

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

Create a useful, realistic travel plan containing:

1. Trip overview
2. Accommodation strategy
3. Transportation strategy
4. Food recommendations
5. Activities and attractions
6. Day-by-day itinerary
7. Budget breakdown

Rules:
- Respect the total budget.
- Make the itinerary practical.
- Do not claim live availability.
- Do not invent exact current prices.
- Keep the response easy to read.
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

    console.log("OpenAI status:", response.status);

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(500).json({
        error: "OpenAI request failed",
        openai_error: data.error || data
      });
    }

    const plan =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output
            .flatMap((item) => item.content || [])
            .map((item) => item.text || "")
            .filter(Boolean)
            .join("\n")
        : "");

    if (!plan) {
      return res.status(500).json({
        error: "OpenAI returned an empty plan"
      });
    }

    return res.status(200).json({
      plan
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Server error",
      message: error.message
    });
  }
      }

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
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

Create a practical personalized travel plan using the following information:

Destination: ${destination}
Start date: ${start || "Not specified"}
Number of days: ${days}
Budget: $${budget} USD
Travelers: ${travelers || 1}
Interests: ${(interests || []).join(", ") || "General sightseeing"}
Additional notes: ${notes || "None"}

Create:
1. A short trip overview.
2. Accommodation strategy.
3. Transportation strategy.
4. Food recommendations.
5. Activities and attractions.
6. A day-by-day itinerary.
7. A realistic budget breakdown.

Important:
- Respect the user's total budget.
- Keep recommendations practical.
- Do not invent live prices or claim real-time availability.
- Make the plan easy to read.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(500).json({
        error: "OpenAI request failed",
        details: data
      });
    }

    return res.status(200).json({
      plan: data.output_text || "No plan was generated."
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}

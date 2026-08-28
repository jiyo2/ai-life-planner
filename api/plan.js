const axios = require("axios");

module.exports = async (req, res) => {
  // =========================================================
  // CORS
  // =========================================================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // =========================================================
    // INPUT
    // =========================================================
    const {
      destination,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    // =========================================================
    // GEMINI KEY CHECK
    // =========================================================
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");

      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    // =========================================================
    // VALIDATE INPUT
    // =========================================================
    if (!destination || !days || !budget || !travelers) {
      return res.status(400).json({
        error: "Missing required trip information."
      });
    }

    // =========================================================
    // CORRECT GEMINI API URL
    // =========================================================
    const GEMINI_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // =========================================================
    // PROMPT
    // =========================================================
    const prompt = `
You are an expert travel planner.

Create an optimized travel plan in English for:

Destination: ${destination}
Trip length: ${days} days
Maximum total budget: $${budget}
Travelers: ${travelers}
Interests: ${interests || "General sightseeing, food and local experiences"}
Special notes: ${notes || "None"}

IMPORTANT:

The user wants practical and realistic travel information.

For the STAY section:
- Suggest real hotel/accommodation options in or near ${destination}.
- Do NOT invent hotel names.
- Include the hotel's approximate star rating when known.
- Include useful room/property amenities when known.
- Include approximate nightly price in USD when reasonably known.
- If exact live pricing is unavailable, clearly label the price as an estimate.
- Do NOT fabricate live availability.
- Do NOT generate fake booking URLs.
- The frontend may create Booking.com search links separately.

For transport:
- Explain public transportation.
- Include approximate costs where useful.
- Mention taxi/ride-hailing options where appropriate.

For experiences:
- Recommend realistic attractions, activities and food experiences.
- Organize recommendations according to the trip length.

For money:
- Break down the estimated budget into accommodation, food, transport, activities and miscellaneous expenses.
- Make sure the categories approximately fit within the maximum budget.

For daysPlan:
- Create a practical day-by-day itinerary.
- Keep the itinerary realistic and avoid excessive activities in one day.

RETURN ONLY VALID JSON.
Do not use Markdown fences.
Do not add explanations before or after the JSON.

Use EXACTLY this structure:

{
  "stay": [
    {
      "name": "Hotel name",
      "stars": 4,
      "price": 120,
      "currency": "USD",
      "priceType": "estimated per night",
      "amenities": [
        "Free Wi-Fi",
        "Private Bathroom",
        "Air Conditioning",
        "Breakfast available"
      ],
      "description": "Short description of why this accommodation fits the traveler."
    }
  ],
  "transport": "HTML markup summarizing public transit, taxis and approximate transportation costs.",
  "experiences": "HTML markup with curated attractions, activities and local food experiences.",
  "money": "HTML breakdown explaining budget allocation and daily spending.",
  "daysPlan": "HTML markup detailing the day-by-day itinerary."
}

IMPORTANT JSON RULES:
- Return valid JSON only.
- No trailing commas.
- Do not put raw newline characters inside JSON strings.
- Escape quotation marks correctly.
`;

    // =========================================================
    // CALL GEMINI
    // =========================================================
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("Days:", days);
    console.log("Travelers:", travelers);

    const response = await axios.post(
      GEMINI_URL,
      {
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
      },
      {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // =========================================================
    // CHECK GEMINI RESPONSE
    // =========================================================
    if (
      !response.data ||
      !response.data.candidates ||
      !response.data.candidates[0]
    ) {
      console.error(
        "Gemini returned no candidates:",
        JSON.stringify(response.data)
      );

      throw new Error("Gemini returned no candidates.");
    }

    const candidate = response.data.candidates[0];

    if (
      !candidate.content ||
      !candidate.content.parts ||
      !candidate.content.parts[0] ||
      !candidate.content.parts[0].text
    ) {
      console.error(
        "Gemini candidate has no text:",
        JSON.stringify(candidate)
      );

      throw new Error("Gemini returned an empty response.");
    }

    // =========================================================
    // PARSE JSON
    // =========================================================
    let rawText = candidate.content.parts[0].text.trim();

    // Remove accidental markdown fences if Gemini adds them
    rawText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let travelData;

    try {
      travelData = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Gemini JSON Parse Error:");
      console.error(rawText);

      throw new Error(
        "Gemini returned invalid JSON: " + parseError.message
      );
    }

    // =========================================================
    // NORMALIZE STAY DATA
    // =========================================================
    if (!Array.isArray(travelData.stay)) {
      travelData.stay = [];
    }

    // =========================================================
    // RETURN SUCCESS
    // =========================================================
    console.log("PLAN API SUCCESS");

    return res.status(200).json(travelData);

  } catch (error) {
    // =========================================================
    // DETAILED ERROR LOGGING
    // =========================================================
    console.error("=================================");
    console.error("VERCEL BACKEND ERROR");
    console.error("Message:", error.message);

    if (error.response) {
      console.error("Gemini Status:", error.response.status);
      console.error(
        "Gemini Response:",
        JSON.stringify(error.response.data)
      );
    }

    console.error("=================================");

    // =========================================================
    // GEMINI API ERROR
    // =========================================================
    if (error.response) {
      const status = error.response.status;
      const geminiData = error.response.data;

      return res.status(500).json({
        error: "Gemini API request failed.",
        status,
        details:
          geminiData?.error?.message ||
          error.message
      });
    }

    // =========================================================
    // GENERAL ERROR
    // =========================================================
    return res.status(500).json({
      error: "Internal Server Error during plan generation.",
      details: error.message
    });
  }
};

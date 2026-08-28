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
      startDate,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    console.log("=================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("Days:", days);
    console.log("Budget:", budget);
    console.log("Travelers:", travelers);
    console.log("=================================");

    // =========================================================
    // GEMINI KEY
    // =========================================================
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");

      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    // =========================================================
    // VALIDATION
    // =========================================================
    if (!destination || !days || !budget || !travelers) {
      return res.status(400).json({
        error: "Missing required trip information."
      });
    }

    // =========================================================
    // GEMINI 3.6 FLASH
    // =========================================================
    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    // =========================================================
    // PROMPT
    // =========================================================
    const prompt = `
You are an expert travel planner.

Create a practical personalized travel plan in English.

TRIP INFORMATION

Destination: ${destination}
Start date: ${startDate || "Flexible"}
Trip length: ${days} days
Maximum budget: $${budget} USD
Travelers: ${travelers}
Interests: ${interests || "General sightseeing"}
Special notes: ${notes || "None"}

IMPORTANT:

Create useful, realistic travel recommendations.

STAY:

Recommend real accommodation options in or near ${destination}.

Do NOT invent hotels.

For every hotel provide:
- name
- stars
- approximate nightly price in USD
- price type
- amenities
- short description

If exact live pricing is unavailable, clearly say that the price is an estimate.

Never claim live availability unless it is actually known.

TRANSPORT:

Explain practical transportation options.

Include approximate prices when useful.

EXPERIENCES:

Recommend realistic attractions, activities, restaurants and local experiences.

BUDGET:

Divide the maximum budget between:
- accommodation
- food
- transportation
- activities
- miscellaneous

DAY PLAN:

Create a realistic itinerary for every day.

Do not overload a single day.

RETURN ONLY VALID JSON.

Use exactly this structure:

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
        "Air Conditioning",
        "Private Bathroom"
      ],
      "description": "Short description."
    }
  ],
  "transport": "<p>Transportation information</p>",
  "experiences": "<p>Experiences information</p>",
  "money": "<p>Budget information</p>",
  "daysPlan": "<p>Day-by-day itinerary</p>"
}

JSON RULES:

- Return JSON only.
- No Markdown.
- No code fences.
- No text before JSON.
- No text after JSON.
- No trailing commas.
`;

    // =========================================================
    // CALL GEMINI
    // =========================================================
    console.log("Calling Gemini 3.6 Flash...");

    const geminiResponse = await fetch(
      `${GEMINI_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
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
            responseMimeType: "application/json"
          }
        })
      }
    );

    // =========================================================
    // GEMINI HTTP ERROR
    // =========================================================
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      console.error("Gemini HTTP ERROR:");
      console.error("Status:", geminiResponse.status);
      console.error(errorText);

      return res.status(500).json({
        error: "Gemini API request failed.",
        status: geminiResponse.status,
        details: errorText
      });
    }

    // =========================================================
    // GEMINI JSON RESPONSE
    // =========================================================
    const geminiData = await geminiResponse.json();

    console.log("Gemini response received.");

    // =========================================================
    // CHECK RESPONSE
    // =========================================================
    const candidate = geminiData?.candidates?.[0];

    if (!candidate) {
      console.error(
        "No Gemini candidate:",
        JSON.stringify(geminiData)
      );

      return res.status(500).json({
        error: "Gemini returned no candidate.",
        details: geminiData
      });
    }

    const rawText =
      candidate?.content?.parts?.[0]?.text?.trim();

    if (!rawText) {
      console.error(
        "Gemini returned empty text:",
        JSON.stringify(candidate)
      );

      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    console.log("Gemini raw response length:", rawText.length);

    // =========================================================
    // CLEAN RESPONSE
    // =========================================================
    let cleanText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // =========================================================
    // PARSE JSON
    // =========================================================
    let travelData;

    try {
      travelData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON PARSE ERROR:");
      console.error(cleanText);

      return res.status(500).json({
        error: "Gemini returned invalid JSON.",
        details: parseError.message,
        raw: cleanText
      });
    }

    // =========================================================
    // NORMALIZE DATA
    // =========================================================

    if (!Array.isArray(travelData.stay)) {
      travelData.stay = [];
    }

    if (typeof travelData.transport !== "string") {
      travelData.transport =
        "<p>Transportation information unavailable.</p>";
    }

    if (typeof travelData.experiences !== "string") {
      travelData.experiences =
        "<p>Experience information unavailable.</p>";
    }

    if (typeof travelData.money !== "string") {
      travelData.money =
        "<p>Budget information unavailable.</p>";
    }

    if (typeof travelData.daysPlan !== "string") {
      travelData.daysPlan =
        "<p>Itinerary information unavailable.</p>";
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    console.log("=================================");
    console.log("PLAN API SUCCESS");
    console.log("Hotels:", travelData.stay.length);
    console.log("=================================");

    return res.status(200).json(travelData);

  } catch (error) {

    console.error("=================================");
    console.error("PLAN API CRITICAL ERROR");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("=================================");

    return res.status(500).json({
      error: "Internal Server Error during plan generation.",
      details: error.message
    });
  }
};

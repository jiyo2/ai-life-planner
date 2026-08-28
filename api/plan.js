export default async function handler(req, res) {
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
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    console.log("=================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("Start:", start);
    console.log("Days:", days);
    console.log("Budget:", budget);
    console.log("Travelers:", travelers);
    console.log("Interests:", interests);
    console.log("=================================");

    // =========================================================
    // GEMINI KEY
    // =========================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error(
        "GEMINI_API_KEY is missing"
      );

      return res.status(500).json({
        error:
          "Gemini API key is not configured."
      });
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    if (
      !destination ||
      !days ||
      !budget ||
      !travelers
    ) {
      return res.status(400).json({
        error:
          "Missing required trip information."
      });
    }

    // =========================================================
    // GEMINI URL
    // =========================================================

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      encodeURIComponent(
        GEMINI_API_KEY
      );

    // =========================================================
    // PROMPT
    // =========================================================

    const prompt = `
You are an expert travel planner.

Create a practical personalized travel plan.

Trip information:

Destination: ${destination}
Start date: ${start || "Flexible"}
Number of days: ${days}
Maximum budget: $${budget}
Travelers: ${travelers}
Interests: ${
      Array.isArray(interests)
        ? interests.join(", ")
        : interests || "General sightseeing"
    }
Notes: ${notes || "None"}

IMPORTANT:

Create realistic and useful travel information.

STAY:
- Recommend realistic accommodation options.
- Do not invent impossible hotels.
- If you are not certain about an exact hotel price, mark it as an estimate.
- Do not claim live availability.
- Do not create fake booking URLs.
- Include approximate stars where appropriate.
- Include amenities where appropriate.

TRANSPORT:
Explain practical transportation options and approximate costs.

EXPERIENCES:
Recommend realistic attractions, activities, food and local experiences.

BUDGET:
Create a realistic allocation for:
- accommodation
- transportation
- food
- activities
- miscellaneous

Keep the estimated total within the user's maximum budget when reasonably possible.

DAY-BY-DAY:
Create a practical itinerary for every day.
Do not overload each day.

RETURN ONLY VALID JSON.

Use exactly this structure:

{
  "overview": "Short overview of the trip.",
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
        "Air Conditioning"
      ],
      "description": "Short description."
    }
  ],
  "transport": "HTML markup describing transportation.",
  "experiences": "HTML markup describing experiences and restaurants.",
  "money": "HTML markup describing the budget strategy.",
  "daysPlan": "HTML markup containing the complete day-by-day itinerary."
}

JSON RULES:
- Valid JSON only.
- No Markdown.
- No code fences.
- No comments.
- No trailing commas.
- Escape quotation marks correctly.
`;

    // =========================================================
    // GEMINI REQUEST
    // =========================================================

    console.log(
      "Sending request to Gemini..."
    );

    const geminiResponse =
      await fetch(
        GEMINI_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
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
              responseMimeType:
                "application/json"
            }
          })
        }
      );

    console.log(
      "Gemini status:",
      geminiResponse.status
    );

    // =========================================================
    // READ GEMINI RESPONSE
    // =========================================================

    const geminiData =
      await geminiResponse.json();

    console.log(
      "Gemini response received."
    );

    if (!geminiResponse.ok) {

      console.error(
        "GEMINI API ERROR:",
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini API request failed.",
        status:
          geminiResponse.status,
        details:
          geminiData?.error?.message ||
          "Unknown Gemini API error."
      });
    }

    // =========================================================
    // CHECK CANDIDATE
    // =========================================================

    const candidate =
      geminiData?.candidates?.[0];

    if (!candidate) {

      console.error(
        "Gemini returned no candidate:",
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini returned no travel plan."
      });
    }

    const rawText =
      candidate?.content?.parts?.[0]?.text;

    if (!rawText) {

      console.error(
        "Gemini returned empty text:",
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response."
      });
    }

    console.log(
      "Gemini raw response length:",
      rawText.length
    );

    // =========================================================
    // CLEAN JSON
    // =========================================================

    let cleaned =
      rawText.trim();

    cleaned =
      cleaned
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();

    // =========================================================
    // PARSE JSON
    // =========================================================

    let travelData;

    try {

      travelData =
        JSON.parse(
          cleaned
        );

    } catch (parseError) {

      console.error(
        "JSON PARSE ERROR:",
        parseError.message
      );

      console.error(
        "RAW GEMINI TEXT:",
        cleaned
      );

      return res.status(500).json({
        error:
          "Gemini returned invalid JSON.",
        details:
          parseError.message
      });
    }

    // =========================================================
    // NORMALIZE DATA
    // =========================================================

    if (
      !travelData ||
      typeof travelData !== "object"
    ) {

      return res.status(500).json({
        error:
          "Invalid travel plan data."
      });
    }

    if (
      !Array.isArray(
        travelData.stay
      )
    ) {
      travelData.stay = [];
    }

    if (
      typeof travelData.transport !==
      "string"
    ) {
      travelData.transport =
        String(
          travelData.transport || ""
        );
    }

    if (
      typeof travelData.experiences !==
      "string"
    ) {
      travelData.experiences =
        String(
          travelData.experiences || ""
        );
    }

    if (
      typeof travelData.money !==
      "string"
    ) {
      travelData.money =
        String(
          travelData.money || ""
        );
    }

    if (
      typeof travelData.daysPlan !==
      "string"
    ) {
      travelData.daysPlan =
        String(
          travelData.daysPlan || ""
        );
    }

    // =========================================================
    // SUCCESS
    // =========================================================

    console.log(
      "================================="
    );

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "Stay options:",
      travelData.stay.length
    );

    console.log(
      "================================="
    );

    return res.status(200).json(
      travelData
    );

  } catch (error) {

    console.error(
      "================================="
    );

    console.error(
      "PLAN API CRITICAL ERROR"
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "================================="
    );

    return res.status(500).json({
      error:
        "Internal Server Error during plan generation.",
      details:
        error?.message ||
        "Unknown server error."
    });
  }
  }

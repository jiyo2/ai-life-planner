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
      startDate,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    // =========================================================
    // API KEY
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

    // =========================================================
    // PROMPT
    // =========================================================

    const prompt = `
You are an expert travel planning AI.

Create a premium, practical travel plan for:

Destination: ${destination}
Start date: ${startDate || "Flexible"}
Trip length: ${days} days
Maximum budget: $${budget}
Travelers: ${travelers}
Interests: ${interests || "General sightseeing"}
Special notes: ${notes || "None"}

=========================================================
HOTELS
=========================================================

The most important requirement:

RETURN AT LEAST 10 DIFFERENT REAL ACCOMMODATION OPTIONS
FOR ${destination}.

Prefer:
- Real hotels
- Real hostels
- Real boutique hotels
- Real serviced apartments

DO NOT invent accommodation names.

Every hotel must have:

name
stars
price
currency
priceType
amenities
description
bookingUrl
imageUrl

IMPORTANT:

bookingUrl:
- If you know a genuine official Booking.com hotel URL, provide it.
- Otherwise use a SEARCH URL for Booking.com for that hotel and destination.
- NEVER invent a fake hotel URL.

imageUrl:
- Only provide an image URL if you are reasonably confident it is a real publicly accessible image URL for that property.
- NEVER invent an image URL.
- If no reliable image URL is available, return an empty string "".

PRICE:
- Prices are estimates unless verified.
- NEVER claim live availability.
- Use realistic approximate USD nightly prices.
- price must be a NUMBER, not an object.
- currency must be "USD".
- priceType should normally be "estimated per night".

Do not add a "price note" section.
The frontend will handle pricing disclaimers if necessary.

=========================================================
TRANSPORT
=========================================================

Explain:

- Metro
- Bus
- Tram
- Ferry where applicable
- Taxi / ride-hailing
- Approximate costs
- Best option for this trip

Return HTML markup.

=========================================================
EXPERIENCES
=========================================================

Recommend realistic:

- Attractions
- Activities
- Restaurants
- Local food
- Shopping
- Nightlife
- Cultural experiences

Return HTML markup.

=========================================================
BUDGET
=========================================================

Create a realistic allocation for the maximum budget.

Include:

Accommodation
Food
Transportation
Activities
Miscellaneous

Return HTML markup.

=========================================================
DAY BY DAY
=========================================================

Create a realistic itinerary for ${days} days.

Avoid overcrowding each day.

Return HTML markup.

=========================================================
OUTPUT
=========================================================

RETURN ONLY VALID JSON.

No Markdown.
No code fences.
No explanation before or after JSON.

Use EXACTLY:

{
  "stay": [
    {
      "name": "Real hotel name",
      "stars": 4,
      "price": 80,
      "currency": "USD",
      "priceType": "estimated per night",
      "amenities": [
        "Free Wi-Fi",
        "Air Conditioning",
        "Private Bathroom",
        "Breakfast Available"
      ],
      "description": "Short useful description.",
      "bookingUrl": "https://www.booking.com/...",
      "imageUrl": ""
    }
  ],
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}

FINAL HOTEL REQUIREMENTS:

- Minimum 10 hotels.
- Maximum 12 hotels.
- All hotel names must be different.
- Do not repeat the same property.
- Do not invent hotels.
- Do not fabricate live availability.
- Do not fabricate image URLs.
- Do not fabricate hotel booking URLs.
- If an image is unavailable, use "".
- If an exact Booking.com hotel URL is unavailable, use a Booking.com SEARCH URL for that hotel.
- Keep hotel descriptions short.
`;

    // =========================================================
    // GEMINI REQUEST
    // =========================================================

    console.log("=================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("Days:", days);
    console.log("Budget:", budget);
    console.log("Travelers:", travelers);
    console.log("=================================");

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
          responseMimeType: "application/json"
        }
      },
      {
        timeout: 120000,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    // =========================================================
    // CHECK RESPONSE
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
        "Gemini returned empty content:",
        JSON.stringify(candidate)
      );

      throw new Error("Gemini returned an empty response.");
    }

    // =========================================================
    // PARSE JSON
    // =========================================================

    let rawText = candidate.content.parts[0].text.trim();

    rawText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let travelData;

    try {
      travelData = JSON.parse(rawText);
    } catch (parseError) {
      console.error("JSON PARSE ERROR");
      console.error(rawText);

      throw new Error(
        "Gemini returned invalid JSON: " + parseError.message
      );
    }

    // =========================================================
    // NORMALIZE HOTEL DATA
    // =========================================================

    if (!Array.isArray(travelData.stay)) {
      travelData.stay = [];
    }

    travelData.stay = travelData.stay
      .filter(hotel => hotel && hotel.name)
      .map(hotel => ({
        name: String(hotel.name).trim(),

        stars:
          Number.isFinite(Number(hotel.stars))
            ? Number(hotel.stars)
            : 0,

        price:
          Number.isFinite(Number(hotel.price))
            ? Number(hotel.price)
            : null,

        currency: "USD",

        priceType:
          hotel.priceType ||
          "estimated per night",

        amenities:
          Array.isArray(hotel.amenities)
            ? hotel.amenities
                .filter(Boolean)
                .map(String)
                .slice(0, 6)
            : [],

        description:
          hotel.description
            ? String(hotel.description)
            : "",

        bookingUrl:
          hotel.bookingUrl
            ? String(hotel.bookingUrl)
            : "",

        imageUrl:
          hotel.imageUrl
            ? String(hotel.imageUrl)
            : ""
      }));

    // Remove duplicate hotel names
    const seenHotels = new Set();

    travelData.stay = travelData.stay.filter(hotel => {
      const key = hotel.name.toLowerCase();

      if (seenHotels.has(key)) {
        return false;
      }

      seenHotels.add(key);
      return true;
    });

    // =========================================================
    // FALLBACK CONTENT
    // =========================================================

    travelData.transport =
      travelData.transport ||
      "<p>Transportation information could not be generated.</p>";

    travelData.experiences =
      travelData.experiences ||
      "<p>Experience recommendations could not be generated.</p>";

    travelData.money =
      travelData.money ||
      "<p>Budget information could not be generated.</p>";

    travelData.daysPlan =
      travelData.daysPlan ||
      "<p>Daily itinerary could not be generated.</p>";

    // =========================================================
    // LOG
    // =========================================================

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    console.log("PLAN API SUCCESS");

    // =========================================================
    // SUCCESS
    // =========================================================

    return res.status(200).json(travelData);

  } catch (error) {

    console.error("=================================");
    console.error("VERCEL BACKEND ERROR");
    console.error("Message:", error.message);

    if (error.response) {
      console.error(
        "Gemini Status:",
        error.response.status
      );

      console.error(
        "Gemini Response:",
        JSON.stringify(error.response.data)
      );
    }

    console.error("=================================");

    if (error.response) {
      return res.status(500).json({
        error: "Gemini API request failed.",
        status: error.response.status,
        details:
          error.response.data?.error?.message ||
          error.message
      });
    }

    return res.status(500).json({
      error: "Internal Server Error during plan generation.",
      details: error.message
    });
  }
};

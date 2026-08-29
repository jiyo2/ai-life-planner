module.exports = async (req, res) => {
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
    const {
      destination,
      startDate,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    console.log("PLAN API START");
    console.log("Destination:", destination);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing");

      return res.status(500).json({
        error: "Gemini API key is missing."
      });
    }

    if (!destination || !days || !budget || !travelers) {
      return res.status(400).json({
        error: "Missing required trip information."
      });
    }

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(GEMINI_API_KEY);

    const prompt = `
You are an expert travel planner.

Create a realistic travel plan for:

Destination: ${destination}
Start date: ${startDate || "Flexible"}
Days: ${days}
Budget: $${budget}
Travelers: ${travelers}
Interests: ${interests || "General sightseeing"}
Notes: ${notes || "None"}

IMPORTANT HOTEL REQUIREMENT:

Return EXACTLY 10 different real accommodation options in ${destination}.

Do NOT invent hotels.

For every hotel return:

- name
- stars
- price
- currency
- priceType
- amenities
- description
- bookingUrl
- imageUrl

Prices are estimates only.

Never claim live availability.

For bookingUrl:
If you do not know the exact hotel Booking.com page,
create a Booking.com search URL for that hotel and destination.

For imageUrl:
Only provide an image URL if you are reasonably confident it is a real public image.
Otherwise return "".

Never invent image URLs.

Also create:

transport
experiences
money
daysPlan

transport, experiences, money and daysPlan must contain HTML.

RETURN ONLY JSON.

Use exactly:

{
  "stay": [
    {
      "name": "Hotel name",
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
      "description": "Short description.",
      "bookingUrl": "https://www.booking.com/...",
      "imageUrl": ""
    }
  ],
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}
`;

    // =====================================================
    // GEMINI REQUEST
    // =====================================================

    const geminiResponse = await fetch(GEMINI_URL, {
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
    });

    const geminiText = await geminiResponse.text();

    console.log(
      "Gemini HTTP status:",
      geminiResponse.status
    );

    if (!geminiResponse.ok) {
      console.error(
        "GEMINI ERROR:",
        geminiText
      );

      return res.status(500).json({
        error: "Gemini API request failed.",
        status: geminiResponse.status,
        details: geminiText
      });
    }

    let geminiData;

    try {
      geminiData = JSON.parse(geminiText);
    } catch (error) {
      console.error(
        "Could not parse Gemini response:",
        geminiText
      );

      return res.status(500).json({
        error: "Invalid response from Gemini.",
        details: geminiText
      });
    }

    // =====================================================
    // GET GEMINI TEXT
    // =====================================================

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error(
        "Gemini returned no text:",
        JSON.stringify(geminiData)
      );

      return res.status(500).json({
        error: "Gemini returned an empty response.",
        details: JSON.stringify(geminiData)
      });
    }

    console.log(
      "Gemini text received successfully"
    );

    // =====================================================
    // CLEAN JSON
    // =====================================================

    let cleanText = text.trim();

    cleanText = cleanText
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    let travelData;

    try {
      travelData = JSON.parse(cleanText);
    } catch (error) {
      console.error(
        "GEMINI JSON PARSE ERROR:",
        cleanText
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON.",
        details: error.message
      });
    }

    // =====================================================
    // NORMALIZE HOTELS
    // =====================================================

    if (!Array.isArray(travelData.stay)) {
      travelData.stay = [];
    }

    travelData.stay = travelData.stay
      .filter(hotel => hotel && hotel.name)
      .map(hotel => ({
        name: String(hotel.name),

        stars: Number(hotel.stars) || 0,

        price:
          Number.isFinite(Number(hotel.price))
            ? Number(hotel.price)
            : null,

        currency:
          hotel.currency ||
          "USD",

        priceType:
          hotel.priceType ||
          "estimated per night",

        amenities:
          Array.isArray(hotel.amenities)
            ? hotel.amenities.slice(0, 6)
            : [],

        description:
          hotel.description || "",

        bookingUrl:
          hotel.bookingUrl || "",

        imageUrl:
          hotel.imageUrl || ""
      }));

    // =====================================================
    // REMOVE DUPLICATES
    // =====================================================

    const uniqueHotels = [];
    const names = new Set();

    for (const hotel of travelData.stay) {

      const key =
        hotel.name
          .toLowerCase()
          .trim();

      if (!names.has(key)) {

        names.add(key);

        uniqueHotels.push(hotel);

      }
    }

    travelData.stay =
      uniqueHotels.slice(0, 10);

    // =====================================================
    // HOTEL DEBUG LOG
    // =====================================================

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    console.log(
      "HOTEL DATA:",
      JSON.stringify(
        travelData.stay,
        null,
        2
      )
    );

    // =====================================================
    // IMAGE DEBUG
    // =====================================================

    travelData.stay.forEach((hotel, index) => {

      console.log(
        `HOTEL ${index + 1}:`,
        hotel.name
      );

      console.log(
        `HOTEL ${index + 1} IMAGE:`,
        hotel.imageUrl || "(NO IMAGE)"
      );

      console.log(
        `HOTEL ${index + 1} BOOKING:`,
        hotel.bookingUrl || "(NO BOOKING URL)"
      );

    });

    // =====================================================
    // FALLBACK CONTENT
    // =====================================================

    travelData.transport =
      travelData.transport ||
      "<p>Transportation information unavailable.</p>";

    travelData.experiences =
      travelData.experiences ||
      "<p>Experience information unavailable.</p>";

    travelData.money =
      travelData.money ||
      "<p>Budget information unavailable.</p>";

    travelData.daysPlan =
      travelData.daysPlan ||
      "<p>Itinerary information unavailable.</p>";

    // =====================================================
    // SUCCESS
    // =====================================================

    console.log("PLAN API SUCCESS");

    return res.status(200).json(travelData);

  } catch (error) {

    console.error(
      "PLAN API CRITICAL ERROR:",
      error
    );

    return res.status(500).json({
      error: "Server error while generating travel plan.",
      details: error.message
    });

  }
};

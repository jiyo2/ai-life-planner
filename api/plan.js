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
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini API key is missing."
      });
    }

    if (!PEXELS_API_KEY) {
      return res.status(500).json({
        error: "Pexels API key is missing."
      });
    }

    if (!destination || !days || !budget || !travelers) {
      return res.status(400).json({
        error: "Missing required trip information."
      });
    }

    // =====================================================
    // GEMINI
    // =====================================================

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

=========================================================
HOTELS
=========================================================

Return EXACTLY 10 different real accommodation options in ${destination}.

Do NOT invent hotels.

For every hotel return:

name
stars
price
currency
priceType
amenities
description
bookingUrl

Prices are estimates only.
Never claim live availability.

For bookingUrl:
If you do not know the exact hotel Booking.com page,
create a Booking.com search URL.

Do NOT return image URLs.

=========================================================
RESTAURANTS
=========================================================

Return EXACTLY 10 different real restaurants in ${destination}.

IMPORTANT:
- Restaurants must actually exist.
- Do not invent restaurant names.
- Prefer well-known restaurants or restaurants that are likely to have a public presence.
- Include different cuisines and price levels when possible.

For every restaurant return:

name
cuisine
priceLevel
rating
address
description
mapsUrl

rating should be a number such as 4.5.

For mapsUrl:
Create a Google Maps search URL using the restaurant name and destination.

Do NOT return image URLs.

=========================================================
OTHER CONTENT
=========================================================

Also create:

transport
experiences
money
daysPlan

transport, experiences, money and daysPlan must contain HTML.

RETURN ONLY VALID JSON.

Use exactly this structure:

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
        "Air Conditioning"
      ],
      "description": "Short description.",
      "bookingUrl": "https://www.booking.com/..."
    }
  ],

  "restaurants": [
    {
      "name": "Restaurant name",
      "cuisine": "Turkish",
      "priceLevel": "$$",
      "rating": 4.5,
      "address": "Restaurant address",
      "description": "Short description.",
      "mapsUrl": "https://www.google.com/maps/search/?api=1&query=..."
    }
  ],

  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}
`;

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
      console.error("GEMINI ERROR:", geminiText);

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
      return res.status(500).json({
        error: "Invalid response from Gemini.",
        details: geminiText
      });
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response.",
        details: JSON.stringify(geminiData)
      });
    }

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
      console.error("JSON PARSE ERROR:", cleanText);

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

        currency: hotel.currency || "USD",

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

        imageUrl: "",
        photoAttribution: "",
        photoSource: ""
      }));

    // Remove duplicate hotels
    const uniqueHotels = [];
    const hotelNames = new Set();

    for (const hotel of travelData.stay) {
      const key = hotel.name.toLowerCase().trim();

      if (!hotelNames.has(key)) {
        hotelNames.add(key);
        uniqueHotels.push(hotel);
      }
    }

    travelData.stay = uniqueHotels.slice(0, 10);

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    // =====================================================
    // NORMALIZE RESTAURANTS
    // =====================================================

    if (!Array.isArray(travelData.restaurants)) {
      travelData.restaurants = [];
    }

    travelData.restaurants =
      travelData.restaurants
        .filter(
          restaurant =>
            restaurant &&
            restaurant.name
        )
        .map(restaurant => ({
          name:
            String(restaurant.name),

          cuisine:
            restaurant.cuisine ||
            "Local cuisine",

          priceLevel:
            restaurant.priceLevel ||
            "$$",

          rating:
            Number.isFinite(
              Number(restaurant.rating)
            )
              ? Number(restaurant.rating)
              : null,

          address:
            restaurant.address ||
            "",

          description:
            restaurant.description ||
            "",

          mapsUrl:
            restaurant.mapsUrl ||
            "",

          imageUrl:
            "",

          photoAttribution:
            "",

          photoSource:
            ""
        }));

    // Remove duplicate restaurants
    const uniqueRestaurants = [];
    const restaurantNames = new Set();

    for (
      const restaurant
      of travelData.restaurants
    ) {
      const key =
        restaurant.name
          .toLowerCase()
          .trim();

      if (!restaurantNames.has(key)) {
        restaurantNames.add(key);
        uniqueRestaurants.push(
          restaurant
        );
      }
    }

    travelData.restaurants =
      uniqueRestaurants.slice(0, 10);

    console.log(
      "Restaurants returned:",
      travelData.restaurants.length
    );

    // =====================================================
    // PEXELS SEARCH
    // =====================================================

    async function getPexelsImage(query) {
      try {
        const url =
          "https://api.pexels.com/v1/search?query=" +
          encodeURIComponent(query) +
          "&per_page=5";

        const response =
          await fetch(url, {
            method: "GET",
            headers: {
              Authorization:
                PEXELS_API_KEY
            }
          });

        if (!response.ok) {
          console.error(
            "Pexels error:",
            response.status
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };
        }

        const data =
          await response.json();

        if (
          !data ||
          !Array.isArray(data.photos) ||
          data.photos.length === 0
        ) {
          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };
        }

        const photo = data.photos[0];

        return {
          imageUrl:
            photo?.src?.large2x ||
            photo?.src?.large ||
            photo?.src?.original ||
            "",

          photoAttribution:
            photo?.photographer || "",

          photoSource:
            photo?.photographer_url ||
            "https://www.pexels.com/"
        };

      } catch (error) {
        console.error(
          "Pexels search failed:",
          error.message
        );

        return {
          imageUrl: "",
          photoAttribution: "",
          photoSource: ""
        };
      }
    }

    // =====================================================
    // HOTEL IMAGES
    // =====================================================

    console.log(
      "Starting hotel image search..."
    );

    const hotelImages =
      await Promise.all(
        travelData.stay.map(
          hotel =>
            getPexelsImage(
              `${hotel.name} ${destination}`
            )
        )
      );

    travelData.stay =
      travelData.stay.map(
        (hotel, index) => ({
          ...hotel,
          imageUrl:
            hotelImages[index]?.imageUrl ||
            "",
          photoAttribution:
            hotelImages[index]?.photoAttribution ||
            "",
          photoSource:
            hotelImages[index]?.photoSource ||
            ""
        })
      );

    // =====================================================
    // RESTAURANT IMAGES
    // =====================================================

    console.log(
      "Starting restaurant image search..."
    );

    const restaurantImages =
      await Promise.all(
        travelData.restaurants.map(
          restaurant =>
            getPexelsImage(
              `${restaurant.cuisine} restaurant ${destination}`
            )
        )
      );

    travelData.restaurants =
      travelData.restaurants.map(
        (restaurant, index) => ({
          ...restaurant,
          imageUrl:
            restaurantImages[index]?.imageUrl ||
            "",
          photoAttribution:
            restaurantImages[index]?.photoAttribution ||
            "",
          photoSource:
            restaurantImages[index]?.photoSource ||
            ""
        })
      );

    // =====================================================
    // DEBUG
    // =====================================================

    travelData.stay.forEach(
      (hotel, index) => {
        console.log(
          `HOTEL ${index + 1}:`,
          hotel.name
        );

        console.log(
          `HOTEL ${index + 1} IMAGE:`,
          hotel.imageUrl || "(NO IMAGE)"
        );
      }
    );

    travelData.restaurants.forEach(
      (restaurant, index) => {
        console.log(
          `RESTAURANT ${index + 1}:`,
          restaurant.name
        );

        console.log(
          `RESTAURANT ${index + 1} IMAGE:`,
          restaurant.imageUrl || "(NO IMAGE)"
        );
      }
    );

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

    console.log(
      "PLAN API SUCCESS"
    );

    return res.status(200).json(
      travelData
    );

  } catch (error) {

    console.error(
      "PLAN API CRITICAL ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Server error while generating travel plan.",
      details:
        error.message
    });
  }
};

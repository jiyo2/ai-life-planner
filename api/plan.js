module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // =========================================================
  // OPTIONS
  // =========================================================

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // =========================================================
  // METHOD CHECK
  // =========================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // =======================================================
    // TRIP DATA
    // =======================================================

    const {
      destination,
      startDate,
      days,
      budget,
      travelers,
      interests,
      notes
    } = req.body || {};

    console.log("======================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("Days:", days);
    console.log("Budget:", budget);
    console.log("Travelers:", travelers);
    console.log("======================================");

    // =======================================================
    // GEMINI KEY
    // =======================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {

      console.error("GEMINI_API_KEY missing");

      return res.status(500).json({
        error: "Gemini API key is missing."
      });
    }

    // =======================================================
    // PEXELS KEY
    // =======================================================

    const PEXELS_API_KEY =
      process.env.PEXELS_API_KEY;

    if (!PEXELS_API_KEY) {

      console.error("PEXELS_API_KEY missing");

      return res.status(500).json({
        error:
          "Pexels API key is missing. Add PEXELS_API_KEY to Vercel Environment Variables."
      });
    }

    // =======================================================
    // VALIDATE TRIP
    // =======================================================

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

    // =======================================================
    // GEMINI URL
    // =======================================================

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(GEMINI_API_KEY);

    // =======================================================
    // GEMINI PROMPT
    // =======================================================

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
IMPORTANT HOTEL REQUIREMENT
=========================================================

Return up to EXACTLY 10 different REAL existing accommodation options in ${destination}.

Do NOT invent hotels.

Only use accommodation names that are known real properties.

For every hotel return:

- name
- stars
- price
- currency
- priceType
- amenities
- description

Prices are estimates only.

Never claim live availability.

Do NOT return image URLs.

Images will be obtained separately.

=========================================================
IMPORTANT RESTAURANT REQUIREMENT
=========================================================

Return up to EXACTLY 10 different REAL EXISTING restaurants
in ${destination}.

Do NOT invent restaurants.

Only return restaurants that are known real restaurants
or established real restaurant businesses in the destination.

Prefer restaurants that are well-known and identifiable.

Restaurants should be suitable for the traveler's interests:
${interests || "General sightseeing"}

For every restaurant return:

- name
- cuisine
- priceLevel
- rating
- address
- description

IMPORTANT:

Do NOT return image URLs.

Images will be obtained separately.

Do NOT claim live opening hours or live availability.

If you are uncertain about a restaurant being real,
DO NOT include it.

=========================================================
OTHER TRAVEL CONTENT
=========================================================

Also create:

transport
experiences
money
daysPlan

transport, experiences, money and daysPlan must contain HTML.

=========================================================
OUTPUT
=========================================================

RETURN ONLY VALID JSON.

Do not use Markdown.

Use exactly this structure:

{
  "stay": [
    {
      "name": "Real Hotel Name",
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
      "description": "Short description."
    }
  ],

  "restaurants": [
    {
      "name": "Real Restaurant Name",
      "cuisine": "Turkish",
      "priceLevel": "$$",
      "rating": 4.5,
      "address": "Real address if known",
      "description": "Short description of the restaurant."
    }
  ],

  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}

IMPORTANT:

The JSON must be valid.

Do not put comments inside the JSON.

Do not use trailing commas.
`;

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

    console.log("Sending request to Gemini...");

    const geminiResponse =
      await fetch(
        GEMINI_URL,
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
              responseMimeType:
                "application/json"
            }

          })
        }
      );

    const geminiText =
      await geminiResponse.text();

    console.log(
      "Gemini HTTP status:",
      geminiResponse.status
    );

    // =======================================================
    // GEMINI ERROR
    // =======================================================

    if (!geminiResponse.ok) {

      console.error(
        "GEMINI ERROR:",
        geminiText
      );

      return res.status(500).json({
        error:
          "Gemini API request failed.",
        status:
          geminiResponse.status,
        details:
          geminiText
      });
    }

    // =======================================================
    // PARSE GEMINI RESPONSE
    // =======================================================

    let geminiData;

    try {

      geminiData =
        JSON.parse(geminiText);

    } catch (error) {

      console.error(
        "Could not parse Gemini response:",
        geminiText
      );

      return res.status(500).json({
        error:
          "Invalid response from Gemini.",
        details:
          geminiText
      });
    }

    // =======================================================
    // GET GEMINI TEXT
    // =======================================================

    const text =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    if (!text) {

      console.error(
        "Gemini returned no text:",
        JSON.stringify(geminiData)
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response.",
        details:
          JSON.stringify(geminiData)
      });
    }

    console.log(
      "Gemini text received successfully"
    );

    // =======================================================
    // CLEAN JSON
    // =======================================================

    let cleanText =
      text.trim();

    cleanText =
      cleanText
        .replace(
          /^```json/i,
          ""
        )
        .replace(
          /^```/i,
          ""
        )
        .replace(
          /```$/i,
          ""
        )
        .trim();

    // =======================================================
    // PARSE TRAVEL DATA
    // =======================================================

    let travelData;

    try {

      travelData =
        JSON.parse(cleanText);

    } catch (error) {

      console.error(
        "GEMINI JSON PARSE ERROR:",
        cleanText
      );

      return res.status(500).json({
        error:
          "Gemini returned invalid JSON.",
        details:
          error.message
      });
    }

    // =======================================================
    // NORMALIZE HOTELS
    // =======================================================

    if (
      !Array.isArray(
        travelData.stay
      )
    ) {

      travelData.stay = [];
    }

    travelData.stay =
      travelData.stay
        .filter(
          hotel =>
            hotel &&
            hotel.name
        )
        .map(
          hotel => ({

            name:
              String(
                hotel.name
              ),

            stars:
              Number(
                hotel.stars
              ) || 0,

            price:
              Number.isFinite(
                Number(
                  hotel.price
                )
              )
                ? Number(
                    hotel.price
                  )
                : null,

            currency:
              hotel.currency ||
              "USD",

            priceType:
              hotel.priceType ||
              "estimated per night",

            amenities:
              Array.isArray(
                hotel.amenities
              )
                ? hotel.amenities
                    .slice(0, 6)
                    .map(
                      item =>
                        String(item)
                    )
                : [],

            description:
              hotel.description
                ? String(
                    hotel.description
                  )
                : "",

            bookingUrl:
              "",

            imageUrl:
              "",

            photoAttribution:
              "",

            photoSource:
              ""

          })
        );

    // =======================================================
    // REMOVE DUPLICATE HOTELS
    // =======================================================

    const uniqueHotels = [];

    const hotelNames =
      new Set();

    for (
      const hotel
      of travelData.stay
    ) {

      const key =
        hotel.name
          .toLowerCase()
          .trim();

      if (
        !hotelNames.has(key)
      ) {

        hotelNames.add(key);

        uniqueHotels.push(
          hotel
        );
      }
    }

    travelData.stay =
      uniqueHotels.slice(
        0,
        10
      );

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    // =======================================================
    // NORMALIZE RESTAURANTS
    // =======================================================

    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants = [];
    }

    travelData.restaurants =
      travelData.restaurants
        .filter(
          restaurant =>
            restaurant &&
            restaurant.name
        )
        .map(
          restaurant => ({

            name:
              String(
                restaurant.name
              ),

            cuisine:
              restaurant.cuisine
                ? String(
                    restaurant.cuisine
                  )
                : "Local cuisine",

            priceLevel:
              restaurant.priceLevel
                ? String(
                    restaurant.priceLevel
                  )
                : "$$",

            rating:
              Number.isFinite(
                Number(
                  restaurant.rating
                )
              )
                ? Number(
                    restaurant.rating
                  )
                : null,

            address:
              restaurant.address
                ? String(
                    restaurant.address
                  )
                : "",

            description:
              restaurant.description
                ? String(
                    restaurant.description
                  )
                : "",

            mapsUrl:
              "",

            imageUrl:
              "",

            photoAttribution:
              "",

            photoSource:
              ""

          })
        );

    // =======================================================
    // REMOVE DUPLICATE RESTAURANTS
    // =======================================================

    const uniqueRestaurants = [];

    const restaurantNames =
      new Set();

    for (
      const restaurant
      of travelData.restaurants
    ) {

      const key =
        restaurant.name
          .toLowerCase()
          .trim();

      if (
        !restaurantNames.has(key)
      ) {

        restaurantNames.add(key);

        uniqueRestaurants.push(
          restaurant
        );
      }
    }

    travelData.restaurants =
      uniqueRestaurants.slice(
        0,
        10
      );

    console.log(
      "Restaurants returned:",
      travelData.restaurants.length
    );

    // =======================================================
    // CREATE BOOKING URL
    // =======================================================

    function createBookingSearchURL(
      hotelName,
      destination
    ) {

      const query =
        encodeURIComponent(
          `${hotelName} ${destination}`
        );

      return (
        "https://www.booking.com/searchresults.html?ss=" +
        query
      );
    }

    // =======================================================
    // CREATE GOOGLE MAPS URL
    // =======================================================

    function createGoogleMapsSearchURL(
      restaurantName,
      destination
    ) {

      const query =
        encodeURIComponent(
          `${restaurantName} ${destination}`
        );

      return (
        "https://www.google.com/maps/search/?api=1&query=" +
        query
      );
    }

    // =======================================================
    // ADD BOOKING URLS
    // =======================================================

    travelData.stay =
      travelData.stay.map(
        hotel => ({

          ...hotel,

          bookingUrl:
            createBookingSearchURL(
              hotel.name,
              destination
            )

        })
      );

    // =======================================================
    // ADD GOOGLE MAPS URLS
    // =======================================================

    travelData.restaurants =
      travelData.restaurants.map(
        restaurant => ({

          ...restaurant,

          mapsUrl:
            createGoogleMapsSearchURL(
              restaurant.name,
              destination
            )

        })
      );

    // =======================================================
    // PEXELS IMAGE SEARCH
    // =======================================================

    async function searchPexels(
      query,
      type
    ) {

      try {

        console.log(
          `Pexels ${type} search:`,
          query
        );

        const url =
          "https://api.pexels.com/v1/search?query=" +
          encodeURIComponent(query) +
          "&per_page=5";

        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {
                Authorization:
                  PEXELS_API_KEY
              }
            }
          );

        let data = null;

        try {

          data =
            await response.json();

        } catch (error) {

          data = null;
        }

        if (
          !response.ok
        ) {

          console.error(
            `Pexels ${type} error:`,
            response.status,
            data
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };
        }

        if (
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          console.log(
            `No Pexels image found for ${type}:`,
            query
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };
        }

        const photo =
          data.photos[0];

        const imageUrl =
          photo?.src?.large2x ||
          photo?.src?.large ||
          photo?.src?.original ||
          "";

        if (!imageUrl) {

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };
        }

        return {

          imageUrl,

          photoAttribution:
            photo?.photographer ||
            "",

          photoSource:
            photo?.photographer_url ||
            "https://www.pexels.com/"

        };

      } catch (error) {

        console.error(
          `Pexels ${type} lookup failed:`,
          error.message
        );

        return {
          imageUrl: "",
          photoAttribution: "",
          photoSource: ""
        };
      }
    }

    // =======================================================
    // HOTEL IMAGES
    // =======================================================

    console.log(
      "Starting hotel image search..."
    );

    const hotelImageResults =
      await Promise.all(
        travelData.stay.map(
          hotel =>
            searchPexels(
              `${hotel.name} ${destination}`,
              "hotel"
            )
        )
      );

    travelData.stay =
      travelData.stay.map(
        (hotel, index) => {

          const image =
            hotelImageResults[
              index
            ] || {};

          return {

            ...hotel,

            imageUrl:
              image.imageUrl ||
              "",

            photoAttribution:
              image.photoAttribution ||
              "",

            photoSource:
              image.photoSource ||
              ""

          };
        }
      );

    // =======================================================
    // RESTAURANT IMAGES
    // =======================================================

    console.log(
      "Starting restaurant image search..."
    );

    const restaurantImageResults =
      await Promise.all(
        travelData.restaurants.map(
          restaurant =>
            searchPexels(
              `${restaurant.name} ${destination} restaurant`,
              "restaurant"
            )
        )
      );

    travelData.restaurants =
      travelData.restaurants.map(
        (restaurant, index) => {

          const image =
            restaurantImageResults[
              index
            ] || {};

          return {

            ...restaurant,

            imageUrl:
              image.imageUrl ||
              "",

            photoAttribution:
              image.photoAttribution ||
              "",

            photoSource:
              image.photoSource ||
              ""

          };
        }
      );

    // =======================================================
    // DEBUG HOTELS
    // =======================================================

    travelData.stay.forEach(
      (hotel, index) => {

        console.log(
          `HOTEL ${index + 1}:`,
          hotel.name
        );

        console.log(
          `HOTEL ${index + 1} IMAGE:`,
          hotel.imageUrl ||
          "(NO IMAGE)"
        );

      }
    );

    // =======================================================
    // DEBUG RESTAURANTS
    // =======================================================

    travelData.restaurants.forEach(
      (restaurant, index) => {

        console.log(
          `RESTAURANT ${index + 1}:`,
          restaurant.name
        );

        console.log(
          `RESTAURANT ${index + 1} ADDRESS:`,
          restaurant.address ||
          "(NO ADDRESS)"
        );

        console.log(
          `RESTAURANT ${index + 1} IMAGE:`,
          restaurant.imageUrl ||
          "(NO IMAGE)"
        );

        console.log(
          `RESTAURANT ${index + 1} MAPS:`,
          restaurant.mapsUrl ||
          "(NO MAPS URL)"
        );

      }
    );

    // =======================================================
    // FALLBACK CONTENT
    // =======================================================

    travelData.transport =
      typeof travelData.transport === "string" &&
      travelData.transport.trim()
        ? travelData.transport
        : "<p>Transportation information unavailable.</p>";

    travelData.experiences =
      typeof travelData.experiences === "string" &&
      travelData.experiences.trim()
        ? travelData.experiences
        : "<p>Experience information unavailable.</p>";

    travelData.money =
      typeof travelData.money === "string" &&
      travelData.money.trim()
        ? travelData.money
        : "<p>Budget information unavailable.</p>";

    travelData.daysPlan =
      typeof travelData.daysPlan === "string" &&
      travelData.daysPlan.trim()
        ? travelData.daysPlan
        : "<p>Itinerary information unavailable.</p>";

    // =======================================================
    // FINAL DEBUG
    // =======================================================

    console.log(
      "======================================"
    );

    console.log(
      "FINAL HOTELS:",
      travelData.stay.length
    );

    console.log(
      "FINAL RESTAURANTS:",
      travelData.restaurants.length
    );

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "======================================"
    );

    // =======================================================
    // SUCCESS
    // =======================================================

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

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

    console.log("PLAN API START");
    console.log("Destination:", destination);

    // =======================================================
    // GEMINI KEY
    // =======================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {

      console.error(
        "GEMINI_API_KEY missing"
      );

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

      console.error(
        "PEXELS_API_KEY missing"
      );

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
      encodeURIComponent(
        GEMINI_API_KEY
      );

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

IMPORTANT HOTEL REQUIREMENT:

Return EXACTLY 10 different real accommodation options in ${destination}.

Do NOT invent hotels.

The hotels must be real existing accommodations.

For every hotel return:

- name
- stars
- price
- currency
- priceType
- amenities
- description
- bookingUrl

Prices are estimates only.

Never claim live availability.

For bookingUrl:
If you do not know the exact hotel Booking.com page,
create a Booking.com search URL for that hotel and destination.

Do NOT return image URLs.
Images will be obtained separately.

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
      "bookingUrl": "https://www.booking.com/..."
    }
  ],
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}
`;

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

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
        JSON.parse(
          geminiText
        );

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
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response.",
        details:
          JSON.stringify(
            geminiData
          )
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
        JSON.parse(
          cleanText
        );

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
                : [],

            description:
              hotel.description ||
              "",

            bookingUrl:
              hotel.bookingUrl ||
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
    // REMOVE DUPLICATES
    // =======================================================

    const uniqueHotels = [];

    const names =
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
        !names.has(key)
      ) {

        names.add(key);

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
    // PEXELS IMAGE SEARCH
    // =======================================================

    async function getHotelImage(
      hotelName,
      destination
    ) {

      try {

        // ---------------------------------------------------
        // SEARCH 1
        // ---------------------------------------------------

        const query1 =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels search 1:",
          query1
        );

        let response =
          await fetch(
            "https://api.pexels.com/v1/search?query=" +
            encodeURIComponent(
              query1
            ) +
            "&per_page=5"
          ,
            {
              method: "GET",

              headers: {
                Authorization:
                  PEXELS_API_KEY
              }
            }
          );

        let data;

        try {

          data =
            await response.json();

        } catch (error) {

          data = null;

        }

        // ---------------------------------------------------
        // SEARCH 2 FALLBACK
        // ---------------------------------------------------

        if (
          !response.ok ||
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          const query2 =
            `hotel ${destination}`;

          console.log(
            "Pexels fallback search:",
            query2
          );

          response =
            await fetch(
              "https://api.pexels.com/v1/search?query=" +
              encodeURIComponent(
                query2
              ) +
              "&per_page=10"
            ,
              {
                method: "GET",

                headers: {
                  Authorization:
                    PEXELS_API_KEY
                }
              }
            );

          try {

            data =
              await response.json();

          } catch (error) {

            data = null;

          }

        }

        if (
          !response.ok
        ) {

          console.error(
            "Pexels API error:",
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
            "No Pexels image found:",
            hotelName
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };

        }

        // ---------------------------------------------------
        // SELECT PHOTO
        // ---------------------------------------------------

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

        const photographer =
          photo?.photographer ||
          "";

        const photographerUrl =
          photo?.photographer_url ||
          "";

        console.log(
          "Pexels image found:",
          hotelName,
          "YES"
        );

        return {

          imageUrl,

          photoAttribution:
            photographer,

          photoSource:
            photographerUrl ||
            "https://www.pexels.com/"

        };

      } catch (error) {

        console.error(
          "Pexels image lookup failed:",
          hotelName,
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
    // FETCH ALL HOTEL IMAGES
    // =======================================================

    console.log(
      "Starting Pexels hotel image search..."
    );

    const imageResults =
      await Promise.all(
        travelData.stay.map(
          hotel =>
            getHotelImage(
              hotel.name,
              destination
            )
        )
      );

    // =======================================================
    // ATTACH IMAGES
    // =======================================================

    travelData.stay =
      travelData.stay.map(
        (hotel, index) => {

          const image =
            imageResults[
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
    // IMAGE DEBUG
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

        console.log(
          `HOTEL ${index + 1} PHOTOGRAPHER:`,
          hotel.photoAttribution ||
          "(NONE)"
        );

      }
    );

    // =======================================================
    // FALLBACK CONTENT
    // =======================================================

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

    // =======================================================
    // SUCCESS
    // =======================================================

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

module.exports = async (req, res) => {

  // =======================================================
  // CORS
  // =======================================================

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

    console.log("========================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("========================================");

    // =======================================================
    // API KEYS
    // =======================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    const PEXELS_API_KEY =
      process.env.PEXELS_API_KEY;

    if (!GEMINI_API_KEY) {

      console.error("GEMINI_API_KEY missing");

      return res.status(500).json({
        error: "Gemini API key is missing."
      });

    }

    if (!PEXELS_API_KEY) {

      console.error("PEXELS_API_KEY missing");

      return res.status(500).json({
        error:
          "Pexels API key is missing. Add PEXELS_API_KEY to Vercel Environment Variables."
      });

    }

    // =======================================================
    // VALIDATION
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
    // GEMINI
    // =======================================================

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

Return up to 10 different real accommodation options in ${destination}.

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

If you do not know the exact hotel Booking.com URL,
create a Booking.com search URL for that hotel and destination.

Do NOT return image URLs.
Hotel images will be obtained separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT generate restaurant names.

Restaurants will be obtained separately from OpenStreetMap.

Therefore return:

"restaurants": []

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
      "bookingUrl": ""
    }
  ],
  "restaurants": [],
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

    // =======================================================
    // CLEAN JSON
    // =======================================================

    let cleanText =
      text.trim();

    cleanText =
      cleanText
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

    // =======================================================
    // TRAVEL DATA
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
              String(hotel.name),

            stars:
              Number(hotel.stars) || 0,

            price:
              Number.isFinite(
                Number(hotel.price)
              )
                ? Number(hotel.price)
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
                ? hotel.amenities.slice(0, 8)
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
    // REMOVE DUPLICATE HOTELS
    // =======================================================

    const uniqueHotels = [];
    const hotelNames = new Set();

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
      uniqueHotels.slice(0, 10);

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    // =======================================================
    // PEXELS HOTEL IMAGE
    // =======================================================

    async function getHotelImage(
      hotelName,
      destination
    ) {

      try {

        const query1 =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels hotel search:",
          query1
        );

        let response =
          await fetch(
            "https://api.pexels.com/v1/search?query=" +
            encodeURIComponent(query1) +
            "&per_page=5",
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

        // ---------------------------------------------------
        // HOTEL IMAGE FALLBACK
        // ---------------------------------------------------

        if (
          !response.ok ||
          !data ||
          !Array.isArray(data.photos) ||
          data.photos.length === 0
        ) {

          const query2 =
            `hotel ${destination}`;

          console.log(
            "Pexels fallback:",
            query2
          );

          response =
            await fetch(
              "https://api.pexels.com/v1/search?query=" +
              encodeURIComponent(query2) +
              "&per_page=10",
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
          !response.ok ||
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

        const photo =
          data.photos[0];

        const imageUrl =
          photo?.src?.large2x ||
          photo?.src?.large ||
          photo?.src?.original ||
          "";

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
          "Pexels hotel error:",
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
    // GET HOTEL IMAGES
    // =======================================================

    const hotelImages =
      await Promise.all(
        travelData.stay.map(
          hotel =>
            getHotelImage(
              hotel.name,
              destination
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

    // =======================================================
    // OPENSTREETMAP RESTAURANTS
    // =======================================================

    async function getRestaurantsFromOSM(
      destination
    ) {

      try {

        console.log(
          "========================================"
        );

        console.log(
          "OpenStreetMap restaurant search:",
          destination
        );

        console.log(
          "========================================"
        );

        // ===================================================
        // STEP 1 — NOMINATIM GEOCODING
        // ===================================================

        const geocodeURL =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json" +
          "&limit=1" +
          "&addressdetails=1" +
          "&q=" +
          encodeURIComponent(destination);

        const geocodeResponse =
          await fetch(
            geocodeURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  "AI-Life-Planner/1.0 (travel planner application)"
              }
            }
          );

        if (!geocodeResponse.ok) {

          console.error(
            "Nominatim error:",
            geocodeResponse.status
          );

          return [];

        }

        const locations =
          await geocodeResponse.json();

        if (
          !Array.isArray(locations) ||
          locations.length === 0
        ) {

          console.log(
            "Destination not found:",
            destination
          );

          return [];

        }

        const lat =
          Number(
            locations[0].lat
          );

        const lon =
          Number(
            locations[0].lon
          );

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {

          console.error(
            "Invalid coordinates from Nominatim"
          );

          return [];

        }

        console.log(
          "Destination coordinates:",
          lat,
          lon
        );

        // ===================================================
        // STEP 2 — OVERPASS
        // ===================================================

        const overpassQuery = `
[out:json][timeout:40];

(
  node["amenity"="restaurant"](around:15000,${lat},${lon});
  way["amenity"="restaurant"](around:15000,${lat},${lon});
  relation["amenity"="restaurant"](around:15000,${lat},${lon});
);

out center tags;
`;

        const overpassURL =
          "https://overpass-api.de/api/interpreter";

        const osmResponse =
          await fetch(
            overpassURL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded",

                "User-Agent":
                  "AI-Life-Planner/1.0"
              },

              body:
                "data=" +
                encodeURIComponent(
                  overpassQuery
                )
            }
          );

        if (!osmResponse.ok) {

          console.error(
            "Overpass error:",
            osmResponse.status
          );

          return [];

        }

        const osmData =
          await osmResponse.json();

        if (
          !osmData ||
          !Array.isArray(
            osmData.elements
          )
        ) {

          console.error(
            "Invalid Overpass response"
          );

          return [];

        }

        console.log(
          "OSM restaurant elements found:",
          osmData.elements.length
        );

        // ===================================================
        // STEP 3 — NORMALIZE RESTAURANTS
        // ===================================================

        const restaurants = [];

        for (
          const item
          of osmData.elements
        ) {

          const tags =
            item.tags || {};

          // -------------------------------------------------
          // REAL NAME ONLY
          // -------------------------------------------------

          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:tr"];

          if (!name) {
            continue;
          }

          // -------------------------------------------------
          // COORDINATES
          // -------------------------------------------------

          let restaurantLat =
            item.lat;

          let restaurantLon =
            item.lon;

          if (
            restaurantLat === undefined &&
            item.center
          ) {

            restaurantLat =
              item.center.lat;

            restaurantLon =
              item.center.lon;

          }

          restaurantLat =
            Number(restaurantLat);

          restaurantLon =
            Number(restaurantLon);

          // -------------------------------------------------
          // ADDRESS
          // -------------------------------------------------

          const addressParts = [];

          if (
            tags["addr:housenumber"]
          ) {

            addressParts.push(
              tags["addr:housenumber"]
            );

          }

          if (
            tags["addr:street"]
          ) {

            addressParts.push(
              tags["addr:street"]
            );

          }

          if (
            tags["addr:district"]
          ) {

            addressParts.push(
              tags["addr:district"]
            );

          }

          if (
            tags["addr:city"]
          ) {

            addressParts.push(
              tags["addr:city"]
            );

          }

          const address =
            addressParts.length > 0
              ? addressParts.join(", ")
              : destination;

          // -------------------------------------------------
          // CUISINE
          // -------------------------------------------------

          const cuisine =
            tags.cuisine ||
            "Local cuisine";

          // -------------------------------------------------
          // PRICE
          // -------------------------------------------------

          const priceLevel =
            tags["price:level"] ||
            tags["price_level"] ||
            "$$";

          // -------------------------------------------------
          // WEBSITE
          // -------------------------------------------------

          const website =
            tags.website ||
            tags["contact:website"] ||
            "";

          // -------------------------------------------------
          // PHONE
          // -------------------------------------------------

          const phone =
            tags.phone ||
            tags["contact:phone"] ||
            "";

          // =================================================
          // IMAGE FROM OPENSTREETMAP
          // =================================================

          let imageUrl =
            tags.image ||
            tags["contact:image"] ||
            "";

          // -------------------------------------------------
          // WIKIMEDIA COMMONS
          // -------------------------------------------------

          const wikimediaCommons =
            tags.wikimedia_commons ||
            tags["wikimedia_commons"] ||
            "";

          // -------------------------------------------------
          // IF OSM IMAGE IS NOT A DIRECT IMAGE URL,
          // TRY TO CONVERT COMMON WIKIMEDIA TAG
          // -------------------------------------------------

          if (
            !imageUrl &&
            wikimediaCommons
          ) {

            const commonsValue =
              String(
                wikimediaCommons
              ).trim();

            if (
              commonsValue
                .toLowerCase()
                .startsWith("file:")
            ) {

              const fileName =
                commonsValue
                  .replace(
                    /^File:/i,
                    ""
                  )
                  .trim();

              imageUrl =
                "https://commons.wikimedia.org/wiki/Special:Redirect/file/" +
                encodeURIComponent(
                  fileName
                );

            }

          }

          // =================================================
          // STARS
          // =================================================

          let starValue =
            null;

          if (
            tags.stars !== undefined &&
            tags.stars !== null &&
            tags.stars !== ""
          ) {

            const parsedStars =
              Number(
                String(
                  tags.stars
                ).replace(
                  ",",
                  "."
                )
              );

            if (
              Number.isFinite(
                parsedStars
              )
            ) {

              starValue =
                parsedStars;

            }

          }

          // -------------------------------------------------
          // OTHER POSSIBLE RATING TAGS
          // -------------------------------------------------

          let ratingValue =
            null;

          const possibleRatings = [

            tags.rating,

            tags["rating:overall"],

            tags["check_date:rating"]

          ];

          for (
            const possible
            of possibleRatings
          ) {

            if (
              possible !== undefined &&
              possible !== null &&
              possible !== ""
            ) {

              const parsed =
                Number(
                  String(possible)
                    .replace(
                      ",",
                      "."
                    )
                );

              if (
                Number.isFinite(parsed)
              ) {

                ratingValue =
                  parsed;

                break;

              }

            }

          }

          // =================================================
          // OSM MAP URL
          // =================================================

          let osmUrl = "";

          if (
            Number.isFinite(
              restaurantLat
            ) &&
            Number.isFinite(
              restaurantLon
            )
          ) {

            osmUrl =
              "https://www.openstreetmap.org/" +
              "?" +
              "mlat=" +
              encodeURIComponent(
                restaurantLat
              ) +
              "&mlon=" +
              encodeURIComponent(
                restaurantLon
              ) +
              "#map=19/" +
              encodeURIComponent(
                restaurantLat
              ) +
              "/" +
              encodeURIComponent(
                restaurantLon
              );

          } else {

            osmUrl =
              "https://www.openstreetmap.org/search?query=" +
              encodeURIComponent(
                name + " " + destination
              );

          }

          // =================================================
          // GOOGLE MAPS LINK
          // NO API KEY REQUIRED
          //
          // This is ONLY a normal website link.
          // =================================================

          let mapsUrl = "";

          if (
            Number.isFinite(
              restaurantLat
            ) &&
            Number.isFinite(
              restaurantLon
            )
          ) {

            mapsUrl =
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                restaurantLat +
                "," +
                restaurantLon
              );

          } else {

            mapsUrl =
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                name +
                " " +
                destination
              );

          }

          // =================================================
          // DESCRIPTION
          // =================================================

          let description =
            `${name} is a real local place listed in OpenStreetMap in ${destination}.`;

          if (
            cuisine &&
            cuisine !== "Local cuisine"
          ) {

            description =
              `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap. Cuisine: ${cuisine}.`;

          }

          // =================================================
          // RESTAURANT OBJECT
          // =================================================

          restaurants.push({

            name:
              String(name),

            cuisine:
              String(cuisine),

            priceLevel:
              String(priceLevel),

            rating:
              ratingValue !== null
                ? ratingValue
                : starValue,

            ratingType:
              ratingValue !== null
                ? "rating"
                : (
                    starValue !== null
                      ? "stars"
                      : ""
                  ),

            stars:
              starValue,

            address:
              String(address),

            description:
              description,

            imageUrl:
              imageUrl
                ? String(imageUrl)
                : "",

            image:
              imageUrl
                ? String(imageUrl)
                : "",

            wikimediaCommons:
              wikimediaCommons
                ? String(
                    wikimediaCommons
                  )
                : "",

            mapsUrl,

            osmUrl,

            website:
              website
                ? String(website)
                : "",

            phone:
              phone
                ? String(phone)
                : "",

            latitude:
              Number.isFinite(
                restaurantLat
              )
                ? restaurantLat
                : null,

            longitude:
              Number.isFinite(
                restaurantLon
              )
                ? restaurantLon
                : null

          });

        }

        // ===================================================
        // REMOVE DUPLICATES
        // ===================================================

        const uniqueRestaurants = [];
        const restaurantKeys = new Set();

        for (
          const restaurant
          of restaurants
        ) {

          const key =
            restaurant.name
              .toLowerCase()
              .trim();

          if (
            !restaurantKeys.has(key)
          ) {

            restaurantKeys.add(key);

            uniqueRestaurants.push(
              restaurant
            );

          }

        }

        // ===================================================
        // PRIORITIZE RESTAURANTS WITH IMAGES
        // ===================================================

        uniqueRestaurants.sort(
          (a, b) => {

            const aScore =
              (a.imageUrl ? 10 : 0) +
              (a.stars !== null ? 3 : 0) +
              (a.rating !== null ? 2 : 0) +
              (a.website ? 1 : 0);

            const bScore =
              (b.imageUrl ? 10 : 0) +
              (b.stars !== null ? 3 : 0) +
              (b.rating !== null ? 2 : 0) +
              (b.website ? 1 : 0);

            return bScore - aScore;

          }
        );

        // ===================================================
        // LIMIT TO 10
        // ===================================================

        const finalRestaurants =
          uniqueRestaurants.slice(
            0,
            10
          );

        console.log(
          "Final OSM restaurants:",
          finalRestaurants.length
        );

        finalRestaurants.forEach(
          (restaurant, index) => {

            console.log(
              `Restaurant ${index + 1}:`,
              restaurant.name,
              "| image:",
              !!restaurant.imageUrl,
              "| stars:",
              restaurant.stars,
              "| rating:",
              restaurant.rating
            );

          }
        );

        return finalRestaurants;

      } catch (error) {

        console.error(
          "OpenStreetMap restaurant error:",
          error
        );

        return [];

      }

    }

    // =======================================================
    // GET REAL RESTAURANTS
    // =======================================================

    console.log(
      "Starting OpenStreetMap restaurant search..."
    );

    travelData.restaurants =
      await getRestaurantsFromOSM(
        destination
      );

    console.log(
      "Restaurants returned:",
      travelData.restaurants.length
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
    // FINAL NORMALIZATION
    // =======================================================

    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants = [];

    }

    // =======================================================
    // SUCCESS
    // =======================================================

    console.log(
      "========================================"
    );

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "Hotels:",
      travelData.stay.length
    );

    console.log(
      "Restaurants:",
      travelData.restaurants.length
    );

    console.log(
      "========================================"
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

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

    console.log("======================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("======================================");

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
    // VALIDATE
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

If you do not know the exact Booking.com page,
create a Booking.com search URL for the hotel and destination.

Do NOT return image URLs.
Images will be obtained separately.

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
      "bookingUrl": "https://www.booking.com/..."
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
              responseMimeType: "application/json"
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
                ? hotel.amenities.slice(0, 6)
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
        // FALLBACK
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

        return {

          imageUrl:
            photo?.src?.large2x ||
            photo?.src?.large ||
            photo?.src?.original ||
            "",

          photoAttribution:
            photo?.photographer ||
            "",

          photoSource:
            photo?.photographer_url ||
            "https://www.pexels.com/"

        };

      } catch (error) {

        console.error(
          "Pexels error:",
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
    // OPENSTREETMAP / NOMINATIM
    // =======================================================

    async function geocodeDestination(
      destination
    ) {

      const queries = [

        destination,

        `${destination}, Turkey`,

        `${destination}, Türkiye`

      ];

      for (
        const query
        of queries
      ) {

        try {

          console.log(
            "Nominatim search:",
            query
          );

          const url =
            "https://nominatim.openstreetmap.org/search" +
            "?format=json" +
            "&limit=5" +
            "&addressdetails=1" +
            "&q=" +
            encodeURIComponent(query);

          const response =
            await fetch(
              url,
              {
                method: "GET",

                headers: {
                  "User-Agent":
                    "AI-Life-Planner/1.0 (travel planner)",
                  "Accept":
                    "application/json"
                }
              }
            );

          if (!response.ok) {

            console.error(
              "Nominatim status:",
              response.status
            );

            continue;

          }

          const data =
            await response.json();

          if (
            Array.isArray(data) &&
            data.length > 0
          ) {

            const location =
              data[0];

            const lat =
              Number(location.lat);

            const lon =
              Number(location.lon);

            if (
              Number.isFinite(lat) &&
              Number.isFinite(lon)
            ) {

              console.log(
                "Nominatim coordinates:",
                lat,
                lon
              );

              return {
                lat,
                lon
              };

            }

          }

        } catch (error) {

          console.error(
            "Nominatim request error:",
            error.message
          );

        }

      }

      return null;

    }

    // =======================================================
    // OPENSTREETMAP RESTAURANTS
    // =======================================================

    async function getRestaurantsFromOSM(
      destination
    ) {

      try {

        console.log(
          "======================================"
        );

        console.log(
          "OPENSTREETMAP RESTAURANT SEARCH"
        );

        console.log(
          "Destination:",
          destination
        );

        console.log(
          "======================================"
        );

        // ---------------------------------------------------
        // STEP 1: GEOCODE
        // ---------------------------------------------------

        const coordinates =
          await geocodeDestination(
            destination
          );

        if (!coordinates) {

          console.error(
            "Could not geocode destination:",
            destination
          );

          return [];

        }

        const lat =
          coordinates.lat;

        const lon =
          coordinates.lon;

        // ---------------------------------------------------
        // STEP 2: OVERPASS QUERY
        // ---------------------------------------------------

        const overpassQuery = `
[out:json][timeout:60];

(
  node["amenity"="restaurant"](around:25000,${lat},${lon});
  way["amenity"="restaurant"](around:25000,${lat},${lon});
  relation["amenity"="restaurant"](around:25000,${lat},${lon});

  node["amenity"="fast_food"](around:25000,${lat},${lon});
  way["amenity"="fast_food"](around:25000,${lat},${lon});

  node["amenity"="cafe"](around:25000,${lat},${lon});
  way["amenity"="cafe"](around:25000,${lat},${lon});
);

out center tags;
`;

        // ---------------------------------------------------
        // MULTIPLE OVERPASS SERVERS
        // ---------------------------------------------------

        const overpassServers = [

          "https://overpass-api.de/api/interpreter",

          "https://overpass.kumi.systems/api/interpreter",

          "https://overpass.private.coffee/api/interpreter"

        ];

        let osmData = null;

        for (
          const server
          of overpassServers
        ) {

          try {

            console.log(
              "Trying Overpass server:",
              server
            );

            const response =
              await fetch(
                server,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/x-www-form-urlencoded",
                    "User-Agent":
                      "AI-Life-Planner/1.0 (travel planner)",
                    "Accept":
                      "application/json"
                  },

                  body:
                    "data=" +
                    encodeURIComponent(
                      overpassQuery
                    )
                }
              );

            console.log(
              "Overpass HTTP status:",
              response.status
            );

            if (!response.ok) {

              const errorText =
                await response.text();

              console.error(
                "Overpass failed:",
                errorText.slice(0, 500)
              );

              continue;

            }

            const data =
              await response.json();

            if (
              data &&
              Array.isArray(
                data.elements
              )
            ) {

              osmData =
                data;

              console.log(
                "Overpass success:",
                data.elements.length,
                "elements"
              );

              break;

            }

          } catch (error) {

            console.error(
              "Overpass server error:",
              error.message
            );

          }

        }

        // ---------------------------------------------------
        // NO DATA
        // ---------------------------------------------------

        if (
          !osmData ||
          !Array.isArray(
            osmData.elements
          )
        ) {

          console.error(
            "All Overpass servers failed."
          );

          return [];

        }

        // ---------------------------------------------------
        // STEP 3: NORMALIZE
        // ---------------------------------------------------

        const restaurants = [];

        for (
          const item
          of osmData.elements
        ) {

          const tags =
            item.tags || {};

          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:tr"];

          // Ignore unnamed places

          if (
            !name ||
            !String(name).trim()
          ) {

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
            (
              restaurantLat === undefined ||
              restaurantLon === undefined
            ) &&
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

          if (
            !Number.isFinite(
              restaurantLat
            ) ||
            !Number.isFinite(
              restaurantLon
            )
          ) {

            continue;

          }

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
            tags["addr:suburb"]
          ) {

            addressParts.push(
              tags["addr:suburb"]
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

          let cuisine =
            tags.cuisine ||
            "Local cuisine";

          cuisine =
            String(cuisine)
              .replace(/;/g, ", ");

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

          // -------------------------------------------------
          // OPENSTREETMAP URL
          // -------------------------------------------------

          const osmURL =
            `https://www.openstreetmap.org/?mlat=${restaurantLat}&mlon=${restaurantLon}#map=19/${restaurantLat}/${restaurantLon}`;

          // -------------------------------------------------
          // GOOGLE MAPS NOT REQUIRED
          // -------------------------------------------------

          restaurants.push({

            name:
              String(name).trim(),

            cuisine:
              cuisine,

            priceLevel:
              String(priceLevel),

            rating:
              null,

            address:
              String(address),

            description:
              `${String(name).trim()} is a real local place listed in OpenStreetMap in ${destination}.`,

            imageUrl:
              "",

            mapsUrl:
              osmURL,

            osmUrl:
              osmURL,

            website:
              website,

            phone:
              phone,

            latitude:
              restaurantLat,

            longitude:
              restaurantLon

          });

        }

        // ---------------------------------------------------
        // REMOVE DUPLICATES
        // ---------------------------------------------------

        const uniqueRestaurants = [];

        const restaurantNames =
          new Set();

        for (
          const restaurant
          of restaurants
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

        // ---------------------------------------------------
        // SORT
        // ---------------------------------------------------

        uniqueRestaurants.sort(
          (a, b) => {

            const aHasAddress =
              a.address &&
              a.address !== destination
                ? 1
                : 0;

            const bHasAddress =
              b.address &&
              b.address !== destination
                ? 1
                : 0;

            return (
              bHasAddress -
              aHasAddress
            );

          }
        );

        // ---------------------------------------------------
        // LIMIT 10
        // ---------------------------------------------------

        const result =
          uniqueRestaurants.slice(
            0,
            10
          );

        console.log(
          "======================================"
        );

        console.log(
          "OSM RESTAURANTS RETURNED:",
          result.length
        );

        result.forEach(
          (restaurant, index) => {

            console.log(
              `${index + 1}.`,
              restaurant.name
            );

          }
        );

        console.log(
          "======================================"
        );

        return result;

      } catch (error) {

        console.error(
          "OpenStreetMap restaurant error:",
          error
        );

        return [];

      }

    }

    // =======================================================
    // GET RESTAURANTS
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
    // SUCCESS
    // =======================================================

    console.log(
      "======================================"
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
      "======================================"
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

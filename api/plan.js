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

If you do not know the exact hotel Booking.com page,
create a Booking.com search URL for that hotel and destination.

Do NOT return image URLs.
Hotel images will be obtained separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT generate restaurant names.

Restaurants will be obtained separately from OpenStreetMap.

Return:

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
          hotel => {

            let price = null;

            if (
              hotel.price !== undefined &&
              hotel.price !== null &&
              hotel.price !== ""
            ) {

              const numericPrice =
                Number(
                  hotel.price
                );

              if (
                Number.isFinite(
                  numericPrice
                )
              ) {

                price =
                  numericPrice;

              }

            }

            return {

              name:
                String(
                  hotel.name
                ),

              stars:
                Number(
                  hotel.stars
                ) || 0,

              price,

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

            };

          }
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

        const query =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels hotel search:",
          query
        );

        const response =
          await fetch(
            "https://api.pexels.com/v1/search?query=" +
            encodeURIComponent(query) +
            "&per_page=5",
            {
              method: "GET",

              headers: {
                Authorization:
                  PEXELS_API_KEY
              }
            }
          );

        if (!response.ok) {

          console.error(
            "Pexels HTTP error:",
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
          !Array.isArray(
            data.photos
          ) ||
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
    // HOTEL IMAGES
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
    // OSM CONSTANTS
    // =======================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0 (travel planner application)";

    // =======================================================
    // FETCH JSON WITH TIMEOUT
    // =======================================================

    async function fetchJSON(
      url,
      options = {},
      timeout = 15000
    ) {

      const controller =
        new AbortController();

      const timer =
        setTimeout(
          () => controller.abort(),
          timeout
        );

      try {

        const response =
          await fetch(
            url,
            {
              ...options,
              signal:
                controller.signal
            }
          );

        const text =
          await response.text();

        let data = null;

        try {

          data =
            JSON.parse(text);

        } catch (error) {

          data = null;

        }

        return {
          ok:
            response.ok,

          status:
            response.status,

          data,

          text

        };

      } catch (error) {

        console.error(
          "fetchJSON error:",
          error.message
        );

        return {

          ok: false,

          status: 0,

          data: null,

          text: "",

          error:
            error.message

        };

      } finally {

        clearTimeout(timer);

      }

    }

    // =======================================================
    // NOMINATIM GEOCODING
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
            "&limit=1" +
            "&addressdetails=1" +
            "&q=" +
            encodeURIComponent(query);

          const result =
            await fetchJSON(
              url,
              {
                method: "GET",

                headers: {
                  "User-Agent":
                    OSM_USER_AGENT,

                  "Accept":
                    "application/json"
                }
              },
              12000
            );

          if (
            result.ok &&
            Array.isArray(
              result.data
            ) &&
            result.data.length > 0
          ) {

            const location =
              result.data[0];

            const lat =
              Number(
                location.lat
              );

            const lon =
              Number(
                location.lon
              );

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
            "Nominatim query error:",
            error.message
          );

        }

      }

      return null;

    }

    // =======================================================
    // WIKIMEDIA COMMONS
    // =======================================================

    async function getWikimediaImage(
      commonsValue
    ) {

      try {

        if (
          !commonsValue ||
          typeof commonsValue !== "string"
        ) {

          return "";

        }

        const value =
          commonsValue.trim();

        /*
         * IMPORTANT:
         * We only use an explicitly referenced File.
         *
         * We do NOT search Wikimedia by restaurant name
         * because that could return a photograph of another
         * place with the same/similar name.
         */

        if (
          !/^File:/i.test(value)
        ) {

          return "";

        }

        const apiURL =
          "https://commons.wikimedia.org/w/api.php" +
          "?action=query" +
          "&format=json" +
          "&origin=*" +
          "&prop=imageinfo" +
          "&iiprop=url" +
          "&iiurlwidth=1200" +
          "&titles=" +
          encodeURIComponent(value);

        const result =
          await fetchJSON(
            apiURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  OSM_USER_AGENT
              }
            },
            10000
          );

        if (
          !result.ok ||
          !result.data
        ) {

          return "";

        }

        const pages =
          result.data
            ?.query
            ?.pages;

        if (!pages) {

          return "";

        }

        const page =
          Object.values(
            pages
          )[0];

        const image =
          page
            ?.imageinfo?.[0];

        return (
          image?.thumburl ||
          image?.url ||
          ""
        );

      } catch (error) {

        console.error(
          "Wikimedia image error:",
          error.message
        );

        return "";

      }

    }

    // =======================================================
    // WIKIDATA IMAGE
    // =======================================================

    async function getWikidataImage(
      wikidataId
    ) {

      try {

        if (
          !wikidataId ||
          typeof wikidataId !== "string"
        ) {

          return "";

        }

        const id =
          wikidataId.trim();

        if (
          !/^Q\d+$/i.test(id)
        ) {

          return "";

        }

        const apiURL =
          "https://www.wikidata.org/w/api.php" +
          "?action=wbgetentities" +
          "&format=json" +
          "&origin=*" +
          "&props=claims" +
          "&ids=" +
          encodeURIComponent(id);

        const result =
          await fetchJSON(
            apiURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  OSM_USER_AGENT
              }
            },
            10000
          );

        if (
          !result.ok ||
          !result.data
        ) {

          return "";

        }

        const entity =
          result.data
            ?.entities?.[id];

        const imageClaims =
          entity
            ?.claims
            ?.P18;

        if (
          !Array.isArray(
            imageClaims
          ) ||
          imageClaims.length === 0
        ) {

          return "";

        }

        const imageValue =
          imageClaims[0]
            ?.mainsnak
            ?.datavalue
            ?.value;

        if (
          !imageValue ||
          typeof imageValue !== "string"
        ) {

          return "";

        }

        return await getWikimediaImage(
          "File:" +
          imageValue
        );

      } catch (error) {

        console.error(
          "Wikidata image error:",
          error.message
        );

        return "";

      }

    }

    // =======================================================
    // RESOLVE VERIFIED RESTAURANT IMAGE
    // =======================================================

    async function resolveRestaurantImage(
      tags
    ) {

      try {

        /*
         * 1. IMAGE DIRECTLY ATTACHED TO OSM
         */

        const directImage =
          tags.image ||
          tags.photo ||
          tags.picture ||
          tags["url:photo"] ||
          "";

        if (
          directImage &&
          /^https?:\/\//i.test(
            String(
              directImage
            )
          )
        ) {

          return {

            imageUrl:
              String(
                directImage
              ),

            imageSource:
              "OpenStreetMap",

            imageAttribution:
              "Image linked in OpenStreetMap"

          };

        }

        /*
         * 2. WIKIMEDIA COMMONS
         */

        const commons =
          tags.wikimedia_commons ||
          "";

        if (commons) {

          const image =
            await getWikimediaImage(
              commons
            );

          if (image) {

            return {

              imageUrl:
                image,

              imageSource:
                "Wikimedia Commons",

              imageAttribution:
                "Wikimedia Commons"

            };

          }

        }

        /*
         * 3. WIKIDATA
         */

        const wikidata =
          tags.wikidata ||
          "";

        if (wikidata) {

          const image =
            await getWikidataImage(
              wikidata
            );

          if (image) {

            return {

              imageUrl:
                image,

              imageSource:
                "Wikimedia Commons via Wikidata",

              imageAttribution:
                "Wikimedia Commons"

            };

          }

        }

        /*
         * NO VERIFIED IMAGE
         */

        return {

          imageUrl:
            "",

          imageSource:
            "",

          imageAttribution:
            ""

        };

      } catch (error) {

        console.error(
          "Restaurant image resolver error:",
          error.message
        );

        return {

          imageUrl:
            "",

          imageSource:
            "",

          imageAttribution:
            ""

        };

      }

    }

    // =======================================================
    // OVERPASS SERVERS
    // =======================================================

    const OVERPASS_SERVERS = [

      "https://overpass-api.de/api/interpreter",

      "https://overpass.kumi.systems/api/interpreter",

      "https://overpass.private.coffee/api/interpreter"

    ];

    // =======================================================
    // GET RESTAURANTS FROM OPENSTREETMAP
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
        // GEOCODE
        // ---------------------------------------------------

        const coordinates =
          await geocodeDestination(
            destination
          );

        if (!coordinates) {

          console.error(
            "Could not geocode destination."
          );

          return [];

        }

        const lat =
          coordinates.lat;

        const lon =
          coordinates.lon;

        // ---------------------------------------------------
        // OVERPASS QUERY
        // ---------------------------------------------------

        /*
         * We use 12km first.
         *
         * This is lighter than a huge city-wide query
         * and much less likely to timeout.
         */

        const overpassQuery = `
[out:json][timeout:25];

(
  node["amenity"="restaurant"](around:12000,${lat},${lon});
  way["amenity"="restaurant"](around:12000,${lat},${lon});
  relation["amenity"="restaurant"](around:12000,${lat},${lon});
);

out center tags;
`;

        let osmData = null;

        // ---------------------------------------------------
        // TRY MULTIPLE OVERPASS SERVERS
        // ---------------------------------------------------

        for (
          const server
          of OVERPASS_SERVERS
        ) {

          console.log(
            "Trying Overpass server:",
            server
          );

          try {

            const result =
              await fetchJSON(
                server,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/x-www-form-urlencoded",

                    "User-Agent":
                      OSM_USER_AGENT,

                    "Accept":
                      "application/json"
                  },

                  body:
                    "data=" +
                    encodeURIComponent(
                      overpassQuery
                    )

                },
                30000
              );

            console.log(
              "Overpass status:",
              result.status
            );

            if (
              result.ok &&
              result.data &&
              Array.isArray(
                result.data.elements
              )
            ) {

              osmData =
                result.data;

              console.log(
                "Overpass success:",
                server
              );

              break;

            }

            console.error(
              "Overpass failed:",
              server,
              result.status
            );

          } catch (error) {

            console.error(
              "Overpass server error:",
              server,
              error.message
            );

          }

        }

        // ---------------------------------------------------
        // NO OVERPASS RESULT
        // ---------------------------------------------------

        if (
          !osmData ||
          !Array.isArray(
            osmData.elements
          )
        ) {

          console.error(
            "ALL OVERPASS SERVERS FAILED."
          );

          return [];

        }

        console.log(
          "OSM total elements:",
          osmData.elements.length
        );

        // ---------------------------------------------------
        // NORMALIZE
        // ---------------------------------------------------

        const restaurants = [];

        for (
          const item
          of osmData.elements
        ) {

          const tags =
            item.tags || {};

          /*
           * Only restaurants with an actual name.
           */

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

          // -------------------------------------------------
          // ADDRESS
          // -------------------------------------------------

          const addressParts = [];

          const addressFields = [

            "addr:housenumber",

            "addr:street",

            "addr:suburb",

            "addr:neighbourhood",

            "addr:district",

            "addr:city"

          ];

          for (
            const field
            of addressFields
          ) {

            if (
              tags[field]
            ) {

              addressParts.push(
                tags[field]
              );

            }

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
            tags["price_range"] ||
            tags["price:range"] ||
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
          // OPENING HOURS
          // -------------------------------------------------

          const openingHours =
            tags.opening_hours ||
            "";

          // -------------------------------------------------
          // OSM RATING
          // -------------------------------------------------

          let rating =
            null;

          const ratingFields = [

            "rating",

            "stars",

            "rating:average"

          ];

          for (
            const field
            of ratingFields
          ) {

            if (
              tags[field] !== undefined
            ) {

              const numericRating =
                Number(
                  tags[field]
                );

              if (
                Number.isFinite(
                  numericRating
                ) &&
                numericRating > 0
              ) {

                rating =
                  numericRating;

                break;

              }

            }

          }

          // -------------------------------------------------
          // REVIEW COUNT
          // -------------------------------------------------

          let reviewCount =
            null;

          const reviewFields = [

            "review:count",

            "reviews",

            "review_count"

          ];

          for (
            const field
            of reviewFields
          ) {

            if (
              tags[field]
            ) {

              const numericReviews =
                Number(
                  String(
                    tags[field]
                  ).replace(
                    /[^\d]/g,
                    ""
                  )
                );

              if (
                Number.isFinite(
                  numericReviews
                ) &&
                numericReviews > 0
              ) {

                reviewCount =
                  numericReviews;

                break;

              }

            }

          }

          // -------------------------------------------------
          // GOOGLE MAPS
          // -------------------------------------------------

          let mapsUrl = "";

          if (
            Number.isFinite(
              Number(
                restaurantLat
              )
            ) &&
            Number.isFinite(
              Number(
                restaurantLon
              )
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

          // -------------------------------------------------
          // OPENSTREETMAP URL
          // -------------------------------------------------

          let osmUrl = "";

          if (
            item.type &&
            item.id
          ) {

            osmUrl =
              "https://www.openstreetmap.org/" +
              encodeURIComponent(
                item.type
              ) +
              "/" +
              encodeURIComponent(
                item.id
              );

          }

          // -------------------------------------------------
          // VERIFIED IMAGE
          // -------------------------------------------------

          const imageData =
            await resolveRestaurantImage(
              tags
            );

          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          let description =
            `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`;

          if (
            cuisine &&
            cuisine !== "Local cuisine"
          ) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }

          // -------------------------------------------------
          // ADD RESTAURANT
          // -------------------------------------------------

          restaurants.push({

            name:
              String(name),

            cuisine:
              String(cuisine),

            priceLevel:
              String(priceLevel),

            rating,

            reviewCount,

            address:
              String(address),

            description,

            imageUrl:
              imageData.imageUrl ||
              "",

            imageSource:
              imageData.imageSource ||
              "",

            imageAttribution:
              imageData.imageAttribution ||
              "",

            mapsUrl,

            osmUrl,

            website:
              String(website || ""),

            phone:
              String(phone || ""),

            openingHours:
              String(
                openingHours || ""
              ),

            latitude:
              Number.isFinite(
                Number(
                  restaurantLat
                )
              )
                ? Number(
                    restaurantLat
                  )
                : null,

            longitude:
              Number.isFinite(
                Number(
                  restaurantLon
                )
              )
                ? Number(
                    restaurantLon
                  )
                : null,

            osmType:
              item.type ||
              "",

            osmId:
              item.id ||
              null

          });

          /*
           * Collect enough options.
           */

          if (
            restaurants.length >= 30
          ) {

            break;

          }

        }

        console.log(
          "Named OSM restaurants:",
          restaurants.length
        );

        // ---------------------------------------------------
        // REMOVE DUPLICATES
        // ---------------------------------------------------

        const uniqueRestaurants = [];

        const restaurantKeys =
          new Set();

        for (
          const restaurant
          of restaurants
        ) {

          const key =
            restaurant.name
              .toLowerCase()
              .replace(
                /\s+/g,
                " "
              )
              .trim();

          if (
            !restaurantKeys.has(
              key
            )
          ) {

            restaurantKeys.add(
              key
            );

            uniqueRestaurants.push(
              restaurant
            );

          }

        }

        // ---------------------------------------------------
        // SORT
        // ---------------------------------------------------

        /*
         * Prefer:
         *
         * 1. restaurants with verified image
         * 2. restaurants with rating
         * 3. normal restaurants
         *
         * We NEVER create a fake image.
         */

        uniqueRestaurants.sort(
          (a, b) => {

            const aImage =
              a.imageUrl
                ? 1
                : 0;

            const bImage =
              b.imageUrl
                ? 1
                : 0;

            if (
              bImage !==
              aImage
            ) {

              return (
                bImage -
                aImage
              );

            }

            const aRating =
              Number(a.rating) ||
              0;

            const bRating =
              Number(b.rating) ||
              0;

            return (
              bRating -
              aRating
            );

          }
        );

        // ---------------------------------------------------
        // FINAL 10
        // ---------------------------------------------------

        const finalRestaurants =
          uniqueRestaurants.slice(
            0,
            10
          );

        console.log(
          "Final OSM restaurants:",
          finalRestaurants.length
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
    // RESTAURANT FALLBACK STATUS
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
      "======================================"
    );

    console.error(
      "PLAN API CRITICAL ERROR:",
      error
    );

    console.error(
      "======================================"
    );

    return res.status(500).json({

      error:
        "Server error while generating travel plan.",

      details:
        error.message

    });

  }

};

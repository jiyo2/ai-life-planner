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

    // =======================================================
    // INPUT
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
    // ENVIRONMENT
    // =======================================================

    const GROQ_API_KEY =
      process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error:
          "Groq API key is missing. Add GROQ_API_KEY to Vercel Environment Variables."
      });
    }


    // =======================================================
    // BOOKING.COM
    // =======================================================
    //
    // These are optional.
    //
    // Add to Vercel later:
    //
    // BOOKING_API_KEY
    // BOOKING_AFFILIATE_ID
    //
    // Without them the app continues working with OSM.
    //

    const BOOKING_API_KEY =
      process.env.BOOKING_API_KEY || "";

    const BOOKING_AFFILIATE_ID =
      process.env.BOOKING_AFFILIATE_ID || "";

    const BOOKING_ENABLED =
      !!(
        BOOKING_API_KEY &&
        BOOKING_AFFILIATE_ID
      );


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
    // NORMALIZATION
    // =======================================================

    const safeDestination =
      String(destination)
        .trim()
        .slice(0, 120);

    const safeDays =
      Math.max(
        1,
        Math.min(
          Number(days) || 1,
          14
        )
      );

    const safeBudget =
      Number(budget) || 0;

    const safeTravelers =
      String(travelers)
        .trim()
        .slice(0, 80);

    const safeInterests =
      String(
        interests ||
        "General sightseeing"
      )
        .trim()
        .slice(0, 300);

    const safeNotes =
      String(notes || "")
        .trim()
        .slice(0, 300);

    const safeStartDate =
      String(
        startDate ||
        "Flexible"
      )
        .trim()
        .slice(0, 80);


    // =======================================================
    // GROQ CONFIG
    // =======================================================

    const GROQ_MODEL =
      "openai/gpt-oss-20b";

    const GROQ_URL =
      "https://api.groq.com/openai/v1/chat/completions";


    // =======================================================
    // OSM
    // =======================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";


    // =======================================================
    // TRAVEL PROMPT
    // =======================================================

    const prompt = `
Create a detailed and realistic travel plan.

Destination: ${safeDestination}
Start date: ${safeStartDate}
Days: ${safeDays}
Budget: ${safeBudget} USD
Travelers: ${safeTravelers}
Interests: ${safeInterests}
Notes: ${safeNotes || "None"}

IMPORTANT:
- Do not invent hotels.
- Do not invent restaurants.
- Hotels and restaurants are retrieved separately.
- Do not create hotel names.
- Do not create restaurant names.
- Do not create image URLs.
- Do not create fake booking prices.
- Give useful practical transportation advice.
- Give detailed sightseeing suggestions.
- Give realistic activities.
- Give realistic shopping suggestions.
- Give realistic food suggestions without inventing restaurant names.
- Explain approximate costs where appropriate.
- Flights should be mentioned separately.
- Do not assume flights are included in the budget.
- Make the itinerary detailed.
- Every day must have a meaningful morning, afternoon and evening.
- Avoid repeating the same generic sentence.
- Use the destination and interests to customize every day.
- Return HTML inside string fields.
- Return valid JSON only.

JSON structure:

{
  "transport": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "experiences": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "money": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "daysPlan": [
    {
      "day": 1,
      "title": "Day 1 title",
      "morning": "<h4>Morning</h4><p>Detailed activity...</p>",
      "afternoon": "<h4>Afternoon</h4><p>Detailed activity...</p>",
      "evening": "<h4>Evening</h4><p>Detailed activity...</p>"
    }
  ]
}

The daysPlan array MUST contain exactly ${safeDays} days.
`;


    // =======================================================
    // FETCH WITH TIMEOUT
    // =======================================================

    function fetchWithTimeout(
      url,
      options = {},
      timeoutMs = 9000
    ) {

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          timeoutMs
        );

      return fetch(
        url,
        {
          ...options,
          signal:
            controller.signal
        }
      ).finally(
        () => clearTimeout(timeout)
      );

    }


    // =======================================================
    // GROQ
    // =======================================================

    async function generateWithGroq() {

      console.log(
        "Calling Groq..."
      );

      let response;

      try {

        response =
          await fetchWithTimeout(
            GROQ_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Authorization":
                  "Bearer " +
                  GROQ_API_KEY
              },

              body:
                JSON.stringify({

                  model:
                    GROQ_MODEL,

                  messages: [

                    {
                      role: "system",

                      content:
                        "You are a detailed travel planner. Return valid JSON only. Never invent hotels or restaurants."
                    },

                    {
                      role: "user",

                      content:
                        prompt
                    }

                  ],

                  temperature:
                    0.2,

                  max_completion_tokens:
                    4500,

                  response_format: {
                    type:
                      "json_object"
                  }

                })
            },
            15000
          );

      } catch (error) {

        console.error(
          "Groq network/timeout error:",
          error.message
        );

        throw new Error(
          "Could not connect to Groq: " +
          error.message
        );

      }


      const text =
        await response.text();


      console.log(
        "Groq HTTP status:",
        response.status
      );


      if (!response.ok) {

        console.error(
          "GROQ ERROR:",
          text
        );

        let message =
          "Groq API request failed.";

        try {

          const parsed =
            JSON.parse(text);

          message =
            parsed?.error?.message ||
            message;

        } catch {
          // Ignore.
        }


        if (
          response.status ===
          429
        ) {

          throw new Error(
            "Groq rate limit reached. Please wait and try again."
          );

        }


        throw new Error(
          message
        );

      }


      let data;

      try {

        data =
          JSON.parse(text);

      } catch {

        throw new Error(
          "Groq returned an invalid response."
        );

      }


      const content =
        data?.choices?.[0]?.message?.content;


      if (!content) {

        throw new Error(
          "Groq returned an empty response."
        );

      }


      return content;

    }


    // =======================================================
    // JSON PARSER
    // =======================================================

    function parseAIJSON(value) {

      if (
        typeof value === "object" &&
        value !== null
      ) {

        return value;

      }


      let text =
        String(value || "")
          .trim();


      text =
        text.replace(
          /^```json\s*/i,
          ""
        );

      text =
        text.replace(
          /^```\s*/i,
          ""
        );

      text =
        text.replace(
          /\s*```$/i,
          ""
        );

      text =
        text.trim();


      try {

        return JSON.parse(text);

      } catch {
        // Continue.
      }


      const first =
        text.indexOf("{");

      const last =
        text.lastIndexOf("}");


      if (
        first !== -1 &&
        last !== -1 &&
        last > first
      ) {

        const candidate =
          text.slice(
            first,
            last + 1
          );

        try {

          return JSON.parse(
            candidate
          );

        } catch {
          // Continue.
        }

      }


      throw new Error(
        "Groq returned invalid travel plan JSON."
      );

    }


    // =======================================================
    // GEOCODE DESTINATION
    // =======================================================

    async function geocodeDestination(
      placeName
    ) {

      try {

        const url =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json" +
          "&limit=1" +
          "&q=" +
          encodeURIComponent(
            placeName
          );


        const response =
          await fetchWithTimeout(
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
            7000
          );


        if (!response.ok) {

          return null;

        }


        const data =
          await response.json();


        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {

          return null;

        }


        const lat =
          Number(
            data[0].lat
          );

        const lon =
          Number(
            data[0].lon
          );


        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {

          return null;

        }


        return {
          lat,
          lon
        };

      } catch (error) {

        console.error(
          "Nominatim error:",
          error.message
        );

        return null;

      }

    }


    // =======================================================
    // NORMALIZE NAME
    // =======================================================

    function normalizeName(
      value
    ) {

      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^\p{L}\p{N}]+/gu,
          " "
        )
        .trim();

    }


    // =======================================================
    // IMAGE URL
    // =======================================================

    function normalizeImageUrl(
      value
    ) {

      if (!value) {
        return "";
      }

      const url =
        String(value)
          .trim();


      if (
        !/^https?:\/\//i.test(
          url
        )
      ) {

        return "";

      }


      return url;

    }


    // =======================================================
    // WIKIMEDIA IMAGE
    // =======================================================

    function getWikimediaImage(
      value
    ) {

      if (!value) {
        return "";
      }


      const raw =
        String(value)
          .trim();


      if (
        /^https?:\/\//i.test(
          raw
        )
      ) {

        return raw;

      }


      const filename =
        raw
          .replace(
            /^File:/i,
            ""
          )
          .trim();


      if (!filename) {
        return "";
      }


      return (
        "https://commons.wikimedia.org/wiki/Special:FilePath/" +
        encodeURIComponent(
          filename
        )
      );

    }


    // =======================================================
    // OSM IMAGE
    // =======================================================

    function getOSMImage(
      tags
    ) {

      const directImage =
        normalizeImageUrl(
          tags?.image
        );


      if (directImage) {
        return directImage;
      }


      const wikimedia =
        tags?.wikimedia_commons ||
        tags?.["wikimedia_commons:image"] ||
        tags?.["wikimedia_commons"];


      if (wikimedia) {

        return getWikimediaImage(
          wikimedia
        );

      }


      return "";

    }


    // =======================================================
    // OSM COORDINATES
    // =======================================================

    function getElementCoordinates(
      item
    ) {

      let lat =
        item?.lat;

      let lon =
        item?.lon;


      if (
        lat === undefined &&
        item?.center
      ) {

        lat =
          item.center.lat;

        lon =
          item.center.lon;

      }


      lat =
        Number(lat);

      lon =
        Number(lon);


      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {

        return {
          lat: null,
          lon: null
        };

      }


      return {
        lat,
        lon
      };

    }


    // =======================================================
    // OSM ADDRESS
    // =======================================================

    function getOSMAddress(
      tags,
      fallback
    ) {

      const parts = [];


      const fields = [
        "addr:housenumber",
        "addr:street",
        "addr:suburb",
        "addr:district",
        "addr:city"
      ];


      for (
        const field of fields
      ) {

        if (tags?.[field]) {

          parts.push(
            String(
              tags[field]
            )
          );

        }

      }


      return parts.length
        ? parts.join(", ")
        : fallback;

    }


    // =======================================================
    // GOOGLE MAPS URL
    // =======================================================

    function buildMapsUrl(
      name,
      destination,
      lat,
      lon
    ) {

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lon)
      ) {

        return (
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(
            `${lat},${lon}`
          )
        );

      }


      return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(
          `${name} ${destination}`
        )
      );

    }


    // =======================================================
    // OSM URL
    // =======================================================

    function buildOSMUrl(
      item
    ) {

      if (
        !item?.type ||
        !item?.id
      ) {

        return "";

      }


      return (
        "https://www.openstreetmap.org/" +
        encodeURIComponent(
          item.type
        ) +
        "/" +
        encodeURIComponent(
          item.id
        )
      );

    }


    // =======================================================
    // GET OSM PLACES
    // =======================================================

    async function getOSMPlaces(
      placeName
    ) {

      try {

        console.log(
          "Starting OpenStreetMap search..."
        );


        const geo =
          await geocodeDestination(
            placeName
          );


        if (!geo) {

          return {
            hotels: [],
            restaurants: []
          };

        }


        const {
          lat,
          lon
        } = geo;


        const overpassQuery = `
[out:json][timeout:20];
(
  nwr["tourism"="hotel"](around:12000,${lat},${lon});
  nwr["tourism"="hostel"](around:12000,${lat},${lon});
  nwr["tourism"="guest_house"](around:12000,${lat},${lon});
  nwr["amenity"="restaurant"](around:12000,${lat},${lon});
);
out center tags;
`;


        const overpassURL =
          "https://overpass-api.de/api/interpreter";


        const response =
          await fetchWithTimeout(
            overpassURL,
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
            12000
          );


        if (!response.ok) {

          console.error(
            "Overpass HTTP:",
            response.status
          );

          return {
            hotels: [],
            restaurants: []
          };

        }


        const data =
          await response.json();


        if (
          !data ||
          !Array.isArray(
            data.elements
          )
        ) {

          return {
            hotels: [],
            restaurants: []
          };

        }


        const hotels = [];
        const restaurants = [];


        const hotelNames =
          new Set();

        const restaurantNames =
          new Set();


        // ===================================================
        // PROCESS OSM
        // ===================================================

        for (
          const item of data.elements
        ) {

          const tags =
            item.tags || {};


          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:tr"];


          if (!name) {
            continue;
          }


          const coordinates =
            getElementCoordinates(
              item
            );


          const itemLat =
            coordinates.lat;

          const itemLon =
            coordinates.lon;


          const osmUrl =
            buildOSMUrl(
              item
            );


          const mapsUrl =
            buildMapsUrl(
              name,
              placeName,
              itemLat,
              itemLon
            );


          const imageUrl =
            getOSMImage(
              tags
            );


          // =================================================
          // HOTELS
          // =================================================

          const tourism =
            tags.tourism;


          const isHotel =
            tourism === "hotel" ||
            tourism === "hostel" ||
            tourism === "guest_house";


          if (isHotel) {

            const normalized =
              normalizeName(
                name
              );


            if (
              normalized &&
              !hotelNames.has(
                normalized
              )
            ) {

              hotelNames.add(
                normalized
              );


              let stars =
                Number(
                  tags.stars
                );


              if (
                !Number.isFinite(
                  stars
                )
              ) {

                stars =
                  Number(
                    tags["stars:number"]
                  );

              }


              if (
                !Number.isFinite(
                  stars
                )
              ) {

                stars = 0;

              }


              const amenities = [];


              if (
                tags.internet_access
              ) {

                amenities.push(
                  "Wi-Fi"
                );

              }


              if (
                tags.air_conditioning ===
                "yes"
              ) {

                amenities.push(
                  "Air Conditioning"
                );

              }


              if (
                tags.breakfast ===
                "yes"
              ) {

                amenities.push(
                  "Breakfast"
                );

              }


              if (
                tags.pool ===
                "yes"
              ) {

                amenities.push(
                  "Swimming Pool"
                );

              }


              if (
                tags.parking ===
                "yes"
              ) {

                amenities.push(
                  "Parking"
                );

              }


              if (
                tags.restaurant ===
                "yes"
              ) {

                amenities.push(
                  "Restaurant"
                );

              }


              const hotelType =
                tourism === "hostel"
                  ? "Hostel"
                  : tourism === "guest_house"
                    ? "Guest house"
                    : "Hotel";


              hotels.push({

                name:
                  String(name),

                stars,

                // IMPORTANT:
                // No fake price.
                price:
                  null,

                currency:
                  "USD",

                priceType:
                  "Live price unavailable",

                amenities:
                  amenities.slice(
                    0,
                    6
                  ),

                description:
                  String(
                    tags.description ||
                    `${name} is a real ${hotelType.toLowerCase()} listed in OpenStreetMap.`
                  ),

                bookingUrl:
                  "https://www.booking.com/searchresults.html?ss=" +
                  encodeURIComponent(
                    `${name} ${placeName}`
                  ),

                imageUrl,

                image:
                  imageUrl,

                imageSource:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                mapsUrl,

                osmUrl,

                latitude:
                  itemLat,

                longitude:
                  itemLon,

                osmType:
                  item.type || "",

                osmId:
                  item.id || null

              });

            }

          }


          // =================================================
          // RESTAURANTS
          // =================================================

          if (
            tags.amenity ===
            "restaurant"
          ) {

            const normalized =
              normalizeName(
                name
              );


            if (
              normalized &&
              !restaurantNames.has(
                normalized
              )
            ) {

              restaurantNames.add(
                normalized
              );


              const cuisine =
                tags.cuisine ||
                "Local cuisine";


              const priceLevel =
                tags["price:level"] ||
                tags.price_range ||
                "$$";


              const numericRating =
                Number(
                  tags.rating
                );


              const rating =
                Number.isFinite(
                  numericRating
                )
                  ? numericRating
                  : null;


              const reviewCountNumber =
                Number(
                  tags["review:count"]
                );


              const reviewCount =
                Number.isFinite(
                  reviewCountNumber
                )
                  ? reviewCountNumber
                  : null;


              const address =
                getOSMAddress(
                  tags,
                  placeName
                );


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

                description:
                  String(
                    tags.description ||
                    `${name} is a real local restaurant in ${placeName}, listed in OpenStreetMap.`
                  ),

                imageUrl,

                image:
                  imageUrl,

                imageSource:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                mapsUrl,

                osmUrl,

                website:
                  tags.website ||
                  tags["contact:website"] ||
                  "",

                phone:
                  tags.phone ||
                  tags["contact:phone"] ||
                  "",

                openingHours:
                  tags.opening_hours ||
                  "",

                latitude:
                  itemLat,

                longitude:
                  itemLon,

                osmType:
                  item.type || "",

                osmId:
                  item.id || null

              });

            }

          }

        }


        // ===================================================
        // SORT HOTELS
        // ===================================================

        hotels.sort(
          (a, b) => {

            const aImage =
              a.imageUrl ? 1 : 0;

            const bImage =
              b.imageUrl ? 1 : 0;


            if (
              bImage !==
              aImage
            ) {

              return (
                bImage -
                aImage
              );

            }


            return (
              (Number(b.stars) || 0) -
              (Number(a.stars) || 0)
            );

          }
        );


        // ===================================================
        // SORT RESTAURANTS
        // ===================================================

        restaurants.sort(
          (a, b) => {

            const aImage =
              a.imageUrl ? 1 : 0;

            const bImage =
              b.imageUrl ? 1 : 0;


            if (
              bImage !==
              aImage
            ) {

              return (
                bImage -
                aImage
              );

            }


            return (
              (Number(b.rating) || 0) -
              (Number(a.rating) || 0)
            );

          }
        );


        console.log(
          "OSM hotels:",
          hotels.length
        );

        console.log(
          "OSM hotel photos:",
          hotels.filter(
            h => !!h.imageUrl
          ).length
        );

        console.log(
          "OSM restaurants:",
          restaurants.length
        );

        console.log(
          "OSM restaurant photos:",
          restaurants.filter(
            r => !!r.imageUrl
          ).length
        );


        return {

          hotels:
            hotels.slice(
              0,
              10
            ),

          restaurants:
            restaurants.slice(
              0,
              15
            )

        };

      } catch (error) {

        console.error(
          "OSM search error:",
          error.message
        );

        return {
          hotels: [],
          restaurants: []
        };

      }

    }


    // =======================================================
    // BOOKING.COM CITY SEARCH
    // =======================================================
    //
    // Booking requires a Booking.com city ID.
    //
    // We try to find it dynamically.
    //

    async function findBookingCity(
      placeName
    ) {

      if (!BOOKING_ENABLED) {
        return null;
      }


      try {

        const url =
          "https://demandapi.booking.com/3.1/common/locations/cities";


        const response =
          await fetchWithTimeout(
            url,
            {
              method: "POST",

              headers: {

                "Authorization":
                  "Bearer " +
                  BOOKING_API_KEY,

                "X-Affiliate-Id":
                  String(
                    BOOKING_AFFILIATE_ID
                  ),

                "Content-Type":
                  "application/json",

                "Accept":
                  "application/json"

              },

              body:
                JSON.stringify({

                  country:
                    "tr",

                  languages: [
                    "en"
                  ],

                  maximum_results:
                    100

                })

            },
            9000
          );


        if (!response.ok) {

          console.error(
            "Booking city lookup HTTP:",
            response.status
          );

          return null;

        }


        const data =
          await response.json();


        const items =
          Array.isArray(
            data?.data
          )
            ? data.data
            : [];


        const wanted =
          normalizeName(
            placeName
          );


        // Exact match first.

        let match =
          items.find(
            item =>
              normalizeName(
                item?.name
              ) === wanted
          );


        // Contains match.

        if (!match) {

          match =
            items.find(
              item => {

                const itemName =
                  normalizeName(
                    item?.name
                  );

                return (
                  itemName.includes(
                    wanted
                  ) ||
                  wanted.includes(
                    itemName
                  )
                );

              }
            );

        }


        if (!match) {

          return null;

        }


        return (
          match?.id ||
          match?.city ||
          null
        );

      } catch (error) {

        console.error(
          "Booking city lookup error:",
          error.message
        );

        return null;

      }

    }


    // =======================================================
    // PARSE TRAVELERS
    // =======================================================

    function parseAdultCount(
      value
    ) {

      const text =
        String(value || "")
          .toLowerCase();


      const match =
        text.match(
          /\d+/
        );


      if (!match) {
        return 2;
      }


      const count =
        Number(
          match[0]
        );


      if (
        !Number.isFinite(count)
      ) {

        return 2;

      }


      return Math.max(
        1,
        Math.min(
          count,
          12
        )
      );

    }


    // =======================================================
    // PARSE START DATE
    // =======================================================

    function getCheckinDate(
      value
    ) {

      if (
        !value ||
        value ===
        "Flexible"
      ) {

        return null;

      }


      const date =
        new Date(
          String(value)
        );


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return null;

      }


      return date;

    }


    // =======================================================
    // FORMAT YYYY-MM-DD
    // =======================================================

    function formatDate(
      date
    ) {

      const year =
        date.getFullYear();

      const month =
        String(
          date.getMonth() + 1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          date.getDate()
        ).padStart(
          2,
          "0"
        );


      return (
        `${year}-${month}-${day}`
      );

    }


    // =======================================================
    // BOOKING PRICE EXTRACTION
    // =======================================================

    function extractBookingPrice(
      accommodation
    ) {

      const price =
        accommodation?.price;


      if (!price) {
        return null;
      }


      let amount = null;


      if (
        typeof price ===
        "number"
      ) {

        amount =
          price;

      }


      if (
        typeof price ===
        "object"
      ) {

        const candidates = [

          price.total,

          price.book,

          price.base,

          price.display,

          price.amount

        ];


        for (
          const candidate
          of candidates
        ) {

          if (
            typeof candidate ===
            "number"
          ) {

            amount =
              candidate;

            break;

          }


          if (
            typeof candidate ===
            "string"
          ) {

            const numeric =
              Number(
                candidate
              );


            if (
              Number.isFinite(
                numeric
              )
            ) {

              amount =
                numeric;

              break;

            }

          }


          if (
            typeof candidate ===
            "object" &&
            candidate !== null
          ) {

            const nested =
              Number(
                candidate.amount ??
                candidate.value ??
                candidate.total
              );


            if (
              Number.isFinite(
                nested
              )
            ) {

              amount =
                nested;

              break;

            }

          }

        }

      }


      if (
        !Number.isFinite(
          Number(amount)
        )
      ) {

        return null;

      }


      return Number(
        amount
      );

    }


    // =======================================================
    // BOOKING.COM HOTEL SEARCH
    // =======================================================
    //
    // This ONLY adds live pricing.
    //
    // OSM remains the source for hotel identity,
    // restaurant identity and OSM photos.
    //

    async function getBookingPrices(
      placeName,
      checkin,
      checkout,
      adults
    ) {

      if (!BOOKING_ENABLED) {

        console.log(
          "Booking.com pricing disabled: credentials not configured."
        );

        return [];

      }


      if (
        !checkin ||
        !checkout
      ) {

        console.log(
          "Booking.com pricing skipped: no valid dates."
        );

        return [];

      }


      try {

        const cityId =
          await findBookingCity(
            placeName
          );


        if (!cityId) {

          console.log(
            "Booking.com city ID not found for:",
            placeName
          );

          return [];

        }


        console.log(
          "Booking.com city ID:",
          cityId
        );


        const url =
          "https://demandapi.booking.com/3.1/accommodations/search";


        const body = {

          city:
            Number(cityId),

          booker: {

            country:
              "tr",

            platform:
              "mobile"

          },

          checkin:
            formatDate(
              checkin
            ),

          checkout:
            formatDate(
              checkout
            ),

          guests: {

            number_of_rooms:
              1,

            number_of_adults:
              adults

          },

          sort: {

            by:
              "price",

            direction:
              "ascending"

          }

        };


        const response =
          await fetchWithTimeout(
            url,
            {
              method: "POST",

              headers: {

                "Authorization":
                  "Bearer " +
                  BOOKING_API_KEY,

                "X-Affiliate-Id":
                  String(
                    BOOKING_AFFILIATE_ID
                  ),

                "Content-Type":
                  "application/json",

                "Accept":
                  "application/json"

              },

              body:
                JSON.stringify(
                  body
                )

            },
            12000
          );


        const text =
          await response.text();


        if (!response.ok) {

          console.error(
            "Booking.com search error:",
            response.status,
            text.slice(
              0,
              2000
            )
          );

          return [];

        }


        let data;


        try {

          data =
            JSON.parse(
              text
            );

        } catch {

          console.error(
            "Booking.com returned invalid JSON."
          );

          return [];

        }


        const results =
          Array.isArray(
            data?.data
          )
            ? data.data
            : [];


        console.log(
          "Booking.com hotels returned:",
          results.length
        );


        return results
          .slice(
            0,
            50
          )
          .map(
            hotel => {

              const amount =
                extractBookingPrice(
                  hotel
                );


              const currency =
                typeof hotel?.currency ===
                "string"
                  ? hotel.currency
                  : (
                      hotel?.currency?.booker ||
                      hotel?.currency?.accommodation ||
                      "USD"
                    );


              return {

                id:
                  hotel?.id ||
                  null,

                name:
                  hotel?.name ||
                  "",

                price:
                  amount,

                currency:
                  currency,

                bookingUrl:
                  hotel?.url ||
                  hotel?.deep_link_url ||
                  "",

                bookingPriceSource:
                  "Booking.com",

                rawPrice:
                  hotel?.price ||
                  null

              };

            }
          );

      } catch (error) {

        console.error(
          "Booking.com pricing error:",
          error.message
        );

        return [];

      }

    }


    // =======================================================
    // MATCH BOOKING PRICES TO OSM HOTELS
    // =======================================================

    function attachBookingPrices(
      hotels,
      bookingHotels
    ) {

      if (
        !Array.isArray(hotels) ||
        !Array.isArray(
          bookingHotels
        )
      ) {

        return hotels;

      }


      if (
        bookingHotels.length === 0
      ) {

        return hotels;

      }


      const bookingMap =
        new Map();


      for (
        const bookingHotel
        of bookingHotels
      ) {

        const key =
          normalizeName(
            bookingHotel?.name
          );


        if (!key) {
          continue;
        }


        bookingMap.set(
          key,
          bookingHotel
        );

      }


      for (
        const hotel
        of hotels
      ) {

        const hotelKey =
          normalizeName(
            hotel?.name
          );


        let booking =
          bookingMap.get(
            hotelKey
          );


        // Try partial matching.

        if (!booking) {

          for (
            const [
              bookingName,
              bookingHotel
            ]
            of bookingMap
          ) {

            if (
              bookingName.includes(
                hotelKey
              ) ||
              hotelKey.includes(
                bookingName
              )
            ) {

              booking =
                bookingHotel;

              break;

            }

          }

        }


        if (
          booking &&
          Number.isFinite(
            Number(
              booking.price
            )
          )
        ) {

          hotel.price =
            Number(
              booking.price
            );

          hotel.currency =
            booking.currency ||
            "USD";

          hotel.priceType =
            "Best available price";

          hotel.bookingPriceSource =
            "Booking.com";


          if (
            booking.bookingUrl
          ) {

            hotel.bookingUrl =
              booking.bookingUrl;

          }

        }

      }


      return hotels;

    }


    // =======================================================
    // RUN GROQ + OSM
    // =======================================================

    console.log(
      "Starting Groq and OpenStreetMap in parallel..."
    );


    const results =
      await Promise.allSettled([

        generateWithGroq(),

        getOSMPlaces(
          safeDestination
        )

      ]);


    const groqResponse =
      results[0];

    const osmResponse =
      results[1];


    // =======================================================
    // GROQ RESULT
    // =======================================================

    if (
      groqResponse.status ===
      "rejected"
    ) {

      console.error(
        "Groq failed:",
        groqResponse.reason
      );


      return res.status(502).json({

        error:
          "The AI travel plan could not be generated.",

        details:
          groqResponse.reason?.message ||
          "Groq request failed."

      });

    }


    const groqResult =
      groqResponse.value;


    // =======================================================
    // OSM RESULT
    // =======================================================

    let osmResult = {

      hotels: [],

      restaurants: []

    };


    if (
      osmResponse.status ===
      "fulfilled"
    ) {

      osmResult =
        osmResponse.value;

    } else {

      console.error(
        "OSM failed:",
        osmResponse.reason
      );

    }


    // =======================================================
    // PARSE AI
    // =======================================================

    let aiPlan;


    try {

      aiPlan =
        parseAIJSON(
          groqResult
        );

    } catch (error) {

      console.error(
        "AI JSON ERROR:",
        error.message
      );

      console.error(
        "AI RAW RESPONSE:",
        String(
          groqResult
        ).slice(
          0,
          5000
        )
      );


      return res.status(500).json({

        error:
          "Groq returned invalid travel plan JSON.",

        details:
          error.message

      });

    }


    // =======================================================
    // NORMALIZE AI SECTIONS
    // =======================================================

    const transport =
      typeof aiPlan.transport ===
      "string"

        ? aiPlan.transport

        : "<p>Transportation information unavailable.</p>";


    const experiences =
      typeof aiPlan.experiences ===
      "string"

        ? aiPlan.experiences

        : "<p>Experience information unavailable.</p>";


    const money =
      typeof aiPlan.money ===
      "string"

        ? aiPlan.money

        : "<p>Budget information unavailable.</p>";


    // =======================================================
    // NORMALIZE DAYS
    // =======================================================

    let daysPlan =
      Array.isArray(
        aiPlan.daysPlan
      )
        ? aiPlan.daysPlan
        : [];


    daysPlan =
      daysPlan
        .slice(
          0,
          safeDays
        )
        .map(
          (day, index) => ({

            day:
              Number(
                day?.day
              ) ||
              index + 1,

            title:
              String(
                day?.title ||
                `Day ${index + 1}`
              ),

            morning:
              String(
                day?.morning ||
                "<p>Explore the destination in the morning.</p>"
              ),

            afternoon:
              String(
                day?.afternoon ||
                "<p>Enjoy local food, sightseeing and shopping.</p>"
              ),

            evening:
              String(
                day?.evening ||
                "<p>Relax and explore a popular evening area.</p>"
              )

          })
        );


    // =======================================================
    // FILL MISSING DAYS
    // =======================================================

    while (
      daysPlan.length <
      safeDays
    ) {

      const index =
        daysPlan.length;


      daysPlan.push({

        day:
          index + 1,

        title:
          `Day ${index + 1}`,

        morning:
          "<p>Explore the destination's main attractions and local area.</p>",

        afternoon:
          "<p>Enjoy local food, shopping and a walking experience.</p>",

        evening:
          "<p>Relax and explore a safe, popular evening area.</p>"

      });

    }


    // =======================================================
    // OSM DATA
    // =======================================================

    let hotels =
      Array.isArray(
        osmResult?.hotels
      )
        ? osmResult.hotels
        : [];


    const restaurants =
      Array.isArray(
        osmResult?.restaurants
      )
        ? osmResult.restaurants
        : [];


    // =======================================================
    // BOOKING LIVE PRICES
    // =======================================================

    //
    // Only if:
    //
    // 1. Booking credentials exist
    // 2. A real start date exists
    //
    // No fake prices are generated.
    //

    if (
      BOOKING_ENABLED
    ) {

      const checkin =
        getCheckinDate(
          safeStartDate
        );


      if (checkin) {

        const checkout =
          new Date(
            checkin.getTime()
          );


        checkout.setDate(
          checkout.getDate() +
          safeDays
        );


        const adults =
          parseAdultCount(
            safeTravelers
          );


        console.log(
          "Getting live Booking.com prices..."
        );


        const bookingHotels =
          await getBookingPrices(
            safeDestination,
            checkin,
            checkout,
            adults
          );


        hotels =
          attachBookingPrices(
            hotels,
            bookingHotels
          );


        console.log(
          "Hotels with live prices:",
          hotels.filter(
            hotel =>
              Number.isFinite(
                Number(
                  hotel.price
                )
              )
          ).length
        );

      } else {

        console.log(
          "No fixed start date. Live hotel pricing skipped."
        );

      }

    }


    // =======================================================
    // FINAL PLAN
    // =======================================================

    const plan = {

      destination:
        safeDestination,

      startDate:
        safeStartDate,

      days:
        safeDays,

      budget:
        safeBudget,

      travelers:
        safeTravelers,

      interests:
        safeInterests,

      transport,

      experiences,

      money,

      daysPlan

    };


    // =======================================================
    // RESPONSE
    // =======================================================

    const responseData = {

      plan,

      hotels,

      hotelSearch: {

        status:
          hotels.length
            ? "success"
            : "no_results",

        source:
          "OpenStreetMap",

        pricingSource:
          BOOKING_ENABLED
            ? "Booking.com when matched"
            : "Not configured"

      },

      restaurants,

      restaurantSearch: {

        status:
          restaurants.length
            ? "success"
            : "no_results",

        source:
          "OpenStreetMap"

      },

      // =====================================================
      // SCRIPT.JS COMPATIBILITY
      // =====================================================

      stay:
        hotels,

      transport,

      experiences,

      money,

      daysPlan

    };


    // =======================================================
    // LOG
    // =======================================================

    console.log(
      "======================================"
    );

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "AI Provider: Groq"
    );

    console.log(
      "Places Provider: OpenStreetMap"
    );

    console.log(
      "Booking pricing enabled:",
      BOOKING_ENABLED
    );

    console.log(
      "Hotels:",
      hotels.length
    );

    console.log(
      "Hotel photos:",
      hotels.filter(
        hotel =>
          !!hotel.imageUrl
      ).length
    );

    console.log(
      "Hotels with prices:",
      hotels.filter(
        hotel =>
          Number.isFinite(
            Number(
              hotel.price
            )
          )
      ).length
    );

    console.log(
      "Restaurants:",
      restaurants.length
    );

    console.log(
      "Restaurant photos:",
      restaurants.filter(
        restaurant =>
          !!restaurant.imageUrl
      ).length
    );

    console.log(
      "Groq model:",
      GROQ_MODEL
    );

    console.log(
      "Foursquare: DISABLED"
    );

    console.log(
      "Gemini: DISABLED"
    );

    console.log(
      "======================================"
    );


    // =======================================================
    // SUCCESS
    // =======================================================

    return res
      .status(200)
      .json(
        responseData
      );


  } catch (error) {

    // =======================================================
    // CRITICAL ERROR
    // =======================================================

    console.error(
      "PLAN API CRITICAL ERROR:",
      error
    );


    return res.status(500).json({

      error:
        "Server error while generating travel plan.",

      details:
        error?.message ||
        "Unknown server error."

    });

  }

};

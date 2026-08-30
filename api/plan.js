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

      console.error(
        "GROQ_API_KEY missing."
      );

      return res.status(500).json({
        error:
          "Groq API key is missing. Add GROQ_API_KEY to Vercel Environment Variables."
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
      String(
        notes || ""
      )
        .trim()
        .slice(0, 300);

    const safeStartDate =
      String(
        startDate ||
        "Flexible"
      )
        .trim()
        .slice(0, 100);


    // =======================================================
    // GROQ CONFIG
    // =======================================================

    const GROQ_MODEL =
      "openai/gpt-oss-20b";

    const GROQ_URL =
      "https://api.groq.com/openai/v1/chat/completions";


    // =======================================================
    // OSM USER AGENT
    // =======================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";


    // =======================================================
    // COMPACT TRAVEL PLAN PROMPT
    //
    // IMPORTANT:
    // This prompt is intentionally compact to stay below
    // Groq's 8000 TPM limit.
    // =======================================================

    const prompt = `
Create a realistic travel plan for this trip.

Destination: ${safeDestination}
Start date: ${safeStartDate}
Days: ${safeDays}
Budget: ${safeBudget} USD
Travelers: ${safeTravelers}
Interests: ${safeInterests}
Notes: ${safeNotes || "None"}

RULES:
- Hotels and restaurants are provided separately by OpenStreetMap.
- Never invent hotel names.
- Never invent restaurant names.
- Never create image URLs.
- Do not mention Foursquare or Gemini.
- Use approximate prices only.
- Never claim uncertain prices are current guaranteed prices.
- Do not invent taxi apps.
- Mention established transport/taxi options only when reasonably known.
- Include practical tourist safety advice.
- Return ONLY valid JSON.
- No markdown.
- No code fences.

TRANSPORT:
Give a useful HTML transportation guide covering airport arrival when relevant, metro/subway, tram, bus, ferry when relevant, walking, taxi, approximate costs, best tourist option, cheapest practical option, safety and avoiding unofficial drivers/scams.

EXPERIENCES:
Give a useful HTML guide covering major attractions, historic/cultural places, scenic places, walking areas, parks, neighborhoods, evening ideas, local food experiences, shopping and relaxing activities.

SHOPPING:
Include markets, shopping streets/malls, souvenirs, local products, bargaining where appropriate and tourist-trap advice.

OUTDOORS:
Include waterfronts when available, parks, viewpoints, scenic streets and relaxing areas.

MONEY:
Give an HTML budget strategy covering accommodation, food, transportation, attractions, shopping, activities and emergency/miscellaneous. Use approximate percentages or amounts. Mention that flights may be separate if appropriate.

DAYS:
Create exactly ${safeDays} days.
Each day MUST contain morning, afternoon and evening.
Group activities geographically.
Avoid unnecessary travel.
Include sightseeing, food, walking, shopping, relaxation and culture when suitable.
Optional nightlife may be included.
Prioritize the most important experiences on short trips.

OUTPUT JSON EXACTLY LIKE THIS:

{
  "transport": "<HTML>",
  "experiences": "<HTML>",
  "money": "<HTML>",
  "daysPlan": [
    {
      "day": 1,
      "title": "Day 1 title",
      "morning": "Morning plan",
      "afternoon": "Afternoon plan",
      "evening": "Evening plan"
    }
  ]
}

The daysPlan array MUST contain exactly ${safeDays} objects.
`;


    // =======================================================
    // TIMEOUT HELPER
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
          () => {
            controller.abort();
          },
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
        () => {
          clearTimeout(timeout);
        }
      );

    }


    // =======================================================
    // GROQ REQUEST
    // =======================================================

    async function generateWithGroq() {

      console.log(
        "Calling Groq with compact prompt..."
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
                      role:
                        "system",

                      content:
                        "You are a professional travel planner. Return JSON only. Follow the requested structure exactly. Keep the response useful but concise."
                    },

                    {
                      role:
                        "user",

                      content:
                        prompt
                    }

                  ],

                  temperature:
                    0.2,

                  // IMPORTANT:
                  // Keep requested completion below
                  // the organization's 8000 TPM limit.
                  max_completion_tokens:
                    5500,

                  response_format: {
                    type:
                      "json_object"
                  },

                  include_reasoning:
                    false

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
            JSON.parse(
              text
            );

          message =
            parsed?.error?.message ||
            message;

        } catch {
          // Keep default.
        }


        if (
          response.status ===
          429
        ) {

          throw new Error(
            "Groq rate limit or token limit reached. Please wait and try again."
          );

        }


        throw new Error(
          message
        );

      }


      let data;

      try {

        data =
          JSON.parse(
            text
          );

      } catch (error) {

        console.error(
          "Invalid Groq HTTP JSON:",
          text
        );

        throw new Error(
          "Groq returned an invalid HTTP response."
        );

      }


      const content =
        data
          ?.choices?.[0]
          ?.message?.content;


      if (!content) {

        console.error(
          "Groq returned no content:",
          JSON.stringify(data)
        );

        throw new Error(
          "Groq returned an empty response."
        );

      }


      return content;

    }


    // =======================================================
    // JSON PARSER
    // =======================================================

    function parseAIJSON(
      value
    ) {

      if (
        typeof value ===
        "object" &&
        value !== null
      ) {

        return value;

      }


      let text =
        String(
          value || ""
        ).trim();


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

        return JSON.parse(
          text
        );

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

          console.error(
            "Nominatim HTTP:",
            response.status
          );

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

      return String(
        value || ""
      )
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
    // SAFE IMAGE URL
    // =======================================================

    function normalizeImageUrl(
      value
    ) {

      if (!value) {
        return "";
      }


      const url =
        String(
          value
        ).trim();


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
        String(
          value
        ).trim();


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
        const field
        of fields
      ) {

        if (
          tags?.[field]
        ) {

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


        const coordinates =
          await geocodeDestination(
            placeName
          );


        if (!coordinates) {

          console.error(
            "Could not geocode destination."
          );

          return {
            hotels: [],
            restaurants: []
          };

        }


        const {
          lat,
          lon
        } =
          coordinates;


        console.log(
          "OSM coordinates:",
          lat,
          lon
        );


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


        console.log(
          "OSM total places:",
          data.elements.length
        );


        const hotels = [];
        const restaurants = [];


        const hotelNames =
          new Set();

        const restaurantNames =
          new Set();


        // ===================================================
        // PROCESS ELEMENTS
        // ===================================================

        for (
          const item
          of data.elements
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
                  String(
                    name
                  ),

                stars,

                price:
                  null,

                currency:
                  "USD",

                priceType:
                  "Price not available from OpenStreetMap",

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
                  item.type ||
                  "",

                osmId:
                  item.id ||
                  null

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
                  String(
                    name
                  ),

                cuisine:
                  String(
                    cuisine
                  ),

                priceLevel:
                  String(
                    priceLevel
                  ),

                rating,

                reviewCount,

                address:
                  String(
                    address
                  ),

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
                  item.type ||
                  "",

                osmId:
                  item.id ||
                  null

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
    // RUN GROQ + OSM IN PARALLEL
    // =======================================================

    console.log(
      "Starting Groq and OpenStreetMap in parallel..."
    );


    let groqResult;
    let osmResult;


    try {

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


      groqResult =
        groqResponse.value;


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

        osmResult = {

          hotels: [],

          restaurants: []

        };

      }

    } catch (error) {

      console.error(
        "Parallel requests error:",
        error
      );

      return res.status(500).json({

        error:
          "Could not generate the travel plan.",

        details:
          error.message

      });

    }


    // =======================================================
    // PARSE AI RESPONSE
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
                "Morning activities unavailable."
              ),

            afternoon:
              String(
                day?.afternoon ||
                "Afternoon activities unavailable."
              ),

            evening:
              String(
                day?.evening ||
                "Evening activities unavailable."
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
          "Explore the destination's main attractions and local area.",

        afternoon:
          "Enjoy local food, shopping and a walking experience.",

        evening:
          "Relax and explore a safe, popular evening area."

      });

    }


    // =======================================================
    // OSM DATA
    // =======================================================

    const hotels =
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
    // FINAL RESPONSE
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
          "OpenStreetMap"

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

      // script.js expects data.stay
      stay:
        hotels,

      transport,

      experiences,

      money,

      daysPlan

    };


    // =======================================================
    // FINAL LOG
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

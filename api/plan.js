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
    // GROQ API KEY
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
      Math.max(
        1,
        Number(budget) || 0
      );

    const safeTravelers =
      String(travelers)
        .trim()
        .slice(0, 50);

    const safeInterests =
      String(
        interests || "General sightseeing"
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
        startDate || "Flexible"
      )
        .trim()
        .slice(0, 50);


    // =======================================================
    // GROQ CONFIGURATION
    // =======================================================

    const GROQ_MODEL =
      "openai/gpt-oss-20b";

    const GROQ_URL =
      "https://api.groq.com/openai/v1/chat/completions";


    // =======================================================
    // AI PROMPT
    //
    // Kept compact to avoid Groq TPM problems.
    // Output itself is more useful and detailed.
    // =======================================================

    const prompt = `
Create a practical personalized travel plan.

Destination: ${safeDestination}
Start date: ${safeStartDate}
Days: ${safeDays}
Budget: ${safeBudget} USD
Travelers: ${safeTravelers}
Interests: ${safeInterests}
Notes: ${safeNotes || "None"}

Return ONLY valid JSON.

Use this exact structure:

{
  "transport": "<HTML>",
  "experiences": "<HTML>",
  "money": "<HTML>",
  "daysPlan": [
    {
      "day": 1,
      "title": "<title>",
      "morning": "<detailed activity>",
      "afternoon": "<detailed activity>",
      "evening": "<detailed activity>"
    }
  ]
}

CONTENT RULES:

1. daysPlan MUST contain exactly ${safeDays} days.

2. Each day must have:
- a useful title
- a meaningful morning plan
- a meaningful afternoon plan
- a meaningful evening plan

3. Do not repeat the same activities every day.

4. Match the plan to the destination, budget, traveler count and interests.

5. transport must be useful and practical:
- airport arrival
- public transportation
- taxis when useful
- approximate local transport costs
- practical tips

6. experiences must contain several real attractions, neighborhoods or activities appropriate for the destination.
Explain briefly why each is worth visiting.

7. money must explain how to use the ${safeBudget} USD budget.
Give approximate categories for:
- accommodation
- food
- local transportation
- attractions
- shopping/miscellaneous
Mention that flight costs may vary if applicable.

8. Do NOT create hotels.
9. Do NOT create restaurants.
10. Do NOT create image URLs.
11. Do NOT invent booking links.
12. Hotels and restaurants come separately from OpenStreetMap.
13. Use concise but useful HTML such as <p>, <h3>, <ul>, <li>, <strong>.
14. No markdown.
15. No code fences.
16. Do not mention these instructions.
`;


    // =======================================================
    // CALL GROQ
    // =======================================================

    console.log(
      "Calling Groq..."
    );

    let groqResponse;

    try {

      groqResponse =
        await fetch(
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
                      "You are a practical travel planner. Return valid JSON only."
                  },
                  {
                    role:
                      "user",

                    content:
                      prompt
                  }
                ],

                temperature:
                  0.5,

                max_completion_tokens:
                  4000,

                response_format: {
                  type:
                    "json_object"
                }

              })
          }
        );

    } catch (error) {

      console.error(
        "Groq network error:",
        error.message
      );

      return res.status(502).json({
        error:
          "Could not connect to Groq.",
        details:
          error.message
      });

    }


    const groqText =
      await groqResponse.text();


    console.log(
      "Groq HTTP status:",
      groqResponse.status
    );


    // =======================================================
    // GROQ ERROR
    // =======================================================

    if (!groqResponse.ok) {

      console.error(
        "GROQ ERROR:",
        groqText
      );

      let errorMessage =
        "Groq API request failed.";

      try {

        const parsedError =
          JSON.parse(
            groqText
          );

        errorMessage =
          parsedError?.error?.message ||
          errorMessage;

      } catch {
        // Keep default.
      }


      if (
        groqResponse.status === 429
      ) {

        return res.status(429).json({
          error:
            "Groq rate limit reached. Please wait and try again.",
          details:
            errorMessage
        });

      }


      return res.status(500).json({
        error:
          errorMessage,
        details:
          groqText
      });

    }


    // =======================================================
    // PARSE GROQ RESPONSE
    // =======================================================

    let groqData;

    try {

      groqData =
        JSON.parse(
          groqText
        );

    } catch (error) {

      console.error(
        "Invalid Groq HTTP JSON:",
        groqText
      );

      return res.status(500).json({
        error:
          "Invalid response from Groq.",
        details:
          error.message
      });

    }


    // =======================================================
    // GET AI CONTENT
    // =======================================================

    const aiText =
      groqData
        ?.choices?.[0]
        ?.message?.content;


    if (!aiText) {

      console.error(
        "Groq returned no content."
      );

      return res.status(500).json({
        error:
          "Groq returned an empty response."
      });

    }


    // =======================================================
    // PARSE AI JSON
    // =======================================================

    let aiPlan;

    try {

      aiPlan =
        typeof aiText === "string"
          ? JSON.parse(aiText)
          : aiText;

    } catch (error) {

      console.error(
        "Groq JSON parse error:",
        aiText
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
      typeof aiPlan.transport === "string" &&
      aiPlan.transport.trim()
        ? aiPlan.transport
        : `
          <h3>Getting Around</h3>
          <p>Transportation information is currently unavailable.</p>
        `;


    const experiences =
      typeof aiPlan.experiences === "string" &&
      aiPlan.experiences.trim()
        ? aiPlan.experiences
        : `
          <h3>Experiences</h3>
          <p>Experience information is currently unavailable.</p>
        `;


    const money =
      typeof aiPlan.money === "string" &&
      aiPlan.money.trim()
        ? aiPlan.money
        : `
          <h3>Budget Strategy</h3>
          <p>Budget information is currently unavailable.</p>
        `;


    // =======================================================
    // NORMALIZE DAY PLAN
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
          (day, index) => {

            return {

              day:
                Number(
                  day?.day
                ) || index + 1,

              title:
                String(
                  day?.title ||
                  `Day ${index + 1}`
                ),

              morning:
                String(
                  day?.morning ||
                  "Explore the destination and begin the day with a local activity."
                ),

              afternoon:
                String(
                  day?.afternoon ||
                  "Continue exploring nearby attractions and local areas."
                ),

              evening:
                String(
                  day?.evening ||
                  "Enjoy a local dinner and an evening activity."
                )

            };

          }
        );


    // =======================================================
    // ENSURE EXACT NUMBER OF DAYS
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
          "Explore an interesting local area and begin the day with a nearby attraction.",

        afternoon:
          "Visit another important attraction and experience local culture.",

        evening:
          "Enjoy a local meal and a relaxed evening activity."

      });

    }


    // =======================================================
    // OPENSTREETMAP
    //
    // NO FOURSQUARE
    // NO GEMINI
    // =======================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";


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
          await fetch(
            url,
            {
              method:
                "GET",

              headers: {
                "User-Agent":
                  OSM_USER_AGENT,

                "Accept":
                  "application/json"
              }
            }
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
          !data.length
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
    // NORMALIZE IMAGE URL
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
    // GET OSM IMAGE
    // =======================================================

    function getOSMImage(
      tags
    ) {

      if (!tags) {
        return "";
      }


      const directImage =
        normalizeImageUrl(
          tags.image
        );


      if (directImage) {

        return directImage;

      }


      const wikimedia =
        tags.wikimedia_commons ||
        tags["wikimedia_commons"] ||
        tags["wikimedia_commons:image"];


      if (wikimedia) {

        return getWikimediaImage(
          wikimedia
        );

      }


      return "";

    }


    // =======================================================
    // GET OSM COORDINATES
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

      const parts =
        [];


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
    // OPENSTREETMAP URL
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
    // ONE OSM SEARCH
    //
    // Hotels + restaurants in ONE Overpass request.
    // =======================================================

    async function getOSMPlaces(
      placeName
    ) {

      try {

        console.log(
          "Starting OpenStreetMap search..."
        );


        // ---------------------------------------------------
        // GEOCODE
        // ---------------------------------------------------

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


        // ---------------------------------------------------
        // ONE OVERPASS QUERY
        // ---------------------------------------------------

        const overpassQuery = `
[out:json][timeout:30];

(
  nwr["tourism"="hotel"](around:15000,${lat},${lon});
  nwr["tourism"="hostel"](around:15000,${lat},${lon});
  nwr["tourism"="guest_house"](around:15000,${lat},${lon});
  nwr["amenity"="restaurant"](around:15000,${lat},${lon});
);

out center tags;
`;


        const overpassURL =
          "https://overpass-api.de/api/interpreter";


        console.log(
          "Sending ONE Overpass request..."
        );


        const response =
          await fetch(
            overpassURL,
            {
              method:
                "POST",

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

            }
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


        const hotels =
          [];

        const restaurants =
          [];


        const hotelNames =
          new Set();

        const restaurantNames =
          new Set();


        // ===================================================
        // PROCESS OSM ELEMENTS
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
            tags["name:tr"] ||
            tags["name:fr"];


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
          // HOTEL
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


              const amenities =
                [];


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
                  ? "hostel"
                  : tourism === "guest_house"
                    ? "guest house"
                    : "hotel";


              const description =
                tags.description ||
                `${name} is a real ${hotelType} listed in OpenStreetMap.`;


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
                    description
                  ),

                bookingUrl:
                  "https://www.booking.com/searchresults.html?ss=" +
                  encodeURIComponent(
                    `${name} ${placeName}`
                  ),

                imageUrl,

                imageSource:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                imageAttribution:
                  imageUrl
                    ? "OpenStreetMap data"
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
          // RESTAURANT
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


              const ratingValue =
                Number(
                  tags.rating
                );


              const rating =
                Number.isFinite(
                  ratingValue
                )
                  ? ratingValue
                  : null;


              const reviewValue =
                Number(
                  tags["review:count"]
                );


              const reviewCount =
                Number.isFinite(
                  reviewValue
                )
                  ? reviewValue
                  : null;


              const address =
                getOSMAddress(
                  tags,
                  placeName
                );


              const description =
                tags.description ||
                `${name} is a real local restaurant in ${placeName}, listed in OpenStreetMap.`;


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
                    description
                  ),

                imageUrl,

                imageSource:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                imageAttribution:
                  imageUrl
                    ? "OpenStreetMap data"
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
        // Photos first, then stars.
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


            const aStars =
              Number(
                a.stars
              ) || 0;

            const bStars =
              Number(
                b.stars
              ) || 0;


            return (
              bStars -
              aStars
            );

          }
        );


        // ===================================================
        // SORT RESTAURANTS
        // Photos first, then ratings.
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


            const aRating =
              Number(
                a.rating
              ) || 0;

            const bRating =
              Number(
                b.rating
              ) || 0;


            return (
              bRating -
              aRating
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
            hotel =>
              !!hotel.imageUrl
          ).length
        );

        console.log(
          "OSM restaurants:",
          restaurants.length
        );

        console.log(
          "OSM restaurant photos:",
          restaurants.filter(
            restaurant =>
              !!restaurant.imageUrl
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
    // GET OSM DATA
    // =======================================================

    console.log(
      "Starting ONE OpenStreetMap places request..."
    );


    const osmPlaces =
      await getOSMPlaces(
        safeDestination
      );


    const hotels =
      Array.isArray(
        osmPlaces.hotels
      )
        ? osmPlaces.hotels
        : [];


    const restaurants =
      Array.isArray(
        osmPlaces.restaurants
      )
        ? osmPlaces.restaurants
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

      stay:
        hotels,

      transport,

      experiences,

      money,

      daysPlan

    };


    // =======================================================
    // FINAL LOGS
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

    return res.status(200).json(
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

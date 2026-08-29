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

    console.log(
      "GROQ_API_KEY detected."
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
        interests || "General sightseeing"
      )
      .trim()
      .slice(0, 500);

    const safeNotes =
      String(
        notes || ""
      )
      .trim()
      .slice(0, 500);

    const safeStartDate =
      String(
        startDate || "Flexible"
      )
      .trim()
      .slice(0, 100);


    // =======================================================
    // GROQ CONFIGURATION
    // =======================================================

    const GROQ_MODEL =
      "openai/gpt-oss-20b";

    const GROQ_URL =
      "https://api.groq.com/openai/v1/chat/completions";


    // =======================================================
    // TRAVEL PLAN PROMPT
    //
    // IMPORTANT:
    // This prompt is designed to provide a useful,
    // detailed travel plan without making the request
    // unnecessarily large.
    // =======================================================

    const prompt = `
Create a useful, realistic and detailed travel plan.

TRIP INFORMATION
Destination: ${safeDestination}
Start date: ${safeStartDate}
Number of days: ${safeDays}
Budget: ${safeBudget} USD
Travelers: ${safeTravelers}
Interests: ${safeInterests}
Additional notes: ${safeNotes || "None"}

IMPORTANT DATA RULES

1. Hotels and restaurants are supplied separately by OpenStreetMap.
2. Do NOT create hotels.
3. Do NOT create restaurants.
4. Do NOT create hotel names.
5. Do NOT create restaurant names.
6. Do NOT create image URLs.
7. Do NOT pretend that an invented place is real.
8. For attractions and neighborhoods, only mention well-known places when you are reasonably confident they exist.
9. For transportation prices, use approximate wording such as "around", "typically", or "varies".
10. Never present uncertain prices as guaranteed current prices.
11. For taxi applications, only mention established services you are reasonably confident operate in the destination. If availability varies, clearly say so.
12. Include practical safety advice for taxis and transportation.
13. Do not mention Foursquare.
14. Do not mention Gemini.
15. OpenStreetMap is the only external places data source.
16. Groq is the only AI provider.

CONTENT REQUIREMENTS

The response must be substantially more useful than a short summary.

TRANSPORT:
Create a detailed transportation guide.

Include:
- Airport arrival options when relevant.
- Metro/subway.
- Tram.
- Bus.
- Ferry when relevant.
- Walking.
- Taxi.
- Approximate cost guidance.
- Which option is best for tourists.
- Which option is best for saving money.
- Practical transportation tips.
- Taxi safety advice.
- Recommend established taxi applications when reasonably known for the destination.
- Tell travelers to verify the vehicle, driver and destination before entering.
- Warn against unofficial drivers approaching travelers at airports, stations or tourist attractions.
- Do not invent a taxi application.

Return this as HTML using:
<h3>
<p>
<ul>
<li>

EXPERIENCES:
Create a detailed experiences and sightseeing guide.

Include several categories:

1. Major attractions
2. Historic and cultural places
3. Scenic places
4. Walking and promenade areas
5. Parks and outdoor places
6. Local neighborhoods worth exploring
7. Evening and nightlife ideas
8. Local food experiences
9. Shopping areas
10. Relaxing activities

For shopping specifically include:
- Major traditional markets when relevant.
- Popular shopping streets.
- Modern shopping areas or malls when relevant.
- Souvenir shopping.
- Local products worth looking for.
- Basic bargaining advice where appropriate.
- How to avoid tourist traps.

For walking and outdoor activities specifically include:
- Waterfront walks when available.
- Parks.
- Viewpoints.
- Scenic streets.
- Relaxing areas.
- Good times of day to visit.

Do not make the section just a list of names.
Explain briefly what makes each type of place worth visiting.

Return useful HTML using:
<h3>
<h4>
<p>
<ul>
<li>

MONEY:
Create a detailed budget strategy.

Break the budget into:
- Accommodation
- Food
- Local transportation
- Attractions
- Shopping
- Activities
- Emergency/miscellaneous

Explain what percentage or approximate amount could be allocated to each category.

If the user's budget is unlikely to cover flights, explicitly say that flights may need to be treated separately.

Do not claim exact prices unless they are given by the user.

Return HTML.

DAYS PLAN:
Create exactly ${safeDays} days.

Every day must contain:
- morning
- afternoon
- evening

Each period should contain useful activities and logical geographic grouping.

Avoid sending the traveler back and forth across the city unnecessarily.

Include:
- sightseeing
- food
- shopping
- walking
- relaxation
- cultural activities
- optional nightlife when appropriate

If the trip is short, prioritize the most important experiences.

Each day should be detailed enough to be genuinely useful, not just one short sentence.

Return exactly ${safeDays} objects.

OUTPUT FORMAT

Return ONLY valid JSON.

Do not use markdown.
Do not use code fences.
Do not write explanations outside the JSON.

Required structure:

{
  "transport": "<detailed HTML>",
  "experiences": "<detailed HTML>",
  "money": "<detailed HTML>",
  "daysPlan": [
    {
      "day": 1,
      "title": "Day 1 title",
      "morning": "Detailed morning plan",
      "afternoon": "Detailed afternoon plan",
      "evening": "Detailed evening plan"
    }
  ]
}

The daysPlan array must contain exactly ${safeDays} objects.

Keep the total response reasonably compact, but do NOT make the sections overly short.
`;


    // =======================================================
    // GROQ REQUEST
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
                      "You are a professional travel planner. Return valid JSON only. Make the plan practical, detailed and concise enough for an API response."
                  },
                  {
                    role:
                      "user",

                    content:
                      prompt
                  }
                ],

                temperature:
                  0.4,

                max_completion_tokens:
                  6200,

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


    // =======================================================
    // READ GROQ RESPONSE
    // =======================================================

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
        // Keep default error.
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
    // PARSE GROQ HTTP JSON
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
        "Groq returned no content:",
        JSON.stringify(
          groqData
        )
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
          ? JSON.parse(
              aiText
            )
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
    // NORMALIZE AI CONTENT
    // =======================================================

    const transport =
      typeof aiPlan.transport === "string"
        ? aiPlan.transport
        : "<p>Transportation information unavailable.</p>";


    const experiences =
      typeof aiPlan.experiences === "string"
        ? aiPlan.experiences
        : "<p>Experience information unavailable.</p>";


    const money =
      typeof aiPlan.money === "string"
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
        .slice(0, safeDays)
        .map(
          (day, index) => ({

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
    // SAFETY: MAKE SURE DAYS EXIST
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
    // OPENSTREETMAP
    //
    // ONLY external places source.
    // NO FOURSQUARE.
    // NO GEMINI.
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
              method: "GET",

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
    // SAFE IMAGE URL
    // =======================================================

    function normalizeImageUrl(
      value
    ) {

      if (!value) {
        return "";
      }


      const url =
        String(value).trim();


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
        String(value).trim();


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

      const image =
        normalizeImageUrl(
          tags?.image
        );


      if (image) {
        return image;
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
    // Hotels + restaurants together.
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


        // ===================================================
        // ONE OVERPASS REQUEST
        // ===================================================

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


        const hotels = [];
        const restaurants = [];


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
            {

              hotelNames.add(
                normalized
              );


              let stars =
                Number(
                  tags.stars
                );


              if (
                !Number.isFinite(stars)
              ) {

                stars =
                  Number(
                    tags["stars:number"]
                  );

              }


              if (
                !Number.isFinite(stars)
              ) {

                stars =
                  0;

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
                  ? "Hostel"
                  : tourism === "guest_house"
                    ? "Guest house"
                    : "Hotel";


              const description =
                tags.description ||
                `${name} is a real ${hotelType.toLowerCase()} listed in OpenStreetMap.`;


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
            {

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


              const rating =
                Number.isFinite(
                  Number(
                    tags.rating
                  )
                )
                  ? Number(
                      tags.rating
                    )
                  : null;


              const reviewCount =
                Number.isFinite(
                  Number(
                    tags["review:count"]
                  )
                )
                  ? Number(
                      tags["review:count"]
                    )
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
        //
        // Hotels with real OSM images first.
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
        //
        // Restaurants with real OSM images first.
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
    // GET OSM PLACES
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

      restaurantSearch: {

        status:
          restaurants.length
            ? "success"
            : "no_results",

        source:
          "OpenStreetMap"

      },

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

module.exports = async (req, res) => {

  // =======================================================
  // CORS
  // =======================================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // =====================================================
    // TRIP DATA
    // =====================================================

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


    // =====================================================
    // API KEY
    // ONLY GROQ IS USED
    // =====================================================

    const GROQ_API_KEY =
      process.env.GROQ_API_KEY;


    if (!GROQ_API_KEY) {

      console.error(
        "GROQ_API_KEY missing."
      );

      return res.status(500).json({
        error:
          "Groq API key is missing. Add GROQ_API_KEY in Vercel Environment Variables."
      });

    }

    console.log(
      "GROQ_API_KEY detected."
    );


    // =====================================================
    // VALIDATION
    // =====================================================

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


    // =====================================================
    // GROQ SETTINGS
    // =====================================================

    const GROQ_MODEL =
      "openai/gpt-oss-120b";

    const GROQ_URL =
      "https://api.groq.com/openai/v1/chat/completions";


    // =====================================================
    // GROQ PROMPT
    // =====================================================

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

Return up to 10 different REAL accommodation options in ${destination}.

Do NOT invent hotels.

Hotels must be real existing accommodations.

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
If you know the exact Booking.com page, use it.
Otherwise create a Booking.com search URL using the hotel name and destination.

Do NOT return hotel image URLs.

Hotel images are handled separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT generate restaurant names.

Restaurants are obtained separately from OpenStreetMap.

Therefore return:

"restaurants": []

IMPORTANT CONTENT REQUIREMENT:

The following fields must contain HTML:

transport
experiences
money
daysPlan

Return ONLY valid JSON.

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


    // =====================================================
    // GROQ REQUEST
    // =====================================================

    console.log(
      "Sending request to Groq..."
    );

    const groqResponse =
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

          body: JSON.stringify({

            model:
              GROQ_MODEL,

            messages: [
              {
                role: "system",
                content:
                  "You are an expert travel planner. Return only valid JSON."
              },
              {
                role: "user",
                content:
                  prompt
              }
            ],

            temperature: 0.4,

            response_format: {
              type: "json_object"
            }

          })
        }
      );


    const groqText =
      await groqResponse.text();


    console.log(
      "Groq HTTP status:",
      groqResponse.status
    );


    // =====================================================
    // GROQ ERROR
    // =====================================================

    if (!groqResponse.ok) {

      console.error(
        "GROQ ERROR:",
        groqText
      );

      return res.status(
        groqResponse.status === 429
          ? 429
          : 500
      ).json({

        error:
          "Groq API request failed.",

        status:
          groqResponse.status,

        details:
          groqText

      });

    }


    // =====================================================
    // PARSE GROQ RESPONSE
    // =====================================================

    let groqData;

    try {

      groqData =
        JSON.parse(
          groqText
        );

    } catch (error) {

      console.error(
        "Could not parse Groq response:",
        groqText
      );

      return res.status(500).json({

        error:
          "Invalid response from Groq.",

        details:
          groqText

      });

    }


    // =====================================================
    // GET GROQ TEXT
    // =====================================================

    const text =
      groqData
        ?.choices?.[0]
        ?.message?.content;


    if (!text) {

      console.error(
        "Groq returned no content:",
        JSON.stringify(
          groqData
        )
      );

      return res.status(500).json({

        error:
          "Groq returned an empty response.",

        details:
          JSON.stringify(
            groqData
          )

      });

    }


    // =====================================================
    // CLEAN JSON
    // =====================================================

    let cleanText =
      String(
        text
      ).trim();


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


    // =====================================================
    // TRAVEL DATA
    // =====================================================

    let travelData;

    try {

      travelData =
        JSON.parse(
          cleanText
        );

    } catch (error) {

      console.error(
        "GROQ JSON PARSE ERROR:",
        cleanText
      );

      return res.status(500).json({

        error:
          "Groq returned invalid JSON.",

        details:
          error.message

      });

    }


    // =====================================================
    // NORMALIZE HOTELS
    // =====================================================

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

            let bookingUrl =
              hotel.bookingUrl ||
              "";

            // ------------------------------------------------
            // SAFE BOOKING.COM SEARCH FALLBACK
            // ------------------------------------------------

            if (
              !bookingUrl ||
              !bookingUrl.includes(
                "booking.com"
              )
            ) {

              bookingUrl =
                "https://www.booking.com/searchresults.html?ss=" +
                encodeURIComponent(
                  hotel.name +
                  " " +
                  destination
                );

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
                      .slice(
                        0,
                        6
                      )
                      .map(
                        item =>
                          String(
                            item
                          )
                      )
                  : [],

              description:
                String(
                  hotel.description ||
                  ""
                ),

              bookingUrl,

              imageUrl:
                "",

              photoAttribution:
                "",

              photoSource:
                ""

            };

          }
        );


    // =====================================================
    // REMOVE DUPLICATE HOTELS
    // =====================================================

    const uniqueHotels =
      [];

    const hotelNames =
      new Set();


    for (
      const hotel
      of travelData.stay
    ) {

      const key =
        String(
          hotel.name
        )
          .toLowerCase()
          .trim();


      if (
        !hotelNames.has(
          key
        )
      ) {

        hotelNames.add(
          key
        );

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


    // =====================================================
    // HOTEL IMAGES
    // =====================================================
    // No external hotel image API is used here.
    // =====================================================

    travelData.stay =
      travelData.stay.map(
        hotel => ({

          ...hotel,

          imageUrl:
            "",

          photoAttribution:
            "",

          photoSource:
            ""

        })
      );


    // =====================================================
    // OPENSTREETMAP SETTINGS
    // =====================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";


    // =====================================================
    // GEOCODE DESTINATION
    // =====================================================

    async function geocodeDestination(
      destination
    ) {

      try {

        const url =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json" +
          "&limit=1" +
          "&q=" +
          encodeURIComponent(
            destination
          );


        console.log(
          "Geocoding destination:",
          destination
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


        if (
          !response.ok
        ) {

          console.error(
            "Nominatim error:",
            response.status
          );

          return null;

        }


        const data =
          await response.json();


        if (
          !Array.isArray(
            data
          ) ||
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
          !Number.isFinite(
            lat
          ) ||
          !Number.isFinite(
            lon
          )
        ) {

          return null;

        }


        return {
          lat,
          lon
        };

      } catch (error) {

        console.error(
          "Geocoding error:",
          error.message
        );

        return null;

      }

    }


    // =====================================================
    // NORMALIZE PLACE NAME
    // =====================================================

    function normalizePlaceName(
      name
    ) {

      return String(
        name || ""
      )
        .toLowerCase()
        .normalize(
          "NFD"
        )
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


    // =====================================================
    // OPENSTREETMAP RESTAURANTS
    // =====================================================

    async function getRestaurantsFromOSM(
      destination
    ) {

      try {

        console.log(
          "OpenStreetMap restaurant search:",
          destination
        );


        // -------------------------------------------------
        // GEOCODE
        // -------------------------------------------------

        const coordinates =
          await geocodeDestination(
            destination
          );


        if (
          !coordinates
        ) {

          console.error(
            "Could not geocode destination."
          );

          return [];

        }


        const {
          lat,
          lon
        } =
          coordinates;


        console.log(
          "Destination coordinates:",
          lat,
          lon
        );


        // -------------------------------------------------
        // OVERPASS QUERY
        // -------------------------------------------------

        const overpassQuery = `
[out:json][timeout:30];

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


        if (
          !osmResponse.ok
        ) {

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

          return [];

        }


        console.log(
          "OSM restaurants found:",
          osmData.elements.length
        );


        // -------------------------------------------------
        // BUILD RESTAURANT LIST
        // -------------------------------------------------

        const restaurants =
          [];


        for (
          const item
          of osmData.elements
        ) {

          const tags =
            item.tags || {};


          // ------------------------------------------------
          // NAME
          // ------------------------------------------------

          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:fr"] ||
            tags["name:tr"];


          if (
            !name
          ) {

            continue;

          }


          // ------------------------------------------------
          // COORDINATES
          // ------------------------------------------------

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


          // ------------------------------------------------
          // ADDRESS
          // ------------------------------------------------

          const addressParts =
            [];


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
            addressParts.length
              ? addressParts.join(
                  ", "
                )
              : destination;


          // ------------------------------------------------
          // CUISINE
          // ------------------------------------------------

          const cuisine =
            tags.cuisine ||
            "Local cuisine";


          // ------------------------------------------------
          // PRICE LEVEL
          // ------------------------------------------------

          const priceLevel =
            tags["price:level"] ||
            tags["price_range"] ||
            "$$";


          // ------------------------------------------------
          // WEBSITE
          // ------------------------------------------------

          const website =
            tags.website ||
            tags["contact:website"] ||
            "";


          // ------------------------------------------------
          // PHONE
          // ------------------------------------------------

          const phone =
            tags.phone ||
            tags["contact:phone"] ||
            "";


          // ------------------------------------------------
          // OPENING HOURS
          // ------------------------------------------------

          const openingHours =
            tags.opening_hours ||
            "";


          // ------------------------------------------------
          // RATING
          // ------------------------------------------------

          let rating =
            null;


          if (
            tags.rating !== undefined
          ) {

            const numericRating =
              Number(
                tags.rating
              );


            if (
              Number.isFinite(
                numericRating
              )
            ) {

              rating =
                numericRating;

            }

          }


          // ------------------------------------------------
          // REVIEW COUNT
          // ------------------------------------------------

          let reviewCount =
            null;


          const reviewValue =
            tags["review:count"] ||
            tags.reviews ||
            "";


          if (
            reviewValue
          ) {

            const numericReviews =
              Number(
                String(
                  reviewValue
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

            }

          }


          // ------------------------------------------------
          // GOOGLE MAPS URL
          // ------------------------------------------------

          let mapsUrl =
            "";


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


          // ------------------------------------------------
          // OSM URL
          // ------------------------------------------------

          let osmUrl =
            "";


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


          // ------------------------------------------------
          // DESCRIPTION
          // ------------------------------------------------

          let description =
            `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`;

          if (
            cuisine
          ) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }


          // ------------------------------------------------
          // RESTAURANT OBJECT
          // ------------------------------------------------

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

            description,

            imageUrl:
              "",

            imageSource:
              "",

            imageAttribution:
              "",

            mapsUrl,

            osmUrl,

            website,

            phone,

            openingHours,

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


          // ------------------------------------------------
          // MAX 50 RESTAURANTS
          // ------------------------------------------------

          if (
            restaurants.length >= 50
          ) {

            break;

          }

        }


        // -------------------------------------------------
        // REMOVE DUPLICATES
        // -------------------------------------------------

        const uniqueRestaurants =
          [];

        const restaurantNames =
          new Set();


        for (
          const restaurant
          of restaurants
        ) {

          const key =
            normalizePlaceName(
              restaurant.name
            );


          if (
            !restaurantNames.has(
              key
            )
          ) {

            restaurantNames.add(
              key
            );

            uniqueRestaurants.push(
              restaurant
            );

          }

        }


        console.log(
          "Unique OSM restaurants:",
          uniqueRestaurants.length
        );


        // -------------------------------------------------
        // SORT BY RATING
        // -------------------------------------------------

        uniqueRestaurants.sort(
          (a, b) => {

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


        // -------------------------------------------------
        // RETURN 15 RESTAURANTS
        // -------------------------------------------------

        const finalRestaurants =
          uniqueRestaurants.slice(
            0,
            15
          );


        console.log(
          "Final restaurants:",
          finalRestaurants.length
        );


        console.log(
          "Restaurant photos:",
          0
        );


        console.log(
          "Foursquare requests:",
          0
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


    // =====================================================
    // GET RESTAURANTS
    // =====================================================

    console.log(
      "Starting restaurant search..."
    );


    travelData.restaurants =
      await getRestaurantsFromOSM(
        destination
      );


    console.log(
      "Restaurants returned:",
      travelData.restaurants.length
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


    // =====================================================
    // ENSURE ARRAYS
    // =====================================================

    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants =
        [];

    }


    if (
      !Array.isArray(
        travelData.stay
      )
    ) {

      travelData.stay =
        [];

    }


    // =====================================================
    // FINAL LOG
    // =====================================================

    console.log(
      "======================================"
    );

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "AI provider: Groq"
    );

    console.log(
      "Restaurant provider: OpenStreetMap"
    );

    console.log(
      "Gemini requests: 0"
    );

    console.log(
      "Foursquare requests: 0"
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
      "Restaurant photos:",
      travelData.restaurants.filter(
        restaurant =>
          !!restaurant.imageUrl
      ).length
    );

    console.log(
      "======================================"
    );


    // =====================================================
    // SUCCESS
    // =====================================================

    return res.status(200).json(
      travelData
    );


  } catch (error) {

    // =====================================================
    // CRITICAL ERROR
    // =====================================================

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

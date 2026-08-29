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
    // =====================================================

    const GROQ_API_KEY =
      process.env.GROQ_API_KEY;


    // =====================================================
    // GROQ KEY CHECK
    // =====================================================

    if (!GROQ_API_KEY) {

      console.error(
        "GROQ_API_KEY missing."
      );

      return res.status(500).json({
        error:
          "Groq API key is missing."
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
    // HELPERS
    // =====================================================

    function normalizePlaceName(name) {

      return String(name || "")
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


    function calculateNameSimilarity(
      firstName,
      secondName
    ) {

      const a =
        normalizePlaceName(
          firstName
        );

      const b =
        normalizePlaceName(
          secondName
        );

      if (!a || !b) {
        return 0;
      }

      if (a === b) {
        return 1;
      }

      if (
        a.includes(b) ||
        b.includes(a)
      ) {
        return 0.9;
      }

      const aWords =
        new Set(
          a.split(/\s+/)
        );

      const bWords =
        new Set(
          b.split(/\s+/)
        );

      let common = 0;

      for (
        const word of aWords
      ) {

        if (
          bWords.has(word)
        ) {
          common++;
        }

      }

      const total =
        Math.max(
          aWords.size,
          bWords.size
        );

      if (total === 0) {
        return 0;
      }

      return (
        common /
        total
      );

    }


    function buildMapsUrl(
      name,
      destination,
      latitude,
      longitude
    ) {

      if (
        Number.isFinite(
          Number(latitude)
        ) &&
        Number.isFinite(
          Number(longitude)
        )
      ) {

        return (
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(
            `${latitude},${longitude}`
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


    // =====================================================
    // OPENSTREETMAP / OVERPASS
    //
    // IMPORTANT:
    // ONE REQUEST ONLY
    //
    // This request gets:
    // - Hotels
    // - Restaurants
    //
    // No Foursquare.
    // No second restaurant enrichment.
    // =====================================================

    async function getOSMPlaces(
      destination
    ) {

      try {

        console.log(
          "Starting ONE OpenStreetMap request..."
        );

        // -------------------------------------------------
        // GEOCODE DESTINATION
        // -------------------------------------------------

        const geocodeURL =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json" +
          "&limit=1" +
          "&q=" +
          encodeURIComponent(
            destination
          );

        const geocodeResponse =
          await fetch(
            geocodeURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  "AI-Life-Planner/1.0",
                "Accept":
                  "application/json"
              }
            }
          );

        if (
          !geocodeResponse.ok
        ) {

          console.error(
            "Nominatim error:",
            geocodeResponse.status
          );

          return {
            hotels: [],
            restaurants: []
          };

        }

        const geocodeData =
          await geocodeResponse.json();

        if (
          !Array.isArray(
            geocodeData
          ) ||
          !geocodeData.length
        ) {

          console.error(
            "Destination could not be geocoded."
          );

          return {
            hotels: [],
            restaurants: []
          };

        }

        const latitude =
          Number(
            geocodeData[0].lat
          );

        const longitude =
          Number(
            geocodeData[0].lon
          );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {

          return {
            hotels: [],
            restaurants: []
          };

        }

        console.log(
          "Destination coordinates:",
          latitude,
          longitude
        );


        // -------------------------------------------------
        // ONE OVERPASS QUERY
        // -------------------------------------------------

        const overpassQuery = `
[out:json][timeout:30];

(
  nwr["tourism"="hotel"](around:15000,${latitude},${longitude});
  nwr["tourism"="hostel"](around:15000,${latitude},${longitude});
  nwr["tourism"="guest_house"](around:15000,${latitude},${longitude});

  nwr["amenity"="restaurant"](around:15000,${latitude},${longitude});
);

out center tags;
`;


        const overpassURL =
          "https://overpass-api.de/api/interpreter";


        console.log(
          "Sending ONE Overpass request..."
        );


        const osmResponse =
          await fetch(
            overpassURL,
            {
              method: "POST",

              headers: {

                "Content-Type":
                  "application/x-www-form-urlencoded",

                "User-Agent":
                  "AI-Life-Planner/1.0",

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

          const errorText =
            await osmResponse.text();

          console.error(
            "Overpass error:",
            osmResponse.status,
            errorText
          );

          return {
            hotels: [],
            restaurants: []
          };

        }


        const osmData =
          await osmResponse.json();


        if (
          !osmData ||
          !Array.isArray(
            osmData.elements
          )
        ) {

          return {
            hotels: [],
            restaurants: []
          };

        }


        console.log(
          "OSM total elements:",
          osmData.elements.length
        );


        // =================================================
        // BUILD RESULTS
        // =================================================

        const hotels = [];
        const restaurants = [];

        const hotelNames =
          new Set();

        const restaurantNames =
          new Set();


        for (
          const item of osmData.elements
        ) {

          const tags =
            item.tags || {};

          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:tr"] ||
            "";

          if (!name) {
            continue;
          }


          // ------------------------------------------------
          // COORDINATES
          // ------------------------------------------------

          let placeLat =
            item.lat;

          let placeLon =
            item.lon;


          if (
            placeLat === undefined &&
            item.center
          ) {

            placeLat =
              item.center.lat;

            placeLon =
              item.center.lon;

          }


          placeLat =
            Number(placeLat);

          placeLon =
            Number(placeLon);


          if (
            !Number.isFinite(placeLat) ||
            !Number.isFinite(placeLon)
          ) {

            placeLat = null;
            placeLon = null;

          }


          // ------------------------------------------------
          // ADDRESS
          // ------------------------------------------------

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
              ? addressParts.join(", ")
              : destination;


          // ------------------------------------------------
          // IMAGE FROM OSM
          // ------------------------------------------------

          let imageUrl = "";

          let imageSource = "";

          let imageAttribution = "";


          /*
           * OSM can contain a direct image=* URL.
           */

          if (
            tags.image &&
            /^https?:\/\//i.test(
              String(tags.image)
            )
          ) {

            imageUrl =
              String(
                tags.image
              ).trim();

            imageSource =
              "OpenStreetMap";

            imageAttribution =
              "Image listed in OpenStreetMap";

          }


          /*
           * Some OSM objects contain a Wikimedia Commons
           * file reference instead of a direct image URL.
           *
           * Example:
           * wikimedia_commons=File:Example.jpg
           *
           * We convert the OSM-listed file reference into
           * a browser-loadable Wikimedia URL.
           */

          if (
            !imageUrl &&
            tags.wikimedia_commons
          ) {

            const commons =
              String(
                tags.wikimedia_commons
              )
              .replace(
                /^File:/i,
                ""
              )
              .trim();

            if (commons) {

              imageUrl =
                "https://commons.wikimedia.org/wiki/Special:FilePath/" +
                encodeURIComponent(
                  commons
                );

              imageSource =
                "OpenStreetMap / Wikimedia Commons";

              imageAttribution =
                "Wikimedia Commons file listed in OpenStreetMap";

            }

          }


          // ------------------------------------------------
          // GOOGLE MAPS
          // ------------------------------------------------

          const mapsUrl =
            buildMapsUrl(
              name,
              destination,
              placeLat,
              placeLon
            );


          // ------------------------------------------------
          // OSM URL
          // ------------------------------------------------

          let osmUrl = "";

          if (
            item.type &&
            item.id
          ) {

            osmUrl =
              `https://www.openstreetmap.org/${encodeURIComponent(
                item.type
              )}/${encodeURIComponent(
                item.id
              )}`;

          }


          // =================================================
          // HOTEL
          // =================================================

          const tourism =
            String(
              tags.tourism || ""
            ).toLowerCase();


          const isHotel =
            tourism === "hotel" ||
            tourism === "hostel" ||
            tourism === "guest_house";


          if (isHotel) {

            const key =
              normalizePlaceName(
                name
              );

            if (
              key &&
              !hotelNames.has(key)
            ) {

              hotelNames.add(key);

              let stars = 0;

              if (
                tags.stars !== undefined
              ) {

                const numericStars =
                  Number(
                    String(
                      tags.stars
                    ).replace(
                      /[^\d.]/g,
                      ""
                    )
                  );

                if (
                  Number.isFinite(
                    numericStars
                  )
                ) {

                  stars =
                    Math.min(
                      5,
                      Math.max(
                        0,
                        numericStars
                      )
                    );

                }

              }


              const amenities = [];


              if (
                tags.internet_access
              ) {

                amenities.push(
                  "Internet access"
                );

              }

              if (
                tags.air_conditioning === "yes"
              ) {

                amenities.push(
                  "Air Conditioning"
                );

              }

              if (
                tags.breakfast === "yes"
              ) {

                amenities.push(
                  "Breakfast Available"
                );

              }

              if (
                tags.parking
              ) {

                amenities.push(
                  "Parking"
                );

              }

              if (
                tags.pool
              ) {

                amenities.push(
                  "Swimming Pool"
                );

              }

              if (
                tags.wheelchair === "yes"
              ) {

                amenities.push(
                  "Accessible"
                );

              }


              hotels.push({

                name:
                  String(name),

                stars,

                price:
                  null,

                currency:
                  "USD",

                priceType:
                  "estimated per night",

                amenities:
                  amenities.slice(
                    0,
                    6
                  ),

                description:
                  `${name} is a real accommodation listed in OpenStreetMap in ${destination}.`,

                bookingUrl:
                  "https://www.booking.com/searchresults.html?ss=" +
                  encodeURIComponent(
                    name
                  ),

                imageUrl,

                imageSource,

                imageAttribution,

                mapsUrl,

                osmUrl,

                latitude:
                  placeLat,

                longitude:
                  placeLon,

                tourism:

                  tourism

              });

            }

          }


          // =================================================
          // RESTAURANT
          // =================================================

          const isRestaurant =
            tags.amenity ===
            "restaurant";


          if (isRestaurant) {

            const key =
              normalizePlaceName(
                name
              );

            if (
              key &&
              !restaurantNames.has(key)
            ) {

              restaurantNames.add(
                key
              );


              const cuisine =
                tags.cuisine ||
                "Local cuisine";


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


              restaurants.push({

                name:
                  String(name),

                cuisine:
                  String(cuisine),

                priceLevel:
                  String(
                    tags["price:level"] ||
                    tags.price_range ||
                    "$$"
                  ),

                rating,

                reviewCount,

                address:
                  String(address),

                description:
                  `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap. Cuisine: ${cuisine}.`,

                imageUrl,

                imageSource,

                imageAttribution,

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
                  placeLat,

                longitude:
                  placeLon,

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


        console.log(
          "OSM hotels:",
          hotels.length
        );

        console.log(
          "OSM restaurants:",
          restaurants.length
        );

        console.log(
          "OSM hotel images:",
          hotels.filter(
            hotel =>
              !!hotel.imageUrl
          ).length
        );

        console.log(
          "OSM restaurant images:",
          restaurants.filter(
            restaurant =>
              !!restaurant.imageUrl
          ).length
        );


        // ------------------------------------------------
        // SORT RESTAURANTS
        // ------------------------------------------------

        restaurants.sort(
          (a, b) => {

            const aRating =
              Number(a.rating) || 0;

            const bRating =
              Number(b.rating) || 0;

            const aImage =
              a.imageUrl ? 1 : 0;

            const bImage =
              b.imageUrl ? 1 : 0;


            if (
              bImage !== aImage
            ) {

              return (
                bImage -
                aImage
              );

            }

            return (
              bRating -
              aRating
            );

          }
        );


        return {

          hotels:
            hotels.slice(
              0,
              50
            ),

          restaurants:
            restaurants.slice(
              0,
              50
            )

        };


      } catch (error) {

        console.error(
          "OSM request error:",
          error
        );

        return {
          hotels: [],
          restaurants: []
        };

      }

    }


    // =====================================================
    // GROQ AI
    // =====================================================

    async function generatePlanWithGroq() {

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

IMPORTANT:

Do NOT invent restaurant names.

Restaurants are supplied separately from OpenStreetMap.

For accommodation:
Return up to 10 realistic accommodation options.
Do not claim live availability.
Prices are estimates only.

For each hotel return:

- name
- stars
- price
- currency
- priceType
- amenities
- description
- bookingUrl

Use a Booking.com search URL if an exact hotel page is unknown.

Also create:

transport
experiences
money
daysPlan

These four fields must contain HTML.

RETURN ONLY JSON.

Use exactly this structure:

{
  "stay": [
    {
      "name": "Hotel name",
      "stars": 4,
      "price": 120,
      "currency": "USD",
      "priceType": "estimated per night",
      "amenities": [
        "Free Wi-Fi",
        "Air Conditioning",
        "Private Bathroom",
        "Breakfast Available"
      ],
      "description": "Short description.",
      "bookingUrl": "https://www.booking.com/searchresults.html?ss=Hotel+Name"
    }
  ],
  "restaurants": [],
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}
`;


      const response =
        await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
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
                  "openai/gpt-oss-20b",

                messages: [

                  {
                    role:
                      "system",

                    content:
                      "Return only valid JSON. Do not use markdown."
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

                max_completion_tokens:
                  5000,

                response_format:
                  {
                    type:
                      "json_object"
                  }

              })

          }
        );


      const responseText =
        await response.text();


      console.log(
        "Groq HTTP status:",
        response.status
      );


      if (
        !response.ok
      ) {

        console.error(
          "GROQ ERROR:",
          responseText
        );


        if (
          response.status === 429
        ) {

          throw new Error(
            "Groq rate limit reached. Please try again later."
          );

        }


        throw new Error(
          "Groq API request failed."
        );

      }


      let data;

      try {

        data =
          JSON.parse(
            responseText
          );

      } catch {

        console.error(
          "Invalid Groq HTTP response:",
          responseText
        );

        throw new Error(
          "Invalid response from Groq."
        );

      }


      const text =
        data
          ?.choices?.[0]
          ?.message?.content;


      if (!text) {

        console.error(
          "Groq returned no content:",
          JSON.stringify(data)
        );

        throw new Error(
          "Groq returned an empty response."
        );

      }


      let cleanText =
        String(text)
          .trim();


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

        throw new Error(
          "Groq returned invalid JSON."
        );

      }


      return travelData;

    }


    // =====================================================
    // RUN GROQ
    // =====================================================

    console.log(
      "Starting Groq plan generation..."
    );


    const travelData =
      await generatePlanWithGroq();


    // =====================================================
    // NORMALIZE STAY
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
                ? hotel.amenities.slice(
                    0,
                    6
                  )
                : [],

            description:
              hotel.description ||
              "",

            bookingUrl:
              hotel.bookingUrl ||
              (
                "https://www.booking.com/searchresults.html?ss=" +
                encodeURIComponent(
                  hotel.name
                )
              ),

            imageUrl:
              "",

            imageSource:
              "",

            imageAttribution:
              "",

            mapsUrl:
              "",

            osmUrl:
              "",

            latitude:
              null,

            longitude:
              null

          })
        );


    // =====================================================
    // REMOVE DUPLICATE AI HOTELS
    // =====================================================

    const uniqueHotels = [];

    const hotelNames =
      new Set();


    for (
      const hotel
      of travelData.stay
    ) {

      const key =
        normalizePlaceName(
          hotel.name
        );


      if (
        key &&
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


    // =====================================================
    // OSM DATA
    //
    // ONE REQUEST FOR HOTELS + RESTAURANTS
    // =====================================================

    console.log(
      "Getting hotels and restaurants from OSM..."
    );


    const osmPlaces =
      await getOSMPlaces(
        destination
      );


    // =====================================================
    // MATCH OSM HOTEL DATA TO AI HOTELS
    //
    // Especially imageUrl.
    // =====================================================

    travelData.stay =
      travelData.stay.map(
        hotel => {

          let bestOSMHotel =
            null;

          let bestScore =
            0;


          for (
            const osmHotel
            of osmPlaces.hotels
          ) {

            const similarity =
              calculateNameSimilarity(
                hotel.name,
                osmHotel.name
              );


            if (
              similarity >
              bestScore
            ) {

              bestScore =
                similarity;

              bestOSMHotel =
                osmHotel;

            }

          }


          /*
           * Only match reasonably similar hotel names.
           */

          if (
            bestOSMHotel &&
            bestScore >= 0.65
          ) {

            return {

              ...hotel,

              /*
               * OSM image has priority.
               */

              imageUrl:
                bestOSMHotel.imageUrl ||
                "",

              imageSource:
                bestOSMHotel.imageSource ||
                "",

              imageAttribution:
                bestOSMHotel.imageAttribution ||
                "",

              mapsUrl:
                bestOSMHotel.mapsUrl ||
                "",

              osmUrl:
                bestOSMHotel.osmUrl ||
                "",

              latitude:
                bestOSMHotel.latitude,

              longitude:
                bestOSMHotel.longitude,

              /*
               * If OSM has real star data,
               * prefer it.
               */

              stars:
                bestOSMHotel.stars ||
                hotel.stars,

              /*
               * If OSM has amenities,
               * merge them with AI amenities.
               */

              amenities:
                Array.from(
                  new Set(
                    [
                      ...(hotel.amenities || []),
                      ...(bestOSMHotel.amenities || [])
                    ]
                  )
                ).slice(
                  0,
                  6
                )

            };

          }


          return hotel;

        }
      );


    // =====================================================
    // RESTAURANTS
    //
    // DIRECTLY FROM OSM.
    //
    // NO FOURSQUARE.
    // NO ENRICHMENT.
    // NO EXTRA REQUEST.
    // =====================================================

    travelData.restaurants =
      osmPlaces.restaurants.slice(
        0,
        15
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
        travelData.stay
      )
    ) {

      travelData.stay = [];

    }


    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants = [];

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
      "Places provider: OpenStreetMap"
    );

    console.log(
      "Hotels:",
      travelData.stay.length
    );

    console.log(
      "Hotels with OSM images:",
      travelData.stay.filter(
        hotel =>
          !!hotel.imageUrl
      ).length
    );

    console.log(
      "Restaurants:",
      travelData.restaurants.length
    );

    console.log(
      "Restaurants with OSM images:",
      travelData.restaurants.filter(
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
        error.message ||
        "Server error while generating travel plan."

    });

  }

};

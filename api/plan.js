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
    // GROQ API KEY
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
    // CONSTANTS
    // =====================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";

    const GROQ_MODEL =
      "openai/gpt-oss-20b";


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
    // GEOCODE DESTINATION
    // =====================================================

    async function geocodeDestination(
      place
    ) {

      try {

        const url =
          "https://nominatim.openstreetmap.org/search" +
          "?format=json" +
          "&limit=1" +
          "&q=" +
          encodeURIComponent(
            place
          );


        console.log(
          "OSM geocoding:",
          place
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
          "Geocoding exception:",
          error.message
        );

        return null;

      }

    }


    // =====================================================
    // GET REAL PLACES FROM OPENSTREETMAP
    //
    // ONE OVERPASS REQUEST ONLY
    //
    // Hotels + Restaurants together.
    // =====================================================

    async function getOSMPlaces(
      destination
    ) {

      try {

        const coordinates =
          await geocodeDestination(
            destination
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
          "Destination coordinates:",
          lat,
          lon
        );


        // -------------------------------------------------
        // ONE OVERPASS QUERY
        // -------------------------------------------------

        const overpassQuery = `
[out:json][timeout:40];

(
  node["tourism"="hotel"](around:15000,${lat},${lon});
  way["tourism"="hotel"](around:15000,${lat},${lon});
  relation["tourism"="hotel"](around:15000,${lat},${lon});

  node["tourism"="hostel"](around:15000,${lat},${lon});
  way["tourism"="hostel"](around:15000,${lat},${lon});
  relation["tourism"="hostel"](around:15000,${lat},${lon});

  node["amenity"="restaurant"](around:15000,${lat},${lon});
  way["amenity"="restaurant"](around:15000,${lat},${lon});
  relation["amenity"="restaurant"](around:15000,${lat},${lon});
);

out center tags;
`;


        const overpassURL =
          "https://overpass-api.de/api/interpreter";


        console.log(
          "OpenStreetMap Overpass request..."
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


        if (
          !response.ok
        ) {

          console.error(
            "Overpass error:",
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
          "OSM total elements:",
          data.elements.length
        );


        const hotels = [];
        const restaurants = [];

        const hotelNames = new Set();
        const restaurantNames = new Set();


        // =================================================
        // PROCESS OSM ELEMENTS
        // =================================================

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


          // ------------------------------------------------
          // COORDINATES
          // ------------------------------------------------

          let itemLat =
            item.lat;

          let itemLon =
            item.lon;


          if (
            itemLat === undefined &&
            item.center
          ) {

            itemLat =
              item.center.lat;

            itemLon =
              item.center.lon;

          }


          const latitude =
            Number(itemLat);

          const longitude =
            Number(itemLon);


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


          // ------------------------------------------------
          // IMAGE
          //
          // IMPORTANT:
          // We ONLY use an image explicitly stored in OSM.
          //
          // No Foursquare.
          // No Google.
          // No random image.
          // ------------------------------------------------

          const imageUrl =
            tags.image ||
            tags["contact:image"] ||
            "";


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
          // HOTEL
          // ------------------------------------------------

          const tourismType =
            tags.tourism;


          if (
            tourismType === "hotel" ||
            tourismType === "hostel"
          ) {

            const normalizedName =
              normalizePlaceName(
                name
              );


            if (
              !hotelNames.has(
                normalizedName
              )
            ) {

              hotelNames.add(
                normalizedName
              );


              let stars =
                null;


              if (
                tags.stars !== undefined
              ) {

                const numericStars =
                  Number(
                    tags.stars
                  );


                if (
                  Number.isFinite(
                    numericStars
                  )
                ) {

                  stars =
                    numericStars;

                }

              }


              hotels.push({

                name:
                  String(name),

                stars,

                tourism:
                  tourismType,

                address,

                latitude:
                  Number.isFinite(
                    latitude
                  )
                    ? latitude
                    : null,

                longitude:
                  Number.isFinite(
                    longitude
                  )
                    ? longitude
                    : null,

                imageUrl:
                  String(
                    imageUrl || ""
                  ),

                website:
                  String(
                    website || ""
                  ),

                phone:
                  String(
                    phone || ""
                  ),

                osmUrl,

                osmType:
                  item.type || "",

                osmId:
                  item.id || null

              });

            }

          }


          // ------------------------------------------------
          // RESTAURANT
          // ------------------------------------------------

          if (
            tags.amenity ===
            "restaurant"
          ) {

            const normalizedName =
              normalizePlaceName(
                name
              );


            if (
              !restaurantNames.has(
                normalizedName
              )
            ) {

              restaurantNames.add(
                normalizedName
              );


              const cuisine =
                tags.cuisine ||
                "Local cuisine";


              const priceLevel =
                tags["price:level"] ||
                tags["price_range"] ||
                "$$";


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


              let mapsUrl = "";


              if (
                Number.isFinite(
                  latitude
                ) &&
                Number.isFinite(
                  longitude
                )
              ) {

                mapsUrl =
                  "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(
                    latitude +
                    "," +
                    longitude
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
                  `${name} is a real local restaurant listed in OpenStreetMap.`,

                imageUrl:
                  String(
                    imageUrl || ""
                  ),

                imageSource:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                imageAttribution:
                  imageUrl
                    ? "OpenStreetMap"
                    : "",

                mapsUrl,

                osmUrl,

                website:
                  String(
                    website || ""
                  ),

                phone:
                  String(
                    phone || ""
                  ),

                openingHours:
                  tags.opening_hours ||
                  "",

                latitude:
                  Number.isFinite(
                    latitude
                  )
                    ? latitude
                    : null,

                longitude:
                  Number.isFinite(
                    longitude
                  )
                    ? longitude
                    : null,

                osmType:
                  item.type || "",

                osmId:
                  item.id || null

              });

            }

          }

        }


        // =================================================
        // SORT HOTELS
        //
        // Prefer hotels with actual OSM images.
        // =================================================

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
              aImage !==
              bImage
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


        // =================================================
        // SORT RESTAURANTS
        // =================================================

        restaurants.sort(
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


        console.log(
          "OSM hotels:",
          hotels.length
        );

        console.log(
          "OSM hotel images:",
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
          "OSM restaurant images:",
          restaurants.filter(
            restaurant =>
              !!restaurant.imageUrl
          ).length
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
              15
            )

        };

      } catch (error) {

        console.error(
          "OSM places error:",
          error.message
        );

        return {
          hotels: [],
          restaurants: []
        };

      }

    }


    // =====================================================
    // GET REAL OSM DATA FIRST
    // =====================================================

    console.log(
      "Loading real hotels and restaurants from OSM..."
    );


    const osmData =
      await getOSMPlaces(
        destination
      );


    console.log(
      "Real OSM hotels available:",
      osmData.hotels.length
    );


    console.log(
      "Real OSM restaurants available:",
      osmData.restaurants.length
    );


    // =====================================================
    // PREPARE HOTEL DATA FOR GROQ
    //
    // Groq may SELECT hotels.
    // It must NOT invent them.
    // =====================================================

    const hotelCandidates =
      osmData.hotels
        .slice(
          0,
          30
        )
        .map(
          (hotel, index) => ({

            id:
              index + 1,

            name:
              hotel.name,

            stars:
              hotel.stars,

            address:
              hotel.address,

            imageUrl:
              hotel.imageUrl,

            website:
              hotel.website,

            osmUrl:
              hotel.osmUrl

          })
        );


    // =====================================================
    // GROQ PROMPT
    // =====================================================

    const prompt = `
You are an expert travel planner.

Create a realistic travel plan.

Destination: ${destination}
Start date: ${startDate || "Flexible"}
Days: ${days}
Budget: $${budget}
Travelers: ${travelers}
Interests: ${interests || "General sightseeing"}
Notes: ${notes || "None"}

IMPORTANT HOTEL RULES:

You are given a list of REAL hotels obtained from OpenStreetMap.

You MUST select hotels ONLY from this list.

DO NOT invent hotel names.

DO NOT create hotels that are not in the supplied list.

Select up to 10 different hotels.

For every selected hotel return:

- name
- stars
- price
- currency
- priceType
- amenities
- description
- bookingUrl
- imageUrl

The "name" MUST exactly match one of the supplied OSM hotel names.

The "imageUrl" MUST exactly match the imageUrl supplied by OSM.

If an OSM hotel has no imageUrl, return an empty string for imageUrl.

NEVER invent an image URL.

Prices are estimates only.

Never claim live availability.

For bookingUrl:
Use a Booking.com search URL for the exact hotel and destination.

IMPORTANT RESTAURANTS:

Do NOT generate restaurants.

Restaurants are already provided separately from OpenStreetMap.

Return:

"restaurants": []

Create:

transport
experiences
money
daysPlan

These four fields must contain HTML.

RETURN ONLY JSON.

Use this structure:

{
  "stay": [
    {
      "name": "Exact OSM hotel name",
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
      "description": "Short useful description.",
      "bookingUrl": "https://www.booking.com/searchresults.html?ss=Hotel+Name",
      "imageUrl": "EXACT OSM IMAGE URL OR EMPTY STRING"
    }
  ],
  "restaurants": [],
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}

REAL OSM HOTEL LIST:

${JSON.stringify(
  hotelCandidates
)}
`;


    // =====================================================
    // GROQ REQUEST
    // =====================================================

    console.log(
      "Sending ONE request to Groq..."
    );


    const groqResponse =
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

          body: JSON.stringify({

            model:
              GROQ_MODEL,

            messages: [

              {
                role:
                  "system",

                content:
                  "You are a precise travel planning assistant. Return valid JSON only. Never invent real-world hotels when a supplied list exists."
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
              6000,

            response_format: {
              type:
                "json_object"
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

    if (
      !groqResponse.ok
    ) {

      console.error(
        "GROQ ERROR:",
        groqText
      );


      return res.status(500).json({

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
    // GET GROQ CONTENT
    // =====================================================

    const text =
      groqData
        ?.choices?.[0]
        ?.message
        ?.content;


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
    // PARSE TRAVEL JSON
    // =====================================================

    let travelData;


    try {

      travelData =
        JSON.parse(
          text
        );

    } catch (error) {

      console.error(
        "GROQ JSON PARSE ERROR:",
        text
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


    // =====================================================
    // IMPORTANT:
    // VALIDATE EVERY GROQ HOTEL AGAINST OSM.
    //
    // This prevents invented hotels.
    // =====================================================

    const osmHotelMap =
      new Map();


    for (
      const hotel
      of osmData.hotels
    ) {

      osmHotelMap.set(
        normalizePlaceName(
          hotel.name
        ),
        hotel
      );

    }


    const validatedHotels =
      [];


    for (
      const hotel
      of travelData.stay
    ) {

      if (
        !hotel ||
        !hotel.name
      ) {

        continue;

      }


      const normalizedName =
        normalizePlaceName(
          hotel.name
        );


      const realHotel =
        osmHotelMap.get(
          normalizedName
        );


      if (
        !realHotel
      ) {

        console.warn(
          "Groq hotel rejected because it was not found in OSM:",
          hotel.name
        );

        continue;

      }


      // -------------------------------------------------
      // ALWAYS USE OSM IMAGE
      //
      // Never trust an image generated by Groq.
      // -------------------------------------------------

      const finalImage =
        realHotel.imageUrl ||
        "";


      validatedHotels.push({

        name:
          realHotel.name,

        stars:
          Number(
            hotel.stars
          ) ||
          Number(
            realHotel.stars
          ) ||
          0,

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
          `${realHotel.name} is a real accommodation listed in OpenStreetMap.`,

        bookingUrl:
          hotel.bookingUrl ||
          (
            "https://www.booking.com/searchresults.html?ss=" +
            encodeURIComponent(
              realHotel.name
            )
          ),

        imageUrl:
          finalImage,

        photoAttribution:
          finalImage
            ? "OpenStreetMap"
            : "",

        photoSource:
          finalImage
            ? "OpenStreetMap"
            : "",

        address:
          realHotel.address,

        website:
          realHotel.website,

        osmUrl:
          realHotel.osmUrl

      });

    }


    // =====================================================
    // REMOVE DUPLICATE HOTELS
    // =====================================================

    const uniqueHotels =
      [];

    const seenHotels =
      new Set();


    for (
      const hotel
      of validatedHotels
    ) {

      const key =
        normalizePlaceName(
          hotel.name
        );


      if (
        !seenHotels.has(
          key
        )
      ) {

        seenHotels.add(
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
      "Validated hotels:",
      travelData.stay.length
    );


    console.log(
      "Hotels with OSM images:",
      travelData.stay.filter(
        hotel =>
          !!hotel.imageUrl
      ).length
    );


    // =====================================================
    // RESTAURANTS
    //
    // IMPORTANT:
    // They came directly from ONE OSM query.
    //
    // No Foursquare.
    // No second restaurant API.
    // =====================================================

    travelData.restaurants =
      osmData.restaurants
        .slice(
          0,
          15
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
      "Real places provider: OpenStreetMap"
    );


    console.log(
      "Hotels:",
      travelData.stay.length
    );


    console.log(
      "Hotels with images:",
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
      "Restaurant images:",
      travelData.restaurants.filter(
        restaurant =>
          !!restaurant.imageUrl
      ).length
    );


    console.log(
      "Gemini calls: 0"
    );


    console.log(
      "Foursquare calls: 0"
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

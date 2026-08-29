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
    // API KEYS
    // =====================================================

    const GROQ_API_KEY =
      process.env.GROQ_API_KEY;

    const FOURSQUARE_API_KEY =
      process.env.FOURSQUARE_API_KEY;


    // =====================================================
    // GROQ KEY CHECK
    // =====================================================

    if (!GROQ_API_KEY) {

      console.error(
        "GROQ_API_KEY missing"
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
    // FOURSQUARE KEY CHECK
    // =====================================================

    if (!FOURSQUARE_API_KEY) {

      console.warn(
        "FOURSQUARE_API_KEY missing."
      );

      console.warn(
        "Restaurants will still load from OpenStreetMap, but Foursquare photos will not be available."
      );

    } else {

      console.log(
        "FOURSQUARE_API_KEY detected."
      );

    }


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
    // GROQ URL
    // =====================================================

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

For bookingUrl:
If you do not know the exact hotel Booking.com page,
create a Booking.com search URL for that hotel and destination.

Do NOT return hotel image URLs.

Hotel images are handled separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT generate restaurant names.

Restaurants will be obtained separately from OpenStreetMap and Foursquare.

Therefore return:

"restaurants": []

IMPORTANT OUTPUT REQUIREMENTS:

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Do not add explanations before or after the JSON.

transport, experiences, money and daysPlan must contain HTML.

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
              "openai/gpt-oss-120b",

            messages: [
              {
                role: "user",
                content: prompt
              }
            ],

            temperature: 0.3,

            max_completion_tokens:
              6000,

            response_format: {
              type: "json_object"
            },

            reasoning_effort:
              "low"
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


      let errorDetails =
        groqText;

      try {

        const parsedError =
          JSON.parse(
            groqText
          );

        errorDetails =
          parsedError?.error?.message ||
          groqText;

      } catch {
        // Keep original text.
      }


      if (
        groqResponse.status === 429
      ) {

        return res.status(429).json({

          error:
            "The AI service has reached its current free usage limit. Please try again later.",

          provider:
            "Groq",

          status:
            429,

          details:
            errorDetails

        });

      }


      return res.status(502).json({

        error:
          "Groq API request failed.",

        provider:
          "Groq",

        status:
          groqResponse.status,

        details:
          errorDetails

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
        ?.message
        ?.content;


    if (!text) {

      console.error(
        "Groq returned no text:",
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
    // CLEAN GROQ JSON
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
              "",

            imageUrl:
              "",

            photoAttribution:
              "",

            photoSource:
              ""

          })
        );


    // =====================================================
    // REMOVE DUPLICATE HOTELS
    // =====================================================

    const uniqueHotels = [];

    const hotelNames =
      new Set();


    for (
      const hotel
      of travelData.stay
    ) {

      const key =
        hotel.name
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
    // NO RANDOM HOTEL IMAGES
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
    // FOURSQUARE API VERSION
    // =====================================================

    const FOURSQUARE_API_VERSION =
      "2025-06-17";


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
    // CALCULATE NAME SIMILARITY
    // =====================================================

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


      if (
        !a ||
        !b
      ) {

        return 0;

      }


      if (
        a === b
      ) {

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
          a.split(
            /\s+/
          )
        );

      const bWords =
        new Set(
          b.split(
            /\s+/
          )
        );


      let common =
        0;


      for (
        const word
        of aWords
      ) {

        if (
          bWords.has(
            word
          )
        ) {

          common++;

        }

      }


      const total =
        Math.max(
          aWords.size,
          bWords.size
        );


      if (
        total === 0
      ) {

        return 0;

      }


      return (
        common /
        total
      );

    }


    // =====================================================
    // DISTANCE BETWEEN COORDINATES
    // =====================================================

    function coordinateDistance(
      lat1,
      lon1,
      lat2,
      lon2
    ) {

      const aLat =
        Number(lat1);

      const aLon =
        Number(lon1);

      const bLat =
        Number(lat2);

      const bLon =
        Number(lon2);


      if (
        !Number.isFinite(aLat) ||
        !Number.isFinite(aLon) ||
        !Number.isFinite(bLat) ||
        !Number.isFinite(bLon)
      ) {

        return Infinity;

      }


      const earthRadius =
        6371000;


      const lat1Rad =
        aLat *
        Math.PI /
        180;

      const lat2Rad =
        bLat *
        Math.PI /
        180;

      const deltaLat =
        (
          bLat -
          aLat
        ) *
        Math.PI /
        180;

      const deltaLon =
        (
          bLon -
          aLon
        ) *
        Math.PI /
        180;


      const a =
        Math.sin(
          deltaLat / 2
        ) *
        Math.sin(
          deltaLat / 2
        ) +
        Math.cos(
          lat1Rad
        ) *
        Math.cos(
          lat2Rad
        ) *
        Math.sin(
          deltaLon / 2
        ) *
        Math.sin(
          deltaLon / 2
        );


      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(
            1 - a
          )
        );


      return (
        earthRadius *
        c
      );

    }


    // =====================================================
    // FOURSQUARE SEARCH
    // =====================================================

    async function findFoursquarePlace(
      name,
      latitude,
      longitude
    ) {

      try {

        if (
          !FOURSQUARE_API_KEY
        ) {

          return null;

        }


        if (
          !name ||
          !Number.isFinite(
            Number(latitude)
          ) ||
          !Number.isFinite(
            Number(longitude)
          )
        ) {

          return null;

        }


        const params =
          new URLSearchParams();


        params.set(
          "query",
          name
        );

        params.set(
          "ll",
          `${latitude},${longitude}`
        );

        params.set(
          "radius",
          "1500"
        );

        params.set(
          "limit",
          "10"
        );


        const url =
          "https://places-api.foursquare.com/places/search?" +
          params.toString();


        console.log(
          "Foursquare search:",
          name
        );


        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {

                "Accept":
                  "application/json",

                "Authorization":
                  "Bearer " +
                  FOURSQUARE_API_KEY,

                "X-Places-Api-Version":
                  FOURSQUARE_API_VERSION

              }
            }
          );


        const responseText =
          await response.text();


        if (
          !response.ok
        ) {

          console.error(
            "Foursquare search error:",
            response.status,
            responseText
          );

          return null;

        }


        let data;

        try {

          data =
            JSON.parse(
              responseText
            );

        } catch {

          console.error(
            "Foursquare search returned invalid JSON."
          );

          return null;

        }


        if (
          !data ||
          !Array.isArray(
            data.results
          ) ||
          data.results.length === 0
        ) {

          console.log(
            "No Foursquare results:",
            name
          );

          return null;

        }


        // -------------------------------------------------
        // CHOOSE BEST MATCH
        // -------------------------------------------------

        let best =
          null;

        let bestScore =
          -Infinity;


        for (
          const place
          of data.results
        ) {

          const placeName =
            place?.name ||
            "";


          const placeLat =
            Number(
              place?.latitude ??
              place?.geocodes?.main?.latitude
            );


          const placeLon =
            Number(
              place?.longitude ??
              place?.geocodes?.main?.longitude
            );


          const similarity =
            calculateNameSimilarity(
              name,
              placeName
            );


          const distance =
            coordinateDistance(
              latitude,
              longitude,
              placeLat,
              placeLon
            );


          const distanceScore =
            Number.isFinite(
              distance
            )
              ? Math.max(
                  0,
                  1 -
                  (
                    distance /
                    1500
                  )
                )
              : 0;


          const score =
            (
              similarity *
              0.75
            ) +
            (
              distanceScore *
              0.25
            );


          console.log(
            "Foursquare candidate:",
            placeName,
            "| similarity:",
            similarity.toFixed(2),
            "| distance:",
            Number.isFinite(
              distance
            )
              ? Math.round(
                  distance
                ) + "m"
              : "unknown",
            "| score:",
            score.toFixed(2)
          );


          if (
            score >
            bestScore
          ) {

            bestScore =
              score;

            best =
              place;

          }

        }


        if (
          !best
        ) {

          return null;

        }


        // -------------------------------------------------
        // SAFETY CHECK
        // -------------------------------------------------

        const finalSimilarity =
          calculateNameSimilarity(
            name,
            best?.name
          );


        const finalDistance =
          coordinateDistance(
            latitude,
            longitude,
            best?.latitude ??
              best?.geocodes?.main?.latitude,
            best?.longitude ??
              best?.geocodes?.main?.longitude
          );


        if (
          finalSimilarity < 0.30 &&
          finalDistance > 500
        ) {

          console.log(
            "Foursquare match rejected as unrelated:",
            name,
            "=>",
            best?.name
          );

          return null;

        }


        console.log(
          "Foursquare best match:",
          name,
          "=>",
          best?.name,
          "| score:",
          bestScore.toFixed(2)
        );


        return best;

      } catch (error) {

        console.error(
          "Foursquare search exception:",
          error.message
        );

        return null;

      }

    }


    // =====================================================
    // GET FOURSQUARE PLACE DETAILS
    // =====================================================

    async function getFoursquarePlaceDetails(
      fsqPlaceId
    ) {

      try {

        if (
          !FOURSQUARE_API_KEY ||
          !fsqPlaceId
        ) {

          return null;

        }


        const fields = [
          "fsq_place_id",
          "name",
          "rating",
          "location",
          "website",
          "tel",
          "categories"
        ].join(",");


        const url =
          "https://places-api.foursquare.com/places/" +
          encodeURIComponent(
            fsqPlaceId
          ) +
          "?fields=" +
          encodeURIComponent(
            fields
          );


        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {

                "Accept":
                  "application/json",

                "Authorization":
                  "Bearer " +
                  FOURSQUARE_API_KEY,

                "X-Places-Api-Version":
                  FOURSQUARE_API_VERSION

              }
            }
          );


        const responseText =
          await response.text();


        if (
          !response.ok
        ) {

          console.warn(
            "Foursquare details unavailable:",
            response.status,
            responseText
          );

          return null;

        }


        try {

          return JSON.parse(
            responseText
          );

        } catch {

          console.warn(
            "Foursquare details returned invalid JSON."
          );

          return null;

        }

      } catch (error) {

        console.error(
          "Foursquare details error:",
          error.message
        );

        return null;

      }

    }


    // =====================================================
    // GET FOURSQUARE PLACE PHOTOS
    // =====================================================

    async function getFoursquarePlacePhotos(
      fsqPlaceId
    ) {

      try {

        if (
          !FOURSQUARE_API_KEY ||
          !fsqPlaceId
        ) {

          return [];

        }


        const params =
          new URLSearchParams();


        params.set(
          "limit",
          "10"
        );


        params.set(
          "classifications",
          "food_or_drink,outdoor_building_exterior,outdoor_or_storefront,outdoor"
        );


        const url =
          "https://places-api.foursquare.com/places/" +
          encodeURIComponent(
            fsqPlaceId
          ) +
          "/photos?" +
          params.toString();


        console.log(
          "Foursquare photos request:",
          fsqPlaceId
        );


        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {

                "Accept":
                  "application/json",

                "Authorization":
                  "Bearer " +
                  FOURSQUARE_API_KEY,

                "X-Places-Api-Version":
                  FOURSQUARE_API_VERSION

              }
            }
          );


        const responseText =
          await response.text();


        console.log(
          "Foursquare photos HTTP status:",
          response.status
        );


        if (
          !response.ok
        ) {

          console.warn(
            "Foursquare photos error:",
            response.status,
            responseText
          );

          return [];

        }


        let data;

        try {

          data =
            JSON.parse(
              responseText
            );

        } catch {

          console.warn(
            "Could not parse Foursquare photos response:",
            responseText
          );

          return [];

        }


        if (
          !Array.isArray(
            data
          )
        ) {

          console.warn(
            "Foursquare photos response is not an array:",
            JSON.stringify(
              data
            )
          );

          return [];

        }


        console.log(
          "Foursquare raw photos:",
          data.length
        );


        const photoUrls =
          [];


        for (
          const photo
          of data
        ) {

          if (
            photo?.prefix &&
            photo?.suffix
          ) {

            const mediumUrl =
              String(
                photo.prefix
              ) +
              "600x600" +
              String(
                photo.suffix
              );


            const originalUrl =
              String(
                photo.prefix
              ) +
              "original" +
              String(
                photo.suffix
              );


            if (
              mediumUrl
            ) {

              photoUrls.push({

                url:
                  mediumUrl,

                originalUrl,

                attribution:
                  "Foursquare"

              });

            }

          } else if (
            photo?.url
          ) {

            photoUrls.push({

              url:
                String(
                  photo.url
                ),

              originalUrl:
                String(
                  photo.url
                ),

              attribution:
                "Foursquare"

            });

          }

        }


        console.log(
          "Foursquare usable photos:",
          photoUrls.length
        );


        return photoUrls;

      } catch (error) {

        console.error(
          "Foursquare photos exception:",
          error.message
        );

        return [];

      }

    }


    // =====================================================
    // ENRICH RESTAURANT WITH FOURSQUARE
    // =====================================================

    async function enrichRestaurantWithFoursquare(
      restaurant
    ) {

      try {

        if (
          !FOURSQUARE_API_KEY
        ) {

          return restaurant;

        }


        if (
          !restaurant ||
          !restaurant.name ||
          !Number.isFinite(
            Number(
              restaurant.latitude
            )
          ) ||
          !Number.isFinite(
            Number(
              restaurant.longitude
            )
          )
        ) {

          return restaurant;

        }


        const place =
          await findFoursquarePlace(
            restaurant.name,
            restaurant.latitude,
            restaurant.longitude
          );


        if (
          !place
        ) {

          console.log(
            "No Foursquare match:",
            restaurant.name
          );

          return restaurant;

        }


        const fsqId =
          place.fsq_place_id ||
          place.fsq_id ||
          "";


        if (
          !fsqId
        ) {

          console.log(
            "Foursquare result has no ID:",
            restaurant.name
          );

          return restaurant;

        }


        console.log(
          "Foursquare ID:",
          restaurant.name,
          "=>",
          fsqId
        );


        const details =
          await getFoursquarePlaceDetails(
            fsqId
          );


        const finalPlace =
          details ||
          place;


        const photos =
          await getFoursquarePlacePhotos(
            fsqId
          );


        let photoUrl =
          "";

        let photoAttribution =
          "";


        if (
          Array.isArray(
            photos
          ) &&
          photos.length > 0 &&
          photos[0]?.url
        ) {

          photoUrl =
            photos[0].url;

          photoAttribution =
            photos[0].attribution ||
            "Foursquare";

        }


        let rating =
          restaurant.rating;


        if (
          finalPlace.rating !== undefined &&
          finalPlace.rating !== null
        ) {

          const numericRating =
            Number(
              finalPlace.rating
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


        const website =
          restaurant.website ||
          finalPlace.website ||
          "";


        const phone =
          restaurant.phone ||
          finalPlace.tel ||
          "";


        const foursquareUrl =
          `https://foursquare.com/place/${encodeURIComponent(
            fsqId
          )}`;


        console.log(
          "Restaurant enriched:",
          restaurant.name,
          "| Foursquare:",
          fsqId,
          "| Photo:",
          photoUrl
            ? "YES"
            : "NO"
        );


        return {

          ...restaurant,

          rating,

          website,

          phone,

          foursquareId:
            fsqId,

          foursquareUrl,

          imageUrl:
            photoUrl ||
            "",

          imageSource:
            photoUrl
              ? "Foursquare"
              : "",

          imageAttribution:
            photoAttribution ||
            ""

        };

      } catch (error) {

        console.error(
          "Restaurant Foursquare enrichment error:",
          restaurant?.name,
          error.message
        );

        return restaurant;

      }

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


          const name =
            tags.name ||
            tags["name:en"] ||
            tags["name:tr"];


          if (
            !name
          ) {

            continue;

          }


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


          const cuisine =
            tags.cuisine ||
            "Local cuisine";


          const priceLevel =
            tags["price:level"] ||
            tags["price_range"] ||
            "$$";


          const website =
            tags.website ||
            tags["contact:website"] ||
            "";


          const phone =
            tags.phone ||
            tags["contact:phone"] ||
            "";


          const openingHours =
            tags.opening_hours ||
            "";


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


          let osmUrl =
            "";


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


          let description =
            `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`;


          if (
            cuisine
          ) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }


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
        // FOURSQUARE ENRICHMENT
        // -------------------------------------------------

        const candidates =
          uniqueRestaurants.slice(
            0,
            30
          );


        const enrichedRestaurants =
          [];


        const batchSize =
          5;


        for (
          let i = 0;
          i < candidates.length;
          i += batchSize
        ) {

          const batch =
            candidates.slice(
              i,
              i + batchSize
            );


          const batchResults =
            await Promise.all(
              batch.map(
                restaurant =>
                  enrichRestaurantWithFoursquare(
                    restaurant
                  )
              )
            );


          enrichedRestaurants.push(
            ...batchResults
          );


          console.log(
            "Foursquare enrichment progress:",
            Math.min(
              i + batchSize,
              candidates.length
            ),
            "/",
            candidates.length
          );

        }


        // -------------------------------------------------
        // PREFER REAL PHOTOS
        // -------------------------------------------------

        enrichedRestaurants.sort(
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


        const finalRestaurants =
          enrichedRestaurants.slice(
            0,
            15
          );


        console.log(
          "Final restaurants:",
          finalRestaurants.length
        );


        console.log(
          "Final restaurant photos:",
          finalRestaurants.filter(
            restaurant =>
              !!restaurant.imageUrl
          ).length
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
    // ENSURE RESTAURANTS ARRAY
    // =====================================================

    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants =
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
      "Foursquare restaurants:",
      travelData.restaurants.filter(
        restaurant =>
          !!restaurant.foursquareId
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

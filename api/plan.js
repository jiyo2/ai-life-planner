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
    console.log("======================================");


    // =====================================================
    // API KEYS
    // =====================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    const FOURSQUARE_API_KEY =
      process.env.FOURSQUARE_API_KEY;


    // =====================================================
    // GEMINI KEY CHECK
    // =====================================================

    if (!GEMINI_API_KEY) {

      console.error(
        "GEMINI_API_KEY missing"
      );

      return res.status(500).json({
        error:
          "Gemini API key is missing."
      });

    }


    // =====================================================
    // FOURSQUARE KEY
    //
    // IMPORTANT:
    // Foursquare is optional.
    //
    // If the key is missing, the application will STILL
    // work and restaurants will come from OpenStreetMap.
    // =====================================================

    if (!FOURSQUARE_API_KEY) {

      console.warn(
        "FOURSQUARE_API_KEY missing."
      );

      console.warn(
        "Restaurants will still load from OpenStreetMap, but verified Foursquare photos will not be available."
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
    // GEMINI URL
    // =====================================================

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(
        GEMINI_API_KEY
      );


    // =====================================================
    // GEMINI PROMPT
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


    // =====================================================
    // GEMINI REQUEST
    // =====================================================

    const geminiResponse =
      await fetch(
        GEMINI_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
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


    // =====================================================
    // GEMINI ERROR
    // =====================================================

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


    // =====================================================
    // PARSE GEMINI RESPONSE
    // =====================================================

    let geminiData;

    try {

      geminiData =
        JSON.parse(
          geminiText
        );

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


    // =====================================================
    // GET GEMINI TEXT
    // =====================================================

    const text =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;


    if (!text) {

      console.error(
        "Gemini returned no text:",
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response.",
        details:
          JSON.stringify(
            geminiData
          )
      });

    }


    // =====================================================
    // CLEAN GEMINI JSON
    // =====================================================

    let cleanText =
      text.trim();

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
    // NO PEXELS
    //
    // IMPORTANT:
    // Pexels has been completely removed.
    //
    // This means PEXELS_API_KEY is NOT required anymore.
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
    // FOURSQUARE SEARCH
    //
    // Uses the current Places API.
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
          "5"
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
                  "2025-06-17"

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

          return null;

        }


        if (
          !data ||
          !Array.isArray(
            data.results
          ) ||
          data.results.length === 0
        ) {

          return null;

        }


        // -------------------------------------------------
        // Choose closest reasonable result
        // -------------------------------------------------

        let best =
          data.results[0];


        let bestDistance =
          Infinity;


        for (
          const place
          of data.results
        ) {

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


          if (
            !Number.isFinite(
              placeLat
            ) ||
            !Number.isFinite(
              placeLon
            )
          ) {

            continue;

          }


          const distance =
            Math.sqrt(
              Math.pow(
                placeLat -
                  Number(
                    latitude
                  ),
                2
              ) +
              Math.pow(
                placeLon -
                  Number(
                    longitude
                  ),
                2
              )
            );


          if (
            distance <
            bestDistance
          ) {

            bestDistance =
              distance;

            best =
              place;

          }

        }


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


        const url =
          "https://places-api.foursquare.com/places/" +
          encodeURIComponent(
            fsqPlaceId
          ) +
          "?fields=" +
          encodeURIComponent(
            "fsq_place_id,name,photos,rating,location,website,tel,categories"
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
                  "2025-06-17"

              }
            }
          );


        if (
          !response.ok
        ) {

          console.warn(
            "Foursquare details unavailable:",
            response.status
          );

          return null;

        }


        return await response.json();

      } catch (error) {

        console.error(
          "Foursquare details error:",
          error.message
        );

        return null;

      }

    }


    // =====================================================
    // GET VERIFIED FOURSQUARE PHOTO
    // =====================================================

    function getFoursquarePhotoUrl(
      place
    ) {

      try {

        const photos =
          place?.photos;


        if (
          !Array.isArray(
            photos
          ) ||
          photos.length === 0
        ) {

          return "";

        }


        const photo =
          photos[0];


        // New Places API photo object
        // can expose prefix + suffix.

        if (
          photo?.prefix &&
          photo?.suffix
        ) {

          return (
            photo.prefix +
            "original" +
            photo.suffix
          );

        }


        if (
          photo?.url
        ) {

          return String(
            photo.url
          );

        }


        return "";

      } catch {

        return "";

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


        const place =
          await findFoursquarePlace(
            restaurant.name,
            restaurant.latitude,
            restaurant.longitude
          );


        if (
          !place
        ) {

          return restaurant;

        }


        const fsqId =
          place.fsq_place_id ||
          place.fsq_id ||
          "";


        if (
          !fsqId
        ) {

          return restaurant;

        }


        // -------------------------------------------------
        // Get complete place details
        // -------------------------------------------------

        const details =
          await getFoursquarePlaceDetails(
            fsqId
          );


        const finalPlace =
          details ||
          place;


        // -------------------------------------------------
        // PHOTO
        // -------------------------------------------------

        const photoUrl =
          getFoursquarePhotoUrl(
            finalPlace
          );


        // -------------------------------------------------
        // RATING
        // -------------------------------------------------

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


        // -------------------------------------------------
        // WEBSITE
        // -------------------------------------------------

        const website =
          restaurant.website ||
          finalPlace.website ||
          "";


        // -------------------------------------------------
        // PHONE
        // -------------------------------------------------

        const phone =
          restaurant.phone ||
          finalPlace.tel ||
          "";


        // -------------------------------------------------
        // FOURSQUARE URL
        // -------------------------------------------------

        const foursquareUrl =
          `https://foursquare.com/place/${encodeURIComponent(
            fsqId
          )}`;


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
            restaurant.imageUrl ||
            "",

          imageSource:
            photoUrl
              ? "Foursquare"
              : restaurant.imageSource ||
                "",

          imageAttribution:
            photoUrl
              ? "Foursquare"
              : restaurant.imageAttribution ||
                ""

        };

      } catch (error) {

        console.error(
          "Restaurant Foursquare enrichment error:",
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
        // OVERPASS
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


          // -------------------------------------------------
          // REVIEW COUNT
          // -------------------------------------------------

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


          // -------------------------------------------------
          // GOOGLE MAPS URL
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
          // OSM URL
          // -------------------------------------------------

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


          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          let description =
            `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`;


          if (
            cuisine
          ) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }


          // -------------------------------------------------
          // RESTAURANT OBJECT
          // -------------------------------------------------

          restaurants.push({

            name:
              String(name),

            cuisine:
              String(cuisine),

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


          // Collect extra options.
          if (
            restaurants.length >= 20
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
            restaurant.name
              .toLowerCase()
              .trim();


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
        //
        // Process one at a time to avoid excessive
        // API requests.
        // -------------------------------------------------

        const enrichedRestaurants =
          [];


        for (
          const restaurant
          of uniqueRestaurants.slice(
            0,
            15
          )
        ) {

          const enriched =
            await enrichRestaurantWithFoursquare(
              restaurant
            );


          enrichedRestaurants.push(
            enriched
          );

        }


        // -------------------------------------------------
        // PREFER VERIFIED PHOTOS
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


            return (
              bImage -
              aImage
            );

          }
        );


        // -------------------------------------------------
        // RETURN 10
        // -------------------------------------------------

        return enrichedRestaurants.slice(
          0,
          10
        );

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

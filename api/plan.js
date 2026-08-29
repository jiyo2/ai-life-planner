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

    console.log("PLAN API START");
    console.log("Destination:", destination);

    // =======================================================
    // API KEYS
    // =======================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    const PEXELS_API_KEY =
      process.env.PEXELS_API_KEY;

    const FOURSQUARE_API_KEY =
      process.env.FOURSQUARE_API_KEY;

    // =======================================================
    // CHECK GEMINI
    // =======================================================

    if (!GEMINI_API_KEY) {

      console.error(
        "GEMINI_API_KEY missing"
      );

      return res.status(500).json({
        error:
          "Gemini API key is missing."
      });

    }

    // =======================================================
    // CHECK PEXELS
    // =======================================================

    if (!PEXELS_API_KEY) {

      console.error(
        "PEXELS_API_KEY missing"
      );

      return res.status(500).json({
        error:
          "Pexels API key is missing. Add PEXELS_API_KEY to Vercel Environment Variables."
      });

    }

    // =======================================================
    // CHECK FOURSQUARE
    // =======================================================

    if (!FOURSQUARE_API_KEY) {

      console.error(
        "FOURSQUARE_API_KEY missing"
      );

      return res.status(500).json({
        error:
          "Foursquare API key is missing. Add FOURSQUARE_API_KEY to Vercel Environment Variables."
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
    // GEMINI
    // =======================================================

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(
        GEMINI_API_KEY
      );

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

Do NOT return image URLs.
Hotel images will be obtained separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT generate restaurant names.

Restaurants will be obtained separately from Foursquare.

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

    // =======================================================
    // GEMINI REQUEST
    // =======================================================

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

    // =======================================================
    // CLEAN JSON
    // =======================================================

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

    // =======================================================
    // TRAVEL DATA
    // =======================================================

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

    // =======================================================
    // REMOVE DUPLICATE HOTELS
    // =======================================================

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

    // =======================================================
    // PEXELS HOTEL IMAGE
    // =======================================================

    async function getHotelImage(
      hotelName,
      destination
    ) {

      try {

        const query1 =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels hotel search:",
          query1
        );

        let response =
          await fetch(
            "https://api.pexels.com/v1/search?query=" +
            encodeURIComponent(
              query1
            ) +
            "&per_page=5",
            {
              method: "GET",

              headers: {
                Authorization:
                  PEXELS_API_KEY
              }

            }
          );

        let data = null;

        try {

          data =
            await response.json();

        } catch (
          error
        ) {

          data = null;

        }

        // ---------------------------------------------------
        // FALLBACK HOTEL IMAGE
        // ---------------------------------------------------

        if (
          !response.ok ||
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          const query2 =
            `hotel ${destination}`;

          console.log(
            "Pexels fallback:",
            query2
          );

          response =
            await fetch(
              "https://api.pexels.com/v1/search?query=" +
              encodeURIComponent(
                query2
              ) +
              "&per_page=10",
              {
                method: "GET",

                headers: {
                  Authorization:
                    PEXELS_API_KEY
                }

              }
            );

          try {

            data =
              await response.json();

          } catch (
            error
          ) {

            data = null;

          }

        }

        if (
          !response.ok ||
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          return {
            imageUrl:
              "",
            photoAttribution:
              "",
            photoSource:
              ""
          };

        }

        const photo =
          data.photos[0];

        const imageUrl =
          photo?.src?.large2x ||
          photo?.src?.large ||
          photo?.src?.original ||
          "";

        return {

          imageUrl,

          photoAttribution:
            photo?.photographer ||
            "",

          photoSource:
            photo?.photographer_url ||
            "https://www.pexels.com/"

        };

      } catch (
        error
      ) {

        console.error(
          "Pexels error:",
          error.message
        );

        return {
          imageUrl:
            "",
          photoAttribution:
            "",
          photoSource:
            ""
        };

      }

    }

    // =======================================================
    // GET HOTEL IMAGES
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
        (
          hotel,
          index
        ) => ({

          ...hotel,

          imageUrl:
            hotelImages[index]
              ?.imageUrl ||
            "",

          photoAttribution:
            hotelImages[index]
              ?.photoAttribution ||
            "",

          photoSource:
            hotelImages[index]
              ?.photoSource ||
            ""

        })
      );

    // =======================================================
    // FOURSQUARE HELPERS
    // =======================================================

    const FOURSQUARE_BASE_URL =
      "https://places-api.foursquare.com";

    const FOURSQUARE_VERSION =
      "2025-06-17";

    // =======================================================
    // FOURSQUARE REQUEST HELPER
    // =======================================================

    async function foursquareFetch(
      url
    ) {

      try {

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
                  FOURSQUARE_VERSION

              }

            }
          );

        const text =
          await response.text();

        let data = null;

        try {

          data =
            JSON.parse(
              text
            );

        } catch (
          error
        ) {

          data = null;

        }

        if (
          !response.ok
        ) {

          console.error(
            "Foursquare HTTP error:",
            response.status,
            text
          );

          return {
            ok:
              false,
            status:
              response.status,
            data:
              null
          };

        }

        return {

          ok:
            true,

          status:
            response.status,

          data

        };

      } catch (
        error
      ) {

        console.error(
          "Foursquare request error:",
          error.message
        );

        return {

          ok:
            false,

          status:
            0,

          data:
            null

        };

      }

    }

    // =======================================================
    // FOURSQUARE PHOTO
    // =======================================================

    async function getFoursquarePhoto(
      placeId
    ) {

      try {

        if (
          !placeId
        ) {

          return {

            imageUrl:
              "",

            imageSource:
              "",

            imageAttribution:
              ""

          };

        }

        const photosURL =
          FOURSQUARE_BASE_URL +
          "/places/" +
          encodeURIComponent(
            placeId
          ) +
          "/photos?limit=1&sort=POPULAR";

        console.log(
          "Foursquare photo request:",
          placeId
        );

        const result =
          await foursquareFetch(
            photosURL
          );

        if (
          !result.ok ||
          !result.data
        ) {

          return {

            imageUrl:
              "",

            imageSource:
              "",

            imageAttribution:
              ""

          };

        }

        const photos =
          Array.isArray(
            result.data
          )
            ? result.data
            : result.data.photos;

        if (
          !Array.isArray(
            photos
          ) ||
          photos.length === 0
        ) {

          return {

            imageUrl:
              "",

            imageSource:
              "",

            imageAttribution:
              ""

          };

        }

        const photo =
          photos[0];

        // ---------------------------------------------------
        // FOURSQUARE PHOTO URL
        //
        // Current API responses provide photo prefix/suffix.
        // We assemble the actual image URL from them.
        // ---------------------------------------------------

        if (
          photo?.prefix &&
          photo?.suffix
        ) {

          const imageUrl =
            String(
              photo.prefix
            ) +
            "original" +
            String(
              photo.suffix
            );

          return {

            imageUrl,

            imageSource:
              "Foursquare",

            imageAttribution:
              "Photo from Foursquare"

          };

        }

        // ---------------------------------------------------
        // FALLBACK IF API RETURNS A DIRECT URL
        // ---------------------------------------------------

        if (
          photo?.url &&
          /^https?:\/\//i.test(
            String(
              photo.url
            )
          )
        ) {

          return {

            imageUrl:
              String(
                photo.url
              ),

            imageSource:
              "Foursquare",

            imageAttribution:
              "Photo from Foursquare"

          };

        }

        return {

          imageUrl:
            "",

          imageSource:
            "",

          imageAttribution:
            ""

        };

      } catch (
        error
      ) {

        console.error(
          "Foursquare photo error:",
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
    // FOURSQUARE RESTAURANT SEARCH
    // =======================================================

    async function getRestaurantsFromFoursquare(
      destination
    ) {

      try {

        console.log(
          "Foursquare restaurant search:",
          destination
        );

        // ---------------------------------------------------
        // SEARCH RESTAURANTS BY CITY
        // ---------------------------------------------------

        const searchURL =
          FOURSQUARE_BASE_URL +
          "/places/search?" +
          "near=" +
          encodeURIComponent(
            destination
          ) +
          "&query=restaurant" +
          "&limit=20" +
          "&sort=RATING" +
          "&fields=" +
          encodeURIComponent(
            [
              "fsq_place_id",
              "name",
              "categories",
              "location",
              "latitude",
              "longitude",
              "rating",
              "price",
              "description",
              "website",
              "tel",
              "hours"
            ].join(",")
          );

        console.log(
          "Foursquare search URL created"
        );

        const searchResult =
          await foursquareFetch(
            searchURL
          );

        if (
          !searchResult.ok ||
          !searchResult.data
        ) {

          console.error(
            "Foursquare restaurant search failed."
          );

          return [];

        }

        const places =
          Array.isArray(
            searchResult.data.results
          )
            ? searchResult.data.results
            : [];

        console.log(
          "Foursquare restaurants found:",
          places.length
        );

        if (
          places.length === 0
        ) {

          return [];

        }

        // ---------------------------------------------------
        // PROCESS PLACES
        // ---------------------------------------------------

        const restaurants =
          [];

        for (
          const place
          of places
        ) {

          if (
            !place ||
            !place.name
          ) {

            continue;

          }

          const placeId =
            place.fsq_place_id ||
            place.fsq_id ||
            "";

          if (
            !placeId
          ) {

            continue;

          }

          // -------------------------------------------------
          // CATEGORIES
          // -------------------------------------------------

          let cuisine =
            "Local cuisine";

          if (
            Array.isArray(
              place.categories
            ) &&
            place.categories.length > 0
          ) {

            const categoryNames =
              place.categories
                .map(
                  category =>
                    category?.name
                )
                .filter(Boolean);

            if (
              categoryNames.length > 0
            ) {

              cuisine =
                categoryNames
                  .slice(
                    0,
                    2
                  )
                  .join(
                    ", "
                  );

            }

          }

          // -------------------------------------------------
          // ADDRESS
          // -------------------------------------------------

          const location =
            place.location ||
            {};

          const address =
            location.formatted_address ||
            [
              location.address,
              location.locality,
              location.region
            ]
              .filter(Boolean)
              .join(
                ", "
              ) ||
            destination;

          // -------------------------------------------------
          // RATING
          // -------------------------------------------------

          let rating =
            null;

          if (
            place.rating !== undefined &&
            place.rating !== null
          ) {

            const numericRating =
              Number(
                place.rating
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
          // PRICE
          // -------------------------------------------------

          let priceLevel =
            "$$";

          if (
            place.price !== undefined &&
            place.price !== null
          ) {

            const numericPrice =
              Number(
                place.price
              );

            if (
              Number.isFinite(
                numericPrice
              ) &&
              numericPrice >= 1 &&
              numericPrice <= 4
            ) {

              priceLevel =
                "$".repeat(
                  numericPrice
                );

            }

          }

          // -------------------------------------------------
          // COORDINATES
          // -------------------------------------------------

          const latitude =
            Number(
              place.latitude
            );

          const longitude =
            Number(
              place.longitude
            );

          const validLatitude =
            Number.isFinite(
              latitude
            )
              ? latitude
              : null;

          const validLongitude =
            Number.isFinite(
              longitude
            )
              ? longitude
              : null;

          // -------------------------------------------------
          // MAPS URL
          // -------------------------------------------------

          let mapsUrl =
            "";

          if (
            validLatitude !== null &&
            validLongitude !== null
          ) {

            mapsUrl =
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                validLatitude +
                "," +
                validLongitude
              );

          } else {

            mapsUrl =
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                place.name +
                " " +
                destination
              );

          }

          // -------------------------------------------------
          // FOURSQUARE URL
          // -------------------------------------------------

          const foursquareUrl =
            "https://foursquare.com/" +
            "v/" +
            encodeURIComponent(
              placeId
            );

          // -------------------------------------------------
          // PHOTO
          // -------------------------------------------------

          const photo =
            await getFoursquarePhoto(
              placeId
            );

          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          let description =
            place.description ||
            `${place.name} is a real restaurant in ${destination}.`;

          // -------------------------------------------------
          // RESTAURANT OBJECT
          // -------------------------------------------------

          restaurants.push({

            name:
              String(
                place.name
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

            reviewCount:
              null,

            address:
              String(
                address
              ),

            description:
              String(
                description
              ),

            imageUrl:
              photo.imageUrl ||
              "",

            imageSource:
              photo.imageSource ||
              "",

            imageAttribution:
              photo.imageAttribution ||
              "",

            mapsUrl,

            foursquareUrl,

            website:
              place.website ||
              "",

            phone:
              place.tel ||
              "",

            openingHours:
              "",

            latitude:
              validLatitude,

            longitude:
              validLongitude,

            foursquarePlaceId:
              placeId

          });

        }

        // ---------------------------------------------------
        // REMOVE DUPLICATES
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // PRIORITIZE RESTAURANTS
        // WITH REAL FOURSQUARE PHOTOS
        // ---------------------------------------------------

        uniqueRestaurants.sort(
          (
            a,
            b
          ) => {

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

        // ---------------------------------------------------
        // LIMIT 10
        // ---------------------------------------------------

        return uniqueRestaurants.slice(
          0,
          10
        );

      } catch (
        error
      ) {

        console.error(
          "Foursquare restaurant error:",
          error
        );

        return [];

      }

    }

    // =======================================================
    // RESTAURANTS
    // =======================================================

    console.log(
      "Starting Foursquare restaurant search..."
    );

    travelData.restaurants =
      await getRestaurantsFromFoursquare(
        destination
      );

    console.log(
      "Foursquare restaurants returned:",
      travelData.restaurants.length
    );

    // =======================================================
    // OSM FALLBACK
    // =======================================================

    // If Foursquare returns no restaurants,
    // use OpenStreetMap as a fallback.
    //
    // This keeps the application functional even
    // if Foursquare has no results for the destination.

    if (
      travelData.restaurants.length === 0
    ) {

      console.log(
        "Foursquare returned no restaurants."
      );

      console.log(
        "Using OpenStreetMap fallback..."
      );

      async function getRestaurantsFromOSM(
        destination
      ) {

        try {

          const OSM_USER_AGENT =
            "AI-Life-Planner/1.0";

          // -------------------------------------------------
          // GEOCODE
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

          if (
            !geocodeResponse.ok
          ) {

            return [];

          }

          const locations =
            await geocodeResponse.json();

          if (
            !Array.isArray(
              locations
            ) ||
            locations.length === 0
          ) {

            return [];

          }

          const lat =
            Number(
              locations[0].lat
            );

          const lon =
            Number(
              locations[0].lon
            );

          if (
            !Number.isFinite(
              lat
            ) ||
            !Number.isFinite(
              lon
            )
          ) {

            return [];

          }

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

          const osmResponse =
            await fetch(
              "https://overpass-api.de/api/interpreter",
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

          if (
            !osmResponse.ok
          ) {

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

          const restaurants =
            [];

          for (
            const item
            of osmData.elements
          ) {

            const tags =
              item.tags ||
              {};

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
                tags[
                  "addr:housenumber"
                ]
              );

            }

            if (
              tags["addr:street"]
            ) {

              addressParts.push(
                tags[
                  "addr:street"
                ]
              );

            }

            if (
              tags["addr:suburb"]
            ) {

              addressParts.push(
                tags[
                  "addr:suburb"
                ]
              );

            }

            if (
              tags["addr:district"]
            ) {

              addressParts.push(
                tags[
                  "addr:district"
                ]
              );

            }

            if (
              tags["addr:city"]
            ) {

              addressParts.push(
                tags[
                  "addr:city"
                ]
              );

            }

            const address =
              addressParts.length
                ? addressParts.join(
                    ", "
                  )
                : destination;

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
                "https://www.openstreetmap.org/" +
                encodeURIComponent(
                  item.type
                ) +
                "/" +
                encodeURIComponent(
                  item.id
                );

            }

            restaurants.push({

              name:
                String(
                  name
                ),

              cuisine:
                String(
                  tags.cuisine ||
                  "Local cuisine"
                ),

              priceLevel:
                "$$",

              rating:
                null,

              reviewCount:
                null,

              address:
                String(
                  address
                ),

              description:
                `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`,

              imageUrl:
                "",

              imageSource:
                "",

              imageAttribution:
                "",

              mapsUrl,

              osmUrl,

              website:
                tags.website ||
                tags[
                  "contact:website"
                ] ||
                "",

              phone:
                tags.phone ||
                tags[
                  "contact:phone"
                ] ||
                "",

              openingHours:
                tags.opening_hours ||
                "",

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
                  : null

            });

            if (
              restaurants.length >= 15
            ) {

              break;

            }

          }

          const unique =
            [];

          const names =
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
              !names.has(
                key
              )
            ) {

              names.add(
                key
              );

              unique.push(
                restaurant
              );

            }

          }

          return unique.slice(
            0,
            10
          );

        } catch (
          error
        ) {

          console.error(
            "OSM fallback error:",
            error.message
          );

          return [];

        }

      }

      travelData.restaurants =
        await getRestaurantsFromOSM(
          destination
        );

    }

    // =======================================================
    // RESTAURANT FINAL LOG
    // =======================================================

    console.log(
      "Final restaurant count:",
      travelData.restaurants.length
    );

    console.log(
      "Restaurants with images:",
      travelData.restaurants.filter(
        restaurant =>
          restaurant.imageUrl
      ).length
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
    // SUCCESS
    // =======================================================

    console.log(
      "PLAN API SUCCESS"
    );

    console.log(
      "Final restaurants:",
      JSON.stringify(
        travelData.restaurants,
        null,
        2
      )
    );

    return res.status(200).json(
      travelData
    );

  } catch (
    error
  ) {

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

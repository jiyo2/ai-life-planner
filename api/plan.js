module.exports = async (req, res) => {

  // =======================================================
  // CORS
  // =======================================================

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

    console.log("======================================");
    console.log("PLAN API START");
    console.log("Destination:", destination);
    console.log("======================================");

    // =======================================================
    // API KEYS
    // =======================================================

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    const PEXELS_API_KEY =
      process.env.PEXELS_API_KEY || "";

    const FOURSQUARE_API_KEY =
      process.env.FOURSQUARE_API_KEY || "";

    // =======================================================
    // GEMINI KEY IS REQUIRED
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
    // IMPORTANT:
    // PEXELS IS OPTIONAL
    //
    // Missing Pexels must NOT stop the application.
    // =======================================================

    if (!PEXELS_API_KEY) {

      console.warn(
        "PEXELS_API_KEY missing - continuing without hotel images."
      );

    }

    // =======================================================
    // FOURSQUARE IS OPTIONAL FOR APP TO WORK
    //
    // But if present, it will be used for restaurant
    // matching and real restaurant photos.
    // =======================================================

    if (!FOURSQUARE_API_KEY) {

      console.warn(
        "FOURSQUARE_API_KEY missing - restaurant photos unavailable."
      );

    } else {

      console.log(
        "FOURSQUARE_API_KEY detected."
      );

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
    // GEMINI URL
    // =======================================================

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
      encodeURIComponent(
        GEMINI_API_KEY
      );

    // =======================================================
    // GEMINI PROMPT
    // =======================================================

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
    // OPTIONAL
    // =======================================================

    async function getHotelImage(
      hotelName,
      destination
    ) {

      if (!PEXELS_API_KEY) {

        return {
          imageUrl: "",
          photoAttribution: "",
          photoSource: ""
        };

      }

      try {

        const query =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels hotel search:",
          query
        );

        const response =
          await fetch(
            "https://api.pexels.com/v1/search?query=" +
            encodeURIComponent(
              query
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

        if (!response.ok) {

          console.warn(
            "Pexels HTTP error:",
            response.status
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };

        }

        const data =
          await response.json();

        if (
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };

        }

        const photo =
          data.photos[0];

        return {

          imageUrl:
            photo?.src?.large2x ||
            photo?.src?.large ||
            photo?.src?.original ||
            "",

          photoAttribution:
            photo?.photographer ||
            "",

          photoSource:
            photo?.photographer_url ||
            "https://www.pexels.com/"

        };

      } catch (error) {

        console.error(
          "Pexels error:",
          error.message
        );

        return {
          imageUrl: "",
          photoAttribution: "",
          photoSource: ""
        };

      }

    }

    // =======================================================
    // HOTEL IMAGES
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
    // OSM CONSTANTS
    // =======================================================

    const OSM_USER_AGENT =
      "AI-Life-Planner/1.0";

    // =======================================================
    // WIKIMEDIA COMMONS IMAGE
    // =======================================================

    async function getWikimediaImage(
      commonsValue
    ) {

      try {

        if (
          !commonsValue ||
          typeof commonsValue !==
            "string"
        ) {

          return "";

        }

        const value =
          commonsValue.trim();

        if (
          !/^File:/i.test(
            value
          )
        ) {

          return "";

        }

        const apiURL =
          "https://commons.wikimedia.org/w/api.php" +
          "?action=query" +
          "&format=json" +
          "&origin=*" +
          "&prop=imageinfo" +
          "&iiprop=url" +
          "&iiurlwidth=1200" +
          "&titles=" +
          encodeURIComponent(
            value
          );

        const response =
          await fetch(
            apiURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  OSM_USER_AGENT
              }
            }
          );

        if (!response.ok) {

          return "";

        }

        const data =
          await response.json();

        const pages =
          data?.query?.pages;

        if (!pages) {

          return "";

        }

        const page =
          Object.values(
            pages
          )[0];

        const image =
          page?.imageinfo?.[0];

        return (
          image?.thumburl ||
          image?.url ||
          ""
        );

      } catch (error) {

        console.error(
          "Wikimedia image error:",
          error.message
        );

        return "";

      }

    }

    // =======================================================
    // WIKIDATA IMAGE
    // =======================================================

    async function getWikidataImage(
      wikidataId
    ) {

      try {

        if (
          !wikidataId ||
          typeof wikidataId !==
            "string"
        ) {

          return "";

        }

        const id =
          wikidataId.trim();

        if (
          !/^Q\d+$/i.test(
            id
          )
        ) {

          return "";

        }

        const apiURL =
          "https://www.wikidata.org/w/api.php" +
          "?action=wbgetentities" +
          "&format=json" +
          "&origin=*" +
          "&props=claims" +
          "&ids=" +
          encodeURIComponent(
            id
          );

        const response =
          await fetch(
            apiURL,
            {
              method: "GET",

              headers: {
                "User-Agent":
                  OSM_USER_AGENT
              }
            }
          );

        if (!response.ok) {

          return "";

        }

        const data =
          await response.json();

        const entity =
          data?.entities?.[id];

        const imageClaims =
          entity?.claims?.P18;

        if (
          !Array.isArray(
            imageClaims
          ) ||
          imageClaims.length === 0
        ) {

          return "";

        }

        const imageValue =
          imageClaims[0]
            ?.mainsnak
            ?.datavalue
            ?.value;

        if (
          !imageValue ||
          typeof imageValue !==
            "string"
        ) {

          return "";

        }

        return await getWikimediaImage(
          "File:" +
          imageValue
        );

      } catch (error) {

        console.error(
          "Wikidata image error:",
          error.message
        );

        return "";

      }

    }

    // =======================================================
    // OSM DIRECT IMAGE
    // =======================================================

    async function resolveOSMImage(
      tags
    ) {

      try {

        const directImage =
          tags.image ||
          tags.photo ||
          tags.picture ||
          tags["url:photo"] ||
          "";

        if (
          directImage &&
          /^https?:\/\//i.test(
            String(
              directImage
            )
          )
        ) {

          return {
            imageUrl:
              String(
                directImage
              ),

            imageSource:
              "OpenStreetMap",

            imageAttribution:
              "OpenStreetMap"
          };

        }

        const commons =
          tags.wikimedia_commons ||
          "";

        if (commons) {

          const image =
            await getWikimediaImage(
              commons
            );

          if (image) {

            return {
              imageUrl:
                image,

              imageSource:
                "Wikimedia Commons",

              imageAttribution:
                "Wikimedia Commons"
            };

          }

        }

        const wikidata =
          tags.wikidata ||
          "";

        if (wikidata) {

          const image =
            await getWikidataImage(
              wikidata
            );

          if (image) {

            return {
              imageUrl:
                image,

              imageSource:
                "Wikimedia Commons via Wikidata",

              imageAttribution:
                "Wikimedia Commons"
            };

          }

        }

        return {
          imageUrl: "",
          imageSource: "",
          imageAttribution: ""
        };

      } catch (error) {

        console.error(
          "OSM image resolver error:",
          error.message
        );

        return {
          imageUrl: "",
          imageSource: "",
          imageAttribution: ""
        };

      }

    }

    // =======================================================
    // FOURSQUARE NORMALIZE NAME
    // =======================================================

    function normalizePlaceName(
      value
    ) {

      return String(
        value || ""
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
          /[^a-z0-9\u0600-\u06ff\u00c0-\u024f]+/gi,
          " "
        )
        .trim();

    }

    // =======================================================
    // DISTANCE BETWEEN TWO POINTS
    // =======================================================

    function distanceMeters(
      lat1,
      lon1,
      lat2,
      lon2
    ) {

      if (
        !Number.isFinite(
          Number(lat1)
        ) ||
        !Number.isFinite(
          Number(lon1)
        ) ||
        !Number.isFinite(
          Number(lat2)
        ) ||
        !Number.isFinite(
          Number(lon2)
        )
      ) {

        return Infinity;

      }

      const R =
        6371000;

      const dLat =
        (
          Number(lat2) -
          Number(lat1)
        ) *
        Math.PI /
        180;

      const dLon =
        (
          Number(lon2) -
          Number(lon1)
        ) *
        Math.PI /
        180;

      const a =
        Math.sin(
          dLat / 2
        ) *
        Math.sin(
          dLat / 2
        ) +
        Math.cos(
          Number(lat1) *
          Math.PI /
          180
        ) *
        Math.cos(
          Number(lat2) *
          Math.PI /
          180
        ) *
        Math.sin(
          dLon / 2
        ) *
        Math.sin(
          dLon / 2
        );

      const c =
        2 *
        Math.atan2(
          Math.sqrt(a),
          Math.sqrt(
            1 - a
          )
        );

      return R * c;

    }

    // =======================================================
    // FOURSQUARE SEARCH
    // =======================================================

    async function searchFoursquarePlace(
      restaurantName,
      destination,
      latitude,
      longitude
    ) {

      if (!FOURSQUARE_API_KEY) {

        return null;

      }

      try {

        const params =
          new URLSearchParams();

        params.set(
          "query",
          restaurantName
        );

        if (
          Number.isFinite(
            Number(latitude)
          ) &&
          Number.isFinite(
            Number(longitude)
          )
        ) {

          params.set(
            "ll",
            `${latitude},${longitude}`
          );

          params.set(
            "radius",
            "3000"
          );

        } else {

          params.set(
            "near",
            destination
          );

        }

        params.set(
          "limit",
          "10"
        );

        params.set(
          "sort",
          "RELEVANCE"
        );

        params.set(
          "fields",
          [
            "fsq_place_id",
            "name",
            "latitude",
            "longitude",
            "location",
            "categories",
            "rating",
            "price",
            "website",
            "tel"
          ].join(",")
        );

        const url =
          "https://places-api.foursquare.com/places/search?" +
          params.toString();

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

        if (!response.ok) {

          const errorText =
            await response.text();

          console.error(
            "Foursquare search error:",
            response.status,
            errorText
          );

          return null;

        }

        const data =
          await response.json();

        const results =
          Array.isArray(
            data?.results
          )
            ? data.results
            : [];

        if (
          results.length === 0
        ) {

          console.log(
            "Foursquare no match:",
            restaurantName
          );

          return null;

        }

        const osmName =
          normalizePlaceName(
            restaurantName
          );

        let best =
          null;

        let bestScore =
          -Infinity;

        for (
          const place
          of results
        ) {

          const fsqName =
            normalizePlaceName(
              place?.name
            );

          if (!fsqName) {
            continue;
          }

          let score = 0;

          // Exact name match

          if (
            fsqName === osmName
          ) {

            score += 100;

          }

          // One contains the other

          if (
            fsqName.includes(
              osmName
            ) ||
            osmName.includes(
              fsqName
            )
          ) {

            score += 60;

          }

          // Word overlap

          const osmWords =
            new Set(
              osmName
                .split(/\s+/)
                .filter(Boolean)
            );

          const fsqWords =
            new Set(
              fsqName
                .split(/\s+/)
                .filter(Boolean)
            );

          let commonWords =
            0;

          for (
            const word
            of osmWords
          ) {

            if (
              fsqWords.has(
                word
              )
            ) {

              commonWords++;

            }

          }

          score +=
            commonWords * 10;

          // Distance bonus

          const distance =
            distanceMeters(
              latitude,
              longitude,
              place?.latitude,
              place?.longitude
            );

          if (
            Number.isFinite(
              distance
            )
          ) {

            if (
              distance <= 50
            ) {

              score += 50;

            } else if (
              distance <= 150
            ) {

              score += 35;

            } else if (
              distance <= 500
            ) {

              score += 20;

            } else if (
              distance <= 1500
            ) {

              score += 5;

            } else {

              score -= 20;

            }

          }

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

        // Do not accept a weak unrelated match.

        if (
          !best ||
          bestScore < 25
        ) {

          console.log(
            "Foursquare weak match rejected:",
            restaurantName,
            best?.name,
            bestScore
          );

          return null;

        }

        console.log(
          "Foursquare match:",
          restaurantName,
          "=>",
          best.name,
          "score:",
          bestScore
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

    // =======================================================
    // FOURSQUARE PHOTO
    // =======================================================

    async function getFoursquarePhoto(
      fsqPlaceId
    ) {

      if (
        !FOURSQUARE_API_KEY ||
        !fsqPlaceId
      ) {

        return null;

      }

      try {

        const url =
          "https://places-api.foursquare.com/places/" +
          encodeURIComponent(
            fsqPlaceId
          ) +
          "/photos?limit=1&sort=POPULAR";

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

        if (!response.ok) {

          const errorText =
            await response.text();

          console.error(
            "Foursquare photo error:",
            response.status,
            errorText
          );

          return null;

        }

        const data =
          await response.json();

        const photos =
          Array.isArray(
            data
          )
            ? data
            : Array.isArray(
                data?.photos
              )
              ? data.photos
              : [];

        if (
          photos.length === 0
        ) {

          console.log(
            "Foursquare has no photo:",
            fsqPlaceId
          );

          return null;

        }

        const photo =
          photos[0];

        // Foursquare photo responses use
        // prefix + size + suffix.

        if (
          photo?.prefix &&
          photo?.suffix
        ) {

          const imageUrl =
            photo.prefix +
            "original" +
            photo.suffix;

          return {

            imageUrl,

            imageSource:
              "Foursquare",

            imageAttribution:
              "Photo via Foursquare"

          };

        }

        // Some responses may already expose
        // a direct URL.

        if (
          photo?.url &&
          /^https?:\/\//i.test(
            photo.url
          )
        ) {

          return {

            imageUrl:
              photo.url,

            imageSource:
              "Foursquare",

            imageAttribution:
              "Photo via Foursquare"

          };

        }

        return null;

      } catch (error) {

        console.error(
          "Foursquare photo exception:",
          error.message
        );

        return null;

      }

    }

    // =======================================================
    // GET REAL RESTAURANT PHOTO
    //
    // Priority:
    //
    // 1. Exact OSM image
    // 2. Wikimedia image attached to OSM
    // 3. Foursquare exact place match + photo
    //
    // Never use a random restaurant image.
    // =======================================================

    async function getVerifiedRestaurantImage(
      tags,
      restaurantName,
      destination,
      latitude,
      longitude
    ) {

      // ---------------------------------------------------
      // FIRST: OSM / WIKIMEDIA
      // ---------------------------------------------------

      const osmImage =
        await resolveOSMImage(
          tags
        );

      if (
        osmImage?.imageUrl
      ) {

        return {

          ...osmImage,

          matchedPlace:
            restaurantName,

          photoVerified:
            true

        };

      }

      // ---------------------------------------------------
      // SECOND: FOURSQUARE
      // ---------------------------------------------------

      if (
        FOURSQUARE_API_KEY
      ) {

        const fsqPlace =
          await searchFoursquarePlace(
            restaurantName,
            destination,
            latitude,
            longitude
          );

        if (
          fsqPlace?.fsq_place_id
        ) {

          const photo =
            await getFoursquarePhoto(
              fsqPlace.fsq_place_id
            );

          if (
            photo?.imageUrl
          ) {

            return {

              imageUrl:
                photo.imageUrl,

              imageSource:
                photo.imageSource,

              imageAttribution:
                photo.imageAttribution,

              matchedPlace:
                fsqPlace.name,

              fsqPlaceId:
                fsqPlace.fsq_place_id,

              photoVerified:
                true

            };

          }

        }

      }

      // ---------------------------------------------------
      // NO VERIFIED IMAGE
      // ---------------------------------------------------

      return {

        imageUrl:
          "",

        imageSource:
          "",

        imageAttribution:
          "",

        matchedPlace:
          "",

        fsqPlaceId:
          "",

        photoVerified:
          false

      };

    }

    // =======================================================
    // OPENSTREETMAP RESTAURANTS
    // =======================================================

    async function getRestaurantsFromOSM(
      destination
    ) {

      try {

        console.log(
          "======================================"
        );

        console.log(
          "OpenStreetMap restaurant search:",
          destination
        );

        console.log(
          "======================================"
        );

        // ---------------------------------------------------
        // STEP 1
        // GEOCODE DESTINATION
        // ---------------------------------------------------

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
                  OSM_USER_AGENT,

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

          console.log(
            "Destination not found:",
            destination
          );

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

          console.error(
            "Invalid destination coordinates."
          );

          return [];

        }

        console.log(
          "Destination coordinates:",
          lat,
          lon
        );

        // ---------------------------------------------------
        // STEP 2
        // OVERPASS
        // ---------------------------------------------------

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

        // ---------------------------------------------------
        // STEP 3
        // NORMALIZE
        // ---------------------------------------------------

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

          if (!name) {
            continue;
          }

          let restaurantLat =
            item.lat;

          let restaurantLon =
            item.lon;

          if (
            restaurantLat ===
              undefined &&
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
            addressParts.length >
            0
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
            tags[
              "contact:website"
            ] ||
            "";

          // -------------------------------------------------
          // PHONE
          // -------------------------------------------------

          const phone =
            tags.phone ||
            tags[
              "contact:phone"
            ] ||
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
            tags.rating !==
            undefined
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
            tags[
              "review:count"
            ] ||
            tags.reviews ||
            "";

          if (reviewValue) {

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
          // GOOGLE MAPS
          // -------------------------------------------------

          let mapsURL =
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

            mapsURL =
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(
                restaurantLat +
                "," +
                restaurantLon
              );

          } else {

            mapsURL =
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

          let osmURL =
            "";

          if (
            item.type &&
            item.id
          ) {

            osmURL =
              "https://www.openstreetmap.org/" +
              encodeURIComponent(
                item.type
              ) +
              "/" +
              encodeURIComponent(
                item.id
              );

          }

          // -------------------------------------------------
          // VERIFIED IMAGE
          // -------------------------------------------------

          const imageData =
            await getVerifiedRestaurantImage(
              tags,
              name,
              destination,
              restaurantLat,
              restaurantLon
            );

          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          let description =
            `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`;

          if (cuisine) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }

          // -------------------------------------------------
          // FOURSQUARE DATA
          // -------------------------------------------------

          let foursquareUrl =
            "";

          if (
            imageData?.fsqPlaceId
          ) {

            foursquareUrl =
              "https://foursquare.com/placemakers/review-place/" +
              encodeURIComponent(
                imageData.fsqPlaceId
              );

          }

          // -------------------------------------------------
          // RESTAURANT OBJECT
          // -------------------------------------------------

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
              imageData?.imageUrl ||
              "",

            imageSource:
              imageData?.imageSource ||
              "",

            imageAttribution:
              imageData?.imageAttribution ||
              "",

            photoVerified:
              Boolean(
                imageData?.photoVerified
              ),

            matchedPlace:
              imageData?.matchedPlace ||
              "",

            fsqPlaceId:
              imageData?.fsqPlaceId ||
              "",

            foursquareUrl,

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

          // Collect extra results so we can
          // prefer restaurants that have verified photos.

          if (
            restaurants.length >= 20
          ) {

            break;

          }

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

        // ---------------------------------------------------
        // PRIORITY
        //
        // 1. Verified photo
        // 2. Rating
        // 3. Otherwise keep normal OSM restaurant
        // ---------------------------------------------------

        uniqueRestaurants.sort(
          (
            a,
            b
          ) => {

            const aPhoto =
              a.photoVerified
                ? 1
                : 0;

            const bPhoto =
              b.photoVerified
                ? 1
                : 0;

            if (
              bPhoto !==
              aPhoto
            ) {

              return (
                bPhoto -
                aPhoto
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

        const finalRestaurants =
          uniqueRestaurants.slice(
            0,
            10
          );

        console.log(
          "Final restaurants:",
          finalRestaurants.length
        );

        console.log(
          "Restaurants with verified photos:",
          finalRestaurants.filter(
            r =>
              r.photoVerified
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

    // =======================================================
    // GET RESTAURANTS
    // =======================================================

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
    // RESTAURANT FALLBACK
    // =======================================================

    if (
      !Array.isArray(
        travelData.restaurants
      )
    ) {

      travelData.restaurants =
        [];

    }

    // =======================================================
    // SUCCESS
    // =======================================================

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
      "Restaurants with photos:",
      travelData.restaurants.filter(
        restaurant =>
          restaurant.photoVerified
      ).length
    );

    console.log(
      "======================================"
    );

    return res.status(200).json(
      travelData
    );

  } catch (error) {

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

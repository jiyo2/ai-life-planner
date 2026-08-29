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

    if (!GEMINI_API_KEY) {

      console.error("GEMINI_API_KEY missing");

      return res.status(500).json({
        error: "Gemini API key is missing."
      });

    }

    if (!PEXELS_API_KEY) {

      console.error("PEXELS_API_KEY missing");

      return res.status(500).json({
        error:
          "Pexels API key is missing. Add PEXELS_API_KEY to Vercel Environment Variables."
      });

    }

    if (!FOURSQUARE_API_KEY) {

      console.error("FOURSQUARE_API_KEY missing");

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
      encodeURIComponent(GEMINI_API_KEY);

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

Restaurants will be obtained separately from Foursquare Places API.

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
            "Content-Type": "application/json"
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
        JSON.parse(geminiText);

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
        JSON.stringify(geminiData)
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response.",
        details:
          JSON.stringify(geminiData)
      });

    }

    // =======================================================
    // CLEAN JSON
    // =======================================================

    let cleanText =
      text.trim();

    cleanText =
      cleanText
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();

    // =======================================================
    // TRAVEL DATA
    // =======================================================

    let travelData;

    try {

      travelData =
        JSON.parse(cleanText);

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
              String(hotel.name),

            stars:
              Number(hotel.stars) || 0,

            price:
              Number.isFinite(
                Number(hotel.price)
              )
                ? Number(hotel.price)
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
                ? hotel.amenities.slice(0, 6)
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
    const hotelNames = new Set();

    for (
      const hotel
      of travelData.stay
    ) {

      const key =
        hotel.name
          .toLowerCase()
          .trim();

      if (
        !hotelNames.has(key)
      ) {

        hotelNames.add(key);

        uniqueHotels.push(
          hotel
        );

      }

    }

    travelData.stay =
      uniqueHotels.slice(0, 10);

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
            encodeURIComponent(query1) +
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

        } catch (error) {

          data = null;

        }

        // ---------------------------------------------------
        // FALLBACK
        // ---------------------------------------------------

        if (
          !response.ok ||
          !data ||
          !Array.isArray(data.photos) ||
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
              encodeURIComponent(query2) +
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

          } catch (error) {

            data = null;

          }

        }

        if (
          !response.ok ||
          !data ||
          !Array.isArray(data.photos) ||
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
        (hotel, index) => ({

          ...hotel,

          imageUrl:
            hotelImages[index]?.imageUrl ||
            "",

          photoAttribution:
            hotelImages[index]?.photoAttribution ||
            "",

          photoSource:
            hotelImages[index]?.photoSource ||
            ""

        })
      );

    // =======================================================
    // FOURSQUARE CONFIG
    // =======================================================

    const FOURSQUARE_API_URL =
      "https://places-api.foursquare.com";

    const FOURSQUARE_VERSION =
      "2025-06-17";

    // =======================================================
    // FOURSQUARE REQUEST HELPER
    // =======================================================

    async function foursquareRequest(
      url
    ) {

      try {

        const response =
          await fetch(
            url,
            {
              method: "GET",

              headers: {

                "Authorization":
                  "Bearer " +
                  FOURSQUARE_API_KEY,

                "X-Places-Api-Version":
                  FOURSQUARE_VERSION,

                "Accept":
                  "application/json"

              }
            }
          );

        const text =
          await response.text();

        let data = null;

        try {

          data =
            JSON.parse(text);

        } catch (error) {

          data = null;

        }

        if (!response.ok) {

          console.error(
            "Foursquare HTTP error:",
            response.status,
            text
          );

          return null;

        }

        return data;

      } catch (error) {

        console.error(
          "Foursquare request error:",
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

      try {

        if (!fsqPlaceId) {

          return {
            imageUrl: "",
            imageSource: "",
            imageAttribution: ""
          };

        }

        const url =
          FOURSQUARE_API_URL +
          "/places/" +
          encodeURIComponent(
            fsqPlaceId
          ) +
          "/photos?limit=1&sort=POPULAR";

        const data =
          await foursquareRequest(
            url
          );

        if (
          !data ||
          !Array.isArray(data)
        ) {

          return {
            imageUrl: "",
            imageSource: "",
            imageAttribution: ""
          };

        }

        if (
          data.length === 0
        ) {

          return {
            imageUrl: "",
            imageSource: "",
            imageAttribution: ""
          };

        }

        const photo =
          data[0];

        const prefix =
          photo?.prefix ||
          "";

        const suffix =
          photo?.suffix ||
          "";

        if (
          !prefix ||
          !suffix
        ) {

          return {
            imageUrl: "",
            imageSource: "",
            imageAttribution: ""
          };

        }

        // Foursquare photo URLs use:
        // prefix + size + suffix

        const imageUrl =
          prefix +
          "1200x900" +
          suffix;

        return {

          imageUrl,

          imageSource:
            "Foursquare",

          imageAttribution:
            "Photo via Foursquare"

        };

      } catch (error) {

        console.error(
          "Foursquare photo error:",
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
    // FOURSQUARE RESTAURANTS
    // =======================================================

    async function getRestaurantsFromFoursquare(
      destination
    ) {

      try {

        console.log(
          "Foursquare restaurant search:",
          destination
        );

        const fields = [
          "fsq_id",
          "name",
          "location",
          "categories",
          "price",
          "rating",
          "stats",
          "website",
          "tel",
          "description",
          "geocodes"
        ].join(",");

        const params =
          new URLSearchParams();

        params.set(
          "near",
          destination
        );

        params.set(
          "query",
          "restaurant"
        );

        params.set(
          "fields",
          fields
        );

        params.set(
          "limit",
          "15"
        );

        params.set(
          "sort",
          "POPULARITY"
        );

        const searchURL =
          FOURSQUARE_API_URL +
          "/places/search?" +
          params.toString();

        const data =
          await foursquareRequest(
            searchURL
          );

        if (
          !data ||
          !Array.isArray(
            data.results
          )
        ) {

          console.error(
            "Foursquare returned no results."
          );

          return [];

        }

        console.log(
          "Foursquare restaurants found:",
          data.results.length
        );

        const restaurants = [];

        for (
          const place
          of data.results
        ) {

          if (
            !place ||
            !place.name
          ) {

            continue;

          }

          const location =
            place.location ||
            {};

          const categories =
            Array.isArray(
              place.categories
            )
              ? place.categories
              : [];

          const primaryCategory =
            categories.find(
              category =>
                category &&
                category.name
            );

          const cuisine =
            primaryCategory?.name ||
            "Restaurant";

          const latitude =
            Number(
              location.latitude ??
              place?.geocodes?.main?.latitude
            );

          const longitude =
            Number(
              location.longitude ??
              place?.geocodes?.main?.longitude
            );

          // -------------------------------------------------
          // ADDRESS
          // -------------------------------------------------

          const address =
            location.formatted_address ||
            [
              location.address,
              location.locality,
              location.region,
              location.country
            ]
              .filter(Boolean)
              .join(", ") ||
            destination;

          // -------------------------------------------------
          // PRICE
          // -------------------------------------------------

          let priceLevel =
            "$$";

          if (
            Number.isFinite(
              Number(place.price)
            )
          ) {

            const price =
              Number(place.price);

            if (price <= 1) {
              priceLevel = "$";
            } else if (price === 2) {
              priceLevel = "$$";
            } else if (price === 3) {
              priceLevel = "$$$";
            } else {
              priceLevel = "$$$$";
            }

          }

          // -------------------------------------------------
          // RATING
          // -------------------------------------------------

          let rating =
            null;

          if (
            Number.isFinite(
              Number(place.rating)
            )
          ) {

            rating =
              Number(place.rating);

          }

          // -------------------------------------------------
          // REVIEWS
          // -------------------------------------------------

          let reviewCount =
            null;

          const stats =
            place.stats ||
            {};

          if (
            Number.isFinite(
              Number(
                stats.total_ratings
              )
            )
          ) {

            reviewCount =
              Number(
                stats.total_ratings
              );

          }

          // -------------------------------------------------
          // MAP URL
          // -------------------------------------------------

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
                place.name +
                " " +
                destination
              );

          }

          // -------------------------------------------------
          // FOURSQUARE URL
          // -------------------------------------------------

          const foursquareUrl =
            place.fsq_id
              ? "https://foursquare.com/v/" +
                encodeURIComponent(
                  place.name
                ) +
                "/" +
                encodeURIComponent(
                  place.fsq_id
                )
              : "";

          // -------------------------------------------------
          // REAL PHOTO
          // -------------------------------------------------

          let photoData = {

            imageUrl: "",

            imageSource: "",

            imageAttribution: ""

          };

          if (
            place.fsq_id
          ) {

            photoData =
              await getFoursquarePhoto(
                place.fsq_id
              );

          }

          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          let description =
            place.description ||
            `${place.name} is a real restaurant listed in Foursquare in ${destination}.`;

          if (
            cuisine &&
            cuisine !== "Restaurant"
          ) {

            description +=
              ` Cuisine: ${cuisine}.`;

          }

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

            priceLevel,

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

            imageUrl:
              photoData.imageUrl ||
              "",

            imageSource:
              photoData.imageSource ||
              "",

            imageAttribution:
              photoData.imageAttribution ||
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

            fsqId:
              place.fsq_id ||
              ""

          });

        }

        // ===================================================
        // REMOVE DUPLICATES
        // ===================================================

        const uniqueRestaurants = [];
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
            !restaurantNames.has(key)
          ) {

            restaurantNames.add(
              key
            );

            uniqueRestaurants.push(
              restaurant
            );

          }

        }

        // ===================================================
        // PREFER REAL PHOTOS
        // ===================================================

        uniqueRestaurants.sort(
          (a, b) => {

            const aImage =
              a.imageUrl ? 1 : 0;

            const bImage =
              b.imageUrl ? 1 : 0;

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
              Number(a.rating) ||
              0;

            const bRating =
              Number(b.rating) ||
              0;

            return (
              bRating -
              aRating
            );

          }
        );

        return uniqueRestaurants.slice(
          0,
          10
        );

      } catch (error) {

        console.error(
          "Foursquare restaurant error:",
          error
        );

        return [];

      }

    }

    // =======================================================
    // OPENSTREETMAP HELPERS
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
          typeof commonsValue !== "string"
        ) {

          return "";

        }

        const value =
          commonsValue.trim();

        if (
          !/^File:/i.test(value)
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
          encodeURIComponent(value);

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
          typeof wikidataId !== "string"
        ) {

          return "";

        }

        const id =
          wikidataId.trim();

        if (
          !/^Q\d+$/i.test(id)
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
          encodeURIComponent(id);

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
          typeof imageValue !== "string"
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
    // OSM IMAGE RESOLVER
    // =======================================================

    async function resolveRestaurantImage(
      tags
    ) {

      try {

        // ---------------------------------------------------
        // DIRECT OSM IMAGE
        // ---------------------------------------------------

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
              "OpenStreetMap data"

          };

        }

        // ---------------------------------------------------
        // WIKIMEDIA COMMONS
        // ---------------------------------------------------

        const commons =
          tags.wikimedia_commons ||
          "";

        if (commons) {

          const commonsImage =
            await getWikimediaImage(
              commons
            );

          if (commonsImage) {

            return {

              imageUrl:
                commonsImage,

              imageSource:
                "Wikimedia Commons",

              imageAttribution:
                "Wikimedia Commons"

            };

          }

        }

        // ---------------------------------------------------
        // WIKIDATA
        // ---------------------------------------------------

        const wikidata =
          tags.wikidata ||
          "";

        if (wikidata) {

          const wikidataImage =
            await getWikidataImage(
              wikidata
            );

          if (wikidataImage) {

            return {

              imageUrl:
                wikidataImage,

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
          "Restaurant image resolver error:",
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
    // OPENSTREETMAP RESTAURANTS FALLBACK
    // =======================================================

    async function getRestaurantsFromOSM(
      destination
    ) {

      try {

        console.log(
          "OpenStreetMap fallback search:",
          destination
        );

        // ---------------------------------------------------
        // GEOCODE
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
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {

          return [];

        }

        // ---------------------------------------------------
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
              ? addressParts.join(", ")
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
            tags.price_range ||
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
          // RATING
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
          // MAPS URL
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

          const osmUrl =
            item.type &&
            item.id
              ? "https://www.openstreetmap.org/" +
                encodeURIComponent(
                  item.type
                ) +
                "/" +
                encodeURIComponent(
                  item.id
                )
              : "";

          // -------------------------------------------------
          // IMAGE
          // -------------------------------------------------

          const imageData =
            await resolveRestaurantImage(
              tags
            );

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

            reviewCount:
              null,

            address:
              String(
                address
              ),

            description:
              `${name} is a real local restaurant in ${destination}, listed in OpenStreetMap.`,

            imageUrl:
              imageData.imageUrl ||
              "",

            imageSource:
              imageData.imageSource ||
              "",

            imageAttribution:
              imageData.imageAttribution ||
              "",

            mapsUrl,

            osmUrl,

            website,

            phone,

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
                : null,

            fsqId:
              ""

          });

          if (
            restaurants.length >= 15
          ) {

            break;

          }

        }

        // ---------------------------------------------------
        // REMOVE DUPLICATES
        // ---------------------------------------------------

        const uniqueRestaurants = [];
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
        // VERIFIED PHOTO FIRST
        // ---------------------------------------------------

        uniqueRestaurants.sort(
          (a, b) => {

            return (
              (b.imageUrl ? 1 : 0) -
              (a.imageUrl ? 1 : 0)
            );

          }
        );

        return uniqueRestaurants.slice(
          0,
          10
        );

      } catch (error) {

        console.error(
          "OpenStreetMap fallback error:",
          error.message
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

    let restaurants =
      await getRestaurantsFromFoursquare(
        destination
      );

    console.log(
      "Foursquare restaurants returned:",
      restaurants.length
    );

    // =======================================================
    // OSM FALLBACK
    // =======================================================

    if (
      restaurants.length === 0
    ) {

      console.log(
        "Foursquare returned no restaurants."
      );

      console.log(
        "Starting OpenStreetMap fallback..."
      );

      restaurants =
        await getRestaurantsFromOSM(
          destination
        );

      console.log(
        "OSM fallback restaurants returned:",
        restaurants.length
      );

    }

    travelData.restaurants =
      restaurants;

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
      "Final restaurant count:",
      travelData.restaurants.length
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

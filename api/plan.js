module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  // =========================================================
  // OPTIONS
  // =========================================================

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // =========================================================
  // METHOD CHECK
  // =========================================================

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

Return EXACTLY 10 different real accommodation options in ${destination}.

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
Images will be obtained separately.

IMPORTANT RESTAURANT REQUIREMENT:

Do NOT create fake restaurants.

Restaurants will be obtained separately from OpenStreetMap.

You should still create:
transport
experiences
money
daysPlan

transport, experiences, money and daysPlan must contain HTML.

The experiences section may mention food and dining generally,
but do not create fake restaurant listings.

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
  "transport": "<div>...</div>",
  "experiences": "<div>...</div>",
  "money": "<div>...</div>",
  "daysPlan": "<div>...</div>"
}
`;

    // =======================================================
    // START GEMINI + RESTAURANT LOOKUP IN PARALLEL
    // =======================================================

    const geminiPromise =
      fetch(
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

    const restaurantsPromise =
      getRestaurants(
        destination
      );

    // =======================================================
    // GEMINI RESPONSE
    // =======================================================

    const [
      geminiResponse,
      restaurants
    ] = await Promise.all([
      geminiPromise,
      restaurantsPromise
    ]);

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

    console.log(
      "Gemini text received successfully"
    );

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
    // PARSE TRAVEL DATA
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
                ? hotel.amenities
                    .slice(0, 6)
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
    // REMOVE HOTEL DUPLICATES
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

    console.log(
      "Hotels returned:",
      travelData.stay.length
    );

    // =======================================================
    // PEXELS HOTEL IMAGE SEARCH
    // =======================================================

    async function getHotelImage(
      hotelName,
      destination
    ) {

      try {

        const query1 =
          `${hotelName} ${destination}`;

        console.log(
          "Pexels search 1:",
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

        let data;

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
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          const query2 =
            `hotel ${destination}`;

          console.log(
            "Pexels fallback search:",
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

          } catch (error) {

            data = null;

          }

        }

        if (
          !response.ok
        ) {

          console.error(
            "Pexels API error:",
            response.status,
            data
          );

          return {
            imageUrl: "",
            photoAttribution: "",
            photoSource: ""
          };

        }

        if (
          !data ||
          !Array.isArray(
            data.photos
          ) ||
          data.photos.length === 0
        ) {

          console.log(
            "No Pexels image found:",
            hotelName
          );

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

        const photographer =
          photo?.photographer ||
          "";

        const photographerUrl =
          photo?.photographer_url ||
          "";

        console.log(
          "Pexels image found:",
          hotelName,
          imageUrl
            ? "YES"
            : "NO"
        );

        return {

          imageUrl,

          photoAttribution:
            photographer,

          photoSource:
            photographerUrl ||
            "https://www.pexels.com/"

        };

      } catch (error) {

        console.error(
          "Pexels image lookup failed:",
          hotelName,
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
    // FETCH HOTEL IMAGES
    // =======================================================

    console.log(
      "Starting Pexels hotel image search..."
    );

    const imageResults =
      await Promise.all(
        travelData.stay.map(
          hotel =>
            getHotelImage(
              hotel.name,
              destination
            )
        )
      );

    // =======================================================
    // ATTACH HOTEL IMAGES
    // =======================================================

    travelData.stay =
      travelData.stay.map(
        (hotel, index) => {

          const image =
            imageResults[
              index
            ] || {};

          return {

            ...hotel,

            imageUrl:
              image.imageUrl ||
              "",

            photoAttribution:
              image.photoAttribution ||
              "",

            photoSource:
              image.photoSource ||
              ""

          };

        }
      );

    // =======================================================
    // HOTEL DEBUG
    // =======================================================

    travelData.stay.forEach(
      (hotel, index) => {

        console.log(
          `HOTEL ${index + 1}:`,
          hotel.name
        );

        console.log(
          `HOTEL ${index + 1} IMAGE:`,
          hotel.imageUrl ||
          "(NO IMAGE)"
        );

      }
    );

    // =======================================================
    // NORMALIZE RESTAURANTS
    // =======================================================

    const normalizedRestaurants =
      Array.isArray(restaurants)
        ? restaurants.slice(0, 12)
        : [];

    console.log(
      "Restaurants returned:",
      normalizedRestaurants.length
    );

    normalizedRestaurants.forEach(
      (restaurant, index) => {

        console.log(
          `RESTAURANT ${index + 1}:`,
          restaurant.name
        );

      }
    );

    // =======================================================
    // RESTAURANT HTML
    // =======================================================

    travelData.restaurants =
      normalizedRestaurants;

    travelData.restaurantSearch =
      createRestaurantSearchURL(
        destination
      );

    travelData.restaurantsHTML =
      createRestaurantsHTML(
        normalizedRestaurants,
        destination
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


// =========================================================
// GET RESTAURANTS FROM OPENSTREETMAP
// =========================================================

async function getRestaurants(
  destination
) {

  try {

    console.log(
      "Starting OpenStreetMap restaurant search:",
      destination
    );

    // -------------------------------------------------------
    // STEP 1: GEOCODE DESTINATION
    // -------------------------------------------------------

    const geocodeURL =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
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
              "AI-Life-Planner/1.0"
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

    const latitude =
      Number(
        locations[0].lat
      );

    const longitude =
      Number(
        locations[0].lon
      );

    console.log(
      "Destination coordinates:",
      latitude,
      longitude
    );

    // -------------------------------------------------------
    // STEP 2: OVERPASS QUERY
    // -------------------------------------------------------

    const overpassQuery = `
[out:json][timeout:12];

(
  node["amenity"="restaurant"]
    (around:12000,${latitude},${longitude});

  way["amenity"="restaurant"]
    (around:12000,${latitude},${longitude});

  relation["amenity"="restaurant"]
    (around:12000,${latitude},${longitude});
);

out center tags;
`;

    const overpassURL =
      "https://overpass-api.de/api/interpreter";

    const restaurantResponse =
      await fetch(
        overpassURL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",

            "User-Agent":
              "AI-Life-Planner/1.0"
          },

          body:
            "data=" +
            encodeURIComponent(
              overpassQuery
            )
        }
      );

    if (
      !restaurantResponse.ok
    ) {

      console.error(
        "Overpass error:",
        restaurantResponse.status
      );

      return [];

    }

    const restaurantData =
      await restaurantResponse.json();

    const elements =
      Array.isArray(
        restaurantData?.elements
      )
        ? restaurantData.elements
        : [];

    console.log(
      "OpenStreetMap raw restaurants:",
      elements.length
    );

    // -------------------------------------------------------
    // STEP 3: NORMALIZE RESTAURANTS
    // -------------------------------------------------------

    const results = [];

    const names =
      new Set();

    for (
      const item
      of elements
    ) {

      const tags =
        item?.tags || {};

      const name =
        tags.name ||
        tags["name:en"] ||
        "";

      if (!name) {
        continue;
      }

      const cleanName =
        String(name).trim();

      const key =
        cleanName.toLowerCase();

      if (
        names.has(key)
      ) {
        continue;
      }

      names.add(key);

      // -----------------------------------------------------
      // CATEGORY
      // -----------------------------------------------------

      let category =
        tags.cuisine ||
        "Restaurant";

      category =
        String(
          category
        )
          .split(";")
          .map(
            value =>
              value
                .trim()
                .replace(
                  /_/g,
                  " "
                )
          )
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");

      if (!category) {
        category = "Restaurant";
      }

      // -----------------------------------------------------
      // ADDRESS
      // -----------------------------------------------------

      const addressParts = [
        tags["addr:street"],
        tags["addr:housenumber"],
        tags["addr:district"],
        tags["addr:suburb"]
      ].filter(Boolean);

      const address =
        addressParts.join(", ");

      // -----------------------------------------------------
      // WEBSITE
      // -----------------------------------------------------

      const website =
        tags.website ||
        tags["contact:website"] ||
        "";

      // -----------------------------------------------------
      // PHONE
      // -----------------------------------------------------

      const phone =
        tags.phone ||
        tags["contact:phone"] ||
        "";

      // -----------------------------------------------------
      // CUISINE
      // -----------------------------------------------------

      const cuisine =
        tags.cuisine ||
        "";

      // -----------------------------------------------------
      // OPENING HOURS
      // -----------------------------------------------------

      const openingHours =
        tags.opening_hours ||
        "";

      // -----------------------------------------------------
      // MAP LINK
      // -----------------------------------------------------

      const mapURL =
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          cleanName + " " + destination
        )}`;

      results.push({

        name:
          cleanName,

        category:
          category,

        cuisine:
          cuisine,

        address:
          address,

        phone:
          phone,

        website:
          website,

        openingHours:
          openingHours,

        mapUrl:
          mapURL,

        source:
          "OpenStreetMap"

      });

    }

    // -------------------------------------------------------
    // SORT / LIMIT
    // -------------------------------------------------------

    const finalResults =
      results
        .slice(
          0,
          12
        );

    console.log(
      "OpenStreetMap restaurants selected:",
      finalResults.length
    );

    return finalResults;

  } catch (error) {

    console.error(
      "Restaurant lookup failed:",
      error.message
    );

    return [];

  }

}


// =========================================================
// RESTAURANT SEARCH URL
// =========================================================

function createRestaurantSearchURL(
  destination
) {

  return (
    "https://www.google.com/maps/search/restaurants+" +
    encodeURIComponent(
      destination
    )
  );

}


// =========================================================
// RESTAURANTS HTML
// =========================================================

function createRestaurantsHTML(
  restaurants,
  destination
) {

  // -------------------------------------------------------
  // EMPTY STATE
  // -------------------------------------------------------

  if (
    !Array.isArray(
      restaurants
    ) ||
    restaurants.length === 0
  ) {

    return `

      <div class="restaurant-empty"
        style="
          padding:24px;
          border:1px solid #e8e8ee;
          border-radius:16px;
          background:#fafafa;
        "
      >

        <h3
          style="
            margin:0 0 8px;
          "
        >
          Restaurants
        </h3>

        <p
          style="
            margin:0 0 16px;
            color:#666;
            line-height:1.6;
          "
        >
          We could not find restaurant listings
          automatically for ${escapeHTMLServer(destination)}.
        </p>

        <a
          href="${escapeAttributeServer(
            createRestaurantSearchURL(
              destination
            )
          )}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            padding:11px 16px;
            border-radius:10px;
            background:#111827;
            color:white;
            text-decoration:none;
            font-weight:700;
          "
        >
          Explore restaurants
          ↗
        </a>

      </div>

    `;

  }

  // -------------------------------------------------------
  // CARDS
  // -------------------------------------------------------

  const cards =
    restaurants
      .map(
        (restaurant, index) => {

          const cuisineText =
            restaurant.cuisine ||
            restaurant.category ||
            "Local restaurant";

          const addressText =
            restaurant.address ||
            "Address available on map";

          const openingText =
            restaurant.openingHours ||
            "";

          return `

            <article
              class="restaurant-card"
              style="
                background:#fff;
                border:1px solid #e8e8ee;
                border-radius:18px;
                padding:20px;
                box-shadow:0 8px 24px rgba(0,0,0,.05);
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:flex-start;
                  gap:14px;
                  margin-bottom:10px;
                "
              >

                <div>

                  <div
                    style="
                      font-size:11px;
                      font-weight:700;
                      text-transform:uppercase;
                      letter-spacing:.08em;
                      color:#8b8f9a;
                      margin-bottom:5px;
                    "
                  >
                    Restaurant ${index + 1}
                  </div>

                  <h3
                    style="
                      margin:0;
                      font-size:20px;
                      line-height:1.3;
                      color:#17181c;
                    "
                  >
                    ${escapeHTMLServer(
                      restaurant.name
                    )}
                  </h3>

                </div>

              </div>

              <div
                style="
                  display:flex;
                  flex-wrap:wrap;
                  gap:7px;
                  margin-bottom:13px;
                "
              >

                <span
                  style="
                    background:#f5f6f8;
                    border:1px solid #e9eaee;
                    border-radius:999px;
                    padding:6px 10px;
                    font-size:12px;
                    color:#50555f;
                  "
                >
                  ${escapeHTMLServer(
                    cuisineText
                  )}
                </span>

              </div>

              <p
                style="
                  margin:0 0 8px;
                  color:#5b606b;
                  font-size:14px;
                  line-height:1.5;
                "
              >
                ${escapeHTMLServer(
                  addressText
                )}
              </p>

              ${
                openingText
                  ? `
                    <p
                      style="
                        margin:0 0 8px;
                        color:#777c86;
                        font-size:13px;
                      "
                    >
                      Hours:
                      ${escapeHTMLServer(
                        openingText
                      )}
                    </p>
                  `
                  : ""
              }

              ${
                restaurant.phone
                  ? `
                    <p
                      style="
                        margin:0 0 14px;
                        color:#777c86;
                        font-size:13px;
                      "
                    >
                      ${escapeHTMLServer(
                        restaurant.phone
                      )}
                    </p>
                  `
                  : ""
              }

              <div
                style="
                  display:flex;
                  gap:10px;
                  flex-wrap:wrap;
                  margin-top:15px;
                "
              >

                <a
                  href="${escapeAttributeServer(
                    restaurant.mapUrl
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    min-height:42px;
                    padding:0 16px;
                    border-radius:10px;
                    background:#111827;
                    color:#fff;
                    text-decoration:none;
                    font-size:13px;
                    font-weight:700;
                  "
                >
                  View on Maps ↗
                </a>

                ${
                  restaurant.website
                    ? `
                      <a
                        href="${escapeAttributeServer(
                          restaurant.website
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          display:inline-flex;
                          align-items:center;
                          justify-content:center;
                          min-height:42px;
                          padding:0 16px;
                          border-radius:10px;
                          background:#f5f6f8;
                          color:#222;
                          text-decoration:none;
                          font-size:13px;
                          font-weight:700;
                        "
                      >
                        Website ↗
                      </a>
                    `
                    : ""
                }

              </div>

              <div
                style="
                  margin-top:12px;
                  font-size:11px;
                  color:#999;
                "
              >
                Local listing data: OpenStreetMap
              </div>

            </article>

          `;

        }
      )
      .join("");

  // -------------------------------------------------------
  // COMPLETE SECTION
  // -------------------------------------------------------

  return `

    <div class="restaurants-wrapper">

      <div
        style="
          margin-bottom:20px;
        "
      >

        <h3
          style="
            margin:0 0 6px;
            font-size:20px;
          "
        >
          Restaurants in ${escapeHTMLServer(
            destination
          )}
        </h3>

        <p
          style="
            margin:0;
            color:#70757f;
            line-height:1.6;
          "
        >
          Real local restaurants selected from
          OpenStreetMap data for your destination.
        </p>

      </div>

      <div
        class="restaurant-list"
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit, minmax(280px, 1fr));
          gap:18px;
        "
      >

        ${cards}

      </div>

    </div>

  `;

}


// =========================================================
// SERVER-SIDE HTML ESCAPE
// =========================================================

function escapeHTMLServer(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// =========================================================
// SERVER-SIDE ATTRIBUTE ESCAPE
// =========================================================

function escapeAttributeServer(
  value
) {

  return escapeHTMLServer(
    value
  );

              }

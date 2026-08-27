console.log("PLAN.JS PRODUCTION V9 RUNNING");

export default async function handler(req, res) {
  console.log("PLAN API START");

  // =========================================================
  // METHOD CHECK
  // =========================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // =========================================================
    // API KEYS
    // =========================================================

    const rawGeminiKey =
      process.env.GEMINI_API_KEY;

    const rawStayingApiKey =
      process.env.STAYINGAPI_KEY;

    console.log(
      "GEMINI KEY EXISTS:",
      Boolean(rawGeminiKey)
    );

    console.log(
      "STAYINGAPI KEY EXISTS:",
      Boolean(rawStayingApiKey)
    );

    if (!rawGeminiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing in Vercel"
      });
    }

    if (!rawStayingApiKey) {
      return res.status(500).json({
        error:
          "STAYINGAPI_KEY is missing in Vercel"
      });
    }

    const geminiKey =
      String(rawGeminiKey).trim();

    const stayingApiKey =
      String(rawStayingApiKey).trim();

    if (geminiKey.includes("…")) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY contains an invalid ellipsis character"
      });
    }

    if (stayingApiKey.includes("…")) {
      return res.status(500).json({
        error:
          "STAYINGAPI_KEY contains an invalid ellipsis character"
      });
    }

    // =========================================================
    // REQUEST DATA
    // =========================================================

    const body =
      req.body || {};

    const destination =
      typeof body.destination === "string"
        ? body.destination.trim()
        : "";

    const start =
      typeof body.start === "string"
        ? body.start.trim()
        : "";

    const days =
      Number(body.days);

    const budget =
      Number(body.budget);

    const travelers =
      typeof body.travelers === "string"
        ? body.travelers.trim()
        : "1 traveler";

    const interests =
      Array.isArray(body.interests)
        ? body.interests
            .filter(
              item =>
                typeof item === "string"
            )
            .map(
              item =>
                item.trim()
            )
            .filter(Boolean)
        : [];

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    console.log(
      "TRIP DATA:",
      {
        destination,
        start,
        days,
        budget,
        travelers,
        interests
      }
    );

    // =========================================================
    // VALIDATION
    // =========================================================

    if (!destination) {
      return res.status(400).json({
        error:
          "Destination is required"
      });
    }

    if (
      !Number.isFinite(days) ||
      days < 1 ||
      days > 60
    ) {
      return res.status(400).json({
        error:
          "Invalid number of days"
      });
    }

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      return res.status(400).json({
        error:
          "Invalid budget"
      });
    }

    // =========================================================
    // TRAVELERS
    // =========================================================

    function extractAdults(value) {
      const text =
        String(value || "")
          .toLowerCase();

      const match =
        text.match(/(\d+)/);

      if (match) {
        const number =
          Number(match[1]);

        if (
          Number.isFinite(number) &&
          number >= 1
        ) {
          return Math.min(
            number,
            20
          );
        }
      }

      return 1;
    }

    const adults =
      extractAdults(
        travelers
      );

    console.log(
      "ADULTS:",
      adults
    );

    // =========================================================
    // DATE HELPERS
    // =========================================================

    function isValidDateString(
      value
    ) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          value
        )
      ) {
        return false;
      }

      const date =
        new Date(
          `${value}T00:00:00Z`
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return false;
      }

      return (
        date
          .toISOString()
          .slice(0, 10) ===
        value
      );
    }

    function addDays(
      dateString,
      numberOfDays
    ) {
      const date =
        new Date(
          `${dateString}T00:00:00Z`
        );

      date.setUTCDate(
        date.getUTCDate() +
          numberOfDays
      );

      return date
        .toISOString()
        .slice(0, 10);
    }

    const validStart =
      isValidDateString(
        start
      );

    const checkOut =
      validStart
        ? addDays(
            start,
            days
          )
        : "";

    console.log(
      "HOTEL DATES:",
      {
        checkIn:
          validStart
            ? start
            : "none",

        checkOut:
          validStart
            ? checkOut
            : "none"
      }
    );

    // =========================================================
    // INTERESTS
    // =========================================================

    const interestText =
      interests.length > 0
        ? interests.join(", ")
        : "General sightseeing, local food and culture";

    // =========================================================
    // GEMINI PROMPT
    // =========================================================

    const prompt = `
You are AI Life Planner, a premium personalized travel planning assistant.

Create a realistic and useful trip plan.

TRIP INFORMATION

Destination:
${destination}

Start date:
${start || "Not specified"}

Number of days:
${days}

Total trip budget:
$${budget} USD

Travelers:
${travelers}

Interests:
${interestText}

Additional notes:
${notes || "None"}

CORE RULES

1. Create exactly ${days} itinerary days.

2. Every day must contain:
- morning
- afternoon
- evening

3. Make the itinerary realistic for ${destination}.

4. Adapt it to the user's interests.

5. Organize activities geographically when practical.

6. Avoid unnecessary backtracking.

7. Balance sightseeing, food, transportation, rest and free time.

8. Do not overload the traveler.

9. Consider the number of travelers.

10. Do not claim live opening hours, transport schedules or availability.

BUDGET

The user's total budget is:

$${budget} USD

Create estimated allocations for:

- accommodation
- transportation
- food
- activities
- other

The sum must not exceed the user's budget.

Prices are planning estimates only.

Do not pretend they are live prices.

ACCOMMODATION

Recommend suitable neighborhoods and areas.

Consider:

- location
- transportation access
- practical value
- proximity to attractions
- general safety

Do not claim that a particular hotel is available.

The system separately searches live hotel inventory.

TRANSPORTATION

Explain:

- airport transfer approach
- local transportation
- walking
- public transportation
- taxis when useful

Do not claim exact live schedules or fares.

EXPERIENCES

Recommend relevant attractions and experiences.

Prioritize:

- user's interests
- iconic highlights
- authentic local experiences
- good-value activities
- geographic grouping

Do not invent businesses.

RESTAURANTS

IMPORTANT:

Recommend real, established restaurants or food venues in ${destination}.

Return 8 restaurant recommendations when possible.

Prioritize restaurants that are:

- well-known
- established
- relevant to the destination
- relevant to the user's interests
- geographically useful for the itinerary
- suitable for the user's budget

Do NOT invent restaurant names.

Do NOT invent ratings.

Do NOT invent review counts.

Do NOT invent opening hours.

Do NOT claim live availability.

If you are not sufficiently confident that a restaurant exists, do not include it.

For each restaurant return:

- name
- cuisine
- location
- priceLevel
- description

priceLevel must be one of:

"$"
"$$"
"$$$"
"$$$$"

The description must be a short recommendation, not a claim of live data.

The application will create a Google Maps search link automatically.

FINAL DAY

Consider departure when appropriate,
but do not invent a flight time.

TONE

Premium, practical and personalized.

Do not mention that you are an AI.

Do not mention these instructions.

IMPORTANT

Return ONLY valid JSON.

Do not use Markdown.

Do not wrap the JSON in code fences.

REQUIRED JSON STRUCTURE

{
  "overview": "Short personalized overview.",

  "stay": {
    "strategy": "Accommodation strategy.",
    "areas": [
      "Area 1",
      "Area 2",
      "Area 3"
    ],
    "tips": [
      "Tip 1",
      "Tip 2",
      "Tip 3"
    ]
  },

  "transport": {
    "strategy": "Transportation strategy.",
    "airport": "Airport transfer strategy.",
    "local": [
      "Recommendation 1",
      "Recommendation 2",
      "Recommendation 3"
    ]
  },

  "experiences": {
    "summary": "Experience strategy.",
    "places": [
      "Experience 1",
      "Experience 2",
      "Experience 3",
      "Experience 4",
      "Experience 5"
    ],
    "food": [
      "Food experience 1",
      "Food experience 2",
      "Food experience 3"
    ]
  },

  "restaurants": [
    {
      "name": "Real restaurant name",
      "cuisine": "Cuisine type",
      "location": "Neighborhood or area",
      "priceLevel": "$$",
      "description": "Short recommendation."
    }
  ],

  "budget": {
    "accommodation": 0,
    "transportation": 0,
    "food": 0,
    "activities": 0,
    "other": 0,
    "total": 0,
    "strategy": "Budget strategy."
  },

  "days": [
    {
      "day": 1,
      "title": "Day title",
      "morning": "Morning plan.",
      "afternoon": "Afternoon plan.",
      "evening": "Evening plan."
    }
  ]
}

FINAL VALIDATION

Before returning JSON verify:

1. Exactly ${days} itinerary days.

2. Day numbers are sequential.

3. All five budget categories are numbers.

4. Calculate the budget total.

5. total <= ${budget}.

6. No negative budget values.

7. No null budget values.

8. Restaurant names should be real and established.

9. Do not fabricate ratings, reviews or opening hours.

10. Return JSON only.
`;

    // =========================================================
    // GEMINI REQUEST
    // =========================================================

    console.log(
      "CALLING GEMINI..."
    );

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    const geminiResponse =
      await fetch(
        geminiURL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              geminiKey
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",

                parts: [
                  {
                    text:
                      prompt
                  }
                ]
              }
            ],

            generationConfig: {
              temperature: 0.25,

              responseMimeType:
                "application/json"
            }
          })
        }
      );

    console.log(
      "GEMINI STATUS:",
      geminiResponse.status
    );

    const geminiData =
      await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error(
        "GEMINI REQUEST FAILED:",
        JSON.stringify(
          geminiData
        )
      );

      return res.status(500).json({
        error:
          "Gemini request failed",

        geminiStatus:
          geminiResponse.status,

        details:
          geminiData
      });
    }

    // =========================================================
    // GET GEMINI TEXT
    // =========================================================

    const parts =
      geminiData
        ?.candidates?.[0]
        ?.content?.parts || [];

    const text =
      parts
        .map(
          part =>
            part?.text || ""
        )
        .filter(Boolean)
        .join("");

    console.log(
      "GEMINI TEXT EXISTS:",
      Boolean(text)
    );

    if (!text) {
      return res.status(500).json({
        error:
          "Gemini returned no text"
      });
    }

    // =========================================================
    // CLEAN JSON
    // =========================================================

    let cleanText =
      text.trim();

    if (
      cleanText.startsWith(
        "```"
      )
    ) {
      cleanText =
        cleanText
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();
    }

    const firstBrace =
      cleanText.indexOf(
        "{"
      );

    const lastBrace =
      cleanText.lastIndexOf(
        "}"
      );

    if (
      firstBrace === -1 ||
      lastBrace === -1 ||
      lastBrace <= firstBrace
    ) {
      return res.status(500).json({
        error:
          "Gemini returned invalid JSON"
      });
    }

    cleanText =
      cleanText.substring(
        firstBrace,
        lastBrace + 1
      );

    // =========================================================
    // PARSE PLAN
    // =========================================================

    let plan;

    try {
      plan =
        JSON.parse(
          cleanText
        );
    } catch (error) {
      console.error(
        "JSON PARSE ERROR:",
        error.message
      );

      return res.status(500).json({
        error:
          "Gemini returned invalid JSON",

        details:
          error.message
      });
    }

    if (
      !plan ||
      typeof plan !==
        "object"
    ) {
      return res.status(500).json({
        error:
          "Invalid plan object"
      });
    }

    // =========================================================
    // DEFAULT SECTIONS
    // =========================================================

    if (
      typeof plan.overview !==
        "string" ||
      !plan.overview.trim()
    ) {
      plan.overview =
        `Your personalized ${destination} travel plan.`;
    }

    if (
      !plan.stay ||
      typeof plan.stay !==
        "object"
    ) {
      plan.stay = {};
    }

    if (
      !plan.transport ||
      typeof plan.transport !==
        "object"
    ) {
      plan.transport = {};
    }

    if (
      !plan.experiences ||
      typeof plan.experiences !==
        "object"
    ) {
      plan.experiences = {};
    }

    if (
      !plan.budget ||
      typeof plan.budget !==
        "object"
    ) {
      plan.budget = {};
    }

    if (
      !Array.isArray(
        plan.days
      )
    ) {
      plan.days = [];
    }

    if (
      !Array.isArray(
        plan.stay.areas
      )
    ) {
      plan.stay.areas = [];
    }

    if (
      !Array.isArray(
        plan.stay.tips
      )
    ) {
      plan.stay.tips = [];
    }

    if (
      !Array.isArray(
        plan.transport.local
      )
    ) {
      plan.transport.local = [];
    }

    if (
      !Array.isArray(
        plan.experiences.places
      )
    ) {
      plan.experiences.places = [];
    }

    if (
      !Array.isArray(
        plan.experiences.food
      )
    ) {
      plan.experiences.food = [];
    }

    // =========================================================
    // RESTAURANTS
    // =========================================================

    function createGoogleMapsSearchUrl(
      restaurantName,
      restaurantLocation
    ) {
      const query =
        [
          restaurantName,
          restaurantLocation,
          destination
        ]
          .filter(Boolean)
          .join(", ");

      return (
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(query)
      );
    }

    function normalizeRestaurants(
      data
    ) {
      if (
        !Array.isArray(data)
      ) {
        return [];
      }

      return data
        .map(
          restaurant => {

            if (
              !restaurant ||
              typeof restaurant !==
                "object"
            ) {
              return null;
            }

            const name =
              typeof restaurant.name ===
                "string"
                ? restaurant.name.trim()
                : "";

            if (!name) {
              return null;
            }

            const cuisine =
              typeof restaurant.cuisine ===
                "string"
                ? restaurant.cuisine.trim()
                : "";

            const location =
              typeof restaurant.location ===
                "string"
                ? restaurant.location.trim()
                : "";

            const priceLevel =
              [
                "$",
                "$$",
                "$$$",
                "$$$$"
              ].includes(
                restaurant.priceLevel
              )
                ? restaurant.priceLevel
                : "$$";

            const description =
              typeof restaurant.description ===
                "string"
                ? restaurant.description.trim()
                : "";

            return {
              id:
                restaurant.id ||
                `restaurant-${Math.random()
                  .toString(36)
                  .slice(2, 10)}`,

              name,

              cuisine,

              location,

              priceLevel,

              description,

              platform:
                "Google Maps",

              url:
                createGoogleMapsSearchUrl(
                  name,
                  location
                ),

              rating:
                null,

              reviewCount:
                null,

              openingHours:
                null
            };
          }
        )
        .filter(Boolean)
        .slice(0, 8);
    }

    const restaurants =
      normalizeRestaurants(
        plan.restaurants
      );

    const restaurantSearch = {
      enabled:
        restaurants.length > 0,

      status:
        restaurants.length > 0
          ? "recommended"
          : "no_results",

      source:
        "AI restaurant recommendations",

      liveAvailability:
        false,

      count:
        restaurants.length,

      destination
    };

    console.log(
      "RESTAURANTS RETURNED:",
      restaurants.length
    );

    // =========================================================
    // DEFAULT STRINGS
    // =========================================================

    plan.stay.strategy =
      typeof plan.stay.strategy ===
        "string"
        ? plan.stay.strategy
        : "";

    plan.transport.strategy =
      typeof plan.transport.strategy ===
        "string"
        ? plan.transport.strategy
        : "";

    plan.transport.airport =
      typeof plan.transport.airport ===
        "string"
        ? plan.transport.airport
        : "";

    plan.experiences.summary =
      typeof plan.experiences.summary ===
        "string"
        ? plan.experiences.summary
        : "";

    plan.budget.strategy =
      typeof plan.budget.strategy ===
        "string"
        ? plan.budget.strategy
        : "";

    // =========================================================
    // NORMALIZE BUDGET
    // =========================================================

    let accommodation =
      Math.max(
        0,
        Number(
          plan.budget.accommodation || 0
        )
      );

    let transportation =
      Math.max(
        0,
        Number(
          plan.budget.transportation || 0
        )
      );

    let food =
      Math.max(
        0,
        Number(
          plan.budget.food || 0
        )
      );

    let activities =
      Math.max(
        0,
        Number(
          plan.budget.activities || 0
        )
      );

    let other =
      Math.max(
        0,
        Number(
          plan.budget.other || 0
        )
      );

    let calculatedTotal =
      accommodation +
      transportation +
      food +
      activities +
      other;

    if (
      calculatedTotal > budget
    ) {
      console.warn(
        "AI BUDGET EXCEEDED USER BUDGET:",
        calculatedTotal,
        budget
      );

      const ratio =
        budget /
        calculatedTotal;

      accommodation =
        Math.floor(
          accommodation *
            ratio
        );

      transportation =
        Math.floor(
          transportation *
            ratio
        );

      food =
        Math.floor(
          food *
            ratio
        );

      activities =
        Math.floor(
          activities *
            ratio
        );

      other =
        Math.max(
          0,
          budget -
            accommodation -
            transportation -
            food -
            activities
        );

      calculatedTotal =
        accommodation +
        transportation +
        food +
        activities +
        other;
    }

    plan.budget.accommodation =
      Number(accommodation);

    plan.budget.transportation =
      Number(transportation);

    plan.budget.food =
      Number(food);

    plan.budget.activities =
      Number(activities);

    plan.budget.other =
      Number(other);

    plan.budget.total =
      Number(calculatedTotal);

    // =========================================================
    // NORMALIZE DAYS
    // =========================================================

    plan.days =
      plan.days
        .slice(0, days)
        .map(
          (day, index) => {

            if (
              !day ||
              typeof day !==
                "object"
            ) {
              day = {};
            }

            return {
              day:
                index + 1,

              title:
                typeof day.title ===
                  "string"
                  ? day.title
                  : `Day ${index + 1}`,

              morning:
                typeof day.morning ===
                  "string"
                  ? day.morning
                  : "",

              afternoon:
                typeof day.afternoon ===
                  "string"
                  ? day.afternoon
                  : "",

              evening:
                typeof day.evening ===
                  "string"
                  ? day.evening
                  : ""
            };
          }
        );

    if (
      plan.days.length !==
        days
    ) {
      return res.status(500).json({
        error:
          "AI returned an incorrect number of itinerary days",

        expectedDays:
          days,

        returnedDays:
          plan.days.length
      });
    }

    // =========================================================
    // HOTEL SEARCH INITIAL STATE
    // =========================================================

    let hotels = [];

    let hotelSearch = {
      enabled: false,

      status:
        "not_searched",

      checkIn:
        validStart
          ? start
          : null,

      checkOut:
        validStart
          ? checkOut
          : null,

      adults,

      platforms: [
        "booking",
        "google"
      ],

      creditsCharged: 0,

      count: 0
    };

    // =========================================================
    // HOTEL NORMALIZATION
    // =========================================================

    function getFirstValue(
      object,
      keys
    ) {
      for (
        const key of keys
      ) {
        if (
          object &&
          object[key] !==
            undefined &&
          object[key] !==
            null &&
          object[key] !== ""
        ) {
          return object[key];
        }
      }

      return null;
    }

    function normalizeHotelPrice(
      price
    ) {
      if (
        price === null ||
        price === undefined ||
        price === ""
      ) {
        return null;
      }

      if (
        typeof price ===
          "number"
      ) {
        return {
          amount: price,

          currency:
            "USD"
        };
      }

      if (
        typeof price ===
          "string"
      ) {
        return {
          formatted:
            price
        };
      }

      if (
        typeof price !==
          "object"
      ) {
        return null;
      }

      const total =
        getFirstValue(
          price,
          [
            "total",
            "totalPrice",
            "amount",
            "value",
            "price"
          ]
        );

      const nightly =
        getFirstValue(
          price,
          [
            "nightly",
            "nightlyPrice",
            "perNight",
            "night"
          ]
        );

      const currency =
        getFirstValue(
          price,
          [
            "currency",
            "currencyCode"
          ]
        ) ||
        "USD";

      const formatted =
        getFirstValue(
          price,
          [
            "formatted",
            "display"
          ]
        );

      const normalized = {
        currency
      };

      if (
        total !== null
      ) {
        normalized.total =
          total;
      }

      if (
        nightly !== null
      ) {
        normalized.nightly =
          nightly;
      }

      if (
        formatted
      ) {
        normalized.formatted =
          String(
            formatted
          );
      }

      if (
        normalized.total !==
          undefined ||
        normalized.nightly !==
          undefined ||
        normalized.formatted
      ) {
        return normalized;
      }

      return null;
    }

    function normalizeHotel(
      hotel,
      index
    ) {
      if (
        !hotel ||
        typeof hotel !==
          "object"
      ) {
        return null;
      }

      const name =
        getFirstValue(
          hotel,
          [
            "name",
            "hotelName",
            "propertyName",
            "title"
          ]
        );

      if (!name) {
        return null;
      }

      const location =
        getFirstValue(
          hotel,
          [
            "location",
            "address",
            "area"
          ]
        );

      const url =
        getFirstValue(
          hotel,
          [
            "url",
            "bookingUrl",
            "website",
            "webUrl",
            "link"
          ]
        );

      const platform =
        getFirstValue(
          hotel,
          [
            "platform",
            "source",
            "provider"
          ]
        );

      const starRating =
        getFirstValue(
          hotel,
          [
            "starRating",
            "stars",
            "hotelStars"
          ]
        );

      const guestRating =
        getFirstValue(
          hotel,
          [
            "guestRating",
            "rating",
            "reviewRating"
          ]
        );

      const reviewCount =
        getFirstValue(
          hotel,
          [
            "reviewCount",
            "reviews",
            "numberOfReviews"
          ]
        );

      let amenities =
        getFirstValue(
          hotel,
          [
            "amenities",
            "features"
          ]
        );

      if (
        !Array.isArray(
          amenities
        )
      ) {
        amenities = [];
      }

      const rawPrice =
        getFirstValue(
          hotel,
          [
            "price",
            "pricing",
            "rate"
          ]
        );

      const price =
        normalizeHotelPrice(
          rawPrice
        );

      /*
       * IMPORTANT:
       *
       * Do not remove hotels simply because
       * price is missing.
       *
       * StayingAPI can return useful hotel
       * inventory even when one field is absent.
       */

      return {
        id:
          getFirstValue(
            hotel,
            [
              "id",
              "hotelId",
              "propertyId"
            ]
          ) ||
          `hotel-${index + 1}`,

        platform:
          platform
            ? String(platform)
            : null,

        platformListingId:
          getFirstValue(
            hotel,
            [
              "platformListingId",
              "listingId"
            ]
          ),

        name:
          String(name),

        propertyType:
          getFirstValue(
            hotel,
            [
              "propertyType",
              "type"
            ]
          ),

        url:
          url
            ? String(url)
            : null,

        location,

        starRating,

        guestRating,

        ratingScale:
          getFirstValue(
            hotel,
            [
              "ratingScale",
              "ratingMax"
            ]
          ),

        reviewCount,

        amenities,

        price
      };
    }

    function normalizeHotels(
      data
    ) {
      if (
        !Array.isArray(data)
      ) {
        return [];
      }

      return data
        .map(
          normalizeHotel
        )
        .filter(Boolean)
        .slice(0, 10);
    }

    // =========================================================
    // EXTRACT HOTEL ARRAY FROM ANY STAYINGAPI RESPONSE
    // =========================================================

    function extractHotelArray(
      payload
    ) {
      console.log(
        "EXTRACTING STAYINGAPI HOTELS..."
      );

      if (
        !payload
      ) {
        return [];
      }

      /*
       * Direct array
       */

      if (
        Array.isArray(
          payload
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: DIRECT ARRAY"
        );

        return payload;
      }

      /*
       * data[]
       */

      if (
        Array.isArray(
          payload?.data
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.data[]"
        );

        return payload.data;
      }

      /*
       * result[]
       */

      if (
        Array.isArray(
          payload?.result
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.result[]"
        );

        return payload.result;
      }

      /*
       * result.data[]
       */

      if (
        Array.isArray(
          payload?.result?.data
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.result.data[]"
        );

        return payload.result.data;
      }

      /*
       * data.result[]
       */

      if (
        Array.isArray(
          payload?.data?.result
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.data.result[]"
        );

        return payload.data.result;
      }

      /*
       * data.result.data[]
       */

      if (
        Array.isArray(
          payload?.data?.result?.data
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.data.result.data[]"
        );

        return payload.data.result.data;
      }

      /*
       * hotels[]
       */

      if (
        Array.isArray(
          payload?.hotels
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.hotels[]"
        );

        return payload.hotels;
      }

      /*
       * data.hotels[]
       */

      if (
        Array.isArray(
          payload?.data?.hotels
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.data.hotels[]"
        );

        return payload.data.hotels;
      }

      /*
       * result.hotels[]
       */

      if (
        Array.isArray(
          payload?.result?.hotels
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.result.hotels[]"
        );

        return payload.result.hotels;
      }

      /*
       * data.result.hotels[]
       */

      if (
        Array.isArray(
          payload?.data?.result?.hotels
        )
      ) {
        console.log(
          "HOTEL DATA FORMAT: payload.data.result.hotels[]"
        );

        return payload.data.result.hotels;
      }

      console.warn(
        "NO HOTEL ARRAY FOUND IN STAYINGAPI RESPONSE"
      );

      return [];
    }

    // =========================================================
    // POLL STAYINGAPI JOB
    // =========================================================

    async function pollStayingJob(
      jobId,
      apiKey
    ) {
      /*
       * Keep the polling inside a reasonable
       * Vercel execution window.
       */

      const maxWaitMs =
        240000;

      const intervalMs =
        4000;

      const startedAt =
        Date.now();

      let attempt = 0;

      while (
        Date.now() -
          startedAt <
        maxWaitMs
      ) {
        attempt++;

        console.log(
          "STAYINGAPI JOB POLL:",
          {
            attempt,
            jobId
          }
        );

        const jobURL =
          `https://api.stayingapi.com/v1/jobs/${encodeURIComponent(
            jobId
          )}`;

        let jobResponse;

        try {
          jobResponse =
            await fetch(
              jobURL,
              {
                method: "GET",

                headers: {
                  "Authorization":
                    `Bearer ${apiKey}`,

                  "Accept":
                    "application/json"
                }
              }
            );
        } catch (
          fetchError
        ) {
          console.error(
            "STAYINGAPI JOB FETCH ERROR:",
            fetchError
          );

          throw new Error(
            "Unable to poll StayingAPI job"
          );
        }

        console.log(
          "STAYINGAPI JOB STATUS CODE:",
          jobResponse.status
        );

        let jobData = {};

        try {
          jobData =
            await jobResponse.json();
        } catch (
          jsonError
        ) {
          console.error(
            "STAYINGAPI JOB JSON ERROR:",
            jsonError
          );

          throw new Error(
            "StayingAPI returned invalid job response"
          );
        }

        console.log(
          "STAYINGAPI JOB RESPONSE KEYS:",
          Object.keys(
            jobData || {}
          )
        );

        const jobStatus =
          jobData?.data?.status ||
          jobData?.status ||
          jobData?.data?.state ||
          jobData?.state ||
          "";

        console.log(
          "STAYINGAPI JOB STATE:",
          jobStatus ||
            "unknown"
        );

        if (
          !jobResponse.ok
        ) {
          console.error(
            "STAYINGAPI JOB REQUEST FAILED:",
            JSON.stringify(
              jobData
            )
          );

          throw new Error(
            jobData?.data?.error ||
            jobData?.error ||
            jobData?.message ||
            "StayingAPI job request failed"
          );
        }

        /*
         * COMPLETED
         */

        if (
          jobStatus ===
            "completed" ||
          jobStatus ===
            "complete" ||
          jobStatus ===
            "success" ||
          jobStatus ===
            "succeeded"
        ) {
          console.log(
            "STAYINGAPI JOB COMPLETED"
          );

          const resultPayload =
            jobData?.data?.result ??
            jobData?.result ??
            jobData?.data ??
            jobData;

          const rawHotels =
            extractHotelArray(
              resultPayload
            );

          console.log(
            "HOTELS EXTRACTED FROM JOB:",
            rawHotels.length
          );

          return {
            data:
              rawHotels,

            meta:
              jobData?.data?.result?.meta ||
              jobData?.data?.meta ||
              jobData?.meta ||
              {},

            raw:
              jobData
          };
        }

        /*
         * FAILED
         */

        if (
          jobStatus ===
            "failed" ||
          jobStatus ===
            "error" ||
          jobStatus ===
            "cancelled"
        ) {
          console.error(
            "STAYINGAPI JOB FAILED:",
            JSON.stringify(
              jobData
            )
          );

          throw new Error(
            jobData?.data?.error ||
            jobData?.error ||
            jobData?.message ||
            "StayingAPI hotel search job failed"
          );
        }

        /*
         * Continue polling
         */

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              intervalMs
            )
        );
      }

      console.warn(
        "STAYINGAPI JOB POLLING TIMEOUT"
      );

      return {
        timeout: true,

        data: [],

        meta: {}
      };
    }

    // =========================================================
    // START HOTEL SEARCH
    // =========================================================

    if (validStart) {

      console.log(
        "================================================="
      );

      console.log(
        "STARTING STAYINGAPI HOTEL SEARCH"
      );

      console.log(
        "================================================="
      );

      const params =
        new URLSearchParams();

      params.set(
        "location",
        destination
      );

      params.set(
        "checkIn",
        start
      );

      params.set(
        "checkOut",
        checkOut
      );

      params.set(
        "adults",
        String(adults)
      );

      params.set(
        "children",
        "0"
      );

      params.set(
        "platforms",
        "booking,google"
      );

      params.set(
        "limit",
        "10"
      );

      params.set(
        "sort",
        "price_asc"
      );

      params.set(
        "currency",
        "USD"
      );

      const stayingURL =
        `https://api.stayingapi.com/v1/search?${params.toString()}`;

      console.log(
        "STAYINGAPI REQUEST URL:",
        stayingURL
          .replace(
            /([?&])location=[^&]*/i,
            "$1location=[hidden]"
          )
      );

      let stayingResponse =
        null;

      let stayingData =
        {};

      try {

        stayingResponse =
          await fetch(
            stayingURL,
            {
              method: "GET",

              headers: {
                "Authorization":
                  `Bearer ${stayingApiKey}`,

                "Accept":
                  "application/json"
              }
            }
          );

      } catch (
        fetchError
      ) {

        console.error(
          "STAYINGAPI SEARCH FETCH ERROR:",
          fetchError
        );

        hotelSearch = {
          ...hotelSearch,

          enabled: true,

          status:
            "error",

          error:
            "Unable to connect to StayingAPI"
        };
      }

      if (
        stayingResponse
      ) {

        console.log(
          "STAYINGAPI STATUS:",
          stayingResponse.status
        );

        try {

          stayingData =
            await stayingResponse.json();

        } catch (
          jsonError
        ) {

          console.error(
            "STAYINGAPI JSON ERROR:",
            jsonError
          );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status:
              "error",

            error:
              "StayingAPI returned invalid JSON"
          };
        }

        /*
         * Log only the structure, not the API key.
         */

        console.log(
          "STAYINGAPI RESPONSE TOP LEVEL KEYS:",
          Object.keys(
            stayingData || {}
          )
        );

        console.log(
          "STAYINGAPI RESPONSE DATA TYPE:",
          Array.isArray(
            stayingData?.data
          )
            ? "array"
            : typeof stayingData?.data
        );

        /*
         * =====================================================
         * ASYNC JOB
         * =====================================================
         */

        if (
          stayingResponse.status ===
            202 &&
          stayingData?.data?.jobId
        ) {

          const jobId =
            stayingData.data.jobId;

          console.log(
            "STAYINGAPI ASYNC JOB:",
            jobId
          );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status:
              "processing",

            jobId
          };

          try {

            const jobResult =
              await pollStayingJob(
                jobId,
                stayingApiKey
              );

            if (
              jobResult.timeout
            ) {

              /*
               * Important:
               *
               * Do not call this an error.
               * The frontend will show processing.
               */

              hotelSearch = {
                ...hotelSearch,

                status:
                  "processing",

                message:
                  "Hotel search is still processing"
              };

            } else {

              hotels =
                normalizeHotels(
                  jobResult.data
                );

              hotelSearch = {
                ...hotelSearch,

                status:
                  hotels.length > 0
                    ? "completed"
                    : "completed",

                creditsCharged:
                  Number(
                    jobResult
                      ?.meta
                      ?.creditsCharged ||
                    0
                  ),

                partial:
                  Boolean(
                    jobResult
                      ?.meta
                      ?.partial
                  ),

                warnings:
                  Array.isArray(
                    jobResult
                      ?.meta
                      ?.warnings
                  )
                    ? jobResult
                        .meta
                        .warnings
                    : [],

                count:
                  hotels.length
              };

              console.log(
                "HOTELS FOUND AFTER POLLING:",
                hotels.length
              );

              /*
               * Useful diagnostic:
               */

              if (
                hotels.length ===
                  0
              ) {
                console.warn(
                  "STAYINGAPI JOB COMPLETED BUT RETURNED ZERO HOTELS"
                );
              }
            }

          } catch (
            jobError
          ) {

            console.error(
              "STAYINGAPI POLLING ERROR:",
              jobError
            );

            hotelSearch = {
              ...hotelSearch,

              status:
                "error",

              error:
                jobError?.message ||
                "Hotel search job failed"
            };
          }
        }

        /*
         * =====================================================
         * SYNCHRONOUS RESULT
         * =====================================================
         */

        else if (
          stayingResponse.ok
        ) {

          const rawHotels =
            extractHotelArray(
              stayingData
            );

          console.log(
            "RAW SYNCHRONOUS HOTELS:",
            rawHotels.length
          );

          hotels =
            normalizeHotels(
              rawHotels
            );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status:
              "completed",

            creditsCharged:
              Number(
                stayingData?.meta
                  ?.creditsCharged ||
                stayingData?.data?.meta
                  ?.creditsCharged ||
                0
              ),

            partial:
              Boolean(
                stayingData?.meta
                  ?.partial ||
                stayingData?.data?.meta
                  ?.partial
              ),

            warnings:
              Array.isArray(
                stayingData?.meta
                  ?.warnings
              )
                ? stayingData.meta
                    .warnings
                : Array.isArray(
                    stayingData?.data?.meta
                      ?.warnings
                  )
                  ? stayingData.data.meta
                      .warnings
                  : [],

            count:
              hotels.length
          };

          console.log(
            "HOTELS FOUND:",
            hotels.length
          );
        }

        /*
         * =====================================================
         * API ERROR
         * =====================================================
         */

        else {

          console.error(
            "STAYINGAPI REQUEST FAILED:",
            JSON.stringify(
              stayingData
            )
          );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status:
              "error",

            error:
              stayingData?.error ||
              stayingData?.message ||
              stayingData?.data?.error ||
              "Hotel search failed"
          };
        }
      }

    } else {

      console.log(
        "HOTEL SEARCH SKIPPED:",
        "Valid YYYY-MM-DD start date is required"
      );

      hotelSearch = {
        ...hotelSearch,

        enabled: false,

        status:
          "not_searched",

        message:
          "A valid start date is required to search live hotel availability."
      };
    }

    // =========================================================
    // FINAL HOTEL NORMALIZATION
    // =========================================================

    if (
      !Array.isArray(
        hotels
      )
    ) {
      hotels = [];
    }

    hotels =
      hotels
        .map(
          (hotel, index) =>
            normalizeHotel(
              hotel,
              index
            )
        )
        .filter(Boolean)
        .slice(0, 10);

    hotelSearch.count =
      hotels.length;

    /*
     * CRITICAL:
     *
     * If real hotel data exists,
     * NEVER return status=error.
     *
     * The frontend always prioritizes
     * the actual hotels array.
     */

    if (
      hotels.length > 0
    ) {
      hotelSearch.enabled =
        true;

      hotelSearch.status =
        "completed";
    }

    // =========================================================
    // FINAL LOGS
    // =========================================================

    console.log(
      "================================================="
    );

    console.log(
      "PLAN CREATED SUCCESSFULLY"
    );

    console.log(
      "DAYS RETURNED:",
      plan.days.length
    );

    console.log(
      "BUDGET TOTAL:",
      plan.budget.total,
      "USER BUDGET:",
      budget
    );

    console.log(
      "HOTELS RETURNED:",
      hotels.length
    );

    console.log(
      "HOTEL SEARCH STATUS:",
      hotelSearch.status
    );

    console.log(
      "HOTEL SEARCH COUNT:",
      hotelSearch.count
    );

    console.log(
      "RESTAURANTS RETURNED:",
      restaurants.length
    );

    console.log(
      "RESTAURANT SEARCH STATUS:",
      restaurantSearch.status
    );

    console.log(
      "================================================="
    );

    // =========================================================
    // SUCCESS RESPONSE
    // =========================================================

    return res.status(200).json({
      plan,

      hotels,

      hotelSearch,

      restaurants,

      restaurantSearch
    });

  } catch (
    error
  ) {

    console.error(
      "SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Server error",

      message:
        error?.message ||
        "Unknown error"
    });
  }
              }

console.log("PLAN.JS SCRAPPA V2 RUNNING");

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

    const rawGeminiKey = process.env.GEMINI_API_KEY;
    const rawScrappaKey = process.env.SCRAPPA_API_KEY;

    console.log(
      "GEMINI KEY EXISTS:",
      Boolean(rawGeminiKey)
    );

    console.log(
      "SCRAPPA KEY EXISTS:",
      Boolean(rawScrappaKey)
    );

    if (!rawGeminiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel"
      });
    }

    if (!rawScrappaKey) {
      return res.status(500).json({
        error: "SCRAPPA_API_KEY is missing in Vercel"
      });
    }

    const geminiKey = String(rawGeminiKey).trim();
    const scrappaKey = String(rawScrappaKey).trim();

    if (!geminiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is empty"
      });
    }

    if (!scrappaKey) {
      return res.status(500).json({
        error: "SCRAPPA_API_KEY is empty"
      });
    }

    // =========================================================
    // REQUEST DATA
    // =========================================================

    const body = req.body || {};

    const destination =
      typeof body.destination === "string"
        ? body.destination.trim()
        : "";

    const start =
      typeof body.start === "string"
        ? body.start.trim()
        : "";

    const days = Number(body.days);
    const budget = Number(body.budget);

    const travelers =
      typeof body.travelers === "string"
        ? body.travelers.trim()
        : "1 traveler";

    const interests =
      Array.isArray(body.interests)
        ? body.interests
            .filter(item => typeof item === "string")
            .map(item => item.trim())
            .filter(Boolean)
        : [];

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    console.log("TRIP DATA:", {
      destination,
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    });

    // =========================================================
    // VALIDATION
    // =========================================================

    if (!destination) {
      return res.status(400).json({
        error: "Destination is required"
      });
    }

    if (
      !Number.isFinite(days) ||
      days < 1 ||
      days > 60
    ) {
      return res.status(400).json({
        error: "Invalid number of days"
      });
    }

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      return res.status(400).json({
        error: "Invalid budget"
      });
    }

    // =========================================================
    // TRAVELER PARSING
    // =========================================================

    function extractAdults(value) {
      const text = String(value || "").toLowerCase();

      const match = text.match(/(\d+)/);

      if (match) {
        const number = Number(match[1]);

        if (
          Number.isFinite(number) &&
          number >= 1
        ) {
          return Math.min(number, 10);
        }
      }

      return 1;
    }

    const adults = extractAdults(travelers);

    console.log("ADULTS:", adults);

    // =========================================================
    // DATE HELPERS
    // =========================================================

    function isValidDateString(value) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        return false;
      }

      const date =
        new Date(`${value}T00:00:00Z`);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return (
        date.toISOString().slice(0, 10) === value
      );
    }

    function addDays(dateString, numberOfDays) {
      const date =
        new Date(`${dateString}T00:00:00Z`);

      date.setUTCDate(
        date.getUTCDate() + numberOfDays
      );

      return date.toISOString().slice(0, 10);
    }

    const validStart =
      isValidDateString(start);

    const checkOut =
      validStart
        ? addDays(start, days)
        : "";

    console.log("HOTEL DATES:", {
      checkIn: validStart ? start : "none",
      checkOut: validStart ? checkOut : "none"
    });

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

Recommend real, established restaurants or food venues in ${destination}.

Return up to 8 restaurant recommendations when possible.

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

DAY QUALITY

Each day must feel coherent.

Morning:
One or two related activities.

Afternoon:
Nearby attractions, lunch or another experience.

Evening:
Dinner, neighborhood exploration, scenic activity,
relaxation or nightlife depending on the user.

Include realistic downtime.

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

    console.log("CALLING GEMINI...");

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    let geminiResponse;

    try {
      geminiResponse = await fetch(
        geminiURL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey
          },

          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],

            generationConfig: {
              temperature: 0.25,
              responseMimeType: "application/json"
            }
          })
        }
      );
    } catch (error) {
      console.error(
        "GEMINI FETCH ERROR:",
        error
      );

      return res.status(500).json({
        error: "Unable to connect to Gemini",
        message:
          error?.message ||
          "Gemini connection failed"
      });
    }

    console.log(
      "GEMINI STATUS:",
      geminiResponse.status
    );

    let geminiData = {};

    try {
      geminiData =
        await geminiResponse.json();
    } catch (error) {
      console.error(
        "GEMINI JSON ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Gemini returned invalid JSON response"
      });
    }

    if (!geminiResponse.ok) {
      console.error(
        "GEMINI REQUEST FAILED:",
        JSON.stringify(geminiData)
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
      geminiData?.candidates?.[0]?.content?.parts || [];

    const text =
      parts
        .map(part => part?.text || "")
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

    let cleanText = text.trim();

    if (cleanText.startsWith("```")) {
      cleanText =
        cleanText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
    }

    const firstBrace =
      cleanText.indexOf("{");

    const lastBrace =
      cleanText.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1 ||
      lastBrace <= firstBrace
    ) {
      console.error(
        "INVALID GEMINI JSON TEXT:",
        cleanText.slice(0, 1000)
      );

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
      plan = JSON.parse(cleanText);
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
      typeof plan !== "object"
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
      typeof plan.overview !== "string" ||
      !plan.overview.trim()
    ) {
      plan.overview =
        `Your personalized ${destination} travel plan.`;
    }

    if (
      !plan.stay ||
      typeof plan.stay !== "object"
    ) {
      plan.stay = {};
    }

    if (
      !plan.transport ||
      typeof plan.transport !== "object"
    ) {
      plan.transport = {};
    }

    if (
      !plan.experiences ||
      typeof plan.experiences !== "object"
    ) {
      plan.experiences = {};
    }

    if (
      !plan.budget ||
      typeof plan.budget !== "object"
    ) {
      plan.budget = {};
    }

    if (!Array.isArray(plan.days)) {
      plan.days = [];
    }

    // =========================================================
    // DEFAULT ARRAYS
    // =========================================================

    if (!Array.isArray(plan.stay.areas)) {
      plan.stay.areas = [];
    }

    if (!Array.isArray(plan.stay.tips)) {
      plan.stay.tips = [];
    }

    if (!Array.isArray(plan.transport.local)) {
      plan.transport.local = [];
    }

    if (!Array.isArray(plan.experiences.places)) {
      plan.experiences.places = [];
    }

    if (!Array.isArray(plan.experiences.food)) {
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

    function normalizeRestaurants(data) {
      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .map(restaurant => {
          if (
            !restaurant ||
            typeof restaurant !== "object"
          ) {
            return null;
          }

          const name =
            typeof restaurant.name === "string"
              ? restaurant.name.trim()
              : "";

          if (!name) {
            return null;
          }

          const cuisine =
            typeof restaurant.cuisine === "string"
              ? restaurant.cuisine.trim()
              : "";

          const location =
            typeof restaurant.location === "string"
              ? restaurant.location.trim()
              : "";

          const priceLevel =
            ["$", "$$", "$$$", "$$$$"].includes(
              restaurant.priceLevel
            )
              ? restaurant.priceLevel
              : "$$";

          const description =
            typeof restaurant.description === "string"
              ? restaurant.description.trim()
              : "";

          return {
            id:
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

            rating: null,

            reviewCount: null,

            openingHours: null
          };
        })
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
      typeof plan.stay.strategy === "string"
        ? plan.stay.strategy
        : "";

    plan.transport.strategy =
      typeof plan.transport.strategy === "string"
        ? plan.transport.strategy
        : "";

    plan.transport.airport =
      typeof plan.transport.airport === "string"
        ? plan.transport.airport
        : "";

    plan.experiences.summary =
      typeof plan.experiences.summary === "string"
        ? plan.experiences.summary
        : "";

    plan.budget.strategy =
      typeof plan.budget.strategy === "string"
        ? plan.budget.strategy
        : "";

    // =========================================================
    // NORMALIZE BUDGET
    // =========================================================

    let accommodation =
      Math.max(
        0,
        Number(plan.budget.accommodation || 0)
      );

    let transportation =
      Math.max(
        0,
        Number(plan.budget.transportation || 0)
      );

    let food =
      Math.max(
        0,
        Number(plan.budget.food || 0)
      );

    let activities =
      Math.max(
        0,
        Number(plan.budget.activities || 0)
      );

    let other =
      Math.max(
        0,
        Number(plan.budget.other || 0)
      );

    let calculatedTotal =
      accommodation +
      transportation +
      food +
      activities +
      other;

    if (calculatedTotal > budget) {
      console.warn(
        "AI BUDGET EXCEEDED USER BUDGET:",
        calculatedTotal,
        budget
      );

      const ratio =
        budget / calculatedTotal;

      accommodation =
        Math.floor(
          accommodation * ratio
        );

      transportation =
        Math.floor(
          transportation * ratio
        );

      food =
        Math.floor(
          food * ratio
        );

      activities =
        Math.floor(
          activities * ratio
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
      plan.budget.accommodation +
      plan.budget.transportation +
      plan.budget.food +
      plan.budget.activities +
      plan.budget.other;

    // =========================================================
    // NORMALIZE DAYS
    // =========================================================

    plan.days =
      plan.days
        .slice(0, days)
        .map((day, index) => {
          if (
            !day ||
            typeof day !== "object"
          ) {
            day = {};
          }

          return {
            day:
              index + 1,

            title:
              typeof day.title === "string" &&
              day.title.trim()
                ? day.title.trim()
                : `Day ${index + 1}`,

            morning:
              typeof day.morning === "string"
                ? day.morning
                : "",

            afternoon:
              typeof day.afternoon === "string"
                ? day.afternoon
                : "",

            evening:
              typeof day.evening === "string"
                ? day.evening
                : ""
          };
        });

    if (plan.days.length !== days) {
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
    // HOTEL SEARCH
    // =========================================================

    let hotels = [];

    let hotelSearch = {
      enabled: false,

      status: "not_searched",

      provider: "Scrappa",

      source: "Google Hotels",

      checkIn:
        validStart
          ? start
          : null,

      checkOut:
        validStart
          ? checkOut
          : null,

      adults,

      children: 0,

      currency: "USD",

      creditsCharged: 0,

      count: 0
    };

    // =========================================================
    // HOTEL PRICE NORMALIZER
    // =========================================================

    function normalizeHotelPrice(hotel) {
      const rawPrice =
        hotel.price ??
        hotel.total_price ??
        hotel.price_per_night ??
        hotel.rate ??
        hotel.rate_per_night ??
        null;

      if (
        rawPrice === null ||
        rawPrice === undefined
      ) {
        return null;
      }

      // Simple number
      if (
        typeof rawPrice === "number"
      ) {
        return String(rawPrice);
      }

      // Simple string
      if (
        typeof rawPrice === "string"
      ) {
        return rawPrice.trim();
      }

      // Object
      if (
        typeof rawPrice === "object"
      ) {
        const possibleValues = [
          rawPrice.amount,
          rawPrice.value,
          rawPrice.price,
          rawPrice.total,
          rawPrice.display,
          rawPrice.text,
          rawPrice.formatted,
          rawPrice.formatted_price,
          rawPrice.display_price
        ];

        for (
          const value of possibleValues
        ) {
          if (
            value !== null &&
            value !== undefined &&
            String(value).trim()
          ) {
            return String(value).trim();
          }
        }

        // Search nested object values
        const values =
          Object.values(rawPrice);

        for (
          const value of values
        ) {
          if (
            typeof value === "number"
          ) {
            return String(value);
          }

          if (
            typeof value === "string" &&
            value.trim()
          ) {
            return value.trim();
          }

          if (
            value &&
            typeof value === "object"
          ) {
            const nested =
              value.amount ??
              value.value ??
              value.price ??
              value.total ??
              value.display ??
              value.text ??
              value.formatted ??
              null;

            if (
              nested !== null &&
              nested !== undefined
            ) {
              return String(nested);
            }
          }
        }

        return null;
      }

      return null;
    }

    // =========================================================
    // HOTEL IMAGE NORMALIZER
    // =========================================================

    function normalizeHotelImage(hotel) {
      const directImage =
        hotel.image ??
        hotel.image_url ??
        hotel.thumbnail ??
        hotel.photo ??
        hotel.photo_url ??
        hotel.imageUrl ??
        hotel.thumbnail_url ??
        null;

      if (
        typeof directImage === "string" &&
        directImage.trim()
      ) {
        return directImage.trim();
      }

      if (
        directImage &&
        typeof directImage === "object"
      ) {
        const nestedImage =
          directImage.url ??
          directImage.src ??
          directImage.image_url ??
          directImage.thumbnail ??
          null;

        if (
          typeof nestedImage === "string" &&
          nestedImage.trim()
        ) {
          return nestedImage.trim();
        }
      }

      // Search common image arrays
      const imageArrays = [
        hotel.images,
        hotel.photos,
        hotel.gallery,
        hotel.photo_urls
      ];

      for (
        const array of imageArrays
      ) {
        if (
          !Array.isArray(array)
        ) {
          continue;
        }

        for (
          const item of array
        ) {
          if (
            typeof item === "string" &&
            item.trim()
          ) {
            return item.trim();
          }

          if (
            item &&
            typeof item === "object"
          ) {
            const imageUrl =
              item.url ??
              item.src ??
              item.image_url ??
              item.thumbnail ??
              null;

            if (
              typeof imageUrl === "string" &&
              imageUrl.trim()
            ) {
              return imageUrl.trim();
            }
          }
        }
      }

      return null;
    }

    // =========================================================
    // HOTEL NORMALIZER
    // =========================================================

    function normalizeHotels(data) {
      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .map((hotel, index) => {
          if (
            !hotel ||
            typeof hotel !== "object"
          ) {
            return null;
          }

          const name =
            hotel.name ||
            hotel.title ||
            hotel.property_name ||
            hotel.hotel_name ||
            "";

          if (
            typeof name !== "string" ||
            !name.trim()
          ) {
            return null;
          }

          const location =
            hotel.location ||
            hotel.address ||
            hotel.city ||
            destination;

          const url =
            hotel.url ||
            hotel.link ||
            hotel.property_url ||
            hotel.hotel_url ||
            null;

          const price =
            normalizeHotelPrice(
              hotel
            );

          const starRating =
            hotel.star_rating ??
            hotel.stars ??
            null;

          const guestRating =
            hotel.guest_rating ??
            hotel.review_score ??
            hotel.rating_score ??
            hotel.rating ??
            null;

          const reviewCount =
            hotel.review_count ??
            hotel.reviews_count ??
            hotel.number_of_reviews ??
            null;

          const amenities =
            Array.isArray(
              hotel.amenities
            )
              ? hotel.amenities
              : [];

          const image =
            normalizeHotelImage(
              hotel
            );

          const images =
            Array.isArray(hotel.images)
              ? hotel.images
                  .map(item => {
                    if (
                      typeof item === "string"
                    ) {
                      return item;
                    }

                    if (
                      item &&
                      typeof item === "object"
                    ) {
                      return (
                        item.url ??
                        item.src ??
                        item.image_url ??
                        item.thumbnail ??
                        null
                      );
                    }

                    return null;
                  })
                  .filter(Boolean)
              : [];

          const photos =
            Array.isArray(hotel.photos)
              ? hotel.photos
                  .map(item => {
                    if (
                      typeof item === "string"
                    ) {
                      return item;
                    }

                    if (
                      item &&
                      typeof item === "object"
                    ) {
                      return (
                        item.url ??
                        item.src ??
                        item.image_url ??
                        item.thumbnail ??
                        null
                      );
                    }

                    return null;
                  })
                  .filter(Boolean)
              : [];

          return {
            id:
              hotel.id ||
              hotel.property_id ||
              `scrappa-hotel-${index + 1}`,

            platform:
              hotel.platform ||
              "Google Hotels",

            platformListingId:
              hotel.property_id ||
              hotel.id ||
              null,

            name:
              name.trim(),

            propertyType:
              hotel.property_type ||
              hotel.propertyType ||
              "Hotel",

            url,

            location,

            starRating,

            guestRating,

            ratingScale:
              hotel.rating_scale ||
              null,

            reviewCount,

            amenities,

            price,

            currency:
              hotel.currency ||
              "USD",

            image,

            images,

            photos
          };
        })
        .filter(Boolean)
        .slice(0, 10);
    }

    // =========================================================
    // SCRAPPA SEARCH
    // =========================================================

    if (validStart) {
      console.log(
        "STARTING SCRAPPA HOTEL SEARCH..."
      );

      const params =
        new URLSearchParams();

      params.set(
        "q",
        destination
      );

      params.set(
        "check_in_date",
        start
      );

      params.set(
        "check_out_date",
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
        "currency",
        "USD"
      );

      if (
        /turkey|türkiye|istanbul/i.test(
          destination
        )
      ) {
        params.set(
          "gl",
          "tr"
        );
      }

      const scrappaURL =
        `https://scrappa.co/api/google-hotels/search?${params.toString()}`;

      console.log(
        "SCRAPPA REQUEST URL:",
        scrappaURL
      );

      let scrappaResponse;

      try {
        scrappaResponse =
          await fetch(
            scrappaURL,
            {
              method: "GET",

              headers: {
                "X-API-KEY":
                  scrappaKey,

                "Accept":
                  "application/json"
              }
            }
          );
      } catch (error) {
        console.error(
          "SCRAPPA FETCH ERROR:",
          error
        );

        hotelSearch = {
          ...hotelSearch,

          enabled: true,

          status: "error",

          error: {
            code:
              "connection_error",

            message:
              "Unable to connect to Scrappa hotel search.",

            retryable: true
          }
        };
      }

      // =======================================================
      // PROCESS SCRAPPA RESPONSE
      // =======================================================

      if (scrappaResponse) {
        console.log(
          "SCRAPPA STATUS:",
          scrappaResponse.status
        );

        let scrappaData = {};

        try {
          scrappaData =
            await scrappaResponse.json();
        } catch (error) {
          console.error(
            "SCRAPPA JSON ERROR:",
            error
          );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status: "error",

            error: {
              code:
                "invalid_response",

              message:
                "Scrappa returned an invalid response.",

              retryable: true
            }
          };
        }

        console.log(
          "SCRAPPA RESPONSE PREVIEW:",
          JSON.stringify(
            scrappaData
          ).slice(0, 3000)
        );

        if (scrappaResponse.ok) {
          let rawHotels = [];

          if (
            Array.isArray(
              scrappaData?.properties
            )
          ) {
            rawHotels =
              scrappaData.properties;

          } else if (
            Array.isArray(
              scrappaData?.data?.properties
            )
          ) {
            rawHotels =
              scrappaData.data.properties;

          } else if (
            Array.isArray(
              scrappaData?.data
            )
          ) {
            rawHotels =
              scrappaData.data;

          } else if (
            Array.isArray(
              scrappaData?.results
            )
          ) {
            rawHotels =
              scrappaData.results;

          } else if (
            Array.isArray(
              scrappaData?.hotels
            )
          ) {
            rawHotels =
              scrappaData.hotels;
          }

          hotels =
            normalizeHotels(
              rawHotels
            );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status:
              hotels.length > 0
                ? "completed"
                : "no_results",

            count:
              hotels.length,

            creditsCharged:
              Number(
                scrappaData?.creditsCharged ??
                scrappaData?.meta?.creditsCharged ??
                scrappaData?.usage?.credits ??
                1
              ),

            source:
              "Scrappa Google Hotels",

            provider:
              "Scrappa"
          };

          console.log(
            "SCRAPPA HOTELS FOUND:",
            hotels.length
          );

          console.log(
            "NORMALIZED HOTEL SAMPLE:",
            JSON.stringify(
              hotels[0] || null
            ).slice(0, 2000)
          );
        } else {
          const errorMessage =
            scrappaData?.error?.message ||
            scrappaData?.message ||
            scrappaData?.error ||
            "Scrappa hotel search failed.";

          const errorCode =
            scrappaData?.error?.code ||
            scrappaData?.code ||
            `http_${scrappaResponse.status}`;

          console.error(
            "SCRAPPA REQUEST FAILED:",
            JSON.stringify(
              scrappaData
            )
          );

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status: "error",

            count: 0,

            error: {
              code:
                errorCode,

              message:
                typeof errorMessage === "string"
                  ? errorMessage
                  : "Scrappa hotel search failed.",

              status:
                scrappaResponse.status,

              retryable:
                scrappaResponse.status >= 500
            }
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

        status: "date_required",

        message:
          "A valid YYYY-MM-DD start date is required for live hotel search."
      };
    }

    // =========================================================
    // FINAL HOTEL SAFETY
    // =========================================================

    hotels =
      normalizeHotels(
        hotels
      );

    hotelSearch.count =
      hotels.length;

    // =========================================================
    // FINAL LOGS
    // =========================================================

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
      "HOTEL PROVIDER:",
      hotelSearch.provider
    );

    console.log(
      "RESTAURANTS RETURNED:",
      restaurants.length
    );

    console.log(
      "RESTAURANT SEARCH STATUS:",
      restaurantSearch.status
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

  } catch (error) {
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

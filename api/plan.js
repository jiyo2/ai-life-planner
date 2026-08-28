console.log("PLAN.JS PRODUCTION V11 SCRAPPA RUNNING");

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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const date = new Date(`${value}T00:00:00Z`);

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

    const validStart = isValidDateString(start);

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
        error: "Gemini request failed",
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
      plan =
        JSON.parse(cleanText);
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

    const accommodation =
      Math.max(
        0,
        Number(
          plan.budget.accommodation || 0
        )
      );

    const transportation =
      Math.max(
        0,
        Number(
          plan.budget.transportation || 0
        )
      );

    const food =
      Math.max(
        0,
        Number(
          plan.budget.food || 0
        )
      );

    const activities =
      Math.max(
        0,
        Number(
          plan.budget.activities || 0
        )
      );

    const other =
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

    // =========================================================
    // PROTECT USER BUDGET
    // =========================================================

    if (calculatedTotal > budget) {
      console.warn(
        "AI BUDGET EXCEEDED USER BUDGET:",
        calculatedTotal,
        budget
      );

      const ratio =
        budget / calculatedTotal;

      plan.budget.accommodation =
        Math.floor(
          accommodation * ratio
        );

      plan.budget.transportation =
        Math.floor(
          transportation * ratio
        );

      plan.budget.food =
        Math.floor(
          food * ratio
        );

      plan.budget.activities =
        Math.floor(
          activities * ratio
        );

      plan.budget.other =
        Math.max(
          0,
          budget -
            plan.budget.accommodation -
            plan.budget.transportation -
            plan.budget.food -
            plan.budget.activities
        );

      calculatedTotal =
        plan.budget.accommodation +
        plan.budget.transportation +
        plan.budget.food +
        plan.budget.activities +
        plan.budget.other;
    }

    plan.budget.accommodation =
      Number(
        plan.budget.accommodation || 0
      );

    plan.budget.transportation =
      Number(
        plan.budget.transportation || 0
      );

    plan.budget.food =
      Number(
        plan.budget.food || 0
      );

    plan.budget.activities =
      Number(
        plan.budget.activities || 0
      );

    plan.budget.other =
      Number(
        plan.budget.other || 0
      );

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
            day: index + 1,

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
    // HOTEL SEARCH — SCRAPPA GOOGLE HOTELS
    // =========================================================

    let hotels = [];

    let hotelSearch = {
      enabled: false,

      status: "not_searched",

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
        "Google Hotels"
      ],

      creditsCharged: 0,

      count: 0
    };

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
            typeof hotel.name === "string"
              ? hotel.name.trim()
              : typeof hotel.title === "string"
                ? hotel.title.trim()
                : "";

          if (!name) {
            return null;
          }

          // Google Hotels / Scrappa can expose
          // pricing in different nested structures.
          let price = null;

          if (hotel.price != null) {
            price = hotel.price;
          }

          if (
            price == null &&
            hotel.price_per_night != null
          ) {
            price = hotel.price_per_night;
          }

          if (
            price == null &&
            hotel.pricePerNight != null
          ) {
            price = hotel.pricePerNight;
          }

          if (
            price == null &&
            hotel.total_price != null
          ) {
            price = hotel.total_price;
          }

          if (
            price == null &&
            hotel.totalPrice != null
          ) {
            price = hotel.totalPrice;
          }

          // Some responses contain booking options.
          if (
            price == null &&
            Array.isArray(hotel.booking_options) &&
            hotel.booking_options.length > 0
          ) {
            price =
              hotel.booking_options[0]?.price ||
              hotel.booking_options[0]?.price_text ||
              null;
          }

          if (
            price == null &&
            Array.isArray(hotel.bookingOptions) &&
            hotel.bookingOptions.length > 0
          ) {
            price =
              hotel.bookingOptions[0]?.price ||
              hotel.bookingOptions[0]?.priceText ||
              null;
          }

          let url =
            hotel.url ||
            hotel.link ||
            hotel.google_url ||
            hotel.googleUrl ||
            null;

          let location =
            hotel.location ||
            hotel.address ||
            hotel.neighborhood ||
            null;

          let starRating =
            hotel.star_rating ??
            hotel.starRating ??
            hotel.stars ??
            null;

          let guestRating =
            hotel.guest_rating ??
            hotel.guestRating ??
            hotel.rating ??
            null;

          let reviewCount =
            hotel.review_count ??
            hotel.reviewCount ??
            hotel.reviews ??
            null;

          let amenities =
            Array.isArray(hotel.amenities)
              ? hotel.amenities
              : [];

          // Booking options / platforms
          let bookingOptions = [];

          if (
            Array.isArray(
              hotel.booking_options
            )
          ) {
            bookingOptions =
              hotel.booking_options;
          }

          if (
            Array.isArray(
              hotel.bookingOptions
            )
          ) {
            bookingOptions =
              hotel.bookingOptions;
          }

          return {
            id:
              hotel.id ||
              hotel.property_id ||
              hotel.propertyId ||
              `hotel-${index}-${Math.random()
                .toString(36)
                .slice(2, 8)}`,

            platform:
              "Google Hotels",

            platformListingId:
              hotel.property_id ||
              hotel.propertyId ||
              null,

            name,

            propertyType:
              hotel.property_type ||
              hotel.propertyType ||
              null,

            url,

            location,

            starRating,

            guestRating,

            ratingScale:
              hotel.rating_scale ||
              hotel.ratingScale ||
              5,

            reviewCount,

            amenities,

            price,

            bookingOptions
          };
        })
        .filter(Boolean)
        .slice(0, 10);
    }

    // =========================================================
    // START SCRAPPA HOTEL SEARCH
    // =========================================================

    if (validStart) {
      console.log(
        "STARTING SCRAPPA GOOGLE HOTELS SEARCH..."
      );

      const params =
        new URLSearchParams();

      // Required by Scrappa
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

      // Optional
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

      // Turkey / Google localization
      params.set(
        "gl",
        "tr"
      );

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

          count: 0,

          error: {
            code:
              "connection_error",

            message:
              "Unable to connect to Scrappa hotel search.",

            retryable: true
          }
        };
      }

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

            count: 0,

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
          ).slice(0, 4000)
        );

        // =====================================================
        // SUCCESS
        // =====================================================

        if (scrappaResponse.ok) {
          // Scrappa Google Hotels docs use
          // { properties: [...] }
          const rawProperties =
            Array.isArray(
              scrappaData?.properties
            )
              ? scrappaData.properties
              : Array.isArray(
                  scrappaData?.data?.properties
                )
                ? scrappaData.data.properties
                : Array.isArray(
                    scrappaData?.data
                  )
                  ? scrappaData.data
                  : [];

          hotels =
            normalizeHotels(
              rawProperties
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

            creditsCharged: 1,

            source:
              "Scrappa Google Hotels",

            live:
              true
          };

          console.log(
            "SCRAPPA HOTELS FOUND:",
            hotels.length
          );
        }

        // =====================================================
        // ERROR
        // =====================================================

        else {
          console.error(
            "SCRAPPA REQUEST FAILED:",
            JSON.stringify(
              scrappaData
            )
          );

          const status =
            scrappaResponse.status;

          let errorMessage =
            "Scrappa hotel search failed.";

          if (status === 401) {
            errorMessage =
              "Scrappa API key is invalid or missing.";
          }

          if (status === 403) {
            errorMessage =
              "Scrappa API access was denied.";
          }

          if (status === 429) {
            errorMessage =
              "Scrappa request limit was reached.";
          }

          if (status >= 500) {
            errorMessage =
              "Scrappa hotel service is temporarily unavailable.";
          }

          hotelSearch = {
            ...hotelSearch,

            enabled: true,

            status: "error",

            count: 0,

            error: {
              code:
                scrappaData?.code ||
                scrappaData?.error?.code ||
                `http_${status}`,

              message:
                scrappaData?.message ||
                scrappaData?.error?.message ||
                errorMessage,

              retryable:
                status >= 500 ||
                status === 429
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

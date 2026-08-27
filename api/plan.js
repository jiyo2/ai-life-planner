console.log("PLAN.JS PRODUCTION V10 RUNNING");

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
    const rawStayingApiKey = process.env.STAYINGAPI_KEY;

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
        error: "GEMINI_API_KEY is missing in Vercel"
      });
    }

    if (!rawStayingApiKey) {
      return res.status(500).json({
        error: "STAYINGAPI_KEY is missing in Vercel"
      });
    }

    const geminiKey = String(rawGeminiKey).trim();
    const stayingApiKey = String(rawStayingApiKey).trim();

    if (!geminiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is empty"
      });
    }

    if (!stayingApiKey) {
      return res.status(500).json({
        error: "STAYINGAPI_KEY is empty"
      });
    }

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

    function isValidDateString(value) {
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

    console.log(
      "CALLING GEMINI..."
    );

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    let geminiResponse;

    try {
      geminiResponse =
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
    } catch (error) {
      console.error(
        "GEMINI FETCH ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Unable to connect to Gemini",
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

    // =========================================================
    // DEFAULT ARRAYS
    // =========================================================

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

      plan.budget.accommodation =
        Math.floor(
          accommodation *
            ratio
        );

      plan.budget.transportation =
        Math.floor(
          transportation *
            ratio
        );

      plan.budget.food =
        Math.floor(
          food *
            ratio
        );

      plan.budget.activities =
        Math.floor(
          activities *
            ratio
        );

      plan.budget.other =
        Math.max(
          0,
          budget -
            plan.budget
              .accommodation -
            plan.budget
              .transportation -
            plan.budget
              .food -
            plan.budget
              .activities
        );

      calculatedTotal =
        plan.budget
          .accommodation +
        plan.budget
          .transportation +
        plan.budget
          .food +
        plan.budget
          .activities +
        plan.budget
          .other;
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
                  "string" &&
                day.title.trim()
                  ? day.title.trim()
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
    // HOTEL SEARCH
    // =========================================================

    let hotels = [];

    let hotelSearch = {
      enabled:
        false,

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

      creditsCharged:
        0,

      count:
        0
    };

    // =========================================================
    // HOTEL NORMALIZER
    // =========================================================

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
          hotel => {

            if (
              !hotel ||
              typeof hotel !==
                "object"
            ) {
              return null;
            }

            const normalized = {
              id:
                hotel?.id ||
                null,

              platform:
                hotel?.platform ||
                null,

              platformListingId:
                hotel?.platformListingId ||
                null,

              name:
                typeof hotel?.name ===
                  "string"
                  ? hotel.name.trim()
                  : "Unnamed property",

              propertyType:
                hotel?.propertyType ||
                null,

              url:
                hotel?.url ||
                null,

              location:
                hotel?.location ||
                null,

              starRating:
                hotel?.starRating ??
                null,

              guestRating:
                hotel?.guestRating ??
                null,

              ratingScale:
                hotel?.ratingScale ??
                null,

              reviewCount:
                hotel?.reviewCount ??
                null,

              amenities:
                Array.isArray(
                  hotel?.amenities
                )
                  ? hotel.amenities
                  : [],

              price:
                hotel?.price ||
                null
            };

            if (
              !normalized.name ||
              !normalized.price
            ) {
              return null;
            }

            return normalized;
          }
        )
        .filter(Boolean)
        .slice(0, 10);
    }

    // =========================================================
    // STAYINGAPI ERROR PARSER
    // =========================================================

    function getStayingApiError(
      data,
      status
    ) {
      const errorObject =
        data?.error;

      const errorCode =
        errorObject?.code ||
        null;

      const errorType =
        errorObject?.type ||
        null;

      const errorMessage =
        errorObject?.message ||
        data?.message ||
        (
          typeof errorObject ===
          "string"
            ? errorObject
            : null
        ) ||
        "Hotel search failed";

      return {
        type:
          errorType,

        code:
          errorCode,

        message:
          errorMessage,

        status,

        retryable:
          Boolean(
            errorObject?.retryable
          ),

        requestId:
          errorObject?.requestId ||
          null,

        creditsCharged:
          Number(
            errorObject?.creditsCharged ||
            data?.meta?.creditsCharged ||
            0
          ),

        docUrl:
          errorObject?.docUrl ||
          null
      };
    }

    // =========================================================
    // STAYINGAPI JOB POLLING
    // =========================================================

    async function pollStayingJob(
      jobId,
      apiKey
    ) {
      const maxWaitMs =
        150000;

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
                  Authorization:
                    `Bearer ${apiKey}`,

                  Accept:
                    "application/json"
                }
              }
            );
        } catch (error) {
          console.error(
            "STAYINGAPI JOB FETCH ERROR:",
            error
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
        } catch (error) {
          throw new Error(
            "StayingAPI returned invalid job response"
          );
        }

        const jobStatus =
          jobData?.data?.status ||
          jobData?.status ||
          "";

        console.log(
          "STAYINGAPI JOB STATE:",
          jobStatus ||
            "unknown"
        );

        if (
          !jobResponse.ok
        ) {
          const parsedError =
            getStayingApiError(
              jobData,
              jobResponse.status
            );

          throw new Error(
            parsedError.message
          );
        }

        if (
          jobStatus ===
          "completed"
        ) {
          console.log(
            "STAYINGAPI JOB COMPLETED"
          );

          const result =
            jobData?.data?.result;

          if (
            Array.isArray(
              result
            )
          ) {
            return {
              data:
                result,

              meta:
                jobData?.meta ||
                {}
            };
          }

          if (
            Array.isArray(
              result?.data
            )
          ) {
            return {
              data:
                result.data,

              meta:
                result.meta ||
                jobData?.meta ||
                {}
            };
          }

          return {
            data: [],

            meta:
              jobData?.meta ||
              {}
          };
        }

        if (
          jobStatus ===
            "failed" ||
          jobStatus ===
            "error"
        ) {
          const parsedError =
            getStayingApiError(
              jobData,
              jobResponse.status
            );

          throw new Error(
            parsedError.message
          );
        }

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
        timeout:
          true,

        data: [],

        meta: {}
      };
    }

    // =========================================================
    // START REAL HOTEL SEARCH
    // =========================================================

    if (validStart) {

      console.log(
        "STARTING STAYINGAPI HOTEL SEARCH..."
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
      );

      let stayingResponse;

      try {

        stayingResponse =
          await fetch(
            stayingURL,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${stayingApiKey}`,

                Accept:
                  "application/json"
              }
            }
          );

      } catch (error) {

        console.error(
          "STAYINGAPI SEARCH FETCH ERROR:",
          error
        );

        hotelSearch = {
          ...hotelSearch,

          enabled:
            true,

          status:
            "error",

          error:
            {
              code:
                "connection_error",

              message:
                "Unable to connect to the live hotel search service.",

              retryable:
                true
            }
        };
      }

      // =======================================================
      // PROCESS STAYINGAPI RESPONSE
      // =======================================================

      if (stayingResponse) {

        console.log(
          "STAYINGAPI STATUS:",
          stayingResponse.status
        );

        let stayingData = {};

        try {

          stayingData =
            await stayingResponse.json();

        } catch (error) {

          console.error(
            "STAYINGAPI JSON ERROR:",
            error
          );

          hotelSearch = {
            ...hotelSearch,

            enabled:
              true,

            status:
              "error",

            error:
              {
                code:
                  "invalid_response",

                message:
                  "StayingAPI returned an invalid response.",

                retryable:
                  true
              }
          };
        }

        console.log(
          "STAYINGAPI RESPONSE PREVIEW:",
          JSON.stringify(
            stayingData
          ).slice(
            0,
            2000
          )
        );

        // =====================================================
        // ASYNC JOB
        // =====================================================

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

            enabled:
              true,

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

              hotelSearch = {
                ...hotelSearch,

                status:
                  "processing",

                count:
                  0,

                message:
                  "Hotel search is still processing."
              };

            } else {

              hotels =
                normalizeHotels(
                  jobResult.data
                );

              hotelSearch = {
                ...hotelSearch,

                enabled:
                  true,

                status:
                  hotels.length > 0
                    ? "completed"
                    : "no_results",

                count:
                  hotels.length,

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
                    ? jobResult.meta
                        .warnings
                    : []
              };

              console.log(
                "HOTELS FOUND AFTER POLLING:",
                hotels.length
              );
            }

          } catch (error) {

            console.error(
              "STAYINGAPI POLLING ERROR:",
              error
            );

            hotelSearch = {
              ...hotelSearch,

              enabled:
                true,

              status:
                "error",

              count:
                0,

              error:
                {
                  code:
                    "job_failed",

                  message:
                    error?.message ||
                    "StayingAPI hotel search job failed.",

                  retryable:
                    false
                }
            };
          }
        }

        // =====================================================
        // SYNCHRONOUS SUCCESS
        // =====================================================

        else if (
          stayingResponse.ok &&
          Array.isArray(
            stayingData?.data
          )
        ) {

          hotels =
            normalizeHotels(
              stayingData.data
            );

          hotelSearch = {
            ...hotelSearch,

            enabled:
              true,

            status:
              hotels.length > 0
                ? "completed"
                : "no_results",

            count:
              hotels.length,

            creditsCharged:
              Number(
                stayingData?.meta
                  ?.creditsCharged ||
                0
              ),

            partial:
              Boolean(
                stayingData?.meta
                  ?.partial
              ),

            warnings:
              Array.isArray(
                stayingData?.meta
                  ?.warnings
              )
                ? stayingData.meta
                    .warnings
                : []
          };

          console.log(
            "HOTELS FOUND:",
            hotels.length
          );
        }

        // =====================================================
        // STAYINGAPI ERROR
        // =====================================================

        else if (
          !stayingResponse.ok
        ) {

          const parsedError =
            getStayingApiError(
              stayingData,
              stayingResponse.status
            );

          console.error(
            "STAYINGAPI REQUEST FAILED:",
            JSON.stringify(
              stayingData
            )
          );

          // Special handling for actor_blocked.
          if (
            parsedError.code ===
            "actor_blocked"
          ) {

            hotelSearch = {
              ...hotelSearch,

              enabled:
                true,

              status:
                "provider_blocked",

              count:
                0,

              error:
                {
                  type:
                    parsedError.type,

                  code:
                    parsedError.code,

                  message:
                    "Live hotel search is temporarily unavailable because the upstream provider has reached its free-tier limit.",

                  retryable:
                    false,

                  creditsCharged:
                    parsedError.creditsCharged,

                  requestId:
                    parsedError.requestId,

                  docUrl:
                    parsedError.docUrl
                }
            };

            console.warn(
              "STAYINGAPI PROVIDER BLOCKED:",
              parsedError.message
            );
          }

          else {

            hotelSearch = {
              ...hotelSearch,

              enabled:
                true,

              status:
                "error",

              count:
                0,

              error:
                parsedError
            };
          }
        }
      }

    } else {

      console.log(
        "HOTEL SEARCH SKIPPED:",
        "Valid YYYY-MM-DD start date is required"
      );

      hotelSearch = {
        ...hotelSearch,

        enabled:
          false,

        status:
          "date_required",

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

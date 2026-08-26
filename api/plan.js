console.log("PLAN.JS PRODUCTION V5 RUNNING");

export default async function handler(req, res) {
  console.log("PLAN API START");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // =========================================
    // API KEYS
    // =========================================

    const rawGeminiKey = process.env.GEMINI_API_KEY;
    const rawStayingApiKey = process.env.STAYINGAPI_KEY;

    console.log("GEMINI KEY EXISTS:", Boolean(rawGeminiKey));
    console.log("GEMINI KEY TYPE:", typeof rawGeminiKey);
    console.log("GEMINI KEY LENGTH:", rawGeminiKey ? rawGeminiKey.length : 0);
    console.log(
      "GEMINI KEY HAS ELLIPSIS:",
      rawGeminiKey ? rawGeminiKey.includes("…") : false
    );
    console.log(
      "GEMINI KEY HAS SPACES:",
      rawGeminiKey ? /\s/.test(rawGeminiKey) : false
    );

    console.log(
      "STAYINGAPI KEY EXISTS:",
      Boolean(rawStayingApiKey)
    );
    console.log(
      "STAYINGAPI KEY TYPE:",
      typeof rawStayingApiKey
    );
    console.log(
      "STAYINGAPI KEY LENGTH:",
      rawStayingApiKey ? rawStayingApiKey.length : 0
    );
    console.log(
      "STAYINGAPI KEY HAS ELLIPSIS:",
      rawStayingApiKey
        ? rawStayingApiKey.includes("…")
        : false
    );
    console.log(
      "STAYINGAPI KEY HAS SPACES:",
      rawStayingApiKey
        ? /\s/.test(rawStayingApiKey)
        : false
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

    // =========================================
    // CLEAN API KEYS
    // =========================================

    const geminiKey = String(rawGeminiKey).trim();
    const stayingApiKey = String(rawStayingApiKey).trim();

    // Reject typographic ellipsis.
    // This prevents ByteString errors caused by "…".
    if (geminiKey.includes("…")) {
      console.error(
        "INVALID GEMINI KEY: TYPOGRAPHIC ELLIPSIS FOUND"
      );

      return res.status(500).json({
        error:
          "GEMINI_API_KEY contains an invalid ellipsis character"
      });
    }

    if (stayingApiKey.includes("…")) {
      console.error(
        "INVALID STAYINGAPI KEY: TYPOGRAPHIC ELLIPSIS FOUND"
      );

      return res.status(500).json({
        error:
          "STAYINGAPI_KEY contains an invalid ellipsis character"
      });
    }

    // =========================================
    // TRIP DATA
    // =========================================

    const body = req.body || {};

    const destination =
      typeof body.destination === "string"
        ? body.destination.trim()
        : "";

    const start =
      typeof body.start === "string" &&
      body.start.trim()
        ? body.start.trim()
        : "";

    const days = Number(body.days);
    const budget = Number(body.budget);

    const travelers =
      typeof body.travelers === "string"
        ? body.travelers.trim()
        : "1 traveler";

    const interests = Array.isArray(body.interests)
      ? body.interests
          .filter(
            (item) =>
              typeof item === "string"
          )
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    console.log("TRIP:", {
      destination,
      start,
      days,
      budget,
      travelers,
      interests
    });

    // =========================================
    // VALIDATION
    // =========================================

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

    // =========================================
    // TRAVELER PARSING
    // =========================================

    function extractAdults(value) {
      const text =
        String(value || "").toLowerCase();

      const match =
        text.match(/(\d+)/);

      if (match) {
        const number =
          Number(match[1]);

        if (
          Number.isFinite(number) &&
          number >= 1
        ) {
          return Math.min(number, 20);
        }
      }

      return 1;
    }

    const adults =
      extractAdults(travelers);

    console.log("ADULTS:", adults);

    // =========================================
    // DATE HELPERS
    // =========================================

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
      isValidDateString(start);

    const checkOut =
      validStart
        ? addDays(start, days)
        : "";

    console.log("HOTEL DATES:", {
      checkIn: validStart
        ? start
        : "none",

      checkOut: validStart
        ? checkOut
        : "none"
    });

    // =========================================
    // INTERESTS
    // =========================================

    const interestText =
      interests.length > 0
        ? interests.join(", ")
        : "General sightseeing, local food and culture";

    // =========================================
    // GEMINI PROMPT
    // =========================================

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

Do not use Markdown.

Return ONLY valid JSON.

REQUIRED JSON

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

Verify:

1. Exactly ${days} days.

2. Sequential day numbers.

3. All five budget categories are numbers.

4. Calculate the budget total.

5. total <= ${budget}.

6. No negative budget values.

7. No null budget values.

8. Return JSON only.
`;

    // =========================================
    // GEMINI REQUEST
    // =========================================

    console.log("CALLING GEMINI...");

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    const geminiResponse =
      await fetch(
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
              temperature: 0.35,
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
        JSON.stringify(geminiData)
      );

      return res.status(500).json({
        error: "Gemini request failed",
        geminiStatus:
          geminiResponse.status,
        details: geminiData
      });
    }

    const parts =
      geminiData?.candidates?.[0]
        ?.content?.parts || [];

    const text =
      parts
        .map(
          (part) =>
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

    // =========================================
    // CLEAN JSON
    // =========================================

    let cleanText =
      text.trim();

    if (
      cleanText.startsWith("```")
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

    // =========================================
    // PARSE PLAN
    // =========================================

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

    // =========================================
    // DEFAULT SECTIONS
    // =========================================

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
      typeof plan.stay !== "object"
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
      !Array.isArray(plan.days)
    ) {
      plan.days = [];
    }

    // =========================================
    // DEFAULT ARRAYS
    // =========================================

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

    // =========================================
    // DEFAULT STRINGS
    // =========================================

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

    // =========================================
    // NORMALIZE BUDGET
    // =========================================

    const accommodation =
      Math.max(
        0,
        Number(
          plan.budget
            .accommodation || 0
        )
      );

    const transportation =
      Math.max(
        0,
        Number(
          plan.budget
            .transportation || 0
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
        Math.round(
          accommodation * ratio
        );

      plan.budget.transportation =
        Math.round(
          transportation * ratio
        );

      plan.budget.food =
        Math.round(
          food * ratio
        );

      plan.budget.activities =
        Math.round(
          activities * ratio
        );

      plan.budget.other =
        Math.max(
          0,
          budget -
            plan.budget
              .accommodation -
            plan.budget
              .transportation -
            plan.budget.food -
            plan.budget
              .activities
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
        plan.budget.accommodation
      );

    plan.budget.transportation =
      Number(
        plan.budget.transportation
      );

    plan.budget.food =
      Number(
        plan.budget.food
      );

    plan.budget.activities =
      Number(
        plan.budget.activities
      );

    plan.budget.other =
      Number(
        plan.budget.other
      );

    plan.budget.total =
      Number(calculatedTotal);

    // =========================================
    // NORMALIZE DAYS
    // =========================================

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
      plan.days.length !== days
    ) {
      return res.status(500).json({
        error:
          "AI returned an incorrect number of itinerary days",
        expectedDays: days,
        returnedDays:
          plan.days.length
      });
    }

    // =========================================
    // HOTEL SEARCH
    // =========================================

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
        "booking",
        "google"
      ],
      creditsCharged: 0
    };

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
        "5"
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

      const stayingResponse =
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

      console.log(
        "STAYINGAPI STATUS:",
        stayingResponse.status
      );

      const stayingData =
        await stayingResponse.json();

      // =========================================
      // ASYNC JOB
      // =========================================

      if (
        stayingResponse.status ===
          202 &&
        stayingData?.data?.jobId
      ) {
        console.log(
          "STAYINGAPI ASYNC JOB:",
          stayingData.data.jobId
        );

        hotelSearch = {
          ...hotelSearch,

          enabled: true,
          status: "processing",
          jobId:
            stayingData.data.jobId
        };
      }

      // =========================================
      // SYNCHRONOUS RESULT
      // =========================================

      else if (
        stayingResponse.ok &&
        Array.isArray(
          stayingData?.data
        )
      ) {
        hotels =
          stayingData.data
            .map(
              (hotel) => ({
                id:
                  hotel?.id ||
                  null,

                platform:
                  hotel?.platform ||
                  null,

                name:
                  hotel?.name ||
                  "Unnamed property",

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
              })
            )
            .filter(
              (hotel) =>
                hotel.name &&
                hotel.price
            )
            .slice(0, 10);

        hotelSearch = {
          ...hotelSearch,

          enabled: true,
          status: "completed",

          creditsCharged:
            Number(
              stayingData?.meta
                ?.creditsCharged || 0
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

        console.log(
          "STAYINGAPI CREDITS:",
          hotelSearch
            .creditsCharged
        );
      }

      // =========================================
      // STAYING API ERROR
      // =========================================

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
          status: "error",

          error:
            stayingData?.error ||
            stayingData?.message ||
            "Hotel search failed"
        };
      }
    } else {
      console.log(
        "HOTEL SEARCH SKIPPED:",
        "Valid YYYY-MM-DD start date is required"
      );
    }

    // =========================================
    // SUCCESS
    // =========================================

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
      "HOTEL SEARCH STATUS:",
      hotelSearch.status
    );

    return res.status(200).json({
      plan,
      hotels,
      hotelSearch
    });

  } catch (error) {
    console.error(
      "SERVER ERROR:",
      error
    );

    return res.status(500).json({
      error: "Server error",
      message:
        error?.message ||
        "Unknown error"
    });
  }
  }

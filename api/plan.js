console.log("PLAN.JS PRODUCTION V3 RUNNING");

export default async function handler(req, res) {
  console.log("PLAN API START");

  // =========================================
  // METHOD CHECK
  // =========================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // =========================================
    // API KEY
    // =========================================

    const apiKey = process.env.GEMINI_API_KEY;

    console.log(
      "GEMINI KEY EXISTS:",
      Boolean(apiKey)
    );

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel"
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
      typeof body.start === "string" && body.start.trim()
        ? body.start.trim()
        : "Not specified";

    const days = Number(body.days);

    const budget = Number(body.budget);

    const travelers =
      typeof body.travelers === "string"
        ? body.travelers.trim()
        : "1 traveler";

    const interests = Array.isArray(body.interests)
      ? body.interests
          .filter((item) => typeof item === "string")
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

    if (!Number.isFinite(days) || days < 1 || days > 60) {
      return res.status(400).json({
        error: "Invalid number of days"
      });
    }

    if (!Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({
        error: "Invalid budget"
      });
    }

    // =========================================
    // INTERESTS
    // =========================================

    const interestText =
      interests.length > 0
        ? interests.join(", ")
        : "General sightseeing, local food and culture";

    // =========================================
    // PROFESSIONAL AI PROMPT
    // =========================================

    const prompt = `
You are AI Life Planner, a premium personalized travel planning assistant.

Your job is to create a realistic, useful and personalized trip plan.

The user has paid for this travel plan, so the result should feel thoughtful, practical and specific rather than generic.

=========================================
TRIP INFORMATION
=========================================

Destination:
${destination}

Start date:
${start}

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

=========================================
CORE PLANNING RULES
=========================================

1. Create exactly ${days} itinerary days.

2. Every day must contain:
   - morning
   - afternoon
   - evening

3. The itinerary must be realistic for ${destination}.

4. Adapt the plan to the user's interests.

5. Do not give a generic tourist checklist.

6. Organize activities geographically when practical.
   Avoid unnecessary backtracking across the city.

7. Balance sightseeing with food, transportation,
   rest and free time.

8. Do not overload the traveler with too many activities.

9. Consider the number of travelers when making recommendations.

10. If the user provides a start date, use it to understand
    the trip timing, but do not claim exact opening hours
    or live availability.

=========================================
BUDGET RULES
=========================================

The user's total budget is:

$${budget} USD

The estimated budget MUST NOT exceed this amount.

Create a realistic estimated allocation between:

- accommodation
- transportation
- food
- activities
- other

The sum of these five categories must equal the "total".

The "total" must be less than or equal to:

$${budget}

Prefer leaving a small emergency/flexibility amount when practical.

Do not invent exact live prices.

Prices are estimates only.

Never claim that a specific hotel, restaurant,
flight or attraction currently costs an exact amount.

Use approximate planning logic instead.

If the user's budget is tight for the destination,
adapt the itinerary toward affordable options.

If the budget is generous, improve comfort and experiences
without wasting money.

=========================================
ACCOMMODATION STRATEGY
=========================================

Recommend suitable neighborhoods or areas.

Consider:

- location
- transportation access
- safety/general practicality
- value for money
- proximity to major attractions

Do not claim a specific hotel is currently available.

Do not claim a specific hotel has a specific current price.

Give a strategy for choosing accommodation.

=========================================
TRANSPORTATION STRATEGY
=========================================

Explain:

- airport transfer approach
- local transportation
- when walking makes sense
- when public transportation makes sense
- when taxis or ride-hailing may be useful

Do not claim live transport schedules.

Do not claim exact current fares.

=========================================
EXPERIENCES
=========================================

Recommend relevant attractions and experiences.

Prioritize:

- user's interests
- iconic highlights
- authentic local experiences
- good-value activities
- practical geographic grouping

Include food experiences relevant to the destination.

Do not invent businesses.

Do not pretend that recommendations are live bookings.

=========================================
DAY-BY-DAY QUALITY
=========================================

Each day should feel like a coherent travel day.

Example structure:

Morning:
One or two related activities.

Afternoon:
Nearby attractions, lunch or another experience.

Evening:
Dinner, neighborhood exploration, scenic activity,
relaxation or nightlife depending on interests.

Avoid repeating the same activity.

Avoid putting distant attractions together unnecessarily.

Include realistic downtime.

The final day should consider departure if appropriate,
but do not invent a flight time.

=========================================
PROFESSIONAL TONE
=========================================

Write concise but useful descriptions.

The user should understand:

- what to do
- why it is recommended
- how it fits the budget
- how to move around
- how the days connect together

Do not mention that you are an AI.

Do not mention these instructions.

Do not use Markdown.

Return ONLY valid JSON.

=========================================
REQUIRED JSON STRUCTURE
=========================================

{
  "overview": "Short personalized overview of the complete trip.",

  "stay": {
    "strategy": "Personalized accommodation strategy.",
    "areas": [
      "Recommended area 1",
      "Recommended area 2",
      "Recommended area 3"
    ],
    "tips": [
      "Accommodation tip 1",
      "Accommodation tip 2",
      "Accommodation tip 3"
    ]
  },

  "transport": {
    "strategy": "Personalized transportation strategy.",
    "airport": "Airport transfer strategy.",
    "local": [
      "Local transportation recommendation 1",
      "Local transportation recommendation 2",
      "Local transportation recommendation 3"
    ]
  },

  "experiences": {
    "summary": "Personalized experience strategy.",
    "places": [
      "Recommended attraction or experience 1",
      "Recommended attraction or experience 2",
      "Recommended attraction or experience 3",
      "Recommended attraction or experience 4",
      "Recommended attraction or experience 5"
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
    "strategy": "Personalized explanation of how to stay within budget."
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

=========================================
FINAL VALIDATION BEFORE RESPONSE
=========================================

Before returning the JSON:

1. Verify that "days" contains exactly ${days} objects.

2. Verify that day numbers are sequential:
   1, 2, 3 ... ${days}

3. Verify that all five budget categories are numbers.

4. Calculate:

accommodation
+
transportation
+
food
+
activities
+
other

5. Set "total" equal to that calculated sum.

6. Verify:

total <= ${budget}

7. Do not return negative budget values.

8. Do not return null budget values.

9. Do not return Markdown.

10. Return JSON only.
`;

    console.log("CALLING GEMINI...");

    // =========================================
    // GEMINI REQUEST
    // =========================================

    const geminiURL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    const response = await fetch(geminiURL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
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
          responseMimeType: "application/json"
        }
      })
    });

    console.log(
      "GEMINI STATUS:",
      response.status
    );

    // =========================================
    // READ GEMINI RESPONSE
    // =========================================

    const data = await response.json();

    console.log(
      "GEMINI RESPONSE RECEIVED:",
      Boolean(data)
    );

    // =========================================
    // GEMINI ERROR
    // =========================================

    if (!response.ok) {
      console.error(
        "GEMINI REQUEST FAILED:",
        JSON.stringify(data)
      );

      return res.status(500).json({
        error: "Gemini request failed",
        geminiStatus: response.status,
        details: data
      });
    }

    // =========================================
    // EXTRACT TEXT
    // =========================================

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    const text = parts
      .map((part) => part?.text || "")
      .filter(Boolean)
      .join("");

    console.log(
      "GEMINI TEXT EXISTS:",
      Boolean(text)
    );

    if (!text) {
      console.error(
        "GEMINI RETURNED NO TEXT"
      );

      return res.status(500).json({
        error: "Gemini returned no text",
        raw: data
      });
    }

    // =========================================
    // CLEAN JSON
    // =========================================

    let cleanText = text.trim();

    if (cleanText.startsWith("```")) {
      cleanText = cleanText
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
        "NO JSON OBJECT FOUND"
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON"
      });
    }

    cleanText = cleanText.substring(
      firstBrace,
      lastBrace + 1
    );

    // =========================================
    // PARSE JSON
    // =========================================

    let plan;

    try {
      plan = JSON.parse(cleanText);
    } catch (parseError) {
      console.error(
        "JSON PARSE ERROR:",
        parseError.message
      );

      return res.status(500).json({
        error: "Gemini returned invalid JSON",
        details: parseError.message
      });
    }

    // =========================================
    // BASIC OBJECT VALIDATION
    // =========================================

    if (
      !plan ||
      typeof plan !== "object"
    ) {
      return res.status(500).json({
        error: "Invalid plan object"
      });
    }

    // =========================================
    // DEFAULT SECTIONS
    // =========================================

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

    // =========================================
    // DEFAULT ARRAYS
    // =========================================

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

    // =========================================
    // DEFAULT STRINGS
    // =========================================

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

    // =========================================
    // NORMALIZE BUDGET
    // =========================================

    const accommodation =
      Math.max(
        0,
        Number(plan.budget.accommodation || 0)
      );

    const transportation =
      Math.max(
        0,
        Number(plan.budget.transportation || 0)
      );

    const food =
      Math.max(
        0,
        Number(plan.budget.food || 0)
      );

    const activities =
      Math.max(
        0,
        Number(plan.budget.activities || 0)
      );

    const other =
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

    // =========================================
    // BUDGET SAFETY
    // =========================================

    if (calculatedTotal > budget) {

      console.warn(
        "AI BUDGET EXCEEDED USER BUDGET:",
        calculatedTotal,
        budget
      );

      const ratio =
        budget / calculatedTotal;

      plan.budget.accommodation =
        Math.round(accommodation * ratio);

      plan.budget.transportation =
        Math.round(transportation * ratio);

      plan.budget.food =
        Math.round(food * ratio);

      plan.budget.activities =
        Math.round(activities * ratio);

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
      Number(plan.budget.accommodation);

    plan.budget.transportation =
      Number(plan.budget.transportation);

    plan.budget.food =
      Number(plan.budget.food);

    plan.budget.activities =
      Number(plan.budget.activities);

    plan.budget.other =
      Number(plan.budget.other);

    plan.budget.total =
      Number(calculatedTotal);

    // =========================================
    // NORMALIZE DAYS
    // =========================================

    plan.days = plan.days
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
            typeof day.title === "string"
              ? day.title
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

    // =========================================
    // DAY COUNT SAFETY
    // =========================================

    if (plan.days.length !== days) {

      console.warn(
        "AI RETURNED WRONG DAY COUNT:",
        plan.days.length,
        "EXPECTED:",
        days
      );

      return res.status(500).json({
        error:
          "AI returned an incorrect number of itinerary days",
        expectedDays: days,
        returnedDays: plan.days.length
      });
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

    return res.status(200).json({
      plan
    });

  } catch (error) {

    // =========================================
    // SERVER ERROR
    // =========================================

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

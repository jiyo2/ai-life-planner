const $ = (id) => document.getElementById(id);

let trip = null;
let currentPlan = null;

/* =========================================================
AI LIFE PLANNER — APP.JS
Compatible with /api/plan
========================================================= */

console.log("APP.JS PRODUCTION V11 RUNNING");

/* =========================================================
DYNAMIC STYLES
========================================================= */

(function injectPlannerStyles() {
if (document.getElementById("aiPlannerDynamicStyles")) return;

const style = document.createElement("style");
style.id = "aiPlannerDynamicStyles";

style.textContent = `
/* =====================================================
INTEREST CHIPS
===================================================== */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.chip {
  cursor: pointer !important;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto !important;
  position: relative;
  z-index: 5;

  border: 1px solid rgba(0,0,0,.12);
  background: #fff;
  color: #222;

  padding: 10px 15px;
  border-radius: 999px;

  font-size: 14px;
  font-weight: 600;

  transition:
    transform .15s ease,
    background .15s ease,
    color .15s ease,
    border-color .15s ease,
    box-shadow .15s ease;
}

.chip:hover {
  transform: translateY(-1px);
}

.chip:active {
  transform: scale(.97);
}

.chip.selected,
.chip.active {
  background: #111;
  color: #fff;
  border-color: #111;
  box-shadow: 0 4px 14px rgba(0,0,0,.15);
}


/* =====================================================
   PLAN SECTIONS
===================================================== */

.plan-section {
  display: none;
}

.plan-section.active {
  display: block;
}

.plan-tab {
  cursor: pointer;
}

.plan-tab.active {
  font-weight: 700;
}


/* =====================================================
   HOTEL CARDS
===================================================== */

.hotels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.hotel-card {
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 18px rgba(0,0,0,.06);
}

.hotel-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
  background: #eee;
}

.hotel-image-placeholder {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f3f3;
  font-size: 42px;
}

.hotel-body {
  padding: 16px;
}

.hotel-name {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 7px;
}

.hotel-meta {
  font-size: 13px;
  color: #666;
  margin: 5px 0;
}

.hotel-price {
  font-size: 17px;
  font-weight: 700;
  margin-top: 10px;
}

.hotel-button {
  display: inline-block;
  margin-top: 12px;
  padding: 9px 13px;
  border-radius: 10px;
  background: #111;
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}


/* =====================================================
   RESTAURANT CARDS
===================================================== */

.restaurants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 15px;
  margin-top: 18px;
}

.restaurant-card {
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 16px;
  padding: 16px;
  background: #fff;
  box-shadow: 0 3px 14px rgba(0,0,0,.05);
}

.restaurant-name {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 7px;
}

.restaurant-meta {
  color: #666;
  font-size: 13px;
  margin: 4px 0;
}

.restaurant-description {
  margin-top: 10px;
  line-height: 1.5;
  font-size: 14px;
}

.restaurant-button {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 9px;
  background: #111;
  color: #fff;
  text-decoration: none;
  font-size: 13px;
}


/* =====================================================
   BUDGET
===================================================== */

.budget-box {
  display: grid;
  gap: 10px;
  margin-top: 15px;
}

.budget-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7f7f7;
}

.budget-total {
  font-weight: 800;
  font-size: 18px;
}


/* =====================================================
   DAY CARDS
===================================================== */

.days-container {
  display: grid;
  gap: 15px;
}

.day {
  border: 1px solid rgba(0,0,0,.10);
  border-radius: 16px;
  padding: 18px;
  background: #fff;
}

.day h3 {
  margin-top: 0;
}

.day-part {
  margin-top: 13px;
}

.day-part strong {
  display: block;
  margin-bottom: 4px;
}


/* =====================================================
   STATUS
===================================================== */

.planner-status {
  padding: 15px;
  border-radius: 12px;
  background: #f5f5f5;
  margin-top: 15px;
}

.planner-error {
  padding: 15px;
  border-radius: 12px;
  background: #fff0f0;
  color: #a40000;
  margin-top: 15px;
  line-height: 1.5;
}


/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 600px) {

  .chips {
    gap: 8px;
  }

  .chip {
    padding: 9px 12px;
    font-size: 13px;
  }

  .hotels-grid,
  .restaurants-grid {
    grid-template-columns: 1fr;
  }

  .hotel-card,
  .restaurant-card {
    width: 100%;
  }

  .plan-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .plan-tab {
    flex: 0 0 auto;
  }
}

`;

document.head.appendChild(style);
})();

/* =========================================================
HELPERS
========================================================= */

function escapeHTML(value) {
if (value === null || value === undefined) {
return "";
}

return String(value)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function formatUSD(value) {
const number = Number(value);

if (!Number.isFinite(number)) {
return "$0";
}

return "$" + number.toLocaleString("en-US");
}

function showElement(id) {
const element = $(id);

if (!element) return;

element.classList.remove("hidden");

element.style.display = "";
}

function hideElement(id) {
const element = $(id);

if (!element) return;

element.classList.add("hidden");
}

function setText(id, text) {
const element = $(id);

if (!element) return;

element.textContent =
text === null || text === undefined
? ""
: String(text);
}

/* =========================================================
INTEREST CHIPS
========================================================= */

function setupInterestChips() {
const chips = document.querySelectorAll(".chip");

console.log(
"INTEREST CHIPS FOUND:",
chips.length
);

chips.forEach((chip) => {

/*
 * Remove any possible duplicate handler
 * by cloning the button.
 */

const cleanChip = chip.cloneNode(true);

chip.replaceWith(cleanChip);

cleanChip.addEventListener(
  "click",
  function (event) {

    event.preventDefault();
    event.stopPropagation();

    this.classList.toggle("selected");
    this.classList.toggle("active");

    console.log(
      "INTEREST CLICKED:",
      this.textContent.trim(),
      "SELECTED:",
      this.classList.contains("selected")
    );
  },
  false
);

/*
 * Extra touch support for mobile.
 */

cleanChip.addEventListener(
  "touchend",
  function (event) {
    event.preventDefault();
  },
  {
    passive: false
  }
);

});
}

/* =========================================================
READ SELECTED INTERESTS
========================================================= */

function getSelectedInterests() {

const selected =
document.querySelectorAll(
".chip.selected, .chip.active"
);

const interests = [];

selected.forEach((chip) => {

let text =
  chip.textContent
    .replace(/^[^\p{L}\p{N}]*/u, "")
    .trim();

/*
 * Remove emoji from beginning where possible.
 */

text = text
  .replace(
    /^[^\p{L}\p{N}]*/u,
    ""
  )
  .trim();

if (text) {
  interests.push(text);
}

});

return [
...new Set(interests)
];
}

/* =========================================================
FORM DATA
========================================================= */

function collectTripData() {

const destination =
$("destination")?.value.trim() || "";

const start =
$("startDate")?.value || "";

const days =
Number($("days")?.value || 0);

const budget =
Number($("budget")?.value || 0);

const travelers =
$("travelers")?.value ||
"1 traveler";

const notes =
$("notes")?.value.trim() || "";

const interests =
getSelectedInterests();

return {
destination,
start,
days,
budget,
travelers,
interests,
notes
};
}

/* =========================================================
REVIEW
========================================================= */

function createReviewSummary(data) {

const summary = $("summary");

if (!summary) return;

const interests =
data.interests.length
? data.interests.join(", ")
: "General sightseeing";

summary.innerHTML = `
<div class="planner-status">

  <p>
    <strong>Destination:</strong>
    ${escapeHTML(data.destination)}
  </p>

  <p>
    <strong>Start date:</strong>
    ${escapeHTML(data.start || "Not specified")}
  </p>

  <p>
    <strong>Days:</strong>
    ${escapeHTML(data.days)}
  </p>

  <p>
    <strong>Budget:</strong>
    ${formatUSD(data.budget)}
  </p>

  <p>
    <strong>Travelers:</strong>
    ${escapeHTML(data.travelers)}
  </p>

  <p>
    <strong>Interests:</strong>
    ${escapeHTML(interests)}
  </p>

  ${
    data.notes
      ? `
        <p>
          <strong>Notes:</strong>
          ${escapeHTML(data.notes)}
        </p>
      `
      : ""
  }

</div>

`;
}

/* =========================================================
SHOW REVIEW
========================================================= */

function showReview() {

if (!trip) {
trip = collectTripData();
}

createReviewSummary(trip);

hideElement("app");
showElement("review");
hideElement("plan");
}

/* =========================================================
EDIT
========================================================= */

function closeReview() {

hideElement("review");
showElement("app");
hideElement("plan");
}

/* =========================================================
PLAN NAVIGATION
========================================================= */

function setupPlanTabs() {

const tabs =
document.querySelectorAll(
".plan-tab"
);

console.log(
"PLAN TABS FOUND:",
tabs.length
);

tabs.forEach((tab) => {

tab.addEventListener(
  "click",
  function (event) {

    event.preventDefault();

    const target =
      this.dataset.planSection;

    if (!target) return;

    tabs.forEach((item) => {
      item.classList.remove("active");
    });

    this.classList.add("active");

    const sections =
      document.querySelectorAll(
        ".plan-section"
      );

    sections.forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection =
      $(`${target}Section`);

    if (targetSection) {
      targetSection.classList.add("active");
    }

  },
  false
);

});
}

/* =========================================================
ACTIVATE DEFAULT PLAN SECTION
========================================================= */

function activateDefaultPlanSection() {

const sections =
document.querySelectorAll(
".plan-section"
);

sections.forEach((section) => {
section.classList.remove("active");
});

const stay =
$("staySection");

if (stay) {
stay.classList.add("active");
}

const tabs =
document.querySelectorAll(
".plan-tab"
);

tabs.forEach((tab) => {
tab.classList.remove("active");
});

const firstTab =
document.querySelector(
'.plan-tab[data-plan-section="stay"]'
);

if (firstTab) {
firstTab.classList.add("active");
}
}

/* =========================================================
CREATE PLAN
========================================================= */

async function createPlan() {

if (!trip) {
trip = collectTripData();
}

console.log(
"CREATING PLAN WITH:",
trip
);

/*

* Basic client validation.
  */

if (!trip.destination) {
alert("Please enter a destination.");
return;
}

if (
!Number.isFinite(trip.days) ||
trip.days < 1
) {
alert("Please enter a valid number of days.");
return;
}

if (
!Number.isFinite(trip.budget) ||
trip.budget <= 0
) {
alert("Please enter a valid budget.");
return;
}

/*

* Show plan screen immediately.
  */

hideElement("review");
hideElement("app");
showElement("plan");

activateDefaultPlanSection();

setText(
"planTitle",
"Creating your ${trip.destination} travel plan..."
);

setText(
"planIntro",
"Our AI is building your personalized itinerary. Please wait a moment."
);

setText(
"stay",
"Generating accommodation strategy..."
);

setText(
"transport",
"Generating transportation strategy..."
);

setText(
"experiences",
"Generating experiences..."
);

setText(
"money",
"Calculating your budget..."
);

const daysOut =
$("daysOut");

if (daysOut) {
daysOut.innerHTML = "<div class="day"> <b>AI Travel Planner</b> <p> Creating your personalized day-by-day itinerary... </p> </div>";
}

try {

console.log(
  "POST /api/plan"
);

const response =
  await fetch(
    "/api/plan",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "Accept":
          "application/json"
      },

      body:
        JSON.stringify({
          destination:
            trip.destination,

          start:
            trip.start,

          days:
            trip.days,

          budget:
            trip.budget,

          travelers:
            trip.travelers,

          interests:
            trip.interests,

          notes:
            trip.notes
        })
    }
  );

console.log(
  "PLAN API STATUS:",
  response.status
);

let data = {};

try {
  data =
    await response.json();
} catch (jsonError) {

  console.error(
    "PLAN JSON ERROR:",
    jsonError
  );

  throw new Error(
    "The server returned an invalid response."
  );
}

console.log(
  "PLAN API RESPONSE:",
  data
);

if (!response.ok) {

  const serverMessage =
    data?.error ||
    data?.message ||
    "Unable to create your AI travel plan.";

  throw new Error(
    serverMessage
  );
}

if (
  !data ||
  typeof data !== "object"
) {
  throw new Error(
    "The server returned an empty plan."
  );
}

if (
  !data.plan ||
  typeof data.plan !== "object"
) {
  throw new Error(
    "The AI plan data was not returned."
  );
}

currentPlan =
  data.plan;

/*
 * Store live hotel/restaurant data.
 */

currentPlan.hotels =
  Array.isArray(data.hotels)
    ? data.hotels
    : [];

currentPlan.hotelSearch =
  data.hotelSearch ||
  {};

currentPlan.restaurants =
  Array.isArray(data.restaurants)
    ? data.restaurants
    : [];

currentPlan.restaurantSearch =
  data.restaurantSearch ||
  {};

console.log(
  "PLAN RECEIVED:",
  currentPlan
);

renderPlan(currentPlan);

} catch (error) {

console.error(
  "CREATE PLAN ERROR:",
  error
);

showPlanError(
  error?.message ||
  "We could not create your AI travel plan. Please try again."
);

}
}

/* =========================================================
SHOW PLAN ERROR
========================================================= */

function showPlanError(message) {

setText(
"planTitle",
"Something went wrong"
);

setText(
"planIntro",
"We could not create your AI travel plan. Please try again."
);

const html = "<div class="planner-error"> ${escapeHTML(message)} </div>";

setHTML("stay", html);
setHTML("transport", "");
setHTML("experiences", "");
setHTML("money", "");

const daysOut =
$("daysOut");

if (daysOut) {
daysOut.innerHTML = html;
}
}

/* =========================================================
SET HTML
========================================================= */

function setHTML(id, html) {

const element = $(id);

if (!element) return;

element.innerHTML =
html || "";
}

/* =========================================================
RENDER PLAN
========================================================= */

function renderPlan(plan) {

console.log(
"RENDERING PLAN..."
);

setText(
"planTitle",
"${trip.destination} — Your Personalized Travel Plan"
);

setText(
"planIntro",
plan.overview ||
"A personalized ${trip.destination} travel plan based on your budget and interests."
);

/* =======================================================
STAY
======================================================= */

renderStay(plan);

/* =======================================================
TRANSPORT
======================================================= */

renderTransport(plan);

/* =======================================================
EXPERIENCES
======================================================= */

renderExperiences(plan);

/* =======================================================
BUDGET
======================================================= */

renderBudget(plan);

/* =======================================================
DAYS
======================================================= */

renderDays(plan);

/*

* Make sure Stay is visible initially.
  */

activateDefaultPlanSection();

console.log(
"PLAN RENDER COMPLETE"
);
}

/* =========================================================
RENDER STAY
========================================================= */

function renderStay(plan) {

const stay =
plan.stay ||
{};

const areas =
Array.isArray(stay.areas)
? stay.areas
: [];

const tips =
Array.isArray(stay.tips)
? stay.tips
: [];

const hotels =
Array.isArray(plan.hotels)
? plan.hotels
: [];

let html = "";

if (stay.strategy) {

html += `
  <div class="planner-status">
    ${escapeHTML(stay.strategy)}
  </div>
`;

}

if (areas.length) {

html += `
  <h3>Recommended Areas</h3>

  <ul>
    ${areas.map(area => `
      <li>
        ${escapeHTML(area)}
      </li>
    `).join("")}
  </ul>
`;

}

if (tips.length) {

html += `
  <h3>Accommodation Tips</h3>

  <ul>
    ${tips.map(tip => `
      <li>
        ${escapeHTML(tip)}
      </li>
    `).join("")}
  </ul>
`;

}

/*

* LIVE HOTELS
  */

html += "<h3 style="margin-top:25px;"> 🏨 Live Hotel Options </h3>";

if (hotels.length) {

html += `
  <div class="hotels-grid">
    ${hotels.map(renderHotelCard).join("")}
  </div>
`;

} else {

const status =
  plan.hotelSearch?.status ||
  "no_results";

if (status === "date_required") {

  html += `
    <div class="planner-status">
      Select a valid start date to search live hotel options.
    </div>
  `;

} else if (status === "error") {

  html += `
    <div class="planner-status">
      Live hotel search is temporarily unavailable.
      Your AI accommodation strategy is still available above.
    </div>
  `;

} else {

  html += `
    <div class="planner-status">
      No live hotel options were returned for these dates.
      Your AI accommodation strategy is still available above.
    </div>
  `;
}

}

setHTML(
"stay",
html ||
"Accommodation strategy unavailable."
);
}

/* =========================================================
HOTEL CARD
========================================================= */

function renderHotelCard(hotel) {

const name =
hotel.name ||
"Hotel";

const location =
hotel.location ||
"";

const propertyType =
hotel.propertyType ||
"Hotel";

const guestRating =
hotel.guestRating;

const starRating =
hotel.starRating;

const price =
hotel.price;

const currency =
hotel.currency ||
"USD";

const image =
hotel.image ||
null;

const url =
hotel.url ||
null;

let ratingHTML = "";

if (
guestRating !== null &&
guestRating !== undefined &&
guestRating !== ""
) {

ratingHTML += `
  <div class="hotel-meta">
    ⭐ Guest rating:
    ${escapeHTML(guestRating)}
  </div>
`;

}

if (
starRating !== null &&
starRating !== undefined &&
starRating !== ""
) {

ratingHTML += `
  <div class="hotel-meta">
    ${escapeHTML(starRating)} star property
  </div>
`;

}

let priceHTML = "";

if (
price !== null &&
price !== undefined &&
price !== ""
) {

priceHTML = `
  <div class="hotel-price">
    ${escapeHTML(price)}
    ${escapeHTML(currency)}
  </div>
`;

}

let imageHTML = "<div class="hotel-image-placeholder"> 🏨 </div>";

if (image) {

imageHTML = `
  <img
    class="hotel-image"
    src="${escapeHTML(image)}"
    alt="${escapeHTML(name)}"
    loading="lazy"
    onerror="this.style.display='none'"
  >
`;

}

let buttonHTML = "";

if (url) {

buttonHTML = `
  <a
    class="hotel-button"
    href="${escapeHTML(url)}"
    target="_blank"
    rel="noopener noreferrer"
  >
    View Hotel
  </a>
`;

}

return `
<article class="hotel-card">

  ${imageHTML}

  <div class="hotel-body">

    <div class="hotel-name">
      ${escapeHTML(name)}
    </div>

    <div class="hotel-meta">
      ${escapeHTML(propertyType)}
    </div>

    ${
      location
        ? `
          <div class="hotel-meta">
            📍 ${escapeHTML(location)}
          </div>
        `
        : ""
    }

    ${ratingHTML}

    ${priceHTML}

    ${buttonHTML}

  </div>

</article>

`;
}

/* =========================================================
RENDER TRANSPORT
========================================================= */

function renderTransport(plan) {

const transport =
plan.transport ||
{};

const local =
Array.isArray(transport.local)
? transport.local
: [];

let html = "";

if (transport.strategy) {

html += `
  <div class="planner-status">
    ${escapeHTML(transport.strategy)}
  </div>
`;

}

if (transport.airport) {

html += `
  <h3>Airport Transfer</h3>

  <p>
    ${escapeHTML(transport.airport)}
  </p>
`;

}

if (local.length) {

html += `
  <h3>Local Transportation</h3>

  <ul>
    ${local.map(item => `
      <li>
        ${escapeHTML(item)}
      </li>
    `).join("")}
  </ul>
`;

}

setHTML(
"transport",
html ||
"Transportation strategy unavailable."
);
}

/* =========================================================
RENDER EXPERIENCES
========================================================= */

function renderExperiences(plan) {

const experiences =
plan.experiences ||
{};

const places =
Array.isArray(experiences.places)
? experiences.places
: [];

const food =
Array.isArray(experiences.food)
? experiences.food
: [];

const restaurants =
Array.isArray(plan.restaurants)
? plan.restaurants
: [];

let html = "";

if (experiences.summary) {

html += `
  <div class="planner-status">
    ${escapeHTML(experiences.summary)}
  </div>
`;

}

if (places.length) {

html += `
  <h3>Places & Experiences</h3>

  <ul>
    ${places.map(place => `
      <li>
        ${escapeHTML(place)}
      </li>
    `).join("")}
  </ul>
`;

}

if (food.length) {

html += `
  <h3>Food Experiences</h3>

  <ul>
    ${food.map(item => `
      <li>
        ${escapeHTML(item)}
      </li>
    `).join("")}
  </ul>
`;

}

/*

* RESTAURANTS
  */

html += "<h3 style="margin-top:25px;"> 🍽️ Restaurants </h3>";

if (restaurants.length) {

html += `
  <div class="restaurants-grid">
    ${restaurants
      .map(renderRestaurantCard)
      .join("")}
  </div>
`;

} else {

html += `
  <div class="planner-status">
    No restaurant recommendations were returned.
  </div>
`;

}

setHTML(
"experiences",
html ||
"Experiences unavailable."
);
}

/* =========================================================
RESTAURANT CARD
========================================================= */

function renderRestaurantCard(restaurant) {

const name =
restaurant.name ||
"Restaurant";

const cuisine =
restaurant.cuisine ||
"";

const location =
restaurant.location ||
"";

const priceLevel =
restaurant.priceLevel ||
"$$";

const description =
restaurant.description ||
"";

const url =
restaurant.url ||
"";

return `
<article class="restaurant-card">

  <div class="restaurant-name">
    ${escapeHTML(name)}
  </div>

  ${
    cuisine
      ? `
        <div class="restaurant-meta">
          🍴 ${escapeHTML(cuisine)}
        </div>
      `
      : ""
  }

  ${
    location
      ? `
        <div class="restaurant-meta">
          📍 ${escapeHTML(location)}
        </div>
      `
      : ""
  }

  <div class="restaurant-meta">
    💰 ${escapeHTML(priceLevel)}
  </div>

  ${
    description
      ? `
        <div class="restaurant-description">
          ${escapeHTML(description)}
        </div>
      `
      : ""
  }

  ${
    url
      ? `
        <a
          class="restaurant-button"
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Google Maps
        </a>
      `
      : ""
  }

</article>

`;
}

/* =========================================================
RENDER BUDGET
========================================================= */

function renderBudget(plan) {

const budget =
plan.budget ||
{};

const accommodation =
Number(budget.accommodation || 0);

const transportation =
Number(budget.transportation || 0);

const food =
Number(budget.food || 0);

const activities =
Number(budget.activities || 0);

const other =
Number(budget.other || 0);

const total =
Number(
budget.total ??
(
accommodation +
transportation +
food +
activities +
other
)
);

let html = `
<div class="budget-box">

  <div class="budget-row">
    <span>Accommodation</span>
    <strong>${formatUSD(accommodation)}</strong>
  </div>

  <div class="budget-row">
    <span>Transportation</span>
    <strong>${formatUSD(transportation)}</strong>
  </div>

  <div class="budget-row">
    <span>Food</span>
    <strong>${formatUSD(food)}</strong>
  </div>

  <div class="budget-row">
    <span>Activities</span>
    <strong>${formatUSD(activities)}</strong>
  </div>

  <div class="budget-row">
    <span>Other</span>
    <strong>${formatUSD(other)}</strong>
  </div>

  <div class="budget-row budget-total">
    <span>Total</span>
    <strong>${formatUSD(total)}</strong>
  </div>

</div>

`;

if (budget.strategy) {

html += `
  <div class="planner-status">
    <strong>Strategy:</strong><br>
    ${escapeHTML(budget.strategy)}
  </div>
`;

}

setHTML(
"money",
html
);
}

/* =========================================================
RENDER DAYS
========================================================= */

function renderDays(plan) {

const days =
Array.isArray(plan.days)
? plan.days
: [];

const container =
$("daysOut");

if (!container) return;

if (!days.length) {

container.innerHTML = `
  <div class="day">
    No itinerary days were returned.
  </div>
`;

return;

}

container.innerHTML =
days.map((day, index) => {

  const number =
    day.day ||
    index + 1;

  const title =
    day.title ||
    `Day ${number}`;


  return `
    <article class="day">

      <h3>
        Day ${escapeHTML(number)}
        — ${escapeHTML(title)}
      </h3>

      <div class="day-part">

        <strong>
          🌅 Morning
        </strong>

        <div>
          ${escapeHTML(day.morning || "")}
        </div>

      </div>


      <div class="day-part">

        <strong>
          ☀️ Afternoon
        </strong>

        <div>
          ${escapeHTML(day.afternoon || "")}
        </div>

      </div>


      <div class="day-part">

        <strong>
          🌙 Evening
        </strong>

        <div>
          ${escapeHTML(day.evening || "")}
        </div>

      </div>

    </article>
  `;

}).join("");

}

/* =========================================================
FORM SUBMIT
========================================================= */

function setupForm() {

const form =
$("plannerForm");

if (!form) {

console.error(
  "plannerForm NOT FOUND"
);

return;

}

form.addEventListener(
"submit",
function (event) {

  event.preventDefault();

  console.log(
    "FORM SUBMITTED"
  );

  trip =
    collectTripData();

  console.log(
    "COLLECTED TRIP:",
    trip
  );

  showReview();
}

);
}

/* =========================================================
EDIT BUTTON
========================================================= */

function setupReviewButtons() {

const closeReview =
$("closeReview");

if (closeReview) {

closeReview.addEventListener(
  "click",
  function (event) {

    event.preventDefault();

    closeReviewScreen();
  }
);

}

const pay =
$("pay");

if (pay) {

pay.addEventListener(
  "click",
  async function (event) {

    event.preventDefault();

    /*
     * For now create the plan directly.
     * Paddle can be connected later without
     * breaking the planner.
     */

    await createPlan();
  }
);

}
}

/* =========================================================
CLOSE REVIEW SCREEN
========================================================= */

function closeReviewScreen() {

hideElement("review");
showElement("app");
hideElement("plan");
}

/* =========================================================
INITIALIZE
========================================================= */

function initializeApp() {

console.log(
"INITIALIZING AI LIFE PLANNER..."
);

setupInterestChips();

setupPlanTabs();

setupForm();

setupReviewButtons();

console.log(
"AI LIFE PLANNER READY"
);

console.log(
"Clickable interests:",
getSelectedInterests()
);
}

/* =========================================================
DOM READY
========================================================= */

if (
document.readyState ===
"loading"
) {

document.addEventListener(
"DOMContentLoaded",
initializeApp
);

} else {

initializeApp();
}

const $ = (id) => document.getElementById(id);

let trip = null;
let currentPlan = null;
let paddleInitialized = false;
let paymentCompleted = false;
let planCreationStarted = false;

console.log("AI LIFE PLANNER — PRODUCTION V15");

/* =========================================================
   PADDLE CONFIG
========================================================= */

const PADDLE_CLIENT_TOKEN =
  window.PADDLE_CLIENT_TOKEN || "";

const PADDLE_PRICE_ID =
  window.PADDLE_PRICE_ID || "";

/* =========================================================
   DYNAMIC STYLES
========================================================= */

(function injectPlannerStyles() {

  if (document.getElementById("aiPlannerDynamicStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "aiPlannerDynamicStyles";

  style.textContent = `

    .chips {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:10px;
    }

    .chip {
      cursor:pointer !important;
      pointer-events:auto !important;
      user-select:none;
      -webkit-user-select:none;
      -webkit-tap-highlight-color:transparent;
      position:relative;
      z-index:10;
      border:1px solid rgba(0,0,0,.12);
      background:#fff;
      color:#222;
      padding:10px 15px;
      border-radius:999px;
      font-size:14px;
      font-weight:600;
      transition:.15s ease;
    }

    .chip:hover {
      transform:translateY(-1px);
    }

    .chip:active {
      transform:scale(.97);
    }

    .chip.selected,
    .chip.active {
      background:#111 !important;
      color:#fff !important;
      border-color:#111 !important;
      box-shadow:0 4px 14px rgba(0,0,0,.15);
    }

    .plan-section {
      display:none;
    }

    .plan-section.active {
      display:block;
    }

    .plan-tab {
      cursor:pointer !important;
      pointer-events:auto !important;
      user-select:none;
      -webkit-tap-highlight-color:transparent;
    }

    .plan-tab.active {
      font-weight:700;
    }

    .hotels-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      gap:18px;
      margin-top:18px;
    }

    .hotel-card {
      border:1px solid rgba(0,0,0,.10);
      border-radius:18px;
      overflow:hidden;
      background:#fff;
      box-shadow:0 5px 20px rgba(0,0,0,.07);
      min-width:0;
    }

    .hotel-image-wrapper {
      width:100%;
      height:210px;
      background:#f1f1f1;
      overflow:hidden;
      position:relative;
    }

    .hotel-image {
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
    }

    .hotel-image-placeholder {
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#eee;
      color:#777;
      font-size:14px;
      font-weight:600;
      text-align:center;
      padding:20px;
      box-sizing:border-box;
    }

    .hotel-body {
      padding:16px;
    }

    .hotel-name {
      font-size:18px;
      font-weight:700;
      line-height:1.35;
      margin-bottom:7px;
      color:#111;
    }

    .hotel-meta {
      font-size:13px;
      color:#666;
      margin:6px 0;
      line-height:1.4;
    }

    .hotel-price {
      font-size:18px;
      font-weight:800;
      margin-top:12px;
      color:#111;
    }

    .hotel-price-label {
      font-size:12px;
      color:#777;
      margin-left:3px;
    }

    .hotel-button,
    .restaurant-button {
      display:inline-block;
      margin-top:12px;
      padding:10px 14px;
      border-radius:10px;
      background:#111;
      color:#fff !important;
      text-decoration:none;
      font-size:13px;
      font-weight:700;
    }

    .restaurants-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
      gap:15px;
      margin-top:18px;
    }

    .restaurant-card {
      border:1px solid rgba(0,0,0,.10);
      border-radius:16px;
      padding:16px;
      background:#fff;
      box-shadow:0 3px 14px rgba(0,0,0,.05);
    }

    .restaurant-name {
      font-size:17px;
      font-weight:700;
      margin-bottom:7px;
    }

    .restaurant-meta {
      color:#666;
      font-size:13px;
      margin:4px 0;
    }

    .restaurant-description {
      margin-top:10px;
      line-height:1.5;
      font-size:14px;
    }

    .budget-box {
      display:grid;
      gap:10px;
      margin-top:15px;
    }

    .budget-row {
      display:flex;
      justify-content:space-between;
      gap:20px;
      padding:12px 14px;
      border-radius:10px;
      background:#f7f7f7;
    }

    .budget-total {
      font-weight:800;
      font-size:18px;
    }

    .days-container {
      display:grid;
      gap:15px;
    }

    .day {
      border:1px solid rgba(0,0,0,.10);
      border-radius:16px;
      padding:18px;
      background:#fff;
    }

    .day h3 {
      margin-top:0;
    }

    .day-part {
      margin-top:13px;
      line-height:1.55;
    }

    .day-part strong {
      display:block;
      margin-bottom:4px;
    }

    .planner-status {
      padding:15px;
      border-radius:12px;
      background:#f5f5f5;
      margin-top:15px;
      line-height:1.55;
    }

    .planner-error {
      padding:15px;
      border-radius:12px;
      background:#fff0f0;
      color:#a40000;
      margin-top:15px;
      line-height:1.5;
    }

    @media(max-width:600px) {

      .chips {
        gap:8px;
      }

      .chip {
        padding:9px 12px;
        font-size:13px;
      }

      .hotels-grid,
      .restaurants-grid {
        grid-template-columns:1fr;
      }

      .hotel-image-wrapper {
        height:220px;
      }

      .plan-tabs {
        overflow-x:auto;
        -webkit-overflow-scrolling:touch;
      }

      .plan-tab {
        flex:0 0 auto;
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
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

/* =========================================================
   NUMBER
========================================================= */

function extractNumber(value) {

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {

    const cleaned = value
      .replace(/,/g,"")
      .replace(/[^\d.-]/g,"");

    const number = Number(cleaned);

    return Number.isFinite(number)
      ? number
      : null;
  }

  if (typeof value === "object") {

    const keys = [
      "amount",
      "value",
      "price",
      "total",
      "totalPrice",
      "total_price",
      "perNight",
      "per_night",
      "nightly",
      "nightlyPrice",
      "nightly_price",
      "min",
      "max"
    ];

    for (const key of keys) {

      if (
        value[key] !== null &&
        value[key] !== undefined
      ) {

        const result =
          extractNumber(value[key]);

        if (result !== null) {
          return result;
        }
      }
    }
  }

  return null;
}

/* =========================================================
   USD
========================================================= */

function formatUSD(value) {

  const number = extractNumber(value);

  if (number === null) {
    return "$0";
  }

  return "$" +
    number.toLocaleString("en-US", {
      maximumFractionDigits:2
    });
}

/* =========================================================
   SHOW / HIDE
========================================================= */

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

/* =========================================================
   TEXT / HTML
========================================================= */

function setText(id,text) {

  const element = $(id);

  if (!element) return;

  element.textContent =
    text === null || text === undefined
      ? ""
      : String(text);
}

function setHTML(id,html) {

  const element = $(id);

  if (!element) return;

  element.innerHTML = html || "";
}

/* =========================================================
   DISPLAY VALUE
========================================================= */

function extractDisplayValue(value) {

  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {

    const keys = [
      "formatted",
      "formattedPrice",
      "display",
      "displayValue",
      "text",
      "amount",
      "value",
      "price",
      "total",
      "totalPrice",
      "total_price",
      "perNight",
      "per_night",
      "nightly",
      "nightlyPrice",
      "nightly_price",
      "name",
      "title",
      "label",
      "description"
    ];

    for (const key of keys) {

      if (
        value[key] !== null &&
        value[key] !== undefined
      ) {

        const result =
          extractDisplayValue(value[key]);

        if (result) {
          return result;
        }
      }
    }
  }

  return "";
}

/* =========================================================
   INTEREST CHIPS — FIXED
========================================================= */

function setupInterestChips() {

  const chips =
    document.querySelectorAll(".chip");

  console.log(
    "INTEREST CHIPS FOUND:",
    chips.length
  );

  chips.forEach((chip) => {

    chip.addEventListener("click", function(event) {

      event.preventDefault();
      event.stopPropagation();

      this.classList.toggle("selected");

      console.log(
        "INTEREST:",
        this.textContent.trim(),
        "SELECTED:",
        this.classList.contains("selected")
      );

    });

  });
}

/* =========================================================
   SELECTED INTERESTS
========================================================= */

function getSelectedInterests() {

  const selected =
    document.querySelectorAll(
      ".chip.selected"
    );

  const interests = [];

  selected.forEach((chip) => {

    let text =
      chip.textContent.trim();

    /*
     * Remove leading emoji/icons.
     */

    text =
      text.replace(
        /^[^\p{L}\p{N}]*/u,
        ""
      ).trim();

    if (text) {
      interests.push(text);
    }

  });

  return [...new Set(interests)];
}

/* =========================================================
   FORM DATA
========================================================= */

function collectTripData() {

  return {

    destination:
      $("destination")?.value.trim() || "",

    start:
      $("startDate")?.value || "",

    days:
      Number($("days")?.value || 0),

    budget:
      Number($("budget")?.value || 0),

    travelers:
      $("travelers")?.value || "1 traveler",

    interests:
      getSelectedInterests(),

    notes:
      $("notes")?.value.trim() || ""

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

  `;
}

/* =========================================================
   REVIEW
========================================================= */

function showReview() {

  trip = collectTripData();

  createReviewSummary(trip);

  paymentCompleted = false;
  planCreationStarted = false;

  hideElement("app");
  showElement("review");
  hideElement("plan");
}

function closeReviewScreen() {

  hideElement("review");
  showElement("app");
  hideElement("plan");

}

/* =========================================================
   PADDLE
========================================================= */

function isPaddleReady() {

  return (
    typeof window.Paddle !== "undefined" &&
    window.Paddle &&
    window.Paddle.Checkout &&
    typeof window.Paddle.Checkout.open === "function"
  );
}

function initializePaddle() {

  if (typeof window.Paddle === "undefined") {

    console.error("PADDLE JS NOT FOUND");

    return false;
  }

  if (paddleInitialized) {
    return true;
  }

  if (
    window.__AI_LIFE_PLANNER_PADDLE_INITIALIZED
  ) {

    paddleInitialized = true;

    return true;
  }

  if (!PADDLE_CLIENT_TOKEN) {

    console.error(
      "PADDLE CLIENT TOKEN MISSING"
    );

    return false;
  }

  try {

    window.Paddle.Environment.set(
      "production"
    );

    window.Paddle.Initialize({

      token:PADDLE_CLIENT_TOKEN,

      eventCallback:handlePaddleEvent

    });

    window.__AI_LIFE_PLANNER_PADDLE_INITIALIZED =
      true;

    paddleInitialized = true;

    console.log(
      "PADDLE LIVE INITIALIZED"
    );

    return true;

  } catch(error) {

    console.error(
      "PADDLE INITIALIZATION ERROR:",
      error
    );

    return false;
  }
}

/* =========================================================
   PADDLE EVENT
========================================================= */

function handlePaddleEvent(event) {

  console.log(
    "PADDLE EVENT:",
    event
  );

  if (!event) return;

  if (
    event.name ===
    "checkout.completed"
  ) {

    console.log(
      "PADDLE PAYMENT COMPLETED"
    );

    paymentCompleted = true;

    createPlanAfterPayment(event);

    return;
  }

  if (
    event.name ===
    "checkout.error"
  ) {

    showPaymentError(
      "Payment could not be completed. Please try again."
    );

  }

}

/* =========================================================
   PAYMENT ERROR
========================================================= */

function showPaymentError(message) {

  const review = $("review");

  if (!review) return;

  let box =
    $("paddlePaymentStatus");

  if (!box) {

    box =
      document.createElement("div");

    box.id =
      "paddlePaymentStatus";

    box.className =
      "planner-error";

    review.appendChild(box);
  }

  box.textContent = message;
}

/* =========================================================
   OPEN CHECKOUT
========================================================= */

async function openPaddleCheckout() {

  console.log(
    "OPENING PADDLE LIVE CHECKOUT..."
  );

  if (!PADDLE_PRICE_ID) {

    showPaymentError(
      "Paddle Price ID is missing."
    );

    return;
  }

  trip = collectTripData();

  if (!trip.destination) {

    showPaymentError(
      "Please enter a destination first."
    );

    return;
  }

  if (
    !Number.isFinite(trip.days) ||
    trip.days < 1
  ) {

    showPaymentError(
      "Please enter a valid number of days."
    );

    return;
  }

  if (
    !Number.isFinite(trip.budget) ||
    trip.budget <= 0
  ) {

    showPaymentError(
      "Please enter a valid budget."
    );

    return;
  }

  const initialized =
    initializePaddle();

  if (
    !initialized &&
    !isPaddleReady()
  ) {

    showPaymentError(
      "Payment system is not available right now."
    );

    return;
  }

  if (!isPaddleReady()) {

    await new Promise(
      resolve =>
        setTimeout(resolve,500)
    );
  }

  if (!isPaddleReady()) {

    showPaymentError(
      "Unable to open secure payment checkout."
    );

    return;
  }

  try {

    window.Paddle.Checkout.open({

      items:[
        {
          priceId:PADDLE_PRICE_ID,
          quantity:1
        }
      ],

      customData:{

        destination:trip.destination,
        start:trip.start,
        days:trip.days,
        travelers:trip.travelers,
        budget:trip.budget,
        interests:trip.interests.join(", "),
        notes:trip.notes

      },

      settings:{

        displayMode:"overlay",
        theme:"light",
        locale:"en"

      }

    });

  } catch(error) {

    console.error(
      "PADDLE CHECKOUT ERROR:",
      error
    );

    showPaymentError(
      "Unable to open payment checkout."
    );
  }

}

/* =========================================================
   PLAN TABS — FIXED FOR YOUR INDEX
========================================================= */

function setupPlanTabs() {

  const tabs =
    document.querySelectorAll(".plan-tab");

  console.log(
    "PLAN TABS FOUND:",
    tabs.length
  );

  tabs.forEach((tab) => {

    tab.addEventListener(
      "click",
      function(event) {

        event.preventDefault();
        event.stopPropagation();

        /*
         * Your index.html uses:
         * data-target="staySection"
         * data-target="restaurantsSection"
         */

        const target =
          this.dataset.target;

        if (!target) return;

        document
          .querySelectorAll(".plan-tab")
          .forEach((item) => {
            item.classList.remove("active");
          });

        this.classList.add("active");

        document
          .querySelectorAll(".plan-section")
          .forEach((section) => {
            section.classList.remove("active");
          });

        const targetSection =
          $(target);

        if (targetSection) {

          targetSection.classList.add(
            "active"
          );

        }

      },
      false
    );

  });

}

/* =========================================================
   DEFAULT SECTION
========================================================= */

function activateDefaultPlanSection() {

  document
    .querySelectorAll(".plan-section")
    .forEach((section) => {
      section.classList.remove("active");
    });

  const stay =
    $("staySection");

  if (stay) {
    stay.classList.add("active");
  }

  document
    .querySelectorAll(".plan-tab")
    .forEach((tab) => {
      tab.classList.remove("active");
    });

  const firstTab =
    document.querySelector(
      '.plan-tab[data-target="staySection"]'
    );

  if (firstTab) {
    firstTab.classList.add("active");
  }

}

/* =========================================================
   CREATE PLAN AFTER PAYMENT
========================================================= */

async function createPlanAfterPayment(paddleEvent) {

  if (!paymentCompleted) {

    console.error(
      "PLAN BLOCKED — PAYMENT NOT COMPLETED"
    );

    return;
  }

  if (planCreationStarted) {

    console.log(
      "PLAN CREATION ALREADY STARTED"
    );

    return;
  }

  planCreationStarted = true;

  await createPlan(paddleEvent);

}

/* =========================================================
   CREATE PLAN
========================================================= */

async function createPlan(paddleEvent) {

  if (!paymentCompleted) {

    console.error(
      "BLOCKED — PAYMENT NOT COMPLETED"
    );

    return;
  }

  if (!trip) {
    trip = collectTripData();
  }

  hideElement("review");
  hideElement("app");
  showElement("plan");

  activateDefaultPlanSection();

  setText(
    "planTitle",
    `Creating your ${trip.destination} travel plan...`
  );

  setText(
    "planIntro",
    "Payment successful. Our AI is now building your personalized itinerary."
  );

  setHTML(
    "stayContent",
    "Generating accommodation strategy..."
  );

  setHTML(
    "restaurantsContent",
    "Finding restaurants in your destination..."
  );

  setHTML(
    "transportContent",
    "Generating transportation strategy..."
  );

  setHTML(
    "experiencesContent",
    "Generating curated experiences..."
  );

  setHTML(
    "moneyContent",
    "Calculating your budget..."
  );

  setHTML(
    "daysContent",
    "Structuring your days..."
  );

  try {

    const response =
      await fetch(
        "/api/plan",
        {
          method:"POST",

          headers:{
            "Content-Type":"application/json",
            "Accept":"application/json"
          },

          body:JSON.stringify({

            destination:trip.destination,
            start:trip.start,
            days:trip.days,
            budget:trip.budget,
            travelers:trip.travelers,
            interests:trip.interests,
            notes:trip.notes,

            paymentCompleted:true,

            paddleEvent:paddleEvent || null

          })
        }
      );

    let data = {};

    try {

      data =
        await response.json();

    } catch(error) {

      throw new Error(
        "The server returned an invalid response."
      );

    }

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        "Unable to create your AI travel plan."
      );

    }

    if (
      !data ||
      typeof data !== "object" ||
      !data.plan ||
      typeof data.plan !== "object"
    ) {

      throw new Error(
        "The AI plan data was not returned."
      );

    }

    currentPlan =
      data.plan;

    currentPlan.hotels =
      Array.isArray(data.hotels)
        ? data.hotels
        : [];

    currentPlan.hotelSearch =
      data.hotelSearch || {};

    currentPlan.restaurants =
      Array.isArray(data.restaurants)
        ? data.restaurants
        : [];

    currentPlan.restaurantSearch =
      data.restaurantSearch || {};

    renderPlan(currentPlan);

  } catch(error) {

    console.error(
      "CREATE PLAN ERROR:",
      error
    );

    showPlanError(
      error?.message ||
      "We could not create your AI travel plan."
    );

  }

}

/* =========================================================
   PLAN ERROR
========================================================= */

function showPlanError(message) {

  setText(
    "planTitle",
    "Something went wrong"
  );

  setText(
    "planIntro",
    "Your payment was completed, but we could not create the travel plan."
  );

  const html = `
    <div class="planner-error">
      ${escapeHTML(message)}
    </div>
  `;

  setHTML("stayContent",html);
  setHTML("restaurantsContent","");
  setHTML("transportContent","");
  setHTML("experiencesContent","");
  setHTML("moneyContent","");
  setHTML("daysContent",html);

}

/* =========================================================
   RENDER PLAN
========================================================= */

function renderPlan(plan) {

  setText(
    "planTitle",
    `${trip.destination} — Your Personalized Travel Plan`
  );

  setText(
    "planIntro",
    plan.overview ||
    `A personalized ${trip.destination} travel plan based on your budget and interests.`
  );

  renderStay(plan);
  renderRestaurants(plan);
  renderTransport(plan);
  renderExperiences(plan);
  renderBudget(plan);
  renderDays(plan);

  activateDefaultPlanSection();

}

/* =========================================================
   STAY
========================================================= */

function renderStay(plan) {

  const stay =
    plan.stay || {};

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
            ${escapeHTML(
              extractDisplayValue(area)
            )}
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
            ${escapeHTML(
              extractDisplayValue(tip)
            )}
          </li>
        `).join("")}
      </ul>
    `;
  }

  html += `
    <h3 style="margin-top:25px;">
      Live Hotel Options
    </h3>
  `;

  if (hotels.length) {

    html += `
      <div class="hotels-grid">
        ${hotels.map(renderHotelCard).join("")}
      </div>
    `;

  } else {

    html += `
      <div class="planner-status">
        No live hotel options were returned.
        Your AI accommodation strategy is still available above.
      </div>
    `;
  }

  setHTML(
    "stayContent",
    html ||
    "Accommodation strategy unavailable."
  );

}

/* =========================================================
   HOTEL IMAGE
========================================================= */

function extractHotelImage(hotel) {

  if (!hotel || typeof hotel !== "object") {
    return null;
  }

  const fields = [
    "image",
    "image_url",
    "imageUrl",
    "thumbnail",
    "thumbnail_url",
    "thumbnailUrl",
    "photo",
    "photo_url",
    "photoUrl",
    "main_image",
    "mainImage",
    "cover_image",
    "coverImage",
    "picture",
    "picture_url",
    "pictureUrl",
    "hero_image",
    "heroImage",
    "featured_image",
    "featuredImage"
  ];

  for (const field of fields) {

    const found =
      extractImageValue(hotel[field]);

    if (found) return found;
  }

  return findImageDeep(hotel,0);
}

function extractImageValue(value) {

  if (
    typeof value === "string" &&
    value.trim()
  ) {

    const text = value.trim();

    if (
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("//")
    ) {

      return text.startsWith("//")
        ? "https:" + text
        : text;
    }

    return null;
  }

  if (Array.isArray(value)) {

    for (const item of value) {

      const found =
        extractImageValue(item);

      if (found) return found;
    }
  }

  if (value && typeof value === "object") {

    const keys = [
      "url",
      "src",
      "href",
      "image",
      "image_url",
      "imageUrl",
      "photo",
      "photo_url",
      "photoUrl",
      "thumbnail",
      "thumbnail_url",
      "thumbnailUrl",
      "original",
      "originalUrl",
      "large",
      "largeUrl"
    ];

    for (const key of keys) {

      const found =
        extractImageValue(value[key]);

      if (found) return found;
    }
  }

  return null;
}

function findImageDeep(value,depth) {

  if (
    depth > 5 ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const direct =
    extractImageValue(value);

  if (direct) return direct;

  if (Array.isArray(value)) {

    for (const item of value) {

      const found =
        findImageDeep(item,depth + 1);

      if (found) return found;
    }

    return null;
  }

  if (typeof value === "object") {

    for (const key of Object.keys(value)) {

      const found =
        findImageDeep(
          value[key],
          depth + 1
        );

      if (found) return found;
    }
  }

  return null;
}

/* =========================================================
   HOTEL PRICE
========================================================= */

function extractHotelPrice(hotel) {

  if (!hotel || typeof hotel !== "object") {
    return "";
  }

  const fields = [
    "price",
    "total_price",
    "totalPrice",
    "price_per_night",
    "pricePerNight",
    "rate",
    "rate_per_night",
    "ratePerNight",
    "nightly_price",
    "nightlyPrice",
    "amount",
    "price_value",
    "priceValue",
    "display_price",
    "displayPrice"
  ];

  for (const field of fields) {

    if (
      hotel[field] !== null &&
      hotel[field] !== undefined
    ) {

      const number =
        extractNumber(hotel[field]);

      if (number !== null) {
        return String(
          number.toLocaleString(
            "en-US",
            {
              maximumFractionDigits:2
            }
          )
        );
      }

      const display =
        extractDisplayValue(
          hotel[field]
        );

      if (display) return display;
    }
  }

  return "";
}

function extractHotelCurrency(hotel) {

  if (!hotel || typeof hotel !== "object") {
    return "USD";
  }

  const fields = [
    "currency",
    "currency_code",
    "currencyCode",
    "price_currency",
    "priceCurrency"
  ];

  for (const field of fields) {

    const value = hotel[field];

    if (
      typeof value === "string" &&
      value.trim()
    ) {

      return value.trim();
    }
  }

  if (
    hotel.price &&
    typeof hotel.price === "object"
  ) {

    return (
      hotel.price.currency ||
      hotel.price.currency_code ||
      hotel.price.currencyCode ||
      "USD"
    );
  }

  return "USD";
}

/* =========================================================
   HOTEL CARD
========================================================= */

function renderHotelCard(hotel) {

  const name =
    extractDisplayValue(hotel?.name) ||
    extractDisplayValue(hotel?.title) ||
    extractDisplayValue(hotel?.hotelName) ||
    extractDisplayValue(hotel?.propertyName) ||
    "Hotel";

  const location =
    extractDisplayValue(hotel?.location) ||
    extractDisplayValue(hotel?.address) ||
    extractDisplayValue(hotel?.city) ||
    "";

  const propertyType =
    extractDisplayValue(hotel?.propertyType) ||
    extractDisplayValue(hotel?.property_type) ||
    "Hotel";

  const guestRating =
    extractDisplayValue(hotel?.guestRating) ||
    extractDisplayValue(hotel?.guest_rating) ||
    extractDisplayValue(hotel?.review_score) ||
    extractDisplayValue(hotel?.reviewScore) ||
    "";

  const starRating =
    extractDisplayValue(hotel?.starRating) ||
    extractDisplayValue(hotel?.star_rating) ||
    extractDisplayValue(hotel?.stars) ||
    "";

  const price =
    extractHotelPrice(hotel);

  const currency =
    extractHotelCurrency(hotel);

  const image =
    extractHotelImage(hotel);

  const url =
    extractDisplayValue(hotel?.url) ||
    extractDisplayValue(hotel?.link) ||
    extractDisplayValue(hotel?.property_url) ||
    extractDisplayValue(hotel?.propertyUrl) ||
    "";

  let imageHTML = `
    <div class="hotel-image-wrapper">
      <div class="hotel-image-placeholder">
        Hotel image unavailable
      </div>
    </div>
  `;

  if (image) {

    imageHTML = `
      <div class="hotel-image-wrapper">
        <img
          class="hotel-image"
          src="${escapeHTML(image)}"
          alt="${escapeHTML(name)}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none';"
        >
      </div>
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
                ${escapeHTML(location)}
              </div>
            `
            : ""
        }

        ${
          guestRating
            ? `
              <div class="hotel-meta">
                Guest rating:
                ${escapeHTML(guestRating)}
              </div>
            `
            : ""
        }

        ${
          starRating
            ? `
              <div class="hotel-meta">
                ${escapeHTML(starRating)} star property
              </div>
            `
            : ""
        }

        ${
          price
            ? `
              <div class="hotel-price">
                ${escapeHTML(price)}
                <span class="hotel-price-label">
                  ${escapeHTML(currency)}
                </span>
              </div>
            `
            : ""
        }

        ${
          url
            ? `
              <a
                class="hotel-button"
                href="${escapeHTML(url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Hotel
              </a>
            `
            : ""
        }

      </div>

    </article>
  `;
}

/* =========================================================
   RESTAURANTS SECTION
========================================================= */

function renderRestaurants(plan) {

  const restaurants =
    Array.isArray(plan.restaurants)
      ? plan.restaurants
      : [];

  if (!restaurants.length) {

    setHTML(
      "restaurantsContent",
      `
        <div class="planner-status">
          No restaurant recommendations were returned.
        </div>
      `
    );

    return;
  }

  setHTML(
    "restaurantsContent",
    `
      <div class="restaurants-grid">
        ${restaurants
          .map(renderRestaurantCard)
          .join("")}
      </div>
    `
  );

}

/* =========================================================
   RESTAURANT CARD
========================================================= */

function renderRestaurantCard(restaurant) {

  const name =
    extractDisplayValue(restaurant?.name) ||
    "Restaurant";

  const cuisine =
    extractDisplayValue(restaurant?.cuisine) ||
    "";

  const location =
    extractDisplayValue(restaurant?.location) ||
    "";

  const priceLevel =
    extractDisplayValue(restaurant?.priceLevel) ||
    "$$";

  const description =
    extractDisplayValue(restaurant?.description) ||
    "";

  const url =
    extractDisplayValue(restaurant?.url) ||
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
              ${escapeHTML(cuisine)}
            </div>
          `
          : ""
      }

      ${
        location
          ? `
            <div class="restaurant-meta">
              ${escapeHTML(location)}
            </div>
          `
          : ""
      }

      <div class="restaurant-meta">
        ${escapeHTML(priceLevel)}
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
   TRANSPORT
========================================================= */

function renderTransport(plan) {

  const transport =
    plan.transport || {};

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
            ${escapeHTML(
              extractDisplayValue(item)
            )}
          </li>
        `).join("")}
      </ul>
    `;
  }

  setHTML(
    "transportContent",
    html ||
    "Transportation strategy unavailable."
  );

}

/* =========================================================
   EXPERIENCES
========================================================= */

function renderExperiences(plan) {

  const experiences =
    plan.experiences || {};

  const places =
    Array.isArray(experiences.places)
      ? experiences.places
      : [];

  const food =
    Array.isArray(experiences.food)
      ? experiences.food
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
            ${escapeHTML(
              extractDisplayValue(place)
            )}
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
            ${escapeHTML(
              extractDisplayValue(item)
            )}
          </li>
        `).join("")}
      </ul>
    `;
  }

  setHTML(
    "experiencesContent",
    html ||
    "Experiences unavailable."
  );

}

/* =========================================================
   BUDGET
========================================================= */

function renderBudget(plan) {

  const budget =
    plan.budget || {};

  const accommodation =
    extractNumber(budget.accommodation) || 0;

  const transportation =
    extractNumber(budget.transportation) || 0;

  const food =
    extractNumber(budget.food) || 0;

  const activities =
    extractNumber(budget.activities) || 0;

  const other =
    extractNumber(budget.other) || 0;

  const calculatedTotal =
    accommodation +
    transportation +
    food +
    activities +
    other;

  const suppliedTotal =
    extractNumber(budget.total);

  const total =
    suppliedTotal !== null
      ? suppliedTotal
      : calculatedTotal;

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
    "moneyContent",
    html
  );

}

/* =========================================================
   DAYS
========================================================= */

function renderDays(plan) {

  const days =
    Array.isArray(plan.days)
      ? plan.days
      : [];

  const container =
    $("daysContent");

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
    days.map((day,index) => {

      const number =
        extractDisplayValue(day?.day) ||
        index + 1;

      const title =
        extractDisplayValue(day?.title) ||
        `Day ${number}`;

      return `

        <article class="day">

          <h3>
            Day ${escapeHTML(number)}
            — ${escapeHTML(title)}
          </h3>

          <div class="day-part">

            <strong>Morning</strong>

            <div>
              ${escapeHTML(
                extractDisplayValue(day?.morning)
              )}
            </div>

          </div>

          <div class="day-part">

            <strong>Afternoon</strong>

            <div>
              ${escapeHTML(
                extractDisplayValue(day?.afternoon)
              )}
            </div>

          </div>

          <div class="day-part">

            <strong>Evening</strong>

            <div>
              ${escapeHTML(
                extractDisplayValue(day?.evening)
              )}
            </div>

          </div>

        </article>

      `;

    }).join("");

}

/* =========================================================
   FORM — FIXED
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

  /*
   * IMPORTANT:
   * Do NOT clone/replace the form.
   *
   * Cloning can destroy or interfere
   * with the chip event listeners.
   */

  form.addEventListener(
    "submit",
    function(event) {

      event.preventDefault();
      event.stopPropagation();

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

    },
    false
  );

}

/* =========================================================
   REVIEW BUTTONS
========================================================= */

function setupReviewButtons() {

  const closeButton =
    $("closeReview");

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      function(event) {

        event.preventDefault();
        event.stopPropagation();

        closeReviewScreen();

      },
      false
    );

  }

  const pay =
    $("pay");

  if (pay) {

    pay.addEventListener(
      "click",
      async function(event) {

        event.preventDefault();
        event.stopPropagation();

        console.log(
          "PAY BUTTON CLICKED"
        );

        await openPaddleCheckout();

      },
      false
    );

  }

}

/* =========================================================
   INITIALIZE
========================================================= */

function initializeApp() {

  console.log(
    "INITIALIZING AI LIFE PLANNER V15..."
  );

  /*
   * Order matters:
   *
   * 1. Chips
   * 2. Form
   * 3. Review
   * 4. Tabs
   */

  setupInterestChips();

  setupForm();

  setupReviewButtons();

  setupPlanTabs();

  console.log(
    "AI LIFE PLANNER V15 READY"
  );

  console.log(
    "SELECTED INTERESTS:",
    getSelectedInterests()
  );

}

/* =========================================================
   DOM READY
========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp
  );

} else {

  initializeApp();

}

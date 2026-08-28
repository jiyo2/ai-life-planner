console.log("APP.JS AI LIFE PLANNER V11 RUNNING");

const $ = (id) => document.getElementById(id);

let trip = null;
let currentPlan = null;


/* =========================================================
   GLOBAL HELPERS
========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatMoney(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "$0";
  }

  return "$" + number.toLocaleString("en-US");
}


function safeArray(value) {
  return Array.isArray(value) ? value : [];
}


/* =========================================================
   DYNAMIC UI STYLES
========================================================= */

(function injectPlannerStyles() {
  if (document.getElementById("aiPlannerDynamicStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "aiPlannerDynamicStyles";

  style.textContent = `
    .chip {
      cursor: pointer !important;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
      pointer-events: auto !important;
      transition: all .2s ease;
    }

    .chip.selected {
      transform: translateY(-1px);
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(0,0,0,.12);
      border: 2px solid currentColor;
    }

    .loading-box {
      padding: 24px;
      text-align: center;
      border-radius: 16px;
      background: rgba(0,0,0,.03);
      margin: 12px 0;
    }

    .error-box {
      padding: 20px;
      border-radius: 16px;
      background: #fff0f0;
      color: #9b1c1c;
      margin: 12px 0;
      line-height: 1.6;
    }

    .success-box {
      padding: 18px;
      border-radius: 16px;
      background: #f1fff5;
      margin: 12px 0;
      line-height: 1.6;
    }

    .list-item {
      padding: 12px 0;
      border-bottom: 1px solid rgba(0,0,0,.08);
    }

    .list-item:last-child {
      border-bottom: 0;
    }

    .hotel-grid,
    .restaurant-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-top: 18px;
    }

    .hotel-card,
    .restaurant-card {
      border: 1px solid rgba(0,0,0,.09);
      border-radius: 16px;
      padding: 16px;
      background: #fff;
      box-sizing: border-box;
      min-width: 0;
    }

    .hotel-image {
      width: 100%;
      height: 170px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 12px;
      display: block;
    }

    .hotel-card h3,
    .restaurant-card h3 {
      margin: 0 0 8px;
      overflow-wrap: anywhere;
    }

    .hotel-meta,
    .restaurant-meta {
      font-size: 14px;
      line-height: 1.5;
      opacity: .85;
      margin-bottom: 8px;
    }

    .hotel-price,
    .restaurant-price {
      font-weight: 700;
      margin: 10px 0;
    }

    .result-link {
      display: inline-block;
      margin-top: 8px;
      text-decoration: none;
      font-weight: 700;
    }

    .day {
      margin-bottom: 18px;
    }

    .day h3 {
      margin-bottom: 10px;
    }

    .day-block {
      margin: 8px 0;
      line-height: 1.6;
    }

    .budget-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 16px 0;
    }

    .budget-item {
      padding: 14px;
      border-radius: 14px;
      background: rgba(0,0,0,.035);
    }

    .budget-label {
      font-size: 13px;
      opacity: .7;
      margin-bottom: 4px;
    }

    .budget-value {
      font-size: 20px;
      font-weight: 700;
    }

    .plan-tab {
      cursor: pointer !important;
      touch-action: manipulation;
    }

    .plan-section {
      display: block;
    }

    @media (max-width: 700px) {
      .hotel-grid,
      .restaurant-grid {
        grid-template-columns: 1fr;
      }

      .hotel-image {
        height: 190px;
      }

      .budget-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 430px) {
      .budget-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
})();


/* =========================================================
   INTEREST CHIPS
========================================================= */

function setupInterestChips() {
  const chips = document.querySelectorAll(".chip");

  console.log("INTEREST CHIPS FOUND:", chips.length);

  chips.forEach((chip) => {
    chip.addEventListener("click", function (event) {
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


function getSelectedInterests() {
  const selected = [];

  document
    .querySelectorAll(".chip.selected")
    .forEach((chip) => {
      let text = chip.textContent.trim();

      text = text.replace(
        /^[^\p{L}\p{N}]+/u,
        ""
      );

      if (text) {
        selected.push(text);
      }
    });

  return selected;
}


/* =========================================================
   TRIP DATA
========================================================= */

function collectTripData() {
  const destination =
    $("destination")?.value.trim() || "";

  const start =
    $("startDate")?.value.trim() || "";

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
   VALIDATION
========================================================= */

function validateTrip(data) {
  if (!data.destination) {
    alert("Please enter your destination.");
    return false;
  }

  if (
    !Number.isFinite(data.days) ||
    data.days < 1 ||
    data.days > 60
  ) {
    alert("Please enter a valid number of days.");
    return false;
  }

  if (
    !Number.isFinite(data.budget) ||
    data.budget <= 0
  ) {
    alert("Please enter a valid budget.");
    return false;
  }

  return true;
}


/* =========================================================
   REVIEW
========================================================= */

function showReview(data) {
  const main =
    $("app");

  const review =
    $("review");

  const summary =
    $("summary");

  if (!main || !review || !summary) {
    return;
  }

  summary.innerHTML = `
    <div class="success-box">

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
        ${formatMoney(data.budget)}
      </p>

      <p>
        <strong>Travelers:</strong>
        ${escapeHTML(data.travelers)}
      </p>

      <p>
        <strong>Interests:</strong>
        ${
          data.interests.length
            ? escapeHTML(data.interests.join(", "))
            : "General travel"
        }
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

  main.classList.add("hidden");
  review.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   SHOW PLAN
========================================================= */

function showPlanScreen() {
  const review =
    $("review");

  const plan =
    $("plan");

  if (review) {
    review.classList.add("hidden");
  }

  if (plan) {
    plan.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   LOADING
========================================================= */

function showLoadingState() {
  showPlanScreen();

  const title =
    $("planTitle");

  const intro =
    $("planIntro");

  if (title) {
    title.textContent =
      "Creating your personalized plan...";
  }

  if (intro) {
    intro.textContent =
      "Our AI is building your itinerary and searching for live hotel data. Please wait...";
  }

  if ($("stay")) {
    $("stay").innerHTML =
      `<div class="loading-box">🏨 Searching accommodation strategy...</div>`;
  }

  if ($("transport")) {
    $("transport").innerHTML =
      `<div class="loading-box">🚆 Creating transportation strategy...</div>`;
  }

  if ($("experiences")) {
    $("experiences").innerHTML =
      `<div class="loading-box">📍 Creating experiences...</div>`;
  }

  if ($("money")) {
    $("money").innerHTML =
      `<div class="loading-box">💰 Calculating budget...</div>`;
  }

  if ($("daysOut")) {
    $("daysOut").innerHTML =
      `<div class="loading-box">📅 Creating your day-by-day itinerary...</div>`;
  }
}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function showPlanError(message) {
  showPlanScreen();

  const title =
    $("planTitle");

  const intro =
    $("planIntro");

  if (title) {
    title.textContent =
      "Something went wrong";
  }

  if (intro) {
    intro.textContent =
      "We could not create your AI travel plan. Please try again.";
  }

  const errorHTML = `
    <div class="error-box">
      <strong>Unable to create your travel plan.</strong>
      <br><br>
      ${escapeHTML(message || "Unknown error")}
      <br><br>
      Please check Vercel Runtime Logs if the problem continues.
    </div>
  `;

  if ($("stay")) {
    $("stay").innerHTML = errorHTML;
  }

  if ($("transport")) {
    $("transport").innerHTML = "";
  }

  if ($("experiences")) {
    $("experiences").innerHTML = "";
  }

  if ($("money")) {
    $("money").innerHTML = "";
  }

  if ($("daysOut")) {
    $("daysOut").innerHTML = "";
  }
}


/* =========================================================
   RENDER STAY
========================================================= */

function renderStay(plan) {
  const stay =
    plan?.stay || {};

  const areas =
    safeArray(stay.areas);

  const tips =
    safeArray(stay.tips);

  let html = "";

  if (stay.strategy) {
    html += `
      <p>
        ${escapeHTML(stay.strategy)}
      </p>
    `;
  }

  if (areas.length) {
    html += `
      <h3>Recommended areas</h3>
      <ul>
        ${areas
          .map(
            area =>
              `<li>${escapeHTML(area)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  if (tips.length) {
    html += `
      <h3>Accommodation tips</h3>
      <ul>
        ${tips
          .map(
            tip =>
              `<li>${escapeHTML(tip)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  if (!html) {
    html =
      `<p>No accommodation strategy was returned.</p>`;
  }

  return html;
}


/* =========================================================
   RENDER TRANSPORT
========================================================= */

function renderTransport(plan) {
  const transport =
    plan?.transport || {};

  const local =
    safeArray(transport.local);

  let html = "";

  if (transport.strategy) {
    html += `
      <p>
        ${escapeHTML(transport.strategy)}
      </p>
    `;
  }

  if (transport.airport) {
    html += `
      <h3>Airport transfer</h3>
      <p>
        ${escapeHTML(transport.airport)}
      </p>
    `;
  }

  if (local.length) {
    html += `
      <h3>Local transportation</h3>
      <ul>
        ${local
          .map(
            item =>
              `<li>${escapeHTML(item)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  if (!html) {
    html =
      `<p>No transportation strategy was returned.</p>`;
  }

  return html;
}


/* =========================================================
   RENDER EXPERIENCES
========================================================= */

function renderExperiences(plan) {
  const experiences =
    plan?.experiences || {};

  const places =
    safeArray(experiences.places);

  const food =
    safeArray(experiences.food);

  let html = "";

  if (experiences.summary) {
    html += `
      <p>
        ${escapeHTML(experiences.summary)}
      </p>
    `;
  }

  if (places.length) {
    html += `
      <h3>Places & experiences</h3>
      <ul>
        ${places
          .map(
            place =>
              `<li>${escapeHTML(place)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  if (food.length) {
    html += `
      <h3>Food experiences</h3>
      <ul>
        ${food
          .map(
            item =>
              `<li>${escapeHTML(item)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  if (!html) {
    html =
      `<p>No experiences were returned.</p>`;
  }

  return html;
}


/* =========================================================
   RENDER BUDGET
========================================================= */

function renderBudget(plan) {
  const budget =
    plan?.budget || {};

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
      budget.total ||
      accommodation +
      transportation +
      food +
      activities +
      other
    );

  return `
    <div class="budget-grid">

      <div class="budget-item">
        <div class="budget-label">
          Accommodation
        </div>
        <div class="budget-value">
          ${formatMoney(accommodation)}
        </div>
      </div>

      <div class="budget-item">
        <div class="budget-label">
          Transportation
        </div>
        <div class="budget-value">
          ${formatMoney(transportation)}
        </div>
      </div>

      <div class="budget-item">
        <div class="budget-label">
          Food
        </div>
        <div class="budget-value">
          ${formatMoney(food)}
        </div>
      </div>

      <div class="budget-item">
        <div class="budget-label">
          Activities
        </div>
        <div class="budget-value">
          ${formatMoney(activities)}
        </div>
      </div>

      <div class="budget-item">
        <div class="budget-label">
          Other
        </div>
        <div class="budget-value">
          ${formatMoney(other)}
        </div>
      </div>

      <div class="budget-item">
        <div class="budget-label">
          Total
        </div>
        <div class="budget-value">
          ${formatMoney(total)}
        </div>
      </div>

    </div>

    ${
      budget.strategy
        ? `
          <div class="success-box">
            <strong>Budget strategy</strong>
            <br><br>
            ${escapeHTML(budget.strategy)}
          </div>
        `
        : ""
    }
  `;
}


/* =========================================================
   RENDER DAYS
========================================================= */

function renderDays(plan) {
  const days =
    safeArray(plan?.days);

  if (!days.length) {
    return `
      <div class="error-box">
        No itinerary days were returned.
      </div>
    `;
  }

  return days
    .map((day, index) => {
      const dayNumber =
        Number(day?.day) || index + 1;

      return `
        <div class="day">

          <h3>
            Day ${dayNumber}
            ${
              day?.title
                ? ` — ${escapeHTML(day.title)}`
                : ""
            }
          </h3>

          <div class="day-block">
            <strong>🌅 Morning</strong>
            <br>
            ${escapeHTML(day?.morning || "")}
          </div>

          <div class="day-block">
            <strong>☀️ Afternoon</strong>
            <br>
            ${escapeHTML(day?.afternoon || "")}
          </div>

          <div class="day-block">
            <strong>🌙 Evening</strong>
            <br>
            ${escapeHTML(day?.evening || "")}
          </div>

        </div>
      `;
    })
    .join("");
}


/* =========================================================
   RENDER HOTELS
========================================================= */

function renderHotels(hotels, hotelSearch) {
  if (!Array.isArray(hotels)) {
    hotels = [];
  }

  if (!hotels.length) {
    return `
      <div class="loading-box">
        ${
          hotelSearch?.status === "date_required"
            ? "📅 Add a valid start date to search live hotels."
            : "🏨 No live hotel results were returned."
        }
      </div>
    `;
  }

  return `
    <div class="success-box">
      <strong>
        🏨 Live hotel results
      </strong>
      <br>
      ${hotels.length} accommodation options found.
    </div>

    <div class="hotel-grid">

      ${hotels
        .map((hotel) => {
          const image =
            hotel?.image || "";

          const name =
            hotel?.name || "Hotel";

          const location =
            hotel?.location || "";

          const price =
            hotel?.price ?? null;

          const currency =
            hotel?.currency || "USD";

          const rating =
            hotel?.guestRating ?? null;

          const stars =
            hotel?.starRating ?? null;

          const url =
            hotel?.url || "";

          return `
            <article class="hotel-card">

              ${
                image
                  ? `
                    <img
                      class="hotel-image"
                      src="${escapeHTML(image)}"
                      alt="${escapeHTML(name)}"
                      loading="lazy"
                    >
                  `
                  : ""
              }

              <h3>
                ${escapeHTML(name)}
              </h3>

              ${
                location
                  ? `
                    <div class="hotel-meta">
                      📍 ${escapeHTML(location)}
                    </div>
                  `
                  : ""
              }

              ${
                stars !== null
                  ? `
                    <div class="hotel-meta">
                      ⭐ ${escapeHTML(stars)} stars
                    </div>
                  `
                  : ""
              }

              ${
                rating !== null
                  ? `
                    <div class="hotel-meta">
                      Guest rating:
                      ${escapeHTML(rating)}
                    </div>
                  `
                  : ""
              }

              ${
                price !== null
                  ? `
                    <div class="hotel-price">
                      ${escapeHTML(currency)}
                      ${escapeHTML(price)}
                    </div>
                  `
                  : ""
              }

              ${
                url
                  ? `
                    <a
                      class="result-link"
                      href="${escapeHTML(url)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View hotel
                    </a>
                  `
                  : ""
              }

            </article>
          `;
        })
        .join("")}

    </div>
  `;
}


/* =========================================================
   RENDER RESTAURANTS
========================================================= */

function renderRestaurants(restaurants) {
  if (!Array.isArray(restaurants)) {
    restaurants = [];
  }

  if (!restaurants.length) {
    return "";
  }

  return `
    <div style="margin-top:24px">

      <h3>
        🍽️ Restaurants
      </h3>

      <div class="restaurant-grid">

        ${restaurants
          .map((restaurant) => {
            const name =
              restaurant?.name || "Restaurant";

            const cuisine =
              restaurant?.cuisine || "";

            const location =
              restaurant?.location || "";

            const priceLevel =
              restaurant?.priceLevel || "$$";

            const description =
              restaurant?.description || "";

            const url =
              restaurant?.url || "";

            return `
              <article class="restaurant-card">

                <h3>
                  ${escapeHTML(name)}
                </h3>

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

                <div class="restaurant-price">
                  ${escapeHTML(priceLevel)}
                </div>

                ${
                  description
                    ? `
                      <p>
                        ${escapeHTML(description)}
                      </p>
                    `
                    : ""
                }

                ${
                  url
                    ? `
                      <a
                        class="result-link"
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
          })
          .join("")}

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER COMPLETE PLAN
========================================================= */

function renderPlanResponse(data) {
  console.log(
    "API RESPONSE:",
    data
  );

  if (!data || typeof data !== "object") {
    throw new Error(
      "The server returned an empty response."
    );
  }

  if (data.error) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error)
    );
  }

  if (!data.plan) {
    throw new Error(
      "The server did not return the travel plan."
    );
  }

  currentPlan =
    data.plan;

  const plan =
    data.plan;

  const hotels =
    Array.isArray(data.hotels)
      ? data.hotels
      : [];

  const restaurants =
    Array.isArray(data.restaurants)
      ? data.restaurants
      : [];

  const hotelSearch =
    data.hotelSearch || {};

  const restaurantSearch =
    data.restaurantSearch || {};

  /* -----------------------------------------
     HEADER
  ----------------------------------------- */

  if ($("planTitle")) {
    $("planTitle").textContent =
      `${trip.destination} Travel Plan`;
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      plan.overview ||
      `Your personalized ${trip.destination} travel plan.`;
  }

  /* -----------------------------------------
     STAY
  ----------------------------------------- */

  if ($("stay")) {
    $("stay").innerHTML =
      renderStay(plan);

    if (hotels.length || hotelSearch) {
      $("stay").innerHTML +=
        renderHotels(
          hotels,
          hotelSearch
        );
    }
  }

  /* -----------------------------------------
     TRANSPORT
  ----------------------------------------- */

  if ($("transport")) {
    $("transport").innerHTML =
      renderTransport(plan);
  }

  /* -----------------------------------------
     EXPERIENCES
  ----------------------------------------- */

  if ($("experiences")) {
    $("experiences").innerHTML =
      renderExperiences(plan);

    $("experiences").innerHTML +=
      renderRestaurants(restaurants);
  }

  /* -----------------------------------------
     BUDGET
  ----------------------------------------- */

  if ($("money")) {
    $("money").innerHTML =
      renderBudget(plan);
  }

  /* -----------------------------------------
     DAYS
  ----------------------------------------- */

  if ($("daysOut")) {
    $("daysOut").innerHTML =
      renderDays(plan);
  }

  /* -----------------------------------------
     RESTAURANT STATUS
  ----------------------------------------- */

  console.log(
    "HOTELS:",
    hotels.length,
    hotelSearch.status
  );

  console.log(
    "RESTAURANTS:",
    restaurants.length,
    restaurantSearch.status
  );

  console.log(
    "DAYS:",
    safeArray(plan.days).length
  );

  console.log(
    "PLAN RENDERED SUCCESSFULLY"
  );

  showPlanScreen();
}


/* =========================================================
   CALL PLAN API
========================================================= */

async function createTravelPlan() {
  if (!trip) {
    trip =
      collectTripData();
  }

  showLoadingState();

  console.log(
    "SENDING TRIP TO /api/plan:",
    trip
  );

  try {
    const response =
      await fetch(
        "/api/plan",
        {
          method: "POST",

          headers: {
            "Content-Type":
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

    let data;

    try {
      data =
        await response.json();
    } catch (jsonError) {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    console.log(
      "PLAN API DATA:",
      data
    );

    if (!response.ok) {
      let message =
        data?.error ||
        data?.message ||
        `Server error ${response.status}`;

      if (
        typeof message !== "string"
      ) {
        message =
          JSON.stringify(message);
      }

      throw new Error(message);
    }

    renderPlanResponse(data);

  } catch (error) {
    console.error(
      "CREATE PLAN ERROR:",
      error
    );

    showPlanError(
      error?.message ||
      "Unable to create your travel plan."
    );
  }
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

      const data =
        collectTripData();

      console.log(
        "COLLECTED TRIP:",
        data
      );

      if (!validateTrip(data)) {
        return;
      }

      trip =
        data;

      showReview(trip);
    }
  );
}


/* =========================================================
   REVIEW BUTTONS
========================================================= */

function setupReviewButtons() {
  const closeReview =
    $("closeReview");

  if (closeReview) {
    closeReview.addEventListener(
      "click",
      function () {
        const review =
          $("review");

        const app =
          $("app");

        if (review) {
          review.classList.add(
            "hidden"
          );
        }

        if (app) {
          app.classList.remove(
            "hidden"
          );
        }

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }
    );
  }


  const pay =
    $("pay");

  if (pay) {
    pay.addEventListener(
      "click",
      async function () {

        if (!trip) {
          trip =
            collectTripData();
        }

        /*
         * For now, create the plan directly.
         *
         * This keeps the AI planning flow working
         * even if Paddle is not configured yet.
         */

        pay.disabled = true;

        const originalText =
          pay.textContent;

        pay.textContent =
          "Creating your plan...";

        try {
          await createTravelPlan();
        } finally {
          pay.disabled = false;

          /*
           * Only restore the button if we are
           * still on the review screen.
           */
          if (
            !$("review")?.classList.contains(
              "hidden"
            )
          ) {
            pay.textContent =
              originalText;
          }
        }
      }
    );
  }
}


/* =========================================================
   PLAN TABS
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
      function () {

        const target =
          this.dataset.planSection;

        if (!target) {
          return;
        }

        tabs.forEach(
          (item) =>
            item.classList.remove(
              "active"
            )
        );

        this.classList.add(
          "active"
        );

        const section =
          document.getElementById(
            `${target}Section`
          );

        if (section) {
          section.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    );
  });
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "AI LIFE PLANNER INITIALIZING..."
    );

    setupInterestChips();

    setupForm();

    setupReviewButtons();

    setupPlanTabs();

    console.log(
      "AI LIFE PLANNER READY"
    );
  }
);

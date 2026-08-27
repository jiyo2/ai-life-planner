const $ = (id) => document.getElementById(id);

let trip = null;
let currentPlan = null;

/* =========================================================
   GLOBAL UI STYLES
========================================================= */

(function injectPlannerStyles() {
  if (document.getElementById("aiPlannerDynamicStyles")) return;

  const style = document.createElement("style");
  style.id = "aiPlannerDynamicStyles";

  style.textContent = `
    /* =========================
       INTEREST CHIPS
    ========================== */

    .chip {
      cursor: pointer;
      user-select: none;
    }

    .chip.active {
      cursor: pointer;
    }

    /* =========================
       HOTEL LIST
    ========================== */

    .hotel-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      width: 100%;
    }

    .hotel-card {
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .hotel-name,
    .hotel-location,
    .hotel-platform,
    .hotel-price,
    .hotel-rating,
    .hotel-guest-rating,
    .hotel-amenity {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .hotel-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
    }

    /* =========================
       RESTAURANTS
    ========================== */

    .restaurant-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      width: 100%;
      margin-top: 18px;
    }

    .restaurant-card {
      min-width: 0;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;

      padding: 20px;

      background: #ffffff;
      border: 1px solid #e2e7ef;
      border-radius: 20px;

      box-shadow:
        0 8px 24px rgba(20, 30, 50, 0.06);

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        border-color 0.2s ease;
    }

    .restaurant-card:hover {
      transform: translateY(-2px);

      box-shadow:
        0 14px 34px rgba(20, 30, 50, 0.1);

      border-color: #cfd6e2;
    }

    .restaurant-number {
      width: 32px;
      height: 32px;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      margin-bottom: 12px;

      border-radius: 50%;

      background: #f0f2f6;
      color: #172033;

      font-size: 13px;
      font-weight: 800;
    }

    .restaurant-name {
      margin: 0 0 14px;

      color: #172033;

      font-size: 20px;
      line-height: 1.3;
      font-weight: 800;

      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .restaurant-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .restaurant-location,
    .restaurant-cuisine,
    .restaurant-rating,
    .restaurant-platform {
      color: #5d6879;

      font-size: 14px;
      line-height: 1.5;

      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .restaurant-rating strong {
      color: #172033;
    }

    .restaurant-price {
      margin-top: 14px;

      color: #172033;

      font-size: 18px;
      font-weight: 700;
    }

    .restaurant-description {
      margin-top: 12px;

      color: #5d6879;

      font-size: 14px;
      line-height: 1.65;
    }

    .restaurant-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;

      margin-top: 14px;
    }

    .restaurant-tag {
      max-width: 100%;

      padding: 7px 10px;

      border-radius: 999px;

      background: #f7f8fb;
      border: 1px solid #e9edf3;

      color: #5d6879;

      font-size: 12px;
      line-height: 1.3;

      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .restaurant-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;

      margin-top: 20px;
    }

    .restaurant-button {
      min-width: 0;

      display: flex;
      align-items: center;
      justify-content: center;

      box-sizing: border-box;

      min-height: 46px;

      padding: 12px 10px;

      border-radius: 13px;

      background: #172033;
      color: #ffffff;

      border: 1px solid #172033;

      font-size: 14px;
      font-weight: 800;

      line-height: 1.25;

      text-decoration: none;
      text-align: center;

      white-space: normal;

      overflow-wrap: anywhere;
    }

    .restaurant-button:hover {
      opacity: 0.92;
    }

    .restaurant-button.maps {
      background: #f0f2f6;
      color: #172033;
      border-color: #dce2eb;
    }

    .restaurant-button.disabled {
      background: #f4f5f7;
      color: #7a8493;
      border-color: #e1e5eb;
      cursor: default;
    }

    .restaurant-empty {
      padding: 20px;

      background: #f7f8fb;
      border: 1px solid #e6eaf0;
      border-radius: 16px;

      color: #5d6879;

      line-height: 1.6;
    }

    /* =========================
       MOBILE
    ========================== */

    @media (max-width: 700px) {

      .hotel-list {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .hotel-card {
        width: 100%;
        max-width: 100%;
        padding: 18px;
      }

      .restaurant-list {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .restaurant-card {
        width: 100%;
        padding: 18px;
        border-radius: 17px;
      }

      .restaurant-name {
        font-size: 19px;
      }

      .restaurant-actions {
        grid-template-columns: 1fr;
      }

      .restaurant-button {
        min-height: 48px;
      }
    }

    @media (max-width: 380px) {

      .restaurant-card {
        padding: 15px;
      }

      .restaurant-name {
        font-size: 18px;
      }

      .restaurant-button {
        font-size: 13px;
      }
    }
  `;

  document.head.appendChild(style);
})();

/* =========================================================
   INTEREST CHIPS
========================================================= */

function toggleInterestChip(chip) {
  if (!chip) return;

  chip.classList.toggle("active");

  const input = chip.querySelector(
    'input[type="checkbox"], input[type="radio"]'
  );

  if (input) {
    input.checked = chip.classList.contains("active");
  }

  console.log(
    "INTEREST CHIP:",
    chip.textContent.trim(),
    chip.classList.contains("active")
  );
}

function prepareInterestChips() {
  document.querySelectorAll(".chip").forEach((chip) => {
    if (chip.tagName === "BUTTON") {
      chip.type = "button";
    }

    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");

    const input = chip.querySelector(
      'input[type="checkbox"], input[type="radio"]'
    );

    if (input) {
      chip.classList.toggle("active", input.checked);
    }
  });
}

document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  const clickedInput = e.target.matches(
    'input[type="checkbox"], input[type="radio"]'
  );

  if (clickedInput) {
    chip.classList.toggle("active", e.target.checked);
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  toggleInterestChip(chip);
});

document.addEventListener("keydown", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggleInterestChip(chip);
  }
});

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    prepareInterestChips
  );
} else {
  prepareInterestChips();
}

/* =========================================================
   FORM
========================================================= */

const form = $("plannerForm");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const destination =
      $("destination")?.value.trim() || "";

    const start =
      $("startDate")?.value || "";

    const days =
      Number($("days")?.value || 0);

    const budget =
      Number($("budget")?.value || 0);

    const travelers =
      $("travelers")?.value || "1 traveler";

    const notes =
      $("notes")?.value.trim() || "";

    const interests = [
      ...document.querySelectorAll(".chip.active")
    ]
      .map((chip) => {
        const input = chip.querySelector(
          'input[type="checkbox"], input[type="radio"]'
        );

        if (input && input.value) {
          return input.value.trim();
        }

        return chip.textContent.trim();
      })
      .filter(Boolean);

    if (!destination) {
      alert("Please enter your destination.");
      $("destination")?.focus();
      return;
    }

    if (!Number.isFinite(days) || days < 1) {
      alert("Please enter the number of travel days.");
      $("days")?.focus();
      return;
    }

    if (!Number.isFinite(budget) || budget < 1) {
      alert("Please enter your travel budget.");
      $("budget")?.focus();
      return;
    }

    trip = {
      destination,
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    };

    console.log("TRIP CREATED:", trip);

    if ($("summary")) {
      $("summary").innerHTML = `
        <b>${escapeHTML(trip.destination)}</b><br>

        ${trip.days} days ·
        ${escapeHTML(trip.travelers)} ·
        $${formatNumber(trip.budget)} budget

        <br>

        ${
          trip.interests.length
            ? trip.interests
                .map((item) => escapeHTML(item))
                .join(" · ")
            : "General trip"
        }

        ${
          trip.notes
            ? `
              <br>
              <span>
                ${escapeHTML(trip.notes)}
              </span>
            `
            : ""
        }
      `;
    }

    if ($("review")) {
      $("review").classList.remove("hidden");

      $("review").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

/* =========================================================
   CLOSE REVIEW
========================================================= */

if ($("closeReview")) {
  $("closeReview").addEventListener("click", () => {
    $("review").classList.add("hidden");
  });
}

/* =========================================================
   PADDLE
========================================================= */

console.log(
  "PADDLE AVAILABLE:",
  typeof Paddle !== "undefined"
);

if (typeof Paddle !== "undefined") {
  try {
    Paddle.Environment.set("sandbox");

    Paddle.Initialize({
      token:
        "test_2611717af9e5bf12fda64319b8b",

      eventCallback: function (event) {
        console.log("PADDLE EVENT:", event);

        if (event?.name === "checkout.error") {
          console.error("PADDLE CHECKOUT ERROR:", event);

          alert(
            "Paddle checkout error: " +
              (
                event?.detail ||
                event?.code ||
                "Unknown error"
              )
          );

          return;
        }

        if (
          event?.name ===
          "checkout.payment.error"
        ) {
          console.error(
            "PADDLE PAYMENT ERROR:",
            event
          );

          alert(
            "Payment error: " +
              (
                event?.detail ||
                event?.code ||
                "Unknown payment error"
              )
          );

          return;
        }

        if (
          event?.name ===
          "checkout.payment.failed"
        ) {
          console.error(
            "PADDLE PAYMENT FAILED:",
            event
          );

          alert(
            "Payment failed: " +
              (
                event?.detail ||
                "Please try again."
              )
          );

          return;
        }

        if (
          event?.name ===
          "checkout.completed"
        ) {
          console.log(
            "PAYMENT COMPLETED"
          );

          if (!trip) {
            showPlanError(
              "Your payment was completed, but your trip information was lost."
            );

            return;
          }

          if ($("review")) {
            $("review").classList.add("hidden");
          }

          if ($("app")) {
            $("app").classList.add("hidden");
          }

          if ($("plan")) {
            $("plan").classList.remove("hidden");
          }

          generateAIPlan();
        }
      }
    });

    console.log("PADDLE INITIALIZED");

  } catch (error) {
    console.error(
      "PADDLE INITIALIZATION ERROR:",
      error
    );
  }

} else {
  console.warn("PADDLE SDK NOT FOUND");
}

/* =========================================================
   PAYMENT BUTTON
========================================================= */

if ($("pay")) {
  $("pay").addEventListener("click", () => {
    console.log("PAY BUTTON CLICKED");

    if (!trip) {
      alert(
        "Please complete your trip details first."
      );

      return;
    }

    if (typeof Paddle === "undefined") {
      alert(
        "Payment system is not available."
      );

      return;
    }

    try {
      Paddle.Checkout.open({
        items: [
          {
            priceId:
              "pri_01m0x953caxgk28jt53p58dm63",

            quantity: 1
          }
        ]
      });

    } catch (error) {
      console.error(
        "PADDLE CHECKOUT OPEN ERROR:",
        error
      );

      alert(
        "Unable to open payment checkout."
      );
    }
  });
}

/* =========================================================
   GENERATE AI PLAN
========================================================= */

async function generateAIPlan() {
  console.log(
    "========== GENERATE AI PLAN =========="
  );

  if (!trip) {
    showPlanError(
      "Trip information is missing."
    );

    return;
  }

  setLoadingState();

  try {
    const response =
      await fetch("/api/plan", {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Accept":
            "application/json"
        },

        body:
          JSON.stringify(trip)
      });

    console.log(
      "API STATUS:",
      response.status
    );

    const rawText =
      await response.text();

    let data = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;

    } catch (error) {
      console.error(
        "NON JSON RESPONSE:",
        rawText
      );

      showPlanError(
        `Server returned an invalid response (${response.status}).`
      );

      return;
    }

    if (!response.ok) {
      console.error(
        "API ERROR:",
        data
      );

      showPlanError(
        data?.error ||
        data?.message ||
        `AI server error (${response.status}).`
      );

      return;
    }

    const plan =
      data?.plan;

    if (!plan) {
      showPlanError(
        "The AI server returned no travel plan."
      );

      return;
    }

    const hotels =
      Array.isArray(data?.hotels)
        ? data.hotels
        : [];

    const hotelSearch =
      data?.hotelSearch ||
      null;

    /*
      Restaurant data can come from several
      backend structures.
    */

    let restaurants = [];

    if (
      Array.isArray(data?.restaurants)
    ) {
      restaurants =
        data.restaurants;

    } else if (
      Array.isArray(data?.restaurantResults)
    ) {
      restaurants =
        data.restaurantResults;

    } else if (
      Array.isArray(plan?.restaurants)
    ) {
      restaurants =
        plan.restaurants;

    } else if (
      Array.isArray(
        plan?.experiences?.restaurants
      )
    ) {
      restaurants =
        plan.experiences.restaurants;
    }

    const restaurantSearch =
      data?.restaurantSearch ||
      null;

    currentPlan = plan;

    console.log(
      "HOTELS:",
      hotels.length
    );

    console.log(
      "RESTAURANTS:",
      restaurants.length
    );

    displayAIPlan(
      plan,
      hotels,
      hotelSearch,
      restaurants,
      restaurantSearch
    );

  } catch (error) {
    console.error(
      "FETCH /api/plan ERROR:",
      error
    );

    showConnectionError(
      error?.message ||
      "Unable to connect to the AI planner."
    );
  }
}

/* =========================================================
   LOADING
========================================================= */

function setLoadingState() {
  if ($("planTitle")) {
    $("planTitle").textContent =
      "Creating your personalized plan...";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      "Our AI is building your itinerary. Please wait a moment.";
  }

  if ($("stay")) {
    $("stay").textContent =
      "Generating accommodation strategy...";
  }

  if ($("transport")) {
    $("transport").textContent =
      "Generating transportation strategy...";
  }

  if ($("experiences")) {
    $("experiences").textContent =
      "Generating experiences...";
  }

  if ($("money")) {
    $("money").textContent =
      "Calculating your budget...";
  }

  if ($("daysOut")) {
    $("daysOut").textContent =
      "Creating your itinerary...";
  }

  ensureRestaurantUI();

  if ($("restaurants")) {
    $("restaurants").innerHTML = `
      <div class="restaurant-empty">
        🍽️ Finding the best restaurant options for your trip...
      </div>
    `;
  }
}

/* =========================================================
   ERRORS
========================================================= */

function showPlanError(message) {
  console.error(
    "PLAN ERROR:",
    message
  );

  if ($("planTitle")) {
    $("planTitle").textContent =
      "Something went wrong";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      "We could not create your AI travel plan. Please try again.";
  }

  if ($("stay")) {
    $("stay").innerHTML = `
      <div class="plan-error">
        ${escapeHTML(message)}
      </div>
    `;
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

  ensureRestaurantUI();

  if ($("restaurants")) {
    $("restaurants").innerHTML = `
      <div class="restaurant-empty">
        ${escapeHTML(message)}
      </div>
    `;
  }
}

function showConnectionError(message) {
  showPlanError(
    message ||
      "Unable to connect to the AI planner."
  );
}

/* =========================================================
   DISPLAY COMPLETE PLAN
========================================================= */

function displayAIPlan(
  plan,
  hotels = [],
  hotelSearch = null,
  restaurants = [],
  restaurantSearch = null
) {
  if (!plan) {
    showPlanError(
      "No travel plan was returned."
    );

    return;
  }

  if ($("planTitle")) {
    $("planTitle").textContent =
      `${trip.days}-Day ${trip.destination} Trip`;
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      plan.overview ||
      `Your personalized travel plan for ${trip.destination}.`;
  }

  /* =======================================================
     STAY
  ======================================================= */

  if ($("stay")) {
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

    $("stay").innerHTML = `
      <div class="plan-main-text">
        ${escapeHTML(
          stay.strategy ||
          "Choose accommodation based on location, transport access and value."
        )}
      </div>

      ${
        areas.length
          ? `
            <div class="plan-subsection">
              <h4>Recommended Areas</h4>

              <ul>
                ${areas
                  .map(
                    (item) => `
                      <li>
                        ${escapeHTML(item)}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        tips.length
          ? `
            <div class="plan-subsection">
              <h4>Accommodation Tips</h4>

              <ul>
                ${tips
                  .map(
                    (item) => `
                      <li>
                        ${escapeHTML(item)}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;
  }

  /* =======================================================
     HOTELS
  ======================================================= */

  renderHotels(
    hotels,
    hotelSearch
  );

  /* =======================================================
     RESTAURANTS
  ======================================================= */

  ensureRestaurantUI();

  renderRestaurants(
    restaurants,
    restaurantSearch,
    plan?.experiences?.food || []
  );

  /* =======================================================
     TRANSPORT
  ======================================================= */

  if ($("transport")) {
    const transport =
      plan.transport || {};

    const local =
      Array.isArray(
        transport.local
      )
        ? transport.local
        : [];

    $("transport").innerHTML = `
      <div class="plan-main-text">
        ${escapeHTML(
          transport.strategy ||
          "Use a combination of walking and public transportation."
        )}
      </div>

      ${
        transport.airport
          ? `
            <div class="plan-subsection">
              <h4>Airport Transportation</h4>

              <p>
                ${escapeHTML(
                  transport.airport
                )}
              </p>
            </div>
          `
          : ""
      }

      ${
        local.length
          ? `
            <div class="plan-subsection">
              <h4>Local Transportation</h4>

              <ul>
                ${local
                  .map(
                    (item) => `
                      <li>
                        ${escapeHTML(item)}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;
  }

  /* =======================================================
     EXPERIENCES
  ======================================================= */

  if ($("experiences")) {
    const experiences =
      plan.experiences || {};

    const places =
      Array.isArray(
        experiences.places
      )
        ? experiences.places
        : [];

    const food =
      Array.isArray(
        experiences.food
      )
        ? experiences.food
        : [];

    $("experiences").innerHTML = `
      ${
        experiences.summary
          ? `
            <div class="plan-main-text">
              ${escapeHTML(
                experiences.summary
              )}
            </div>
          `
          : ""
      }

      ${
        places.length
          ? `
            <div class="plan-subsection">
              <h4>Places & Attractions</h4>

              <ul>
                ${places
                  .map(
                    (item) => `
                      <li>
                        ${escapeHTML(item)}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        food.length
          ? `
            <div class="plan-subsection">
              <h4>Food Experiences</h4>

              <ul>
                ${food
                  .map(
                    (item) => `
                      <li>
                        ${escapeHTML(
                          typeof item ===
                            "string"
                            ? item
                            : item?.name ||
                              item?.title ||
                              JSON.stringify(item)
                        )}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;
  }

  /* =======================================================
     BUDGET
  ======================================================= */

  renderBudget(
    plan.budget || {}
  );

  /* =======================================================
     DAYS
  ======================================================= */

  if ($("daysOut")) {
    const days =
      Array.isArray(plan.days)
        ? plan.days
        : [];

    if (!days.length) {
      $("daysOut").innerHTML = `
        <div class="restaurant-empty">
          No itinerary was generated.
        </div>
      `;
    } else {
      $("daysOut").innerHTML =
        days
          .map(
            (day, index) => `
              <div class="day-card">

                <div class="day-number">
                  Day ${index + 1}
                </div>

                <h3>
                  ${escapeHTML(
                    day?.title ||
                    `Day ${index + 1}`
                  )}
                </h3>

                ${
                  day?.morning
                    ? `
                      <div class="day-period">
                        <span>
                          🌅 Morning
                        </span>

                        <p>
                          ${escapeHTML(
                            day.morning
                          )}
                        </p>
                      </div>
                    `
                    : ""
                }

                ${
                  day?.afternoon
                    ? `
                      <div class="day-period">
                        <span>
                          ☀️ Afternoon
                        </span>

                        <p>
                          ${escapeHTML(
                            day.afternoon
                          )}
                        </p>
                      </div>
                    `
                    : ""
                }

                ${
                  day?.evening
                    ? `
                      <div class="day-period">
                        <span>
                          🌙 Evening
                        </span>

                        <p>
                          ${escapeHTML(
                            day.evening
                          )}
                        </p>
                      </div>
                    `
                    : ""
                }

              </div>
            `
          )
          .join("");
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  ensureRestaurantUI();

  setupPlanNavigation();

  showPlanSection("stay");
}

/* =========================================================
   BUDGET
========================================================= */

function renderBudget(budget) {
  if (!$("money")) return;

  const accommodation =
    safeNumber(
      budget.accommodation
    );

  const transportation =
    safeNumber(
      budget.transportation
    );

  const food =
    safeNumber(
      budget.food
    );

  const activities =
    safeNumber(
      budget.activities
    );

  const other =
    safeNumber(
      budget.other
    );

  let total =
    safeNumber(
      budget.total
    );

  if (!total) {
    total =
      accommodation +
      transportation +
      food +
      activities +
      other;
  }

  $("money").innerHTML = `
    <div class="budget-grid">

      <div class="budget-item">
        <span>
          🏨 Accommodation
        </span>

        <strong>
          $${formatNumber(
            accommodation
          )}
        </strong>
      </div>

      <div class="budget-item">
        <span>
          🚆 Transportation
        </span>

        <strong>
          $${formatNumber(
            transportation
          )}
        </strong>
      </div>

      <div class="budget-item">
        <span>
          🍴 Food
        </span>

        <strong>
          $${formatNumber(
            food
          )}
        </strong>
      </div>

      <div class="budget-item">
        <span>
          🎟️ Activities
        </span>

        <strong>
          $${formatNumber(
            activities
          )}
        </strong>
      </div>

      <div class="budget-item">
        <span>
          💵 Other
        </span>

        <strong>
          $${formatNumber(
            other
          )}
        </strong>
      </div>

    </div>

    <div class="budget-total">
      <span>
        Estimated Total
      </span>

      <strong>
        $${formatNumber(
          total
        )}
      </strong>
    </div>

    ${
      budget.strategy
        ? `
          <div class="plan-subsection">
            <h4>
              Budget Strategy
            </h4>

            <p>
              ${escapeHTML(
                budget.strategy
              )}
            </p>
          </div>
        `
        : ""
    }
  `;
}

/* =========================================================
   RESTAURANT UI
========================================================= */

function ensureRestaurantUI() {
  let navigation =
    document.querySelector(
      ".plan-navigation"
    );

  if (navigation) {
    let button =
      navigation.querySelector(
        '[data-plan-section="restaurants"]'
      );

    if (!button) {
      button =
        document.createElement("button");

      button.type = "button";

      button.setAttribute(
        "data-plan-section",
        "restaurants"
      );

      button.textContent =
        "🍽️ Restaurants";

      navigation.appendChild(
        button
      );
    }
  }

  let content =
    document.querySelector(
      ".plan-content"
    );

  if (!content) return;

  let section =
    $("restaurantsSection");

  if (!section) {
    section =
      document.createElement("section");

    section.id =
      "restaurantsSection";

    section.className =
      "plan-section";

    section.innerHTML = `
      <div id="restaurants"></div>
    `;

    const moneySection =
      $("moneySection");

    if (
      moneySection &&
      moneySection.parentNode === content
    ) {
      content.insertBefore(
        section,
        moneySection
      );
    } else {
      content.appendChild(
        section
      );
    }
  }
}

/* =========================================================
   RENDER RESTAURANTS
========================================================= */

function renderRestaurants(
  restaurants = [],
  restaurantSearch = null,
  foodRecommendations = []
) {
  ensureRestaurantUI();

  if (!$("restaurants")) {
    console.error(
      "RESTAURANTS CONTAINER NOT FOUND"
    );

    return;
  }

  /*
    PROCESSING
  */

  if (
    restaurantSearch?.status ===
    "processing"
  ) {
    $("restaurants").innerHTML = `
      <div class="hotel-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <div class="restaurant-empty">
          Searching live restaurant options...
        </div>

      </div>
    `;

    return;
  }

  /*
    ERROR
  */

  if (
    restaurantSearch?.status ===
    "error"
  ) {
    $("restaurants").innerHTML = `
      <div class="hotel-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <div class="restaurant-empty">
          Restaurant search could not be completed right now.
        </div>

      </div>
    `;

    return;
  }

  /*
    LIVE RESULTS
  */

  if (
    Array.isArray(restaurants) &&
    restaurants.length
  ) {
    $("restaurants").innerHTML = `
      <div class="hotel-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <p class="hotel-results-intro">
          Restaurant options found for your trip.
        </p>

        <div class="restaurant-list">

          ${restaurants
            .slice(0, 10)
            .map(
              (restaurant, index) =>
                renderRestaurantCard(
                  restaurant,
                  index
                )
            )
            .join("")}

        </div>

        ${
          restaurantSearch?.partial
            ? `
              <p class="hotel-note">
                Some restaurant results may be incomplete.
              </p>
            `
            : ""
        }

      </div>
    `;

    return;
  }

  /*
    FOOD FALLBACK
  */

  const convertedRestaurants =
    convertFoodToRestaurants(
      foodRecommendations
    );

  if (
    convertedRestaurants.length
  ) {
    $("restaurants").innerHTML = `
      <div class="hotel-results">

        <h4>
          🍽️ Restaurant Recommendations
        </h4>

        <p class="hotel-results-intro">
          Personalized restaurant and food recommendations for your trip.
        </p>

        <div class="restaurant-list">

          ${convertedRestaurants
            .slice(0, 10)
            .map(
              (restaurant, index) =>
                renderRestaurantCard(
                  restaurant,
                  index
                )
            )
            .join("")}

        </div>

      </div>
    `;

    return;
  }

  /*
    NO RESULTS
  */

  $("restaurants").innerHTML = `
    <div class="hotel-results">

      <h4>
        🍽️ Live Restaurant Options
      </h4>

      <div class="restaurant-empty">
        No live restaurant results were returned.
      </div>

      <p>
        Restaurant options may not be available for this destination yet.
      </p>

    </div>
  `;
}

/* =========================================================
   CONVERT FOOD ITEMS
========================================================= */

function convertFoodToRestaurants(
  items
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {

      if (
        item &&
        typeof item === "object"
      ) {
        return item;
      }

      if (
        typeof item !== "string"
      ) {
        return null;
      }

      /*
        Only create a restaurant card
        from text that looks like a named place.
      */

      const text =
        item.trim();

      if (!text) {
        return null;
      }

      return {
        name: text,

        cuisine:
          "Food experience",

        location:
          trip?.destination ||
          "",

        description:
          "Recommended as part of your personalized food plan."
      };
    })
    .filter(Boolean);
}

/* =========================================================
   RESTAURANT CARD
========================================================= */

function renderRestaurantCard(
  restaurant,
  index
) {
  if (
    !restaurant ||
    typeof restaurant !== "object"
  ) {
    restaurant = {
      name: String(
        restaurant || "Restaurant"
      )
    };
  }

  const name =
    restaurant.name ||
    restaurant.title ||
    restaurant.restaurantName ||
    "Unnamed restaurant";

  const location =
    restaurant.location ||
    restaurant.address ||
    restaurant.area ||
    "";

  const cuisine =
    restaurant.cuisine ||
    restaurant.cuisineType ||
    restaurant.category ||
    restaurant.type ||
    "";

  const description =
    restaurant.description ||
    restaurant.summary ||
    "";

  const platform =
    restaurant.platform ||
    restaurant.source ||
    "";

  const rating =
    restaurant.rating ??
    restaurant.guestRating ??
    restaurant.reviewRating ??
    "";

  const reviewCount =
    restaurant.reviewCount ??
    restaurant.reviews ??
    "";

  const priceLevel =
    restaurant.priceLevel ||
    restaurant.price_range ||
    restaurant.priceRange ||
    restaurant.price_level ||
    "";

  const price =
    restaurant.price ??
    restaurant.cost ??
    "";

  const tags =
    Array.isArray(
      restaurant.tags
    )
      ? restaurant.tags
      : Array.isArray(
          restaurant.features
        )
        ? restaurant.features
        : [];

  /*
    Restaurant website / booking URL.
    We intentionally do NOT use Google Maps here,
    because Google Maps has its own separate button.
  */

  let restaurantUrl =
    restaurant.website ||
    restaurant.restaurantUrl ||
    restaurant.bookingUrl ||
    restaurant.url ||
    restaurant.webUrl ||
    "";

  /*
    Some APIs return nested links.
  */

  if (
    !restaurantUrl &&
    restaurant.links &&
    typeof restaurant.links === "object"
  ) {
    restaurantUrl =
      restaurant.links.website ||
      restaurant.links.restaurant ||
      restaurant.links.booking ||
      restaurant.links.url ||
      "";
  }

  const safeRestaurantUrl =
    isSafeHttpUrl(
      restaurantUrl
    )
      ? restaurantUrl
      : "";

  /*
    Google Maps URL.
  */

  const providedMapsUrl =
    restaurant.googleMapsUrl ||
    restaurant.mapsUrl ||
    restaurant.google_maps_url ||
    restaurant.googleMapUrl ||
    "";

  const mapsSearch =
    [
      name,
      formatRestaurantLocation(
        location
      ),
      trip?.destination || ""
    ]
      .filter(Boolean)
      .join(", ");

  const mapsUrl =
    isSafeHttpUrl(
      providedMapsUrl
    )
      ? providedMapsUrl
      : buildGoogleMapsUrl(
          mapsSearch
        );

  /*
    If there is no actual restaurant website,
    View Restaurant goes to a Google search for
    the restaurant. This gives the user a useful
    destination instead of a dead button.
  */

  const fallbackRestaurantUrl =
    safeRestaurantUrl ||
    buildRestaurantSearchUrl(
      name,
      location
    );

  const priceText =
    formatRestaurantPrice(
      price,
      priceLevel
    );

  const safeLocation =
    formatRestaurantLocation(
      location
    );

  const safeCuisine =
    formatRestaurantCuisine(
      cuisine
    );

  return `
    <div class="restaurant-card">

      <div class="restaurant-number">
        ${index + 1}
      </div>

      <h5 class="restaurant-name">
        ${escapeHTML(name)}
      </h5>

      <div class="restaurant-info">

        ${
          safeCuisine
            ? `
              <div class="restaurant-cuisine">
                🍴 ${escapeHTML(
                  safeCuisine
                )}
              </div>
            `
            : ""
        }

        ${
          safeLocation
            ? `
              <div class="restaurant-location">
                📍 ${escapeHTML(
                  safeLocation
                )}
              </div>
            `
            : ""
        }

        ${
          rating !== "" &&
          rating !== null &&
          rating !== undefined
            ? `
              <div class="restaurant-rating">
                ⭐
                <strong>
                  ${escapeHTML(
                    rating
                  )}
                </strong>

                ${
                  reviewCount
                    ? `
                      <span>
                        · ${escapeHTML(
                          reviewCount
                        )} reviews
                      </span>
                    `
                    : ""
                }
              </div>
            `
            : ""
        }

        ${
          priceText
            ? `
              <div class="restaurant-price">
                ${priceText}
              </div>
            `
            : ""
        }

        ${
          platform
            ? `
              <div class="restaurant-platform">
                ${escapeHTML(
                  formatPlatform(
                    platform
                  )
                )}
              </div>
            `
            : ""
        }

      </div>

      ${
        description
          ? `
            <div class="restaurant-description">
              ${escapeHTML(
                description
              )}
            </div>
          `
          : ""
      }

      ${
        tags.length
          ? `
            <div class="restaurant-tags">

              ${tags
                .slice(0, 6)
                .map(
                  (tag) => `
                    <span class="restaurant-tag">
                      ${escapeHTML(
                        formatRestaurantTag(
                          tag
                        )
                      )}
                    </span>
                  `
                )
                .join("")}

            </div>
          `
          : ""
      }

      <div class="restaurant-actions">

        ${
          mapsUrl
            ? `
              <a
                class="restaurant-button maps"
                href="${escapeHTML(
                  mapsUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 Google Maps
              </a>
            `
            : `
              <div class="restaurant-button disabled">
                📍 Maps unavailable
              </div>
            `
        }

        ${
          fallbackRestaurantUrl
            ? `
              <a
                class="restaurant-button"
                href="${escapeHTML(
                  fallbackRestaurantUrl
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Restaurant
              </a>
            `
            : `
              <div class="restaurant-button disabled">
                Restaurant link unavailable
              </div>
            `
        }

      </div>

    </div>
  `;
}

/* =========================================================
   RESTAURANT URL
========================================================= */

function buildRestaurantSearchUrl(
  name,
  location
) {
  const query =
    [
      name,
      location,
      trip?.destination || ""
    ]
      .filter(Boolean)
      .join(" ");

  if (!query) {
    return "";
  }

  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(
      query
    )
  );
}

/* =========================================================
   GOOGLE MAPS URL
========================================================= */

function buildGoogleMapsUrl(
  searchText
) {
  const query =
    String(
      searchText || ""
    ).trim();

  if (!query) {
    return "";
  }

  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      query
    )
  );
}

/* =========================================================
   RESTAURANT HELPERS
========================================================= */

function formatRestaurantLocation(
  location
) {
  if (
    typeof location ===
    "string"
  ) {
    return location.trim();
  }

  if (
    !location ||
    typeof location !==
      "object"
  ) {
    return "";
  }

  return [
    location.address,
    location.area,
    location.neighborhood,
    location.city,
    location.country
  ]
    .filter(Boolean)
    .map(
      (item) =>
        String(item).trim()
    )
    .filter(Boolean)
    .join(", ");
}

function formatRestaurantCuisine(
  cuisine
) {
  if (
    !cuisine
  ) {
    return "";
  }

  if (
    typeof cuisine ===
    "object"
  ) {
    return (
      cuisine.name ||
      cuisine.label ||
      cuisine.title ||
      ""
    );
  }

  return String(
    cuisine
  ).trim();
}

function formatRestaurantTag(
  tag
) {
  if (
    !tag
  ) {
    return "";
  }

  if (
    typeof tag ===
    "object"
  ) {
    return (
      tag.name ||
      tag.label ||
      tag.title ||
      ""
    );
  }

  return String(
    tag
  )
    .replace(
      /_/g,
      " "
    )
    .trim();
}

function formatRestaurantPrice(
  price,
  priceLevel
) {
  if (
    priceLevel
  ) {
    if (
      typeof priceLevel ===
      "string"
    ) {
      const value =
        priceLevel.trim();

      if (
        value.includes("$")
      ) {
        return value;
      }

      if (
        value.toLowerCase() ===
        "budget"
      ) {
        return "$";
      }

      if (
        value.toLowerCase() ===
        "cheap"
      ) {
        return "$";
      }

      if (
        value.toLowerCase() ===
        "moderate"
      ) {
        return "$$";
      }

      if (
        value.toLowerCase() ===
        "expensive"
      ) {
        return "$$$";
      }

      if (
        value.toLowerCase() ===
        "very expensive"
      ) {
        return "$$$$";
      }

      return value;
    }

    if (
      typeof priceLevel ===
      "number"
    ) {
      return "$".repeat(
        Math.min(
          Math.max(
            priceLevel,
            1
          ),
          4
        )
      );
    }
  }

  if (
    price === null ||
    price === undefined ||
    price === ""
  ) {
    return "";
  }

  if (
    typeof price ===
    "number"
  ) {
    return `$${formatNumber(
      price
    )}`;
  }

  if (
    typeof price ===
    "string"
  ) {
    return price.trim();
  }

  if (
    typeof price ===
    "object"
  ) {
    const amount =
      price.amount ??
      price.value ??
      price.total ??
      price.price ??
      null;

    const currency =
      price.currency ||
      price.currencyCode ||
      "USD";

    if (
      amount !== null &&
      amount !== undefined
    ) {
      return `${currency} ${formatNumber(
        amount
      )}`;
    }

    if (
      price.formatted
    ) {
      return String(
        price.formatted
      );
    }

    if (
      price.display
    ) {
      return String(
        price.display
      );
    }
  }

  return "";
}

/* =========================================================
   HOTEL RENDERER
========================================================= */

function renderHotels(
  hotels = [],
  hotelSearch = null
) {
  const container =
    $("hotels");

  if (!container) {
    console.warn(
      "HOTELS CONTAINER NOT FOUND"
    );

    return;
  }

  if (
    hotelSearch?.status ===
    "processing"
  ) {
    container.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          Searching live hotel options...
        </div>

      </div>
    `;

    return;
  }

  if (
    hotelSearch?.status ===
    "error"
  ) {
    container.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          Hotel search could not be completed.
        </div>

      </div>
    `;

    return;
  }

  if (
    !Array.isArray(hotels) ||
    !hotels.length
  ) {
    container.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          No live hotel results were returned.
        </div>

        <p>
          Hotel options may not be available for these dates.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="hotel-results">

      <h4>
        🏨 Live Hotel Options
      </h4>

      <p class="hotel-results-intro">
        Real hotel options found for your trip.
      </p>

      <div class="hotel-list">

        ${hotels
          .slice(0, 10)
          .map(
            (hotel, index) =>
              renderHotelCard(
                hotel,
                index
              )
          )
          .join("")}

      </div>

    </div>
  `;
}

/* =========================================================
   HOTEL CARD
========================================================= */

function renderHotelCard(
  hotel,
  index
) {
  const name =
    hotel?.name ||
    "Unnamed property";

  const location =
    formatHotelLocation(
      hotel?.location
    );

  const platform =
    formatPlatform(
      hotel?.platform
    );

  const rating =
    hotel?.guestRating ??
    hotel?.rating ??
    "";

  const starRating =
    hotel?.starRating ??
    "";

  const reviewCount =
    hotel?.reviewCount ??
    "";

  const amenities =
    Array.isArray(
      hotel?.amenities
    )
      ? hotel.amenities
      : [];

  const safeUrl =
    isSafeHttpUrl(
      hotel?.url
    )
      ? hotel.url
      : "";

  return `
    <div class="hotel-card">

      <div class="hotel-number">
        ${index + 1}
      </div>

      <h5 class="hotel-name">
        ${escapeHTML(
          name
        )}
      </h5>

      ${
        location
          ? `
            <div class="hotel-location">
              📍 ${escapeHTML(
                location
              )}
            </div>
          `
          : ""
      }

      ${
        starRating
          ? `
            <div class="hotel-rating">
              ⭐ ${escapeHTML(
                starRating
              )} stars
            </div>
          `
          : ""
      }

      ${
        rating
          ? `
            <div class="hotel-guest-rating">
              ⭐ Guest rating:
              <strong>
                ${escapeHTML(
                  rating
                )}
              </strong>

              ${
                reviewCount
                  ? `
                    · ${escapeHTML(
                      reviewCount
                    )} reviews
                  `
                  : ""
              }
            </div>
          `
          : ""
      }

      ${
        hotel?.price
          ? `
            <div class="hotel-price">
              ${formatHotelPrice(
                hotel.price
              )}
            </div>
          `
          : ""
      }

      ${
        platform
          ? `
            <div class="hotel-platform">
              ${escapeHTML(
                platform
              )}
            </div>
          `
          : ""
      }

      ${
        amenities.length
          ? `
            <div class="hotel-amenities">

              ${amenities
                .slice(0, 6)
                .map(
                  (item) => `
                    <span class="hotel-amenity">
                      ${escapeHTML(
                        formatAmenity(
                          item
                        )
                      )}
                    </span>
                  `
                )
                .join("")}

            </div>
          `
          : ""
      }

      ${
        safeUrl
          ? `
            <a
              class="hotel-button"
              href="${escapeHTML(
                safeUrl
              )}"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Hotel
            </a>
          `
          : `
            <div class="hotel-button disabled">
              Booking link unavailable
            </div>
          `
      }

    </div>
  `;
}

/* =========================================================
   HOTEL PRICE
========================================================= */

function formatHotelPrice(
  price
) {
  if (
    price === null ||
    price === undefined
  ) {
    return "";
  }

  if (
    typeof price ===
    "number"
  ) {
    return `
      <strong>
        $${formatNumber(
          price
        )}
      </strong>
    `;
  }

  if (
    typeof price ===
    "string"
  ) {
    return `
      <strong>
        ${escapeHTML(
          price
        )}
      </strong>
    `;
  }

  if (
    typeof price ===
    "object"
  ) {
    const total =
      price.total ??
      price.amount ??
      price.value ??
      price.price ??
      price.totalPrice ??
      null;

    const nightly =
      price.nightly ??
      price.nightlyPrice ??
      price.perNight ??
      price.night ??
      null;

    const currency =
      price.currency ||
      price.currencyCode ||
      "USD";

    if (
      total !== null &&
      total !== undefined &&
      nightly !== null &&
      nightly !== undefined
    ) {
      return `
        <strong>
          ${escapeHTML(
            currency
          )}
          ${formatNumber(
            total
          )}
        </strong>

        <span class="hotel-nightly">
          ${escapeHTML(
            currency
          )}
          ${formatNumber(
            nightly
          )}
          / night
        </span>
      `;
    }

    if (
      total !== null &&
      total !== undefined
    ) {
      return `
        <strong>
          ${escapeHTML(
            currency
          )}
          ${formatNumber(
            total
          )}
        </strong>
      `;
    }

    if (
      price.formatted
    ) {
      return `
        <strong>
          ${escapeHTML(
            price.formatted
          )}
        </strong>
      `;
    }

    if (
      price.display
    ) {
      return `
        <strong>
          ${escapeHTML(
            price.display
          )}
        </strong>
      `;
    }
  }

  return "";
}

/* =========================================================
   HOTEL HELPERS
========================================================= */

function formatHotelLocation(
  location
) {
  if (
    typeof location ===
    "string"
  ) {
    return location;
  }

  if (
    !location ||
    typeof location !==
      "object"
  ) {
    return "";
  }

  return [
    location.address,
    location.area,
    location.neighborhood,
    location.city,
    location.country
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPlatform(
  platform
) {
  const value =
    String(
      platform || ""
    ).trim();

  if (!value) {
    return "";
  }

  if (
    value.toLowerCase() ===
    "booking"
  ) {
    return "Booking.com";
  }

  return value;
}

function formatAmenity(
  amenity
) {
  let value = "";

  if (
    typeof amenity ===
    "string"
  ) {
    value = amenity;

  } else if (
    amenity &&
    typeof amenity ===
      "object"
  ) {
    value =
      amenity.name ||
      amenity.label ||
      amenity.title ||
      "";
  }

  value =
    String(value)
      .replace(
        /_/g,
        " "
      )
      .trim();

  if (!value) {
    return "";
  }

  const known = {
    wifi:
      "Wi-Fi",

    "free wifi":
      "Free Wi-Fi",

    "free parking":
      "Free parking",

    parking:
      "Parking",

    "air conditioning":
      "Air conditioning",

    heating:
      "Heating",

    dryer:
      "Dryer",

    kitchen:
      "Kitchen",

    balcony:
      "Balcony",

    workspace:
      "Workspace",

    restaurant:
      "Restaurant",

    pool:
      "Pool",

    "swimming pool":
      "Swimming pool",

    breakfast:
      "Breakfast",

    gym:
      "Gym",

    spa:
      "Spa",

    elevator:
      "Elevator",

    minibar:
      "Minibar"
  };

  const lower =
    value.toLowerCase();

  if (
    known[lower]
  ) {
    return known[lower];
  }

  return value
    .replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    )
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupPlanNavigation() {
  const buttons =
    document.querySelectorAll(
      "[data-plan-section]"
    );

  buttons.forEach(
    (button) => {

      const newButton =
        button.cloneNode(true);

      button.parentNode.replaceChild(
        newButton,
        button
      );
    }
  );

  document
    .querySelectorAll(
      "[data-plan-section]"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          (e) => {

            e.preventDefault();

            const section =
              button.getAttribute(
                "data-plan-section"
              );

            showPlanSection(
              section
            );
          }
        );
      }
    );
}

/* =========================================================
   SHOW SECTION
========================================================= */

function showPlanSection(
  sectionName
) {
  const sections = {
    stay:
      $("staySection"),

    transport:
      $("transportSection"),

    experiences:
      $("experiencesSection"),

    restaurants:
      $("restaurantsSection"),

    money:
      $("moneySection"),

    days:
      $("daysSection")
  };

  Object.keys(
    sections
  ).forEach(
    (key) => {

      const section =
        sections[key];

      if (!section) {
        return;
      }

      if (
        key === sectionName
      ) {
        section.classList.add(
          "active"
        );
      } else {
        section.classList.remove(
          "active"
        );
      }
    }
  );

  document
    .querySelectorAll(
      "[data-plan-section]"
    )
    .forEach(
      (button) => {

        const key =
          button.getAttribute(
            "data-plan-section"
          );

        button.classList.toggle(
          "active",
          key === sectionName
        );
      }
    );
}

/* =========================================================
   UTILITIES
========================================================= */

function safeNumber(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    number
  );
}

function formatNumber(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0.00";
  }

  return number.toFixed(2);
}

function isSafeHttpUrl(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  try {
    const url =
      new URL(
        value
      );

    return (
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
    );

  } catch {
    return false;
  }
}

function escapeHTML(
  text
) {
  return String(
    text ?? ""
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

/* =========================================================
   FINAL LOG
========================================================= */

console.log(
  "================================="
);

console.log(
  "AI LIFE PLANNER APP.JS LOADED"
);

console.log(
  "Interest chips:",
  document.querySelectorAll(
    ".chip"
  ).length
);

console.log(
  "Planner form:",
  !!$("plannerForm")
);

console.log(
  "Restaurant UI:",
  !!$("restaurants")
);

console.log(
  "================================="
);

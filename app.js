const $ = (id) => document.getElementById(id);

/* =========================================
   AI LIFE PLANNER — APP.JS
   FULL VERSION
   Hotels + Restaurants
========================================= */

let trip = null;
let currentPlan = null;

/* =========================================
   INTEREST CHIPS
========================================= */

document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  e.preventDefault();
  e.stopPropagation();

  chip.classList.toggle("active");

  if (chip.tagName === "BUTTON") {
    chip.type = "button";
  }

  console.log(
    "INTEREST CHIP:",
    chip.textContent.trim(),
    chip.classList.contains("active")
  );
});

/* =========================================
   PREPARE INTEREST CHIPS
========================================= */

function prepareInterestChips() {
  document.querySelectorAll(".chip").forEach((chip) => {
    if (chip.tagName === "BUTTON") {
      chip.type = "button";
    }

    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    prepareInterestChips
  );
} else {
  prepareInterestChips();
}

/* =========================================
   KEYBOARD SUPPORT
========================================= */

document.addEventListener("keydown", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();

    chip.classList.toggle("active");

    console.log(
      "INTEREST CHIP KEYBOARD:",
      chip.textContent.trim()
    );
  }
});

/* =========================================
   TRIP FORM
========================================= */

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
      $("travelers")?.value || "";

    const notes =
      $("notes")?.value.trim() || "";

    const interests = [
      ...document.querySelectorAll(".chip.active")
    ].map(
      (chip) => chip.textContent.trim()
    );

    /* =====================================
       VALIDATION
    ===================================== */

    if (!destination) {
      alert("Please enter your destination.");
      $("destination")?.focus();
      return;
    }

    if (!days || days < 1) {
      alert("Please enter the number of travel days.");
      $("days")?.focus();
      return;
    }

    if (!budget || budget < 1) {
      alert("Please enter your travel budget.");
      $("budget")?.focus();
      return;
    }

    /* =====================================
       CREATE TRIP
    ===================================== */

    trip = {
      destination,
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    };

    console.log("=================================");
    console.log("TRIP CREATED:");
    console.log(trip);
    console.log("=================================");

    /* =====================================
       SUMMARY
    ===================================== */

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
                .map(escapeHTML)
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

    /* =====================================
       SHOW REVIEW
    ===================================== */

    if ($("review")) {
      $("review").classList.remove("hidden");

      $("review").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
}

/* =========================================
   CLOSE REVIEW
========================================= */

if ($("closeReview")) {
  $("closeReview").addEventListener(
    "click",
    () => {
      $("review").classList.add("hidden");
    }
  );
}

/* =========================================
   PADDLE
========================================= */

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
        console.log(
          "========== PADDLE EVENT =========="
        );

        console.log(event);
        console.log("EVENT NAME:", event?.name);

        console.log(
          "=================================="
        );

        /* =================================
           CHECKOUT ERROR
        ================================= */

        if (event?.name === "checkout.error") {
          console.error(
            "PADDLE CHECKOUT ERROR:",
            event
          );

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

        /* =================================
           PAYMENT ERROR
        ================================= */

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

        /* =================================
           PAYMENT FAILED
        ================================= */

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

        /* =================================
           PAYMENT COMPLETED
        ================================= */

        if (
          event?.name ===
          "checkout.completed"
        ) {
          console.log(
            "PAYMENT COMPLETED"
          );

          console.log(
            "TRIP BEFORE AI:",
            trip
          );

          if (!trip) {
            console.error(
              "TRIP DATA IS MISSING AFTER PAYMENT"
            );

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

          console.log(
            "PLAN SCREEN SHOWN"
          );

          generateAIPlan();
        }
      }
    });

    console.log(
      "PADDLE INITIALIZED"
    );

  } catch (error) {
    console.error(
      "PADDLE INITIALIZATION ERROR:",
      error
    );
  }

} else {
  console.error(
    "PADDLE SDK NOT FOUND"
  );
}

/* =========================================
   PAYMENT BUTTON
========================================= */

if ($("pay")) {
  $("pay").addEventListener(
    "click",
    () => {
      console.log(
        "PAY BUTTON CLICKED"
      );

      if (!trip) {
        alert(
          "Please complete your trip details first."
        );

        return;
      }

      if (
        typeof Paddle ===
        "undefined"
      ) {
        alert(
          "Payment system is not available."
        );

        return;
      }

      console.log(
        "OPENING PADDLE CHECKOUT"
      );

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
    }
  );
}

/* =========================================
   GENERATE AI PLAN
========================================= */

async function generateAIPlan() {
  console.log(
    "========== GENERATE AI PLAN START =========="
  );

  console.log(
    "TRIP SENT TO API:",
    trip
  );

  if (!trip) {
    console.error(
      "NO TRIP DATA"
    );

    showPlanError(
      "Trip information is missing."
    );

    return;
  }

  setLoadingState();

  try {
    console.log(
      "CALLING /api/plan ..."
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
            JSON.stringify(trip)
        }
      );

    console.log(
      "API RESPONSE STATUS:",
      response.status
    );

    console.log(
      "API RESPONSE OK:",
      response.ok
    );

    /* =====================================
       READ TEXT FIRST
    ===================================== */

    const rawText =
      await response.text();

    console.log(
      "RAW API RESPONSE:",
      rawText
    );

    let data = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;

    } catch (jsonError) {
      console.error(
        "API RETURNED NON-JSON:",
        jsonError
      );

      showPlanError(
        `Server returned an invalid response (${response.status}).`
      );

      return;
    }

    console.log(
      "PARSED API RESPONSE:",
      data
    );

    /* =====================================
       API ERROR
    ===================================== */

    if (!response.ok) {
      console.error(
        "AI API ERROR:",
        data
      );

      showPlanError(
        data?.error ||
        data?.message ||
        `AI server error (${response.status}).`
      );

      return;
    }

    /* =====================================
       PLAN
    ===================================== */

    const plan =
      data?.plan;

    if (!plan) {
      console.error(
        "NO PLAN IN API RESPONSE:",
        data
      );

      showPlanError(
        "The AI server returned no travel plan."
      );

      return;
    }

    console.log(
      "AI PLAN RECEIVED:",
      plan
    );

    /* =====================================
       HOTELS
    ===================================== */

    const hotels =
      Array.isArray(data?.hotels)
        ? data.hotels
        : [];

    const hotelSearch =
      data?.hotelSearch ||
      null;

    console.log(
      "HOTELS RECEIVED:",
      hotels
    );

    console.log(
      "HOTEL COUNT:",
      hotels.length
    );

    console.log(
      "HOTEL SEARCH RECEIVED:",
      hotelSearch
    );

    /* =====================================
       RESTAURANTS
    ===================================== */

    const restaurants =
      Array.isArray(data?.restaurants)
        ? data.restaurants
        : [];

    const restaurantSearch =
      data?.restaurantSearch ||
      null;

    console.log(
      "RESTAURANTS RECEIVED:",
      restaurants
    );

    console.log(
      "RESTAURANT COUNT:",
      restaurants.length
    );

    console.log(
      "RESTAURANT SEARCH RECEIVED:",
      restaurantSearch
    );

    /* =====================================
       SAVE PLAN
    ===================================== */

    currentPlan =
      plan;

    displayAIPlan(
      plan,
      hotels,
      hotelSearch,
      restaurants,
      restaurantSearch
    );

    console.log(
      "========== AI PLAN COMPLETE =========="
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

/* =========================================
   LOADING STATE
========================================= */

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
    $("daysOut").innerHTML = `
      <div class="day">
        <b>AI Travel Planner</b>

        <p>
          Creating your personalized
          day-by-day itinerary...
        </p>
      </div>
    `;
  }
}

/* =========================================
   ERROR STATE
========================================= */

function showPlanError(message) {
  if ($("planTitle")) {
    $("planTitle").textContent =
      "Something went wrong";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      message ||
      "We could not create your AI travel plan. Please try again.";
  }

  if ($("stay")) {
    $("stay").textContent = "";
  }

  if ($("transport")) {
    $("transport").textContent = "";
  }

  if ($("experiences")) {
    $("experiences").textContent = "";
  }

  if ($("money")) {
    $("money").textContent = "";
  }

  if ($("daysOut")) {
    $("daysOut").innerHTML = `
      <div class="day">
        <b>AI Planner Error</b>

        <p>
          ${escapeHTML(
            message ||
            "Please try again later."
          )}
        </p>
      </div>
    `;
  }
}

/* =========================================
   CONNECTION ERROR
========================================= */

function showConnectionError(message) {
  if ($("planTitle")) {
    $("planTitle").textContent =
      "Connection error";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      message ||
      "We could not connect to the AI travel planner.";
  }

  if ($("stay")) {
    $("stay").textContent = "";
  }

  if ($("transport")) {
    $("transport").textContent = "";
  }

  if ($("experiences")) {
    $("experiences").textContent = "";
  }

  if ($("money")) {
    $("money").textContent = "";
  }

  if ($("daysOut")) {
    $("daysOut").innerHTML = `
      <div class="day">
        <b>Connection Error</b>

        <p>
          ${escapeHTML(
            message ||
            "Please try again later."
          )}
        </p>
      </div>
    `;
  }
}

/* =========================================
   DISPLAY AI PLAN
========================================= */

function displayAIPlan(
  plan,
  hotels = [],
  hotelSearch = null,
  restaurants = [],
  restaurantSearch = null
) {
  console.log(
    "DISPLAYING AI PLAN:",
    plan
  );

  console.log(
    "DISPLAYING HOTELS:",
    hotels
  );

  console.log(
    "DISPLAYING RESTAURANTS:",
    restaurants
  );

  /* =======================================
     HEADER
  ======================================= */

  if ($("planTitle")) {
    $("planTitle").textContent =
      `${trip.days}-Day ${trip.destination} Trip`;
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      plan.overview ||
      `Your personalized AI travel plan for ${trip.travelers}, built around your $${trip.budget} budget.`;
  }

  /* =======================================
     STAY
  ======================================= */

  if (plan.stay) {
    $("stay").innerHTML = `
      <div class="plan-main-text">
        ${escapeHTML(
          plan.stay.strategy || ""
        )}
      </div>

      ${
        Array.isArray(plan.stay.areas) &&
        plan.stay.areas.length
          ? `
            <div class="plan-subsection">
              <h4>
                Recommended Areas
              </h4>

              <ul>
                ${plan.stay.areas
                  .map(
                    (item) =>
                      `<li>${escapeHTML(
                        item
                      )}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        Array.isArray(plan.stay.tips) &&
        plan.stay.tips.length
          ? `
            <div class="plan-subsection">
              <h4>
                Accommodation Tips
              </h4>

              <ul>
                ${plan.stay.tips
                  .map(
                    (item) =>
                      `<li>${escapeHTML(
                        item
                      )}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;

  } else {
    $("stay").textContent =
      "Accommodation information is not available.";
  }

  /* =======================================
     REAL HOTEL RESULTS
  ======================================= */

  renderHotels(
    hotels,
    hotelSearch
  );

  /* =======================================
     REAL RESTAURANT RESULTS
  ======================================= */

  renderRestaurants(
    restaurants,
    restaurantSearch
  );

  /* =======================================
     TRANSPORT
  ======================================= */

  if (plan.transport) {
    $("transport").innerHTML = `
      <div class="plan-main-text">
        ${escapeHTML(
          plan.transport.strategy || ""
        )}
      </div>

      ${
        plan.transport.airport
          ? `
            <div class="plan-subsection">
              <h4>
                Airport Transportation
              </h4>

              <p>
                ${escapeHTML(
                  plan.transport.airport
                )}
              </p>
            </div>
          `
          : ""
      }

      ${
        Array.isArray(plan.transport.local) &&
        plan.transport.local.length
          ? `
            <div class="plan-subsection">
              <h4>
                Local Transportation
              </h4>

              <ul>
                ${plan.transport.local
                  .map(
                    (item) =>
                      `<li>${escapeHTML(
                        item
                      )}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;

  } else {
    $("transport").textContent =
      "Transportation information is not available.";
  }

  /* =======================================
     EXPERIENCES
  ======================================= */

  if (plan.experiences) {
    $("experiences").innerHTML = `
      ${
        plan.experiences.summary
          ? `
            <div class="plan-main-text">
              ${escapeHTML(
                plan.experiences.summary
              )}
            </div>
          `
          : ""
      }

      ${
        Array.isArray(plan.experiences.places) &&
        plan.experiences.places.length
          ? `
            <div class="plan-subsection">
              <h4>
                Places & Attractions
              </h4>

              <ul>
                ${plan.experiences.places
                  .map(
                    (item) =>
                      `<li>${escapeHTML(
                        item
                      )}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }

      ${
        Array.isArray(plan.experiences.food) &&
        plan.experiences.food.length
          ? `
            <div class="plan-subsection">
              <h4>
                Food Experiences
              </h4>

              <ul>
                ${plan.experiences.food
                  .map(
                    (item) =>
                      `<li>${escapeHTML(
                        item
                      )}</li>`
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    `;

  } else {
    $("experiences").textContent =
      "Experience information is not available.";
  }

  /* =======================================
     BUDGET
  ======================================= */

  if (plan.budget) {
    const accommodation =
      Number(
        plan.budget.accommodation || 0
      );

    const transportation =
      Number(
        plan.budget.transportation || 0
      );

    const food =
      Number(
        plan.budget.food || 0
      );

    const activities =
      Number(
        plan.budget.activities || 0
      );

    const other =
      Number(
        plan.budget.other || 0
      );

    const total =
      Number(
        plan.budget.total || 0
      );

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
        plan.budget.strategy
          ? `
            <div class="plan-subsection">
              <h4>
                Budget Strategy
              </h4>

              <p>
                ${escapeHTML(
                  plan.budget.strategy
                )}
              </p>
            </div>
          `
          : ""
      }
    `;

  } else {
    $("money").innerHTML = `
      <div class="budget-total">
        <span>
          Total Trip Budget
        </span>

        <strong>
          $${formatNumber(
            trip.budget
          )}
        </strong>
      </div>
    `;
  }

  /* =======================================
     DAY-BY-DAY
  ======================================= */

  if (
    Array.isArray(plan.days) &&
    plan.days.length
  ) {
    $("daysOut").innerHTML =
      plan.days
        .map(
          (day) => `
            <div class="day-card">

              <div class="day-number">
                Day ${Number(
                  day.day || 0
                )}
              </div>

              <h3>
                ${escapeHTML(
                  day.title || ""
                )}
              </h3>

              ${
                day.morning
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
                day.afternoon
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
                day.evening
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

  } else {
    $("daysOut").innerHTML = `
      <div class="day">
        <b>
          Day-by-Day Itinerary
        </b>

        <p>
          No itinerary was generated.
        </p>
      </div>
    `;
  }

  /* =======================================
     PLAN NAVIGATION
  ======================================= */

  setupPlanNavigation();

  showPlanSection("stay");
}

/* =========================================
   REAL HOTEL RENDERER
========================================= */

function renderHotels(
  hotels = [],
  hotelSearch = null
) {
  console.log(
    "========== RENDER HOTELS =========="
  );

  console.log(
    "HOTELS COUNT:",
    hotels.length
  );

  console.log(
    "HOTEL SEARCH:",
    hotelSearch
  );

  if (!$("stay")) {
    console.error(
      "STAY CONTAINER NOT FOUND"
    );

    return;
  }

  let existingHotels =
    $("liveHotelsSection");

  if (!existingHotels) {
    existingHotels =
      document.createElement("div");

    existingHotels.id =
      "liveHotelsSection";

    existingHotels.className =
      "plan-subsection";

    $("stay").appendChild(
      existingHotels
    );
  }

  /* =====================================
     PROCESSING
  ===================================== */

  if (
    hotelSearch &&
    hotelSearch.status === "processing"
  ) {
    existingHotels.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          Searching live hotel availability...
        </div>

        <p>
          Hotel search is still processing.
          Please refresh the plan shortly.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     SEARCH ERROR
  ===================================== */

  if (
    hotelSearch &&
    hotelSearch.status === "error"
  ) {
    existingHotels.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          Hotel search could not be completed.
        </div>

        <p>
          We could not retrieve live hotel options right now.
          Your personalized accommodation strategy is still available above.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     NO HOTELS
  ===================================== */

  if (
    !Array.isArray(hotels) ||
    hotels.length === 0
  ) {
    existingHotels.innerHTML = `
      <div class="hotel-results">

        <h4>
          🏨 Live Hotel Options
        </h4>

        <div class="hotel-status">
          No hotel results were returned.
        </div>

        <p>
          Try another date or destination.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     HOTEL RESULTS
  ===================================== */

  existingHotels.innerHTML = `
    <div class="hotel-results">

      <h4>
        🏨 Live Hotel Options
      </h4>

      <p class="hotel-results-intro">
        Real accommodation options found for your trip.
      </p>

      <div class="hotel-list">

        ${hotels
          .map(
            (hotel, index) =>
              renderHotelCard(
                hotel,
                index
              )
          )
          .join("")}

      </div>

      ${
        hotelSearch?.partial
          ? `
            <p class="hotel-note">
              Some results may be unavailable or incomplete.
            </p>
          `
          : ""
      }

    </div>
  `;
}

/* =========================================
   HOTEL CARD
========================================= */

function renderHotelCard(
  hotel,
  index
) {
  const name =
    hotel?.name ||
    "Unnamed property";

  const platform =
    hotel?.platform ||
    "";

  const starRating =
    hotel?.starRating;

  const guestRating =
    hotel?.guestRating;

  const reviewCount =
    hotel?.reviewCount;

  const location =
    hotel?.location;

  const url =
    hotel?.url;

  const priceInfo =
    formatHotelPrice(
      hotel?.price
    );

  const amenities =
    Array.isArray(hotel?.amenities)
      ? hotel.amenities
      : [];

  const safeUrl =
    isSafeHttpUrl(url)
      ? url
      : "";

  return `
    <div class="hotel-card">

      <div class="hotel-number">
        ${index + 1}
      </div>

      <h5 class="hotel-name">
        ${escapeHTML(name)}
      </h5>

      ${
        location
          ? `
            <div class="hotel-location">
              📍 ${escapeHTML(
                formatHotelLocation(location)
              )}
            </div>
          `
          : ""
      }

      ${
        starRating !== null &&
        starRating !== undefined &&
        starRating !== ""
          ? `
            <div class="hotel-rating">
              ⭐ ${escapeHTML(
                starRating
              )} star property
            </div>
          `
          : ""
      }

      ${
        guestRating !== null &&
        guestRating !== undefined &&
        guestRating !== ""
          ? `
            <div class="hotel-guest-rating">

              <strong>
                ${escapeHTML(
                  guestRating
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
        priceInfo
          ? `
            <div class="hotel-price">
              ${priceInfo}
            </div>
          `
          : ""
      }

      ${
        platform
          ? `
            <div class="hotel-platform">
              ${escapeHTML(
                formatPlatform(platform)
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
                .map((item) => {
                  const formatted =
                    formatAmenity(item);

                  if (!formatted) {
                    return "";
                  }

                  return `
                    <span class="hotel-amenity">
                      ${escapeHTML(
                        formatted
                      )}
                    </span>
                  `;
                })
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
              href="${escapeHTML(safeUrl)}"
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

/* =========================================
   RESTAURANT RENDERER
========================================= */

function renderRestaurants(
  restaurants = [],
  restaurantSearch = null
) {
  console.log(
    "========== RENDER RESTAURANTS =========="
  );

  console.log(
    "RESTAURANTS COUNT:",
    restaurants.length
  );

  console.log(
    "RESTAURANT SEARCH:",
    restaurantSearch
  );

  if (!$("experiences")) {
    console.error(
      "EXPERIENCES CONTAINER NOT FOUND"
    );

    return;
  }

  let existingRestaurants =
    $("liveRestaurantsSection");

  if (!existingRestaurants) {
    existingRestaurants =
      document.createElement("div");

    existingRestaurants.id =
      "liveRestaurantsSection";

    existingRestaurants.className =
      "plan-subsection";

    $("experiences").appendChild(
      existingRestaurants
    );
  }

  /* =====================================
     PROCESSING
  ===================================== */

  if (
    restaurantSearch &&
    restaurantSearch.status === "processing"
  ) {
    existingRestaurants.innerHTML = `
      <div class="restaurant-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <div class="restaurant-status">
          Searching restaurants...
        </div>

        <p>
          Finding restaurant options for your destination.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     SEARCH ERROR
  ===================================== */

  if (
    restaurantSearch &&
    restaurantSearch.status === "error"
  ) {
    existingRestaurants.innerHTML = `
      <div class="restaurant-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <div class="restaurant-status">
          Restaurant search could not be completed.
        </div>

        <p>
          We could not retrieve live restaurant options right now.
          Your AI food recommendations are still available above.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     NO RESTAURANTS
  ===================================== */

  if (
    !Array.isArray(restaurants) ||
    restaurants.length === 0
  ) {
    existingRestaurants.innerHTML = `
      <div class="restaurant-results">

        <h4>
          🍽️ Live Restaurant Options
        </h4>

        <div class="restaurant-status">
          No live restaurant results were returned.
        </div>

        <p>
          Restaurant options may not be available for this destination yet.
        </p>

      </div>
    `;

    return;
  }

  /* =====================================
     RESTAURANT RESULTS
  ===================================== */

  existingRestaurants.innerHTML = `
    <div class="restaurant-results">

      <h4>
        🍽️ Live Restaurant Options
      </h4>

      <p class="restaurant-results-intro">
        Restaurant options found for your trip.
      </p>

      <div class="restaurant-list">

        ${restaurants
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
            <p class="restaurant-note">
              Some restaurant results may be unavailable or incomplete.
            </p>
          `
          : ""
      }

    </div>
  `;
}

/* =========================================
   RESTAURANT CARD
========================================= */

function renderRestaurantCard(
  restaurant,
  index
) {
  const name =
    restaurant?.name ||
    "Unnamed restaurant";

  const cuisine =
    restaurant?.cuisine ||
    restaurant?.cuisineType ||
    "";

  const platform =
    restaurant?.platform ||
    "";

  const rating =
    restaurant?.rating ??
    restaurant?.guestRating ??
    "";

  const reviewCount =
    restaurant?.reviewCount ??
    "";

  const priceLevel =
    restaurant?.priceLevel ||
    restaurant?.price ||
    "";

  const location =
    restaurant?.location ||
    restaurant?.address ||
    "";

  const url =
    restaurant?.url ||
    restaurant?.bookingUrl ||
    restaurant?.website ||
    "";

  const openingHours =
    restaurant?.openingHours ||
    restaurant?.hours ||
    "";

  const safeUrl =
    isSafeHttpUrl(url)
      ? url
      : "";

  return `
    <div class="restaurant-card">

      <div class="restaurant-number">
        ${index + 1}
      </div>

      <h5 class="restaurant-name">
        ${escapeHTML(name)}
      </h5>

      ${
        cuisine
          ? `
            <div class="restaurant-cuisine">
              🍴 ${escapeHTML(
                formatRestaurantCuisine(cuisine)
              )}
            </div>
          `
          : ""
      }

      ${
        location
          ? `
            <div class="restaurant-location">
              📍 ${escapeHTML(
                formatRestaurantLocation(location)
              )}
            </div>
          `
          : ""
      }

      ${
        rating !== null &&
        rating !== undefined &&
        rating !== ""
          ? `
            <div class="restaurant-rating">
              ⭐ ${escapeHTML(rating)}

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
        priceLevel
          ? `
            <div class="restaurant-price">
              💰 ${escapeHTML(
                formatRestaurantPrice(
                  priceLevel
                )
              )}
            </div>
          `
          : ""
      }

      ${
        openingHours
          ? `
            <div class="restaurant-hours">
              🕒 ${escapeHTML(
                formatRestaurantHours(
                  openingHours
                )
              )}
            </div>
          `
          : ""
      }

      ${
        platform
          ? `
            <div class="restaurant-platform">
              ${escapeHTML(
                formatPlatform(platform)
              )}
            </div>
          `
          : ""
      }

      ${
        safeUrl
          ? `
            <a
              class="restaurant-button"
              href="${escapeHTML(safeUrl)}"
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
  `;
}

/* =========================================
   FORMAT RESTAURANT CUISINE
========================================= */

function formatRestaurantCuisine(
  cuisine
) {
  if (
    Array.isArray(cuisine)
  ) {
    return cuisine
      .map(
        (item) =>
          String(item)
            .replace(/_/g, " ")
      )
      .join(", ");
  }

  return String(cuisine)
    .replace(/_/g, " ");
}

/* =========================================
   FORMAT RESTAURANT LOCATION
========================================= */

function formatRestaurantLocation(
  location
) {
  if (
    typeof location === "string"
  ) {
    return location;
  }

  if (
    typeof location !== "object" ||
    !location
  ) {
    return "";
  }

  const parts = [
    location.address,
    location.area,
    location.city,
    location.country
  ]
    .filter(Boolean)
    .map(
      (item) => String(item)
    );

  return parts.join(", ");
}

/* =========================================
   FORMAT RESTAURANT PRICE
========================================= */

function formatRestaurantPrice(
  price
) {
  if (
    price === null ||
    price === undefined
  ) {
    return "";
  }

  if (
    typeof price === "number"
  ) {
    return `$${formatNumber(price)}`;
  }

  if (
    typeof price === "object"
  ) {
    if (price.formatted) {
      return String(
        price.formatted
      );
    }

    if (price.display) {
      return String(
        price.display
      );
    }

    if (price.amount) {
      return String(
        price.amount
      );
    }

    if (price.level) {
      return String(
        price.level
      );
    }
  }

  return String(price);
}

/* =========================================
   FORMAT RESTAURANT HOURS
========================================= */

function formatRestaurantHours(
  hours
) {
  if (
    typeof hours === "string"
  ) {
    return hours;
  }

  if (
    Array.isArray(hours)
  ) {
    return hours
      .map(
        (item) =>
          typeof item === "string"
            ? item
            : JSON.stringify(item)
      )
      .join(" · ");
  }

  if (
    typeof hours === "object" &&
    hours
  ) {
    if (hours.today) {
      return String(
        hours.today
      );
    }

    if (hours.open) {
      return `Open ${hours.open}`;
    }

    if (hours.display) {
      return String(
        hours.display
      );
    }
  }

  return String(hours);
}

/* =========================================
   FORMAT HOTEL PRICE
========================================= */

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
    typeof price === "number"
  ) {
    return `
      <strong>
        $${formatNumber(price)}
      </strong>
    `;
  }

  if (
    typeof price === "string"
  ) {
    const cleaned =
      price.trim();

    if (!cleaned) {
      return "";
    }

    return `
      <strong>
        ${escapeHTML(cleaned)}
      </strong>
    `;
  }

  if (
    typeof price === "object"
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
          ${escapeHTML(currency)}
          ${formatNumber(total)}
        </strong>

        <span class="hotel-nightly">
          ${escapeHTML(currency)}
          ${formatNumber(nightly)}
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
          ${escapeHTML(currency)}
          ${formatNumber(total)}
        </strong>
      `;
    }

    if (price.formatted) {
      return `
        <strong>
          ${escapeHTML(
            String(price.formatted)
          )}
        </strong>
      `;
    }

    if (price.display) {
      return `
        <strong>
          ${escapeHTML(
            String(price.display)
          )}
        </strong>
      `;
    }

    return "";
  }

  return "";
}

/* =========================================
   FORMAT NUMBER
========================================= */

function formatNumber(
  value
) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return escapeHTML(
      String(value)
    );
  }

  return number.toFixed(2);
}

/* =========================================
   FORMAT HOTEL LOCATION
========================================= */

function formatHotelLocation(
  location
) {
  if (
    typeof location === "string"
  ) {
    return location;
  }

  if (
    typeof location !== "object" ||
    !location
  ) {
    return "";
  }

  const parts = [
    location.address,
    location.area,
    location.city,
    location.country
  ]
    .filter(Boolean)
    .map(
      (item) =>
        String(item)
    );

  return parts.join(", ");
}

/* =========================================
   FORMAT PLATFORM
========================================= */

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

/* =========================================
   FORMAT AMENITY
========================================= */

function formatAmenity(
  amenity
) {
  let value = "";

  if (
    typeof amenity === "string"
  ) {
    value = amenity;

  } else if (
    typeof amenity === "object" &&
    amenity
  ) {
    value =
      amenity.name ||
      amenity.label ||
      amenity.title ||
      "";

  } else {
    value =
      String(
        amenity || ""
      );
  }

  value =
    String(value)
      .trim()
      .replace(
        /_/g,
        " "
      );

  if (!value) {
    return "";
  }

  const known = {
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

    "free parking":
      "Free parking",

    parking:
      "Parking",

    wifi:
      "Wi-Fi",

    "free wifi":
      "Free Wi-Fi",

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

  if (known[lower]) {
    return known[lower];
  }

  value =
    value.replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    );

  return value
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

/* =========================================
   SAFE URL CHECK
========================================= */

function isSafeHttpUrl(
  value
) {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  try {
    const url =
      new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );

  } catch {
    return false;
  }
}

/* =========================================
   PLAN SECTION NAVIGATION
========================================= */

function setupPlanNavigation() {
  const buttons =
    document.querySelectorAll(
      "[data-plan-section]"
    );

  /*
    Remove previous listeners safely
    by replacing each button.
  */

  buttons.forEach(
    (button) => {
      const cleanButton =
        button.cloneNode(true);

      button.parentNode.replaceChild(
        cleanButton,
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

            console.log(
              "PLAN TAB CLICKED:",
              section
            );

            showPlanSection(
              section
            );
          }
        );

      }
    );
}

/* =========================================
   SHOW PLAN SECTION
========================================= */

function showPlanSection(
  sectionName
) {
  console.log(
    "SHOW PLAN SECTION:",
    sectionName
  );

  const sections = {
    stay:
      $("staySection"),

    transport:
      $("transportSection"),

    experiences:
      $("experiencesSection"),

    money:
      $("moneySection"),

    days:
      $("daysSection")
  };

  const buttons =
    document.querySelectorAll(
      "[data-plan-section]"
    );

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

  buttons.forEach(
    (button) => {

      const key =
        button.getAttribute(
          "data-plan-section"
        );

      if (
        key === sectionName
      ) {
        button.classList.add(
          "active"
        );

      } else {
        button.classList.remove(
          "active"
        );
      }
    }
  );
}

/* =========================================
   ESCAPE HTML
========================================= */

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

/* =========================================
   FINAL APP CHECK
========================================= */

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
  "Hotels + Restaurants renderer: READY"
);

console.log(
  "================================="
);

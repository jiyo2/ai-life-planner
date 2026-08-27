const $ = (id) => document.getElementById(id);

/* =========================================================
   AI LIFE PLANNER — APP.JS
   FULL PRODUCTION VERSION
   - Interest chips
   - Trip form
   - Paddle checkout
   - AI plan generation
   - Live hotels
   - Live restaurants
   - Mobile-friendly result rendering
   - Plan navigation
========================================================= */

let trip = null;
let currentPlan = null;

/* =========================================================
   GLOBAL HELPERS
========================================================= */

function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return escapeHTML(String(value ?? ""));
  }

  return number.toFixed(2);
}

function isSafeHttpUrl(value) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/* =========================================================
   INTEREST CHIPS
========================================================= */

function activateInterestChip(chip) {
  if (!chip) return;

  chip.classList.toggle("active");

  console.log(
    "INTEREST:",
    chip.textContent.trim(),
    "ACTIVE:",
    chip.classList.contains("active")
  );
}

document.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  /*
    If the chip is inside a link/button/form,
    prevent accidental navigation/submission.
  */

  e.preventDefault();
  e.stopPropagation();

  activateInterestChip(chip);
});

/* =========================================================
   PREPARE INTEREST CHIPS
========================================================= */

function prepareInterestChips() {
  const chips = document.querySelectorAll(".chip");

  chips.forEach((chip) => {
    if (chip.tagName === "BUTTON") {
      chip.type = "button";
    }

    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-pressed",
      chip.classList.contains("active")
        ? "true"
        : "false"
    );

    chip.addEventListener("click", () => {
      chip.setAttribute(
        "aria-pressed",
        chip.classList.contains("active")
          ? "true"
          : "false"
      );
    });
  });

  console.log(
    "INTEREST CHIPS READY:",
    chips.length
  );
}

/* =========================================================
   KEYBOARD SUPPORT FOR CHIPS
========================================================= */

document.addEventListener("keydown", (e) => {
  const chip = e.target.closest(".chip");

  if (!chip) return;

  if (
    e.key === "Enter" ||
    e.key === " "
  ) {
    e.preventDefault();

    activateInterestChip(chip);

    chip.setAttribute(
      "aria-pressed",
      chip.classList.contains("active")
        ? "true"
        : "false"
    );
  }
});

/* =========================================================
   DOM READY
========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    prepareInterestChips
  );
} else {
  prepareInterestChips();
}

/* =========================================================
   TRIP FORM
========================================================= */

const form = $("plannerForm");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log(
      "========== TRIP FORM SUBMITTED =========="
    );

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
      ...document.querySelectorAll(
        ".chip.active"
      )
    ]
      .map((chip) =>
        chip.textContent.trim()
      )
      .filter(Boolean);

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!destination) {
      alert(
        "Please enter your destination."
      );

      $("destination")?.focus();
      return;
    }

    if (!days || days < 1) {
      alert(
        "Please enter the number of travel days."
      );

      $("days")?.focus();
      return;
    }

    if (!budget || budget < 1) {
      alert(
        "Please enter your travel budget."
      );

      $("budget")?.focus();
      return;
    }

    /* =====================================================
       CREATE TRIP
    ===================================================== */

    trip = {
      destination,
      start,
      days,
      budget,
      travelers,
      interests,
      notes
    };

    console.log(
      "TRIP CREATED:",
      trip
    );

    /* =====================================================
       SUMMARY
    ===================================================== */

    if ($("summary")) {
      $("summary").innerHTML = `
        <b>${escapeHTML(
          trip.destination
        )}</b><br>

        ${trip.days} days ·
        ${escapeHTML(
          trip.travelers || "1 traveler"
        )} ·
        $${formatNumber(
          trip.budget
        )} budget

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
                ${escapeHTML(
                  trip.notes
                )}
              </span>
            `
            : ""
        }
      `;
    }

    /* =====================================================
       SHOW REVIEW
    ===================================================== */

    if ($("review")) {
      $("review").classList.remove(
        "hidden"
      );

      setTimeout(() => {
        $("review")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    }
  });
}

/* =========================================================
   CLOSE REVIEW
========================================================= */

if ($("closeReview")) {
  $("closeReview").addEventListener(
    "click",
    (e) => {
      e.preventDefault();

      $("review")?.classList.add(
        "hidden"
      );
    }
  );
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
    /*
      Sandbox environment.
      Change to production only when the production
      Paddle setup is ready.
    */

    Paddle.Environment.set(
      "sandbox"
    );

    Paddle.Initialize({
      token:
        "test_2611717af9e5bf12fda64319b8b",

      eventCallback: function (event) {
        console.log(
          "========== PADDLE EVENT =========="
        );

        console.log(event);
        console.log(
          "EVENT NAME:",
          event?.name
        );

        console.log(
          "=================================="
        );

        /* =================================================
           CHECKOUT ERROR
        ================================================= */

        if (
          event?.name ===
          "checkout.error"
        ) {
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

        /* =================================================
           PAYMENT ERROR
        ================================================= */

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

        /* =================================================
           PAYMENT FAILED
        ================================================= */

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

        /* =================================================
           PAYMENT COMPLETED
        ================================================= */

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

          $("review")?.classList.add(
            "hidden"
          );

          $("app")?.classList.add(
            "hidden"
          );

          $("plan")?.classList.remove(
            "hidden"
          );

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

/* =========================================================
   PAYMENT BUTTON
========================================================= */

if ($("pay")) {
  $("pay").addEventListener(
    "click",
    (e) => {
      e.preventDefault();

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

/* =========================================================
   GENERATE AI PLAN
========================================================= */

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

    /* =====================================================
       READ TEXT FIRST
    ===================================================== */

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

    /* =====================================================
       API ERROR
    ===================================================== */

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

    /* =====================================================
       PLAN
    ===================================================== */

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

    /* =====================================================
       HOTELS
    ===================================================== */

    const hotels =
      Array.isArray(
        data?.hotels
      )
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

    /* =====================================================
       RESTAURANTS
    ===================================================== */

    const restaurants =
      Array.isArray(
        data?.restaurants
      )
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

    /* =====================================================
       SAVE PLAN
    ===================================================== */

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

/* =========================================================
   LOADING STATE
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
    $("stay").innerHTML = `
      <div class="loading-message">
        🏨 Generating accommodation strategy...
      </div>
    `;
  }

  if ($("transport")) {
    $("transport").innerHTML = `
      <div class="loading-message">
        🚆 Generating transportation strategy...
      </div>
    `;
  }

  if ($("experiences")) {
    $("experiences").innerHTML = `
      <div class="loading-message">
        📍 Generating experiences...
      </div>
    `;
  }

  if ($("money")) {
    $("money").innerHTML = `
      <div class="loading-message">
        💰 Calculating your budget...
      </div>
    `;
  }

  if ($("daysOut")) {
    $("daysOut").innerHTML = `
      <div class="day-card">

        <div class="day-number">
          AI Planner
        </div>

        <h3>
          Creating your itinerary...
        </h3>

        <p>
          Our AI is preparing your personalized
          day-by-day travel plan.
        </p>

      </div>
    `;
  }

  /*
    Remove old live result sections
    while loading a completely new plan.
  */

  $("liveHotelsSection")?.remove();
  $("liveRestaurantsSection")?.remove();
}

/* =========================================================
   ERROR STATE
========================================================= */

function showPlanError(message) {
  const safeMessage =
    message ||
    "We could not create your AI travel plan. Please try again.";

  if ($("planTitle")) {
    $("planTitle").textContent =
      "Something went wrong";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      safeMessage;
  }

  if ($("stay")) {
    $("stay").innerHTML = "";
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
    $("daysOut").innerHTML = `
      <div class="day-card">

        <div class="day-number">
          Error
        </div>

        <h3>
          AI Planner Error
        </h3>

        <p>
          ${escapeHTML(
            safeMessage
          )}
        </p>

      </div>
    `;
  }
}

/* =========================================================
   CONNECTION ERROR
========================================================= */

function showConnectionError(message) {
  const safeMessage =
    message ||
    "We could not connect to the AI travel planner.";

  if ($("planTitle")) {
    $("planTitle").textContent =
      "Connection error";
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      safeMessage;
  }

  if ($("stay")) {
    $("stay").innerHTML = "";
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
    $("daysOut").innerHTML = `
      <div class="day-card">

        <div class="day-number">
          Error
        </div>

        <h3>
          Connection Error
        </h3>

        <p>
          ${escapeHTML(
            safeMessage
          )}
        </p>

      </div>
    `;
  }
}

/* =========================================================
   DISPLAY AI PLAN
========================================================= */

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

  /* =======================================================
     CLEAN OLD LIVE RESULTS
  ======================================================= */

  $("liveHotelsSection")?.remove();
  $("liveRestaurantsSection")?.remove();

  /* =======================================================
     HEADER
  ======================================================= */

  if ($("planTitle")) {
    $("planTitle").textContent =
      `${trip.days}-Day ${trip.destination} Trip`;
  }

  if ($("planIntro")) {
    $("planIntro").textContent =
      plan.overview ||
      `Your personalized AI travel plan for ${trip.travelers || "your trip"}, built around your $${trip.budget} budget.`;
  }

  /* =======================================================
     STAY
  ======================================================= */

  if ($("stay")) {
    if (plan.stay) {
      $("stay").innerHTML = `
        <div class="plan-main-text">
          ${escapeHTML(
            plan.stay.strategy || ""
          )}
        </div>

        ${
          Array.isArray(
            plan.stay.areas
          ) &&
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
          Array.isArray(
            plan.stay.tips
          ) &&
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
  }

  /* =======================================================
     LIVE HOTELS
  ======================================================= */

  renderHotels(
    hotels,
    hotelSearch
  );

  /* =======================================================
     EXPERIENCES
  ======================================================= */

  if ($("experiences")) {
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
          Array.isArray(
            plan.experiences.places
          ) &&
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
          Array.isArray(
            plan.experiences.food
          ) &&
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
  }

  /* =======================================================
     LIVE RESTAURANTS
  ======================================================= */

  renderRestaurants(
    restaurants,
    restaurantSearch
  );

  /* =======================================================
     TRANSPORT
  ======================================================= */

  if ($("transport")) {
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
          Array.isArray(
            plan.transport.local
          ) &&
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
  }

  /* =======================================================
     BUDGET
  ======================================================= */

  if ($("money")) {
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
  }

  /* =======================================================
     DAY-BY-DAY
  ======================================================= */

  if ($("daysOut")) {
    if (
      Array.isArray(plan.days) &&
      plan.days.length
    ) {
      $("daysOut").innerHTML =
        plan.days
          .map(
            (day, index) => `
              <div class="day-card">

                <div class="day-number">
                  Day ${Number(
                    day.day ||
                    index + 1
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
        <div class="day-card">

          <div class="day-number">
            Itinerary
          </div>

          <h3>
            Day-by-Day Itinerary
          </h3>

          <p>
            No itinerary was generated.
          </p>

        </div>
      `;
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  setupPlanNavigation();

  showPlanSection("stay");

  /* =======================================================
     SCROLL TO PLAN
  ======================================================= */

  setTimeout(() => {
    $("plan")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 100);
}

/* =========================================================
   LIVE HOTEL RENDERER
========================================================= */

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

  if (!$("stay")) {
    console.error(
      "STAY CONTAINER NOT FOUND"
    );

    return;
  }

  /*
    Remove previous result section
    before creating a new one.
  */

  $("liveHotelsSection")?.remove();

  const existingHotels =
    document.createElement("div");

  existingHotels.id =
    "liveHotelsSection";

  existingHotels.className =
    "plan-subsection live-results-section";

  $("stay").appendChild(
    existingHotels
  );

  /* =======================================================
     PROCESSING
  ======================================================= */

  if (
    hotelSearch &&
    hotelSearch.status ===
      "processing"
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

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    hotelSearch &&
    hotelSearch.status ===
      "error"
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

  /* =======================================================
     NO RESULTS
  ======================================================= */

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

  /* =======================================================
     RESULTS
  ======================================================= */

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
    Array.isArray(
      hotel?.amenities
    )
      ? hotel.amenities
      : [];

  const safeUrl =
    isSafeHttpUrl(url)
      ? url
      : "";

  return `
    <article class="hotel-card">

      <div class="hotel-number">
        ${index + 1}
      </div>

      <div class="hotel-card-content">

        <h5 class="hotel-name">
          ${escapeHTML(name)}
        </h5>

        ${
          location
            ? `
              <div class="hotel-location">
                📍 ${escapeHTML(
                  formatHotelLocation(
                    location
                  )
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
                  formatPlatform(
                    platform
                  )
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
                    (item) => {
                      const formatted =
                        formatAmenity(
                          item
                        );

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
                    }
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

    </article>
  `;
}

/* =========================================================
   LIVE RESTAURANTS
========================================================= */

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

  if (!$("experiences")) {
    console.error(
      "EXPERIENCES CONTAINER NOT FOUND"
    );

    return;
  }

  $("liveRestaurantsSection")?.remove();

  const existingRestaurants =
    document.createElement("div");

  existingRestaurants.id =
    "liveRestaurantsSection";

  existingRestaurants.className =
    "plan-subsection live-results-section";

  $("experiences").appendChild(
    existingRestaurants
  );

  /* =======================================================
     PROCESSING
  ======================================================= */

  if (
    restaurantSearch &&
    restaurantSearch.status ===
      "processing"
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

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    restaurantSearch &&
    restaurantSearch.status ===
      "error"
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

  /* =======================================================
     NO RESULTS
  ======================================================= */

  if (
    !Array.isArray(
      restaurants
    ) ||
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

  /* =======================================================
     RESULTS
  ======================================================= */

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

/* =========================================================
   RESTAURANT CARD
========================================================= */

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
    <article class="restaurant-card">

      <div class="restaurant-number">
        ${index + 1}
      </div>

      <div class="restaurant-card-content">

        <h5 class="restaurant-name">
          ${escapeHTML(name)}
        </h5>

        ${
          cuisine
            ? `
              <div class="restaurant-cuisine">
                🍴 ${escapeHTML(
                  formatRestaurantCuisine(
                    cuisine
                  )
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
                  formatRestaurantLocation(
                    location
                  )
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
                ⭐ ${escapeHTML(
                  rating
                )}

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
                  formatPlatform(
                    platform
                  )
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
                href="${escapeHTML(
                  safeUrl
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

    </article>
  `;
}

/* =========================================================
   RESTAURANT CUISINE
========================================================= */

function formatRestaurantCuisine(
  cuisine
) {
  if (Array.isArray(cuisine)) {
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

/* =========================================================
   RESTAURANT LOCATION
========================================================= */

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
      (item) =>
        String(item)
    );

  return parts.join(", ");
}

/* =========================================================
   RESTAURANT PRICE
========================================================= */

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
    return `$${formatNumber(
      price
    )}`;
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

/* =========================================================
   RESTAURANT HOURS
========================================================= */

function formatRestaurantHours(
  hours
) {
  if (
    typeof hours === "string"
  ) {
    return hours;
  }

  if (Array.isArray(hours)) {
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
    typeof price === "number"
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
    typeof price === "string"
  ) {
    const cleaned =
      price.trim();

    if (!cleaned) {
      return "";
    }

    return `
      <strong>
        ${escapeHTML(
          cleaned
        )}
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

    if (price.formatted) {
      return `
        <strong>
          ${escapeHTML(
            String(
              price.formatted
            )
          )}
        </strong>
      `;
    }

    if (price.display) {
      return `
        <strong>
          ${escapeHTML(
            String(
              price.display
            )
          )}
        </strong>
      `;
    }

    return "";
  }

  return "";
}

/* =========================================================
   HOTEL LOCATION
========================================================= */

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

/* =========================================================
   PLATFORM
========================================================= */

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

  const lower =
    value.toLowerCase();

  if (
    lower === "booking" ||
    lower === "booking.com"
  ) {
    return "Booking.com";
  }

  return value;
}

/* =========================================================
   AMENITY
========================================================= */

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

/* =========================================================
   PLAN NAVIGATION
========================================================= */

function setupPlanNavigation() {
  const buttons =
    document.querySelectorAll(
      "[data-plan-section]"
    );

  buttons.forEach(
    (button) => {
      /*
        Prevent buttons from submitting
        the original planner form.
      */

      if (
        button.tagName ===
        "BUTTON"
      ) {
        button.type = "button";
      }

      /*
        Avoid duplicated listeners.
      */

      if (
        button.dataset.planListener ===
        "true"
      ) {
        return;
      }

      button.dataset.planListener =
        "true";

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

/* =========================================================
   SHOW PLAN SECTION
========================================================= */

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

        button.setAttribute(
          "aria-selected",
          "true"
        );
      } else {
        button.classList.remove(
          "active"
        );

        button.setAttribute(
          "aria-selected",
          "false"
        );
      }
    }
  );

  /*
    Mobile UX:
    after selecting a section, scroll
    to the plan content.
  */

  if (
    window.innerWidth <= 768
  ) {
    const target =
      sections[
        sectionName
      ];

    if (target) {
      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    }
  }
}

/* =========================================================
   MOBILE SAFETY
   Add lightweight classes without requiring
   HTML changes.
========================================================= */

function prepareMobileResults() {
  document
    .querySelectorAll(
      ".hotel-list"
    )
    .forEach(
      (list) => {
        list.classList.add(
          "mobile-friendly-list"
        );
      }
    );

  document
    .querySelectorAll(
      ".restaurant-list"
    )
    .forEach(
      (list) => {
        list.classList.add(
          "mobile-friendly-list"
        );
      }
    );
}

/* =========================================================
   FINAL APP CHECK
========================================================= */

prepareMobileResults();

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
  "Paddle:",
  typeof Paddle !== "undefined"
);

console.log(
  "Hotels renderer: READY"
);

console.log(
  "Restaurants renderer: READY"
);

console.log(
  "Mobile improvements: READY"
);

console.log(
  "================================="
);

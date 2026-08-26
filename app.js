const $ = (id) => document.getElementById(id);

/* =========================================
   INTEREST CHIPS
========================================= */

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
  });
});

let trip = null;
let currentPlan = null;

/* =========================================
   TRIP FORM
========================================= */

const form = $("plannerForm");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    trip = {
      destination: $("destination").value.trim(),
      start: $("startDate").value,
      days: Number($("days").value),
      budget: Number($("budget").value),
      travelers: $("travelers").value,
      interests: [...document.querySelectorAll(".chip.active")].map(
        (chip) => chip.textContent.trim()
      ),
      notes: $("notes").value.trim()
    };

    console.log("TRIP CREATED:", trip);

    $("summary").innerHTML = `
      <b>${escapeHTML(trip.destination)}</b><br>
      ${trip.days} days · ${escapeHTML(trip.travelers)} · $${trip.budget} budget<br>
      ${
        trip.interests.map(escapeHTML).join(" · ") ||
        "General trip"
      }
      ${
        trip.notes
          ? `<br><span>${escapeHTML(trip.notes)}</span>`
          : ""
      }
    `;

    $("review").classList.remove("hidden");
  });
}

/* =========================================
   CLOSE REVIEW
========================================= */

if ($("closeReview")) {
  $("closeReview").addEventListener("click", () => {
    $("review").classList.add("hidden");
  });
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
      token: "test_2611717af9e5bf12fda64319b8b",

      eventCallback: function (event) {
        console.log("========== PADDLE EVENT ==========");
        console.log(event);
        console.log("EVENT NAME:", event?.name);
        console.log("==================================");

        /* CHECKOUT ERROR */

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

        /* PAYMENT ERROR */

        if (event?.name === "checkout.payment.error") {
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

        /* PAYMENT FAILED */

        if (event?.name === "checkout.payment.failed") {
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

        /* =====================================
           PAYMENT COMPLETED
        ===================================== */

        if (event?.name === "checkout.completed") {
          console.log("PAYMENT COMPLETED");
          console.log("TRIP BEFORE AI:", trip);

          if (!trip) {
            console.error(
              "TRIP DATA IS MISSING AFTER PAYMENT"
            );

            showPlanError(
              "Your payment was completed, but your trip information was lost."
            );

            return;
          }

          $("review").classList.add("hidden");
          $("app").classList.add("hidden");

          $("plan").classList.remove("hidden");

          console.log("PLAN SCREEN SHOWN");

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
  console.error("PADDLE SDK NOT FOUND");
}

/* =========================================
   PAYMENT BUTTON
========================================= */

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

    console.log(
      "OPENING PADDLE CHECKOUT"
    );

    try {
      Paddle.Checkout.open({
        items: [
          {
            priceId: "pri_01m0x953caxgk28jt53p58dm63",
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
    console.error("NO TRIP DATA");

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

    const response = await fetch(
      "/api/plan",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify(trip)
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
       READ RESPONSE AS TEXT FIRST
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

    const plan = data?.plan;

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
      data?.hotelSearch || null;

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

    currentPlan = plan;

    displayAIPlan(
      plan,
      hotels,
      hotelSearch
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
  $("planTitle").textContent =
    "Creating your personalized plan...";

  $("planIntro").textContent =
    "Our AI is building your itinerary. Please wait a moment.";

  $("stay").textContent =
    "Generating accommodation strategy...";

  $("transport").textContent =
    "Generating transportation strategy...";

  $("experiences").textContent =
    "Generating experiences...";

  $("money").textContent =
    "Calculating your budget...";

  $("daysOut").innerHTML = `
    <div class="day">
      <b>AI Travel Planner</b>
      <p>
        Creating your personalized day-by-day itinerary...
      </p>
    </div>
  `;
}

/* =========================================
   ERROR STATE
========================================= */

function showPlanError(message) {
  $("planTitle").textContent =
    "Something went wrong";

  $("planIntro").textContent =
    message ||
    "We could not create your AI travel plan. Please try again.";

  $("stay").textContent = "";
  $("transport").textContent = "";
  $("experiences").textContent = "";
  $("money").textContent = "";

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

/* =========================================
   CONNECTION ERROR
========================================= */

function showConnectionError(message) {
  $("planTitle").textContent =
    "Connection error";

  $("planIntro").textContent =
    message ||
    "We could not connect to the AI travel planner.";

  $("stay").textContent = "";
  $("transport").textContent = "";
  $("experiences").textContent = "";
  $("money").textContent = "";

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

/* =========================================
   DISPLAY AI PLAN
========================================= */

function displayAIPlan(
  plan,
  hotels = [],
  hotelSearch = null
) {
  console.log(
    "DISPLAYING AI PLAN:",
    plan
  );

  console.log(
    "DISPLAYING HOTELS:",
    hotels
  );

  $("planTitle").textContent =
    `${trip.days}-Day ${trip.destination} Trip`;

  $("planIntro").textContent =
    plan.overview ||
    `Your personalized AI travel plan for ${trip.travelers}, built around your $${trip.budget} budget.`;

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
              <h4>Recommended Areas</h4>

              <ul>
                ${plan.stay.areas
                  .map(
                    (item) =>
                      `<li>${escapeHTML(item)}</li>`
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
              <h4>Accommodation Tips</h4>

              <ul>
                ${plan.stay.tips
                  .map(
                    (item) =>
                      `<li>${escapeHTML(item)}</li>`
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
              <h4>Airport Transportation</h4>

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
              <h4>Local Transportation</h4>

              <ul>
                ${plan.transport.local
                  .map(
                    (item) =>
                      `<li>${escapeHTML(item)}</li>`
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
        Array.isArray(
          plan.experiences.places
        ) &&
        plan.experiences.places.length
          ? `
            <div class="plan-subsection">
              <h4>Places & Attractions</h4>

              <ul>
                ${plan.experiences.places
                  .map(
                    (item) =>
                      `<li>${escapeHTML(item)}</li>`
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
              <h4>Food Experiences</h4>

              <ul>
                ${plan.experiences.food
                  .map(
                    (item) =>
                      `<li>${escapeHTML(item)}</li>`
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
          <span>🏨 Accommodation</span>
          <strong>$${accommodation}</strong>
        </div>

        <div class="budget-item">
          <span>🚆 Transportation</span>
          <strong>$${transportation}</strong>
        </div>

        <div class="budget-item">
          <span>🍴 Food</span>
          <strong>$${food}</strong>
        </div>

        <div class="budget-item">
          <span>🎟️ Activities</span>
          <strong>$${activities}</strong>
        </div>

        <div class="budget-item">
          <span>💵 Other</span>
          <strong>$${other}</strong>
        </div>

      </div>

      <div class="budget-total">
        <span>Estimated Total</span>
        <strong>$${total}</strong>
      </div>

      ${
        plan.budget.strategy
          ? `
            <div class="plan-subsection">
              <h4>Budget Strategy</h4>

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
        <span>Total Trip Budget</span>
        <strong>$${trip.budget}</strong>
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
                Day ${Number(day.day || 0)}
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
                      <span>🌅 Morning</span>

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
                      <span>☀️ Afternoon</span>

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
                      <span>🌙 Evening</span>

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
        <b>Day-by-Day Itinerary</b>
        <p>No itinerary was generated.</p>
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

  /* =====================================
     FIND OR CREATE HOTEL SECTION
  ===================================== */

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
     SEARCH PROCESSING
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
    <div class="hotel-card">

      <!-- NUMBER -->

      <div class="hotel-number">
        ${index + 1}
      </div>

      <!-- HOTEL NAME -->

      <h5 class="hotel-name">
        ${escapeHTML(name)}
      </h5>

      <!-- LOCATION -->

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

      <!-- STAR RATING -->

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

      <!-- GUEST RATING -->

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

      <!-- PRICE -->

      ${
        priceInfo
          ? `
            <div class="hotel-price">
              ${priceInfo}
            </div>
          `
          : ""
      }

      <!-- PLATFORM -->

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

      <!-- AMENITIES -->

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

      <!-- VIEW HOTEL -->

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

  /* =====================================
     NUMBER
  ===================================== */

  if (
    typeof price === "number"
  ) {
    return `
      <strong>
        $${formatNumber(price)}
      </strong>
    `;
  }

  /* =====================================
     STRING
  ===================================== */

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

  /* =====================================
     OBJECT
  ===================================== */

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

    /* =================================
       TOTAL + NIGHTLY
    ================================= */

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
          )} ${formatNumber(total)}
        </strong>

        <span class="hotel-nightly">
          ${escapeHTML(
            currency
          )} ${formatNumber(nightly)} / night
        </span>
      `;
    }

    /* =================================
       TOTAL ONLY
    ================================= */

    if (
      total !== null &&
      total !== undefined
    ) {
      return `
        <strong>
          ${escapeHTML(
            currency
          )} ${formatNumber(total)}
        </strong>
      `;
    }

    /* =================================
       FORMATTED VALUE
    ================================= */

    if (
      price.formatted
    ) {
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

    if (
      price.display
    ) {
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
  }

  else if (
    typeof amenity === "object" &&
    amenity
  ) {
    value =
      amenity.name ||
      amenity.label ||
      amenity.title ||
      "";
  }

  else {
    value =
      String(
        amenity || ""
      );
  }

  value =
    String(value)
      .trim()
      .replace(/_/g, " ");

  if (!value) {
    return "";
  }

  /* =====================================
     SPECIAL AMENITIES
  ===================================== */

  const known = {
    air conditioning:
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

    free parking:
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

    swimming pool:
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

  /* =====================================
     WORD SPLITTING
  ===================================== */

  value =
    value.replace(
      /([a-z])([A-Z])/g,
      "$1 $2"
    );

  /* =====================================
     CAPITALIZE
  ===================================== */

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
      url.protocol ===
        "https:" ||
      url.protocol ===
        "http:"
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

  buttons.forEach((button) => {
    const cleanButton =
      button.cloneNode(true);

    button.parentNode.replaceChild(
      cleanButton,
      button
    );
  });

  document
    .querySelectorAll(
      "[data-plan-section]"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

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

    });
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

  Object.keys(sections).forEach(
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

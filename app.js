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

    $("summary").innerHTML = `
      <b>${escapeHTML(trip.destination)}</b><br>
      ${trip.days} days · ${escapeHTML(trip.travelers)} traveler(s) · $${trip.budget} budget<br>
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

if (typeof Paddle !== "undefined") {

  Paddle.Environment.set("sandbox");

  Paddle.Initialize({
    token: "test_2611717af9e5bf12fda64319b8b",

    eventCallback: function (event) {

      console.log("PADDLE EVENT:", event);

      /* CHECKOUT ERROR */

      if (event.name === "checkout.error") {
        console.error("PADDLE CHECKOUT ERROR:", event);

        alert(
          "Paddle checkout error: " +
          (event.detail || event.code || "Unknown error")
        );

        return;
      }

      /* PAYMENT ERROR */

      if (event.name === "checkout.payment.error") {
        console.error("PADDLE PAYMENT ERROR:", event);

        alert(
          "Payment error: " +
          (event.detail || event.code || "Unknown payment error")
        );

        return;
      }

      /* PAYMENT FAILED */

      if (event.name === "checkout.payment.failed") {
        console.error("PADDLE PAYMENT FAILED:", event);

        alert(
          "Payment failed: " +
          (event.detail || "Please try again.")
        );

        return;
      }

      /* PAYMENT COMPLETED */

      if (event.name === "checkout.completed") {

        console.log("PAYMENT COMPLETED:", event);

        if (!trip) {
          console.error("Trip data is missing.");
          return;
        }

        $("review").classList.add("hidden");
        $("app").classList.add("hidden");
        $("plan").classList.remove("hidden");

        generateAIPlan();
      }
    }
  });
}

/* =========================================
   PAYMENT BUTTON
========================================= */

if ($("pay")) {

  $("pay").addEventListener("click", () => {

    if (!trip) {
      alert("Please complete your trip details first.");
      return;
    }

    if (typeof Paddle === "undefined") {
      alert("Payment system is not available.");
      return;
    }

    Paddle.Checkout.open({
      items: [
        {
          priceId: "pri_01m0x953caxgk28jt53p58dm63",
          quantity: 1
        }
      ]
    });

  });
}

/* =========================================
   GENERATE AI PLAN
========================================= */

async function generateAIPlan() {

  if (!trip) {
    return;
  }

  setLoadingState();

  try {

    const response = await fetch("/api/plan", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(trip)
    });

    const data = await response.json();

    console.log("AI PLAN RESPONSE:", data);

    if (!response.ok) {

      console.error("AI PLAN ERROR:", data);

      showPlanError();

      return;
    }

    const plan = data.plan;

    if (!plan) {
      throw new Error("No plan returned from AI");
    }

    currentPlan = plan;

    displayAIPlan(plan);

  } catch (error) {

    console.error("AI CONNECTION ERROR:", error);

    showConnectionError();
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
      <p>Creating your personalized day-by-day itinerary...</p>
    </div>
  `;
}

/* =========================================
   ERROR STATE
========================================= */

function showPlanError() {

  $("planTitle").textContent =
    "Something went wrong";

  $("planIntro").textContent =
    "We could not create your AI travel plan. Please try again.";

  $("stay").textContent = "";
  $("transport").textContent = "";
  $("experiences").textContent = "";
  $("money").textContent = "";

  $("daysOut").innerHTML = `
    <div class="day">
      <b>AI Planner Error</b>
      <p>Please try again later.</p>
    </div>
  `;
}

/* =========================================
   CONNECTION ERROR
========================================= */

function showConnectionError() {

  $("planTitle").textContent =
    "Connection error";

  $("planIntro").textContent =
    "We could not connect to the AI travel planner.";

  $("stay").textContent = "";
  $("transport").textContent = "";
  $("experiences").textContent = "";
  $("money").textContent = "";

  $("daysOut").innerHTML = `
    <div class="day">
      <b>Connection Error</b>
      <p>Please try again later.</p>
    </div>
  `;
}

/* =========================================
   DISPLAY AI PLAN
========================================= */

function displayAIPlan(plan) {

  $("planTitle").textContent =
    `${trip.days}-Day ${trip.destination} Trip`;

  $("planIntro").textContent =
    plan.overview ||
    `Your personalized AI travel plan for ${trip.travelers} traveler(s), built around your $${trip.budget} budget.`;

  /* =======================================
     STAY
  ======================================= */

  if (plan.stay) {

    $("stay").innerHTML = `

      <div class="plan-main-text">
        ${escapeHTML(plan.stay.strategy || "")}
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
     TRANSPORT
  ======================================= */

  if (plan.transport) {

    $("transport").innerHTML = `

      <div class="plan-main-text">
        ${escapeHTML(plan.transport.strategy || "")}
      </div>

      ${
        plan.transport.airport
          ? `
            <div class="plan-subsection">
              <h4>Airport Transportation</h4>
              <p>${escapeHTML(plan.transport.airport)}</p>
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
              ${escapeHTML(plan.experiences.summary)}
            </div>
          `
          : ""
      }

      ${
        Array.isArray(plan.experiences.places) &&
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
        Array.isArray(plan.experiences.food) &&
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
      Number(plan.budget.accommodation || 0);

    const transportation =
      Number(plan.budget.transportation || 0);

    const food =
      Number(plan.budget.food || 0);

    const activities =
      Number(plan.budget.activities || 0);

    const other =
      Number(plan.budget.other || 0);

    const total =
      Number(plan.budget.total || 0);

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
              <p>${escapeHTML(plan.budget.strategy)}</p>
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

    $("daysOut").innerHTML = plan.days
      .map(
        (day) => `

          <div class="day-card">

            <div class="day-number">
              Day ${Number(day.day || 0)}
            </div>

            <h3>
              ${escapeHTML(day.title || "")}
            </h3>

            ${
              day.morning
                ? `
                  <div class="day-period">
                    <span>🌅 Morning</span>
                    <p>${escapeHTML(day.morning)}</p>
                  </div>
                `
                : ""
            }

            ${
              day.afternoon
                ? `
                  <div class="day-period">
                    <span>☀️ Afternoon</span>
                    <p>${escapeHTML(day.afternoon)}</p>
                  </div>
                `
                : ""
            }

            ${
              day.evening
                ? `
                  <div class="day-period">
                    <span>🌙 Evening</span>
                    <p>${escapeHTML(day.evening)}</p>
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
     ACTIVATE SECTION NAVIGATION
  ======================================= */

  setupPlanNavigation();

  /* Show first section */
  showPlanSection("stay");
}

/* =========================================
   PLAN SECTION NAVIGATION
========================================= */

function setupPlanNavigation() {

  const buttons = document.querySelectorAll(
    "[data-plan-section]"
  );

  buttons.forEach((button) => {

    button.addEventListener("click", () => {

      const section =
        button.getAttribute("data-plan-section");

      showPlanSection(section);

    });

  });
}

/* =========================================
   SHOW PLAN SECTION
========================================= */

function showPlanSection(sectionName) {

  const sections = {
    stay: $("stay"),
    transport: $("transport"),
    experiences: $("experiences"),
    money: $("money"),
    days: $("daysOut")
  };

  const buttons =
    document.querySelectorAll(
      "[data-plan-section]"
    );

  Object.keys(sections).forEach((key) => {

    if (!sections[key]) {
      return;
    }

    if (key === sectionName) {

      sections[key].classList.remove("plan-section-hidden");
      sections[key].classList.add("plan-section-visible");

    } else {

      sections[key].classList.remove("plan-section-visible");
      sections[key].classList.add("plan-section-hidden");

    }

  });

  buttons.forEach((button) => {

    const key =
      button.getAttribute("data-plan-section");

    if (key === sectionName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }

  });

}

/* =========================================
   ESCAPE HTML
========================================= */

function escapeHTML(text) {

  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
    }

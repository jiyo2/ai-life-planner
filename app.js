const $ = (id) => document.getElementById(id);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
  });
});

let trip = null;

/* ================================
   TRIP FORM
================================ */

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
      <b>${trip.destination}</b><br>
      ${trip.days} days · ${trip.travelers} traveler(s) · $${trip.budget} budget<br>
      ${trip.interests.join(" · ") || "General trip"}
      ${
        trip.notes
          ? `<br><span>${trip.notes}</span>`
          : ""
      }
    `;

    $("review").classList.remove("hidden");
  });
}

/* ================================
   CLOSE REVIEW
================================ */

if ($("closeReview")) {
  $("closeReview").addEventListener("click", () => {
    $("review").classList.add("hidden");
  });
}

/* ================================
   PADDLE SANDBOX
================================ */

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

/* ================================
   PAYMENT BUTTON
================================ */

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

/* ================================
   GENERATE AI PLAN
================================ */

async function generateAIPlan() {
  if (!trip) {
    return;
  }

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

      return;
    }

    const plan = data.plan || "No plan was generated.";

    displayAIPlan(plan);

  } catch (error) {
    console.error("AI CONNECTION ERROR:", error);

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
}

/* ================================
   DISPLAY AI PLAN
================================ */

function displayAIPlan(plan) {
  $("planTitle").textContent =
    `${trip.days}-Day ${trip.destination} Trip`;

  $("planIntro").textContent =
    `Your personalized AI travel plan for ${trip.travelers} traveler(s), ` +
    `built around your $${trip.budget} budget.`;

  $("stay").textContent =
    "Your personalized accommodation recommendations are included in your AI-generated plan below.";

  $("transport").textContent =
    "Your transportation recommendations are included in your AI-generated plan below.";

  $("experiences").textContent =
    "Your activities, attractions and food recommendations are included in your AI-generated plan below.";

  $("money").textContent =
    `Total trip budget: $${trip.budget}`;

  $("daysOut").innerHTML = `
    <div class="day">
      <b>Your AI Travel Plan</b>
      <p>${formatAIText(plan)}</p>
    </div>
  `;
}

/* ================================
   FORMAT AI TEXT
================================ */

function formatAIText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
        }

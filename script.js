document.addEventListener("DOMContentLoaded", () => {

  console.log("AI LIFE PLANNER — TEST MODE");

  /* =========================================================
     UI ELEMENTS
  ========================================================= */

  const plannerForm = document.getElementById("plannerForm");
  const appScreen = document.getElementById("app");
  const reviewScreen = document.getElementById("review");
  const planScreen = document.getElementById("plan");

  const summaryDiv = document.getElementById("summary");

  const closeReviewBtn =
    document.getElementById("closeReview");

  const payBtn =
    document.getElementById("pay");

  const selectedInterests = new Set();

  let formData = {};

  /* =========================================================
     HELPERS
  ========================================================= */

  function escapeHTML(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showScreen(screen) {

    [appScreen, reviewScreen, planScreen]
      .forEach(el => {

        if (!el) return;

        el.classList.add("hidden");

      });

    if (screen) {
      screen.classList.remove("hidden");
    }
  }

  function getValue(value) {

    if (
      value === null ||
      value === undefined
    ) {
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
        "name",
        "title",
        "label",
        "value",
        "amount",
        "price",
        "description"
      ];

      for (const key of keys) {

        if (
          value[key] !== null &&
          value[key] !== undefined
        ) {

          const result =
            getValue(value[key]);

          if (result) {
            return result;
          }

        }

      }

      return "";
    }

    return "";
  }

  function getNumber(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    if (typeof value === "number") {

      return Number.isFinite(value)
        ? value
        : null;

    }

    if (typeof value === "string") {

      const cleaned =
        value
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, "");

      const number =
        Number(cleaned);

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
        "nightly_price"
      ];

      for (const key of keys) {

        if (
          value[key] !== null &&
          value[key] !== undefined
        ) {

          const result =
            getNumber(value[key]);

          if (result !== null) {
            return result;
          }

        }

      }

    }

    return null;
  }

  function formatUSD(value) {

    const number =
      getNumber(value);

    if (number === null) {
      return "";
    }

    return "$" +
      number.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 2
        }
      );
  }

  /* =========================================================
     INTEREST CHIPS
  ========================================================= */

  const chips =
    document.querySelectorAll(".chip");

  console.log(
    "INTEREST CHIPS:",
    chips.length
  );

  chips.forEach(chip => {

    chip.addEventListener("click", () => {

      const interest =
        chip.textContent.trim();

      if (
        selectedInterests.has(
          interest
        )
      ) {

        selectedInterests.delete(
          interest
        );

        chip.classList.remove(
          "active"
        );

      } else {

        selectedInterests.add(
          interest
        );

        chip.classList.add(
          "active"
        );

      }

      console.log(
        "Selected interests:",
        Array.from(selectedInterests)
      );

    });

  });

  /* =========================================================
     FORM SUBMISSION
  ========================================================= */

  if (plannerForm) {

    plannerForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        formData = {

          destination:
            document
              .getElementById("destination")
              ?.value
              .trim() || "",

          startDate:
            document
              .getElementById("startDate")
              ?.value || "",

          days:
            Number(
              document
                .getElementById("days")
                ?.value || 0
            ),

          budget:
            Number(
              document
                .getElementById("budget")
                ?.value || 0
            ),

          travelers:
            document
              .getElementById("travelers")
              ?.value || "1 traveler",

          interests:
            Array.from(
              selectedInterests
            ).join(", ") ||
            "General Sightseeing",

          notes:
            document
              .getElementById("notes")
              ?.value
              .trim() || "None"

        };

        console.log(
          "FORM DATA:",
          formData
        );

        if (!formData.destination) {

          alert(
            "Please enter a destination."
          );

          return;
        }

        if (
          !Number.isFinite(
            formData.days
          ) ||
          formData.days < 1
        ) {

          alert(
            "Please enter a valid number of days."
          );

          return;
        }

        if (
          !Number.isFinite(
            formData.budget
          ) ||
          formData.budget <= 0
        ) {

          alert(
            "Please enter a valid budget."
          );

          return;
        }

        /* =====================================================
           REVIEW
        ===================================================== */

        summaryDiv.innerHTML = `

          <p>
            📍
            <strong>Destination:</strong>
            ${escapeHTML(
              formData.destination
            )}
          </p>

          <p>
            📅
            <strong>Duration:</strong>
            ${escapeHTML(
              formData.days
            )}
            days
          </p>

          <p>
            🗓️
            <strong>Start date:</strong>
            ${
              formData.startDate
                ? escapeHTML(
                    formData.startDate
                  )
                : "Flexible"
            }
          </p>

          <p>
            💰
            <strong>Budget limit:</strong>
            ${formatUSD(
              formData.budget
            )}
          </p>

          <p>
            👥
            <strong>Travelers:</strong>
            ${escapeHTML(
              formData.travelers
            )}
          </p>

          <p>
            🎯
            <strong>Interests:</strong>
            ${escapeHTML(
              formData.interests
            )}
          </p>

          <p>
            📝
            <strong>Special requests:</strong>
            ${escapeHTML(
              formData.notes
            )}
          </p>

        `;

        showScreen(
          reviewScreen
        );

      }
    );

  }

  /* =========================================================
     EDIT BUTTON
  ========================================================= */

  if (closeReviewBtn) {

    closeReviewBtn.addEventListener(
      "click",
      event => {

        event.preventDefault();

        showScreen(
          appScreen
        );

      }
    );

  }

  /* =========================================================
     TEST MODE CREATE PLAN
     
     IMPORTANT:
     NO PADDLE
     NO REDIRECT
     NO FAKE PAYMENT
  ========================================================= */

  if (payBtn) {

    payBtn.addEventListener(
      "click",
      async event => {

        event.preventDefault();

        console.log(
          "TEST MODE: CREATE PLAN CLICKED"
        );

        await createPlan();

      }
    );

  }

  /* =========================================================
     CREATE PLAN
  ========================================================= */

  async function createPlan() {

    console.log(
      "================================="
    );

    console.log(
      "CREATING AI TRAVEL PLAN"
    );

    console.log(
      "FORM DATA:",
      formData
    );

    console.log(
      "================================="
    );

    showScreen(
      planScreen
    );

    /* =======================================================
       RESET PLAN UI
    ======================================================= */

    setText(
      "planTitle",
      "Creating your personalized plan..."
    );

    setText(
      "planIntro",
      "Our AI is building your itinerary. Please wait a moment."
    );

    setHTML(
      "stayContent",
      `
        <div class="planner-status">
          🏨 Generating accommodation strategy...
        </div>
      `
    );

    setHTML(
      "transportContent",
      `
        <div class="planner-status">
          🚆 Generating transportation strategy...
        </div>
      `
    );

    setHTML(
      "experiencesContent",
      `
        <div class="planner-status">
          📍 Generating experiences...
        </div>
      `
    );

    setHTML(
      "moneyContent",
      `
        <div class="planner-status">
          💰 Calculating your budget...
        </div>
      `
    );

    setHTML(
      "daysContent",
      `
        <div class="planner-status">
          📅 Creating your day-by-day itinerary...
        </div>
      `
    );

    try {

      /* =====================================================
         API REQUEST
      ===================================================== */

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
                  formData.destination,

                startDate:
                  formData.startDate,

                days:
                  formData.days,

                budget:
                  formData.budget,

                travelers:
                  formData.travelers,

                interests:
                  formData.interests,

                notes:
                  formData.notes

              })

          }
        );

      console.log(
        "API STATUS:",
        response.status
      );

      /* =====================================================
         READ RESPONSE
      ===================================================== */

      let data = null;

      try {

        data =
          await response.json();

      } catch (jsonError) {

        console.error(
          "JSON PARSE ERROR:",
          jsonError
        );

        throw new Error(
          "The server returned an invalid response."
        );

      }

      console.log(
        "API RESPONSE:",
        data
      );

      /* =====================================================
         SERVER ERROR
      ===================================================== */

      if (!response.ok) {

        let message =
          data?.details ||
          data?.error ||
          data?.message ||
          "The travel plan could not be generated.";

        if (
          typeof message === "object"
        ) {

          message =
            JSON.stringify(
              message
            );

        }

        throw new Error(
          message
        );

      }

      /* =====================================================
         VALIDATE RESPONSE
      ===================================================== */

      if (
        !data ||
        typeof data !== "object"
      ) {

        throw new Error(
          "The server returned an empty response."
        );

      }

      console.log(
        "SUCCESS — TRAVEL DATA RECEIVED"
      );

      /* =====================================================
         TITLE
      ===================================================== */

      setText(
        "planTitle",
        `Your Trip to ${formData.destination}`
      );

      setText(
        "planIntro",
        `Customized strategy for ${formData.days} days with a ${formatUSD(formData.budget)} budget.`
      );

      /* =====================================================
         RENDER ALL SECTIONS
      ===================================================== */

      renderStay(
        data.stay
      );

      renderTransport(
        data.transport
      );

      renderExperiences(
        data.experiences
      );

      renderMoney(
        data.money
      );

      renderDays(
        data.daysPlan
      );

      activateStayTab();

      console.log(
        "PLAN RENDERED SUCCESSFULLY"
      );

    } catch (error) {

      console.error(
        "CREATE PLAN ERROR:",
        error
      );

      showGenerationError(
        error
      );

    }

  }

  /* =========================================================
     TEXT / HTML
  ========================================================= */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.textContent =
      value || "";

  }

  function setHTML(
    id,
    value
  ) {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.innerHTML =
      value || "";

  }

  /* =========================================================
     STAY
  ========================================================= */

  function renderStay(
    stay
  ) {

    const container =
      document.getElementById(
        "stayContent"
      );

    if (!container) return;

    if (
      !Array.isArray(stay) ||
      stay.length === 0
    ) {

      container.innerHTML = `

        <div class="planner-status">

          No accommodation recommendations
          were returned by the AI.

        </div>

      `;

      return;

    }

    let html = `

      <div class="hotels-grid">

    `;

    stay.forEach(
      hotel => {

        html +=
          renderHotel(
            hotel
          );

      }
    );

    html += `
      </div>
    `;

    container.innerHTML =
      html;

  }

  /* =========================================================
     HOTEL CARD
  ========================================================= */

  function renderHotel(
    hotel
  ) {

    if (
      !hotel ||
      typeof hotel !== "object"
    ) {

      return "";

    }

    const name =
      getValue(
        hotel.name
      ) ||
      "Accommodation";

    const stars =
      getValue(
        hotel.stars
      );

    const price =
      getNumber(
        hotel.price
      );

    const currency =
      getValue(
        hotel.currency
      ) ||
      "USD";

    const priceType =
      getValue(
        hotel.priceType
      ) ||
      "estimated per night";

    const description =
      getValue(
        hotel.description
      );

    const amenities =
      Array.isArray(
        hotel.amenities
      )
        ? hotel.amenities
        : [];

    let starsHTML = "";

    if (stars) {

      const starNumber =
        Number(stars);

      if (
        Number.isFinite(
          starNumber
        )
      {

        starsHTML = `
          <div class="hotel-meta">
            ${"⭐".repeat(
              Math.min(
                5,
                Math.max(
                  1,
                  starNumber
                )
              )
            )}
            ${escapeHTML(
              starNumber
            )}-star property
          </div>
        `;

      } else {

        starsHTML = `
          <div class="hotel-meta">
            ⭐
            ${escapeHTML(
              stars
            )}
          </div>
        `;

      }

    }

    let amenitiesHTML = "";

    if (
      amenities.length
    ) {

      amenitiesHTML = `

        <div class="hotel-amenities">

          <strong>
            Amenities
          </strong>

          <ul>

            ${amenities
              .map(
                item => `
                  <li>
                    ${escapeHTML(
                      getValue(item)
                    )}
                  </li>
                `
              )
              .join("")
            }

          </ul>

        </div>

      `;

    }

    let priceHTML = "";

    if (
      price !== null
    ) {

      priceHTML = `

        <div class="hotel-price">

          ${escapeHTML(
            "$" +
            price.toLocaleString(
              "en-US",
              {
                maximumFractionDigits: 2
              }
            )
          )}

          <span class="hotel-price-label">

            ${escapeHTML(
              currency
            )}

            /
            ${escapeHTML(
              priceType
            )}

          </span>

        </div>

      `;

    }

    /* =======================================================
       BOOKING SEARCH
       
       This is only a search link.
       It does NOT claim live availability.
    ======================================================= */

    const bookingQuery =
      encodeURIComponent(
        `${name} ${formData.destination}`
      );

    const bookingURL =
      `https://www.booking.com/searchresults.html?ss=${bookingQuery}`;

    return `

      <article class="hotel-card">

        <div class="hotel-image-wrapper">

          <div class="hotel-image-placeholder">

            🏨

            <br>

            Hotel image will be available
            when a live hotel image source
            is connected.

          </div>

        </div>

        <div class="hotel-body">

          <div class="hotel-name">

            ${escapeHTML(
              name
            )}

          </div>

          ${starsHTML}

          ${priceHTML}

          ${
            description
              ? `
                <div class="hotel-meta">
                  ${escapeHTML(
                    description
                  )}
                </div>
              `
              : ""
          }

          ${amenitiesHTML}

          <a
            class="hotel-button"
            href="${bookingURL}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check on Booking.com ↗
          </a>

        </div>

      </article>

    `;

  }

  /* =========================================================
     TRANSPORT
  ========================================================= */

  function renderTransport(
    transport
  ) {

    const container =
      document.getElementById(
        "transportContent"
      );

    if (!container) return;

    if (
      !transport
    ) {

      container.innerHTML =
        "Transportation information unavailable.";

      return;

    }

    if (
      typeof transport === "string"
    ) {

      container.innerHTML =
        transport;

      return;

    }

    container.innerHTML =
      `
        <div class="planner-status">
          ${escapeHTML(
            getValue(
              transport
            )
          )}
        </div>
      `;

  }

  /* =========================================================
     EXPERIENCES
  ========================================================= */

  function renderExperiences(
    experiences
  ) {

    const container =
      document.getElementById(
        "experiencesContent"
      );

    if (!container) return;

    if (
      !experiences
    ) {

      container.innerHTML =
        "Experiences information unavailable.";

      return;

    }

    if (
      typeof experiences === "string"
    ) {

      container.innerHTML =
        experiences;

      return;

    }

    container.innerHTML =
      `
        <div class="planner-status">
          ${escapeHTML(
            getValue(
              experiences
            )
          )}
        </div>
      `;

  }

  /* =========================================================
     MONEY
  ========================================================= */

  function renderMoney(
    money
  ) {

    const container =
      document.getElementById(
        "moneyContent"
      );

    if (!container) return;

    if (
      !money
    ) {

      container.innerHTML =
        "Budget information unavailable.";

      return;

    }

    if (
      typeof money === "string"
    ) {

      container.innerHTML =
        money;

      return;

    }

    container.innerHTML =
      `
        <div class="planner-status">
          ${escapeHTML(
            getValue(
              money
            )
          )}
        </div>
      `;

  }

  /* =========================================================
     DAYS
  ========================================================= */

  function renderDays(
    daysPlan
  ) {

    const container =
      document.getElementById(
        "daysContent"
      );

    if (!container) return;

    if (
      !daysPlan
    ) {

      container.innerHTML =
        "Day-by-day itinerary unavailable.";

      return;

    }

    if (
      typeof daysPlan === "string"
    ) {

      container.innerHTML =
        daysPlan;

      return;

    }

    container.innerHTML =
      `
        <div class="planner-status">
          ${escapeHTML(
            getValue(
              daysPlan
            )
          )}
        </div>
      `;

  }

  /* =========================================================
     GENERATION ERROR
  ========================================================= */

  function showGenerationError(
    error
  ) {

    let message =
      error?.message ||
      "The travel plan could not be generated.";

    if (
      typeof message === "object"
    ) {

      message =
        JSON.stringify(
          message
        );

    }

    setText(
      "planTitle",
      "Generation Error"
    );

    setText(
      "planIntro",
      "The travel plan could not be generated."
    );

    setHTML(
      "stayContent",
      `
        <div class="planner-error">

          <strong>
            Something went wrong.
          </strong>

          <br><br>

          ${escapeHTML(
            message
          )}

        </div>
      `
    );

    setHTML(
      "transportContent",
      ""
    );

    setHTML(
      "experiencesContent",
      ""
    );

    setHTML(
      "moneyContent",
      ""
    );

    setHTML(
      "daysContent",
      ""
    );

  }

  /* =========================================================
     TAB NAVIGATION
  ========================================================= */

  const tabs =
    document.querySelectorAll(
      ".plan-tab"
    );

  const sections =
    document.querySelectorAll(
      ".plan-section"
    );

  console.log(
    "PLAN TABS:",
    tabs.length
  );

  tabs.forEach(
    tab => {

      tab.addEventListener(
        "click",
        () => {

          const target =
            tab.getAttribute(
              "data-target"
            );

          if (!target) return;

          tabs.forEach(
            t =>
              t.classList.remove(
                "active"
              )
          );

          sections.forEach(
            section =>
              section.classList.add(
                "hidden"
              )
          );

          tab.classList.add(
            "active"
          );

          const targetSection =
            document.getElementById(
              target
            );

          if (
            targetSection
          ) {

            targetSection.classList.remove(
              "hidden"
            );

          }

        }
      );

    }
  );

  /* =========================================================
     DEFAULT STAY TAB
  ========================================================= */

  function activateStayTab() {

    tabs.forEach(
      tab =>
        tab.classList.remove(
          "active"
        )
    );

    sections.forEach(
      section =>
        section.classList.add(
          "hidden"
        )
    );

    const stayTab =
      document.querySelector(
        '.plan-tab[data-target="staySection"]'
      );

    const staySection =
      document.getElementById(
        "staySection"
      );

    if (stayTab) {

      stayTab.classList.add(
        "active"
      );

    }

    if (staySection) {

      staySection.classList.remove(
        "hidden"
      );

    }

  }

  /* =========================================================
     INITIAL STATE
  ========================================================= */

  showScreen(
    appScreen
  );

  console.log(
    "AI LIFE PLANNER READY — TEST MODE"
  );

});

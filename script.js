document.addEventListener("DOMContentLoaded", () => {

  console.log("AI LIFE PLANNER — TEST MODE V2");

  /* =========================================================
     ELEMENTS
  ========================================================= */

  const plannerForm = document.getElementById("plannerForm");
  const appScreen = document.getElementById("app");
  const reviewScreen = document.getElementById("review");
  const planScreen = document.getElementById("plan");

  const summaryDiv = document.getElementById("summary");
  const closeReviewBtn = document.getElementById("closeReview");
  const payBtn = document.getElementById("pay");

  const selectedInterests = new Set();

  let formData = {};

  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  function escapeHTML(value) {

    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent =
      value === null || value === undefined
        ? ""
        : String(value);
  }


  function setHTML(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.innerHTML = value || "";
  }


  function showScreen(screen) {

    if (appScreen) {
      appScreen.classList.add("hidden");
    }

    if (reviewScreen) {
      reviewScreen.classList.add("hidden");
    }

    if (planScreen) {
      planScreen.classList.add("hidden");
    }

    if (screen) {
      screen.classList.remove("hidden");
    }
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

      const number = Number(cleaned);

      return Number.isFinite(number)
        ? number
        : null;
    }

    if (
      typeof value === "object"
    ) {

      const keys = [
        "amount",
        "value",
        "price",
        "total",
        "totalPrice",
        "total_price"
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
      return "$0";
    }

    return "$" +
      number.toLocaleString(
        "en-US",
        {
          maximumFractionDigits: 2
        }
      );
  }


  function getDisplayValue(value) {

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

    if (
      typeof value === "object"
    ) {

      const keys = [
        "formatted",
        "display",
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
            getDisplayValue(
              value[key]
            );

          if (result) {
            return result;
          }
        }
      }
    }

    return "";
  }


  /* =========================================================
     INTEREST CHIPS
     IMPORTANT: THIS IS COMPLETELY INDEPENDENT
  ========================================================= */

  function setupInterestChips() {

    const chips =
      document.querySelectorAll(".chip");

    console.log(
      "INTEREST CHIPS FOUND:",
      chips.length
    );

    chips.forEach((chip, index) => {

      /*
       * Prevent button default behavior.
       * This guarantees that clicking a chip
       * does NOT submit the form.
       */

      chip.type = "button";

      /*
       * Remove any old click handlers by
       * replacing the element.
       */

      const newChip =
        chip.cloneNode(true);

      chip.parentNode.replaceChild(
        newChip,
        chip
      );

      newChip.addEventListener(
        "click",
        function(event) {

          event.preventDefault();
          event.stopPropagation();

          const interest =
            this.textContent.trim();

          console.log(
            "CHIP CLICKED:",
            interest
          );

          if (
            selectedInterests.has(
              interest
            )
          ) {

            selectedInterests.delete(
              interest
            );

            this.classList.remove(
              "active"
            );

            this.classList.remove(
              "selected"
            );

          } else {

            selectedInterests.add(
              interest
            );

            this.classList.add(
              "active"
            );

            this.classList.add(
              "selected"
            );

          }

          console.log(
            "SELECTED INTERESTS:",
            Array.from(
              selectedInterests
            )
          );

        },
        false
      );

    });

  }


  /* =========================================================
     FORM DATA
  ========================================================= */

  function collectFormData() {

    const destination =
      document
        .getElementById("destination")
        ?.value
        .trim() || "";

    const startDate =
      document
        .getElementById("startDate")
        ?.value || "";

    const days =
      Number(
        document
          .getElementById("days")
          ?.value || 0
      );

    const budget =
      Number(
        document
          .getElementById("budget")
          ?.value || 0
      );

    const travelers =
      document
        .getElementById("travelers")
        ?.value ||
      "1 traveler";

    const notes =
      document
        .getElementById("notes")
        ?.value
        .trim() || "None";

    return {

      destination,

      startDate,

      days,

      budget,

      travelers,

      interests:
        Array.from(
          selectedInterests
        ).join(", ") ||
        "General Sightseeing",

      notes

    };

  }


  /* =========================================================
     REVIEW SCREEN
  ========================================================= */

  function showReview() {

    formData =
      collectFormData();

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


    if (summaryDiv) {

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
          <strong>Budget:</strong>
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
          <strong>Notes:</strong>
          ${escapeHTML(
            formData.notes
          )}
        </p>

      `;

    }

    showScreen(
      reviewScreen
    );

  }


  /* =========================================================
     FORM
  ========================================================= */

  function setupForm() {

    if (!plannerForm) {

      console.error(
        "plannerForm NOT FOUND"
      );

      return;
    }

    plannerForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();
        event.stopPropagation();

        console.log(
          "FORM SUBMITTED"
        );

        showReview();

      },
      false
    );

  }


  /* =========================================================
     EDIT BUTTON
  ========================================================= */

  function setupEditButton() {

    if (!closeReviewBtn) return;

    closeReviewBtn.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        console.log(
          "EDIT TRIP"
        );

        showScreen(
          appScreen
        );

      },
      false
    );

  }


  /* =========================================================
     TEST PAYMENT BUTTON
     
     IMPORTANT:
     THERE IS NO PADDLE HERE.
     
     This button directly creates the plan
     so we can test the application.
  ========================================================= */

  function setupCreatePlanButton() {

    if (!payBtn) {

      console.error(
        "Create Plan button NOT FOUND"
      );

      return;
    }

    payBtn.type = "button";

    payBtn.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        console.log(
          "TEST CREATE PLAN CLICKED"
        );

        await createPlan();

      },
      false
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
      "STARTING PLAN GENERATION"
    );

    console.log(
      "DATA:",
      formData
    );

    console.log(
      "================================="
    );


    showScreen(
      planScreen
    );


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
          💰 Calculating budget...
        </div>
      `
    );


    setHTML(
      "daysContent",
      `
        <div class="planner-status">
          📅 Creating your itinerary...
        </div>
      `
    );


    try {

      const payload = {

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

      };


      console.log(
        "POST /api/plan",
        payload
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
              JSON.stringify(
                payload
              )

          }
        );


      console.log(
        "API STATUS:",
        response.status
      );


      let data;

      try {

        data =
          await response.json();

      } catch (jsonError) {

        console.error(
          "INVALID JSON:",
          jsonError
        );

        throw new Error(
          "The server returned an invalid response."
        );

      }


      console.log(
        "API DATA:",
        data
      );


      if (!response.ok) {

        let serverError =
          data?.details ||
          data?.error ||
          data?.message ||
          "The travel plan could not be generated.";

        if (
          typeof serverError ===
          "object"
        ) {

          serverError =
            JSON.stringify(
              serverError
            );

        }

        throw new Error(
          serverError
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


      /* =====================================================
         SUCCESS
      ===================================================== */

      setText(
        "planTitle",
        `Your Trip to ${formData.destination}`
      );


      setText(
        "planIntro",
        `Customized strategy for ${formData.days} days with a ${formatUSD(formData.budget)} budget.`
      );


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


      activateDefaultTab();


      console.log(
        "PLAN GENERATION SUCCESS"
      );


    } catch (error) {

      console.error(
        "PLAN GENERATION ERROR:",
        error
      );


      showGenerationError(
        error
      );

    }

  }


  /* =========================================================
     STAY
  ========================================================= */

  function renderStay(stay) {

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
     HOTEL
  ========================================================= */

  function renderHotel(hotel) {

    if (
      !hotel ||
      typeof hotel !== "object"
    ) {

      return "";

    }


    const name =
      getDisplayValue(
        hotel.name
      ) ||
      "Accommodation";


    const stars =
      getNumber(
        hotel.stars
      );


    const price =
      getNumber(
        hotel.price
      );


    const currency =
      getDisplayValue(
        hotel.currency
      ) ||
      "USD";


    const priceType =
      getDisplayValue(
        hotel.priceType
      ) ||
      "estimated per night";


    const description =
      getDisplayValue(
        hotel.description
      );


    const amenities =
      Array.isArray(
        hotel.amenities
      )
        ? hotel.amenities
        : [];


    let starsHTML = "";


    if (
      stars !== null
    ) {

      starsHTML = `

        <div class="hotel-meta">

          ${"⭐".repeat(
            Math.min(
              5,
              Math.max(
                1,
                Math.round(
                  stars
                )
              )
            )
          )}

          ${escapeHTML(
            stars
          )}-star property

        </div>

      `;

    }


    let amenitiesHTML = "";


    if (
      amenities.length
    ) {

      amenitiesHTML = `

        <div class="hotel-meta">

          <strong>
            Amenities
          </strong>

          <ul>

            ${amenities
              .map(
                amenity => `
                  <li>
                    ${escapeHTML(
                      getDisplayValue(
                        amenity
                      )
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


    const bookingQuery =
      encodeURIComponent(
        `${name} ${formData.destination}`
      );


    const bookingURL =
      `https://www.booking.com/searchresults.html?ss=${bookingQuery}`;


    return `

      <article class="hotel-card">

        <div
          class="hotel-image-wrapper"
        >

          <div
            class="hotel-image-placeholder"
          >

            🏨

            <br>

            Hotel image unavailable

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
      typeof transport ===
      "string"
    ) {

      container.innerHTML =
        transport;

      return;

    }


    container.innerHTML = `

      <div class="planner-status">

        ${escapeHTML(
          getDisplayValue(
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
      typeof experiences ===
      "string"
    ) {

      container.innerHTML =
        experiences;

      return;

    }


    container.innerHTML = `

      <div class="planner-status">

        ${escapeHTML(
          getDisplayValue(
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


    if (!money) {

      container.innerHTML =
        "Budget information unavailable.";

      return;

    }


    if (
      typeof money ===
      "string"
    ) {

      container.innerHTML =
        money;

      return;

    }


    container.innerHTML = `

      <div class="planner-status">

        ${escapeHTML(
          getDisplayValue(
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


    if (!daysPlan) {

      container.innerHTML =
        "Day-by-day itinerary unavailable.";

      return;

    }


    if (
      typeof daysPlan ===
      "string"
    ) {

      container.innerHTML =
        daysPlan;

      return;

    }


    container.innerHTML = `

      <div class="planner-status">

        ${escapeHTML(
          getDisplayValue(
            daysPlan
          )
        )}

      </div>

    `;

  }


  /* =========================================================
     ERROR
  ========================================================= */

  function showGenerationError(
    error
  ) {

    let message =
      error?.message ||
      "The travel plan could not be generated.";


    if (
      typeof message ===
      "object"
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
     TABS
  ========================================================= */

  function setupTabs() {

    const tabs =
      document.querySelectorAll(
        ".plan-tab"
      );

    const sections =
      document.querySelectorAll(
        ".plan-section"
      );


    console.log(
      "PLAN TABS FOUND:",
      tabs.length
    );


    tabs.forEach(tab => {

      tab.type = "button";


      tab.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();


          const target =
            tab.getAttribute(
              "data-target"
            );


          console.log(
            "TAB CLICKED:",
            target
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

        },
        false
      );

    });

  }


  /* =========================================================
     DEFAULT TAB
  ========================================================= */

  function activateDefaultTab() {

    const tabs =
      document.querySelectorAll(
        ".plan-tab"
      );

    const sections =
      document.querySelectorAll(
        ".plan-section"
      );


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
     INITIALIZE
  ========================================================= */

  setupInterestChips();

  setupForm();

  setupEditButton();

  setupCreatePlanButton();

  setupTabs();

  activateDefaultTab();

  showScreen(
    appScreen
  );


  console.log(
    "================================="
  );

  console.log(
    "AI LIFE PLANNER READY"
  );

  console.log(
    "TEST MODE — NO PADDLE"
  );

  console.log(
    "INTEREST CHIPS ENABLED"
  );

  console.log(
    "================================="
  );

});

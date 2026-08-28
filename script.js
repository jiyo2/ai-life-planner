/* =========================================================
   AI LIFE PLANNER
   DEMO / TEST VERSION
   Paddle temporarily disabled
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  console.log("=================================");
  console.log("AI LIFE PLANNER DEMO V1");
  console.log("Paddle: TEMPORARILY DISABLED");
  console.log("Gemini/API: ENABLED");
  console.log("=================================");


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const plannerForm =
    document.getElementById("plannerForm");

  const appScreen =
    document.getElementById("app");

  const reviewScreen =
    document.getElementById("review");

  const planScreen =
    document.getElementById("plan");

  const summaryDiv =
    document.getElementById("summary");

  const closeReviewBtn =
    document.getElementById("closeReview");

  const createPlanBtn =
    document.getElementById("pay");

  const chips =
    document.querySelectorAll(".chip");

  const tabs =
    document.querySelectorAll(".plan-tab");

  const sections =
    document.querySelectorAll(".plan-section");


  /* =======================================================
     STATE
  ======================================================= */

  let formData = {};

  let selectedInterests =
    new Set();


  /* =======================================================
     HELPERS
  ======================================================= */

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


  function setPlanText(
    id,
    text
  ) {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.textContent =
      text || "";
  }


  function setPlanHTML(
    id,
    html
  ) {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.innerHTML =
      html || "";
  }


  /* =======================================================
     INTEREST CHIPS
  ======================================================= */

  chips.forEach((chip) => {

    chip.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

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

          chip.classList.remove(
            "selected"
          );

        } else {

          selectedInterests.add(
            interest
          );

          chip.classList.add(
            "active"
          );

          chip.classList.add(
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


  /* =======================================================
     COLLECT FORM
  ======================================================= */

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
        ?.value || "1 traveler";

    const notes =
      document
        .getElementById("notes")
        ?.value
        .trim() || "";

    return {

      destination,

      start:
        startDate,

      startDate,

      days,

      budget,

      travelers,

      interests:
        Array.from(
          selectedInterests
        ).join(", ") ||
        "General Sightseeing",

      notes:
        notes || "None"

    };

  }


  /* =======================================================
     FORM SUBMISSION
  ======================================================= */

  if (plannerForm) {

    plannerForm.addEventListener(
      "submit",
      (event) => {

        event.preventDefault();

        console.log(
          "FORM SUBMITTED"
        );

        formData =
          collectFormData();

        console.log(
          "FORM DATA:",
          formData
        );


        /* -----------------------------------------------
           VALIDATION
        ------------------------------------------------ */

        if (
          !formData.destination
        ) {

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


        /* -----------------------------------------------
           REVIEW
        ------------------------------------------------ */

        if (summaryDiv) {

          summaryDiv.innerHTML = `

            <p>
              📍
              <strong>
                Destination:
              </strong>
              ${escapeHTML(
                formData.destination
              )}
            </p>

            <p>
              📅
              <strong>
                Duration:
              </strong>
              ${escapeHTML(
                formData.days
              )}
              days
              ${
                formData.startDate
                  ? `
                    (Starts:
                    ${escapeHTML(
                      formData.startDate
                    )})
                  `
                  : `
                    (Flexible date)
                  `
              }
            </p>

            <p>
              💰
              <strong>
                Budget limit:
              </strong>
              $${escapeHTML(
                formData.budget
              )}
            </p>

            <p>
              👥
              <strong>
                Party size:
              </strong>
              ${escapeHTML(
                formData.travelers
              )}
            </p>

            <p>
              🎯
              <strong>
                Interests:
              </strong>
              ${escapeHTML(
                formData.interests
              )}
            </p>

            <p>
              📝
              <strong>
                Special requests:
              </strong>
              ${escapeHTML(
                formData.notes
              )}
            </p>

          `;

        }

        showScreen(
          reviewScreen
        );

      },
      false
    );

  }


  /* =======================================================
     CLOSE REVIEW
  ======================================================= */

  if (closeReviewBtn) {

    closeReviewBtn.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        showScreen(
          appScreen
        );

      },
      false
    );

  }


  /* =======================================================
     PLAN LOADING UI
  ======================================================= */

  function showPlanLoading() {

    showScreen(
      planScreen
    );


    setPlanText(
      "planTitle",
      `Creating your ${formData.destination} travel plan...`
    );


    setPlanText(
      "planIntro",
      "Our AI is building your personalized itinerary. Please wait a moment."
    );


    setPlanHTML(
      "stayContent",
      `
        <div class="planner-status">
          Generating accommodation strategy...
        </div>
      `
    );


    setPlanHTML(
      "transportContent",
      `
        <div class="planner-status">
          Generating transportation strategy...
        </div>
      `
    );


    setPlanHTML(
      "experiencesContent",
      `
        <div class="planner-status">
          Generating experiences and restaurants...
        </div>
      `
    );


    setPlanHTML(
      "moneyContent",
      `
        <div class="planner-status">
          Calculating your budget...
        </div>
      `
    );


    setPlanHTML(
      "daysContent",
      `
        <div class="planner-status">
          Creating your day-by-day itinerary...
        </div>
      `
    );

  }


  /* =======================================================
     SHOW API ERROR
  ======================================================= */

  function showGenerationError(
    message
  ) {

    console.error(
      "GENERATION ERROR:",
      message
    );


    setPlanText(
      "planTitle",
      "Generation Error"
    );


    setPlanText(
      "planIntro",
      "The travel plan could not be generated."
    );


    const errorHTML = `

      <div class="planner-error">

        <strong>
          Something went wrong.
        </strong>

        <br><br>

        ${escapeHTML(
          message
        )}

      </div>

    `;


    setPlanHTML(
      "stayContent",
      errorHTML
    );


    setPlanHTML(
      "transportContent",
      ""
    );


    setPlanHTML(
      "experiencesContent",
      ""
    );


    setPlanHTML(
      "moneyContent",
      ""
    );


    setPlanHTML(
      "daysContent",
      errorHTML
    );

  }


  /* =======================================================
     NORMALIZE API RESPONSE
  ======================================================= */

  function normalizeAPIResponse(
    data
  ) {

    /*
      Our new api/plan.js returns:

      {
        stay: [...],
        transport: "...",
        experiences: "...",
        money: "...",
        daysPlan: "..."
      }

      Older versions may return:

      {
        plan: {...},
        hotels: [...]
      }

      We support both temporarily.
    */


    if (
      data &&
      data.plan &&
      typeof data.plan === "object"
    ) {

      const plan =
        data.plan;

      return {

        stay:
          plan.stay ||
          data.stay ||
          "",

        transport:
          plan.transport ||
          data.transport ||
          "",

        experiences:
          plan.experiences ||
          data.experiences ||
          "",

        money:
          plan.money ||
          data.money ||
          "",

        daysPlan:
          plan.daysPlan ||
          data.daysPlan ||
          "",

        hotels:
          Array.isArray(
            data.hotels
          )
            ? data.hotels
            : []

      };

    }


    return {

      stay:
        data?.stay || "",

      transport:
        data?.transport || "",

      experiences:
        data?.experiences || "",

      money:
        data?.money || "",

      daysPlan:
        data?.daysPlan || "",

      hotels:
        Array.isArray(
          data?.hotels
        )
          ? data.hotels
          : []

    };

  }


  /* =======================================================
     HOTEL HTML
  ======================================================= */

  function renderHotels(
    hotels
  ) {

    if (
      !Array.isArray(hotels) ||
      !hotels.length
    ) {

      return "";

    }


    return `

      <h3
        style="
          margin-top:25px;
          margin-bottom:15px;
        "
      >
        🏨 Live Hotel Options
      </h3>

      <div class="hotels-grid">

        ${
          hotels
            .map(
              renderHotelCard
            )
            .join("")
        }

      </div>

    `;

  }


  /* =======================================================
     SAFE HOTEL VALUE
  ======================================================= */

  function getHotelValue(
    hotel,
    fields
  ) {

    if (
      !hotel ||
      typeof hotel !== "object"
    ) {

      return "";

    }


    for (
      const field of fields
    ) {

      const value =
        hotel[field];


      if (
        value === null ||
        value === undefined
      ) {

        continue;

      }


      if (
        typeof value === "string" ||
        typeof value === "number"
      ) {

        return String(
          value
        );

      }


      if (
        typeof value === "object"
      ) {

        const nested =
          value.amount ??
          value.value ??
          value.price ??
          value.total ??
          value.formatted ??
          value.display;


        if (
          nested !== null &&
          nested !== undefined
        ) {

          return String(
            nested
          );

        }

      }

    }


    return "";

  }


  /* =======================================================
     HOTEL IMAGE
  ======================================================= */

  function getHotelImage(
    hotel
  ) {

    if (
      !hotel ||
      typeof hotel !== "object"
    ) {

      return "";

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
      "coverImage"

    ];


    for (
      const field of fields
    ) {

      const value =
        hotel[field];


      if (
        typeof value === "string" &&
        value.trim()
      ) {

        return value.trim();

      }


      if (
        value &&
        typeof value === "object"
      ) {

        const url =
          value.url ||
          value.src ||
          value.href;


        if (
          typeof url === "string" &&
          url.trim()
        ) {

          return url.trim();

        }

      }

    }


    /* Nested image arrays */

    const collections = [

      hotel.images,
      hotel.photos,
      hotel.gallery,
      hotel.media

    ];


    for (
      const collection
      of collections
    ) {

      if (
        !Array.isArray(
          collection
        )
      ) {

        continue;

      }


      for (
        const item
        of collection
      ) {

        if (
          typeof item === "string" &&
          item.startsWith("http")
        ) {

          return item;

        }


        if (
          item &&
          typeof item === "object"
        ) {

          const url =
            item.url ||
            item.src ||
            item.href;


          if (
            typeof url === "string" &&
            url.trim()
          ) {

            return url.trim();

          }

        }

      }

    }


    return "";

  }


  /* =======================================================
     HOTEL CARD
  ======================================================= */

  function renderHotelCard(
    hotel
  ) {

    const name =
      getHotelValue(
        hotel,
        [
          "name",
          "hotelName",
          "propertyName",
          "title"
        ]
      ) ||
      "Hotel";


    const location =
      getHotelValue(
        hotel,
        [
          "location",
          "address",
          "city"
        ]
      );


    const stars =
      getHotelValue(
        hotel,
        [
          "stars",
          "starRating",
          "star_rating"
        ]
      );


    const rating =
      getHotelValue(
        hotel,
        [
          "guestRating",
          "guest_rating",
          "review_score",
          "reviewScore"
        ]
      );


    const reviews =
      getHotelValue(
        hotel,
        [
          "reviewCount",
          "review_count"
        ]
      );


    const price =
      getHotelValue(
        hotel,
        [
          "price",
          "pricePerNight",
          "price_per_night",
          "nightlyPrice",
          "nightly_price",
          "rate",
          "amount"
        ]
      );


    const currency =
      getHotelValue(
        hotel,
        [
          "currency",
          "currencyCode",
          "currency_code"
        ]
      ) ||
      "USD";


    const image =
      getHotelImage(
        hotel
      );


    const url =
      getHotelValue(
        hotel,
        [
          "url",
          "link",
          "propertyUrl",
          "property_url"
        ]
      );


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
            src="${escapeHTML(
              image
            )}"
            alt="${escapeHTML(
              name
            )}"
            loading="lazy"
            referrerpolicy="no-referrer"
            onerror="
              this.onerror=null;
              this.style.display='none';
              this.parentElement
                .querySelector('.hotel-image-placeholder')
                ?.style
                .setProperty('display','flex');
            "
          >

          <div
            class="hotel-image-placeholder"
            style="display:none;"
          >
            Hotel image unavailable
          </div>

        </div>

      `;

    }


    let metaHTML = "";


    if (location) {

      metaHTML += `

        <div class="hotel-meta">
          📍
          ${escapeHTML(
            location
          )}
        </div>

      `;

    }


    if (stars) {

      metaHTML += `

        <div class="hotel-meta">
          ⭐
          ${escapeHTML(
            stars
          )}
          star property
        </div>

      `;

    }


    if (rating) {

      metaHTML += `

        <div class="hotel-meta">
          ⭐ Guest rating:
          ${escapeHTML(
            rating
          )}
        </div>

      `;

    }


    if (reviews) {

      metaHTML += `

        <div class="hotel-meta">
          ${escapeHTML(
            reviews
          )}
          reviews
        </div>

      `;

    }


    let priceHTML = "";


    if (price) {

      priceHTML = `

        <div class="hotel-price">

          ${escapeHTML(
            price
          )}

          <span
            class="hotel-price-label"
          >
            ${escapeHTML(
              currency
            )}
          </span>

        </div>

      `;

    }


    let buttonHTML = "";


    if (url) {

      buttonHTML = `

        <a
          class="hotel-button"
          href="${escapeHTML(
            url
          )}"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Hotel
        </a>

      `;

    }


    return `

      <article
        class="hotel-card"
      >

        ${imageHTML}

        <div
          class="hotel-body"
        >

          <div
            class="hotel-name"
          >
            ${escapeHTML(
              name
            )}
          </div>

          ${metaHTML}

          ${priceHTML}

          ${buttonHTML}

        </div>

      </article>

    `;

  }


  /* =======================================================
     ADD LIVE HOTELS TO STAY
  ======================================================= */

  function addHotelsToStay(
    stayHTML,
    hotels
  ) {

    const hotelHTML =
      renderHotels(
        hotels
      );


    if (
      !hotelHTML
    ) {

      return stayHTML;

    }


    return (
      stayHTML || ""
    ) +
    hotelHTML;

  }


  /* =======================================================
     CREATE PLAN
  ======================================================= */

  async function createPlan() {

    console.log(
      "================================="
    );

    console.log(
      "CREATE PLAN START"
    );

    console.log(
      "FORM DATA:",
      formData
    );


    if (
      !formData.destination
    ) {

      alert(
        "Please enter a destination first."
      );

      return;

    }


    showPlanLoading();


    /*
      IMPORTANT:

      No Paddle here.

      This is the temporary demo flow.
    */


    try {

      console.log(
        "POST /api/plan"
      );


      const response =
        await fetch(
          "/api/plan",
          {

            method:
              "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Accept":
                "application/json"

            },

            body:
              JSON.stringify(
                formData
              )

          }
        );


      console.log(
        "API STATUS:",
        response.status
      );


      const rawText =
        await response.text();


      console.log(
        "RAW API RESPONSE:",
        rawText
      );


      let data;


      try {

        data =
          JSON.parse(
            rawText
          );

      } catch (
        parseError
      ) {

        throw new Error(
          "The server returned an invalid JSON response."
        );

      }


      if (
        !response.ok
      ) {

        throw new Error(

          data?.details ||
          data?.error ||
          data?.message ||
          `Server error (${response.status})`

        );

      }


      if (
        !data ||
        typeof data !== "object"
      ) {

        throw new Error(
          "The server returned an empty response."
        );

      }


      console.log(
        "API DATA:",
        data
      );


      const normalized =
        normalizeAPIResponse(
          data
        );


      /* ---------------------------------------------------
         TITLE
      --------------------------------------------------- */

      setPlanText(
        "planTitle",
        `Your Trip to ${formData.destination}`
      );


      setPlanText(
        "planIntro",
        `Customized strategy for ${formData.days} days with a $${formData.budget} budget.`
      );


      /* ---------------------------------------------------
         STAY
      --------------------------------------------------- */

      const stayHTML =
        typeof normalized.stay === "string"
          ? normalized.stay
          : "";


      setPlanHTML(
        "stayContent",
        addHotelsToStay(
          stayHTML,
          normalized.hotels
        ) ||
        `
          <div class="planner-status">
            Accommodation strategy unavailable.
          </div>
        `
      );


      /* ---------------------------------------------------
         TRANSPORT
      --------------------------------------------------- */

      setPlanHTML(
        "transportContent",
        typeof normalized.transport === "string"
          ? normalized.transport
          : `
            <div class="planner-status">
              Transportation strategy unavailable.
            </div>
          `
      );


      /* ---------------------------------------------------
         EXPERIENCES
      --------------------------------------------------- */

      setPlanHTML(
        "experiencesContent",
        typeof normalized.experiences === "string"
          ? normalized.experiences
          : `
            <div class="planner-status">
              Experiences unavailable.
            </div>
          `
      );


      /* ---------------------------------------------------
         MONEY
      --------------------------------------------------- */

      setPlanHTML(
        "moneyContent",
        typeof normalized.money === "string"
          ? normalized.money
          : `
            <div class="planner-status">
              Budget strategy unavailable.
            </div>
          `
      );


      /* ---------------------------------------------------
         DAYS
      --------------------------------------------------- */

      setPlanHTML(
        "daysContent",
        typeof normalized.daysPlan === "string"
          ? normalized.daysPlan
          : `
            <div class="planner-status">
              Day-by-day itinerary unavailable.
            </div>
          `
      );


      /* ---------------------------------------------------
         DEFAULT TAB
      --------------------------------------------------- */

      activateTab(
        "staySection"
      );


      console.log(
        "CREATE PLAN SUCCESS"
      );

      console.log(
        "================================="
      );


    } catch (
      error
    ) {

      console.error(
        "CREATE PLAN ERROR:",
        error
      );


      showGenerationError(
        error?.message ||
        "Unable to generate your travel plan."
      );

    }

  }


  /* =======================================================
     CREATE PLAN BUTTON
  ======================================================= */

  if (createPlanBtn) {

    createPlanBtn.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();
        event.stopPropagation();

        console.log(
          "CREATE MY PLAN BUTTON CLICKED"
        );


        /*
          DEMO VERSION:
          NO PADDLE
        */

        await createPlan();

      },
      false
    );

  }


  /* =======================================================
     TAB ACTIVATION
  ======================================================= */

  function activateTab(
    targetId
  ) {

    tabs.forEach(
      (tab) => {

        const target =
          tab.getAttribute(
            "data-target"
          );

        tab.classList.toggle(
          "active",
          target === targetId
        );

      }
    );


    sections.forEach(
      (section) => {

        section.classList.toggle(
          "hidden",
          section.id !== targetId
        );

        section.classList.toggle(
          "active",
          section.id === targetId
        );

      }
    );

  }


  /* =======================================================
     TAB NAVIGATION
  ======================================================= */

  tabs.forEach(
    (tab) => {

      tab.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          const targetId =
            tab.getAttribute(
              "data-target"
            );


          if (!targetId) {

            console.warn(
              "Plan tab has no data-target."
            );

            return;

          }


          const targetSection =
            document.getElementById(
              targetId
            );


          if (!targetSection) {

            console.warn(
              "Target section not found:",
              targetId
            );

            return;

          }


          activateTab(
            targetId
          );

        },
        false
      );

    }
  );


  /* =======================================================
     INITIAL TAB
  ======================================================= */

  activateTab(
    "staySection"
  );


  /* =======================================================
     INITIAL STATE
  ======================================================= */

  if (planScreen) {

    planScreen.classList.add(
      "hidden"
    );

  }


  console.log(
    "AI LIFE PLANNER READY"
  );

});

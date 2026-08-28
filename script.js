document.addEventListener("DOMContentLoaded", () => {

  console.log("AI LIFE PLANNER — TEST MODE — NO PADDLE");

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

  const planTitle =
    document.getElementById("planTitle");

  const planIntro =
    document.getElementById("planIntro");

  const stayContent =
    document.getElementById("stayContent");

  const transportContent =
    document.getElementById("transportContent");

  const experiencesContent =
    document.getElementById("experiencesContent");

  const moneyContent =
    document.getElementById("moneyContent");

  const daysContent =
    document.getElementById("daysContent");


  /* =========================================================
     BASIC HELPERS
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


  function displayValue(value) {

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

    if (Array.isArray(value)) {

      return value
        .map(item => displayValue(item))
        .filter(Boolean)
        .join(", ");
    }

    if (typeof value === "object") {

      const preferredKeys = [
        "text",
        "content",
        "description",
        "message",
        "formatted",
        "formattedPrice",
        "display",
        "value",
        "amount",
        "price",
        "total",
        "name",
        "title",
        "label"
      ];

      for (const key of preferredKeys) {

        if (
          value[key] !== null &&
          value[key] !== undefined
        ) {

          const result =
            displayValue(value[key]);

          if (result) {
            return result;
          }
        }
      }

      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }

    return String(value);
  }


  function safeSetHTML(element, value) {

    if (!element) return;

    if (
      value === null ||
      value === undefined
    ) {
      element.innerHTML = "";
      return;
    }

    if (typeof value === "string") {
      element.innerHTML = value;
      return;
    }

    element.innerHTML =
      `<div>${escapeHTML(displayValue(value))}</div>`;
  }


  /* =========================================================
     INTEREST CHIPS
  ========================================================= */

  const chips =
    document.querySelectorAll(".chip");

  const selectedInterests =
    new Set();


  chips.forEach(chip => {

    chip.addEventListener("click", () => {

      const interest =
        chip.textContent.trim();

      if (
        selectedInterests.has(interest)
      ) {

        selectedInterests.delete(
          interest
        );

        chip.classList.remove("active");
        chip.classList.remove("selected");

      } else {

        selectedInterests.add(
          interest
        );

        chip.classList.add("active");
        chip.classList.add("selected");
      }

      console.log(
        "Selected interests:",
        Array.from(selectedInterests)
      );

    });

  });


  /* =========================================================
     FORM DATA
  ========================================================= */

  let formData = {};


  function collectFormData() {

    const destination =
      document.getElementById(
        "destination"
      )?.value.trim() || "";

    const startDate =
      document.getElementById(
        "startDate"
      )?.value || "";

    const days =
      Number(
        document.getElementById(
          "days"
        )?.value || 0
      );

    const budget =
      Number(
        document.getElementById(
          "budget"
        )?.value || 0
      );

    const travelers =
      document.getElementById(
        "travelers"
      )?.value || "1 traveler";

    const notes =
      document.getElementById(
        "notes"
      )?.value.trim() || "";


    return {

      destination,

      start: startDate,

      startDate,

      days,

      budget,

      travelers,

      interests:
        Array.from(
          selectedInterests
        ),

      notes

    };

  }


  /* =========================================================
     FORM SUBMISSION
  ========================================================= */

  if (plannerForm) {

    plannerForm.addEventListener(
      "submit",
      event => {

        event.preventDefault();

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


        const interestsText =
          formData.interests.length
            ? formData.interests.join(", ")
            : "General Sightseeing";


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
            Days

            ${
              formData.startDate
                ? `
                  (Starts:
                  ${escapeHTML(
                    formData.startDate
                  )})
                `
                : "(Flexible)"
            }
          </p>

          <p>
            💰
            <strong>Budget limit:</strong>
            $${escapeHTML(
              formData.budget
            )}
          </p>

          <p>
            👥
            <strong>Party size:</strong>
            ${escapeHTML(
              formData.travelers
            )}
          </p>

          <p>
            🎯
            <strong>Interests:</strong>
            ${escapeHTML(
              interestsText
            )}
          </p>

          ${
            formData.notes
              ? `
                <p>
                  📝
                  <strong>Special requests:</strong>
                  ${escapeHTML(
                    formData.notes
                  )}
                </p>
              `
              : ""
          }

        `;


        appScreen.classList.add("hidden");
        reviewScreen.classList.remove("hidden");

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

        reviewScreen.classList.add(
          "hidden"
        );

        appScreen.classList.remove(
          "hidden"
        );

      }
    );

  }


  /* =========================================================
     CREATE PLAN
     
     TEST MODE:
     NO PADDLE
     NO PAYMENT
  ========================================================= */

  async function createPlan() {

    console.log(
      "CREATE PLAN — TEST MODE"
    );

    console.log(
      "Sending:",
      formData
    );


    /* -------------------------------------------------------
       SHOW PLAN SCREEN
    ------------------------------------------------------- */

    appScreen.classList.add(
      "hidden"
    );

    reviewScreen.classList.add(
      "hidden"
    );

    planScreen.classList.remove(
      "hidden"
    );


    /* -------------------------------------------------------
       INITIAL LOADING STATE
    ------------------------------------------------------- */

    planTitle.textContent =
      `Creating your ${formData.destination} travel plan...`;

    planIntro.textContent =
      "Our AI is building your personalized itinerary. Please wait a moment.";


    safeSetHTML(
      stayContent,
      `
        <div class="planner-status">
          🏨 Generating accommodation strategy...
        </div>
      `
    );


    safeSetHTML(
      transportContent,
      `
        <div class="planner-status">
          🚆 Generating transportation strategy...
        </div>
      `
    );


    safeSetHTML(
      experiencesContent,
      `
        <div class="planner-status">
          📍 Generating experiences...
        </div>
      `
    );


    safeSetHTML(
      moneyContent,
      `
        <div class="planner-status">
          💰 Calculating budget...
        </div>
      `
    );


    safeSetHTML(
      daysContent,
      `
        <div class="planner-status">
          📅 Creating your day-by-day itinerary...
        </div>
      `
    );


    /* -------------------------------------------------------
       CALL VERCEL API
    ------------------------------------------------------- */

    try {

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

                start:
                  formData.startDate,

                days:
                  formData.days,

                budget:
                  formData.budget,

                travelers:
                  formData.travelers,

                interests:
                  formData.interests.join(", "),

                notes:
                  formData.notes

              })
          }
        );


      console.log(
        "API STATUS:",
        response.status
      );


      /* -----------------------------------------------------
         READ RESPONSE
      ----------------------------------------------------- */

      const rawResponse =
        await response.text();


      console.log(
        "RAW API RESPONSE:",
        rawResponse
      );


      let data;


      try {

        data =
          JSON.parse(
            rawResponse
          );

      } catch (parseError) {

        console.error(
          "JSON PARSE ERROR:",
          parseError
        );

        throw new Error(
          rawResponse ||
          "The server returned an invalid response."
        );

      }


      console.log(
        "API DATA:",
        data
      );


      /* -----------------------------------------------------
         SERVER ERROR
      ----------------------------------------------------- */

      if (!response.ok) {

        let errorMessage =
          data?.error ||
          data?.message ||
          data?.details;


        if (
          typeof errorMessage === "object"
        ) {

          errorMessage =
            displayValue(
              errorMessage
            );

        }


        throw new Error(
          errorMessage ||
          `Server error ${response.status}`
        );

      }


      /* -----------------------------------------------------
         SUPPORT BOTH API FORMATS
         
         FORMAT A:
         {
           plan: {...},
           hotels: [...],
           restaurants: [...]
         }

         FORMAT B:
         {
           stay: "...",
           transport: "...",
           experiences: "...",
           money: "...",
           daysPlan: "..."
         }
      ----------------------------------------------------- */

      let plan = data;


      if (
        data.plan &&
        typeof data.plan === "object"
      ) {

        plan =
          data.plan;

      }


      /* -----------------------------------------------------
         TITLE
      ----------------------------------------------------- */

      planTitle.textContent =
        `${formData.destination} — Your Personalized Travel Plan`;


      planIntro.textContent =
        plan.overview ||
        `A personalized ${formData.destination} travel plan for ${formData.days} days within your $${formData.budget} budget.`;


      /* =====================================================
         STAY
      ===================================================== */

      if (
        data.stay !== undefined &&
        typeof data.stay === "string"
      ) {

        safeSetHTML(
          stayContent,
          data.stay
        );

      } else if (
        plan.stay !== undefined
      ) {

        renderStay(
          plan.stay,
          data.hotels ||
          plan.hotels ||
          []
        );

      } else {

        safeSetHTML(
          stayContent,
          `
            <div class="planner-status">
              Accommodation strategy was not returned.
            </div>
          `
        );

      }


      /* =====================================================
         TRANSPORT
      ===================================================== */

      if (
        data.transport !== undefined &&
        typeof data.transport === "string"
      ) {

        safeSetHTML(
          transportContent,
          data.transport
        );

      } else {

        renderTransport(
          plan.transport
        );

      }


      /* =====================================================
         EXPERIENCES
      ===================================================== */

      if (
        data.experiences !== undefined &&
        typeof data.experiences === "string"
      ) {

        safeSetHTML(
          experiencesContent,
          data.experiences
        );

      } else {

        renderExperiences(
          plan.experiences,
          data.restaurants ||
          plan.restaurants ||
          []
        );

      }


      /* =====================================================
         MONEY
      ===================================================== */

      if (
        data.money !== undefined &&
        typeof data.money === "string"
      ) {

        safeSetHTML(
          moneyContent,
          data.money
        );

      } else {

        renderBudget(
          plan.budget ||
          plan.money
        );

      }


      /* =====================================================
         DAYS
      ===================================================== */

      if (
        data.daysPlan !== undefined &&
        typeof data.daysPlan === "string"
      ) {

        safeSetHTML(
          daysContent,
          data.daysPlan
        );

      } else {

        renderDays(
          plan.days
        );

      }


      console.log(
        "PLAN RENDERED SUCCESSFULLY"
      );

    } catch (error) {

      console.error(
        "CREATE PLAN ERROR:",
        error
      );


      const message =
        error?.message ||
        "The travel plan could not be generated.";


      planTitle.textContent =
        "Generation Error";


      planIntro.textContent =
        "The travel plan could not be generated.";


      const errorHTML = `

        <div class="planner-error">

          <strong>
            Something went wrong.
          </strong>

          <br><br>

          ${escapeHTML(
            displayValue(message)
          )}

        </div>

      `;


      safeSetHTML(
        stayContent,
        errorHTML
      );


      safeSetHTML(
        transportContent,
        ""
      );


      safeSetHTML(
        experiencesContent,
        ""
      );


      safeSetHTML(
        moneyContent,
        ""
      );


      safeSetHTML(
        daysContent,
        ""
      );

    }

  }


  /* =========================================================
     CREATE PLAN BUTTON
     
     IMPORTANT:
     NO PADDLE REDIRECT
  ========================================================= */

  if (payBtn) {

    payBtn.addEventListener(
      "click",
      event => {

        event.preventDefault();

        console.log(
          "CREATE MY PLAN CLICKED — NO PAYMENT TEST MODE"
        );

        createPlan();

      }
    );

  }


  /* =========================================================
     STAY RENDERER
  ========================================================= */

  function renderStay(
    stay,
    hotels
  ) {

    let html = "";


    if (
      typeof stay === "string"
    ) {

      html +=
        `<div class="planner-status">
          ${escapeHTML(stay)}
        </div>`;

    } else if (
      stay &&
      typeof stay === "object"
    ) {

      if (stay.strategy) {

        html += `
          <div class="planner-status">
            ${escapeHTML(
              displayValue(
                stay.strategy
              )
            )}
          </div>
        `;

      }


      if (
        Array.isArray(
          stay.areas
        ) &&
        stay.areas.length
      ) {

        html += `
          <h3>
            Recommended Areas
          </h3>

          <ul>

            ${
              stay.areas
                .map(
                  area =>
                    `<li>
                      ${escapeHTML(
                        displayValue(area)
                      )}
                    </li>`
                )
                .join("")
            }

          </ul>
        `;

      }


      if (
        Array.isArray(
          stay.tips
        ) &&
        stay.tips.length
      ) {

        html += `
          <h3>
            Accommodation Tips
          </h3>

          <ul>

            ${
              stay.tips
                .map(
                  tip =>
                    `<li>
                      ${escapeHTML(
                        displayValue(tip)
                      )}
                    </li>`
                )
                .join("")
            }

          </ul>
        `;

      }

    }


    /* -------------------------------------------------------
       HOTELS
    ------------------------------------------------------- */

    if (
      Array.isArray(hotels) &&
      hotels.length
    ) {

      html += `
        <h3 style="margin-top:25px;">
          Live Hotel Options
        </h3>

        <div class="hotels-grid">

          ${
            hotels
              .map(
                hotel =>
                  renderHotel(
                    hotel
                  )
              )
              .join("")
          }

        </div>
      `;

    }


    if (!html) {

      html = `
        <div class="planner-status">
          Accommodation strategy unavailable.
        </div>
      `;

    }


    safeSetHTML(
      stayContent,
      html
    );

  }


  /* =========================================================
     HOTEL RENDERER
  ========================================================= */

  function renderHotel(hotel) {

    if (
      !hotel ||
      typeof hotel !== "object"
    ) {

      return "";

    }


    const name =
      displayValue(
        hotel.name ||
        hotel.title ||
        hotel.hotelName ||
        hotel.propertyName
      ) ||
      "Hotel";


    const location =
      displayValue(
        hotel.location ||
        hotel.address ||
        hotel.city
      );


    const rating =
      displayValue(
        hotel.rating ||
        hotel.guestRating ||
        hotel.guest_rating ||
        hotel.review_score
      );


    const stars =
      displayValue(
        hotel.starRating ||
        hotel.star_rating ||
        hotel.stars
      );


    const price =
      displayValue(
        hotel.price ||
        hotel.pricePerNight ||
        hotel.price_per_night ||
        hotel.amount ||
        hotel.totalPrice
      );


    const currency =
      displayValue(
        hotel.currency ||
        hotel.currencyCode
      ) ||
      "USD";


    const url =
      displayValue(
        hotel.url ||
        hotel.link ||
        hotel.property_url
      );


    let html = `

      <article class="hotel-card">

        <div class="hotel-body">

          <div class="hotel-name">
            ${escapeHTML(name)}
          </div>

          ${
            location
              ? `
                <div class="hotel-meta">
                  📍
                  ${escapeHTML(location)}
                </div>
              `
              : ""
          }

          ${
            stars
              ? `
                <div class="hotel-meta">
                  ⭐
                  ${escapeHTML(stars)}
                  stars
                </div>
              `
              : ""
          }

          ${
            rating
              ? `
                <div class="hotel-meta">
                  Guest rating:
                  ${escapeHTML(rating)}
                </div>
              `
              : ""
          }

          ${
            price
              ? `
                <div class="hotel-price">
                  ${escapeHTML(price)}
                  <span class="hotel-price-label">
                    ${escapeHTML(currency)}
                  </span>
                </div>
              `
              : ""
          }

          ${
            url
              ? `
                <a
                  class="hotel-button"
                  href="${escapeHTML(url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Hotel
                </a>
              `
              : ""
          }

        </div>

      </article>

    `;


    return html;

  }


  /* =========================================================
     TRANSPORT RENDERER
  ========================================================= */

  function renderTransport(
    transport
  ) {

    let html = "";


    if (
      typeof transport === "string"
    ) {

      html =
        `<div class="planner-status">
          ${escapeHTML(transport)}
        </div>`;

    } else if (
      transport &&
      typeof transport === "object"
    ) {

      if (transport.strategy) {

        html += `
          <div class="planner-status">
            ${escapeHTML(
              displayValue(
                transport.strategy
              )
            )}
          </div>
        `;

      }


      if (transport.airport) {

        html += `
          <h3>
            Airport Transfer
          </h3>

          <p>
            ${escapeHTML(
              displayValue(
                transport.airport
              )
            )}
          </p>
        `;

      }


      if (
        Array.isArray(
          transport.local
        )
      ) {

        html += `
          <h3>
            Local Transportation
          </h3>

          <ul>

            ${
              transport.local
                .map(
                  item =>
                    `<li>
                      ${escapeHTML(
                        displayValue(item)
                      )}
                    </li>`
                )
                .join("")
            }

          </ul>
        `;

      }

    }


    safeSetHTML(
      transportContent,
      html ||
      `
        <div class="planner-status">
          Transportation strategy unavailable.
        </div>
      `
    );

  }


  /* =========================================================
     EXPERIENCES RENDERER
  ========================================================= */

  function renderExperiences(
    experiences,
    restaurants
  ) {

    let html = "";


    if (
      typeof experiences === "string"
    ) {

      html += `
        <div class="planner-status">
          ${escapeHTML(experiences)}
        </div>
      `;

    } else if (
      experiences &&
      typeof experiences === "object"
    ) {

      if (experiences.summary) {

        html += `
          <div class="planner-status">
            ${escapeHTML(
              displayValue(
                experiences.summary
              )
            )}
          </div>
        `;

      }


      if (
        Array.isArray(
          experiences.places
        ) &&
        experiences.places.length
      ) {

        html += `
          <h3>
            Places & Experiences
          </h3>

          <ul>

            ${
              experiences.places
                .map(
                  place =>
                    `<li>
                      ${escapeHTML(
                        displayValue(place)
                      )}
                    </li>`
                )
                .join("")
            }

          </ul>
        `;

      }


      if (
        Array.isArray(
          experiences.food
        ) &&
        experiences.food.length
      ) {

        html += `
          <h3>
            Food Experiences
          </h3>

          <ul>

            ${
              experiences.food
                .map(
                  food =>
                    `<li>
                      ${escapeHTML(
                        displayValue(food)
                      )}
                    </li>`
                )
                .join("")
            }

          </ul>
        `;

      }

    }


    if (
      Array.isArray(restaurants) &&
      restaurants.length
    ) {

      html += `
        <h3 style="margin-top:25px;">
          🍽️ Restaurants
        </h3>

        <div class="restaurants-grid">

          ${
            restaurants
              .map(
                restaurant =>
                  renderRestaurant(
                    restaurant
                  )
              )
              .join("")
          }

        </div>
      `;

    }


    safeSetHTML(
      experiencesContent,
      html ||
      `
        <div class="planner-status">
          No experiences were returned.
        </div>
      `
    );

  }


  /* =========================================================
     RESTAURANT
  ========================================================= */

  function renderRestaurant(
    restaurant
  ) {

    if (
      !restaurant ||
      typeof restaurant !== "object"
    ) {
      return "";
    }


    const name =
      displayValue(
        restaurant.name ||
        restaurant.title
      ) ||
      "Restaurant";


    const cuisine =
      displayValue(
        restaurant.cuisine
      );


    const location =
      displayValue(
        restaurant.location
      );


    const description =
      displayValue(
        restaurant.description
      );


    const url =
      displayValue(
        restaurant.url ||
        restaurant.link
      );


    return `

      <article class="restaurant-card">

        <div class="restaurant-name">
          ${escapeHTML(name)}
        </div>

        ${
          cuisine
            ? `
              <div class="restaurant-meta">
                🍴
                ${escapeHTML(cuisine)}
              </div>
            `
            : ""
        }

        ${
          location
            ? `
              <div class="restaurant-meta">
                📍
                ${escapeHTML(location)}
              </div>
            `
            : ""
        }

        ${
          description
            ? `
              <div class="restaurant-description">
                ${escapeHTML(description)}
              </div>
            `
            : ""
        }

        ${
          url
            ? `
              <a
                class="restaurant-button"
                href="${escapeHTML(url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                View
              </a>
            `
            : ""
        }

      </article>

    `;

  }


  /* =========================================================
     BUDGET
  ========================================================= */

  function renderBudget(
    budget
  ) {

    if (
      typeof budget === "string"
    ) {

      safeSetHTML(
        moneyContent,
        `<div class="planner-status">
          ${escapeHTML(budget)}
        </div>`
      );

      return;
    }


    if (
      !budget ||
      typeof budget !== "object"
    ) {

      safeSetHTML(
        moneyContent,
        `
          <div class="planner-status">
            Budget strategy unavailable.
          </div>
        `
      );

      return;

    }


    const fields = [

      ["Accommodation", "accommodation"],
      ["Transportation", "transportation"],
      ["Food", "food"],
      ["Activities", "activities"],
      ["Other", "other"],
      ["Total", "total"]

    ];


    let html =
      `<div class="budget-box">`;


    fields.forEach(
      ([label, key]) => {

        if (
          budget[key] !== undefined
        ) {

          html += `

            <div class="budget-row">

              <span>
                ${escapeHTML(label)}
              </span>

              <strong>
                ${escapeHTML(
                  displayValue(
                    budget[key]
                  )
                )}
              </strong>

            </div>

          `;

        }

      }
    );


    html +=
      `</div>`;


    if (budget.strategy) {

      html += `

        <div class="planner-status">

          <strong>
            Strategy:
          </strong>

          <br>

          ${escapeHTML(
            displayValue(
              budget.strategy
            )
          )}

        </div>

      `;

    }


    safeSetHTML(
      moneyContent,
      html
    );

  }


  /* =========================================================
     DAYS
  ========================================================= */

  function renderDays(
    days
  ) {

    if (
      typeof days === "string"
    ) {

      safeSetHTML(
        daysContent,
        days
      );

      return;

    }


    if (
      !Array.isArray(days) ||
      !days.length
    ) {

      safeSetHTML(
        daysContent,
        `
          <div class="planner-status">
            No itinerary days were returned.
          </div>
        `
      );

      return;

    }


    const html =
      `<div class="days-container">

        ${
          days
            .map(
              (day, index) => {

                const number =
                  displayValue(
                    day?.day
                  ) ||
                  String(index + 1);


                const title =
                  displayValue(
                    day?.title
                  ) ||
                  `Day ${number}`;


                const morning =
                  displayValue(
                    day?.morning
                  );


                const afternoon =
                  displayValue(
                    day?.afternoon
                  );


                const evening =
                  displayValue(
                    day?.evening
                  );


                return `

                  <article class="day">

                    <h3>
                      Day
                      ${escapeHTML(number)}
                      —
                      ${escapeHTML(title)}
                    </h3>

                    ${
                      morning
                        ? `
                          <div class="day-part">

                            <strong>
                              🌅 Morning
                            </strong>

                            <div>
                              ${escapeHTML(
                                morning
                              )}
                            </div>

                          </div>
                        `
                        : ""
                    }


                    ${
                      afternoon
                        ? `
                          <div class="day-part">

                            <strong>
                              ☀️ Afternoon
                            </strong>

                            <div>
                              ${escapeHTML(
                                afternoon
                              )}
                            </div>

                          </div>
                        `
                        : ""
                    }


                    ${
                      evening
                        ? `
                          <div class="day-part">

                            <strong>
                              🌙 Evening
                            </strong>

                            <div>
                              ${escapeHTML(
                                evening
                              )}
                            </div>

                          </div>
                        `
                        : ""
                    }

                  </article>

                `;

              }
            )
            .join("")
        }

      </div>`;


    safeSetHTML(
      daysContent,
      html
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


  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      event => {

        event.preventDefault();


        const targetSectionId =
          tab.getAttribute(
            "data-target"
          );


        if (!targetSectionId) {
          return;
        }


        tabs.forEach(
          t =>
            t.classList.remove(
              "active"
            )
        );


        sections.forEach(
          section => {

            section.classList.add(
              "hidden"
            );

            section.classList.remove(
              "active"
            );

          }
        );


        tab.classList.add(
          "active"
        );


        const targetSection =
          document.getElementById(
            targetSectionId
          );


        if (targetSection) {

          targetSection.classList.remove(
            "hidden"
          );

          targetSection.classList.add(
            "active"
          );

        }

      }
    );

  });


  /* =========================================================
     INITIAL STATE
  ========================================================= */

  sections.forEach(
    section => {

      if (
        section.id === "staySection"
      ) {

        section.classList.remove(
          "hidden"
        );

        section.classList.add(
          "active"
        );

      } else {

        section.classList.add(
          "hidden"
        );

        section.classList.remove(
          "active"
        );

      }

    }
  );


  /* =========================================================
     READY
  ========================================================= */

  console.log(
    "AI LIFE PLANNER READY — TEST MODE"
  );

});

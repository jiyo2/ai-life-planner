document.addEventListener("DOMContentLoaded", () => {

  // =========================================================
  // UI ELEMENTS
  // =========================================================

  const plannerForm = document.getElementById("plannerForm");
  const appScreen = document.getElementById("app");
  const reviewScreen = document.getElementById("review");
  const planScreen = document.getElementById("plan");

  const summaryDiv = document.getElementById("summary");
  const closeReviewBtn = document.getElementById("closeReview");
  const payBtn = document.getElementById("pay");

  const chips = document.querySelectorAll(".chip");

  const selectedInterests = new Set();

  let formData = {};


  // =========================================================
  // HOTEL + RESTAURANT + DAY PLAN STYLES
  // =========================================================

  if (!document.getElementById("aiPlannerHotelStyles")) {

    const style = document.createElement("style");

    style.id = "aiPlannerHotelStyles";

    style.textContent = `

      /* =====================================================
         HOTEL LIST
      ===================================================== */

      .hotel-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin-top: 24px;
      }

      .hotel-card {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 24px;
        background: #ffffff;
        border: 1px solid #e8e8ee;
        border-radius: 20px;
        padding: 18px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.06);
        transition: transform .2s ease, box-shadow .2s ease;
        overflow: hidden;
      }

      .hotel-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.09);
      }

      .hotel-image-wrap {
        width: 100%;
        height: 220px;
        border-radius: 15px;
        overflow: hidden;
        background: linear-gradient(135deg, #f2f3f7, #e5e7ec);
        position: relative;
      }

      .hotel-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hotel-image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #8b8f9a;
        font-size: 14px;
        text-align: center;
        padding: 20px;
        background: linear-gradient(
          135deg,
          #f5f6f8 0%,
          #e8eaf0 100%
        );
      }

      .hotel-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .hotel-number {
        font-size: 12px;
        font-weight: 700;
        color: #8b8f9a;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 6px;
      }

      .hotel-name {
        font-size: 24px;
        line-height: 1.2;
        font-weight: 750;
        color: #17181c;
        margin: 0 0 8px;
      }

      .hotel-rating {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .hotel-stars {
        color: #f2b84b;
        font-size: 16px;
        letter-spacing: 1px;
      }

      .hotel-star-text {
        font-size: 14px;
        color: #666b76;
        font-weight: 600;
      }

      .hotel-price {
        margin-bottom: 12px;
        display: flex;
        align-items: baseline;
        gap: 5px;
        flex-wrap: wrap;
      }

      .hotel-price-value {
        font-size: 24px;
        font-weight: 800;
        color: #15171b;
      }

      .hotel-price-label {
        font-size: 13px;
        color: #777c86;
      }

      .hotel-description {
        font-size: 14px;
        line-height: 1.65;
        color: #555b66;
        margin-bottom: 15px;
      }

      .hotel-amenities-title {
        font-size: 13px;
        font-weight: 700;
        color: #22242a;
        margin-bottom: 8px;
      }

      .hotel-amenities {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 18px;
      }

      .hotel-amenity {
        background: #f5f6f8;
        border: 1px solid #e9eaee;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        color: #50555f;
      }

      .hotel-actions {
        margin-top: auto;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .booking-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 11px;
        background: #111827;
        color: #ffffff !important;
        text-decoration: none !important;
        font-size: 14px;
        font-weight: 700;
        transition: all .2s ease;
      }

      .booking-button:hover {
        background: #252b38;
        transform: translateY(-1px);
      }

      .booking-arrow {
        font-size: 16px;
      }

      .hotel-intro {
        margin-bottom: 4px;
      }

      .hotel-intro h3 {
        margin: 0 0 6px;
        font-size: 20px;
      }

      .hotel-intro p {
        margin: 0;
        color: #70757f;
        line-height: 1.6;
      }


      /* =====================================================
         RESTAURANT LIST
      ===================================================== */

      .restaurant-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin-top: 24px;
      }

      .restaurant-card {
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 24px;
        background: #ffffff;
        border: 1px solid #e8e8ee;
        border-radius: 20px;
        padding: 18px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.06);
        transition: transform .2s ease, box-shadow .2s ease;
        overflow: hidden;
      }

      .restaurant-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.09);
      }

      .restaurant-image-wrap {
        width: 100%;
        height: 220px;
        border-radius: 15px;
        overflow: hidden;
        background: linear-gradient(135deg, #f2f3f7, #e5e7ec);
      }

      .restaurant-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .restaurant-image-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #8b8f9a;
        font-size: 14px;
        text-align: center;
        padding: 20px;
        background: linear-gradient(
          135deg,
          #f5f6f8 0%,
          #e8eaf0 100%
        );
      }

      .restaurant-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .restaurant-number {
        font-size: 12px;
        font-weight: 700;
        color: #8b8f9a;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 6px;
      }

      .restaurant-name {
        font-size: 24px;
        line-height: 1.2;
        font-weight: 750;
        color: #17181c;
        margin: 0 0 10px;
      }

      .restaurant-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
      }

      .restaurant-cuisine,
      .restaurant-price {
        background: #f5f6f8;
        border: 1px solid #e9eaee;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        color: #50555f;
        font-weight: 600;
      }

      .restaurant-rating {
        font-size: 14px;
        font-weight: 700;
        color: #d49b20;
      }

      .restaurant-address {
        font-size: 13px;
        line-height: 1.5;
        color: #666b76;
        margin-bottom: 10px;
      }

      .restaurant-description {
        font-size: 14px;
        line-height: 1.65;
        color: #555b66;
        margin-bottom: 18px;
      }

      .restaurant-actions {
        margin-top: auto;
      }

      .maps-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 11px;
        background: #111827;
        color: #ffffff !important;
        text-decoration: none !important;
        font-size: 14px;
        font-weight: 700;
        transition: all .2s ease;
      }

      .maps-button:hover {
        background: #252b38;
        transform: translateY(-1px);
      }

      .restaurant-intro {
        margin-bottom: 4px;
      }

      .restaurant-intro h3 {
        margin: 0 0 6px;
        font-size: 20px;
      }

      .restaurant-intro p {
        margin: 0;
        color: #70757f;
        line-height: 1.6;
      }


      /* =====================================================
         DAY BY DAY
      ===================================================== */

      .day-plan-wrapper {
        display: flex;
        flex-direction: column;
        gap: 18px;
        margin-top: 20px;
      }

      .day-card {
        background: #ffffff;
        border: 1px solid #e8e8ee;
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.05);
      }

      .day-card-header {
        margin-bottom: 15px;
      }

      .day-card-title {
        margin: 0;
        font-size: 20px;
        font-weight: 750;
        color: #17181c;
      }

      .day-card-date {
        margin-top: 5px;
        color: #777c86;
        font-size: 13px;
      }

      .day-card-description {
        color: #555b66;
        line-height: 1.65;
        margin-bottom: 15px;
      }

      .day-activity-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .day-activity {
        padding: 12px 14px;
        background: #f7f7f9;
        border: 1px solid #ededf1;
        border-radius: 12px;
      }

      .day-activity-time {
        font-size: 12px;
        font-weight: 700;
        color: #666b76;
        margin-bottom: 4px;
      }

      .day-activity-title {
        font-size: 15px;
        font-weight: 700;
        color: #202229;
      }

      .day-activity-description {
        margin-top: 4px;
        font-size: 13px;
        line-height: 1.55;
        color: #626773;
      }

      .day-plan-empty {
        padding: 20px;
        border-radius: 14px;
        background: #f7f7f8;
        color: #666;
        line-height: 1.6;
      }


      /* =====================================================
         MOBILE
      ===================================================== */

      @media (max-width: 700px) {

        .hotel-card,
        .restaurant-card {
          grid-template-columns: 1fr;
          gap: 16px;
          padding: 14px;
          border-radius: 17px;
        }

        .hotel-image-wrap,
        .restaurant-image-wrap {
          height: 200px;
        }

        .hotel-name,
        .restaurant-name {
          font-size: 21px;
        }

        .hotel-price-value {
          font-size: 22px;
        }

        .hotel-actions,
        .restaurant-actions {
          margin-top: 5px;
        }

        .booking-button,
        .maps-button {
          width: 100%;
        }

        .day-card {
          padding: 16px;
        }

      }

    `;

    document.head.appendChild(style);
  }


  // =========================================================
  // INTEREST CHIPS
  // =========================================================

  chips.forEach((chip) => {

    chip.addEventListener("click", () => {

      const interest =
        chip.textContent.trim();

      if (selectedInterests.has(interest)) {

        selectedInterests.delete(interest);
        chip.classList.remove("active");

      } else {

        selectedInterests.add(interest);
        chip.classList.add("active");

      }

    });

  });


  // =========================================================
  // FORM SUBMISSION
  // =========================================================

  if (plannerForm) {

    plannerForm.addEventListener("submit", (e) => {

      e.preventDefault();

      formData = {

        destination:
          document
            .getElementById("destination")
            .value
            .trim(),

        startDate:
          document
            .getElementById("startDate")
            .value ||
          "Flexible",

        days:
          document
            .getElementById("days")
            .value,

        budget:
          document
            .getElementById("budget")
            .value,

        travelers:
          document
            .getElementById("travelers")
            .value,

        interests:
          Array
            .from(selectedInterests)
            .join(", ") ||
          "General Sightseeing",

        notes:
          document
            .getElementById("notes")
            .value
            .trim() ||
          "None"

      };


      if (summaryDiv) {

        summaryDiv.innerHTML = `

          <p>
            Destination:
            <strong>
              ${escapeHTML(formData.destination)}
            </strong>
          </p>

          <p>
            Duration:
            <strong>
              ${escapeHTML(formData.days)} Days
            </strong>
            (Starts:
            ${escapeHTML(formData.startDate)})
          </p>

          <p>
            Budget limit:
            <strong>
              $${escapeHTML(formData.budget)}
            </strong>
          </p>

          <p>
            Party size:
            <strong>
              ${escapeHTML(formData.travelers)}
            </strong>
          </p>

          <p>
            Interests:
            <strong>
              ${escapeHTML(formData.interests)}
            </strong>
          </p>

          <p>
            Special requests:
            <strong>
              ${escapeHTML(formData.notes)}
            </strong>
          </p>

        `;

      }


      if (appScreen) {
        appScreen.classList.add("hidden");
      }

      if (reviewScreen) {
        reviewScreen.classList.remove("hidden");
      }

    });

  }


  // =========================================================
  // EDIT BUTTON
  // =========================================================

  if (closeReviewBtn) {

    closeReviewBtn.addEventListener("click", () => {

      if (reviewScreen) {
        reviewScreen.classList.add("hidden");
      }

      if (appScreen) {
        appScreen.classList.remove("hidden");
      }

    });

  }


  // =========================================================
  // DEMO PAYMENT FLOW
  // =========================================================

  if (payBtn) {

    payBtn.addEventListener("click", () => {

      localStorage.setItem(
        "pendingTripData",
        JSON.stringify(formData)
      );

      localStorage.setItem(
        "hasPaid",
        "true"
      );

      if (appScreen) {
        appScreen.classList.add("hidden");
      }

      if (reviewScreen) {
        reviewScreen.classList.add("hidden");
      }

      if (planScreen) {
        planScreen.classList.remove("hidden");
      }

      generatePlan(formData);

    });

  }


  // =========================================================
  // RETURN / DEMO RECOVERY
  // =========================================================

  window.addEventListener("load", () => {

    const hasPaid =
      localStorage.getItem("hasPaid");

    const savedData =
      localStorage.getItem("pendingTripData");

    if (
      hasPaid === "true" &&
      savedData
    ) {

      try {

        const parsedData =
          JSON.parse(savedData);

        localStorage.removeItem("hasPaid");

        localStorage.removeItem(
          "pendingTripData"
        );

        if (appScreen) {
          appScreen.classList.add("hidden");
        }

        if (reviewScreen) {
          reviewScreen.classList.add("hidden");
        }

        if (planScreen) {
          planScreen.classList.remove("hidden");
        }

        generatePlan(parsedData);

      } catch (error) {

        console.error(
          "Saved trip data error:",
          error
        );

      }

    }

  });


  // =========================================================
  // GENERATE PLAN
  // =========================================================

  async function generatePlan(tripData) {

    const planTitle =
      document.getElementById("planTitle");

    const planIntro =
      document.getElementById("planIntro");


    if (planTitle) {

      planTitle.textContent =
        "Creating your personalized plan...";

    }

    if (planIntro) {

      planIntro.textContent =
        "Our AI is building your itinerary. Please wait a moment.";

    }


    const stayContent =
      document.getElementById("stayContent");

    const restaurantsContent =
      document.getElementById("restaurantsContent");

    const transportContent =
      document.getElementById("transportContent");

    const experiencesContent =
      document.getElementById("experiencesContent");

    const moneyContent =
      document.getElementById("moneyContent");

    const daysContent =
      document.getElementById("daysContent");


    if (stayContent) {
      stayContent.innerHTML =
        "Generating accommodation strategy...";
    }

    if (restaurantsContent) {
      restaurantsContent.innerHTML =
        "Finding restaurants in your destination...";
    }

    if (transportContent) {
      transportContent.innerHTML =
        "Generating transport guide...";
    }

    if (experiencesContent) {
      experiencesContent.innerHTML =
        "Generating curated experiences...";
    }

    if (moneyContent) {
      moneyContent.innerHTML =
        "Calculating budget split...";
    }

    if (daysContent) {
      daysContent.innerHTML =
        "Structuring your days...";
    }


    try {

      console.log(
        "Sending trip data to /api/plan:",
        tripData
      );


      const response =
        await fetch(
          "/api/plan",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                tripData
              )
          }
        );


      const rawResponse =
        await response.text();


      console.log(
        "PLAN API HTTP STATUS:",
        response.status
      );

      console.log(
        "PLAN API RAW RESPONSE:",
        rawResponse
      );


      let data;


      try {

        data =
          JSON.parse(
            rawResponse
          );

      } catch (jsonError) {

        console.error(
          "API returned invalid JSON:",
          rawResponse
        );

        throw new Error(
          "The server returned an invalid response."
        );

      }


      if (!response.ok) {

        throw new Error(
          data.details ||
          data.error ||
          "The travel plan could not be generated."
        );

      }


      console.log(
        "Parsed PLAN API data:",
        data
      );


      // =====================================================
      // HEADER
      // =====================================================

      if (planTitle) {

        planTitle.textContent =
          `Your Trip to ${tripData.destination}`;

      }

      if (planIntro) {

        planIntro.textContent =
          `Customized strategy for ${tripData.days} days with a $${tripData.budget} budget.`;

      }


      // =====================================================
      // HOTELS
      // =====================================================

      renderHotels(
        data.stay ||
        data.hotels ||
        data.accommodation ||
        data.hotelRecommendations,
        tripData.destination
      );


      // =====================================================
      // RESTAURANTS
      // =====================================================

      console.log(
        "Restaurants received:",
        data.restaurants
      );

      renderRestaurants(
        data.restaurants ||
        data.restaurantRecommendations,
        tripData.destination
      );


      // =====================================================
      // TRANSPORT
      // =====================================================

      if (transportContent) {

        transportContent.innerHTML =
          renderFlexibleContent(
            data.transport
          );

      }


      // =====================================================
      // EXPERIENCES
      // =====================================================

      if (experiencesContent) {

        experiencesContent.innerHTML =
          renderFlexibleContent(
            data.experiences
          );

      }


      // =====================================================
      // MONEY
      // =====================================================

      if (moneyContent) {

        moneyContent.innerHTML =
          renderFlexibleContent(
            data.money
          );

      }


      // =====================================================
      // DAY PLAN
      // =====================================================

      if (daysContent) {

        renderDayPlan(
          data.daysPlan ||
          data.dayByDay ||
          data.itinerary ||
          data.dailyPlan ||
          data.days ||
          data.dayPlan,
          daysContent,
          tripData
        );

      }


    } catch (error) {

      console.error(
        "PLAN GENERATION ERROR:",
        error
      );


      if (planTitle) {

        planTitle.textContent =
          "Generation Error";

      }

      if (planIntro) {

        planIntro.textContent =
          "The travel plan could not be generated.";

      }


      const errorHTML = `

        <div style="
          padding:20px;
          border-radius:14px;
          background:#fff4f4;
          border:1px solid #ffd6d6;
          color:#a33;
        ">

          <strong>
            Something went wrong.
          </strong>

          <div style="
            margin-top:8px;
            font-size:14px;
          ">
            ${escapeHTML(
              error.message
            )}
          </div>

        </div>

      `;


      if (stayContent) {
        stayContent.innerHTML = errorHTML;
      }

      if (restaurantsContent) {
        restaurantsContent.innerHTML = errorHTML;
      }

      if (daysContent) {
        daysContent.innerHTML = errorHTML;
      }

    }

  }


  // =========================================================
  // RENDER HOTELS
  // =========================================================

  function renderHotels(
    stayData,
    destination
  ) {

    const container =
      document.getElementById(
        "stayContent"
      );


    if (!container) {

      console.error(
        "stayContent element not found."
      );

      return;

    }


    const hotels =
      normalizeArray(
        stayData
      );


    if (hotels.length === 0) {

      container.innerHTML = `

        <div style="
          padding:20px;
          background:#f7f7f8;
          border-radius:14px;
          color:#666;
        ">

          No accommodation recommendations
          were returned.

        </div>

      `;

      return;

    }


    const intro =
      document.createElement("div");


    intro.className =
      "hotel-intro";


    intro.innerHTML = `

      <h3>
        Recommended stays in
        ${escapeHTML(destination)}
      </h3>

      <p>
        Compare accommodation options selected
        for your trip.
      </p>

    `;


    const hotelList =
      document.createElement("div");


    hotelList.className =
      "hotel-list";


    hotels
      .slice(0, 10)
      .forEach(
        (hotel, index) => {

          const card =
            createHotelCard(
              hotel,
              index + 1,
              destination
            );

          hotelList.appendChild(
            card
          );

        }
      );


    container.innerHTML = "";

    container.appendChild(
      intro
    );

    container.appendChild(
      hotelList
    );

  }


  // =========================================================
  // CREATE HOTEL CARD
  // =========================================================

  function createHotelCard(
    hotel,
    number,
    destination
  ) {

    hotel =
      hotel && typeof hotel === "object"
        ? hotel
        : {};


    const card =
      document.createElement(
        "article"
      );


    card.className =
      "hotel-card";


    const name =
      firstValue(
        hotel.name,
        hotel.hotelName,
        hotel.title
      ) ||
      "Recommended Accommodation";


    const stars =
      parseStars(
        firstValue(
          hotel.stars,
          hotel.starRating,
          hotel.rating
        )
      );


    const priceInfo =
      normalizePrice(
        hotel.price ||
        hotel.pricePerNight ||
        hotel.nightlyPrice ||
        hotel.rate ||
        hotel.cost
      );


    const currency =
      firstValue(
        hotel.currency,
        hotel.priceCurrency
      ) ||
      priceInfo.currency ||
      "USD";


    const priceType =
      firstValue(
        hotel.priceType,
        hotel.priceLabel,
        hotel.rateType
      ) ||
      priceInfo.label ||
      "estimated per night";


    const description =
      firstValue(
        hotel.description,
        hotel.summary,
        hotel.details
      ) ||
      "A recommended accommodation option selected for this trip.";


    const amenities =
      normalizeAmenities(
        hotel.amenities ||
        hotel.facilities ||
        hotel.services ||
        hotel.features ||
        hotel.hotelServices
      );


    const image =
      extractImage(
        hotel
      );


    let imageHTML = "";


    if (image) {

      imageHTML = `

        <img
          class="hotel-image"
          src="${escapeAttribute(image)}"
          alt="${escapeAttribute(name)}"
          loading="lazy"
          onerror="
            this.style.display='none';
            this.nextElementSibling.style.display='flex';
          "
        >

        <div
          class="hotel-image-placeholder"
          style="display:none;"
        >
          Hotel photo unavailable
        </div>

      `;

    } else {

      imageHTML = `

        <div class="hotel-image-placeholder">
          Hotel photo unavailable
        </div>

      `;

    }


    let starsHTML = "";


    if (stars > 0) {

      starsHTML = `

        <div class="hotel-rating">

          <span class="hotel-stars">
            ${"★".repeat(
              Math.min(
                stars,
                5
              )
            )}
          </span>

          <span class="hotel-star-text">
            ${stars}-star property
          </span>

        </div>

      `;

    }


    let priceHTML = "";


    if (
      priceInfo.value !== null &&
      priceInfo.value !== undefined &&
      priceInfo.value !== ""
    ) {

      priceHTML = `

        <div class="hotel-price">

          <span class="hotel-price-value">

            ${escapeHTML(
              formatPriceValue(
                priceInfo.value
              )
            )}
            ${escapeHTML(
              String(currency)
            )}

          </span>

          <span class="hotel-price-label">
            ${escapeHTML(
              priceType
            )}
          </span>

        </div>

      `;

    }


    let amenitiesHTML = "";


    if (amenities.length > 0) {

      amenitiesHTML = `

        <div class="hotel-amenities-title">
          Amenities
        </div>

        <div class="hotel-amenities">

          ${amenities
            .slice(0, 12)
            .map(
              amenity => `
                <span class="hotel-amenity">
                  ${escapeHTML(
                    String(
                      amenity
                    )
                  )}
                </span>
              `
            )
            .join("")
          }

        </div>

      `;

    }


    const bookingURL =
      firstValue(
        hotel.bookingUrl,
        hotel.bookingURL,
        hotel.booking,
        hotel.url
      ) ||
      createBookingSearchURL(
        name,
        destination
      );


    card.innerHTML = `

      <div class="hotel-image-wrap">

        ${imageHTML}

      </div>


      <div class="hotel-info">

        <div class="hotel-number">
          Option ${number}
        </div>

        <h3 class="hotel-name">
          ${escapeHTML(name)}
        </h3>

        ${starsHTML}

        ${priceHTML}

        <div class="hotel-description">
          ${escapeHTML(
            description
          )}
        </div>

        ${amenitiesHTML}

        <div class="hotel-actions">

          <a
            class="booking-button"
            href="${escapeAttribute(
              bookingURL
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check availability on Booking.com

            <span class="booking-arrow">
              ↗
            </span>

          </a>

        </div>

      </div>

    `;


    return card;

  }


  // =========================================================
  // RENDER RESTAURANTS
  // =========================================================

  function renderRestaurants(
    restaurantData,
    destination
  ) {

    const container =
      document.getElementById(
        "restaurantsContent"
      );


    if (!container) {

      console.error(
        "restaurantsContent element not found in HTML."
      );

      return;

    }


    container.innerHTML = "";


    const restaurants =
      normalizeArray(
        restaurantData
      );


    if (restaurants.length === 0) {

      container.innerHTML = `

        <div style="
          padding:20px;
          background:#f7f7f8;
          border-radius:14px;
          color:#666;
          line-height:1.6;
        ">

          <strong>
            No local restaurants found.
          </strong>

          <div style="
            margin-top:8px;
            font-size:14px;
          ">

            We could not find real restaurants
            listed for
            ${escapeHTML(destination)}.

          </div>

        </div>

      `;

      return;

    }


    const introWrapper =
      document.createElement("div");


    introWrapper.innerHTML = `

      <div class="restaurant-intro">

        <h3>
          Recommended restaurants in
          ${escapeHTML(destination)}
        </h3>

        <p>
          Real local restaurants found for your destination.
        </p>

      </div>

    `;


    container.appendChild(
      introWrapper
    );


    const restaurantList =
      document.createElement("div");


    restaurantList.className =
      "restaurant-list";


    restaurants
      .slice(0, 10)
      .forEach(
        (restaurant, index) => {

          const card =
            createRestaurantCard(
              restaurant,
              index + 1,
              destination
            );

          restaurantList.appendChild(
            card
          );

        }
      );


    container.appendChild(
      restaurantList
    );

  }


  // =========================================================
  // CREATE RESTAURANT CARD
  // =========================================================

  function createRestaurantCard(
    restaurant,
    number,
    destination
  ) {

    restaurant =
      restaurant && typeof restaurant === "object"
        ? restaurant
        : {};


    const card =
      document.createElement(
        "article"
      );


    card.className =
      "restaurant-card";


    const name =
      firstValue(
        restaurant.name,
        restaurant.restaurantName,
        restaurant.title
      ) ||
      "Local Restaurant";


    const cuisine =
      firstValue(
        restaurant.cuisine,
        restaurant.cuisines,
        restaurant.type,
        restaurant.category
      ) ||
      "Local cuisine";


    const priceLevel =
      firstValue(
        restaurant.priceLevel,
        restaurant.price_range,
        restaurant.priceRange,
        restaurant.price
      ) ||
      "$$";


    const rating =
      firstValue(
        restaurant.rating,
        restaurant.stars,
        restaurant.score
      );


    const address =
      firstValue(
        restaurant.address,
        restaurant.formattedAddress,
        restaurant.location?.address,
        restaurant.location?.formatted_address
      ) ||
      destination;


    const description =
      firstValue(
        restaurant.description,
        restaurant.summary
      ) ||
      `A real restaurant in ${destination}.`;


    const image =
      extractImage(
        restaurant
      );


    const mapsURL =
      firstValue(
        restaurant.mapsUrl,
        restaurant.mapUrl,
        restaurant.googleMapsUrl,
        restaurant.url
      ) ||
      createOpenStreetMapURL(
        restaurant,
        destination
      );


    let imageHTML = "";


    if (image) {

      imageHTML = `

        <img
          class="restaurant-image"
          src="${escapeAttribute(image)}"
          alt="${escapeAttribute(name)}"
          loading="lazy"
          onerror="
            this.style.display='none';
            this.nextElementSibling.style.display='flex';
          "
        >

        <div
          class="restaurant-image-placeholder"
          style="display:none;"
        >
          Restaurant photo unavailable
        </div>

      `;

    } else {

      imageHTML = `

        <div class="restaurant-image-placeholder">
          Restaurant photo unavailable
        </div>

      `;

    }


    let ratingHTML = "";


    if (
      rating !== null &&
      rating !== undefined &&
      rating !== ""
    ) {

      ratingHTML = `

        <span class="restaurant-rating">
          ★ ${escapeHTML(
            String(rating)
          )}
        </span>

      `;

    }


    card.innerHTML = `

      <div class="restaurant-image-wrap">

        ${imageHTML}

      </div>


      <div class="restaurant-info">

        <div class="restaurant-number">
          Option ${number}
        </div>


        <h3 class="restaurant-name">
          ${escapeHTML(name)}
        </h3>


        <div class="restaurant-meta">

          <span class="restaurant-cuisine">
            ${escapeHTML(
              String(cuisine)
            )}
          </span>


          <span class="restaurant-price">
            ${escapeHTML(
              String(priceLevel)
            )}
          </span>


          ${ratingHTML}

        </div>


        <div class="restaurant-address">
          ${escapeHTML(
            address
          )}
        </div>


        <div class="restaurant-description">
          ${escapeHTML(
            description
          )}
        </div>


        <div class="restaurant-actions">

          <a
            class="maps-button"
            href="${escapeAttribute(
              mapsURL
            )}"
            target="_blank"
            rel="noopener noreferrer"
          >

            View location

            <span>
              ↗
            </span>

          </a>

        </div>

      </div>

    `;


    return card;

  }


  // =========================================================
  // RENDER DAY-BY-DAY PLAN
  // =========================================================

  function renderDayPlan(
    dayData,
    container,
    tripData
  ) {

    console.log(
      "DAY PLAN RAW DATA:",
      dayData
    );


    if (!container) {
      return;
    }


    const normalized =
      normalizeDayPlan(
        dayData
      );


    console.log(
      "DAY PLAN NORMALIZED:",
      normalized
    );


    if (
      normalized.length === 0
    ) {

      container.innerHTML = `

        <div class="day-plan-empty">

          <strong>
            Day-by-Day Itinerary
          </strong>

          <div style="margin-top:8px;">
            The AI did not return a structured
            daily itinerary. Other parts of your
            travel plan are still available above.
          </div>

        </div>

      `;

      return;

    }


    const wrapper =
      document.createElement(
        "div"
      );


    wrapper.className =
      "day-plan-wrapper";


    normalized.forEach(
      (day, index) => {

        const dayCard =
          createDayCard(
            day,
            index + 1,
            tripData
          );


        wrapper.appendChild(
          dayCard
        );

      }
    );


    container.innerHTML = "";

    container.appendChild(
      wrapper
    );

  }


  // =========================================================
  // NORMALIZE DAY PLAN
  // =========================================================

  function normalizeDayPlan(
    value
  ) {

    if (!value) {
      return [];
    }


    // Array of days

    if (Array.isArray(value)) {

      return value
        .map(
          (item, index) =>
            normalizeSingleDay(
              item,
              index + 1
            )
        )
        .filter(Boolean);

    }


    // Object

    if (
      typeof value === "object"
    ) {

      // Common wrapper properties

      const nested =
        value.days ||
        value.itinerary ||
        value.dailyPlan ||
        value.dayByDay ||
        value.plan;


      if (Array.isArray(nested)) {

        return normalizeDayPlan(
          nested
        );

      }


      // Object keyed by day

      const keys =
        Object.keys(value);


      const dayKeys =
        keys.filter(
          key =>
            /^day[\s_-]*\d+/i.test(
              key
            ) ||
            /^\d+$/.test(key)
        );


      if (dayKeys.length > 0) {

        return dayKeys
          .sort(
            naturalSort
          )
          .map(
            (key, index) =>
              normalizeSingleDay(
                value[key],
                index + 1,
                key
              )
          )
          .filter(Boolean);

      }


      // Single day object

      const single =
        normalizeSingleDay(
          value,
          1
        );


      return single
        ? [single]
        : [];

    }


    // String

    if (
      typeof value === "string"
    ) {

      return parseDayPlanText(
        value
      );

    }


    return [];

  }


  // =========================================================
  // NORMALIZE SINGLE DAY
  // =========================================================

  function normalizeSingleDay(
    item,
    fallbackNumber,
    fallbackTitle
  ) {

    if (
      item === null ||
      item === undefined
    ) {
      return null;
    }


    if (
      typeof item === "string"
    ) {

      return {

        day:
          fallbackNumber,

        title:
          fallbackTitle ||
          `Day ${fallbackNumber}`,

        date:
          "",

        description:
          item,

        activities:
          []

      };

    }


    if (
      typeof item !== "object"
    ) {

      return null;

    }


    const dayNumber =
      extractDayNumber(
        item.day ||
        item.dayNumber ||
        item.number ||
        fallbackNumber
      );


    const title =
      firstValue(
        item.title,
        item.name,
        item.heading,
        item.dayTitle
      ) ||
      `Day ${dayNumber}`;


    const date =
      firstValue(
        item.date,
        item.dayDate
      ) ||
      "";


    const description =
      firstValue(
        item.description,
        item.summary,
        item.overview,
        item.details
      ) ||
      "";


    const activities =
      normalizeActivities(
        item.activities ||
        item.activity ||
        item.schedule ||
        item.events ||
        item.timeline ||
        item.items
      );


    return {

      day:
        dayNumber,

      title:
        title,

      date:
        date,

      description:
        description,

      activities:
        activities

    };

  }


  // =========================================================
  // NORMALIZE ACTIVITIES
  // =========================================================

  function normalizeActivities(
    value
  ) {

    if (!value) {
      return [];
    }


    if (Array.isArray(value)) {

      return value
        .map(
          (item) => {

            if (
              typeof item === "string"
            ) {

              return {

                time: "",

                title: item,

                description: ""

              };

            }


            if (
              item &&
              typeof item === "object"
            ) {

              return {

                time:
                  firstValue(
                    item.time,
                    item.startTime,
                    item.hour
                  ) ||
                  "",

                title:
                  firstValue(
                    item.title,
                    item.name,
                    item.activity,
                    item.place,
                    item.event
                  ) ||
                  "Activity",

                description:
                  firstValue(
                    item.description,
                    item.details,
                    item.notes
                  ) ||
                  ""

              };

            }


            return null;

          }
        )
        .filter(Boolean);

    }


    if (
      typeof value === "object"
    ) {

      return Object.keys(value)
        .map(
          key => {

            const item =
              value[key];


            if (
              typeof item === "string"
            ) {

              return {

                time:
                  key,

                title:
                  item,

                description:
                  ""

              };

            }


            if (
              item &&
              typeof item === "object"
            ) {

              return {

                time:
                  firstValue(
                    item.time,
                    item.startTime
                  ) ||
                  key,

                title:
                  firstValue(
                    item.title,
                    item.name,
                    item.activity,
                    item.place
                  ) ||
                  "Activity",

                description:
                  firstValue(
                    item.description,
                    item.details,
                    item.notes
                  ) ||
                  ""

              };

            }


            return null;

          }
        )
        .filter(Boolean);

    }


    if (
      typeof value === "string"
    ) {

      return [

        {

          time: "",

          title: value,

          description: ""

        }

      ];

    }


    return [];

  }


  // =========================================================
  // CREATE DAY CARD
  // =========================================================

  function createDayCard(
    day,
    number,
    tripData
  ) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "day-card";


    const title =
      day.title ||
      `Day ${number}`;


    let activitiesHTML = "";


    if (
      Array.isArray(
        day.activities
      ) &&
      day.activities.length > 0
    ) {

      activitiesHTML = `

        <div class="day-activity-list">

          ${day.activities
            .map(
              activity => `

                <div class="day-activity">

                  ${
                    activity.time
                      ? `
                        <div class="day-activity-time">
                          ${escapeHTML(
                            activity.time
                          )}
                        </div>
                      `
                      : ""
                  }

                  <div class="day-activity-title">
                    ${escapeHTML(
                      activity.title
                    )}
                  </div>

                  ${
                    activity.description
                      ? `
                        <div class="day-activity-description">
                          ${escapeHTML(
                            activity.description
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>

              `
            )
            .join("")
          }

        </div>

      `;

    }


    const fallbackDescription =
      !day.description &&
      (!day.activities ||
        day.activities.length === 0)
        ? `Explore ${tripData.destination} according to your personalized interests and budget.`
        : "";


    card.innerHTML = `

      <div class="day-card-header">

        <h3 class="day-card-title">
          ${escapeHTML(title)}
        </h3>

        ${
          day.date
            ? `
              <div class="day-card-date">
                ${escapeHTML(
                  day.date
                )}
              </div>
            `
            : ""
        }

      </div>


      ${
        day.description ||
        fallbackDescription
          ? `
            <div class="day-card-description">
              ${escapeHTML(
                day.description ||
                fallbackDescription
              )}
            </div>
          `
          : ""
      }


      ${activitiesHTML}

    `;


    return card;

  }


  // =========================================================
  // PARSE DAY PLAN TEXT
  // =========================================================

  function parseDayPlanText(
    text
  ) {

    const cleaned =
      text
        .replace(
          /\r/g,
          ""
        )
        .trim();


    if (!cleaned) {
      return [];
    }


    // Split when AI returns:
    // Day 1:
    // Day 2:
    // Day 3:

    const parts =
      cleaned.split(
        /(?=^\s*Day\s*\d+\s*[:\-]?\s*)/gim
      );


    if (
      parts.length > 1
    ) {

      return parts
        .map(
          (part, index) => {

            const match =
              part.match(
                /^\s*Day\s*(\d+)\s*[:\-]?\s*/i
              );


            if (!match) {
              return null;
            }


            const number =
              Number(
                match[1]
              );


            const body =
              part
                .replace(
                  /^\s*Day\s*\d+\s*[:\-]?\s*/i,
                  ""
                )
                .trim();


            return {

              day:
                number,

              title:
                `Day ${number}`,

              date:
                "",

              description:
                body,

              activities:
                parseActivitiesFromText(
                  body
                )

            };

          }
        )
        .filter(Boolean);

    }


    // If no Day headings exist,
    // still show the returned content.

    return [

      {

        day:
          1,

        title:
          "Day 1",

        date:
          "",

        description:
          cleaned,

        activities:
          []

      }

    ];

  }


  // =========================================================
  // PARSE ACTIVITIES FROM TEXT
  // =========================================================

  function parseActivitiesFromText(
    text
  ) {

    if (!text) {
      return [];
    }


    const lines =
      text
        .split("\n")
        .map(
          line =>
            line
              .replace(
                /^\s*[-*•]\s*/,
                ""
              )
              .trim()
        )
        .filter(Boolean);


    if (
      lines.length <= 1
    ) {
      return [];
    }


    return lines.map(
      line => ({

        time:
          "",

        title:
          line,

        description:
          ""

      })
    );

  }


  // =========================================================
  // FLEXIBLE CONTENT RENDERER
  // =========================================================

  function renderFlexibleContent(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    if (
      typeof value === "string"
    ) {

      return safeHTML(
        value
      );

    }


    if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {

      return escapeHTML(
        String(value)
      );

    }


    if (
      Array.isArray(value)
    ) {

      return `

        <div style="
          display:flex;
          flex-direction:column;
          gap:10px;
        ">

          ${value
            .map(
              item =>
                `<div>${renderFlexibleContent(item)}</div>`
            )
            .join("")
          }

        </div>

      `;

    }


    if (
      typeof value === "object"
    ) {

      const html =
        Object.entries(
          value
        )
        .map(
          ([key, val]) => `

            <div style="
              margin-bottom:12px;
            ">

              <strong>
                ${escapeHTML(
                  prettifyKey(key)
                )}
              </strong>

              <div style="
                margin-top:4px;
              ">
                ${renderFlexibleContent(val)}
              </div>

            </div>

          `
        )
        .join("");


      return html;

    }


    return "";

  }


  // =========================================================
  // BOOKING SEARCH URL
  // =========================================================

  function createBookingSearchURL(
    hotelName,
    destination
  ) {

    const query =
      encodeURIComponent(
        `${hotelName} ${destination}`
      );


    return (
      "https://www.booking.com/searchresults.html?ss=" +
      query
    );

  }


  // =========================================================
  // OPENSTREETMAP URL
  // =========================================================

  function createOpenStreetMapURL(
    restaurant,
    destination
  ) {

    const latitude =
      restaurant?.latitude ||
      restaurant?.lat ||
      restaurant?.location?.lat ||
      restaurant?.location?.latitude;


    const longitude =
      restaurant?.longitude ||
      restaurant?.lon ||
      restaurant?.lng ||
      restaurant?.location?.lon ||
      restaurant?.location?.longitude;


    if (
      latitude !== null &&
      latitude !== undefined &&
      latitude !== "" &&
      longitude !== null &&
      longitude !== undefined &&
      longitude !== ""
    ) {

      return (
        "https://www.openstreetmap.org/" +
        `?mlat=${encodeURIComponent(
          latitude
        )}` +
        `&mlon=${encodeURIComponent(
          longitude
        )}` +
        "#map=18/" +
        `${encodeURIComponent(
          latitude
        )}/` +
        `${encodeURIComponent(
          longitude
        )}`
      );

    }


    const query =
      encodeURIComponent(
        `${restaurant?.name || ""} ${destination}`
      );


    return (
      "https://www.openstreetmap.org/search?query=" +
      query
    );

  }


  // =========================================================
  // NORMALIZE ARRAY
  // =========================================================

  function normalizeArray(
    value
  ) {

    if (
      Array.isArray(value)
    ) {

      return value;

    }


    if (
      value &&
      typeof value === "object"
    ) {

      if (
        Array.isArray(value.items)
      ) {

        return value.items;

      }

      if (
        Array.isArray(value.results)
      ) {

        return value.results;

      }

      if (
        Array.isArray(value.data)
      ) {

        return value.data;

      }

      return Object.values(
        value
      );

    }


    return [];

  }


  // =========================================================
  // FIRST VALUE
  // =========================================================

  function firstValue(
    ...values
  ) {

    for (
      const value of values
    ) {

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        return value;

      }

    }


    return null;

  }


  // =========================================================
  // EXTRACT IMAGE
  // =========================================================

  function extractImage(
    item
  ) {

    if (
      !item ||
      typeof item !== "object"
    ) {

      return "";

    }


    const direct =
      firstValue(
        item.image,
        item.imageUrl,
        item.imageURL,
        item.photo,
        item.photoUrl,
        item.photoURL,
        item.thumbnail,
        item.thumbnailUrl,
        item.coverImage,
        item.picture
      );


    if (
      typeof direct === "string" &&
      direct.trim()
    ) {

      return direct.trim();

    }


    // Image object

    const imageObject =
      item.image ||
      item.photo ||
      item.picture;


    if (
      imageObject &&
      typeof imageObject === "object"
    ) {

      const nested =
        firstValue(
          imageObject.url,
          imageObject.src,
          imageObject.href
        );


      if (
        nested
      ) {

        return String(
          nested
        );

      }

    }


    // Photo arrays

    const photos =
      item.photos ||
      item.images;


    if (
      Array.isArray(photos) &&
      photos.length > 0
    ) {

      for (
        const photo of photos
      ) {

        if (
          typeof photo === "string" &&
          photo.trim()
        ) {

          return photo.trim();

        }


        if (
          photo &&
          typeof photo === "object"
        ) {

          const url =
            firstValue(
              photo.url,
              photo.src,
              photo.href
            );


          if (
            url
          ) {

            return String(
              url
            );

          }

        }

      }

    }


    return "";

  }


  // =========================================================
  // NORMALIZE AMENITIES
  // =========================================================

  function normalizeAmenities(
    value
  ) {

    if (!value) {
      return [];
    }


    if (
      Array.isArray(value)
    ) {

      return value
        .map(
          item => {

            if (
              typeof item === "string"
            ) {

              return item;

            }


            if (
              item &&
              typeof item === "object"
            ) {

              return firstValue(
                item.name,
                item.title,
                item.label,
                item.type
              );

            }


            return null;

          }
        )
        .filter(Boolean);

    }


    if (
      typeof value === "string"
    ) {

      return value
        .split(
          /[,|•\n]+/
        )
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);

    }


    if (
      typeof value === "object"
    ) {

      return Object.entries(
        value
      )
      .map(
        ([key, val]) => {

          if (
            typeof val === "boolean"
          ) {

            return val
              ? prettifyKey(key)
              : null;

          }


          if (
            typeof val === "string"
          ) {

            return val;

          }


          return prettifyKey(
            key
          );

        }
      )
      .filter(Boolean);

    }


    return [];

  }


  // =========================================================
  // NORMALIZE PRICE
  // =========================================================

  function normalizePrice(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return {

        value:
          null,

        currency:
          "",

        label:
          ""

      };

    }


    if (
      typeof value === "number"
    ) {

      return {

        value:
          value,

        currency:
          "",

        label:
          ""

      };

    }


    if (
      typeof value === "string"
    ) {

      return {

        value:
          value,

        currency:
          "",

        label:
          ""

      };

    }


    if (
      typeof value === "object"
    ) {

      return {

        value:
          firstValue(
            value.amount,
            value.value,
            value.price,
            value.total,
            value.min,
            value.from
          ),

        currency:
          firstValue(
            value.currency,
            value.currencyCode
          ) ||
          "",

        label:
          firstValue(
            value.label,
            value.type,
            value.period,
            value.priceType
          ) ||
          ""

      };

    }


    return {

      value:
        null,

      currency:
        "",

      label:
        ""

    };

  }


  // =========================================================
  // FORMAT PRICE
  // =========================================================

  function formatPriceValue(
    value
  ) {

    if (
      value === null ||
      value === undefined
    ) {

      return "";

    }


    if (
      typeof value === "object"
    ) {

      const normalized =
        normalizePrice(
          value
        );


      if (
        normalized.value !== null
      ) {

        return String(
          normalized.value
        );

      }


      return "";

    }


    return String(
      value
    );

  }


  // =========================================================
  // PARSE STARS
  // =========================================================

  function parseStars(
    value
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return 0;

    }


    const number =
      parseFloat(
        String(value)
          .replace(
            /[^0-9.]/g,
            ""
          )
      );


    if (
      !Number.isFinite(number)
    ) {

      return 0;

    }


    return Math.max(
      0,
      Math.min(
        5,
        Math.round(
          number
        )
      )
    );

  }


  // =========================================================
  // EXTRACT DAY NUMBER
  // =========================================================

  function extractDayNumber(
    value
  ) {

    if (
      typeof value === "number"
    ) {

      return value;

    }


    const match =
      String(
        value || ""
      )
      .match(
        /\d+/
      );


    if (match) {

      return Number(
        match[0]
      );

    }


    return 1;

  }


  // =========================================================
  // NATURAL SORT
  // =========================================================

  function naturalSort(
    a,
    b
  ) {

    const aNum =
      extractDayNumber(
        a
      );


    const bNum =
      extractDayNumber(
        b
      );


    return aNum - bNum;

  }


  // =========================================================
  // PRETTIFY KEY
  // =========================================================

  function prettifyKey(
    key
  ) {

    return String(
      key
    )
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\b\w/g,
        char =>
          char.toUpperCase()
      );

  }


  // =========================================================
  // SAFE HTML
  // =========================================================

  function safeHTML(
    value
  ) {

    if (
      typeof value !== "string" ||
      !value.trim()
    ) {

      return "";

    }


    return value;

  }


  // =========================================================
  // ESCAPE HTML
  // =========================================================

  function escapeHTML(
    value
  ) {

    return String(
      value
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


  // =========================================================
  // ESCAPE ATTRIBUTE
  // =========================================================

  function escapeAttribute(
    value
  ) {

    return escapeHTML(
      value
    );

  }


  // =========================================================
  // TAB NAVIGATION
  // =========================================================

  const tabs =
    document.querySelectorAll(
      ".plan-tab"
    );


  const sections =
    document.querySelectorAll(
      ".plan-section"
    );


  tabs.forEach(
    (tab) => {

      tab.addEventListener(
        "click",
        () => {

          const targetSectionId =
            tab.getAttribute(
              "data-target"
            );


          tabs.forEach(
            (t) => {

              t.classList.remove(
                "active"
              );

            }
          );


          sections.forEach(
            (section) => {

              section.classList.add(
                "hidden"
              );

            }
          );


          tab.classList.add(
            "active"
          );


          const target =
            document.getElementById(
              targetSectionId
            );


          if (target) {

            target.classList.remove(
              "hidden"
            );

          }

        }
      );

    }
  );

});

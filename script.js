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
  // HOTEL + RESTAURANT STYLES
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


    appScreen.classList.add("hidden");

    reviewScreen.classList.remove("hidden");

  });


  // =========================================================
  // EDIT BUTTON
  // =========================================================

  closeReviewBtn.addEventListener("click", () => {

    reviewScreen.classList.add("hidden");

    appScreen.classList.remove("hidden");

  });


  // =========================================================
  // DEMO PAYMENT FLOW
  // =========================================================

  payBtn.addEventListener("click", () => {

    localStorage.setItem(
      "pendingTripData",
      JSON.stringify(formData)
    );

    localStorage.setItem(
      "hasPaid",
      "true"
    );

    appScreen.classList.add("hidden");

    reviewScreen.classList.add("hidden");

    planScreen.classList.remove("hidden");

    generatePlan(formData);

  });


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

        appScreen.classList.add("hidden");

        reviewScreen.classList.add("hidden");

        planScreen.classList.remove("hidden");

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


    planTitle.textContent =
      "Creating your personalized plan...";

    planIntro.textContent =
      "Our AI is building your itinerary. Please wait a moment.";


    // Reset sections to loading state

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


      // =====================================================
      // HEADER
      // =====================================================

      planTitle.textContent =
        `Your Trip to ${tripData.destination}`;

      planIntro.textContent =
        `Customized strategy for ${tripData.days} days with a $${tripData.budget} budget.`;


      // =====================================================
      // HOTELS
      // =====================================================

      renderHotels(
        data.stay,
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
        data.restaurants,
        tripData.destination
      );


      // =====================================================
      // TRANSPORT
      // =====================================================

      if (transportContent) {

        transportContent.innerHTML =
          safeHTML(
            data.transport
          );

      }


      // =====================================================
      // EXPERIENCES
      // =====================================================

      if (experiencesContent) {

        experiencesContent.innerHTML =
          safeHTML(
            data.experiences
          );

      }


      // =====================================================
      // MONEY
      // =====================================================

      if (moneyContent) {

        moneyContent.innerHTML =
          safeHTML(
            data.money
          );

      }


      // =====================================================
      // DAY PLAN
      // =====================================================

      if (daysContent) {

        daysContent.innerHTML =
          safeHTML(
            data.daysPlan
          );

      }


    } catch (error) {

      console.error(
        "PLAN GENERATION ERROR:",
        error
      );


      planTitle.textContent =
        "Generation Error";

      planIntro.textContent =
        "The travel plan could not be generated.";


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

        stayContent.innerHTML =
          errorHTML;

      }

      if (restaurantsContent) {

        restaurantsContent.innerHTML =
          errorHTML;

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


    if (
      !Array.isArray(stayData) ||
      stayData.length === 0
    ) {

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


    const hotels =
      stayData.slice(0, 10);


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


    hotels.forEach(
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

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "hotel-card";


    const name =
      hotel?.name ||
      "Recommended Accommodation";


    const stars =
      Number(hotel?.stars) || 0;


    const price =
      hotel?.price !== undefined &&
      hotel?.price !== null &&
      hotel?.price !== ""
        ? hotel.price
        : null;


    const currency =
      hotel?.currency ||
      "USD";


    const priceType =
      hotel?.priceType ||
      "estimated per night";


    const description =
      hotel?.description ||
      "A recommended accommodation option selected for this trip.";


    const amenities =
      Array.isArray(
        hotel?.amenities
      )
        ? hotel.amenities
        : [];


    const image =
      hotel?.image ||
      hotel?.imageUrl ||
      hotel?.photo ||
      hotel?.photoUrl ||
      "";


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


    if (price !== null) {

      priceHTML = `

        <div class="hotel-price">

          <span class="hotel-price-value">

            ${escapeHTML(
              String(price)
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
            .slice(0, 8)
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
      hotel?.bookingUrl ||
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

    // IMPORTANT:
    // HTML uses restaurantsContent.
    // Do NOT use experiencesContent here.

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


    // Remove loading message

    container.innerHTML = "";


    // =======================================================
    // NO RESTAURANTS
    // =======================================================

    if (
      !Array.isArray(
        restaurantData
      ) ||
      restaurantData.length === 0
    ) {

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
            listed in OpenStreetMap for
            ${escapeHTML(destination)}.

          </div>

        </div>

      `;

      return;

    }


    // =======================================================
    // MAXIMUM 10
    // =======================================================

    const restaurants =
      restaurantData.slice(0, 10);


    // =======================================================
    // INTRO
    // =======================================================

    const introWrapper =
      document.createElement("div");


    introWrapper.innerHTML = `

      <div class="restaurant-intro">

        <h3>
          Recommended restaurants in
          ${escapeHTML(destination)}
        </h3>

        <p>
          Real local restaurants found through
          OpenStreetMap.
        </p>

      </div>

    `;


    container.appendChild(
      introWrapper
    );


    // =======================================================
    // LIST
    // =======================================================

    const restaurantList =
      document.createElement("div");


    restaurantList.className =
      "restaurant-list";


    // =======================================================
    // CARDS
    // =======================================================

    restaurants.forEach(
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


    // =======================================================
    // ADD TO PAGE
    // =======================================================

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

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "restaurant-card";


    const name =
      restaurant?.name ||
      "Local Restaurant";


    const cuisine =
      restaurant?.cuisine ||
      "Local cuisine";


    const priceLevel =
      restaurant?.priceLevel ||
      "$$";


    const rating =
      restaurant?.rating !== undefined &&
      restaurant?.rating !== null &&
      restaurant?.rating !== ""
        ? restaurant.rating
        : null;


    const address =
      restaurant?.address ||
      destination;


    const description =
      restaurant?.description ||
      `A real restaurant listed in OpenStreetMap in ${destination}.`;


    const image =
      restaurant?.image ||
      restaurant?.imageUrl ||
      restaurant?.photo ||
      restaurant?.photoUrl ||
      "";


    const mapsURL =
      restaurant?.mapsUrl ||
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


    if (rating !== null) {

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

            View on OpenStreetMap

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
      restaurant?.latitude;

    const longitude =
      restaurant?.longitude;


    if (
      latitude !== null &&
      latitude !== undefined &&
      longitude !== null &&
      longitude !== undefined
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
  // SAFE HTML
  // =========================================================

  function safeHTML(value) {

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

  function escapeHTML(value) {

    return String(value)

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

  function escapeAttribute(value) {

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

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
  // HOTEL / PLAN STYLES
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

      /* =====================================================
         HOTEL IMAGE
      ===================================================== */

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
        background:
          linear-gradient(
            135deg,
            #f5f6f8 0%,
            #e8eaf0 100%
          );
      }

      /* =====================================================
         HOTEL CONTENT
      ===================================================== */

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

      /* =====================================================
         AMENITIES
      ===================================================== */

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

      /* =====================================================
         BOOKING BUTTON
      ===================================================== */

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

      /* =====================================================
         HOTEL SECTION INTRO
      ===================================================== */

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
         MOBILE
      ===================================================== */

      @media (max-width: 700px) {

        .hotel-card {
          grid-template-columns: 1fr;
          gap: 16px;
          padding: 14px;
          border-radius: 17px;
        }

        .hotel-image-wrap {
          height: 200px;
        }

        .hotel-name {
          font-size: 21px;
        }

        .hotel-price-value {
          font-size: 22px;
        }

        .hotel-actions {
          margin-top: 5px;
        }

        .booking-button {
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

      const interest = chip.textContent.trim();

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
        document.getElementById("destination").value.trim(),

      startDate:
        document.getElementById("startDate").value || "Flexible",

      days:
        document.getElementById("days").value,

      budget:
        document.getElementById("budget").value,

      travelers:
        document.getElementById("travelers").value,

      interests:
        Array.from(selectedInterests).join(", ") ||
        "General Sightseeing",

      notes:
        document.getElementById("notes").value.trim() ||
        "None"
    };

    summaryDiv.innerHTML = `

      <p>
        📍 <strong>Destination:</strong>
        ${escapeHTML(formData.destination)}
      </p>

      <p>
        📅 <strong>Duration:</strong>
        ${escapeHTML(formData.days)} Days
        (Starts: ${escapeHTML(formData.startDate)})
      </p>

      <p>
        💰 <strong>Budget limit:</strong>
        $${escapeHTML(formData.budget)}
      </p>

      <p>
        👥 <strong>Party size:</strong>
        ${escapeHTML(formData.travelers)}
      </p>

      <p>
        🎯 <strong>Interests:</strong>
        ${escapeHTML(formData.interests)}
      </p>

      <p>
        📝 <strong>Special requests:</strong>
        ${escapeHTML(formData.notes)}
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

    /*
      DEMO MODE

      We are NOT connecting real payment yet.

      This flag simply simulates successful payment
      so we can test the AI planner.
    */

    localStorage.setItem("hasPaid", "true");

    appScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    planScreen.classList.remove("hidden");

    generatePlan(formData);

  });

  // =========================================================
  // RETURN / DEMO RECOVERY
  // =========================================================

  window.addEventListener("load", () => {

    const hasPaid = localStorage.getItem("hasPaid");
    const savedData = localStorage.getItem("pendingTripData");

    if (hasPaid === "true" && savedData) {

      try {

        const parsedData = JSON.parse(savedData);

        localStorage.removeItem("hasPaid");
        localStorage.removeItem("pendingTripData");

        appScreen.classList.add("hidden");
        reviewScreen.classList.add("hidden");
        planScreen.classList.remove("hidden");

        generatePlan(parsedData);

      } catch (error) {

        console.error("Saved trip data error:", error);

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

    try {

      const response = await fetch("/api/plan", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(tripData)

      });

      const rawResponse = await response.text();

      let data;

      try {

        data = JSON.parse(rawResponse);

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
      // STAY
      // =====================================================

      renderHotels(
        data.stay,
        tripData.destination
      );

      // =====================================================
      // OTHER SECTIONS
      // =====================================================

      document.getElementById("transportContent").innerHTML =
        safeHTML(data.transport);

      document.getElementById("experiencesContent").innerHTML =
        safeHTML(data.experiences);

      document.getElementById("moneyContent").innerHTML =
        safeHTML(data.money);

      document.getElementById("daysContent").innerHTML =
        safeHTML(data.daysPlan);

    } catch (error) {

      console.error("PLAN GENERATION ERROR:", error);

      planTitle.textContent =
        "Generation Error";

      planIntro.textContent =
        "The travel plan could not be generated.";

      document.getElementById("stayContent").innerHTML = `

        <div style="
          padding:20px;
          border-radius:14px;
          background:#fff4f4;
          border:1px solid #ffd6d6;
          color:#a33;
        ">

          <strong>Something went wrong.</strong>

          <div style="
            margin-top:8px;
            font-size:14px;
          ">
            ${escapeHTML(error.message)}
          </div>

        </div>

      `;

    }

  }

  // =========================================================
  // RENDER 10 HOTELS
  // =========================================================

  function renderHotels(stayData, destination) {

    const container =
      document.getElementById("stayContent");

    if (!Array.isArray(stayData) || stayData.length === 0) {

      container.innerHTML = `

        <div style="
          padding:20px;
          background:#f7f7f8;
          border-radius:14px;
          color:#666;
        ">
          No accommodation recommendations were returned.
        </div>

      `;

      return;
    }

    /*
      IMPORTANT:

      Display maximum 10 hotels.

      If Gemini returns exactly 10,
      all 10 will appear.

      If it returns fewer,
      we do NOT invent fake hotels.
    */

    const hotels = stayData.slice(0, 10);

    const intro = `

      <div class="hotel-intro">

        <h3>
          Recommended stays in ${escapeHTML(destination)}
        </h3>

        <p>
          Compare accommodation options selected for your trip.
        </p>

      </div>

    `;

    const hotelList = document.createElement("div");

    hotelList.className = "hotel-list";

    hotels.forEach((hotel, index) => {

      const card =
        createHotelCard(
          hotel,
          index + 1,
          destination
        );

      hotelList.appendChild(card);

    });

    container.innerHTML = "";

    const introWrapper =
      document.createElement("div");

    introWrapper.innerHTML = intro;

    container.appendChild(introWrapper);
    container.appendChild(hotelList);

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
      document.createElement("article");

    card.className = "hotel-card";

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
      Array.isArray(hotel?.amenities)
        ? hotel.amenities
        : [];

    const image =
      hotel?.image ||
      hotel?.imageUrl ||
      hotel?.photo ||
      hotel?.photoUrl ||
      "";

    // =====================================================
    // IMAGE
    // =====================================================

    let imageHTML = "";

    if (image) {

      imageHTML = `

        <img
          class="hotel-image"
          src="${escapeAttribute(image)}"
          alt="${escapeAttribute(name)}"
          loading="lazy"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
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

    // =====================================================
    // STARS
    // =====================================================

    let starsHTML = "";

    if (stars > 0) {

      starsHTML = `

        <div class="hotel-rating">

          <span class="hotel-stars">
            ${"★".repeat(Math.min(stars, 5))}
          </span>

          <span class="hotel-star-text">
            ${stars}-star property
          </span>

        </div>

      `;

    }

    // =====================================================
    // PRICE
    // =====================================================

    let priceHTML = "";

    if (price !== null) {

      priceHTML = `

        <div class="hotel-price">

          <span class="hotel-price-value">
            $${escapeHTML(String(price))}
          </span>

          <span class="hotel-price-label">
            ${escapeHTML(priceType)}
          </span>

        </div>

      `;

    }

    // =====================================================
    // AMENITIES
    // =====================================================

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
                  ${escapeHTML(String(amenity))}
                </span>
              `
            )
            .join("")
          }

        </div>

      `;

    }

    // =====================================================
    // BOOKING LINK
    // =====================================================

    const bookingURL =
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
          ${escapeHTML(description)}
        </div>

        ${amenitiesHTML}

        <div class="hotel-actions">

          <a
            class="booking-button"
            href="${escapeAttribute(bookingURL)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Check availability on Booking.com
            <span class="booking-arrow">↗</span>
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

    return `https://www.booking.com/searchresults.html?ss=${query}`;

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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

  // =========================================================
  // ESCAPE ATTRIBUTE
  // =========================================================

  function escapeAttribute(value) {

    return escapeHTML(value);

  }

  // =========================================================
  // TAB NAVIGATION
  // =========================================================

  const tabs =
    document.querySelectorAll(".plan-tab");

  const sections =
    document.querySelectorAll(".plan-section");

  tabs.forEach((tab) => {

    tab.addEventListener("click", () => {

      const targetSectionId =
        tab.getAttribute("data-target");

      tabs.forEach((t) => {
        t.classList.remove("active");
      });

      sections.forEach((section) => {
        section.classList.add("hidden");
      });

      tab.classList.add("active");

      const target =
        document.getElementById(targetSectionId);

      if (target) {
        target.classList.remove("hidden");
      }

    });

  });

});

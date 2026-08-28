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

  const selectedInterests = new Set();
  let formData = {};

  // =========================================================
  // INTEREST CHIPS
  // =========================================================

  const chips = document.querySelectorAll(".chip");

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

  if (plannerForm) {

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

      // =====================================================
      // REVIEW SUMMARY
      // =====================================================

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

  }

  // =========================================================
  // EDIT BUTTON
  // =========================================================

  if (closeReviewBtn) {

    closeReviewBtn.addEventListener("click", () => {

      reviewScreen.classList.add("hidden");
      appScreen.classList.remove("hidden");

    });

  }

  // =========================================================
  // TEST PAYMENT FLOW
  // =========================================================

  if (payBtn) {

    payBtn.addEventListener("click", () => {

      localStorage.setItem(
        "pendingTripData",
        JSON.stringify(formData)
      );

      /*
       * TEST MODE
       *
       * We temporarily simulate successful payment.
       *
       * IMPORTANT:
       * This is NOT real payment verification.
       */

      localStorage.setItem("hasPaid", "true");

      // For testing, stay on the website.
      // Do NOT redirect to Paddle yet.

      generatePlan();

    });

  }

  // =========================================================
  // GENERATE PLAN
  // =========================================================

  async function generatePlan() {

    const savedData =
      localStorage.getItem("pendingTripData");

    if (!savedData) {

      showGenerationError(
        "No trip information was found."
      );

      return;

    }

    try {

      const parsedData = JSON.parse(savedData);

      appScreen.classList.add("hidden");
      reviewScreen.classList.add("hidden");
      planScreen.classList.remove("hidden");

      document.getElementById("planTitle").textContent =
        `Creating your trip to ${parsedData.destination}...`;

      document.getElementById("planIntro").textContent =
        "Our AI is building your personalized travel plan.";

      // =====================================================
      // RESET SECTIONS
      // =====================================================

      document.getElementById("stayContent").innerHTML =
        "Finding the best accommodation options...";

      document.getElementById("transportContent").innerHTML =
        "Preparing transportation recommendations...";

      document.getElementById("experiencesContent").innerHTML =
        "Finding attractions and experiences...";

      document.getElementById("moneyContent").innerHTML =
        "Calculating your budget strategy...";

      document.getElementById("daysContent").innerHTML =
        "Building your day-by-day itinerary...";

      // =====================================================
      // API REQUEST
      // =====================================================

      const response = await fetch("/api/plan", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: savedData

      });

      const data = await response.json();

      if (!response.ok) {

        console.error("API ERROR:", data);

        throw new Error(
          data?.details ||
          data?.error ||
          "Travel plan could not be generated."
        );

      }

      // =====================================================
      // HEADER
      // =====================================================

      document.getElementById("planTitle").textContent =
        `Your Trip to ${parsedData.destination}`;

      document.getElementById("planIntro").textContent =
        `Customized strategy for ${parsedData.days} days with a $${parsedData.budget} budget.`;

      // =====================================================
      // STAY
      // =====================================================

      renderHotels(
        data.stay,
        parsedData.destination
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

      // =====================================================
      // CLEAN TEST PAYMENT FLAGS
      // =====================================================

      localStorage.removeItem("hasPaid");
      localStorage.removeItem("pendingTripData");

    } catch (error) {

      console.error("PLAN GENERATION ERROR:", error);

      showGenerationError(
        error.message ||
        "The travel plan could not be generated."
      );

    }

  }

  // =========================================================
  // HOTEL RENDERER
  // =========================================================

  function renderHotels(hotels, destination) {

    const container =
      document.getElementById("stayContent");

    if (!container) return;

    if (!Array.isArray(hotels) || hotels.length === 0) {

      container.innerHTML = `
        <div class="hotel-empty">
          <div class="hotel-empty-icon">🏨</div>
          <h3>No accommodation options found</h3>
          <p>
            We could not find accommodation recommendations
            for this destination.
          </p>
        </div>
      `;

      return;

    }

    /*
     * Display up to 10 hotels.
     *
     * If the API returns more than 10,
     * we only show the first 10.
     */

    const hotelList = hotels.slice(0, 10);

    let html = `

      <div class="hotel-intro">

        <h3>
          Recommended stays in ${escapeHTML(destination)}
        </h3>

        <p>
          Compare these accommodation options and choose
          the one that best fits your trip.
        </p>

      </div>

      <div class="hotels-grid">

    `;

    hotelList.forEach((hotel, index) => {

      if (!hotel) return;

      const name =
        hotel.name ||
        `Recommended Hotel ${index + 1}`;

      const stars =
        Number(hotel.stars) ||
        0;

      const price =
        normalizePrice(hotel.price);

      const currency =
        hotel.currency ||
        "USD";

      const priceType =
        hotel.priceType ||
        "estimated per night";

      const description =
        hotel.description ||
        "A recommended accommodation option for your trip.";

      const image =
        hotel.image ||
        hotel.imageUrl ||
        hotel.photo ||
        hotel.photoUrl ||
        "";

      const amenities =
        Array.isArray(hotel.amenities)
          ? hotel.amenities
          : [];

      // =====================================================
      // BOOKING LINK
      // =====================================================

      const bookingUrl =
        createBookingSearchUrl(
          name,
          destination
        );

      // =====================================================
      // STARS
      // =====================================================

      let starsHTML = "";

      if (stars > 0) {

        starsHTML =
          "⭐".repeat(
            Math.min(Math.round(stars), 5)
          );

      } else {

        starsHTML = "Recommended";

      }

      // =====================================================
      // IMAGE
      // =====================================================

      let imageHTML;

      if (image) {

        imageHTML = `

          <img
            src="${escapeAttribute(image)}"
            alt="${escapeAttribute(name)}"
            class="hotel-image"
            loading="lazy"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
          >

          <div class="hotel-image-fallback" style="display:none;">
            <span>🏨</span>
            <small>Hotel photo unavailable</small>
          </div>

        `;

      } else {

        imageHTML = `

          <div class="hotel-image-fallback">
            <span>🏨</span>
            <small>Hotel photo unavailable</small>
          </div>

        `;

      }

      // =====================================================
      // AMENITIES
      // =====================================================

      let amenitiesHTML = "";

      if (amenities.length > 0) {

        amenitiesHTML = `

          <div class="hotel-amenities">

            <h4>Amenities</h4>

            <div class="amenities-list">

              ${amenities
                .slice(0, 6)
                .map(
                  item =>
                    `<span>${escapeHTML(item)}</span>`
                )
                .join("")}

            </div>

          </div>

        `;

      }

      // =====================================================
      // HOTEL CARD
      // =====================================================

      html += `

        <article class="hotel-card">

          <div class="hotel-image-wrapper">

            ${imageHTML}

            <div class="hotel-number">
              ${index + 1}
            </div>

          </div>

          <div class="hotel-card-body">

            <h3 class="hotel-name">
              ${escapeHTML(name)}
            </h3>

            <div class="hotel-stars">
              ${starsHTML}
              ${
                stars > 0
                  ? `<span>${stars}-star property</span>`
                  : ""
              }
            </div>

            <div class="hotel-price">

              <strong>
                ${formatPrice(price, currency)}
              </strong>

              <span>
                / ${escapeHTML(priceType)}
              </span>

            </div>

            <p class="hotel-description">
              ${escapeHTML(description)}
            </p>

            ${amenitiesHTML}

            <a
              href="${escapeAttribute(bookingUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="booking-button"
            >
              Check availability on Booking.com
              <span>↗</span>
            </a>

          </div>

        </article>

      `;

    });

    html += `

      </div>

      <div class="hotel-note">
        <strong>Price note:</strong>
        Hotel prices shown by the AI are estimates.
        Final prices and availability should be checked
        on Booking.com before booking.
      </div>

    `;

    container.innerHTML = html;

    injectHotelStyles();

  }

  // =========================================================
  // PRICE NORMALIZER
  // =========================================================

  function normalizePrice(value) {

    if (typeof value === "number") {

      return value;

    }

    if (typeof value === "string") {

      const number =
        parseFloat(
          value.replace(/[^0-9.]/g, "")
        );

      return Number.isFinite(number)
        ? number
        : null;

    }

    if (typeof value === "object" && value !== null) {

      if (typeof value.amount === "number") {
        return value.amount;
      }

      if (typeof value.value === "number") {
        return value.value;
      }

      if (typeof value.amount === "string") {

        const number =
          parseFloat(
            value.amount.replace(
              /[^0-9.]/g,
              ""
            )
          );

        return Number.isFinite(number)
          ? number
          : null;

      }

      if (typeof value.value === "string") {

        const number =
          parseFloat(
            value.value.replace(
              /[^0-9.]/g,
              ""
            )
          );

        return Number.isFinite(number)
          ? number
          : null;

      }

    }

    return null;

  }

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  function formatPrice(price, currency) {

    if (
      price === null ||
      price === undefined ||
      !Number.isFinite(Number(price))
    ) {

      return "Price unavailable";

    }

    const numericPrice =
      Number(price);

    return `$${numericPrice.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0
      }
    )} ${escapeHTML(currency)}`;

  }

  // =========================================================
  // BOOKING SEARCH URL
  // =========================================================

  function createBookingSearchUrl(
    hotelName,
    destination
  ) {

    const query =
      `${hotelName}, ${destination}`;

    return (
      "https://www.booking.com/searchresults.html?ss=" +
      encodeURIComponent(query)
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

      return "<p>Information unavailable.</p>";

    }

    return value;

  }

  // =========================================================
  // HTML ESCAPE
  // =========================================================

  function escapeHTML(value) {

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

  function escapeAttribute(value) {

    return escapeHTML(value);

  }

  // =========================================================
  // GENERATION ERROR
  // =========================================================

  function showGenerationError(message) {

    appScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    planScreen.classList.remove("hidden");

    document.getElementById("planTitle").textContent =
      "Generation Error";

    document.getElementById("planIntro").textContent =
      message;

    document.getElementById("stayContent").innerHTML = `
      <div class="hotel-empty">
        <div class="hotel-empty-icon">⚠️</div>
        <h3>Something went wrong.</h3>
        <p>${escapeHTML(message)}</p>
      </div>
    `;

  }

  // =========================================================
  // HOTEL STYLES
  // =========================================================

  function injectHotelStyles() {

    if (
      document.getElementById(
        "aiLifePlannerHotelStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "aiLifePlannerHotelStyles";

    style.textContent = `

      .hotel-intro {
        margin-bottom: 24px;
      }

      .hotel-intro h3 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      .hotel-intro p {
        margin: 0;
        opacity: 0.72;
      }

      .hotels-grid {
        display: grid;
        grid-template-columns:
          repeat(auto-fit, minmax(280px, 1fr));
        gap: 22px;
      }

      .hotel-card {
        overflow: hidden;
        border-radius: 18px;
        background: #fff;
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow:
          0 8px 28px rgba(0,0,0,0.08);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .hotel-card:hover {
        transform: translateY(-4px);
        box-shadow:
          0 14px 35px rgba(0,0,0,0.12);
      }

      .hotel-image-wrapper {
        position: relative;
        width: 100%;
        height: 210px;
        overflow: hidden;
        background:
          linear-gradient(
            135deg,
            #e9eef5,
            #f8fafc
          );
      }

      .hotel-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hotel-image-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 8px;
        color: #64748b;
      }

      .hotel-image-fallback span {
        font-size: 44px;
      }

      .hotel-number {
        position: absolute;
        top: 12px;
        left: 12px;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.72);
        color: white;
        font-weight: 700;
        font-size: 14px;
      }

      .hotel-card-body {
        padding: 20px;
      }

      .hotel-name {
        margin: 0 0 8px;
        font-size: 19px;
        line-height: 1.3;
      }

      .hotel-stars {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 7px;
        margin-bottom: 12px;
        font-size: 14px;
      }

      .hotel-stars span {
        opacity: 0.65;
      }

      .hotel-price {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 5px;
        margin-bottom: 12px;
      }

      .hotel-price strong {
        font-size: 20px;
      }

      .hotel-price span {
        font-size: 12px;
        opacity: 0.65;
      }

      .hotel-description {
        font-size: 14px;
        line-height: 1.6;
        opacity: 0.78;
        margin-bottom: 16px;
      }

      .hotel-amenities h4 {
        margin: 0 0 9px;
        font-size: 14px;
      }

      .amenities-list {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin-bottom: 18px;
      }

      .amenities-list span {
        padding: 6px 9px;
        border-radius: 999px;
        background: #f1f5f9;
        font-size: 12px;
      }

      .booking-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: 700;
        font-size: 13px;
        background: #111827;
        color: white;
        transition:
          opacity 0.2s ease,
          transform 0.2s ease;
      }

      .booking-button:hover {
        opacity: 0.88;
        transform: translateY(-1px);
      }

      .hotel-note {
        margin-top: 22px;
        padding: 14px 16px;
        border-radius: 12px;
        background: #f8fafc;
        font-size: 13px;
        line-height: 1.5;
        opacity: 0.8;
      }

      .hotel-empty {
        text-align: center;
        padding: 40px 20px;
        border-radius: 16px;
        background: #f8fafc;
      }

      .hotel-empty-icon {
        font-size: 42px;
        margin-bottom: 10px;
      }

      .hotel-empty h3 {
        margin: 0 0 8px;
      }

      .hotel-empty p {
        margin: 0;
        opacity: 0.7;
      }

      @media (max-width: 600px) {

        .hotels-grid {
          grid-template-columns: 1fr;
        }

        .hotel-image-wrapper {
          height: 200px;
        }

      }

    `;

    document.head.appendChild(style);

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

      tabs.forEach((t) =>
        t.classList.remove("active")
      );

      sections.forEach((section) =>
        section.classList.add("hidden")
      );

      tab.classList.add("active");

      const target =
        document.getElementById(
          targetSectionId
        );

      if (target) {

        target.classList.remove("hidden");

      }

    });

  });

});

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

  // =========================================================
  // INTEREST CHIPS
  // =========================================================

  const chips = document.querySelectorAll(".chip");
  const selectedInterests = new Set();

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
  // FORM DATA
  // =========================================================

  let formData = {};

  // =========================================================
  // FORM SUBMIT
  // =========================================================

  plannerForm.addEventListener("submit", (e) => {

    e.preventDefault();

    formData = {

      destination:
        document.getElementById("destination").value.trim(),

      startDate:
        document.getElementById("startDate").value ||
        "Flexible",

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

    // =======================================================
    // REVIEW
    // =======================================================

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
  // EDIT
  // =========================================================

  closeReviewBtn.addEventListener("click", () => {

    reviewScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

  });

  // =========================================================
  // PAYMENT / TEST FLOW
  // =========================================================

  payBtn.addEventListener("click", () => {

    if (!formData.destination) {
      alert("Please enter your destination first.");
      return;
    }

    /*
      TEST MODE

      We don't redirect to Paddle here.

      Instead we save the trip and generate the plan directly.

      When your real payment is ready, this section
      can be replaced with the real checkout flow.
    */

    localStorage.setItem(
      "pendingTripData",
      JSON.stringify(formData)
    );

    localStorage.setItem(
      "generatePlan",
      "true"
    );

    // Go directly to generation
    startPlanGeneration(formData);

  });

  // =========================================================
  // AUTO GENERATION AFTER RETURN
  // =========================================================

  window.addEventListener("load", async () => {

    const shouldGenerate =
      localStorage.getItem("generatePlan");

    const savedData =
      localStorage.getItem("pendingTripData");

    if (
      shouldGenerate === "true" &&
      savedData
    ) {

      localStorage.removeItem("generatePlan");
      localStorage.removeItem("pendingTripData");

      let parsedData;

      try {
        parsedData = JSON.parse(savedData);
      } catch (error) {

        console.error(
          "Saved trip data is invalid:",
          error
        );

        return;

      }

      await startPlanGeneration(parsedData);

    }

  });

  // =========================================================
  // GENERATE PLAN
  // =========================================================

  async function startPlanGeneration(data) {

    appScreen.classList.add("hidden");
    reviewScreen.classList.add("hidden");
    planScreen.classList.remove("hidden");

    showLoadingState();

    try {

      const response = await fetch("/api/plan", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(data)

      });

      const result = await response.json();

      if (!response.ok) {

        console.error(
          "API ERROR:",
          result
        );

        throw new Error(
          result.details ||
          result.error ||
          "Travel plan generation failed."
        );

      }

      console.log(
        "PLAN RESPONSE:",
        result
      );

      renderPlan(data, result);

    } catch (error) {

      console.error(
        "PLAN GENERATION ERROR:",
        error
      );

      showGenerationError(error);

    }

  }

  // =========================================================
  // LOADING
  // =========================================================

  function showLoadingState() {

    document.getElementById("planTitle").textContent =
      "Creating your personalized plan...";

    document.getElementById("planIntro").textContent =
      "Our AI is finding the best accommodation options and building your itinerary.";

    document.getElementById("stayContent").innerHTML = `
      <div class="planner-loading">
        <div class="loading-spinner"></div>
        <h3>Finding the best stays...</h3>
        <p>Preparing accommodation options for your trip.</p>
      </div>
    `;

    document.getElementById("transportContent").innerHTML =
      `<p>Generating transportation guide...</p>`;

    document.getElementById("experiencesContent").innerHTML =
      `<p>Curating experiences...</p>`;

    document.getElementById("moneyContent").innerHTML =
      `<p>Calculating your budget strategy...</p>`;

    document.getElementById("daysContent").innerHTML =
      `<p>Building your itinerary...</p>`;

  }

  // =========================================================
  // RENDER PLAN
  // =========================================================

  function renderPlan(data, result) {

    document.getElementById("planTitle").textContent =
      `Your Trip to ${data.destination}`;

    document.getElementById("planIntro").textContent =
      `Customized strategy for ${data.days} days with a $${data.budget} budget.`;

    renderHotels(
      result.stay,
      data.destination
    );

    document.getElementById("transportContent").innerHTML =
      result.transport ||
      "<p>No transportation information available.</p>";

    document.getElementById("experiencesContent").innerHTML =
      result.experiences ||
      "<p>No experience information available.</p>";

    document.getElementById("moneyContent").innerHTML =
      result.money ||
      "<p>No budget information available.</p>";

    document.getElementById("daysContent").innerHTML =
      result.daysPlan ||
      "<p>No itinerary available.</p>";

  }

  // =========================================================
  // HOTEL RENDERING
  // =========================================================

  function renderHotels(hotels, destination) {

    const container =
      document.getElementById("stayContent");

    if (!Array.isArray(hotels) || hotels.length === 0) {

      container.innerHTML = `
        <div class="empty-hotels">
          <h3>No accommodation options found</h3>
          <p>Please try generating the trip again.</p>
        </div>
      `;

      return;
    }

    // =======================================================
    // LIMIT TO 10
    // =======================================================

    const hotelList = hotels
      .filter(Boolean)
      .slice(0, 10);

    // =======================================================
    // HEADER
    // =======================================================

    let html = `

      <div class="stay-intro">

        <h3>
          Recommended stays in
          ${escapeHTML(destination)}
        </h3>

        <p>
          Compare these accommodation options
          and choose the one that best fits your trip.
        </p>

      </div>

      <div class="hotel-grid">

    `;

    // =======================================================
    // HOTEL CARDS
    // =======================================================

    hotelList.forEach((hotel, index) => {

      const name =
        hotel.name || "Accommodation";

      const stars =
        Number(hotel.stars) || 0;

      const price =
        hotel.price !== null &&
        hotel.price !== undefined &&
        hotel.price !== ""
          ? `$${formatPrice(hotel.price)}`
          : "Price unavailable";

      const priceType =
        hotel.priceType ||
        "estimated per night";

      const description =
        hotel.description ||
        "A recommended accommodation option for this trip.";

      const amenities =
        Array.isArray(hotel.amenities)
          ? hotel.amenities
          : [];

      const bookingUrl =
        buildBookingUrl(
          hotel.bookingUrl,
          name,
          destination
        );

      const imageUrl =
        isValidImageUrl(hotel.imageUrl)
          ? hotel.imageUrl
          : "";

      html += `

        <article class="hotel-card">

          <div class="hotel-number">
            ${index + 1}
          </div>

          <div class="hotel-image">

            ${
              imageUrl
                ? `
                  <img
                    src="${escapeAttribute(imageUrl)}"
                    alt="${escapeAttribute(name)}"
                    loading="lazy"
                    onerror="this.parentElement.classList.add('image-failed'); this.remove();"
                  >
                `
                : ""
            }

          </div>

          <div class="hotel-body">

            <div class="hotel-heading">

              <div>

                <h3>
                  ${escapeHTML(name)}
                </h3>

                <div class="hotel-stars">
                  ${renderStars(stars)}
                </div>

                <div class="hotel-rating-text">
                  ${stars > 0 ? `${stars}-star property` : "Recommended property"}
                </div>

              </div>

            </div>

            <div class="hotel-price">

              <span class="price-main">
                ${price}
              </span>

              ${
                price !== "Price unavailable"
                  ? `
                    <span class="price-period">
                      / ${escapeHTML(priceType.replace(/^estimated\s*/i, "").trim() || "night")}
                    </span>
                  `
                  : ""
              }

            </div>

            <p class="hotel-description">
              ${escapeHTML(description)}
            </p>

            ${
              amenities.length
                ? `
                  <div class="hotel-amenities">

                    <h4>Amenities</h4>

                    <div class="amenities-list">

                      ${amenities
                        .slice(0, 6)
                        .map(
                          item => `
                            <span class="amenity">
                              ${escapeHTML(item)}
                            </span>
                          `
                        )
                        .join("")
                      }

                    </div>

                  </div>
                `
                : ""
            }

            <div class="hotel-actions">

              ${
                bookingUrl
                  ? `
                    <a
                      class="booking-button"
                      href="${escapeAttribute(bookingUrl)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Check availability on Booking.com
                      <span>↗</span>
                    </a>
                  `
                  : `
                    <button
                      type="button"
                      class="booking-button disabled"
                      disabled
                    >
                      Booking link unavailable
                    </button>
                  `
              }

            </div>

          </div>

        </article>

      `;

    });

    html += `

      </div>

    `;

    container.innerHTML = html;

  }

  // =========================================================
  // STARS
  // =========================================================

  function renderStars(stars) {

    if (!stars || stars < 1) {
      return "";
    }

    const rounded =
      Math.min(
        5,
        Math.max(
          1,
          Math.round(stars)
        )
      );

    return "★".repeat(rounded);

  }

  // =========================================================
  // BOOKING URL
  // =========================================================

  function buildBookingUrl(
    suppliedUrl,
    hotelName,
    destination
  ) {

    if (
      suppliedUrl &&
      /^https?:\/\//i.test(suppliedUrl)
    ) {

      return suppliedUrl;

    }

    const query =
      encodeURIComponent(
        `${hotelName} ${destination}`
      );

    return `https://www.booking.com/searchresults.html?ss=${query}`;

  }

  // =========================================================
  // IMAGE VALIDATION
  // =========================================================

  function isValidImageUrl(url) {

    if (!url) {
      return false;
    }

    if (
      typeof url !== "string"
    ) {
      return false;
    }

    return /^https?:\/\//i.test(
      url.trim()
    );

  }

  // =========================================================
  // PRICE FORMAT
  // =========================================================

  function formatPrice(value) {

    const number =
      Number(value);

    if (!Number.isFinite(number)) {
      return "";
    }

    return Math.round(number)
      .toLocaleString("en-US");

  }

  // =========================================================
  // ERROR SCREEN
  // =========================================================

  function showGenerationError(error) {

    document.getElementById("planTitle").textContent =
      "Generation Error";

    document.getElementById("planIntro").textContent =
      "The travel plan could not be generated.";

    document.getElementById("stayContent").innerHTML = `

      <div class="generation-error">

        <h3>Something went wrong.</h3>

        <p>
          ${escapeHTML(
            error.message ||
            "Unknown server error."
          )}
        </p>

        <button
          type="button"
          class="retry-button"
          onclick="location.reload()"
        >
          Try Again
        </button>

      </div>

    `;

  }

  // =========================================================
  // HTML ESCAPE
  // =========================================================

  function escapeHTML(value) {

    return String(value ?? "")
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
  // TAB NAVIGATION
  // =========================================================

  const tabs =
    document.querySelectorAll(".plan-tab");

  const sections =
    document.querySelectorAll(".plan-section");

  tabs.forEach(tab => {

    tab.addEventListener("click", () => {

      const targetSectionId =
        tab.getAttribute("data-target");

      tabs.forEach(t =>
        t.classList.remove("active")
      );

      sections.forEach(section =>
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

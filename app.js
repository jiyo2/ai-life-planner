const $ = (id) => document.getElementById(id);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.classList.toggle("active");
  });
});

let trip = null;

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
      notes: $("notes").value.trim(),
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

if ($("closeReview")) {
  $("closeReview").addEventListener("click", () => {
    $("review").classList.add("hidden");
  });
}

if ($("pay")) {
  $("pay").addEventListener("click", () => {
    $("review").classList.add("hidden");
    $("app").classList.add("hidden");
    $("plan").classList.remove("hidden");

    renderPlan(trip);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function renderPlan(t) {
  $("planTitle").textContent = `${t.days}-Day ${t.destination} Trip`;

  $("planIntro").textContent =
    `A personalized starter plan for ${t.travelers} traveler(s), ` +
    `built around your $${t.budget} budget and ` +
    `${t.interests.join(", ") || "general"} preferences.`;

  const hotel = Math.round(t.budget * 0.35);
  const food = Math.round(t.budget * 0.20);
  const transport = Math.round(t.budget * 0.15);
  const activities = t.budget - hotel - food - transport;

  $("stay").textContent =
    `Target approximately $${hotel} for accommodation. ` +
    `Prioritize a central location, strong reviews and easy transport access.`;

  $("transport").textContent =
    `Keep about $${transport} for airport and local transport. ` +
    `Prefer rail/metro when practical.`;

  $("experiences").textContent =
    `Mix ${t.interests[0] || "sightseeing"} with high-value experiences ` +
    `and free attractions.`;

  $("money").textContent =
    `Hotel $${hotel} · Food $${food} · Transport $${transport} · Activities $${activities}.`;

  $("daysOut").innerHTML = "";

  for (let i = 1; i <= t.days; i++) {
    const day = document.createElement("div");
    day.className = "day";

    let description;

    if (i === 1) {
      description =
        "Arrival, check-in, neighborhood orientation and an easy first evening.";
    } else if (i === t.days) {
      description =
        "Final highlights, shopping/free time and departure preparation.";
    } else {
      description =
        `Morning ${t.interests[0] || "sightseeing"} · local lunch · ` +
        `afternoon ${t.interests[1] || "activity"} · evening flexible time.`;
    }

    day.innerHTML = `
      <b>Day ${i}</b>
      <p>${description}</p>
    `;

    $("daysOut").appendChild(day);
  }
        }

// ================================
// CONFIG
// ================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec";

let cards = [];
let index = 0;
let sliderInterval;

// ================================
// HELPERS
// ================================
function initials(name) {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function stars(count) {
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += i < count ? "★" : "☆";
  }
  return s;
}

// ================================
// SLIDER
// ================================
function startSlider() {
  sliderInterval = setInterval(() => {
    cards[index].classList.remove("active");
    cards[index].classList.add("exit");

    index = (index + 1) % cards.length;

    cards[index].classList.remove("exit");
    cards[index].classList.add("active");
  }, 5000);
}

function stopSlider() {
  clearInterval(sliderInterval);
}

// ================================
// LOAD TESTIMONIALS FROM SHEET
// ================================
fetch(GAS_URL)
  .then(res => res.json())
  .then(data => {
    if (!data.testimonials || data.testimonials.length === 0) return;

    const slider = document.getElementById("testimonialSlider");
    slider.innerHTML = "";

    data.testimonials.forEach((t, i) => {
      const card = document.createElement("div");
      card.className = "testimonialCard";
      if (i === 0) card.classList.add("active");

      card.innerHTML = `
        <div class="top">
          <div class="avatar">${initials(t.name)}</div>
          <div>
            <strong>${t.name}</strong><br>${t.city}
          </div>
        </div>
        <div class="stars">${stars(t.rating)}</div>
        <p>${t.review}</p>
      `;

      slider.appendChild(card);
    });

    cards = document.querySelectorAll(".testimonialCard");

    cards.forEach(card => {
      card.addEventListener("mouseenter", stopSlider);
      card.addEventListener("mouseleave", startSlider);
    });

    if (cards.length > 1) startSlider();
  })
  .catch(err => console.error("GAS Error:", err));

// ================================
// HERO VIDEO → IMAGE AFTER 3 SEC
// ================================
window.addEventListener("load", () => {
  const video = document.querySelector(".heroVideo");
  const img = document.querySelector(".heroImg");

  setTimeout(() => {
    video.style.opacity = "0";
    img.style.opacity = "1";
  }, 3000);
});

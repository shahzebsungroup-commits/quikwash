const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec";

let selectedRating = 0;

/* ================= TOAST ================= */
let toastTimer;

function showToast(message, type = "success", duration = 2600) {
  const old = document.querySelector(".toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ================= STAR RATING ================= */
function setRating(val) {
  selectedRating = val;
  document.querySelectorAll(".stars span").forEach((s, i) => {
    s.classList.toggle("active", i < val);
  });
}

function resetStars() {
  selectedRating = 0;
  document.querySelectorAll(".stars span").forEach(s =>
    s.classList.remove("active")
  );
}

/* ================= SUBMIT ================= */
async function submitTestimonial() {

  const name = document.getElementById("name").value.trim();
  const city = document.getElementById("city").value.trim();
  const review = document.getElementById("review").value.trim();
  const show = document.getElementById("show").value;

  if (!name || !city || !review) {
    showToast("Please fill all fields", "error");
    return;
  }

  if (selectedRating === 0) {
    showToast("Please select rating ⭐", "error");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  showToast("Submitting testimonial…", "loading", 2000);

  const payload = {
    name,
    city,
    rating: selectedRating,
    message: review,   // ✅ GAS expects "message"
    show
  };

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",        // ✅ GAS compatible
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    showToast("✅ Testimonial submitted successfully!", "success");

    document.getElementById("form").reset();
    resetStars();

  } catch (err) {
    showToast("❌ Network error. Try again.", "error");
  }

  btn.disabled = false;
  btn.textContent = "Submit";
}

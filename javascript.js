// ================================
// CONFIG
// ================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec";

let cards = [];
let index = 0;
let sliderInterval;
let deferredPrompt;

// ================================
// HELPER FUNCTIONS
// ================================
function initials(name) {
  if (!name) return "KW";
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

function stars(count) {
  let s = "";
  const rating = parseInt(count) || 5;
  for (let i = 0; i < 5; i++) {
    s += i < rating ? "★" : "☆";
  }
  return s;
}

// ================================
// SLIDER FUNCTIONS
// ================================
function startSlider() {
  if (cards.length <= 1) return;
  stopSlider();
  
  sliderInterval = setInterval(() => {
    if (cards.length === 0) return;
    
    cards[index].classList.remove("active");
    cards[index].classList.add("exit");
    index = (index + 1) % cards.length;
    cards[index].classList.remove("exit");
    cards[index].classList.add("active");
  }, 5000);
}

function stopSlider() {
  if (sliderInterval) clearInterval(sliderInterval);
}

// ================================
// LOAD TESTIMONIALS
// ================================
function loadTestimonials() {
  const slider = document.getElementById("testimonialSlider");
  if (!slider) return;
  
  slider.innerHTML = '<div class="testimonialCard active"><p>Loading testimonials...</p></div>';
  
  fetch(GAS_URL)
    .then(res => res.ok ? res.json() : Promise.reject('Network error'))
    .then(data => {
      if (!data?.testimonials?.length) throw new Error('No data');
      
      slider.innerHTML = "";
      data.testimonials.forEach((t, i) => {
        const card = document.createElement("div");
        card.className = "testimonialCard";
        if (i === 0) card.classList.add("active");
        card.innerHTML = `
          <div class="top">
            <div class="avatar">${initials(t.name)}</div>
            <div><strong>${t.name || "Customer"}</strong><br>${t.city || "City"}</div>
          </div>
          <div class="stars">${stars(t.rating)}</div>
          <p>${t.review || "Great service!"}</p>
        `;
        slider.appendChild(card);
      });
      
      cards = document.querySelectorAll(".testimonialCard");
      if (cards.length > 1) {
        cards.forEach(card => {
          card.addEventListener("mouseenter", stopSlider);
          card.addEventListener("mouseleave", startSlider);
        });
        startSlider();
      }
    })
    .catch(err => {
      console.error("Loading testimonials failed:", err);
      slider.innerHTML = `
        <div class="testimonialCard active">
          <div class="top">
            <div class="avatar">RS</div>
            <div><strong>Raj Sharma</strong><br>Mumbai</div>
          </div>
          <div class="stars">★★★★★</div>
          <p>Best car wash service! Highly recommended.</p>
        </div>
      `;
    });
}

// ================================
// HERO TRANSITION
// ================================
function setupHeroTransition() {
  const video = document.getElementById("heroVideo");
  const img = document.getElementById("heroImg");
  
  if (!video || !img) return;
  
  setTimeout(() => {
    video.classList.add("hide");
    img.classList.add("show");
  }, 3000);
}

// ================================
// PWA INSTALLATION
// ================================
function setupPWA() {
  const installBtn = document.getElementById("installBtn");
  if (!installBtn) return;
  
  // Check if already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (isStandalone) {
    installBtn.style.display = "none";
    return;
  }
  
  // Listen for install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    installBtn.style.display = "block";
    installBtn.classList.add("pulse");
    
    // Install button click handler
    installBtn.addEventListener('click', () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          installBtn.style.display = "none";
          alert("App installed successfully!");
        }
        deferredPrompt = null;
      });
    });
  });
  
  // Hide button if not supported
  setTimeout(() => {
    if (!deferredPrompt) {
      installBtn.style.display = "none";
    }
  }, 2000);
}

// ================================
// SERVICE WORKER REGISTRATION
// ================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed:', err));
  }
}

// ================================
// CTA BUTTON
// ================================
function setupCTAButton() {
  const ctaBtn = document.getElementById("ctaBtn");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", () => {
      alert("🚗 Booking coming soon! Call: +91-XXXXXXXXXX");
    });
  }
}

// ================================
// INITIALIZE EVERYTHING
// ================================
function init() {
  setupHeroTransition();
  loadTestimonials();
  setupPWA();
  registerServiceWorker();
  setupCTAButton();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

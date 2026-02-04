// Quick test - remove after debugging
console.log("=== DEBUG START ===");
console.log("Window loaded:", document.readyState);
console.log("heroVideo element:", document.getElementById("heroVideo"));
console.log("heroImg element:", document.getElementById("heroImg"));
console.log("testimonialSlider element:", document.getElementById("testimonialSlider"));
console.log("=== DEBUG END ===");


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
  
  // FIX: Check if slider exists
  if (!slider) {
    console.log("Testimonial slider element not found");
    return;
  }
  
  // Show loading message
  slider.innerHTML = '<div class="testimonialCard active"><p>Loading testimonials...</p></div>';
  
  // Fetch from GAS URL
  fetch(GAS_URL)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("GAS Data received:", data); // Debug log
      
      // Check if testimonials array exists
      if (!data || !data.testimonials || !Array.isArray(data.testimonials)) {
        throw new Error("Invalid data format from GAS");
      }
      
      // Clear loading message
      slider.innerHTML = "";
      
      // Create testimonial cards
      data.testimonials.forEach((t, i) => {
        const card = document.createElement("div");
        card.className = "testimonialCard";
        if (i === 0) card.classList.add("active");
        
        card.innerHTML = `
          <div class="top">
            <div class="avatar">${initials(t.name)}</div>
            <div>
              <strong>${t.name || "Customer"}</strong><br>
              ${t.city || ""}
            </div>
          </div>
          <div class="stars">${stars(t.rating)}</div>
          <p>${t.review || "Great service!"}</p>
        `;
        
        slider.appendChild(card);
      });
      
      // Initialize slider
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
      console.error("GAS Error:", err);
      
      // Show fallback testimonials
      const fallbackTestimonials = [
        {
          name: "Raj Sharma",
          city: "Mumbai",
          rating: 5,
          review: "Best car wash service! Highly recommended."
        },
        {
          name: "Priya Patel",
          city: "Delhi",
          rating: 5,
          review: "Very professional and timely service."
        },
        {
          name: "Amit Kumar",
          city: "Bangalore",
          rating: 4,
          review: "Convenient doorstep service. Saves time!"
        }
      ];
      
      slider.innerHTML = "";
      fallbackTestimonials.forEach((t, i) => {
        const card = document.createElement("div");
        card.className = "testimonialCard";
        if (i === 0) card.classList.add("active");
        
        card.innerHTML = `
          <div class="top">
            <div class="avatar">${initials(t.name)}</div>
            <div>
              <strong>${t.name}</strong><br>
              ${t.city}
            </div>
          </div>
          <div class="stars">${stars(t.rating)}</div>
          <p>${t.review}</p>
        `;
        
        slider.appendChild(card);
      });
      
      cards = document.querySelectorAll(".testimonialCard");
      if (cards.length > 1) startSlider();
    });
}

// ================================
// HERO TRANSITION - FIXED VERSION
// ================================
function setupHeroTransition() {
  const video = document.querySelector(".heroVideo");
  const img = document.querySelector(".heroImg");
  
  // FIX: Check if elements exist
  if (!video || !img) {
    console.log("Hero video or image element not found");
    return;
  }
  
  setTimeout(() => {
    // FIX: Use classList instead of style
    video.classList.add("hide");
    img.classList.add("show");
  }, 3000);
}

// ================================
// PWA INSTALLATION
// ================================
function setupPWA() {
  const installBtn = document.getElementById("installBtn");
  
  // FIX: Check if button exists
  if (!installBtn) {
    console.log("Install button not found");
    return;
  }
  
  // Check if already installed as PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (isStandalone) {
    console.log("App already installed as PWA");
    installBtn.style.display = "none";
    return;
  }
  
  // Listen for PWA install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    console.log("PWA install prompt available");
    
    // Show install button
    installBtn.style.display = "block";
    installBtn.classList.add("pulse");
    
    // Install button click handler
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        alert("PWA installation not supported in your browser");
        return;
      }
      
      // Show install prompt
      deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log("User accepted PWA installation");
        installBtn.style.display = "none";
        installBtn.classList.remove("pulse");
        alert("✓ Kwikkwash App installed successfully!");
      } else {
        console.log("User dismissed PWA installation");
      }
      
      deferredPrompt = null;
    });
  });
  
  // Hide button if PWA not supported after 3 seconds
  setTimeout(() => {
    if (!deferredPrompt && installBtn.style.display !== "none") {
      installBtn.style.display = "none";
      console.log("PWA installation not supported");
    }
  }, 3000);
}

// ================================
// SERVICE WORKER REGISTRATION
// ================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(err => {
          console.log('Service Worker registration failed:', err);
        });
    });
  }
}

// ================================
// CTA BUTTON
// ================================
function setupCTAButton() {
  const ctaBtn = document.getElementById("ctaBtn");
  
  // FIX: Check if button exists
  if (!ctaBtn) {
    console.log("CTA button not found");
    return;
  }
  
  // CTA बटन का टेक्स्ट "Step In" करें
  const buttonText = ctaBtn.querySelector("span");
  if (buttonText) {
    buttonText.textContent = "Step In";
  }
  
  ctaBtn.addEventListener("click", () => {
    // Same page पर URL लोड करें
    window.location.href = "https://quikwash.in/product/";
  });
}

// ================================
// INITIALIZE EVERYTHING
// ================================
function init() {
  console.log("Initializing Kwikkwash...");
  
  // Setup all features
  setupHeroTransition();
  loadTestimonials();
  setupPWA();
  registerServiceWorker();
  setupCTAButton();
  
  console.log("Initialization complete");
}

// ================================
// START WHEN READY
// ================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already loaded
  init();
}

// Debug: Log all elements on page
window.addEventListener('load', () => {
  console.log("Page loaded, checking elements...");
  console.log("heroVideo:", document.querySelector(".heroVideo"));
  console.log("heroImg:", document.querySelector(".heroImg"));
  console.log("testimonialSlider:", document.getElementById("testimonialSlider"));
  console.log("installBtn:", document.getElementById("installBtn"));
  console.log("ctaBtn:", document.getElementById("ctaBtn"));
});


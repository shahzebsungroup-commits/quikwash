// ================================
// CONFIG
// ================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec"; // Testimonials GAS URL
const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbyMFPQ3pMHty3O0U2gpKZHgBT1vNPfIC0xJBYb18ZlVKf7h7UsPaavAX-sRyG_CxiWJ/exec"; // Analytics GAS URL

let cards = [];
let index = 0;
let sliderInterval;
let deferredPrompt;
let instructionTimer;
let isInstallableChecked = false;

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

// Check if running in standalone PWA mode
function isPwaMode() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Check if running on desktop
function isDesktop() {
  return !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ================================
// INSTALL DETECTION
// ================================
window.addEventListener("appinstalled", () => {
  localStorage.setItem("appInstalled", "true");
  
  // Update button immediately
  const btn = document.getElementById("installBtn");
  if (btn) {
    btn.style.display = "inline-block";
    btn.innerHTML = "<span>Open App</span>";
    btn.onclick = () => window.location.href = "./";
    
    // Hide instruction if exists
    const instructionEl = document.getElementById("installInstruction");
    if (instructionEl) instructionEl.style.display = "none";
  }
});

// ================================
// SMART LOCATION DETECTION (NO POPUP)
// ================================
async function getLocationSmart() {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      
      if (perm.state === "granted") {
        return new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                source: "GPS",
                location_accuracy: "gps"
              });
            },
            () => {
              resolve(getIPLocation());
            },
            { 
              enableHighAccuracy: true, 
              timeout: 5000, 
              maximumAge: 60000 
            }
          );
        });
      }
    }
    
    return await getIPLocation();
    
  } catch (err) {
    return await getIPLocation();
  }
}

// IP-based location
async function getIPLocation() {
  try {
    const ipRes = await fetch("https://ipapi.co/json/");
    const ipData = await ipRes.json();
    
    return {
      city: ipData.city || null,
      state: ipData.region || null,
      country: ipData.country_name || null,
      lat: ipData.latitude || null,
      lon: ipData.longitude || null,
      accuracy: null,
      source: "IP",
      location_accuracy: "ip"
    };
  } catch (err) {
    return {
      city: null,
      state: null,
      country: null,
      lat: null,
      lon: null,
      accuracy: null,
      source: "UNKNOWN",
      location_accuracy: "none"
    };
  }
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
  
  if (!slider) {
    return;
  }
  
  slider.innerHTML = '<div class="testimonialCard active"><p>Loading testimonials...</p></div>';
  
  fetch(GAS_URL)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (!data || !data.testimonials || !Array.isArray(data.testimonials)) {
        throw new Error("Invalid data format from GAS");
      }
      
      slider.innerHTML = "";
      
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
      
      cards = document.querySelectorAll(".testimonialCard");
      if (cards.length > 1) {
        cards.forEach(card => {
          card.addEventListener("mouseenter", stopSlider);
          card.addEventListener("mouseleave", startSlider);
        });
        startSlider();
      }
    })
    .catch(() => {
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
// HERO TRANSITION
// ================================
function setupHeroTransition() {
  const video = document.querySelector(".heroVideo");
  const img = document.querySelector(".heroImg");
  
  if (!video || !img) {
    return;
  }
  
  setTimeout(() => {
    video.classList.add("hide");
    img.classList.add("show");
  }, 4000);
}

// ================================
// ANALYTICS WITH SMART LOCATION
// ================================
async function sendAnalytics() {
  try {
    if (sessionStorage.getItem("analyticsSent")) {
      return;
    }
    
    const isPWA = isPwaMode();
    
    const location = await getLocationSmart();
    
    const analyticsData = {
      type: isPWA ? "PWA" : "BROWSER",
      timestamp: new Date().toISOString(),
      session_id: sessionStorage.getItem("sessionId") || generateSessionId(),
      location: {
        source: location.source,
        location_accuracy: location.location_accuracy,
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        state: location.state,
        country: location.country,
        accuracy_meters: location.accuracy
      },
      url: window.location.href,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform,
      referrer: document.referrer || "direct",
      user_agent: navigator.userAgent.substring(0, 200),
      app_version: "1.0.0",
      service_worker: 'serviceWorker' in navigator
    };
    
    sessionStorage.setItem("analyticsSent", "1");
    
    if (!sessionStorage.getItem("sessionId")) {
      sessionStorage.setItem("sessionId", analyticsData.session_id);
    }
    
    if (ANALYTICS_URL && ANALYTICS_URL.includes('YOUR_ANALYTICS_GAS_URL')) {
      return;
    }
    
    fetch(ANALYTICS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyticsData)
    }).catch(() => {});
    
  } catch (err) {}
}

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ================================
// SMART INSTALL BUTTON SETUP (UPDATED)
// ================================
function setupInstallButton() {
  const installBtn = document.getElementById("installBtn");
  
  if (!installBtn) {
    return;
  }
  
  // Check if PWA mode (app already open)
  const pwaMode = isPwaMode();
  const desktopMode = isDesktop();
  
  // 1️⃣ If PWA is open - hide button completely
  if (pwaMode) {
    installBtn.style.display = "none";
    return;
  }
  
  // Default hidden
  installBtn.style.display = "none";
  
  // 2️⃣ Check if already installed (but opened in browser)
  const isInstalled = localStorage.getItem("appInstalled") === "true";
  
  if (isInstalled) {
    installBtn.innerHTML = "<span>Open App</span>";
    installBtn.style.display = "inline-block";
    installBtn.onclick = () => window.location.href = "./";
    return;
  }
  
  // 3️⃣ Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    isInstallableChecked = true;
    
    // Clear instruction timer
    if (instructionTimer) {
      clearTimeout(instructionTimer);
      instructionTimer = null;
    }
    
    // Hide instruction if exists
    const instructionEl = document.getElementById("installInstruction");
    if (instructionEl) instructionEl.style.display = "none";
    
    // Show install button
    installBtn.style.display = "inline-block";
    installBtn.innerHTML = "<span>Install App (Recommended)</span>";
    
    // Install click handler
    installBtn.onclick = async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem("appInstalled", "true");
        installBtn.innerHTML = "<span>Open App</span>";
        installBtn.onclick = () => window.location.href = "./";
        deferredPrompt = null;
        
        // Hide instruction if exists
        const instructionEl = document.getElementById("installInstruction");
        if (instructionEl) instructionEl.style.display = "none";
      } else {
        deferredPrompt = null;
        // Keep button visible with same text
      }
    };
  });
  
  // 4️⃣ Wait 4 seconds, then check if we got the install prompt
  setTimeout(() => {
    // Double-check if PWA mode was activated during wait
    if (isPwaMode()) {
      installBtn.style.display = "none";
      const instructionEl = document.getElementById("installInstruction");
      if (instructionEl) instructionEl.style.display = "none";
      return;
    }
    
    // Check if already installed
    if (localStorage.getItem("appInstalled") === "true") {
      installBtn.innerHTML = "<span>Open App</span>";
      installBtn.style.display = "inline-block";
      return;
    }
    
    // If we got the install prompt, button is already visible
    if (deferredPrompt) {
      return;
    }
    
    // On desktop: only show download button if not installable
    if (desktopMode) {
      installBtn.style.display = "inline-block";
      installBtn.innerHTML = "<span>Download App</span>";
      installBtn.onclick = () => {
        window.open('https://quikwash.in', '_blank');
      };
      return;
    }
    
    // On mobile without install prompt: show instruction as last resort
    if (!deferredPrompt && !isInstallableChecked) {
      // Create or show instruction text
      let instruction = document.getElementById("installInstruction");
      if (!instruction) {
        instruction = document.createElement("div");
        instruction.id = "installInstruction";
        instruction.className = "install-instruction";
        instruction.innerHTML = `📱 Tap <span>⁝</span> (3 dots) → "Add to Home screen" → Add`;
        installBtn.parentNode.insertBefore(instruction, installBtn.nextSibling);
      }
      instruction.style.display = "block";
    }
  }, 4000);
}

// ================================
// SERVICE WORKER REGISTRATION
// ================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js?v=7')
        .then(registration => {
          console.log('Service Worker registered');
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(error => {
          console.log('Service Worker registration failed:', error);
        });
    });
  }
}

// ================================
// CTA BUTTON
// ================================
function setupCTAButton() {
  const ctaBtn = document.getElementById("ctaBtn");
  
  if (!ctaBtn) {
    return;
  }
  
  const buttonText = ctaBtn.querySelector("span");
  if (buttonText) {
    buttonText.textContent = "Step In";
  }
  
  ctaBtn.addEventListener("click", () => {
    window.location.href = "https://quikwash.in/product/";
  });
}

// ================================
// INITIALIZE EVERYTHING
// ================================
async function init() {
  try {
    await sendAnalytics();
  } catch (err) {}
  
  setupInstallButton();
  setupHeroTransition();
  loadTestimonials();
  registerServiceWorker();
  setupCTAButton();
}

// ================================
// START WHEN READY
// ================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(() => {});
  });
} else {
  init().catch(() => {});
}

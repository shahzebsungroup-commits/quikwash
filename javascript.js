// ================================
// CONFIG
// ================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec";
const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbyMFPQ3pMHty3O0U2gpKZHgBT1vNPfIC0xJBYb18ZlVKf7h7UsPaavAX-sRyG_CxiWJ/exec";

let cards = [];
let index = 0;
let sliderInterval;
let deferredPrompt;
let installCheckDone = false;

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
// PWA DETECTION
// ================================
function isRunningAsPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.matchMedia('(display-mode: minimal-ui)').matches;
}

function isDesktop() {
  return window.innerWidth > 1024 || 
         /Mac|Windows|Linux/.test(navigator.platform) && 
         !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ================================
// INSTALLATION CHECK WITH 4 SECOND WAIT
// ================================
function checkPWAStatus() {
  const installBtn = document.getElementById("installBtn");
  const instructionText = document.getElementById("instructionText");
  
  if (!installBtn || !instructionText) return;
  
  // Case 1: Already running as PWA - hide everything
  if (isRunningAsPWA()) {
    installBtn.style.display = "none";
    instructionText.style.display = "none";
    return;
  }
  
  // Case 2: Desktop - only show install/open, no instructions
  if (isDesktop()) {
    if (localStorage.getItem("appInstalled") === "true") {
      installBtn.style.display = "inline-block";
      installBtn.innerHTML = "<span>Open App</span>";
      installBtn.onclick = () => window.location.href = "/";
    } else {
      // Check if installable
      if (deferredPrompt) {
        installBtn.style.display = "inline-block";
        installBtn.innerHTML = "<span>Install App (Recommended)</span>";
        setupInstallHandler();
      } else {
        // On desktop, if not installable, hide button (no instructions)
        installBtn.style.display = "none";
        instructionText.style.display = "none";
      }
    }
    return;
  }
  
  // Case 3: Mobile - full logic
  if (localStorage.getItem("appInstalled") === "true") {
    installBtn.style.display = "inline-block";
    installBtn.innerHTML = "<span>Open App</span>";
    installBtn.onclick = () => window.location.href = "/";
    instructionText.style.display = "none";
  } else {
    // Check if installable
    if (deferredPrompt) {
      installBtn.style.display = "inline-block";
      installBtn.innerHTML = "<span>Install App (Recommended)</span>";
      setupInstallHandler();
      instructionText.style.display = "none";
    } else {
      // Not installable - show instruction as last resort
      installBtn.style.display = "none";
      instructionText.style.display = "block";
    }
  }
}

function setupInstallHandler() {
  const installBtn = document.getElementById("installBtn");
  if (!installBtn) return;
  
  installBtn.onclick = async () => {
    if (!deferredPrompt) {
      // Fallback to instructions if install prompt not available
      const instructionText = document.getElementById("instructionText");
      if (instructionText) {
        instructionText.style.display = "block";
      }
      return;
    }
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      localStorage.setItem("appInstalled", "true");
      installBtn.innerHTML = "<span>Open App</span>";
      installBtn.onclick = () => window.location.href = "/";
      document.getElementById("instructionText").style.display = "none";
    }
    
    deferredPrompt = null;
  };
}

// ================================
// SMART LOCATION DETECTION
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
  }, 3000);
}

// ================================
// ANALYTICS
// ================================
async function sendAnalytics() {
  try {
    if (sessionStorage.getItem("analyticsSent")) {
      return;
    }
    
    const isPWA = isRunningAsPWA();
    
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

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ================================
// SERVICE WORKER REGISTRATION
// ================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(() => {});
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
  
  ctaBtn.addEventListener("click", () => {
    window.location.href = "https://quikwash.in/product/";
  });
}

// ================================
// MAIN INIT WITH 4 SECOND WAIT
// ================================
async function init() {
  try {
    await sendAnalytics();
  } catch (err) {}
  
  setupHeroTransition();
  loadTestimonials();
  registerServiceWorker();
  setupCTAButton();
  
  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // If check hasn't been done yet, wait for 4 seconds
    if (!installCheckDone) {
      setTimeout(() => {
        checkPWAStatus();
        installCheckDone = true;
      }, 4000); // 4 second wait
    }
  });
  
  // Also check after 4 seconds even if no beforeinstallprompt
  setTimeout(() => {
    if (!installCheckDone) {
      checkPWAStatus();
      installCheckDone = true;
    }
  }, 4000);
  
  // Listen for app installed
  window.addEventListener("appinstalled", () => {
    localStorage.setItem("appInstalled", "true");
    checkPWAStatus();
  });
}

// ================================
// START
// ================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(() => {});
  });
} else {
  init().catch(() => {});
}
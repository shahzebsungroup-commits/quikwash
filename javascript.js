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
const GAS_URL = "https://script.google.com/macros/s/AKfycbxCV4GTuu4Te3PQ4dlxhyG9pIUic2b2_fxO4e7wDZ2kiZQRkGJ6-9Zl47pKWcYoOzqr/exec"; // Testimonials GAS URL
const ANALYTICS_URL = "https://script.google.com/macros/s/AKfycbyMFPQ3pMHty3O0U2gpKZHgBT1vNPfIC0xJBYb18ZlVKf7h7UsPaavAX-sRyG_CxiWJ/exec"; // Analytics GAS URL

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
// ✅ SMART LOCATION DETECTION (NO POPUP)
// ================================
async function getLocationSmart() {
  try {
    // 1️⃣ Check permission silently (NO POPUP)
    if (navigator.permissions && navigator.permissions.query) {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      
      if (perm.state === "granted") {
        // ✅ Already allowed → exact GPS (silent)
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
              // GPS failed → fallback to IP
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
    
    // 2️⃣ Not granted / permission API not available → IP fallback
    return await getIPLocation();
    
  } catch (err) {
    console.log("Location detection error:", err);
    return await getIPLocation(); // Fallback to IP
  }
}

// IP-based location (NO POPUP)
async function getIPLocation() {
  try {
    const ipRes = await fetch("https://ipapi.co/json/");
    const ipData = await ipRes.json();
    
    return {
      city: ipData.city || null,
      state: ipData.region || null,
      country: ipData.country_name || null,
      lat: ipData.latitude || null,    // ✅ IP-based approx lat
      lon: ipData.longitude || null,   // ✅ IP-based approx lon
      accuracy: null,                   // ✅ IMPORTANT: null for IP accuracy
      source: "IP",
      location_accuracy: "ip"
    };
  } catch (err) {
    console.log("IP location error:", err);
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
// ✅ ANALYTICS WITH SMART LOCATION (NO POPUP)
// ================================
async function sendAnalytics() {
  try {
    // Check if analytics already sent in this session
    if (sessionStorage.getItem("analyticsSent")) {
      console.log("📊 Analytics already sent in this session");
      return;
    }
    
    // Check if app is running as installed PWA
    const isPWA = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
    
    // ✅ Get smart location (NO POPUP)
    const location = await getLocationSmart();
    
    const analyticsData = {
      // User & Session
      type: isPWA ? "PWA" : "BROWSER",
      timestamp: new Date().toISOString(),
      session_id: sessionStorage.getItem("sessionId") || generateSessionId(),
      
      // Location Data (clearly marked GPS vs IP)
      location: {
        source: location.source,
        location_accuracy: location.location_accuracy,
        lat: location.lat,
        lon: location.lon,
        city: location.city,
        state: location.state,
        country: location.country,
        accuracy_meters: location.accuracy  // ✅ null for IP, number for GPS
      },
      
      // Device & Browser
      url: window.location.href,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      platform: navigator.platform,
      referrer: document.referrer || "direct",
      user_agent: navigator.userAgent.substring(0, 200), // Truncate for privacy
      
      // App Info
      app_version: "1.0.0",
      service_worker: 'serviceWorker' in navigator
    };
    
    console.log("📊 Analytics Data:", analyticsData);
    
    // Mark as sent to prevent duplicates
    sessionStorage.setItem("analyticsSent", "1");
    
    // Generate session ID if not exists
    if (!sessionStorage.getItem("sessionId")) {
      sessionStorage.setItem("sessionId", analyticsData.session_id);
    }
    
    // Send analytics data (optional - comment out if no endpoint yet)
    if (ANALYTICS_URL && ANALYTICS_URL.includes('YOUR_ANALYTICS_GAS_URL')) {
      console.log("📊 Analytics: Data prepared (GAS URL not configured)", analyticsData);
      // Remove this line when you set up your analytics endpoint
      return;
    }
    
    // Uncomment when you have your analytics GAS URL ready
    
    fetch(ANALYTICS_URL, {
      method: "POST",
      mode: "no-cors", // Important for GAS
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyticsData)
    }).then(() => {
      console.log("📊 Analytics sent successfully");
    }).catch(err => {
      console.error("📊 Analytics error:", err);
    });
    
    
  } catch (err) {
    console.error("📊 Analytics setup error:", err);
  }
}

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ================================
// ✅ INSTALL BUTTON TEXT AUTO-CHANGE (WITH PWA SAFETY CHECK)
// ================================
function setupInstallButton() {
  const installBtn = document.getElementById("installBtn");
  
  // FIX: Check if button exists
  if (!installBtn) {
    console.log("Install button not found");
    return;
  }
  
  // ✅ 2️⃣ JS me safety check (extra protection)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    installBtn.style.display = "none";
    console.log("PWA detected via CSS/JS - Install button hidden");
    return;
  }
  
  // ✅ Check if app is running as installed PWA (alternative method)
  const isPWA = 
    window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone === true;
  
  console.log("Is PWA?", isPWA);
  
  if (isPWA) {
    // Already installed - change to "Open App"
    installBtn.innerHTML = "<span>✅ Open App</span>";
    installBtn.setAttribute("data-state", "open");
    installBtn.classList.remove("pulse");
    
    // Open app functionality
    installBtn.onclick = () => {
      // Already in app, just ensure we're at home
      window.location.href = "/";
    };
    
    // Hide install button
    installBtn.style.display = 'none';
    console.log("PWA installed - button hidden");
  } else {
    // Not installed - show "Install App"
    installBtn.innerHTML = "<span>⬇️ Install App</span>";
    installBtn.setAttribute("data-state", "install");
    
    // ✅ FIX: Use { once: true } to prevent duplicate listeners
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      console.log("PWA install prompt available (once only)");
      
      // Make button pulse when install is available
      installBtn.classList.add("pulse");
      
      // ✅ FIXED: Use onclick instead of addEventListener
      installBtn.onclick = async () => {
        if (!deferredPrompt) {
          alert("📱 To install Kwikkwash App:\n\n1. Tap the share button (⎙) in your browser\n2. Select 'Add to Home Screen'\n3. Follow the prompts\n\nFor iOS: Use Safari browser");
          return;
        }
        
        // Show install prompt
        deferredPrompt.prompt();
        
        // Wait for user choice
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log("User accepted PWA installation");
          installBtn.classList.remove("pulse");
          installBtn.innerHTML = "<span>✅ Installed!</span>";
          installBtn.setAttribute("data-state", "installed");
          setTimeout(() => {
            installBtn.innerHTML = "<span>✅ Open App</span>";
            installBtn.setAttribute("data-state", "open");
            installBtn.onclick = () => window.location.href = "/";
          }, 2000);
        } else {
          console.log("User dismissed PWA installation");
          installBtn.classList.remove("pulse");
        }
        
        deferredPrompt = null;
      };
    }, { once: true }); // ✅ IMPORTANT FIX: Listener runs only once
    
    // If no prompt within 3 seconds, setup fallback
    setTimeout(() => {
      if (!deferredPrompt) {
        // ✅ FIXED: Use onclick instead of addEventListener
        installBtn.onclick = () => {
          alert("📱 To install Kwikkwash App:\n\n1. Tap the share button (⎙) in your browser\n2. Select 'Add to Home Screen'\n3. Follow the prompts\n\nFor iOS: Use Safari browser");
        };
      }
    }, 3000);
  }
}

// ================================
// ✅ SERVICE WORKER REGISTRATION (Silent background update)
// ================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
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
// INITIALIZE EVERYTHING (WITH PROPER AWAIT)
// ================================
async function init() {
  console.log("Initializing Kwikkwash...");
  
  try {
    // ✅ Properly await analytics (because it's async)
    await sendAnalytics();
  } catch (err) {
    console.error("Analytics failed, continuing:", err);
  }
  
  // Setup other features (non-async)
  setupInstallButton();
  setupHeroTransition();
  loadTestimonials();
  registerServiceWorker();
  setupCTAButton();
  
  console.log("Initialization complete");
}

// ================================
// START WHEN READY
// ================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => {
      console.error("Initialization failed:", err);
    });
  });
} else {
  // DOM already loaded
  init().catch(err => {
    console.error("Initialization failed:", err);
  });
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

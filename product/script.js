const BASE_URL = "https://app.vbo.co.in";

let selectedServices = [];
let availableCities = [];
let typingTimer;
let currentCity = null;
let userLocation = null;
let selectedMapLat = null;
let selectedMapLng = null;
let allPartners = [];
let map = null;
let mapSearchBox = null;
let geocoder = null;
let googleMapsReady = false;
let currentMapCenter = null;
let mapControlsBound = false;
let mapFooterCollapseTimer = null;
let mapFooterAutoCollapseLocked = false;
let mapSearchTimer = null;
let mapSearchLastQuery = "";
let pinMotionState = null;

const DEFAULT_CITY = "Rampur";
let lightStyle = [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];
let darkStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

function getFormattedTimestamp() {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    let hours = now.getHours();
    let minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${date} ${hours}:${minutes} ${ampm}`;
}

function formatTime(time) {
    if (!time) return "";
    const [h, m] = time.split(":");
    let hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

function getIcon(service) {
    const s = service.toLowerCase();
    if (s.includes("car")) return "🚗";
    if (s.includes("bike") || s.includes("motor")) return "🏍️";
    if (s.includes("sofa")) return "🛋";
    if (s.includes("clean")) return "🧼";
    if (s.includes("wash")) return "💦";
    if (s.includes("interior")) return "🧽";
    if (s.includes("exterior")) return "🚙";
    if (s.includes("polish") || s.includes("wax")) return "✨";
    if (s.includes("vacuum")) return "🧹";
    if (s.includes("detailing")) return "🔧";
    if (s.includes("paint")) return "🎨";
    return "⚙️";
}

function showToast(msg) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 2000);
    }, 4000);
}

function openBooking() {
    const bookingForm = document.getElementById("booking-form");
    if (!bookingForm) return;

    const startY = window.scrollY;
    const targetY = bookingForm.getBoundingClientRect().top + window.scrollY - 24;
    const distance = targetY - startY;
    const duration = 1600;
    const startTime = performance.now();

    const easeInOutCubic = (t) => (
        t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2
    );

    const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        window.scrollTo(0, startY + distance * eased);

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
        }
    };

    requestAnimationFrame(animateScroll);
}

function showSlotFullPopup() {
    const popup = document.createElement("div");
    popup.className = "slot-popup";

    popup.innerHTML = `
        <div class="slot-popup-content">
            <div class="slot-popup-icon">⚠️</div>
            <h3>Slot Unavailable</h3>
            <p>This time slot is fully booked.<br>Please choose another slot.</p>
            <button onclick="this.closest('.slot-popup').remove()">OK</button>
        </div>
    `;

    document.body.appendChild(popup);
}

function capturePopup() {
    const popup = document.getElementById("successPopup");
    if (!popup) return;

    html2canvas(popup, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#141414",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "booking-confirmation.png";
        link.href = canvas.toDataURL("image/png", 1.0);
        link.click();
    });
}

function showInfoModal(title, content) {
    document.getElementById('infoModalTitle').innerText = title || "Service Details";
    const contentDiv = document.getElementById('infoModalBody');
    contentDiv.innerHTML = content || "No additional details available";
    document.getElementById('infoModal').classList.add('show');
}

function closeInfoModal() {
    document.getElementById('infoModal').classList.remove('show');
}

document.addEventListener("click", function(e) {
    if (e.target.closest('.info-btn')) {
        e.stopPropagation();
        const btn = e.target.closest('.info-btn');
        showInfoModal(
            (btn.dataset.title || "").replace(/_/g, ' '),
            btn.dataset.content || ""
        );
    }
});

document.addEventListener('click', function(e) {
    const modal = document.getElementById('infoModal');
    if (modal.classList.contains('show') && e.target === modal) {
        closeInfoModal();
    }
});

async function getUserLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 }
        );
    });
}

function isWithinRange(userLat, userLng, partner) {
    if (!partner.office_lat || !partner.office_lng) return false;
    const officeLat = Number(partner.office_lat);
    const officeLng = Number(partner.office_lng);
    const serviceRange = Number(partner.service_range_km || 0);
    const R = 6371;
    const dLat = (officeLat - userLat) * Math.PI / 180;
    const dLng = (officeLng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(userLat * Math.PI / 180) *
              Math.cos(officeLat * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= serviceRange;
}

async function fetchAllPartners() {
    try {
        const res = await fetch(`${BASE_URL}/kwikkwash/partners/all`);
        allPartners = await res.json();
        return allPartners;
    } catch (error) {
        console.error("Error fetching partners:", error);
        allPartners = [];
        return [];
    }
}

async function fetchCities() {
    const partners = allPartners.length ? allPartners : await fetchAllPartners();
    return [...new Set(partners.map(p => p.city).filter(Boolean))];
}

function normalizeCityName(value) {
    if (!value) return "";

    return value
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z]/g, "")
        .replace(/aa/g, "a")
        .replace(/oo/g, "u")
        .replace(/[aeiou]/g, match => {
            if (match === "a" || match === "e" || match === "i" || match === "o" || match === "u") {
                return "a";
            }
            return match;
        });
}

function fuzzyMatchCity(input, cityList) {
    const normalizedInput = normalizeCityName(input);
    if (!normalizedInput || normalizedInput.length < 2) return null;

    for (const city of cityList) {
        const normalizedCity = normalizeCityName(city);
        if (normalizedInput === normalizedCity) {
            return city;
        }
    }

    for (const city of cityList) {
        const normalizedCity = normalizeCityName(city);
        if (
            normalizedCity.includes(normalizedInput) ||
            normalizedInput.includes(normalizedCity)
        ) {
            return city;
        }
    }

    for (const city of cityList) {
        const normalizedCity = normalizeCityName(city);
        if (normalizedCity.length >= 3 && normalizedInput.length >= 3) {
            if (normalizedCity.substring(0, 3) === normalizedInput.substring(0, 3)) {
                return city;
            }
        }
    }

    return null;
}

function resolveKnownCityName(city) {
    if (!city) return null;
    return fuzzyMatchCity(city, availableCities) || city;
}

function getPartnersForCity(city) {
    const resolvedCity = resolveKnownCityName(city);
    const normalizedTarget = normalizeCityName(resolvedCity || city);
    return allPartners.filter(partner => normalizeCityName(partner.city) === normalizedTarget);
}

function getDefaultPartner() {
    return (
        getPartnersForCity(DEFAULT_CITY).find(partner => partner.office_lat && partner.office_lng) ||
        allPartners.find(partner => partner.office_lat && partner.office_lng) ||
        null
    );
}

function getDefaultCoordinates() {
    const defaultPartner = getDefaultPartner();
    if (!defaultPartner) return null;

    return {
        lat: Number(defaultPartner.office_lat),
        lng: Number(defaultPartner.office_lng)
    };
}

function setOtherCityMode(visible, value = "") {
    const otherInput = document.getElementById("otherCityInput");
    if (!otherInput) return;

    otherInput.style.display = visible ? "block" : "none";
    otherInput.required = visible;
    otherInput.value = value;
}

function setDropdownToCity(city) {
    const dropdown = document.getElementById("cityDropdown");
    if (dropdown) {
        dropdown.value = city;
    }
}

function showCityEntryPrompt(message = "Enter your city to see available services") {
    const container = document.getElementById("servicesList");
    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-city"></i>
            <p>${message}</p>
        </div>
    `;
}

function clearTransientBookingUi() {
    document.getElementById("slotsContainer").innerHTML = "";
    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = "none";

    document.getElementById("userFormContainer").style.display = "none";
    window.__slotData = null;
    window.__selectedSlot = null;
}

function revealAppAfterLocationReady() {
    const loader = document.getElementById("appLoader");
    document.body.classList.remove("app-loading");
    document.body.classList.add("app-ready");

    setTimeout(() => {
        document.body.classList.add("city-selection-compact");
    }, 900);

    if (loader) {
        loader.classList.add("hide");
        setTimeout(() => loader.remove(), 450);
    }
}

function moveCitySelectorToTopBar() {
    const topBar = document.getElementById("cityTopBar");
    const citySection = document.querySelector(".services-panel .city-section");
    if (!topBar || !citySection) return;

    topBar.appendChild(citySection);
    document.body.classList.add("city-topbar-mounted");
}

async function applyFallbackToOther(prefill = "") {
    setDropdownToCity("Other");
    setOtherCityMode(true, prefill);
    currentCity = DEFAULT_CITY;
    clearTransientBookingUi();
    await loadServicesFromDefault();
}

function prepareOtherCitySelection(prefill = "", message = "Enter your city to see available services") {
    setDropdownToCity("Other");
    setOtherCityMode(true, prefill);
    clearTransientBookingUi();
    currentCity = null;
    showCityEntryPrompt(message);
}

async function applyOtherCityResolution(cityName, { loadDefaultOnNoMatch = true } = {}) {
    const trimmedCity = (cityName || "").trim();
    const matchedCity = fuzzyMatchCity(trimmedCity, availableCities);

    if (matchedCity) {
        setDropdownToCity(matchedCity);
        setOtherCityMode(false);
        currentCity = matchedCity;
        await loadServicesForCity(matchedCity);
        return { matched: true, city: matchedCity };
    }

    setDropdownToCity("Other");
    setOtherCityMode(true, trimmedCity);

    if (loadDefaultOnNoMatch && trimmedCity) {
        currentCity = DEFAULT_CITY;
        await loadServicesFromDefault();
        return { matched: false, city: trimmedCity, usedDefault: true };
    }

    currentCity = null;
    clearTransientBookingUi();
    showCityEntryPrompt();
    return { matched: false, city: trimmedCity, usedDefault: false };
}

function findNearestPartnerInRange(coords, partners = allPartners) {
    let nearestPartner = null;
    let shortestDistance = Infinity;

    for (const partner of partners) {
        if (!isWithinRange(coords.lat, coords.lng, partner)) continue;

        const distance = getDistanceKm(coords.lat, coords.lng, Number(partner.office_lat), Number(partner.office_lng));
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestPartner = partner;
        }
    }

    return nearestPartner;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getCityPartners(city) {
    if (!city || city === "Other") return [];
    return getPartnersForCity(city);
}

function extractCityFromAddressComponents(addressComponents = []) {
    const priorityTypes = [
        "locality",
        "postal_town",
        "administrative_area_level_2",
        "administrative_area_level_1"
    ];

    for (const type of priorityTypes) {
        const component = addressComponents.find(item => item.types?.includes(type));
        if (component) {
            return component.long_name;
        }
    }

    return "";
}

async function waitForGoogleMapsReady(timeoutMs = 4000) {
    if (googleMapsReady && window.google?.maps) return true;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (googleMapsReady && window.google?.maps) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
}

async function getBrowserLocationPermissionState() {
    if (!navigator.permissions?.query) return "prompt";

    try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        return result.state || "prompt";
    } catch (error) {
        return "prompt";
    }
}

async function showLocationPermissionPopup() {
    const popup = document.getElementById("locationPopup");
    const allowBtn = document.getElementById("allowLocationBtn");
    const mapBtn = document.getElementById("pickOnMapBtn");
    const denyBtn = document.getElementById("denyLocationBtn");
    const rememberCheck = document.getElementById("rememberLocationChoice");
    const permissionState = await getBrowserLocationPermissionState();

    const savedPref = localStorage.getItem("locationPref");
    if (savedPref === "allowed" && permissionState === "granted") {
        return Promise.resolve("location");
    }
    if (savedPref === "manual" || savedPref === "denied") {
        return Promise.resolve("manual");
    }
    if (savedPref === "map") {
        return Promise.resolve("map");
    }

    return new Promise((resolve) => {
        const persistChoice = (choice) => {
            if (!rememberCheck?.checked) {
                localStorage.removeItem("locationPref");
                return;
            }

            if (choice === "location") {
                localStorage.setItem("locationPref", "allowed");
                return;
            }

            localStorage.setItem("locationPref", choice);
        };

        const cleanup = () => {
            popup.classList.remove("show");
            allowBtn.onclick = null;
            mapBtn.onclick = null;
            denyBtn.onclick = null;
        };

        allowBtn.onclick = () => {
            persistChoice("location");
            cleanup();
            resolve("location");
        };

        mapBtn.onclick = () => {
            persistChoice("map");
            cleanup();
            resolve("map");
        };

        denyBtn.onclick = () => {
            persistChoice("manual");
            cleanup();
            resolve("manual");
        };

        popup.classList.add("show");
    });
}

async function resolveInitialLocationFlow() {
    const locationAction = await showLocationPermissionPopup();

    if (locationAction === "manual") {
        prepareOtherCitySelection();
        return;
    }

    if (locationAction === "map") {
        prepareOtherCitySelection();
        const mapReady = await waitForGoogleMapsReady();
        if (mapReady) {
            openMapPopup();
            return;
        }
        showToast("Map is still loading. Please try again in a moment.");
        return;
    }

    if (locationAction !== "location") {
        prepareOtherCitySelection();
        return;
    }

    userLocation = await getUserLocation();
    const detectedCity = detectCity(userLocation);

    if (detectedCity && availableCities.includes(detectedCity)) {
        setDropdownToCity(detectedCity);
        setOtherCityMode(false);
        await loadServicesForCity(detectedCity);
        return;
    }

    if (!userLocation) {
        prepareOtherCitySelection();
        return;
    }

    await waitForGoogleMapsReady();
    const addressData = await reverseGeocodeLocation(userLocation.lat, userLocation.lng);
    if (addressData.cityName) {
        await applyOtherCityResolution(addressData.cityName, { loadDefaultOnNoMatch: true });
        return;
    }

    prepareOtherCitySelection();
}

function detectCity(location) {
    if (!location) return null;
    const partner = findNearestPartnerInRange(location);
    return partner?.city || null;
}

async function loadServicesFromDefault() {
    try {
        currentCity = DEFAULT_CITY;
        console.log("Loading default services for:", currentCity);
        
        const container = document.getElementById("servicesList");
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <i class="fas fa-clock"></i>
                    Loading services...
                </div>
            </div>
        `;
        
        const activeServices = await fetchServices(DEFAULT_CITY);
        console.log("Default services received:", activeServices.length);
        renderServices(activeServices);
        
        const slotsSection = document.getElementById("slotsSection");
        if (slotsSection) slotsSection.style.display = 'none';
        
        document.getElementById("slotsContainer").innerHTML = '';
        window.__slotData = null;
    } catch (error) {
        console.error("Error loading default services:", error);
        document.getElementById("servicesList").innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading services. Please try again.</p>
                <button onclick="loadServicesFromDefault()" class="retry-btn">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

async function fetchServices(city) {
    if (!city) return [];
    try {
        const requestedCity = city === "Other"
            ? (currentCity || "Rampur")
            : (city.startsWith("Other,") ? city.split(",")[1] : city);
        const actualCity = resolveKnownCityName(requestedCity) || requestedCity;
        console.log("Fetching services for:", actualCity, "currentCity:", currentCity);
            
        const resPartners = await fetch(`${BASE_URL}/kwikkwash/partners/city/${encodeURIComponent(actualCity)}`);
        let partners = [];

        if (!resPartners.ok) {
            console.warn("Partners API failed, trying cached partner data");
            partners = getPartnersForCity(actualCity);
        } else {
            partners = await resPartners.json();
        }

        if (!Array.isArray(partners) || partners.length === 0) {
            partners = getPartnersForCity(actualCity);
        }

        if (!Array.isArray(partners) || partners.length === 0) {
            if (actualCity !== DEFAULT_CITY) {
                console.warn("No partners found, retrying with default city");
                return fetchServices(DEFAULT_CITY);
            }
            return [];
        }

        let servicesMap = {};

        for (let p of partners) {
            const res = await fetch(`${BASE_URL}/kwikkwash/partner-services?partner_code=${p.partner_code}`);
            if (!res.ok) continue;

            const services = await res.json();
            for (let s of services) {
                if (s.active === 1) {
                    servicesMap[s.service_code] = {
                        price: s.price,
                        units: s.units,
                        short_details: s.short_details,
                        long_details: s.long_details
                    };
                }
            }
        }

        const services = Object.entries(servicesMap).map(([code, data]) => ({
            service_code: code,
            price: data.price,
            units: data.units,
            short_details: data.short_details,
            long_details: data.long_details
        }));

        if (services.length === 0) {
            if (actualCity !== DEFAULT_CITY) {
                console.warn("No services found, retrying with default city");
                return fetchServices(DEFAULT_CITY);
            }
            return [];
        }

        return services;
    } catch (error) {
        console.error("Error fetching services:", error);
        const requestedCity = city === "Other"
            ? (currentCity || "Rampur")
            : (city.startsWith("Other,") ? city.split(",")[1] : city);
        const actualCity = resolveKnownCityName(requestedCity) || requestedCity;
        if (actualCity !== DEFAULT_CITY) {
            return fetchServices(DEFAULT_CITY);
        }
        return [];
    }
}

function renderServices(services) {
    const container = document.getElementById("servicesList");
    container.innerHTML = "";
    selectedServices = [];

    if (services.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tools"></i>
                <p>No services available in this city</p>
                <p class="hint">Try selecting another city</p>
            </div>
        `;
        return;
    }

    services.forEach(service => {
        const div = document.createElement("div");
        div.className = `service-card`;
        div.setAttribute('data-code', service.service_code);
        
        const timeInHours = service.units ? (service.units * 10 / 60).toFixed(1) : 0;

        // Escape long_details for data attribute
        const escapedLongDetails = service.long_details 
            ? service.long_details
                .replace(/"/g, '&quot;')
                .replace(/\n/g, '<br>')
            : '';

        div.innerHTML = `
            <div class="service-card-inner">
                <div class="service-card-front">
                    <div class="service-header">
                        <div class="service-icon">${getIcon(service.service_code)}</div>
                        <div class="service-checkbox"></div>
                    </div>
                    
                    <div>
                        <div class="service-name">${service.service_code.replace(/_/g, ' ')}</div>
                        <div class="service-price">₹${service.price}</div>
                        
                        ${service.units ? `
                            <div class="service-duration">
                                <i class="far fa-clock"></i>
                                ${timeInHours} hrs approx
                            </div>
                        ` : ''}
                    </div>
                    
                    <input type="checkbox" 
                        class="service-checkbox-input" 
                        data-code="${service.service_code}" 
                        data-price="${service.price}"
                        data-units="${service.units || ''}"
                        style="display: none;">
                </div>
                
                <div class="service-card-back">
                    <div class="service-back-content">
                        <div class="service-back-title">${service.service_code.replace(/_/g, ' ')}</div>
                        <div class="service-back-text">
                            ${service.short_details || 'Premium quality service'}
                        </div>
                    </div>
                </div>
            </div>
            
            ${service.long_details ? `
                <button class="info-btn" 
                 data-title="${service.service_code}"
                 data-content="${escapedLongDetails}">
                    <i class="fa-solid fa-circle-info"></i>
                 </button>
            ` : ''}
        `;

        container.appendChild(div);
    });

    // Add click handlers to service cards
    document.querySelectorAll('.service-card').forEach(card => {
        const checkbox = card.querySelector('.service-checkbox-input');
        const checkDiv = card.querySelector('.service-checkbox');
        
        // Checkbox click handler
        if (checkDiv) {
            checkDiv.onclick = (e) => {
                e.stopPropagation();
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('selected', checkbox.checked);
                    
                    // Strong vibration pattern on select
                    if (checkbox.checked && window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate([120, 40, 120]);
                    }
                    
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };
        }
        
        // Single click - flip (only if not selected)
        card.addEventListener('click', function(e) {
            if (e.target.closest('.info-btn') || e.target.closest('.service-checkbox')) return;
            if (!this.classList.contains('selected')) {
                this.classList.toggle('flipped');
            }
        });

        // Double click - select
        card.addEventListener('dblclick', function () {
            const checkbox = this.querySelector('.service-checkbox-input');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                this.classList.toggle('selected', checkbox.checked);

                if (navigator.vibrate) navigator.vibrate([120, 40, 120]);

                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    document.querySelectorAll(".service-checkbox-input").forEach(cb => {
        cb.addEventListener("change", handleServiceSelection);
    });

    updateServiceCount();
}

function handleServiceSelection(e) {
    const code = e.target.dataset.code;
    const price = parseFloat(e.target.dataset.price);
    const units = e.target.dataset.units;

    if (e.target.checked) {
        selectedServices.push({ 
            code, 
            price,
            units: units ? parseInt(units) : null
        });
        
        document.querySelector(`.service-card[data-code="${code}"]`)?.classList.add('selected');
    } else {
        selectedServices = selectedServices.filter(s => s.code !== code);
        document.querySelector(`.service-card[data-code="${code}"]`)?.classList.remove('selected');
    }

    updateTotal();
    updateServiceCount();
    
    if (selectedServices.length > 0) {
        const cityValue = document.getElementById("cityDropdown").value;
        const cityToUse = cityValue === "Other" ? (currentCity || "Rampur") : cityValue;
        
        loadSlotsForCity(cityToUse);
        
        const slotsSection = document.getElementById("slotsSection");
        if (slotsSection) slotsSection.style.display = 'block';
    } else {
        document.getElementById("slotsContainer").innerHTML = '';
        const slotsSection = document.getElementById("slotsSection");
        if (slotsSection) slotsSection.style.display = 'none';
        window.__slotData = null;
    }
    
    // Auto scroll to slots after service selection
    setTimeout(() => {
        document.getElementById("slotsSection")?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }, 400);
}

function updateServiceCount() {
    const countEl = document.getElementById("service-count");
    if (countEl) {
        countEl.textContent = `${selectedServices.length} selected`;
    }
}

function updateTotal() {
    const subtotal = selectedServices.reduce((s, i) => s + i.price, 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    document.getElementById("subtotal").innerText = subtotal.toFixed(2);
    document.getElementById("gst").innerText = gst.toFixed(2);
    document.getElementById("total").innerText = total.toFixed(2);
}

function clearSelectedServices() {
    selectedServices = [];
    document.querySelectorAll(".service-checkbox-input").forEach(cb => {
        cb.checked = false;
    });
    document.querySelectorAll(".service-card").forEach(card => {
        card.classList.remove("selected");
    });
    updateTotal();
    updateServiceCount();
}

async function loadServicesForCity(city) {
    currentCity = city;
    const container = document.getElementById("servicesList");
    container.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">
                <i class="fas fa-clock"></i>
                Loading premium services...
            </div>
        </div>
    `;
    
    const services = await fetchServices(city);
    renderServices(services);
    
    document.getElementById("slotsContainer").innerHTML = '';
    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = 'none';
    
    document.getElementById("userFormContainer").style.display = 'none';
    window.__slotData = null;
}

async function loadSlotsForCity(city) {
    if (!city || selectedServices.length === 0) return;
    
    const slotsContainer = document.getElementById("slotsContainer");
    
    slotsContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">
                <i class="fas fa-clock"></i>
                Finding available slots...
            </div>
        </div>
    `;
    
    try {
        const actualCity = city === "Other"
            ? (currentCity || "Rampur")
            : (city.startsWith("Other,") ? city.split(",")[1] : city);
        
        const res = await fetch(`${BASE_URL}/kwikkwash/slots?city=${encodeURIComponent(actualCity)}`);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const slotData = await res.json();
        
        if (!slotData || (!slotData.today?.length && !slotData.tomorrow?.length)) {
            slotsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No slots available for this city</p>
                    <p class="hint">Please try another date or contact support</p>
                </div>
            `;
            return;
        }

        window.__slotData = slotData;
        renderSlots(slotData);
        const slotsSection = document.getElementById("slotsSection");
        if (slotsSection) slotsSection.style.display = 'block';

    } catch (error) {
        console.error("Error loading slots:", error);
        slotsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load slots. Please try again.</p>
                <button onclick="loadSlotsForCity('${city}')" class="retry-btn">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderSlots(slotData) {
    const container = document.getElementById("slotsContainer");
    
    const sortSlots = (slots) => slots.sort((a, b) => (a.slot_order ?? 999) - (b.slot_order ?? 999));

    const todaySlots = sortSlots(slotData.today || []);
    const tomorrowSlots = sortSlots(slotData.tomorrow || []);
    
    // Filter available slots for count
    const availableTodayCount = todaySlots.filter(slot => {
        const isFull = (slot.fill_percent ?? 0) >= 100 || 
                      slot.status?.toLowerCase() === 'full' || 
                      slot.manual_hold === 1;
        return !isFull;
    }).length;
    
    const availableTomorrowCount = tomorrowSlots.filter(slot => {
        const isFull = (slot.fill_percent ?? 0) >= 100 || 
                      slot.status?.toLowerCase() === 'full' || 
                      slot.manual_hold === 1;
        return !isFull;
    }).length;

    let html = `
        <div class="slot-tabs">
            <button class="tab-btn active" data-tab="today">
                Today
                <span class="slot-count">${availableTodayCount}</span>
            </button>
            <button class="tab-btn" data-tab="tomorrow">
                Tomorrow
                <span class="slot-count">${availableTomorrowCount}</span>
            </button>
        </div>
        
        <div id="todaySlots" class="slots-panel" style="display: block;">
            <div class="slots-grid">
                ${renderSlotCards(todaySlots, 'today')}
            </div>
        </div>
        
        <div id="tomorrowSlots" class="slots-panel" style="display: none;">
            <div class="slots-grid">
                ${renderSlotCards(tomorrowSlots, 'tomorrow')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const tab = this.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            document.querySelectorAll('.slots-panel').forEach(panel => {
                panel.style.display = 'none';
            });
            document.getElementById(`${tab}Slots`).style.display = 'block';
        });
    });
}

function renderSlotCards(slots, dayType) {
    if (slots.length === 0) {
        return '<div class="empty-state" style="grid-column: 1/-1;"><p>No slots available</p></div>';
    }

    return slots.map(slot => {
        const isFull = (slot.fill_percent ?? 0) >= 100 || 
                      slot.status?.toLowerCase() === 'full' || 
                      slot.manual_hold === 1;
        const fillPercentage = slot.fill_percent || 0;
        
        return `
            <div class="slot-card ${isFull ? 'unavailable' : 'available'}" 
                data-slot-id="${slot.id}"
                data-slot-start="${formatTime(slot.start_time)}"
                data-slot-end="${formatTime(slot.end_time)}"
                data-day="${dayType}"
                data-disabled="${isFull ? 'true' : 'false'}"
                onclick="selectSlot(this)">
                
                <div class="slot-check">✓</div>
                <div class="slot-label">Arrival Window</div>
                <div class="slot-time">${formatTime(slot.start_time)}</div>
                <div class="slot-to-text">to</div>
                <div class="slot-range">${formatTime(slot.end_time)}</div>
                
                <div class="slot-fill">
                    <div class="slot-fill-bar" style="width: ${fillPercentage}%;"></div>
                </div>
                
                <div class="slot-status-badge">
                    ${isFull ? 'Full' : 'Available'}
                </div>
            </div>
        `;
    }).join('');
}

function selectSlot(element) {
    // Show popup for full slots instead of toast
    if (element.dataset.disabled === "true") {
        showSlotFullPopup();
        return;
    }
    
    document.querySelectorAll('.slot-card').forEach(card => {
        if (card.dataset.disabled !== "true") {
            card.classList.remove('selected');
        }
    });
    
    element.classList.add('selected');
    
    // Strong vibration pattern on select
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([120, 40, 120]);
    }
    
    window.__selectedSlot = {
        id: element.dataset.slotId,
        start_time: element.dataset.slotStart,
        end_time: element.dataset.slotEnd,
        slot_name: `${element.dataset.slotStart} - ${element.dataset.slotEnd}`,
        day: element.dataset.day
    };
    
    // Show toast message
    showToast(`Our team will arrive between ${element.dataset.slotStart} - ${element.dataset.slotEnd}`);
    
    // Auto-form when slot selected and services exist
    if (selectedServices.length > 0) {
        setTimeout(() => {
            showUserFormOnPage();
        }, 400);
    }
}

function handleNextClick() {
    const cityValue = document.getElementById("cityDropdown").value;
    const otherCity = document.getElementById("otherCityInput").value.trim();

    if (cityValue === "Other") {
        if (!otherCity) {
            alert("Please enter your city name");
            return;
        }
        
        if (selectedServices.length === 0) {
            alert("Please select at least one service");
            return;
        }

        window.__selectedSlot = { id: null, slot_name: "No Slot", day: "other" };
        showUserFormOnPage();
        return;
    }

    if (selectedServices.length === 0) {
        alert("Please select at least one service");
        return;
    }

    if (!window.__selectedSlot) {
        alert("Please select a time slot");
        return;
    }

    showUserFormOnPage();
}

function showUserFormOnPage() {
    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = 'none';
    
    const container = document.getElementById("userFormContainer");
    const dropdown = document.getElementById("cityDropdown");
    const otherInput = document.getElementById("otherCityInput");
    let city = dropdown.value === "Other" ? otherInput.value.trim() : dropdown.value;

    container.innerHTML = `
        <div class="booking-form">
            <div class="edit-slot-bar" onclick="editSlot()">
                <i class="fas fa-arrow-left"></i>
                <span>Edit Slot</span>
            </div>
            
            <h3 style="color: #F6C84C; margin-bottom: 1.5rem;">
                <i class="fas fa-user"></i> Your Details
            </h3>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-mobile-alt"></i> Mobile Number
                </label>
                <input type="tel" id="userPhone" maxlength="10" 
                       class="form-input" placeholder="Enter 10-digit mobile number">
            </div>

            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-map-marker-alt"></i> Complete Address
                </label>
                <textarea id="userAddress" rows="3" 
                          class="form-input" placeholder="Enter your complete address">${city}, </textarea>
                <button id="mapSelectBtn" type="button" class="map-select-btn">
                    <i class="fas fa-map-marker-alt"></i> 📍 Set on Map (Optional)
                </button>
            </div>

            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-pen"></i> Instructions (Optional)
                </label>
                <textarea id="userInstructions" rows="2" 
                          class="form-input" placeholder="Any specific instructions for our team"></textarea>
            </div>

            <div class="captcha-container">
                <label class="form-label">
                    <i class="fas fa-shield-alt"></i> Verification Code
                </label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <div class="captcha-display" id="captchaText"></div>
                    <button class="refresh-btn" onclick="generateCaptcha()" type="button">
                        <i class="fas fa-redo"></i>
                    </button>
                </div>
                <input type="text" id="captchaInput" class="form-input" 
                       placeholder="Enter the code above" style="margin-top: 10px;">
            </div>

            <button class="next-btn" id="confirmBookingBtn" style="width: 100%;">
                <i class="fas fa-check-circle"></i> Review Booking
            </button>
        </div>
    `;

    container.style.display = 'block';
    
    setTimeout(() => {
        container.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
        });
    }, 300);
    
    generateCaptcha();
    
    // Attach map button handler
    document.getElementById("mapSelectBtn").onclick = openMapPopup;
    document.getElementById("confirmBookingBtn").onclick = showBookingConfirmPopup;
}

function editSlot() {
    hideUserForm();
    
    setTimeout(() => {
        const slotsSection = document.getElementById("slotsSection");
        slotsSection.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
        });
        
        // Restore selected slot highlight
        if (window.__selectedSlot) {
            document.querySelectorAll('.slot-card').forEach(card => {
                if (card.dataset.slotId === window.__selectedSlot.id) {
                    card.classList.add('selected');
                }
            });
        }
    }, 300);
}

function hideUserForm() {
    document.getElementById("userFormContainer").style.display = 'none';
    document.getElementById("userFormContainer").innerHTML = '';
    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = 'block';
}

async function reverseGeocodeLocation(lat, lng) {
    if (!window.google?.maps) {
        return {
            formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            cityName: ""
        };
    }

    if (!geocoder) {
        geocoder = new google.maps.Geocoder();
    }

    try {
        const response = await geocoder.geocode({
            location: { lat, lng }
        });
        const result = response.results?.[0];

        return {
            formattedAddress: result?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            cityName: extractCityFromAddressComponents(result?.address_components || [])
        };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return {
            formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            cityName: ""
        };
    }
}

async function geocodeCityName(cityName) {
    const query = (cityName || "").trim();
    if (!query || !window.google?.maps) return null;

    if (!geocoder) {
        geocoder = new google.maps.Geocoder();
    }

    try {
        const response = await geocoder.geocode({ address: query });
        const location = response.results?.[0]?.geometry?.location;
        if (!location) return null;

        return {
            lat: location.lat(),
            lng: location.lng()
        };
    } catch (error) {
        console.error("City geocoding error:", error);
        return null;
    }
}

function getSelectedCityCoordinates() {
    const dropdown = document.getElementById("cityDropdown");
    const selectedValue = dropdown?.value;
    if (!selectedValue || selectedValue === "Other") return null;

    const partner = getPartnersForCity(selectedValue).find(item => item.office_lat && item.office_lng);
    if (!partner) return null;

    return {
        lat: Number(partner.office_lat),
        lng: Number(partner.office_lng)
    };
}

async function getPreferredMapCenter() {
    if (selectedMapLat && selectedMapLng) {
        return {
            lat: selectedMapLat,
            lng: selectedMapLng
        };
    }

    const selectedCityCoords = getSelectedCityCoordinates();
    if (selectedCityCoords) return selectedCityCoords;

    const otherInputValue = document.getElementById("otherCityInput")?.value.trim();
    if (otherInputValue) {
        const typedCityCoords = await geocodeCityName(otherInputValue);
        if (typedCityCoords) return typedCityCoords;
    }

    if (userLocation?.lat && userLocation?.lng) {
        return userLocation;
    }

    return getDefaultCoordinates() || { lat: 28.6139, lng: 77.209 };
}

function updateCurrentMapCenter() {
    if (!map) return;

    const center = map.getCenter();
    currentMapCenter = {
        lat: center.lat(),
        lng: center.lng()
    };
    selectedMapLat = currentMapCenter.lat;
    selectedMapLng = currentMapCenter.lng;
}

function centerMapOn(coords, zoom = 16) {
    if (!map || !coords) return;

    map.setCenter(coords);
    map.setZoom(zoom);
    currentMapCenter = { ...coords };
    selectedMapLat = coords.lat;
    selectedMapLng = coords.lng;
}

function setActiveMapTypeButton(type) {
    document.querySelectorAll(".map-type-btn").forEach(button => {
        button.classList.toggle("active", button.dataset.mapType === type);
    });
}

function setActiveMapThemeButton(theme) {
    const button = document.getElementById("mapThemeToggle");
    if (!button) return;

    button.classList.add("active");
    button.dataset.mapTheme = theme;
    button.innerHTML = theme === "dark"
        ? '<i class="fas fa-moon"></i> Dark'
        : '<i class="fas fa-sun"></i> Light';
}

function toggleMapTheme(theme) {
    if (!map) return;
    map.setOptions({
        styles: theme === "dark" ? darkStyle : lightStyle
    });
    setActiveMapThemeButton(theme);
}

function setMapType(type) {
    if (!map) return;

    if (type === "satellite") {
        map.setMapTypeId("hybrid");
        setActiveMapTypeButton("satellite");
        return;
    }

    if (type === "terrain") {
        map.setMapTypeId("terrain");
        setActiveMapTypeButton("terrain");
        return;
    }

    map.setMapTypeId("roadmap");
    setActiveMapTypeButton("roadmap");
}

function bindMapUiControls() {
    if (mapControlsBound) return;

    document.getElementById("mapZoomIn")?.addEventListener("click", () => {
        if (map) {
            map.setZoom((map.getZoom() || 16) + 1);
        }
    });

    document.getElementById("mapZoomOut")?.addEventListener("click", () => {
        if (map) {
            map.setZoom((map.getZoom() || 16) - 1);
        }
    });

    document.getElementById("mapCurrentLocation")?.addEventListener("click", async () => {
        const liveLocation = await getUserLocation();
        const fallbackLocation = liveLocation || userLocation || getDefaultCoordinates();

        if (!fallbackLocation) {
            showToast("Current location is not available");
            return;
        }

        resetMapPinVisualState();
        userLocation = liveLocation || userLocation || fallbackLocation;
        centerMapOn({
            lat: fallbackLocation.lat,
            lng: fallbackLocation.lng
        });
        playMapPinWaveOnly({ vibratePattern: [8, 10, 16] });
    });

    document.querySelectorAll(".map-type-btn").forEach(button => {
        button.addEventListener("click", () => {
            setMapType(button.dataset.mapType);
        });
    });

    document.getElementById("mapThemeToggle")?.addEventListener("click", () => {
        const button = document.getElementById("mapThemeToggle");
        const nextTheme = button?.dataset.mapTheme === "dark" ? "light" : "dark";
        toggleMapTheme(nextTheme);
    });

    document.getElementById("mapFooterToggle")?.addEventListener("click", () => {
        const tools = document.getElementById("mapFooterTools");
        if (!tools) return;

        const shouldCollapse = !tools.classList.contains("collapsed");
        setMapFooterCollapsed(shouldCollapse);

        mapFooterAutoCollapseLocked = true;
        clearTimeout(mapFooterCollapseTimer);
    });

    document.querySelector(".map-popup-footer")?.addEventListener("click", (event) => {
        const tools = document.getElementById("mapFooterTools");
        if (!tools || !tools.classList.contains("collapsed")) return;

        if (event.target.closest("#mapFooterToggle")) return;
        if (event.target.closest("#confirmMapLocation")) return;

        setMapFooterCollapsed(false);
        mapFooterAutoCollapseLocked = true;
        clearTimeout(mapFooterCollapseTimer);
    });

    mapControlsBound = true;
}

function initPinMotion() {
    const root = document.getElementById("pinFx");
    const arrow = document.getElementById("pinArrowGroup");
    const mainRipple = document.getElementById("pinRippleMain");
    const outerRipple = document.getElementById("pinRippleOuter");
    const thirdRipple = document.getElementById("pinRippleThird");
    const shadow = document.getElementById("pinShadowEllipse");
    const cssPin = document.getElementById("cssPin");

    if (!root || !arrow || !mainRipple || !outerRipple || !thirdRipple || !shadow || !cssPin) return;

    pinMotionState = { root, arrow, mainRipple, outerRipple, thirdRipple, shadow, cssPin };
}

function resetMapPinVisualState() {
    const pin = document.getElementById("cssPin");
    if (!pin) return;

    pin.classList.remove("drag-active", "drop-flip");
    pin.style.opacity = "1";
    void pin.offsetWidth;
}

function playMapPinWaveOnly({ vibratePattern = null, keepPinMotion = false } = {}) {
    if (!pinMotionState) initPinMotion();
    if (!pinMotionState) return Promise.resolve();

    if (!keepPinMotion) {
        resetMapPinVisualState();
    }

    const { root, arrow, mainRipple, outerRipple, thirdRipple, shadow, cssPin } = pinMotionState;
    const animatedNodes = [root, arrow, mainRipple, outerRipple, thirdRipple, shadow];
    animatedNodes.forEach(node => node.getAnimations().forEach(animation => animation.cancel()));

    root.style.opacity = "1";
    cssPin.style.opacity = "1";
    arrow.style.opacity = "0";
    mainRipple.style.opacity = "0";
    outerRipple.style.opacity = "0";
    thirdRipple.style.opacity = "0";
    shadow.style.opacity = "0";

    shadow.animate(
        [
            { transform: "scale(0.72)", opacity: 0.14 },
            { transform: "scale(1.28)", opacity: 0.34, offset: 0.28 },
            { transform: "scale(1)", opacity: 0.18 }
        ],
        { duration: 560, fill: "forwards" }
    );

    mainRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.95, offset: 0.14 },
            { transform: "scale(5.2)", opacity: 0 }
        ],
        { duration: 700, delay: 0, fill: "forwards" }
    );

    outerRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.76, offset: 0.14 },
            { transform: "scale(4.15)", opacity: 0 }
        ],
        { duration: 620, delay: 120, fill: "forwards" }
    );

    thirdRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.58, offset: 0.14 },
            { transform: "scale(3.2)", opacity: 0 }
        ],
        { duration: 560, delay: 230, fill: "forwards" }
    );

    if (navigator.vibrate && Array.isArray(vibratePattern)) {
        navigator.vibrate(vibratePattern);
    }

    return new Promise(resolve => {
        setTimeout(() => {
            root.style.opacity = "0";
            resolve();
        }, 860);
    });
}

function playSharpPinDrop() {
    if (!pinMotionState) initPinMotion();
    if (!pinMotionState) return Promise.resolve();

    const { root, arrow, mainRipple, outerRipple, thirdRipple, shadow, cssPin } = pinMotionState;
    const animatedNodes = [root, arrow, mainRipple, outerRipple, thirdRipple, shadow];
    animatedNodes.forEach(node => node.getAnimations().forEach(animation => animation.cancel()));

    root.style.opacity = "1";
    cssPin.style.opacity = "0";
    arrow.style.opacity = "1";
    mainRipple.style.opacity = "0";
    outerRipple.style.opacity = "0";
    thirdRipple.style.opacity = "0";
    shadow.style.opacity = "0";

    arrow.animate(
        [
            { transform: "translateY(-54px) scale(0.68)", offset: 0, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
            { transform: "translateY(10px) scale(1.16)", offset: 0.42, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
            { transform: "translateY(-12px) scale(0.92)", offset: 0.62 },
            { transform: "translateY(4px) scale(1.04)", offset: 0.78 },
            { transform: "translateY(0) scale(1)", offset: 1 }
        ],
        { duration: 620, fill: "forwards" }
    );

    shadow.animate(
        [
            { transform: "scale(0.32)", opacity: 0.08 },
            { transform: "scale(1.9)", opacity: 0.68, offset: 0.46 },
            { transform: "scale(1)", opacity: 0.4 }
        ],
        { duration: 580, fill: "forwards" }
    );

    mainRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.95, offset: 0.14 },
            { transform: "scale(5.6)", opacity: 0 }
        ],
        { duration: 720, delay: 70, fill: "forwards" }
    );

    outerRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.8, offset: 0.14 },
            { transform: "scale(4.4)", opacity: 0 }
        ],
        { duration: 640, delay: 190, fill: "forwards" }
    );

    thirdRipple.animate(
        [
            { transform: "scale(0.82)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.62, offset: 0.14 },
            { transform: "scale(3.35)", opacity: 0 }
        ],
        { duration: 580, delay: 310, fill: "forwards" }
    );

    if (navigator.vibrate) {
        navigator.vibrate([24, 12, 72, 16, 34]);
    }

    return new Promise(resolve => {
        setTimeout(() => {
            cssPin.style.opacity = "1";
            root.style.opacity = "0";
            resolve();
        }, 920);
    });
}

function setMapPinDragging(isDragging) {
    const pin = document.getElementById("cssPin");
    if (!pin) return;

    pin.classList.remove("drop-flip");
    pin.classList.toggle("drag-active", isDragging);
}

function playMapPinDropFlip() {
    const pin = document.getElementById("cssPin");
    if (!pin) return;

    pin.classList.remove("drag-active");
    pin.classList.remove("drop-flip");
    void pin.offsetWidth;
    pin.classList.add("drop-flip");

    if (navigator.vibrate) {
        navigator.vibrate([10, 8, 18]);
    }

    playMapPinWaveOnly({ keepPinMotion: true });
    setTimeout(() => pin.classList.remove("drop-flip"), 1420);
}

function setMapFooterCollapsed(collapsed) {
    const tools = document.getElementById("mapFooterTools");
    const toggle = document.getElementById("mapFooterToggle");
    if (!tools || !toggle) return;

    tools.classList.toggle("collapsed", collapsed);
    toggle.classList.toggle("collapsed", collapsed);
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}

function scheduleMapFooterAutoCollapse() {
    if (mapFooterAutoCollapseLocked) return;
    clearTimeout(mapFooterCollapseTimer);
    mapFooterCollapseTimer = setTimeout(() => {
        const tools = document.getElementById("mapFooterTools");
        const toggle = document.getElementById("mapFooterToggle");
        const activeEl = document.activeElement;
        if ((tools && tools.contains(activeEl)) || toggle === activeEl) {
            scheduleMapFooterAutoCollapse();
            return;
        }
        setMapFooterCollapsed(true);
    }, 3000);
}

function scheduleMapSearch(query, delayMs = 1000) {
    clearTimeout(mapSearchTimer);
    const trimmedQuery = (query || "").trim();

    if (!trimmedQuery || trimmedQuery.length < 3) return;

    mapSearchTimer = setTimeout(async () => {
        if (!window.google?.maps) return;
        if (!document.getElementById("mapPopup")?.classList.contains("show")) return;

        if (trimmedQuery === mapSearchLastQuery) return;
        mapSearchLastQuery = trimmedQuery;

        if (!geocoder) {
            geocoder = new google.maps.Geocoder();
        }

        try {
            const response = await geocoder.geocode({ address: trimmedQuery });
            const location = response.results?.[0]?.geometry?.location;
            if (!location) return;

            centerMapOn({
                lat: location.lat(),
                lng: location.lng()
            });
        } catch (error) {
            console.error("Auto search geocode error:", error);
        }
    }, delayMs);
}

function ensureMapInitialized() {
    if (!googleMapsReady || !window.google?.maps) return false;

    const defaultCoords = userLocation || getDefaultCoordinates() || { lat: 28.6139, lng: 77.209 };

    if (!map) {
        map = new google.maps.Map(document.getElementById("mapContainer"), {
            center: defaultCoords,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: false,
            gestureHandling: "greedy",
            keyboardShortcuts: false,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false,
            styles: darkStyle
        });

        initPinMotion();
        map.setOptions({
            draggable: true,
            gestureHandling: "greedy"
        });

        geocoder = new google.maps.Geocoder();
        map.addListener("dragstart", () => {
            setMapPinDragging(true);
        });

        map.addListener("drag", () => {
            updateCurrentMapCenter();
        });

        map.addListener("center_changed", () => {
            updateCurrentMapCenter();
        });

        map.addListener("dragend", () => {
            playMapPinDropFlip();
            updateCurrentMapCenter();
        });

        const searchInput = document.getElementById("mapSearch");
        mapSearchBox = new google.maps.places.SearchBox(searchInput);
        searchInput.setAttribute("autocomplete", "off");
        if (!searchInput.dataset.autoSearchBound) {
            searchInput.addEventListener("input", () => {
                scheduleMapSearch(searchInput.value, 1000);
            });
            searchInput.dataset.autoSearchBound = "true";
        }
        map.addListener("bounds_changed", () => {
            mapSearchBox.setBounds(map.getBounds());
        });

        mapSearchBox.addListener("places_changed", () => {
            const places = mapSearchBox.getPlaces();
            const place = places?.[0];
            const location = place?.geometry?.location;

            if (!location) return;

            centerMapOn({
                lat: location.lat(),
                lng: location.lng()
            });
        });

        bindMapUiControls();
        setMapType("roadmap");
        toggleMapTheme("dark");
    } else {
        google.maps.event.trigger(map, "resize");
    }

    return true;
}

function initMap() {
    window.googleMapsReady = true;
    googleMapsReady = true;
    if (document.getElementById("mapPopup")?.classList.contains("show")) {
        ensureMapInitialized();
    }
}

async function openMapPopup() {
    const popup = document.getElementById("mapPopup");
    popup.classList.add("show");

    setMapFooterCollapsed(false);
    mapFooterAutoCollapseLocked = false;
    scheduleMapFooterAutoCollapse();

    const pin = document.querySelector(".map-center-pin");
    if (pin) {
        pin.classList.remove("drop-animation");
        pin.classList.add("pick-animation");
        setTimeout(() => pin.classList.remove("pick-animation"), 300);
    }

    if (!ensureMapInitialized()) {
        popup.classList.remove("show");
        showToast("Map is still loading. Please wait a moment.");
        return;
    }

    const preferredCoords = await getPreferredMapCenter();

    setTimeout(() => {
        centerMapOn(preferredCoords);
    }, 100);
}

function closeMapPopup() {
    const mapPopup = document.getElementById("mapPopup");
    if (!mapPopup) return;

    clearTimeout(mapFooterCollapseTimer);
    mapPopup.classList.remove("show");
}

function triggerMapPinConfirmFeedback() {
    return playSharpPinDrop();
}

function showRangeConfirmPopup(message) {
    const popup = document.getElementById("rangeConfirmPopup");
    const messageEl = document.getElementById("rangeConfirmMessage");
    const cancelBtn = document.getElementById("rangeCancelBtn");
    const proceedBtn = document.getElementById("rangeProceedBtn");

    messageEl.textContent = message;

    return new Promise((resolve) => {
        const cleanup = (result) => {
            popup.classList.remove("show");
            cancelBtn.onclick = null;
            proceedBtn.onclick = null;
            resolve(result);
        };

        cancelBtn.onclick = () => cleanup(false);
        proceedBtn.onclick = () => cleanup(true);
        popup.classList.add("show");
    });
}

function closeRangeConfirmPopup() {
    const cancelBtn = document.getElementById("rangeCancelBtn");
    if (cancelBtn?.onclick) {
        cancelBtn.onclick();
        return;
    }
    document.getElementById("rangeConfirmPopup").classList.remove("show");
}

async function confirmMapLocation() {
    const liveCenter = map?.getCenter
        ? { lat: map.getCenter().lat(), lng: map.getCenter().lng() }
        : currentMapCenter;

    if (!liveCenter?.lat || !liveCenter?.lng) {
        showToast("Move the map to choose a location");
        return;
    }

    const coords = { ...liveCenter };
    const addressData = await reverseGeocodeLocation(coords.lat, coords.lng);
    const addressField = document.getElementById("userAddress");
    const userPinnedAddress = addressData.formattedAddress;
    const dropdown = document.getElementById("cityDropdown");
    const otherInput = document.getElementById("otherCityInput");
    const isOtherMode = dropdown?.value === "Other";
    const selectedCity = dropdown?.value === "Other" ? (currentCity || DEFAULT_CITY) : dropdown?.value;
    const currentCityPartners = getCityPartners(selectedCity);
    const withinCurrentRange = currentCityPartners.some(partner => isWithinRange(coords.lat, coords.lng, partner));

    if (isOtherMode) {
        await triggerMapPinConfirmFeedback();
        userLocation = coords;
        selectedMapLat = coords.lat;
        selectedMapLng = coords.lng;

        if (addressField) {
            addressField.value = userPinnedAddress;
        }

        if (addressData.cityName) {
            const resolvedCity = fuzzyMatchCity(addressData.cityName, availableCities);
            if (resolvedCity) {
                setDropdownToCity(resolvedCity);
                setOtherCityMode(false);
                await loadServicesForCity(resolvedCity);
            } else {
                await applyFallbackToOther(addressData.cityName);
            }
        } else {
            await applyFallbackToOther("");
        }

        closeMapPopup();
        showToast("Location updated");
        return;
    }

    if (withinCurrentRange) {
        await triggerMapPinConfirmFeedback();
        userLocation = coords;
        selectedMapLat = coords.lat;
        selectedMapLng = coords.lng;

        if (addressField) {
            addressField.value = userPinnedAddress;
        }

        closeMapPopup();
        showToast("Location updated");
        return;
    }

    const confirmed = await showRangeConfirmPopup(
        `This pin is outside ${selectedCity}'s active service zone. If you continue, we may need to refresh your city and selected services before checkout.`
    );

    if (!confirmed) {
        closeMapPopup();
        return;
    }

    clearSelectedServices();

    const partnerMatch = findNearestPartnerInRange(coords);
    if (partnerMatch?.city && availableCities.includes(partnerMatch.city)) {
        setDropdownToCity(partnerMatch.city);
        setOtherCityMode(false);
        await loadServicesForCity(partnerMatch.city);
    } else {
        setDropdownToCity("Other");
        setOtherCityMode(true, addressData.cityName || "");
        await loadServicesFromDefault();
    }

    userLocation = coords;
    selectedMapLat = coords.lat;
    selectedMapLng = coords.lng;

    if (addressField) {
        addressField.value = userPinnedAddress;
    }

    await triggerMapPinConfirmFeedback();
    closeMapPopup();
    showToast("Location updated");
}
function showBookingConfirmPopup() {
    // Strong vibration when popup opens
    if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
    }
    
    // Get all details
    const phone = document.getElementById("userPhone").value.trim();
    const address = document.getElementById("userAddress").value.trim();
    const captchaInput = document.getElementById("captchaInput").value.trim();
    
    // Validate basic info first
    if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast("Please enter a valid 10-digit mobile number");
        return;
    }

    if (!address || address.length < 10) {
        showToast("Please enter your complete address");
        return;
    }

    if (!captchaInput || captchaInput !== window.__captcha) {
        showToast("Invalid verification code");
        generateCaptcha();
        return;
    }
    
    // Calculate total units for service time estimate
    const totalUnits = selectedServices.reduce((sum, s) => sum + (s.units || 0), 0);
    const estimatedHours = totalUnits ? (totalUnits * 10 / 60).toFixed(1) : "1.5";
    
    // Get slot info
    const slotText = window.__selectedSlot ? 
        `${window.__selectedSlot.start_time} - ${window.__selectedSlot.end_time}` : 
        "Flexible Timing";
    
    // Get total amount
    const total = document.getElementById("total").innerText;
    
    // Get service names
    const serviceNames = selectedServices.map(s => s.code.replace(/_/g, ' ')).join(', ');
    
    // Create popup
    const popup = document.getElementById('bookingConfirmPopup');
    popup.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-header">
                <h3><i class="fas fa-clipboard-check"></i> Confirm Booking</h3>
            </div>
            <div class="confirm-body">
                <div class="confirm-detail-row">
                    <span class="confirm-label"><i class="fas fa-tools"></i> Services:</span>
                    <span class="confirm-value">${serviceNames}</span>
                </div>
                <div class="confirm-detail-row">
                    <span class="confirm-label"><i class="fas fa-clock"></i> Arrival Window:</span>
                    <span class="confirm-value">${slotText}</span>
                </div>
                <div class="confirm-detail-row">
                    <span class="confirm-label"><i class="fas fa-hourglass-half"></i> Est. Service Time:</span>
                    <span class="confirm-value">~${estimatedHours} hours</span>
                </div>
                <div class="confirm-detail-row">
                    <span class="confirm-label"><i class="fas fa-rupee-sign"></i> Total Amount:</span>
                    <span class="confirm-value confirm-highlight">₹${total}</span>
                </div>
                
                <div class="confirm-note">
                    <i class="fas fa-info-circle"></i>
                    <span>Team will arrive anytime within the selected arrival window. Actual service time may vary based on vehicle condition.</span>
                </div>
            </div>
            <div class="confirm-buttons">
                <button class="confirm-btn confirm" onclick="proceedToBooking()">
                    <i class="fas fa-check"></i> Secure booking
                </button>
            </div>
        </div>
    `;
    
    popup.classList.add('show');
}

function closeConfirmPopup() {
    document.getElementById('bookingConfirmPopup').classList.remove('show');
}

function proceedToBooking() {
    closeConfirmPopup();
    
    // Strong vibration before submitting
    if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
    }
    
    // Call the actual submit function
    submitBooking();
}

function generateCaptcha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let captcha = "";
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    window.__captcha = captcha;
    const captchaEl = document.getElementById("captchaText");
    if (captchaEl) captchaEl.innerText = captcha;
}

async function downloadPopup() {
    const popup = document.getElementById('successPopup');
    if (!popup) return;

    try {
        const canvas = await html2canvas(popup, {
            scale: 2,
            backgroundColor: '#141414'
        });
        const link = document.createElement('a');
        link.download = 'kwikkwash-booking.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error("Screenshot error:", error);
        alert("Could not take screenshot. Please try again.");
    }
}

async function submitBooking() {
    console.log("🔥 submitBooking triggered");
    
    const phone = document.getElementById("userPhone").value.trim();
    const address = document.getElementById("userAddress").value.trim();
    const instructions = document.getElementById("userInstructions").value.trim();
    const captchaInput = document.getElementById("captchaInput").value.trim();

    const btn = document.getElementById("confirmBookingBtn");
    if (btn.disabled) return;

    // Validation already done in popup, but double-check
    if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast("Please enter a valid 10-digit mobile number");
        return;
    }

    if (!address || address.length < 10) {
        showToast("Please enter your complete address");
        return;
    }

    if (!captchaInput || captchaInput !== window.__captcha) {
        showToast("Invalid verification code");
        generateCaptcha();
        return;
    }

    const dropdown = document.getElementById("cityDropdown");
    const otherInput = document.getElementById("otherCityInput");
    let city = dropdown.value === "Other" ? otherInput.value.trim() : dropdown.value;

    if (!window.__selectedSlot && dropdown.value !== "Other") {
        showToast("Please select a time slot");
        return;
    }

    if (selectedServices.length === 0) {
        showToast("No services selected");
        return;
    }

    const serviceCodes = selectedServices.map(s => s.code).join(",");
    const totalUnits = selectedServices.reduce((sum, s) => sum + (s.units || 0), 0);
    
    // Calculate amounts
    const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    const payload = {
        booking_id: "BKG" + Date.now(),
        customer_name: phone,
        phone: phone,
        city: city,
        service_code: serviceCodes,
booking_date: (() => {
    const d = new Date();
    if (window.__selectedSlot?.day === "tomorrow") {
        d.setDate(d.getDate() + 1);
    }
    return d.toLocaleDateString("en-CA");
})(),
        assigned_employee_code: "",
        status: "pending",
        slot: window.__selectedSlot?.slot_name || "No Slot",
        service_units: totalUnits,
        payment_status: "",
        payment_mode: "",
        customer_remark: `${getFormattedTimestamp()} | ${instructions || "No instructions"}`,
        employee_remark: "",
        address: address,
        // Use map selected coordinates if available, otherwise use geolocation
        lat: selectedMapLat || userLocation?.lat || null,
        lng: selectedMapLng || userLocation?.lng || null,
        applied_coupon: "",
        coupon_used: 0,
        amount: subtotal.toFixed(2),
        gst_amount: gst.toFixed(2),
        total_amount: total.toFixed(2)
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const res = await fetch(`${BASE_URL}/kwikkwash/bookings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showToast(data.detail || data.message || "Booking failed");
            throw new Error("Booking failed");
        }

        hideUserForm();
        
        const isOtherCity = dropdown.value === "Other";
        showSuccessPopup(payload.booking_id, isOtherCity);

        // Reset selections
        window.__selectedSlot = null;
        window.__slotData = null;
        selectedServices = [];
        selectedMapLat = null;
        selectedMapLng = null;

        document.querySelectorAll('.service-checkbox-input').forEach(cb => {
            cb.checked = false;
        });
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('selected');
        });

        updateTotal();
        updateServiceCount();

    } catch (error) {
        console.error("Booking error:", error);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Review Booking';
        generateCaptcha();
    }
}

function showSuccessPopup(bookingId, isOtherCity) {
    const popup = document.createElement('div');
    popup.className = 'success-popup';
    popup.id = 'successPopup';
    
    const total = document.getElementById("total").innerText;
    const slotText = window.__selectedSlot?.slot_name || "Flexible Timing";
    
    if (isOtherCity) {
        // Professional message for other city
        popup.innerHTML = `
            <div style="font-size: 60px; color: #F6C84C; margin-bottom: 1rem;">
                <i class="fas fa-info-circle"></i>
            </div>

            <h3 style="color: #F6C84C;">Thank You!</h3>

            <p style="color:#ccc; margin-top:10px; line-height:1.6;">
                We truly appreciate your interest in KwikkWash Proclean Services.<br>
                We are actively expanding and will be launching our services in your area very soon.
            </p>

            <button onclick="closeSuccessPopup()" class="popup-btn">
                OK
            </button>
        `;
    } else {
        // Regular booking confirmation with capture button
        popup.innerHTML = `
            <div style="font-size: 60px; color: #28a745; margin-bottom: 1rem;">
                <i class="fas fa-check-circle"></i>
            </div>

            <h3 style="color: #F6C84C; margin-bottom: 1rem;">Booking Confirmed</h3>

            <div style="background:#2a2a2a;padding:1rem;border-radius:10px;margin:1rem 0;border-left:4px solid #F6C84C;">
                <p><strong>Booking ID:</strong> ${bookingId}</p>
                <p><strong>Arrival Window:</strong> ${slotText}</p>
                <p style="font-size:13px;color:#aaa;">
                    Our team will arrive anytime within this window. Actual service time depends on the scope of work.
                </p>
                <p style="margin-top:8px;"><strong>Payable Amount:</strong> ₹${total}</p>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="capturePopup()" class="popup-btn">
                    Capture
                </button>
                <button onclick="closeSuccessPopup()" class="popup-btn">
                    OK
                </button>
            </div>
        `;
    }
    
    document.body.appendChild(popup);
}

function closeSuccessPopup() {
    const popup = document.getElementById('successPopup');
    if (popup) {
        popup.remove();
    }
    location.reload();
}

function openTermsPopup() {
    const popup = document.getElementById('terms-popup');
    if (popup) {
        popup.classList.add('show');
    }
}

function closeTermsPopup() {
    const popup = document.getElementById('terms-popup');
    if (popup) {
        popup.classList.remove('show');
    }
}

document.addEventListener('click', function(e) {
    const termsPopup = document.getElementById('terms-popup');
    if (termsPopup && termsPopup.classList.contains('show')) {
        if (e.target === termsPopup) {
            closeTermsPopup();
        }
    }
    
    const mapPopup = document.getElementById('mapPopup');
    if (mapPopup && mapPopup.classList.contains('show')) {
        if (e.target === mapPopup) {
            closeMapPopup();
        }
    }
    
    const confirmPopup = document.getElementById('bookingConfirmPopup');
    if (confirmPopup && confirmPopup.classList.contains('show')) {
        if (e.target === confirmPopup) {
            closeConfirmPopup();
        }
    }

    const rangePopup = document.getElementById('rangeConfirmPopup');
    if (rangePopup && rangePopup.classList.contains('show')) {
        if (e.target === rangePopup) {
            closeRangeConfirmPopup();
        }
    }
});

async function init() {
    await fetchAllPartners();
    availableCities = await fetchCities();

    const dropdown = document.getElementById("cityDropdown");
    const otherInput = document.getElementById("otherCityInput");

    dropdown.innerHTML = availableCities.map(c => `<option value="${c}">${c}</option>`).join("");
    dropdown.innerHTML += `<option value="Other">🏙️ Other City</option>`;
    otherInput.placeholder = "Enter your city name";
    moveCitySelectorToTopBar();
    revealAppAfterLocationReady();

    await resolveInitialLocationFlow();

    dropdown.addEventListener("change", async function(e) {
        if (e.target.value === "Other") {
            prepareOtherCitySelection(otherInput.value.trim());
        } else {
            setOtherCityMode(false);
            await loadServicesForCity(e.target.value);
            clearTransientBookingUi();
        }
    });

    otherInput.addEventListener("input", function() {
        const city = otherInput.value.trim();
        clearTimeout(typingTimer);

        if (!city) {
            prepareOtherCitySelection();
            return;
        }

        if (city.length < 3) {
            return;
        }

        typingTimer = setTimeout(async () => {
            await applyOtherCityResolution(city, { loadDefaultOnNoMatch: true });
        }, 1500);
    });

    document.getElementById("nextBtn").addEventListener("click", handleNextClick);
    document.getElementById("confirmMapLocation").addEventListener("click", confirmMapLocation);

    updateServiceCount();

    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = "none";

    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.style.display = "none";
    }
}
function initFooterAccordions() {
    const sections = Array.from(document.querySelectorAll(".about-toggle, .faq-toggle"));
    if (!sections.length) return;

    sections.forEach(section => {
        const summary = section.querySelector(":scope > summary");
        if (!summary) return;

        if (section.open) {
            section.classList.add("is-open");
            summary.setAttribute("aria-expanded", "true");
        } else {
            summary.setAttribute("aria-expanded", "false");
        }

        summary.addEventListener("click", (event) => {
            event.preventDefault();

            const shouldOpen = !section.classList.contains("is-open");
            sections.forEach(other => {
                const otherSummary = other.querySelector(":scope > summary");
                const openState = (other === section) ? shouldOpen : false;

                other.classList.toggle("is-open", openState);
                if (openState) {
                    other.setAttribute("open", "");
                } else {
                    other.removeAttribute("open");
                }

                if (otherSummary) {
                    otherSummary.setAttribute("aria-expanded", openState ? "true" : "false");
                }
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    init();
    initFooterAccordions();
});

window.scrollToBooking = function() {
    document.getElementById('booking-form').scrollIntoView({ 
        behavior: "smooth", 
        block: "start" 
    });
};

window.openBooking = openBooking;
window.openTermsPopup = openTermsPopup;
window.closeTermsPopup = closeTermsPopup;
window.generateCaptcha = generateCaptcha;
window.selectSlot = selectSlot;
window.closeSuccessPopup = closeSuccessPopup;
window.downloadPopup = downloadPopup;
window.capturePopup = capturePopup;
window.hideUserForm = hideUserForm;
window.editSlot = editSlot;
window.showInfoModal = showInfoModal;
window.closeInfoModal = closeInfoModal;
window.showSlotFullPopup = showSlotFullPopup;
window.openMapPopup = openMapPopup;
window.closeMapPopup = closeMapPopup;
window.initMap = initMap;
window.confirmMapLocation = confirmMapLocation;
window.showBookingConfirmPopup = showBookingConfirmPopup;
window.closeConfirmPopup = closeConfirmPopup;
window.closeRangeConfirmPopup = closeRangeConfirmPopup;
window.proceedToBooking = proceedToBooking;





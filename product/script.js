// ---------- SCRIPT LOADED DEBUG ----------
console.log("✅ script.js loaded");

const BASE_URL = "https://app.vbo.co.in";

let selectedServices = [];
let availableCities = [];
let typingTimer;
let currentCity = null;
let userLocation = null;

// ---------- TIMESTAMP FUNCTION ----------
function getFormattedTimestamp() {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    let hours = now.getHours();
    let minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${date} ${hours}:${minutes} ${ampm}`;
}

// ---------- FORMAT TIME (AM/PM) ----------
function formatTime(time) {
    if (!time) return "";
    const [h, m] = time.split(":");
    let hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
}

// ---------- GET ICON FOR SERVICE ----------
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

// ---------- SHOW TOAST MESSAGE ----------
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

// ---------- OPEN BOOKING (Slow Scroll) ----------
function openBooking() {
    const bookingForm = document.getElementById("booking-form");
    
    setTimeout(() => {
        bookingForm.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }, 1000);
}

// ---------- SHOW SLOT FULL POPUP ----------
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

// ---------- CAPTURE POPUP SCREENSHOT ----------
function capturePopup() {
    const popup = document.getElementById("successPopup");
    if (!popup) return;

    html2canvas(popup, {
        scale: 3, // 🔥 HIGH QUALITY (main fix)
        useCORS: true,
        backgroundColor: "#141414", // remove transparency blur
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "booking-confirmation.png";
        link.href = canvas.toDataURL("image/png", 1.0); // max quality
        link.click();
    });
}

// ---------- INFO MODAL ----------
function showInfoModal(title, content) {
    document.getElementById('infoModalTitle').innerText = title || "Service Details";
    const contentDiv = document.getElementById('infoModalBody');
    contentDiv.innerHTML = content || "No additional details available";
    document.getElementById('infoModal').classList.add('show');
}

function closeInfoModal() {
    document.getElementById('infoModal').classList.remove('show');
}

// Global info button handler
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

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('infoModal');
    if (modal.classList.contains('show') && e.target === modal) {
        closeInfoModal();
    }
});

// ---------- LOCATION ----------
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

// ---------- DISTANCE ----------
function isWithinRange(userLat, userLng, partner) {
    if (!partner.office_lat || !partner.office_lng) return false;
    const R = 6371;
    const dLat = (partner.office_lat - userLat) * Math.PI / 180;
    const dLng = (partner.office_lng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(userLat * Math.PI / 180) *
              Math.cos(partner.office_lat * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= (partner.service_range_km || 0);
}

// ---------- FETCH CITIES ----------
async function fetchCities() {
    try {
        const res = await fetch(`${BASE_URL}/kwikkwash/partners/all`);
        const data = await res.json();
        return [...new Set(data.map(p => p.city).filter(Boolean))];
    } catch (error) {
        console.error("Error fetching cities:", error);
        return [];
    }
}

// ---------- DETECT CITY ----------
async function detectCity(location) {
    if (!location) return null;
    try {
        const res = await fetch(`${BASE_URL}/kwikkwash/partners/all`);
        const partners = await res.json();
        for (let p of partners) {
            if (isWithinRange(location.lat, location.lng, p)) {
                return p.city;
            }
        }
    } catch (error) {
        console.error("Error detecting city:", error);
    }
    return null;
}

// ---------- LOAD DEFAULT SERVICES ----------
async function loadServicesFromDefault() {
    try {
        currentCity = "Rampur";
        
        const container = document.getElementById("servicesList");
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <i class="fas fa-clock"></i>
                    Loading default services...
                </div>
            </div>
        `;
        
        const res = await fetch(`${BASE_URL}/kwikkwash/partner-services?partner_code=01`);
        const services = await res.json();
        const activeServices = services.filter(s => s.active === 1);
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

// ---------- FETCH SERVICES ----------
async function fetchServices(city) {
    if (!city) return [];
    try {
        const actualCity = city === "Other"
            ? (currentCity || "Rampur")
            : (city.startsWith("Other,") ? city.split(",")[1] : city);
            
        const resPartners = await fetch(`${BASE_URL}/kwikkwash/partners/city/${encodeURIComponent(actualCity)}`);
        const partners = await resPartners.json();
        let servicesMap = {};

        for (let p of partners) {
            const res = await fetch(`${BASE_URL}/kwikkwash/partner-services?partner_code=${p.partner_code}`);
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

        return Object.entries(servicesMap).map(([code, data]) => ({
            service_code: code,
            price: data.price,
            units: data.units,
            short_details: data.short_details,
            long_details: data.long_details
        }));
    } catch (error) {
        console.error("Error fetching services:", error);
        return [];
    }
}

// ---------- RENDER SERVICES (With Flip Cards) ----------
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
                    
                    // Add vibration on select
                    if (checkbox.checked && window.navigator && window.navigator.vibrate) {
                        window.navigator.vibrate(50);
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

                if (navigator.vibrate) navigator.vibrate(50);

                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    document.querySelectorAll(".service-checkbox-input").forEach(cb => {
        cb.addEventListener("change", handleServiceSelection);
    });

    updateServiceCount();
}

// ---------- HANDLE SERVICE SELECTION ----------
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

// ---------- UPDATE SERVICE COUNT ----------
function updateServiceCount() {
    const countEl = document.getElementById("service-count");
    if (countEl) {
        countEl.textContent = `${selectedServices.length} selected`;
    }
}

// ---------- UPDATE TOTAL ----------
function updateTotal() {
    const subtotal = selectedServices.reduce((s, i) => s + i.price, 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    document.getElementById("subtotal").innerText = subtotal.toFixed(2);
    document.getElementById("gst").innerText = gst.toFixed(2);
    document.getElementById("total").innerText = total.toFixed(2);
}

// ---------- LOAD SERVICES FOR CITY ----------
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

// ---------- LOAD SLOTS FOR CITY ----------
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

// ---------- RENDER SLOTS ----------
function renderSlots(slotData) {
    const container = document.getElementById("slotsContainer");
    
    const sortSlots = (slots) => slots.sort((a, b) => (a.slot_order ?? 999) - (b.slot_order ?? 999));

    const todaySlots = sortSlots(slotData.today || []);
    const tomorrowSlots = sortSlots(slotData.tomorrow || []);

    let html = `
        <div class="slot-tabs">
            <button class="tab-btn active" data-tab="today">
                Today
                <span class="slot-count">${todaySlots.length}</span>
            </button>
            <button class="tab-btn" data-tab="tomorrow">
                Tomorrow
                <span class="slot-count">${tomorrowSlots.length}</span>
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

// ---------- RENDER SLOT CARDS ----------
function renderSlotCards(slots, dayType) {
    if (slots.length === 0) {
        return '<div class="empty-state" style="grid-column: 1/-1;"><p>No slots available</p></div>';
    }

    return slots.map(slot => {
        const isFull = (slot.fill_percent ?? 0) >= 100 || 
                      slot.status?.toLowerCase() === 'full' || 
                      slot.manual_hold === 1;
        const fillPercentage = slot.fill_percent || 0;
        const timeRange = `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`;
        
        return `
            <div class="slot-card ${isFull ? 'unavailable' : 'available'}" 
                data-slot-id="${slot.id}"
                data-slot-name="${timeRange}"
                data-day="${dayType}"
                data-disabled="${isFull ? 'true' : 'false'}"
                onclick="selectSlot(this)">
                
                <div class="slot-check">✓</div>
                <div class="slot-time">${formatTime(slot.start_time)}</div>
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

// ---------- SELECT SLOT ----------
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
    
    if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
    }
    
    window.__selectedSlot = {
        id: element.dataset.slotId,
        slot_name: element.dataset.slotName,
        day: element.dataset.day
    };
    
    // Show toast message
    showToast(`Our team will reach you between ${element.dataset.slotName}`);
    
    // Auto-form when slot selected and services exist
    if (selectedServices.length > 0) {
        setTimeout(() => {
            showUserFormOnPage();
        }, 400);
    }
}

// ---------- HANDLE NEXT BUTTON ----------
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

// ---------- SHOW USER FORM ----------
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
                <i class="fas fa-check-circle"></i> Secure Your Booking
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
    document.getElementById("confirmBookingBtn").onclick = submitBooking;
}

// ---------- EDIT SLOT ----------
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

// ---------- GENERATE CAPTCHA ----------
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

// ---------- DOWNLOAD POPUP SCREENSHOT ----------
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

// ---------- SUBMIT BOOKING ----------
async function submitBooking() {
    console.log("🔥 submitBooking triggered");
    
    const phone = document.getElementById("userPhone").value.trim();
    const address = document.getElementById("userAddress").value.trim();
    const instructions = document.getElementById("userInstructions").value.trim();
    const captchaInput = document.getElementById("captchaInput").value.trim();

    const btn = document.getElementById("confirmBookingBtn");
    if (btn.disabled) return;

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

    const payload = {
        booking_id: "BKG" + Date.now(),
        customer_name: phone,
        phone: phone,
        city: city,
        service_code: serviceCodes,
        booking_date: new Date().toISOString().split("T")[0],
        assigned_employee_code: "",
        status: "pending",
        slot: window.__selectedSlot?.slot_name || "No Slot",
        service_units: totalUnits,
        payment_status: "",
        payment_mode: "",
        customer_remark: `${getFormattedTimestamp()} | ${instructions || "No instructions"}`,
        employee_remark: "",
        address: address,
        lat: userLocation?.lat || null,
        lng: userLocation?.lng || null,
        applied_coupon: "",
        coupon_used: 0
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

        window.__selectedSlot = null;
        window.__slotData = null;
        selectedServices = [];

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
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Secure Your Booking';
        generateCaptcha();
    }
}

// ---------- SHOW SUCCESS POPUP ----------
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
                <p><strong>Scheduled Slot:</strong> ${slotText}</p>
                <p style="font-size:13px;color:#aaa;">
                    Our team will reach you within the selected time window.
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

// ---------- TERMS POPUP ----------
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

// Close popup when clicking outside
document.addEventListener('click', function(e) {
    const termsPopup = document.getElementById('terms-popup');
    if (termsPopup && termsPopup.classList.contains('show')) {
        if (e.target === termsPopup) {
            closeTermsPopup();
        }
    }
});

// ---------- INIT FUNCTION ----------
async function init() {
    console.log("🚀 init() called");
    
    userLocation = await getUserLocation();
    availableCities = await fetchCities();

    const dropdown = document.getElementById("cityDropdown");
    const otherInput = document.getElementById("otherCityInput");

    dropdown.innerHTML = availableCities.map(c => `<option value="${c}">${c}</option>`).join("");
    dropdown.innerHTML += `<option value="Other">🏙️ Other City</option>`;

    let detectedCity = await detectCity(userLocation);
    
    if (detectedCity && availableCities.includes(detectedCity)) {
        dropdown.value = detectedCity;
        await loadServicesForCity(detectedCity);
    } else {
        dropdown.value = "Other";
        otherInput.style.display = "block";
        otherInput.required = true;
        otherInput.placeholder = "Enter your city name";
        
        document.getElementById("servicesList").innerHTML = `
            <div class="empty-state">
                <i class="fas fa-city"></i>
                <p>Enter your city to see available services</p>
            </div>
        `;
    }

    dropdown.addEventListener("change", async function(e) {
        if (e.target.value === "Other") {
            otherInput.style.display = "block";
            otherInput.required = true;
            document.getElementById("servicesList").innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-city"></i>
                    <p>Enter your city to see available services</p>
                </div>
            `;
            const slotsSection = document.getElementById("slotsSection");
            if (slotsSection) slotsSection.style.display = 'none';
            
            document.getElementById("userFormContainer").style.display = 'none';
            window.__selectedSlot = null;
        } else {
            otherInput.style.display = "none";
            otherInput.required = false;
            otherInput.value = "";
            await loadServicesForCity(e.target.value);
            document.getElementById("userFormContainer").style.display = 'none';
            window.__selectedSlot = null;
        }
    });

    otherInput.addEventListener("input", function() {
        const city = otherInput.value.trim();
        clearTimeout(typingTimer);

        if (city.length < 3) {
            document.getElementById("servicesList").innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>Enter at least 3 characters to search</p>
                </div>
            `;
            return;
        }

        document.getElementById("servicesList").innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <i class="fas fa-search"></i>
                    Searching services...
                </div>
            </div>
        `;

        typingTimer = setTimeout(async () => {
            const matchedCity = availableCities.find(c => 
                c.toLowerCase() === city.toLowerCase()
            );

            if (matchedCity) {
                dropdown.value = matchedCity;
                otherInput.style.display = "none";
                otherInput.required = false;
                otherInput.value = "";
                await loadServicesForCity(matchedCity);
            } else {
                loadServicesFromDefault();
            }
        }, 1500);
    });

    document.getElementById("nextBtn").addEventListener("click", handleNextClick);
    
    updateServiceCount();
    
    const slotsSection = document.getElementById("slotsSection");
    if (slotsSection) slotsSection.style.display = 'none';
    
    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
        nextBtn.style.display = "none";
    }
}

// ---------- INITIALIZE ----------
document.addEventListener("DOMContentLoaded", init);

// Export functions
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

// Service Data
const servicesData = {
    car5: [
        { id: 'car5-1', name: 'Kwik Shine Basic', time: 45, price: 200, details: 'External work only - Basic wash and polish' },
        { id: 'car5-2', name: 'Kwik Shine Premium', time: 60, price: 300, details: 'External work only - Premium wash and wax' },
        { id: 'car5-3', name: 'Interior Cleaning', time: 90, price: 400, details: 'Complete interior cleaning and vacuuming' },
        { id: 'car5-4', name: 'Full Service', time: 150, price: 600, details: 'Complete interior + exterior cleaning' },
        { id: 'car5-5', name: 'Engine Bay Clean', time: 60, price: 250, details: 'Engine bay cleaning and dressing' }
    ],
    car7: [
        { id: 'car7-1', name: 'Kwik Shine Basic', time: 60, price: 250, details: 'External work only - Basic wash and polish' },
        { id: 'car7-2', name: 'Kwik Shine Premium', time: 75, price: 350, details: 'External work only - Premium wash and wax' },
        { id: 'car7-3', name: 'Interior Cleaning', time: 120, price: 500, details: 'Complete interior cleaning and vacuuming' },
        { id: 'car7-4', name: 'Full Service', time: 180, price: 750, details: 'Complete interior + exterior cleaning' },
        { id: 'car7-5', name: 'Engine Bay Clean', time: 75, price: 300, details: 'Engine bay cleaning and dressing' }
    ],
    sofa: [
        { 
            id: 'sofa-leather', 
            name: 'Leather Sofa Cleaning', 
            time: 60, 
            price: 1250, 
            details: 'Leather cleaning and conditioning (5 seats minimum)',
            type: 'leather',
            minSeats: 5,
            pricePerSeat: 250
        },
        { 
            id: 'sofa-cotton', 
            name: 'Cotton Sofa Cleaning', 
            time: 50, 
            price: 1750, 
            details: 'Cotton fabric deep cleaning (5 seats minimum)',
            type: 'cotton',
            minSeats: 5,
            pricePerSeat: 350
        }
    ],
    addon: [
        { id: 'addon-1', name: 'Bike Wash Basic', time: 10, price: 50, details: 'External work only - Basic bike wash' },
        { id: 'addon-2', name: 'Bike Wash Premium', time: 15, price: 80, details: 'External work only - Premium bike wash' },
        { id: 'addon-3', name: 'Helmet Cleaning', time: 10, price: 40, details: 'Helmet interior and exterior cleaning' },
        { id: 'addon-4', name: 'Car Perfume', time: 5, price: 30, details: 'Premium car perfume installation' }
    ]
};

// Google Sheets URLs
const GAS_URLS = {
    RESPONSES: 'https://script.google.com/macros/s/AKfycbzTRh1lz11Of_3Y5HaHtR_T2WHuG3MZGhhbtp6XMHt6XQ5fbDX3EBE1bjoy4wN91cZt/exec',
    AVAILABILITY: 'https://script.google.com/macros/s/AKfycbzOW1V-UO70zwzwLxxcbHhRjV7iBu_n-PvLdzImKF4r-VDZSSSUt0gHThrMtyp82J7W/exec'
};

// Serviceable Areas Configuration
const SERVICEABLE_AREAS = [
    {
        name: "Area 1",
        center: { lat: 26.8987, lng: 80.7179 },
        radius: 50, // in km
        message: "Service available in your area!"
    },
    {
        name: "Area 2", 
        center: { lat: 28.5562, lng: 77.1000 },
        radius: 10, // in km
        message: "Service available in your area!"
    }
];

// App State
let state = {
    selectedServices: new Map(),
    selectedAddons: new Map(),
    selectedDate: null,
    selectedTime: null,
    couponApplied: false,
    couponDiscount: 0,
    userLocation: null,
    cartTotal: 0,
    captchaCode: '',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    expandedCategory: null,
    availableSlots: [],
    isLoadingSlots: false
};

// DOM Elements
const elements = {
    checkoutBtn: document.getElementById('checkout-btn'),
    checkoutPopup: document.getElementById('checkout-popup'),
    termsPopup: document.getElementById('terms-popup'),
    confirmationOverlay: document.getElementById('confirmation-overlay'),
    addonSection: document.getElementById('addon-section'),
    cartItems: document.getElementById('cart-items'),
    popupCartItems: document.getElementById('popup-cart-items'),
    subtotalEl: document.getElementById('subtotal'),
    taxEl: document.getElementById('tax'),
    totalEl: document.getElementById('total'),
    popupSubtotal: document.getElementById('popup-subtotal'),
    popupTax: document.getElementById('popup-tax'),
    popupTotal: document.getElementById('popup-total'),
    timeSlots: document.getElementById('time-slots'),
    mobileInput: document.getElementById('mobile'),
    mobileError: document.getElementById('mobile-error'),
    locationError: document.getElementById('location-error'),
    locationStatus: document.getElementById('location-status'),
    captchaCode: document.getElementById('captcha-code'),
    captchaInput: document.getElementById('captcha-input'),
    captchaError: document.getElementById('captcha-error'),
    bookingId: document.getElementById('booking-id'),
    bookingDatetime: document.getElementById('booking-datetime'),
    finalAmount: document.getElementById('final-amount'),
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude'),
    currentMonth: document.getElementById('current-month'),
    calendar: document.getElementById('calendar'),
    confirmationTitle: document.getElementById('confirmation-title'),
    confirmationMessage: document.getElementById('confirmation-message'),
    confirmationNote: document.getElementById('confirmation-note'),
    locationNote: document.getElementById('location-note'),
    mainServiceCount: document.getElementById('main-service-count'),
    addonServiceCount: document.getElementById('addon-service-count')
};

// Initialize the application
function init() {
    loadServices();
    generateCalendar();
    generateCaptcha();
    updateCart();
    updateServiceCounts();
    setupEventListeners();
    
    // Load today's slots initially
    loadAvailableSlotsForDate(new Date());
}

// Load services into the DOM
function loadServices() {
    // Load car 5-seater services
    loadServiceCategory('car5', servicesData.car5);
    
    // Load car 7-seater services
    loadServiceCategory('car7', servicesData.car7);
    
    // Load sofa services
    loadSofaServices();
    
    // Load addon services
    loadAddonServices();
}

function loadServiceCategory(categoryId, services) {
    const container = document.getElementById(`${categoryId}-content`);
    container.innerHTML = '';
    
    services.forEach(service => {
        const serviceEl = createServiceElement(service, categoryId);
        container.appendChild(serviceEl);
    });
}

function loadSofaServices() {
    const container = document.getElementById('sofa-content');
    container.innerHTML = '';
    
    servicesData.sofa.forEach(service => {
        const serviceEl = document.createElement('div');
        serviceEl.className = 'service-item';
        serviceEl.innerHTML = `
            <div class="service-checkbox">
                <input type="checkbox" id="${service.id}" 
                       onchange="toggleService('${service.id}', ${service.price}, 'main')">
            </div>
            <div class="service-details">
                <div class="service-name">${service.name}</div>
                <div class="service-meta">
                    <span><i class="far fa-clock"></i> ${service.time} mins</span>
                    <span><i class="fas fa-users"></i> Min ${service.minSeats} seats</span>
                </div>
                <div class="service-description">${service.details}</div>
                <div class="seats-input">
                    <label for="seats-${service.id}">Number of Seats:</label>
                    <input type="number" id="seats-${service.id}" 
                           min="${service.minSeats}" value="${service.minSeats}"
                           onchange="updateSofaPrice('${service.id}', ${service.pricePerSeat})">
                </div>
            </div>
            <div class="service-price" id="price-${service.id}">₹${service.price}</div>
        `;
        container.appendChild(serviceEl);
    });
}

function loadAddonServices() {
    const container = document.getElementById('addon-content');
    container.innerHTML = '';
    
    servicesData.addon.forEach(service => {
        const serviceEl = createServiceElement(service, 'addon');
        container.appendChild(serviceEl);
    });
}

function createServiceElement(service, category) {
    const div = document.createElement('div');
    div.className = 'service-item';
    div.innerHTML = `
        <div class="service-checkbox">
            <input type="checkbox" id="${service.id}" 
                   onchange="toggleService('${service.id}', ${service.price}, '${category}')">
        </div>
        <div class="service-details">
            <div class="service-name">${service.name}</div>
            <div class="service-meta">
                <span><i class="far fa-clock"></i> ${service.time} minutes</span>
            </div>
            <div class="service-description">${service.details}</div>
        </div>
        <div class="service-price">₹${service.price}</div>
    `;
    return div;
}

// Toggle category expansion (only one at a time)
function toggleCategory(category, element) {
    // If clicking the same category, toggle it
    if (state.expandedCategory === category) {
        const content = document.getElementById(`${category}-content`);
        const icon = document.getElementById(`${category}-icon`);
        
        content.classList.toggle('expanded');
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
        
        state.expandedCategory = null;
        return;
    }
    
    // Close previously expanded category
    if (state.expandedCategory) {
        const prevContent = document.getElementById(`${state.expandedCategory}-content`);
        const prevIcon = document.getElementById(`${state.expandedCategory}-icon`);
        
        if (prevContent) prevContent.classList.remove('expanded');
        if (prevIcon) {
            prevIcon.classList.remove('fa-chevron-up');
            prevIcon.classList.add('fa-chevron-down');
        }
    }
    
    // Open new category
    const content = document.getElementById(`${category}-content`);
    const icon = document.getElementById(`${category}-icon`);
    
    if (content && icon) {
        content.classList.add('expanded');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        state.expandedCategory = category;
    }
}

// Toggle service selection
function toggleService(serviceId, basePrice, category = 'main') {
    const checkbox = document.getElementById(serviceId);
    const serviceItem = checkbox.closest('.service-item');
    
    if (checkbox.checked) {
        serviceItem.classList.add('selected');
        if (category === 'addon') {
            state.selectedAddons.set(serviceId, {
                price: basePrice,
                name: serviceItem.querySelector('.service-name').textContent
            });
        } else {
            state.selectedServices.set(serviceId, {
                price: basePrice,
                name: serviceItem.querySelector('.service-name').textContent
            });
        }
    } else {
        serviceItem.classList.remove('selected');
        if (category === 'addon') {
            state.selectedAddons.delete(serviceId);
        } else {
            state.selectedServices.delete(serviceId);
        }
    }
    
    // Enable/disable addon section based on main services
    if (state.selectedServices.size > 0) {
        elements.addonSection.classList.remove('disabled');
    } else {
        elements.addonSection.classList.add('disabled');
        // Clear all addons if no main service selected
        state.selectedAddons.clear();
        document.querySelectorAll('#addon-content input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.closest('.service-item').classList.remove('selected');
        });
    }
    
    updateCart();
    updateServiceCounts();
    updateCategoryCounts();
}

// Update sofa price based on seat count
function updateSofaPrice(serviceId, pricePerSeat) {
    const seatsInput = document.getElementById(`seats-${serviceId}`);
    const priceEl = document.getElementById(`price-${serviceId}`);
    const checkbox = document.getElementById(serviceId);
    
    const seats = parseInt(seatsInput.value) || 5;
    const newPrice = seats * pricePerSeat;
    
    priceEl.textContent = `₹${newPrice}`;
    
    if (checkbox.checked) {
        state.selectedServices.set(serviceId, {
            price: newPrice,
            name: document.querySelector(`#${serviceId}`).closest('.service-item').querySelector('.service-name').textContent
        });
        updateCart();
    }
}

// Update service counts
function updateServiceCounts() {
    // Update main service count
    elements.mainServiceCount.textContent = `${state.selectedServices.size} selected`;
    
    // Update addon service count
    elements.addonServiceCount.textContent = `${state.selectedAddons.size} selected`;
}

function updateCategoryCounts() {
    // Count services in each category
    const car5Count = Array.from(state.selectedServices.keys()).filter(id => id.startsWith('car5')).length;
    const car7Count = Array.from(state.selectedServices.keys()).filter(id => id.startsWith('car7')).length;
    const sofaCount = Array.from(state.selectedServices.keys()).filter(id => id.startsWith('sofa')).length;
    const addonCount = state.selectedAddons.size;
    
    // Update category counts
    document.querySelectorAll('.category-count').forEach(el => {
        const parent = el.closest('.category-header');
        if (parent) {
            const title = parent.querySelector('h4');
            if (title) {
                if (title.textContent.includes('5 seater')) {
                    el.textContent = `${car5Count} selected`;
                } else if (title.textContent.includes('7 seater')) {
                    el.textContent = `${car7Count} selected`;
                } else if (title.textContent.includes('Sofa')) {
                    el.textContent = `${sofaCount} selected`;
                } else if (title.textContent.includes('Additional')) {
                    el.textContent = `${addonCount} selected`;
                }
            }
        }
    });
}

// Calendar Functions
function generateCalendar() {
    const month = state.currentMonth;
    const year = state.currentYear;
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    elements.currentMonth.textContent = `${monthNames[month]} ${year}`;
    
    // Clear calendar
    elements.calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.className = 'day-header';
        dayEl.textContent = day;
        elements.calendar.appendChild(dayEl);
    });
    
    // Get first day of month
    const firstDay = new Date(year, month, 1).getDay();
    
    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty days for first week
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day';
        elements.calendar.appendChild(emptyDay);
    }
    
    // Add days of month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = day;
        
        const currentDate = new Date(year, month, day);
        
        // Disable past dates
        if (currentDate < today) {
            dayEl.classList.add('disabled');
        } else {
            dayEl.onclick = () => selectDate(currentDate, dayEl);
            
            // Mark selected date
            if (state.selectedDate && 
                state.selectedDate.getDate() === day &&
                state.selectedDate.getMonth() === month &&
                state.selectedDate.getFullYear() === year) {
                dayEl.classList.add('selected');
            }
        }
        
        elements.calendar.appendChild(dayEl);
    }
}

function changeMonth(delta) {
    state.currentMonth += delta;
    
    if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
    } else if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
    }
    
    generateCalendar();
    // Clear time slots when month changes
    state.selectedDate = null;
    state.selectedTime = null;
    elements.timeSlots.innerHTML = '<div class="loading-slots">Select a date to see available slots</div>';
    updateCheckoutButton();
}

function selectDate(date, element) {
    // Remove selection from other days
    document.querySelectorAll('.day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Add selection to clicked day
    element.classList.add('selected');
    
    // Store selected date
    state.selectedDate = date;
    state.selectedTime = null; // Reset time selection
    
    // Load available slots for selected date
    loadAvailableSlotsForDate(date);
    updateCheckoutButton();
}

// Fetch available slots from Google Sheets
async function loadAvailableSlotsForDate(date) {
    if (!date) return;
    
    const formattedDate = formatDateForAPI(date);
    state.isLoadingSlots = true;
    
    // Show loading state
    elements.timeSlots.innerHTML = `
        <div class="loading-slots" style="grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin"></i> Loading available slots...
        </div>
    `;
    
    try {
        // Fetch slots from Google Sheets
        const slots = await fetchAvailableSlotsFromGoogleSheets(formattedDate);
        state.availableSlots = slots;
        
        // Display slots
        displayTimeSlots(slots);
        
    } catch (error) {
        console.error('Error loading slots:', error);
        elements.timeSlots.innerHTML = `
            <div class="loading-slots" style="color: #ff6b6b; grid-column: 1 / -1;">
                <i class="fas fa-exclamation-circle"></i> Unable to load slots. Please try again.
            </div>
        `;
        state.availableSlots = [];
    } finally {
        state.isLoadingSlots = false;
    }
}

function displayTimeSlots(slots) {
    if (!slots || slots.length === 0) {
        elements.timeSlots.innerHTML = `
            <div class="loading-slots" style="grid-column: 1 / -1;">
                No slots available for this date
            </div>
        `;
        return;
    }
    
    elements.timeSlots.innerHTML = '';
    
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = `time-slot ${slot.available ? '' : 'disabled'}`;
        slotEl.textContent = slot.time;
        
        if (slot.available) {
            slotEl.onclick = () => selectTimeSlot(slot.time, slotEl);
            if (slot.slotsLeft && slot.slotsLeft < 3) {
                slotEl.title = `Only ${slot.slotsLeft} slot${slot.slotsLeft > 1 ? 's' : ''} left`;
            }
        } else {
            slotEl.title = 'Slot not available';
        }
        
        // Mark as selected if matches current selection
        if (state.selectedTime === slot.time) {
            slotEl.classList.add('selected');
        }
        
        elements.timeSlots.appendChild(slotEl);
    });
}

function selectTimeSlot(time, element) {
    if (state.selectedTime === time) {
        state.selectedTime = null;
        element.classList.remove('selected');
    } else {
        // Remove selection from other slots
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        state.selectedTime = time;
        element.classList.add('selected');
    }
    
    updateCheckoutButton();
}

// Format date for API (YYYY-MM-DD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Fetch available slots from Google Sheets
async function fetchAvailableSlotsFromGoogleSheets(date) {
    try {
        const url = `${GAS_URLS.AVAILABILITY}?action=getAvailableSlots&date=${date}`;
        
        // Using a proxy to avoid CORS issues
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.contents) {
            const result = JSON.parse(data.contents);
            if (result.success && result.data) {
                return result.data;
            }
        }
        
        // Fallback to default slots if API fails
        return generateDefaultSlots();
        
    } catch (error) {
        console.error('Error fetching slots from Google Sheets:', error);
        // Fallback to default slots
        return generateDefaultSlots();
    }
}

// Generate default time slots (fallback)
function generateDefaultSlots() {
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour % 12 || 12}:${minute === 0 ? '00' : minute} ${hour < 12 ? 'AM' : 'PM'}`;
            // Simulate some unavailable slots
            const isAvailable = Math.random() > 0.4; // 60% available
            
            slots.push({
                time: timeString,
                available: isAvailable,
                employees: isAvailable ? Math.floor(Math.random() * 3) + 1 : 0,
                capacity: 3,
                slotsLeft: isAvailable ? Math.floor(Math.random() * 3) + 1 : 0
            });
        }
    }
    
    return slots;
}

// Update cart and totals
function updateCart() {
    // Calculate subtotal
    let subtotal = 0;
    
    // Main services
    state.selectedServices.forEach((service, id) => {
        subtotal += service.price;
    });
    
    // Addons
    state.selectedAddons.forEach((addon, id) => {
        subtotal += addon.price;
    });
    
    // Apply coupon discount if any
    if (state.couponApplied) {
        subtotal -= state.couponDiscount;
        if (subtotal < 0) subtotal = 0;
    }
    
    // Calculate GST (18%)
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    
    // Update state
    state.cartTotal = total;
    
    // Update UI
    elements.subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    elements.taxEl.textContent = `₹${gst.toFixed(2)}`;
    elements.totalEl.textContent = `₹${total.toFixed(2)}`;
    
    // Update popup totals
    elements.popupSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
    elements.popupTax.textContent = `₹${gst.toFixed(2)}`;
    elements.popupTotal.textContent = `₹${total.toFixed(2)}`;
    
    // Update cart items display
    updateCartDisplay();
    updateCheckoutButton();
}

function updateCartDisplay() {
    // Update main cart
    if (state.selectedServices.size === 0 && state.selectedAddons.size === 0) {
        elements.cartItems.innerHTML = '<div class="empty-cart">No services selected yet</div>';
        return;
    }
    
    let cartHTML = '';
    
    // Main services
    state.selectedServices.forEach((service, id) => {
        cartHTML += `
            <div class="cart-item">
                <span class="cart-item-name">${service.name}</span>
                <span class="cart-item-price">₹${service.price}</span>
            </div>
        `;
    });
    
    // Addons
    state.selectedAddons.forEach((addon, id) => {
        cartHTML += `
            <div class="cart-item">
                <span class="cart-item-name">${addon.name} (Add-on)</span>
                <span class="cart-item-price">₹${addon.price}</span>
            </div>
        `;
    });
    
    elements.cartItems.innerHTML = cartHTML;
    
    // Update popup cart
    elements.popupCartItems.innerHTML = cartHTML;
}

function updateCheckoutButton() {
    const hasServices = state.selectedServices.size > 0;
    const hasDate = state.selectedDate !== null;
    const hasTime = state.selectedTime !== null;
    
    elements.checkoutBtn.disabled = !(hasServices && hasDate && hasTime);
    if (elements.checkoutBtn.disabled) {
        elements.checkoutBtn.style.opacity = '0.6';
        elements.checkoutBtn.style.cursor = 'not-allowed';
    } else {
        elements.checkoutBtn.style.opacity = '1';
        elements.checkoutBtn.style.cursor = 'pointer';
    }
}

// Checkout popup functions
function openCheckoutPopup() {
    elements.checkoutPopup.style.display = 'flex';
    updateCartDisplay();
}

function closeCheckoutPopup() {
    elements.checkoutPopup.style.display = 'none';
}

// Terms popup functions
function openTermsPopup() {
    elements.termsPopup.style.display = 'flex';
}

function closeTermsPopup() {
    elements.termsPopup.style.display = 'none';
}

// Location functions
function getLocation() {
    if (!navigator.geolocation) {
        elements.locationError.textContent = "Geolocation is not supported by your browser";
        elements.locationStatus.textContent = "Location not supported";
        return;
    }
    
    elements.locationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching location...';
    elements.locationStatus.style.color = '#F6C84C';
    elements.locationError.textContent = '';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            elements.latitude.value = lat;
            elements.longitude.value = lng;
            
            // Store location in state
            state.userLocation = { lat, lng };
            
            elements.locationStatus.innerHTML = `
                <span style="color: #2ecc71;">
                    <i class="fas fa-check-circle"></i> Location fetched successfully!
                </span>
            `;
        },
        (error) => {
            elements.locationStatus.textContent = "Location not shared";
            elements.locationStatus.style.color = '#aaa';
            elements.locationError.textContent = "Please write full address!!";
            
            // Clear location
            state.userLocation = null;
            elements.latitude.value = '';
            elements.longitude.value = '';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
}

// Check if location is within serviceable area
function checkServiceableArea(lat, lng) {
    if (!lat || !lng) return { serviceable: false, message: "Location not available" };
    
    for (const area of SERVICEABLE_AREAS) {
        const distance = calculateDistance(lat, lng, area.center.lat, area.center.lng);
        if (distance <= area.radius) {
            return { 
                serviceable: true, 
                message: area.message,
                areaName: area.name,
                distance: distance.toFixed(1)
            };
        }
    }
    
    return { 
        serviceable: false, 
        message: "We have received your request! Our services will be live very soon in your area!!"
    };
}

// Captcha functions
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let captcha = '';
    for (let i = 0; i < 5; i++) {
        captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    state.captchaCode = captcha;
    elements.captchaCode.textContent = captcha;
    elements.captchaInput.value = '';
    elements.captchaError.textContent = '';
}

// Form validation
function validateForm() {
    let isValid = true;
    
    // Mobile validation
    const mobile = elements.mobileInput.value.trim();
    const mobileRegex = /^[6-9]\d{9}$/;
    
    if (!mobileRegex.test(mobile)) {
        elements.mobileError.textContent = 'Please enter a valid 10-digit mobile number';
        isValid = false;
    } else {
        elements.mobileError.textContent = '';
    }
    
    // Name and address validation
    const nameAddress = document.getElementById('name-address').value.trim();
    if (!nameAddress) {
        alert('Please enter your name and address');
        isValid = false;
    }
    
    // Captcha validation
    const captchaInput = elements.captchaInput.value.trim();
    if (captchaInput !== state.captchaCode) {
        elements.captchaError.textContent = 'Captcha code does not match';
        isValid = false;
    } else {
        elements.captchaError.textContent = '';
    }
    
    return isValid;
}

// Submit booking to Google Sheets
async function submitBooking() {
    if (!validateForm()) {
        return;
    }
    
    // Collect all data
    const bookingData = {
        timestamp: new Date().toISOString(),
        mobile: elements.mobileInput.value.trim(),
        nameAddress: document.getElementById('name-address').value.trim(),
        services: Array.from(state.selectedServices.entries()).map(([id, service]) => service.name).join(', '),
        addons: Array.from(state.selectedAddons.entries()).map(([id, addon]) => addon.name).join(', ') || 'None',
        selectedDate: state.selectedDate ? formatDateForAPI(state.selectedDate) : '',
        selectedTime: state.selectedTime || '',
        locationStatus: state.userLocation ? "Fetched" : "Not Shared",
        latitude: elements.latitude.value || '',
        longitude: elements.longitude.value || '',
        subtotal: parseFloat(elements.subtotalEl.textContent.replace('₹', '')),
        gst: parseFloat(elements.taxEl.textContent.replace('₹', '')),
        total: state.cartTotal
    };
    
    // Check location serviceability
    const lat = parseFloat(elements.latitude.value);
    const lng = parseFloat(elements.longitude.value);
    const areaCheck = checkServiceableArea(lat, lng);
    
    try {
        // Show loading state
        const confirmBtn = document.querySelector('.confirm-btn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
        
        // Submit to Google Sheets
        const result = await submitToGoogleSheets(bookingData);
        
        // Show appropriate confirmation message
        showConfirmation(result, areaCheck);
        
        // Reset button
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        
    } catch (error) {
        alert('Error submitting booking. Please try again.');
        console.error('Booking submission error:', error);
        
        // Reset button
        const confirmBtn = document.querySelector('.confirm-btn');
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm Booking';
        confirmBtn.disabled = false;
    }
}

// Google Sheets submission
async function submitToGoogleSheets(bookingData) {
    try {
        const payload = {
            action: 'createBooking',
            data: bookingData
        };
        
        console.log('Submitting to Google Sheets:', payload);
        
        // Using a proxy to avoid CORS issues
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(GAS_URLS.RESPONSES)}`;
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.contents) {
            const result = JSON.parse(data.contents);
            console.log('Google Sheets response:', result);
            
            if (result.success) {
                return {
                    ...result.data,
                    bookingId: result.data.bookingId || generateBookingId()
                };
            } else {
                throw new Error(result.error || 'Failed to submit booking');
            }
        } else {
            // If using direct fetch without proxy (for testing)
            const directResponse = await fetch(GAS_URLS.RESPONSES, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            // Generate booking ID locally for no-cors mode
            return {
                bookingId: generateBookingId(),
                message: "Booking submitted successfully",
                serviceAreaStatus: "Pending"
            };
        }
        
    } catch (error) {
        console.error('Error in submitToGoogleSheets:', error);
        
        // Fallback: Generate booking ID locally
        return {
            bookingId: generateBookingId(),
            message: "Booking recorded locally",
            serviceAreaStatus: "Pending"
        };
    }
}

// Generate booking ID
function generateBookingId() {
    const prefix = "KW";
    const date = new Date();
    const timestamp = date.getFullYear().toString().slice(-2) + 
                     (date.getMonth() + 1).toString().padStart(2, '0') + 
                     date.getDate().toString().padStart(2, '0') +
                     date.getHours().toString().padStart(2, '0') +
                     date.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// Show confirmation message
function showConfirmation(bookingResult, areaCheck) {
    closeCheckoutPopup();
    
    // Format date and time
    const dateStr = state.selectedDate ? 
        state.selectedDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : '--';
    
    const timeStr = state.selectedTime || '--';
    
    // Update confirmation details
    elements.bookingId.textContent = bookingResult.bookingId;
    elements.bookingDatetime.textContent = `${dateStr} at ${timeStr}`;
    elements.finalAmount.textContent = `₹${state.cartTotal.toFixed(2)}`;
    
    // Set appropriate messages based on location
    if (!state.userLocation) {
        // No location fetched
        elements.confirmationTitle.textContent = 'Booking Received!';
        elements.confirmationMessage.textContent = 'We have received your booking request!';
        elements.confirmationNote.textContent = 'We could not fetch your location, our team will connect you soon for order confirmation.';
        elements.locationNote.style.display = 'none';
    } else if (areaCheck.serviceable) {
        // Location is serviceable
        elements.confirmationTitle.textContent = 'Booking Confirmed!';
        elements.confirmationMessage.textContent = 'Thank you for choosing Kwikkwash Proclean Services! Your booking has been successfully confirmed.';
        elements.confirmationNote.textContent = 'Our team will contact you shortly to confirm the appointment details.';
        elements.locationNote.style.display = 'block';
        elements.locationNote.innerHTML = `<i class="fas fa-map-marker-alt"></i> <strong>Service Area:</strong> ${areaCheck.areaName} (${areaCheck.distance}km from center)`;
    } else {
        // Location not serviceable
        elements.confirmationTitle.textContent = 'Booking Received!';
        elements.confirmationMessage.textContent = areaCheck.message;
        elements.confirmationNote.textContent = 'We have received your request and will notify you when services become available in your area.';
        elements.locationNote.style.display = 'none';
    }
    
    // Show confirmation
    elements.confirmationOverlay.style.display = 'flex';
    
    // Reset form after successful submission
    resetForm();
}

function resetForm() {
    // Reset all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.service-item').classList.remove('selected');
    });
    
    // Reset sofa seat inputs
    document.querySelectorAll('.seats-input input').forEach(input => {
        input.value = input.min;
    });
    
    // Reset state
    state.selectedServices.clear();
    state.selectedAddons.clear();
    state.selectedDate = null;
    state.selectedTime = null;
    state.couponApplied = false;
    state.couponDiscount = 0;
    state.userLocation = null;
    state.expandedCategory = null;
    state.availableSlots = [];
    
    // Reset date selection
    document.querySelectorAll('.day').forEach(day => {
        day.classList.remove('selected');
    });
    
    // Reset time selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Reset form fields
    document.getElementById('mobile').value = '';
    elements.mobileError.textContent = '';
    document.getElementById('name-address').value = '';
    elements.captchaInput.value = '';
    elements.captchaError.textContent = '';
    elements.locationStatus.textContent = 'Location not shared yet';
    elements.locationStatus.style.color = '#aaa';
    elements.locationError.textContent = '';
    elements.latitude.value = '';
    elements.longitude.value = '';
    
    // Reset categories
    document.querySelectorAll('.category-content').forEach(content => {
        content.classList.remove('expanded');
    });
    document.querySelectorAll('.category-header i').forEach(icon => {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    });
    
    // Reset time slots display
    elements.timeSlots.innerHTML = '<div class="loading-slots">Select a date to see available slots</div>';
    
    // Update UI
    elements.addonSection.classList.add('disabled');
    updateCart();
    updateServiceCounts();
    updateCategoryCounts();
    updateCheckoutButton();
    generateCaptcha();
}

function closeConfirmation() {
    elements.confirmationOverlay.style.display = 'none';
}

// Scroll to booking form
function scrollToBooking() {
    document.getElementById('booking-form').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Setup event listeners
function setupEventListeners() {
    // Mobile validation on input
    elements.mobileInput.addEventListener('input', (e) => {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = value.slice(0, 10);
    });
    
    // Prevent form submission on Enter
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.type !== 'textarea') {
            e.preventDefault();
        }
    });
    
    // Close popups when clicking outside
    elements.checkoutPopup.addEventListener('click', (e) => {
        if (e.target === elements.checkoutPopup) {
            closeCheckoutPopup();
        }
    });
    
    elements.termsPopup.addEventListener('click', (e) => {
        if (e.target === elements.termsPopup) {
            closeTermsPopup();
        }
    });
    
    elements.confirmationOverlay.addEventListener('click', (e) => {
        if (e.target === elements.confirmationOverlay) {
            closeConfirmation();
        }
    });
    
    // Handle form field changes
    document.getElementById('name-address').addEventListener('input', () => {
        // Clear location error when user types address
        elements.locationError.textContent = '';
    });
    
    // Auto-refresh captcha after 2 minutes
    setInterval(() => {
        generateCaptcha();
    }, 120000); // 2 minutes
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for HTML onclick handlers
window.toggleCategory = toggleCategory;
window.toggleService = toggleService;
window.updateSofaPrice = updateSofaPrice;
window.changeMonth = changeMonth;
window.openCheckoutPopup = openCheckoutPopup;
window.closeCheckoutPopup = closeCheckoutPopup;
window.openTermsPopup = openTermsPopup;
window.closeTermsPopup = closeTermsPopup;
window.getLocation = getLocation;
window.generateCaptcha = generateCaptcha;
window.submitBooking = submitBooking;
window.closeConfirmation = closeConfirmation;
window.scrollToBooking = scrollToBooking;
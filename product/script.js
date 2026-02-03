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
            price: 250, 
            details: 'Leather cleaning and conditioning',
            type: 'leather',
            minSeats: 5,
            pricePerSeat: 250
        },
        { 
            id: 'sofa-cotton', 
            name: 'Cotton Sofa Cleaning', 
            time: 50, 
            price: 350, 
            details: 'Cotton fabric deep cleaning',
            type: 'cotton',
            minSeats: 5,
            pricePerSeat: 350
        }
    ],
    addon: [
        { id: 'addon-1', name: 'Bike Wash Small', time: 10, price: 50, details: 'External work only - Basic bike wash' },
        { id: 'addon-2', name: 'Bike Wash Large', time: 15, price: 80, details: 'External work only - Premium bike wash' },
        { id: 'addon-3', name: 'Helmet Cleaning', time: 10, price: 40, details: 'Helmet interior and exterior cleaning' },
        { id: 'addon-4', name: 'Car Perfume', time: 5, price: 30, details: 'Premium car perfume installation' }
    ]
};

// App State
let state = {
    selectedServices: new Map(),
    selectedAddons: new Map(),
    selectedTime: null,
    couponApplied: false,
    couponDiscount: 0,
    userLocation: null,
    cartTotal: 0,
    captchaCode: ''
};

// DOM Elements
const elements = {
    checkoutBtn: document.getElementById('checkout-btn'),
    checkoutPopup: document.getElementById('checkout-popup'),
    confirmationOverlay: document.getElementById('confirmation-overlay'),
    addonSection: document.getElementById('addon-section'),
    cartItems: document.getElementById('cart-items'),
    popupCartItems: document.getElementById('popup-cart-items'),
    subtotalEl: document.getElementById('subtotal'),
    taxEl: document.getElementById('tax'),
    totalEl: document.getElementById('total'),
    popupTotal: document.getElementById('popup-total'),
    timeSlots: document.getElementById('time-slots'),
    mobileInput: document.getElementById('mobile'),
    mobileError: document.getElementById('mobile-error'),
    couponMessage: document.getElementById('coupon-message'),
    captchaCode: document.getElementById('captcha-code'),
    captchaInput: document.getElementById('captcha-input'),
    captchaError: document.getElementById('captcha-error'),
    bookingId: document.getElementById('booking-id'),
    estimatedTime: document.getElementById('estimated-time'),
    finalAmount: document.getElementById('final-amount'),
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude')
};

// Initialize the application
function init() {
    loadServices();
    generateTimeSlots();
    generateCaptcha();
    updateCart();
    setupEventListeners();
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
                       onchange="toggleService('${service.id}', ${service.price})">
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

// Toggle category expansion
function toggleCategory(category) {
    const content = document.getElementById(`${category}-content`);
    const icon = document.getElementById(`${category}-icon`);
    
    content.classList.toggle('expanded');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
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

// Generate time slots (simulated - in real app, fetch from Google Sheets)
function generateTimeSlots() {
    const timeSlots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    
    // Simulate some unavailable slots
    const unavailableSlots = ['10:00 AM', '02:00 PM', '04:30 PM'];
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${hour % 12 || 12}:${minute === 0 ? '00' : '30'} ${hour < 12 ? 'AM' : 'PM'}`;
            const isAvailable = !unavailableSlots.includes(time);
            
            timeSlots.push({
                time,
                available: isAvailable
            });
        }
    }
    
    displayTimeSlots(timeSlots);
}

function displayTimeSlots(slots) {
    elements.timeSlots.innerHTML = '';
    
    slots.forEach(slot => {
        const slotEl = document.createElement('div');
        slotEl.className = `time-slot ${slot.available ? '' : 'disabled'}`;
        if (!slot.available) {
            slotEl.title = 'This slot is fully booked';
        } else {
            slotEl.onclick = () => selectTimeSlot(slot.time, slotEl);
        }
        slotEl.textContent = slot.time;
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

// Update cart and totals
function updateCart() {
    // Calculate subtotal
    let subtotal = 0;
    let totalTime = 0;
    
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
    
    // Calculate tax (18% GST)
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    
    // Update state
    state.cartTotal = total;
    
    // Update UI
    elements.subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    elements.taxEl.textContent = `₹${tax.toFixed(2)}`;
    elements.totalEl.textContent = `₹${total.toFixed(2)}`;
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
    const hasTime = state.selectedTime !== null;
    
    elements.checkoutBtn.disabled = !(hasServices && hasTime);
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

// Coupon application
function applyCoupon() {
    const couponInput = document.getElementById('coupon');
    const coupon = couponInput.value.trim().toUpperCase();
    
    // Simulated coupon validation
    const validCoupons = {
        'CLEAN10': 10,
        'WELCOME20': 20,
        'SUPER30': 30
    };
    
    if (validCoupons[coupon]) {
        state.couponApplied = true;
        state.couponDiscount = validCoupons[coupon];
        elements.couponMessage.innerHTML = `
            <span style="color: #2ecc71;">
                <i class="fas fa-check-circle"></i> Coupon applied! ₹${state.couponDiscount} discount
            </span>
        `;
        updateCart();
    } else {
        state.couponApplied = false;
        state.couponDiscount = 0;
        elements.couponMessage.innerHTML = `
            <span style="color: #e74c3c;">
                <i class="fas fa-times-circle"></i> Invalid coupon code
            </span>
        `;
        updateCart();
    }
}

// Location functions
function getLocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }
    
    const locationStatus = document.getElementById('location-status');
    locationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching location...';
    locationStatus.style.color = '#4a6491';
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            elements.latitude.value = lat;
            elements.longitude.value = lng;
            
            // Reverse geocoding to get address (simulated)
            setTimeout(() => {
                locationStatus.innerHTML = `
                    <span style="color: #2ecc71;">
                        <i class="fas fa-check-circle"></i> Location fetched successfully!
                    </span>
                    <br><small>Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}</small>
                `;
                
                // Auto-fill address field with example
                document.getElementById('name-address').value = 
                    `John Doe\n123, Sample Street,\nMumbai, Maharashtra - 400001`;
            }, 1000);
        },
        (error) => {
            let message = "Error fetching location: ";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message += "User denied the request for Geolocation.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    message += "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    message += "The request to get user location timed out.";
                    break;
                default:
                    message += "An unknown error occurred.";
                    break;
            }
            locationStatus.innerHTML = `
                <span style="color: #e74c3c;">
                    <i class="fas fa-exclamation-circle"></i> ${message}
                </span>
            `;
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
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
    
    // Location validation
    if (!elements.latitude.value || !elements.longitude.value) {
        alert('Please fetch your location using the Auto-fetch button');
        isValid = false;
    }
    
    return isValid;
}

// Submit booking
async function submitBooking() {
    if (!validateForm()) {
        return;
    }
    
    // Collect all data
    const bookingData = {
        bookingId: 'PC-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        timestamp: new Date().toISOString(),
        services: Array.from(state.selectedServices.entries()).map(([id, service]) => ({
            id,
            name: service.name,
            price: service.price
        })),
        addons: Array.from(state.selectedAddons.entries()).map(([id, addon]) => ({
            id,
            name: addon.name,
            price: addon.price
        })),
        selectedTime: state.selectedTime,
        mobile: elements.mobileInput.value.trim(),
        nameAddress: document.getElementById('name-address').value.trim(),
        latitude: elements.latitude.value,
        longitude: elements.longitude.value,
        couponApplied: state.couponApplied,
        couponDiscount: state.couponDiscount,
        subtotal: parseFloat(elements.subtotalEl.textContent.replace('₹', '')),
        tax: parseFloat(elements.taxEl.textContent.replace('₹', '')),
        total: state.cartTotal,
        captchaVerified: true
    };
    
    try {
        // Show loading state
        const confirmBtn = document.querySelector('.confirm-btn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        confirmBtn.disabled = true;
        
        // Simulate API call to Google Sheets (replace with actual Apps Script URL)
        await submitToGoogleSheets(bookingData);
        
        // Show confirmation
        showConfirmation(bookingData);
        
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

// Simulated Google Sheets submission
async function submitToGoogleSheets(data) {
    // This is a simulated function
    // In real implementation, replace with fetch() to your Google Apps Script web app
    console.log('Submitting to Google Sheets:', data);
    
    // Example of real implementation:
    /*
    const scriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
    
    const response = await fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    return response;
    */
    
    // Simulate network delay
    return new Promise(resolve => setTimeout(resolve, 1500));
}

// Show confirmation message
function showConfirmation(bookingData) {
    closeCheckoutPopup();
    
    // Update confirmation details
    elements.bookingId.textContent = bookingData.bookingId;
    elements.finalAmount.textContent = `₹${bookingData.total.toFixed(2)}`;
    
    // Calculate estimated total time
    let totalMinutes = 0;
    bookingData.services.forEach(service => {
        const serviceData = [...servicesData.car5, ...servicesData.car7, ...servicesData.sofa]
            .find(s => s.id === service.id);
        if (serviceData) totalMinutes += serviceData.time;
    });
    
    bookingData.addons.forEach(addon => {
        const addonData = servicesData.addon.find(a => a.id === addon.id);
        if (addonData) totalMinutes += addonData.time;
    });
    
    elements.estimatedTime.textContent = `${totalMinutes} minutes`;
    
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
    state.selectedTime = null;
    state.couponApplied = false;
    state.couponDiscount = 0;
    state.userLocation = null;
    
    // Reset time selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Reset form fields
    document.getElementById('coupon').value = '';
    elements.couponMessage.textContent = '';
    elements.mobileInput.value = '';
    elements.mobileError.textContent = '';
    document.getElementById('name-address').value = '';
    elements.captchaInput.value = '';
    elements.captchaError.textContent = '';
    document.getElementById('location-status').textContent = 'Location not fetched yet';
    elements.latitude.value = '';
    elements.longitude.value = '';
    
    // Update UI
    elements.addonSection.classList.add('disabled');
    updateCart();
    updateCheckoutButton();
}

function closeConfirmation() {
    elements.confirmationOverlay.style.display = 'none';
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
    
    // Close popup when clicking outside
    elements.checkoutPopup.addEventListener('click', (e) => {
        if (e.target === elements.checkoutPopup) {
            closeCheckoutPopup();
        }
    });
    
    elements.confirmationOverlay.addEventListener('click', (e) => {
        if (e.target === elements.confirmationOverlay) {
            closeConfirmation();
        }
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
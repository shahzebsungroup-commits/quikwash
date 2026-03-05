// ========== CONFIGURATION ==========
const CONFIG = {
    API_BASE: "https://app.vbo.co.in",
    EMPLOYEE_CODE: "001",
    GST_RATE: 18, // 18%
    UPI_ID: "kwikkwash@okhdfcbank",
    COMPLETED_DAYS_LIMIT: 7, // Last 7 days
    CLIENT: "KWIKKWASH",
    DEFAULT_RATE: 500, // Default rate per unit if total_amount not available
    SEARCH_MIN_CHARS: 3
};

// ========== STATE ==========
let currentEmployee = null;
let currentCity = null;
let currentCompleteBooking = null;
let selectedPaymentMode = null;
let currentRejectBooking = null;
let confirmResolve = null;

// Store all bookings for search
let allPendingBookings = [];
let allCompletedBookings = [];
let allCancelledBookings = [];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadEmployeeData();
    await loadAllTasks();
    
    // Add QR code library
    await loadQRCodeLibrary();
    
    // Setup search
    setupSearch();
    
    // Refresh every 30 seconds
    setInterval(loadAllTasks, 30000);
});

// Load QRCode library dynamically
function loadQRCodeLibrary() {
    return new Promise((resolve) => {
        if (window.QRCode) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = resolve;
        script.onerror = () => {
            console.log('QR library failed to load, using fallback');
            resolve();
        };
        document.head.appendChild(script);
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (searchTerm.length >= CONFIG.SEARCH_MIN_CHARS) {
                performSearch(searchTerm);
            } else {
                // Reset to original views
                displayPendingTasks(allPendingBookings);
                displayCompletedTasks(allCompletedBookings);
                displayCancelledTasks(allCancelledBookings);
            }
        });
    }
}

function performSearch(term) {
    // Search in pending bookings
    const filteredPending = allPendingBookings.filter(booking => 
        (booking.booking_id?.toLowerCase().includes(term)) ||
        (booking.customer_name?.toLowerCase().includes(term)) ||
        (booking.phone?.toLowerCase().includes(term)) ||
        (booking.service_code?.toLowerCase().includes(term)) ||
        (booking.address?.toLowerCase().includes(term))
    );
    
    // Search in completed bookings
    const filteredCompleted = allCompletedBookings.filter(booking => 
        (booking.booking_id?.toLowerCase().includes(term)) ||
        (booking.customer_name?.toLowerCase().includes(term)) ||
        (booking.phone?.toLowerCase().includes(term)) ||
        (booking.service_code?.toLowerCase().includes(term)) ||
        (booking.address?.toLowerCase().includes(term))
    );
    
    // Search in cancelled bookings
    const filteredCancelled = allCancelledBookings.filter(booking => 
        (booking.booking_id?.toLowerCase().includes(term)) ||
        (booking.customer_name?.toLowerCase().includes(term)) ||
        (booking.phone?.toLowerCase().includes(term)) ||
        (booking.service_code?.toLowerCase().includes(term)) ||
        (booking.address?.toLowerCase().includes(term))
    );
    
    displayPendingTasks(filteredPending);
    displayCompletedTasks(filteredCompleted);
    displayCancelledTasks(filteredCancelled);
}

// ========== EMPLOYEE DATA LOADING ==========
async function loadEmployeeData() {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/employees/${CONFIG.EMPLOYEE_CODE}`
        );
        const data = await response.json();
        
        if (data && data.error) {
            showError("Employee not found!");
            return;
        }
        
        currentEmployee = data || {};
        currentCity = data?.city || '';
        
        document.getElementById('employeeInfo').textContent = 
            `👤 ${data?.employee_name || 'Employee'} (${CONFIG.EMPLOYEE_CODE})`;
        document.getElementById('cityInfo').textContent = 
            `📍 ${data?.city || 'City not assigned'}`;
            
    } catch (error) {
        console.error('Error loading employee:', error);
        document.getElementById('employeeInfo').textContent = `👤 Employee (${CONFIG.EMPLOYEE_CODE})`;
    }
}

// ========== TASKS LOADING ==========
async function loadAllTasks() {
    await Promise.all([
        loadRunningTask(),
        loadPendingTasks(),
        loadCompletedTasks(),
        loadCancelledTasks() // New function for cancelled tasks
    ]);
}

async function loadRunningTask() {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/employee/${CONFIG.EMPLOYEE_CODE}`
        );
        const data = await response.json();
        
        // Handle different response formats
        let bookings = [];
        if (Array.isArray(data)) {
            bookings = data;
        } else if (data?.data && Array.isArray(data.data)) {
            bookings = data.data;
        } else if (data?.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        }
        
        // Filter running tasks - status not done/cancelled
        const runningBookings = bookings.filter(b => 
            b && b.status && 
            b.status !== 'done' && 
            b.status !== 'completed' && 
            b.status !== 'cancelled' && 
            b.status !== 'canceled'
        );
        
        document.getElementById('runningCount').textContent = runningBookings.length;
        
        if (runningBookings.length === 0) {
            document.getElementById('runningTasks').innerHTML = 
                '<div class="empty-state">No running task</div>';
            return;
        }
        
        const html = runningBookings.map(booking => createTaskCard(booking, 'running')).join('');
        document.getElementById('runningTasks').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading running task:', error);
        document.getElementById('runningTasks').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
    }
}

async function loadPendingTasks() {
    try {
        if (!currentCity) {
            document.getElementById('pendingTasks').innerHTML = 
                '<div class="empty-state">City not assigned</div>';
            return;
        }
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings?city=${encodeURIComponent(currentCity)}`
        );
        const data = await response.json();
        
        // Handle different response formats
        let bookings = [];
        if (Array.isArray(data)) {
            bookings = data;
        } else if (data?.data && Array.isArray(data.data)) {
            bookings = data.data;
        } else if (data?.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        }
        
        allPendingBookings = bookings.filter(b => 
            b && (b.status === 'pending' || b.status === 'Pending' || b.status === 'PENDING') && 
            (!b.assigned_employee_code || b.assigned_employee_code === '' || b.assigned_employee_code === null)
        );
        
        // Sort: oldest first (by booking_date)
        allPendingBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateA - dateB; // Ascending = oldest first
        });
        
        document.getElementById('pendingCount').textContent = allPendingBookings.length;
        
        displayPendingTasks(allPendingBookings);
        
    } catch (error) {
        console.error('Error loading pending tasks:', error);
        document.getElementById('pendingTasks').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
    }
}

async function loadCompletedTasks() {
    try {
        // Calculate date 7 days ago
        const date = new Date();
        date.setDate(date.getDate() - CONFIG.COMPLETED_DAYS_LIMIT);
        const startDate = date.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/date?start_date=${startDate}&end_date=${endDate}`
        );
        const data = await response.json();
        
        // Handle different response formats
        let bookings = [];
        if (Array.isArray(data)) {
            bookings = data;
        } else if (data?.data && Array.isArray(data.data)) {
            bookings = data.data;
        } else if (data?.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        }
        
        allCompletedBookings = bookings.filter(b => 
            b && (b.status === 'done' || b.status === 'completed') && 
            b.assigned_employee_code === CONFIG.EMPLOYEE_CODE
        );
        
        // Sort: newest first (by completion date/booking_date)
        allCompletedBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateB - dateA; // Descending = newest first
        });
        
        document.getElementById('completedCount').textContent = allCompletedBookings.length;
        
        displayCompletedTasks(allCompletedBookings);
        
    } catch (error) {
        console.error('Error loading completed tasks:', error);
        document.getElementById('completedTasks').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
    }
}

async function loadCancelledTasks() {
    try {
        // Calculate date 7 days ago
        const date = new Date();
        date.setDate(date.getDate() - CONFIG.COMPLETED_DAYS_LIMIT);
        const startDate = date.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/date?start_date=${startDate}&end_date=${endDate}`
        );
        const data = await response.json();
        
        // Handle different response formats
        let bookings = [];
        if (Array.isArray(data)) {
            bookings = data;
        } else if (data?.data && Array.isArray(data.data)) {
            bookings = data.data;
        } else if (data?.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        }
        
        allCancelledBookings = bookings.filter(b => 
            b && (b.status === 'cancelled' || b.status === 'canceled') && 
            b.assigned_employee_code === CONFIG.EMPLOYEE_CODE
        );
        
        // Sort: newest first (by cancellation date/booking_date)
        allCancelledBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateB - dateA; // Descending = newest first
        });
        
        displayCancelledTasks(allCancelledBookings);
        
    } catch (error) {
        console.error('Error loading cancelled tasks:', error);
    }
}

// ========== DISPLAY FUNCTIONS ==========
function displayPendingTasks(bookings) {
    if (bookings.length === 0) {
        document.getElementById('pendingTasks').innerHTML = 
            '<div class="empty-state">No pending tasks</div>';
        return;
    }
    
    // Check if employee has running task
    checkRunningTask().then(hasRunningTask => {
        const html = bookings.map(booking => 
            createTaskCard(booking, 'pending', hasRunningTask)
        ).join('');
        document.getElementById('pendingTasks').innerHTML = html;
    });
}

function displayCompletedTasks(bookings) {
    if (bookings.length === 0) {
        document.getElementById('completedTasks').innerHTML = 
            '<div class="empty-state">No completed tasks in last 7 days</div>';
        return;
    }
    
    const html = bookings.map(booking => createTaskCard(booking, 'completed')).join('');
    document.getElementById('completedTasks').innerHTML = html;
}

function displayCancelledTasks(bookings) {
    const cancelledSection = document.getElementById('cancelledTasks');
    if (!cancelledSection) return;
    
    if (bookings.length === 0) {
        cancelledSection.innerHTML = 
            '<div class="empty-state">No cancelled tasks in last 7 days</div>';
        return;
    }
    
    const html = bookings.map(booking => createTaskCard(booking, 'cancelled')).join('');
    cancelledSection.innerHTML = html;
}

// Helper to check if employee has running task
async function checkRunningTask() {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/employee/${CONFIG.EMPLOYEE_CODE}`
        );
        const data = await response.json();
        
        let bookings = [];
        if (Array.isArray(data)) bookings = data;
        else if (data?.data) bookings = data.data;
        
        return bookings.some(b => 
            b && b.status && 
            b.status !== 'done' && 
            b.status !== 'completed' && 
            b.status !== 'cancelled' && 
            b.status !== 'canceled'
        );
    } catch (error) {
        console.error('Error checking running task:', error);
        return false;
    }
}

// Create task card with all required elements
function createTaskCard(booking, type, hasRunningTask = false) {
    const bookingId = booking?.booking_id || booking?.id || 'N/A';
    const customerName = booking?.customer_name || booking?.name || 'Customer';
    const phone = booking?.phone || '';
    const serviceCode = booking?.service_code || booking?.service || 'Service';
    const bookingDate = booking?.booking_date || booking?.date || '';
    const address = booking?.address || 'Address not available';
    const amount = booking?.total_amount || booking?.service_units || 0;
    const lat = booking?.lat || null;
    const lng = booking?.lng || null;
    const status = booking?.status || type;
    
    // Format phone for WhatsApp
    const whatsappUrl = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : '#';
    const callUrl = phone ? `tel:${phone}` : '#';
    
    let actions = '';
    
    if (type === 'running') {
        actions = `
            <div class="task-actions">
                <button class="btn btn-success" onclick="openCompleteModal('${bookingId}')">
                    ✅ Complete
                </button>
                <button class="btn btn-danger" onclick="openRejectModal('${bookingId}')">
                    ❌ Reject
                </button>
                ${lat && lng ? `
                    <button class="btn btn-warning" onclick="openDirections(${lat}, ${lng})">
                        🗺️
                    </button>
                ` : ''}
            </div>
        `;
    } else if (type === 'pending') {
        actions = `
            <div class="task-actions">
                <button class="btn btn-primary" 
                        onclick="pickTask('${bookingId}')"
                        ${hasRunningTask ? 'disabled' : ''}>
                    📌 Pick
                </button>
                ${lat && lng ? `
                    <button class="btn btn-warning" onclick="openDirections(${lat}, ${lng})">
                        🗺️
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    return `
        <div class="task-card ${type}">
            <div class="task-header">
                <span class="booking-id">📋 ${bookingId}</span>
                <span class="time-badge">${bookingDate}</span>
            </div>
            <div class="customer-info">
                <div class="customer-name">
                    ${customerName}
                    <span class="contact-actions">
                        ${phone ? `
                            <a href="${callUrl}" class="contact-btn" title="Call">📞</a>
                            <a href="${whatsappUrl}" class="contact-btn" title="WhatsApp" target="_blank">💬</a>
                        ` : ''}
                    </span>
                </div>
                <div class="service-name">${serviceCode} | ₹${amount}</div>
                <div class="task-address">
                    📍 ${address}
                </div>
                ${booking.employee_remark ? `
                    <div class="task-remark">
                        📝 Remark: ${booking.employee_remark}
                    </div>
                ` : ''}
            </div>
            ${actions}
        </div>
    `;
}

// ========== TASK ACTIONS ==========
async function pickTask(bookingId) {
    if (!await confirmAction('Pick Task', 'Do you want to pick this task?')) {
        return;
    }
    
    try {
        // First get current booking data
        const bookingResponse = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/${bookingId}`
        );
        const bookingData = await bookingResponse.json();
        
        // Update booking with employee code and status - preserve all fields
        const response = await fetch(`${CONFIG.API_BASE}/kwikkwash/bookings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: bookingId,
                assigned_employee_code: CONFIG.EMPLOYEE_CODE,
                status: 'assigned',
                // Preserve existing data
                customer_name: bookingData?.customer_name || '',
                phone: bookingData?.phone || '',
                service_code: bookingData?.service_code || '',
                booking_date: bookingData?.booking_date || '',
                city: bookingData?.city || currentCity,
                service_units: bookingData?.service_units || 0,
                total_amount: bookingData?.total_amount || 0,
                address: bookingData?.address || '',
                lat: bookingData?.lat || null,
                lng: bookingData?.lng || null
            })
        });
        
        const result = await response.json();
        
        if (result?.status === 'success') {
            // Create job for employee
            await fetch(`${CONFIG.API_BASE}/kwikkwash/employee-jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_code: CONFIG.EMPLOYEE_CODE,
                    booking_id: bookingId,
                    status: 'assigned',
                    assigned_at: new Date().toISOString(),
                    service_code: bookingData?.service_code || ''
                })
            });
            
            showMessage('Task picked successfully!', 'success');
            await loadAllTasks();
        } else {
            showMessage('Failed to pick task', 'error');
        }
        
    } catch (error) {
        console.error('Error picking task:', error);
        showMessage('Error picking task', 'error');
    }
}

function openDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

// ========== COMPLETE TASK FLOW ==========
async function openCompleteModal(bookingId) {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/${bookingId}`
        );
        currentCompleteBooking = await response.json();
        
        document.getElementById('modalBookingId').textContent = bookingId;
        document.getElementById('modalCustomerName').textContent = 
            currentCompleteBooking?.customer_name || 'N/A';
        document.getElementById('modalServiceName').textContent = 
            currentCompleteBooking?.service_code || 'N/A';
        
        document.getElementById('paymentModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading booking:', error);
        showMessage('Failed to load booking details', 'error');
    }
}

function selectPaymentMode(mode) {
    selectedPaymentMode = mode;
    
    // Update UI
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Show relevant section
    if (mode === 'online') {
        document.getElementById('onlinePaymentSection').style.display = 'block';
        document.getElementById('cashPaymentSection').style.display = 'none';
        
        // Show amount directly from booking's total_amount
        const amount = currentCompleteBooking?.total_amount || 
                      currentCompleteBooking?.service_units * CONFIG.DEFAULT_RATE || 
                      0;
        document.getElementById('onlineAmount').textContent = `₹${amount}`;
        
        setTimeout(() => generateBarcode(), 100);
    } else {
        document.getElementById('onlinePaymentSection').style.display = 'none';
        document.getElementById('cashPaymentSection').style.display = 'block';
        
        const amount = currentCompleteBooking?.total_amount || 
                      currentCompleteBooking?.service_units || 
                      0;
        document.getElementById('cashAmount').textContent = amount;
    }
    
    document.getElementById('confirmPaymentBtn').disabled = false;
}

async function generateBarcode() {
    try {
        // Clear previous QR code
        document.getElementById('barcode').innerHTML = '';
        
        // Directly get amount from booking's total_amount
        const totalAmount = currentCompleteBooking?.total_amount || 
                           currentCompleteBooking?.service_units * CONFIG.DEFAULT_RATE || 
                           0;
        
        if (totalAmount === 0) {
            throw new Error('Amount not available');
        }
        
        document.getElementById('onlineAmount').textContent = `₹${totalAmount}`;
        
        // Generate UPI QR Code
        const upiString = `upi://pay?pa=${CONFIG.UPI_ID}&pn=KwikkWash&am=${totalAmount}&cu=INR&tn=${currentCompleteBooking?.booking_id || 'TASK'}`;
        
        // Create QR code with fallback
        if (window.QRCode && typeof QRCode === 'function') {
            try {
                new QRCode(document.getElementById('barcode'), {
                    text: upiString,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (qrError) {
                throw new Error('QR generation failed');
            }
        } else {
            throw new Error('QR library not available');
        }
        
    } catch (error) {
        console.log('Using barcode fallback:', error);
        
        const totalAmount = currentCompleteBooking?.total_amount || 
                           currentCompleteBooking?.service_units * CONFIG.DEFAULT_RATE || 
                           0;
        
        document.getElementById('onlineAmount').textContent = `₹${totalAmount}`;
        
        // Simple fallback display
        document.getElementById('barcode').innerHTML = 
            `<div style="padding: 15px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 10px; text-align: center;">
                <p style="color: #856404; margin-bottom: 10px; font-size: 14px;">📱 Payment QR Code</p>
                <p style="font-weight: bold; font-size: 20px; margin: 10px 0;">₹${totalAmount}</p>
                <p style="font-size: 14px; margin: 5px 0;">UPI ID: ${CONFIG.UPI_ID}</p>
                <p style="font-size: 12px; color: #666; word-break: break-all; background: white; padding: 8px; border-radius: 5px;">
                    Ref: ${currentCompleteBooking?.booking_id || ''}
                </p>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    Scan any UPI app to pay
                </p>
            </div>`;
    }
}

async function confirmPayment() {
    if (!selectedPaymentMode) {
        showMessage('Please select payment mode', 'warning');
        return;
    }
    
    if (selectedPaymentMode === 'online' && !document.getElementById('paymentConfirmed').checked) {
        showMessage('Please confirm payment received', 'warning');
        return;
    }
    
    if (selectedPaymentMode === 'cash' && !document.getElementById('cashReceived').checked) {
        showMessage('Please confirm cash received', 'warning');
        return;
    }
    
    if (!await confirmAction('Complete Task', 'Mark this task as complete?')) {
        return;
    }
    
    try {
        // Update booking with payment info - preserve all fields
        const updateResponse = await fetch(`${CONFIG.API_BASE}/kwikkwash/bookings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: currentCompleteBooking?.booking_id,
                status: 'done',
                payment_status: 'done',
                payment_mode: selectedPaymentMode,
                // Preserve all other fields
                customer_name: currentCompleteBooking?.customer_name,
                phone: currentCompleteBooking?.phone,
                service_code: currentCompleteBooking?.service_code,
                booking_date: currentCompleteBooking?.booking_date,
                city: currentCompleteBooking?.city,
                service_units: currentCompleteBooking?.service_units,
                total_amount: currentCompleteBooking?.total_amount,
                address: currentCompleteBooking?.address,
                lat: currentCompleteBooking?.lat,
                lng: currentCompleteBooking?.lng,
                assigned_employee_code: currentCompleteBooking?.assigned_employee_code
            })
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult?.status === 'success') {
            // Update job status
            const jobsResponse = await fetch(
                `${CONFIG.API_BASE}/kwikkwash/employee-jobs?employee_code=${CONFIG.EMPLOYEE_CODE}`
            );
            const jobs = await jobsResponse.json();
            
            let jobsArray = [];
            if (Array.isArray(jobs)) {
                jobsArray = jobs;
            } else if (jobs?.data && Array.isArray(jobs.data)) {
                jobsArray = jobs.data;
            }
            
            const job = jobsArray.find(j => j?.booking_id === currentCompleteBooking?.booking_id);
            
            if (job?.id) {
                await fetch(`${CONFIG.API_BASE}/kwikkwash/employee-jobs/${job.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' })
                });
            }
            
            closePaymentModal();
            showMessage('Task completed successfully!', 'success');
            await loadAllTasks();
        } else {
            showMessage('Failed to update booking', 'error');
        }
        
    } catch (error) {
        console.error('Error completing task:', error);
        showMessage('Error completing task', 'error');
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    selectedPaymentMode = null;
    currentCompleteBooking = null;
    document.getElementById('onlinePaymentSection').style.display = 'none';
    document.getElementById('cashPaymentSection').style.display = 'none';
    document.getElementById('confirmPaymentBtn').disabled = true;
    document.getElementById('barcode').innerHTML = '';
}

// ========== REJECT TASK ==========
function openRejectModal(bookingId) {
    currentRejectBooking = bookingId;
    document.getElementById('rejectModal').classList.add('active');
}

function closeRejectModal() {
    document.getElementById('rejectModal').classList.remove('active');
    document.getElementById('rejectReason').value = '';
    currentRejectBooking = null;
}

async function confirmReject() {
    const reason = document.getElementById('rejectReason').value.trim();
    
    if (!reason) {
        showMessage('Please enter rejection reason', 'warning');
        return;
    }
    
    if (!await confirmAction('Reject Task', 'Are you sure you want to reject this task?')) {
        return;
    }
    
    try {
        // FIRST: Get current booking data to preserve all fields
        const bookingResponse = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/${currentRejectBooking}`
        );
        
        if (!bookingResponse.ok) {
            throw new Error('Failed to fetch booking data');
        }
        
        const bookingData = await bookingResponse.json();
        
        // Prepare update payload with ALL existing fields preserved
        const updatePayload = {
            // Core identifiers
            booking_id: currentRejectBooking,
            
            // Preserve ALL existing fields with fallbacks
            customer_name: bookingData?.customer_name || '',
            phone: bookingData?.phone || '',
            service_code: bookingData?.service_code || '',
            booking_date: bookingData?.booking_date || '',
            city: bookingData?.city || currentCity || '',
            service_units: bookingData?.service_units || 0,
            total_amount: bookingData?.total_amount || 0,
            address: bookingData?.address || '',
            lat: bookingData?.lat || null,
            lng: bookingData?.lng || null,
            assigned_employee_code: bookingData?.assigned_employee_code || CONFIG.EMPLOYEE_CODE,
            payment_status: bookingData?.payment_status || '',
            payment_mode: bookingData?.payment_mode || '',
            slot: bookingData?.slot || '',
            customer_remark: bookingData?.customer_remark || '',
            
            // Only update these two fields
            status: 'cancelled',
            employee_remark: reason
        };
        
        // Remove any undefined values
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });
        
        // THEN: Update with all fields preserved
        const response = await fetch(`${CONFIG.API_BASE}/kwikkwash/bookings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update booking');
        }
        
        const result = await response.json();
        
        if (result?.status === 'success') {
            closeRejectModal();
            showMessage('Task rejected successfully', 'success');
            await loadAllTasks();
        } else {
            showMessage(result?.message || 'Failed to reject task', 'error');
        }
        
    } catch (error) {
        console.error('Error rejecting task:', error);
        showMessage('Error rejecting task: ' + error.message, 'error');
    }
}

// ========== CONFIRMATION MODAL ==========
function confirmAction(title, message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
    });
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
}

function executeConfirmedAction() {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
}

// ========== UTILITY FUNCTIONS ==========
function showMessage(message, type = 'info') {
    alert(`${type.toUpperCase()}: ${message}`);
}

function showError(message) {
    console.error(message);
    alert(`ERROR: ${message}`);
}

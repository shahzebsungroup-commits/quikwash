const CONFIG = {
    API_BASE: "https://app.vbo.co.in",
    EMPLOYEE_CODE: "002",
    GST_RATE: 18,
    UPI_ID: "6395962806@okbizaxis",
    COMPLETED_DAYS_LIMIT: 7,
    CLIENT: "KWIKKWASH",
    DEFAULT_RATE: 500,
    SEARCH_MIN_CHARS: 3
};

let currentEmployee = null;
let currentCity = null;
let currentCompleteBooking = null;
let selectedPaymentMode = null;
let currentRejectBooking = null;
let confirmResolve = null;
let activeSection = 'running';

let allPendingBookings = [];
let allCompletedBookings = [];
let allCancelledBookings = [];
const actionLocks = new Set();

const STATUS_COUNT_IDS = {
    running: { section: 'runningCount', guide: 'runningGuideCount' },
    pending: { section: 'pendingCount', guide: 'pendingGuideCount' },
    completed: { section: 'completedCount', guide: 'completedGuideCount' },
    cancelled: { section: 'cancelledCount', guide: 'cancelledGuideCount' }
};

function showToast(message, type = 'info', duration = 3000) {
    const existingToast = document.getElementById('customToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'customToast';
    
    const colors = {
        success: { bg: '#2ecc71', icon: '[OK]' },
        error: { bg: '#e74c3c', icon: '[X]' },
        warning: { bg: '#f39c12', icon: '[!]' },
        info: { bg: '#3498db', icon: '[i]' }
    };
    
    const color = colors[type] || colors.info;
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: color.bg,
        color: 'white',
        padding: '15px 25px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '9999',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '250px',
        maxWidth: '350px',
        animation: 'slideIn 0.3s ease-out',
        cursor: 'pointer'
    });
    
    toast.innerHTML = `
        <span style="font-size: 20px;">${color.icon}</span>
        <span style="flex: 1;">${message}</span>
        <span style="font-size: 12px; opacity: 0.7;">${Math.round(duration/1000)}s</span>
    `;
    
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.style.animation = 'fadeOut 0.5s ease-out';
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.remove();
                }
            }, 500);
        }
    }, duration);
    
    toast.addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, 300);
    });
}

function lockAction(actionKey, buttonEl = null) {
    if (!actionKey || actionLocks.has(actionKey)) {
        return false;
    }
    actionLocks.add(actionKey);
    if (buttonEl) {
        buttonEl.disabled = true;
    }
    return true;
}

function unlockAction(actionKey, buttonEl = null) {
    if (!actionKey) {
        return;
    }
    actionLocks.delete(actionKey);
    if (buttonEl) {
        buttonEl.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupSectionAccordion();

    await loadEmployeeData();
    await loadAllTasks();
    
    await loadQRCodeLibrary();
    setupSearch();
    
    setInterval(loadAllTasks, 30000);
});

function setStatusCount(status, count) {
    const ids = STATUS_COUNT_IDS[status];
    if (!ids) return;
    
    const safeCount = Number.isFinite(count) ? count : 0;
    
    const sectionBadge = document.getElementById(ids.section);
    if (sectionBadge) {
        sectionBadge.textContent = safeCount;
    }
    
    const guideBadge = document.getElementById(ids.guide);
    if (guideBadge) {
        guideBadge.textContent = safeCount;
    }
}

function setupSectionAccordion() {
    const sectionButtons = document.querySelectorAll('[data-toggle-section]');
    const guideCards = document.querySelectorAll('.guide-card[data-section]');
    
    if (!sectionButtons.length) return;
    
    sectionButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toggleSection(button.dataset.toggleSection);
        });
    });
    
    guideCards.forEach((card) => {
        card.addEventListener('click', () => {
            expandSection(card.dataset.section, true);
        });
        
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                expandSection(card.dataset.section, true);
            }
        });
    });
    
    expandSection(activeSection, false);
}

function toggleSection(sectionKey) {
    if (!sectionKey) return;
    
    const targetSection = document.querySelector(`.status-section[data-section="${sectionKey}"]`);
    if (!targetSection) return;
    
    const isExpanded = targetSection.classList.contains('expanded');
    if (isExpanded) {
        targetSection.classList.remove('expanded');
        targetSection.classList.add('collapsed');
        
        const button = targetSection.querySelector('[data-toggle-section]');
        if (button) {
            button.setAttribute('aria-expanded', 'false');
        }
        
        activeSection = '';
        document.querySelectorAll('.guide-card[data-section]').forEach((card) => {
            card.classList.remove('active');
        });
        return;
    }
    
    expandSection(sectionKey, false);
}

function expandSection(sectionKey, shouldScroll = false) {
    if (!sectionKey) return;
    
    activeSection = sectionKey;
    
    const sections = document.querySelectorAll('.status-section[data-section]');
    sections.forEach((section) => {
        const isActive = section.dataset.section === sectionKey;
        section.classList.toggle('expanded', isActive);
        section.classList.toggle('collapsed', !isActive);
        
        const button = section.querySelector('[data-toggle-section]');
        if (button) {
            button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }
    });
    
    const guideCards = document.querySelectorAll('.guide-card[data-section]');
    guideCards.forEach((card) => {
        card.classList.toggle('active', card.dataset.section === sectionKey);
    });
    
    if (shouldScroll) {
        const targetSection = document.querySelector(`.status-section[data-section="${sectionKey}"]`);
        if (targetSection) {
            const targetTop = targetSection.getBoundingClientRect().top + window.pageYOffset - 8;
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
    }
}

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

function setupSearch() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (searchTerm.length >= CONFIG.SEARCH_MIN_CHARS) {
                performSearch(searchTerm);
            } else {
                displayPendingTasks(allPendingBookings);
                displayCompletedTasks(allCompletedBookings);
                displayCancelledTasks(allCancelledBookings);
            }
        });
    }
}

function performSearch(term) {
    const filteredPending = allPendingBookings.filter(booking => 
        (booking.booking_id?.toLowerCase().includes(term)) ||
        (booking.customer_name?.toLowerCase().includes(term)) ||
        (booking.phone?.toLowerCase().includes(term)) ||
        (booking.service_code?.toLowerCase().includes(term)) ||
        (booking.address?.toLowerCase().includes(term))
    );
    
    const filteredCompleted = allCompletedBookings.filter(booking => 
        (booking.booking_id?.toLowerCase().includes(term)) ||
        (booking.customer_name?.toLowerCase().includes(term)) ||
        (booking.phone?.toLowerCase().includes(term)) ||
        (booking.service_code?.toLowerCase().includes(term)) ||
        (booking.address?.toLowerCase().includes(term))
    );
    
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

async function loadEmployeeData() {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/employees/${CONFIG.EMPLOYEE_CODE}`
        );
        const data = await response.json();
        
        if (data && data.error) {
            showToast("Employee not found!", 'error');
            return;
        }
        
        currentEmployee = data || {};
        currentCity = data?.city || '';
        
        document.getElementById('employeeInfo').textContent = 
            `${data?.employee_name || 'Employee'} (${CONFIG.EMPLOYEE_CODE})`;
        document.getElementById('cityInfo').textContent = 
            `${data?.city || 'City not assigned'}`;
            
    } catch (error) {
        console.error('Error loading employee:', error);
        document.getElementById('employeeInfo').textContent = `Employee (${CONFIG.EMPLOYEE_CODE})`;
        showToast('Failed to load employee data', 'error');
    }
}

async function loadAllTasks() {
    await Promise.all([
        loadRunningTask(),
        loadPendingTasks(),
        loadCompletedTasks(),
        loadCancelledTasks()
    ]);
}

async function loadRunningTask() {
    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/employee/${CONFIG.EMPLOYEE_CODE}`
        );
        const data = await response.json();
        
        let bookings = [];
        if (Array.isArray(data)) {
            bookings = data;
        } else if (data?.data && Array.isArray(data.data)) {
            bookings = data.data;
        } else if (data?.bookings && Array.isArray(data.bookings)) {
            bookings = data.bookings;
        }
        
        const runningBookings = bookings.filter(b => 
            b && b.status && 
            b.status !== 'done' && 
            b.status !== 'completed' && 
            b.status !== 'cancelled' && 
            b.status !== 'canceled'
        );
        
        setStatusCount('running', runningBookings.length);
        
        if (runningBookings.length === 0) {
            document.getElementById('runningTasks').innerHTML = 
                '<div class="empty-state">No running task</div>';
            return;
        }
        
        runningBookings.sort((a, b) => {
            const slotA = a.slot || 'ZZZ';
            const slotB = b.slot || 'ZZZ';
            return slotA.localeCompare(slotB);
        });
        
        const html = runningBookings.map(booking => createTaskCard(booking, 'running')).join('');
        document.getElementById('runningTasks').innerHTML = html;
        
    } catch (error) {
        console.error('Error loading running task:', error);
        setStatusCount('running', 0);
        document.getElementById('runningTasks').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
        showToast('Failed to load running tasks', 'error');
    }
}

async function loadPendingTasks() {
    try {
        if (!currentCity) {
            setStatusCount('pending', 0);
            document.getElementById('pendingTasksContainer').innerHTML = 
                '<div class="empty-state">City not assigned</div>';
            return;
        }
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings?city=${encodeURIComponent(currentCity)}`
        );
        const data = await response.json();
        
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
        
        setStatusCount('pending', allPendingBookings.length);
        displayPendingTasks(allPendingBookings);
        
    } catch (error) {
        console.error('Error loading pending tasks:', error);
        setStatusCount('pending', 0);
        document.getElementById('pendingTasksContainer').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
        showToast('Failed to load pending tasks', 'error');
    }
}

function displayPendingTasks(bookings) {
    if (bookings.length === 0) {
        document.getElementById('pendingTasksContainer').innerHTML = 
            '<div class="empty-state">No pending tasks</div>';
        return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const slotDefinitions = [
        { name: '09-11', start: '09:00', end: '11:00', order: 1 },
        { name: '11-01', start: '11:00', end: '13:00', order: 2 },
        { name: '01-03', start: '13:00', end: '15:00', order: 3 },
        { name: '03-05', start: '15:00', end: '17:00', order: 4 }
    ];
    
    let nextSlotName = null;
    for (let slot of slotDefinitions) {
        if (currentTimeStr < slot.end) {
            nextSlotName = slot.name;
            break;
        }
    }
    
    const slots = {};
    
    bookings.forEach(booking => {
        const slot = booking.slot || 'No Slot';
        if (!slots[slot]) {
            slots[slot] = [];
        }
        slots[slot].push(booking);
    });
    
    const sortedSlots = Object.keys(slots).sort((a, b) => {
        const order = { '09-11': 1, '11-01': 2, '01-03': 3, '03-05': 4 };
        return (order[a] || 99) - (order[b] || 99);
    });
    
    let html = '';
    
    sortedSlots.forEach(slot => {
        slots[slot].sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateA - dateB;
        });
        
        const isNextSlot = (slot === nextSlotName);
        
        html += `<div class="slot-group">`;
        html += `<div class="slot-header">`;
        html += `<span>Slot: ${slot}</span>`;
        html += `<span class="slot-time">${slots[slot].length} tasks</span>`;
        html += `</div>`;
        
        html += `<div class="task-grid">`;
        
        slots[slot].forEach(booking => {
            const extraClass = isNextSlot ? 'next-slot' : '';
            html += createTaskCard(booking, 'pending', extraClass);
        });
        
        html += `</div>`;
        html += `</div>`;
    });
    
    document.getElementById('pendingTasksContainer').innerHTML = html;
}

async function loadCompletedTasks() {
    try {
        const date = new Date();
        date.setDate(date.getDate() - CONFIG.COMPLETED_DAYS_LIMIT);
        const startDate = date.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/date?start_date=${startDate}&end_date=${endDate}`
        );
        const data = await response.json();
        
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
        
        allCompletedBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateB - dateA;
        });
        
        setStatusCount('completed', allCompletedBookings.length);
        displayCompletedTasks(allCompletedBookings);
        
    } catch (error) {
        console.error('Error loading completed tasks:', error);
        setStatusCount('completed', 0);
        document.getElementById('completedTasks').innerHTML = 
            '<div class="empty-state">Error loading tasks</div>';
        showToast('Failed to load completed tasks', 'error');
    }
}

function displayCompletedTasks(bookings) {
    if (bookings.length === 0) {
        document.getElementById('completedTasks').innerHTML = 
            '<div class="empty-state">No completed tasks in last 7 days</div>';
        return;
    }
    
    bookings.sort((a, b) => {
        const slotA = a.slot || 'ZZZ';
        const slotB = b.slot || 'ZZZ';
        return slotA.localeCompare(slotB);
    });
    
    const html = bookings.map(booking => createTaskCard(booking, 'completed')).join('');
    document.getElementById('completedTasks').innerHTML = html;
}

async function loadCancelledTasks() {
    try {
        const date = new Date();
        date.setDate(date.getDate() - CONFIG.COMPLETED_DAYS_LIMIT);
        const startDate = date.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const response = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/filter/date?start_date=${startDate}&end_date=${endDate}`
        );
        const data = await response.json();
        
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
        
        allCancelledBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date || 0);
            const dateB = new Date(b.booking_date || 0);
            return dateB - dateA;
        });
        
        setStatusCount('cancelled', allCancelledBookings.length);
        displayCancelledTasks(allCancelledBookings);
        
    } catch (error) {
        console.error('Error loading cancelled tasks:', error);
        setStatusCount('cancelled', 0);
        showToast('Failed to load cancelled tasks', 'error');
    }
}

function displayCancelledTasks(bookings) {
    const cancelledSection = document.getElementById('cancelledTasks');
    if (!cancelledSection) return;
    
    if (bookings.length === 0) {
        cancelledSection.innerHTML = 
            '<div class="empty-state">No cancelled tasks in last 7 days</div>';
        return;
    }
    
    bookings.sort((a, b) => {
        const slotA = a.slot || 'ZZZ';
        const slotB = b.slot || 'ZZZ';
        return slotA.localeCompare(slotB);
    });
    
    const html = bookings.map(booking => createTaskCard(booking, 'cancelled')).join('');
    cancelledSection.innerHTML = html;
}

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

function createTaskCard(booking, type, extraClass = '') {
    const bookingId = booking?.booking_id || booking?.id || 'N/A';
    const customerName = booking?.customer_name || booking?.name || 'Customer';
    const phone = booking?.phone || '';
    const serviceCode = booking?.service_code || booking?.service || 'Service';
    const bookingDate = booking?.booking_date || '';
    const createdDate = booking?.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A';
    const slot = booking?.slot || 'No Slot';
    const address = booking?.address || 'Address not available';
    const amount = booking?.total_amount || booking?.service_units || 0;
    const lat = booking?.lat || null;
    const lng = booking?.lng || null;
    
    const whatsappUrl = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(customerName)}%2C%20this%20is%20${encodeURIComponent(currentEmployee?.employee_name || 'KwikkWash')}%20regarding%20your%20booking%20${bookingId}` : '#';
    const callUrl = phone ? `tel:${phone}` : '#';
    
    let actions = '';
    
    if (type === 'running') {
        actions = `
            <div class="task-actions">
                <button class="btn btn-success" onclick="openCompleteModal('${bookingId}')">
                    Complete
                </button>
                <button class="btn btn-danger" onclick="openRejectModal('${bookingId}')">
                    Reject
                </button>
                ${lat && lng ? `
                    <button class="btn btn-warning" onclick="openDirections(${lat}, ${lng})" title="Navigate">
                        Map
                    </button>
                ` : ''}
            </div>
        `;
    } else if (type === 'pending') {
        actions = `
            <div class="task-actions">
                <button class="btn btn-primary" 
                        onclick="pickTask('${bookingId}', this)"
                        id="pickBtn-${bookingId}">
                    Pick
                </button>
                ${lat && lng ? `
                    <button class="btn btn-warning" onclick="openDirections(${lat}, ${lng})" title="Navigate">
                        Map
                    </button>
                ` : ''}
            </div>
        `;
    } else {
        actions = `
            <div class="task-actions">
                ${lat && lng ? `
                    <button class="btn btn-warning" onclick="openDirections(${lat}, ${lng})" title="Navigate">
                        Map
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    if (type === 'pending') {
        checkRunningTask().then(hasRunningTask => {
            const btn = document.getElementById(`pickBtn-${bookingId}`);
            if (btn) {
                btn.disabled = hasRunningTask || actionLocks.has(`pick-${bookingId}`);
            }
        });
    }
    
    return `
        <div class="task-card ${type} ${extraClass}" data-booking-id="${bookingId}">
            <div class="task-header">
                <span class="booking-id">${bookingId}</span>
                <span class="slot-badge">${slot}</span>
            </div>
            <div class="customer-info">
                <div class="customer-name">
                    ${customerName}
                    <span class="contact-actions">
                        ${phone ? `
                            <a href="${callUrl}" class="contact-btn" title="Call">Call</a>
                            <a href="${whatsappUrl}" class="contact-btn" title="WhatsApp" target="_blank">Chat</a>
                        ` : ''}
                    </span>
                </div>
                <div class="service-name">${serviceCode} | Rs ${amount}</div>
                
                <div class="task-meta">
                    <span class="meta-item" title="Booking Date">
                        Date: ${bookingDate || 'N/A'}
                    </span>
                    <span class="meta-item" title="Created At">
                        Created: ${createdDate}
                    </span>
                </div>
                
                <div class="task-address" title="Address">
                    ${address}
                </div>
                
                ${booking.employee_remark ? `
                    <div class="task-remark">
                        Remark: ${booking.employee_remark}
                    </div>
                ` : ''}
            </div>
            ${actions}
        </div>
    `;
}

async function pickTask(bookingId, triggerButton = null) {
    const actionKey = `pick-${bookingId}`;
    if (!lockAction(actionKey, triggerButton)) {
        return;
    }

    if (!await confirmAction('Pick Task', 'Do you want to pick this task?')) {
        unlockAction(actionKey, triggerButton);
        return;
    }
    
    try {
        const bookingResponse = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/${bookingId}`
        );
        const bookingData = await bookingResponse.json();
        
        const response = await fetch(`${CONFIG.API_BASE}/kwikkwash/bookings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: bookingId,
                assigned_employee_code: CONFIG.EMPLOYEE_CODE,
                status: 'assigned',
                customer_name: bookingData?.customer_name || '',
                phone: bookingData?.phone || '',
                service_code: bookingData?.service_code || '',
                booking_date: bookingData?.booking_date || '',
                city: bookingData?.city || currentCity,
                service_units: bookingData?.service_units || 0,
                total_amount: bookingData?.total_amount || 0,
                address: bookingData?.address || '',
                lat: bookingData?.lat || null,
                lng: bookingData?.lng || null,
                slot: bookingData?.slot || ''
            })
        });
        
        const result = await response.json();
        
        if (result?.status === 'success') {
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
            
            showToast('Task picked successfully!', 'success');
            await loadAllTasks();
            return;
        }

        showToast('Failed to pick task', 'error');
        unlockAction(actionKey, triggerButton);
        
    } catch (error) {
        console.error('Error picking task:', error);
        showToast('Error picking task', 'error');
        unlockAction(actionKey, triggerButton);
    }
}

function openDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

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
        showToast('Failed to load booking details', 'error');
    }
}

function selectPaymentMode(mode, optionElement = null) {
    selectedPaymentMode = mode;
    
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    if (optionElement) {
        optionElement.classList.add('selected');
    }
    
    if (mode === 'online') {
        document.getElementById('onlinePaymentSection').style.display = 'block';
        document.getElementById('cashPaymentSection').style.display = 'none';
        
        const amount = currentCompleteBooking?.total_amount || 
                      currentCompleteBooking?.service_units * CONFIG.DEFAULT_RATE || 
                      0;
        document.getElementById('onlineAmount').textContent = `Rs ${amount}`;
        
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
        document.getElementById('barcode').innerHTML = '';
        
        const totalAmount = currentCompleteBooking?.total_amount || 
                           currentCompleteBooking?.service_units * CONFIG.DEFAULT_RATE || 
                           0;
        
        if (totalAmount === 0) {
            throw new Error('Amount not available');
        }
        
        document.getElementById('onlineAmount').textContent = `Rs ${totalAmount}`;
        
        const upiString = `upi://pay?pa=${CONFIG.UPI_ID}&pn=KwikkWash&am=${totalAmount}&cu=INR&tn=${currentCompleteBooking?.booking_id || 'TASK'}`;
        
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
        
        document.getElementById('onlineAmount').textContent = `Rs ${totalAmount}`;
        
        document.getElementById('barcode').innerHTML = 
            `<div style="padding: 15px; background: #fff3cd; border: 1px solid #ffeeba; border-radius: 10px; text-align: center;">
                <p style="color: #856404; margin-bottom: 10px; font-size: 14px;">Payment QR Code</p>
                <p style="font-weight: bold; font-size: 20px; margin: 10px 0;">Rs ${totalAmount}</p>
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

async function confirmPayment(triggerButton = null) {
    const confirmButton = triggerButton || document.getElementById('confirmPaymentBtn');
    const bookingId = currentCompleteBooking?.booking_id || 'unknown';
    const actionKey = `complete-${bookingId}`;
    if (!lockAction(actionKey, confirmButton)) {
        return;
    }

    if (!selectedPaymentMode) {
        showToast('Please select payment mode', 'warning');
        unlockAction(actionKey, confirmButton);
        return;
    }
    
    if (selectedPaymentMode === 'online' && !document.getElementById('paymentConfirmed').checked) {
        showToast('Please confirm payment received', 'warning');
        unlockAction(actionKey, confirmButton);
        return;
    }
    
    if (selectedPaymentMode === 'cash' && !document.getElementById('cashReceived').checked) {
        showToast('Please confirm cash received', 'warning');
        unlockAction(actionKey, confirmButton);
        return;
    }
    
    if (!await confirmAction('Complete Task', 'Mark this task as complete?')) {
        unlockAction(actionKey, confirmButton);
        return;
    }
    
    try {
        const updateResponse = await fetch(`${CONFIG.API_BASE}/kwikkwash/bookings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_id: currentCompleteBooking?.booking_id,
                status: 'done',
                payment_status: 'done',
                payment_mode: selectedPaymentMode,
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
                slot: currentCompleteBooking?.slot,
                assigned_employee_code: currentCompleteBooking?.assigned_employee_code
            })
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult?.status === 'success') {
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
            showToast('Task completed successfully!', 'success');
            await loadAllTasks();
            return;
        } else {
            showToast('Failed to update booking', 'error');
            unlockAction(actionKey, confirmButton);
        }
        
    } catch (error) {
        console.error('Error completing task:', error);
        showToast('Error completing task', 'error');
        unlockAction(actionKey, confirmButton);
    }
}

function closePaymentModal() {
    const bookingId = currentCompleteBooking?.booking_id;
    if (bookingId) {
        actionLocks.delete(`complete-${bookingId}`);
    }
    document.getElementById('paymentModal').classList.remove('active');
    selectedPaymentMode = null;
    currentCompleteBooking = null;
    document.getElementById('onlinePaymentSection').style.display = 'none';
    document.getElementById('cashPaymentSection').style.display = 'none';
    document.getElementById('confirmPaymentBtn').disabled = true;
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById('paymentConfirmed').checked = false;
    document.getElementById('cashReceived').checked = false;
    document.getElementById('barcode').innerHTML = '';
}

function openRejectModal(bookingId) {
    currentRejectBooking = bookingId;
    document.getElementById('rejectModal').classList.add('active');
}

function closeRejectModal() {
    document.getElementById('rejectModal').classList.remove('active');
    document.getElementById('rejectReason').value = '';
    const rejectBtn = document.getElementById('confirmRejectBtn');
    if (rejectBtn) {
        rejectBtn.disabled = false;
    }
    currentRejectBooking = null;
}

async function confirmReject(triggerButton = null) {
    const bookingId = currentRejectBooking || 'unknown';
    const actionKey = `reject-${bookingId}`;
    const rejectButton = triggerButton || document.getElementById('confirmRejectBtn');
    if (!lockAction(actionKey, rejectButton)) {
        return;
    }

    const reason = document.getElementById('rejectReason').value.trim();
    
    if (!reason) {
        showToast('Please enter rejection reason', 'warning');
        unlockAction(actionKey, rejectButton);
        return;
    }
    
    if (!await confirmAction('Reject Task', 'Are you sure you want to reject this task?')) {
        unlockAction(actionKey, rejectButton);
        return;
    }
    
    try {
        const bookingResponse = await fetch(
            `${CONFIG.API_BASE}/kwikkwash/bookings/${currentRejectBooking}`
        );
        
        if (!bookingResponse.ok) {
            throw new Error('Failed to fetch booking data');
        }
        
        const bookingData = await bookingResponse.json();
        
        const updatePayload = {
            booking_id: currentRejectBooking,
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
            slot: bookingData?.slot || '',
            assigned_employee_code: bookingData?.assigned_employee_code || CONFIG.EMPLOYEE_CODE,
            payment_status: bookingData?.payment_status || '',
            payment_mode: bookingData?.payment_mode || '',
            customer_remark: bookingData?.customer_remark || '',
            status: 'cancelled',
            employee_remark: reason
        };
        
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });
        
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
            showToast('Task rejected successfully', 'success');
            await loadAllTasks();
            return;
        } else {
            showToast(result?.message || 'Failed to reject task', 'error');
            unlockAction(actionKey, rejectButton);
        }
        
    } catch (error) {
        console.error('Error rejecting task:', error);
        showToast('Error rejecting task: ' + error.message, 'error');
        unlockAction(actionKey, rejectButton);
    }
}

function confirmAction(title, message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        const confirmYesBtn = document.getElementById('confirmYesBtn');
        if (confirmYesBtn) {
            confirmYesBtn.disabled = false;
        }
        document.getElementById('confirmModal').classList.add('active');
    });
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    if (confirmYesBtn) {
        confirmYesBtn.disabled = false;
    }
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
}

function executeConfirmedAction(triggerButton = null) {
    if (triggerButton && triggerButton.disabled) {
        return;
    }
    if (triggerButton) {
        triggerButton.disabled = true;
    }
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
}

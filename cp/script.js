// ==================== CONFIG ====================
const BASE_URL = 'https://app.vbo.co.in';
let currentDB = 'user';
let currentTable = 'services';
let editId = null;
let editItemData = null;
let allTableData = [];
let filteredData = [];

// ==================== TABLE CONFIGURATION ====================
const tableConfig = {
    user: {
        services: {
            name: 'Services',
            url: `${BASE_URL}/kwikkwash/services?city=`,
            columns: ['service_code', 'service_name', 'partner_code', 'price', 'active', 'created_at'],
            idField: 'service_code',
            idType: 'single',
            getDropdowns: async () => {
                const partnersResponse = await fetch(`${BASE_URL}/kwikkwash/partners?city=`);
                const partners = await partnersResponse.json();
                return { partners };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Service Code</label>
                    <input type="text" id="service_code" placeholder="e.g., DRY wash" required>
                </div>
                <div class="form-group">
                    <label class="required">Service Name</label>
                    <input type="text" id="service_name" placeholder="e.g., Dry Wash Service" required>
                </div>
                <div class="form-group">
                    <label class="required">Partner Code **</label>
                    <select id="partner_code" required>
                        <option value="">Select Partner</option>
                        ${dropdowns.partners?.map(p => `<option value="${p.partner_code}">${p.partner_code} - ${p.franchise_name || p.owner_name} (${p.city})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Price (₹)</label>
                    <input type="number" id="price" step="0.01" value="0" required>
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="active" required>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/services`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/services/${id}`
        },
        bookings: {
            name: 'Bookings',
            url: `${BASE_URL}/kwikkwash/bookings?city=`,
            columns: ['booking_id', 'customer_name', 'phone', 'city', 'service_code', 'assigned_employee_code', 'booking_date', 'status'],
            idField: 'booking_id',
            idType: 'single',
            getDropdowns: async () => {
                const [servicesResponse, employeesResponse] = await Promise.all([
                    fetch(`${BASE_URL}/kwikkwash/services?city=`),
                    fetch(`${BASE_URL}/kwikkwash/employees?city=`)
                ]);
                const services = await servicesResponse.json();
                const employees = await employeesResponse.json();
                return { services, employees };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Booking ID</label>
                    <input type="text" id="booking_id" required>
                </div>
                <div class="form-group">
                    <label class="required">Customer Name</label>
                    <input type="text" id="customer_name" required>
                </div>
                <div class="form-group">
                    <label class="required">Phone</label>
                    <input type="tel" id="phone" pattern="[0-9]{10}" placeholder="Enter 10-digit mobile number" required>
                    <small style="color: var(--text-muted);">10-digit mobile number</small>
                </div>
                <div class="form-group">
                    <label class="required">City</label>
                    <input type="text" id="city" required>
                </div>
                <div class="form-group">
                    <label class="required">Service</label>
                    <select id="service_code" required>
                        <option value="">Select Service</option>
                        ${dropdowns.services?.map(s => `<option value="${s.service_code}">${s.service_code} - ${s.service_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Assigned Employee</label>
                    <select id="assigned_employee_code" required>
                        <option value="">Select Employee</option>
                        ${dropdowns.employees?.map(e => `<option value="${e.employee_code}">${e.employee_code} - ${e.employee_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Booking Date</label>
                    <input type="date" id="booking_date" required>
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="status" required>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/bookings`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/bookings/${id}`
        }
    },
    employee: {
        employees: {
            name: 'Team Members',
            url: `${BASE_URL}/kwikkwash/employees?city=`,
            columns: ['id', 'employee_code', 'employee_name', 'phone', 'partner_code', 'joining_date', 'ref_by', 'background', 'allowed_lat', 'allowed_lng', 'allowed_range', 'salary', 'active', 'skills'],
            idField: 'id',  // FIXED: Using id instead of employee_code
            idType: 'single',
            getDropdowns: async () => {
                const partnersResponse = await fetch(`${BASE_URL}/kwikkwash/partners?city=`);
                const partners = await partnersResponse.json();
                return { partners };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Employee Code</label>
                    <input type="text" id="employee_code" required>
                </div>
                <div class="form-group">
                    <label class="required">Employee Name</label>
                    <input type="text" id="employee_name" required>
                </div>
                <div class="form-group">
                    <label class="required">Phone</label>
                    <input type="tel" id="phone" pattern="[0-9]{10}" placeholder="Enter 10-digit mobile number" required>
                    <small style="color: var(--text-muted);">10-digit mobile number</small>
                </div>
                <div class="form-group">
                    <label class="required">Partner Code **</label>
                    <select id="partner_code" required onchange="updateSkillsByPartner(this.value)">
                        <option value="">Select Partner</option>
                        ${dropdowns.partners?.map(p => `<option value="${p.partner_code}">${p.partner_code} - ${p.franchise_name || p.owner_name} (${p.city})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Joining Date</label>
                    <input type="date" id="joining_date" required>
                </div>
                <div class="form-group">
                    <label class="required">Referred By</label>
                    <input type="text" id="ref_by" placeholder="Person who referred this employee" required>
                </div>
                <div class="form-group">
                    <label class="required">Background Check</label>
                    <select id="background" required>
                        <option value="">Select Status</option>
                        <option value="clear">Clear</option>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Allowed Latitude</label>
                    <input type="number" step="0.000001" id="allowed_lat" placeholder="e.g., 28.6139" required>
                </div>
                <div class="form-group">
                    <label class="required">Allowed Longitude</label>
                    <input type="number" step="0.000001" id="allowed_lng" placeholder="e.g., 77.2090" required>
                </div>
                <div class="form-group">
                    <label class="required">Allowed Range (km)</label>
                    <input type="number" id="allowed_range" step="0.1" placeholder="e.g., 5" required>
                </div>
                <div class="form-group">
                    <label class="required">Salary (₹)</label>
                    <input type="number" id="salary" step="0.01" placeholder="e.g., 25000" required>
                </div>
                <div class="form-group">
                    <label>Skills</label>
                    
                    <!-- hidden input for backend -->
                    <input type="hidden" id="skills">
                    
                    <!-- table render -->
                    <div id="skills-table-container" style="max-height:200px; overflow:auto; border:1px solid #333; border-radius:8px; padding:10px;">
                        <p>Select partner to load services</p>
                    </div>
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="active" required>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/employees`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/employees/${id}`
        },
        attendance: {
            name: 'Attendance',
            url: `${BASE_URL}/kwikkwash/attendance/all`,
            columns: ['id', 'employee_code', 'attendance_date', 'in_time', 'out_time'],
            idField: 'id',
            idType: 'single',
            getDropdowns: async () => {
                const response = await fetch(`${BASE_URL}/kwikkwash/employees?city=`);
                const employees = await response.json();
                return { employees };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Team Member</label>
                    <select id="employee_code" required>
                        <option value="">Select Team Member</option>
                        ${dropdowns.employees?.map(e => `<option value="${e.employee_code}">${e.employee_code} - ${e.employee_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Date</label>
                    <input type="date" id="attendance_date" required>
                </div>
                <div class="form-group">
                    <label class="required">In Time</label>
                    <input type="text" id="in_time" placeholder="09:00" required>
                </div>
                <div class="form-group">
                    <label class="required">Out Time</label>
                    <input type="text" id="out_time" placeholder="18:00" required>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/attendance`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/attendance/id/${id}`
        },
        jobs: {
            name: 'Assignments',
            url: `${BASE_URL}/kwikkwash/employee-jobs/all`,
            columns: ['id', 'employee_code', 'booking_id', 'status', 'job_address', 'created_at'],
            idField: 'id',
            idType: 'single',
            getDropdowns: async () => {
                const [empResponse, bookResponse] = await Promise.all([
                    fetch(`${BASE_URL}/kwikkwash/employees?city=`),
                    fetch(`${BASE_URL}/kwikkwash/bookings?city=`)
                ]);
                const employees = await empResponse.json();
                const bookings = await bookResponse.json();
                return { employees, bookings };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Team Member</label>
                    <select id="employee_code" required>
                        <option value="">Select Team Member</option>
                        ${dropdowns.employees?.map(e => `<option value="${e.employee_code}">${e.employee_code} - ${e.employee_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Booking</label>
                    <select id="booking_id" required>
                        <option value="">Select Booking</option>
                        ${dropdowns.bookings?.map(b => `<option value="${b.booking_id}">${b.booking_id} - ${b.customer_name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Job Address</label>
                    <textarea id="job_address" rows="2" placeholder="Full address..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Service Code</label>
                    <input type="text" id="service_code" placeholder="e.g., WASH001">
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="status" required>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/employee-jobs`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/employee-jobs/${id}`
        }
    },
    partner: {
        partners: {
            name: 'Partners',
            url: `${BASE_URL}/kwikkwash/partners?city=`,
            columns: ['id', 'partner_code', 'franchise_name', 'owner_name', 'phone', 'city', 'business_type', 'office_lat', 'office_lng', 'service_range_km', 'active'],
            idField: 'id',  // FIXED: Using id instead of partner_code
            idType: 'single',
            getDropdowns: async () => ({}),
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Partner Code</label>
                    <input type="text" id="partner_code" required>
                </div>
                <div class="form-group">
                    <label class="required">Franchise Name</label>
                    <input type="text" id="franchise_name" required>
                </div>
                <div class="form-group">
                    <label class="required">Owner Name</label>
                    <input type="text" id="owner_name" required>
                </div>
                <div class="form-group">
                    <label class="required">Phone</label>
                    <input type="tel" id="phone" pattern="[0-9]{10}" placeholder="Enter 10-digit mobile number" required>
                    <small style="color: var(--text-muted);">10-digit mobile number</small>
                </div>
                <div class="form-group">
                    <label class="required">City</label>
                    <input type="text" id="city" required>
                </div>
                <div class="form-group">
                    <label class="required">Business Type</label>
                    <select id="business_type" required>
                        <option value="">Select Business Type</option>
                        <option value="franchise">Franchise</option>
                        <option value="independent">Independent</option>
                        <option value="distributor">Distributor</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Office Latitude</label>
                    <input type="number" step="0.000001" id="office_lat" placeholder="e.g., 28.6139" required>
                </div>
                <div class="form-group">
                    <label class="required">Office Longitude</label>
                    <input type="number" step="0.000001" id="office_lng" placeholder="e.g., 77.2090" required>
                </div>
                <div class="form-group">
                    <label class="required">Service Range (km)</label>
                    <input type="number" id="service_range_km" step="0.1" placeholder="e.g., 10" required>
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="active" required>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/partners`,
            deleteUrl: (id) => `${BASE_URL}/kwikkwash/partners/${id}`
        },
        partner_services: {
            name: 'Partner Services',
            url: `${BASE_URL}/kwikkwash/partner-services/all?partner_code=`,
            columns: ['id', 'partner_code', 'service_code', 'price', 'active'],
            idField: 'id',
            idType: 'composite',
            getDropdowns: async () => {
                const partnerResponse = await fetch(`${BASE_URL}/kwikkwash/partners?city=`);
                const partners = await partnerResponse.json();
                return { partners };
            },
            addForm: (dropdowns) => `
                <div class="form-group">
                    <label class="required">Partner</label>
                    <select id="partner_code" required>
                        <option value="">Select Partner</option>
                        ${dropdowns.partners?.map(p => `<option value="${p.partner_code}">${p.partner_code} - ${p.franchise_name || p.owner_name} (${p.city})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="required">Service Code</label>
                    <input type="text" id="service_code" placeholder="Enter service code (e.g., WASH001)" required>
                </div>
                <div class="form-group">
                    <label class="required">Price (₹)</label>
                    <input type="number" id="price" step="0.01" value="0" required>
                </div>
                <div class="form-group">
                    <label class="required">Status</label>
                    <select id="active" required>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>
            `,
            addEndpoint: `${BASE_URL}/kwikkwash/partner-services`,
            deleteUrl: (partnerCode, serviceCode) => `${BASE_URL}/kwikkwash/partner-services/${partnerCode}/${serviceCode}`
        }
    }
};

// ==================== UPDATE SKILLS BASED ON PARTNER CODE ====================
async function updateSkillsByPartner(partnerCode) {
    const container = document.getElementById('skills-table-container');
    const hiddenInput = document.getElementById('skills');

    if (!container) return;
    
    // Clear only in ADD mode (not edit)
    if (hiddenInput && !editId) {
        hiddenInput.value = '';
    }

    if (!partnerCode) {
        container.innerHTML = '<p>Select partner to load services</p>';
        return;
    }

    try {
        container.innerHTML = '<p>Loading services...</p>';

        const res = await fetch(`${BASE_URL}/kwikkwash/partner-services/all?partner_code=${partnerCode}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            container.innerHTML = '<p>No services found for this partner</p>';
            return;
        }

        // Get existing skills from hidden input (will be preserved in edit mode)
        const existingSkills = hiddenInput?.value
            ? hiddenInput.value.split(',').map(s => s.trim())
            : [];

        let html = `
            <table style="width:100%; font-size:12px;">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Service</th>
                        <th>Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(item => {
            const checked = existingSkills.includes(item.service_code);

            html += `
                <tr>
                    <td><input type="checkbox" value="${item.service_code}" ${checked ? 'checked' : ''} onchange="updateSkillsValue()"></td>
                    <td>${item.service_code}</td>
                    <td>₹${item.price || 0}</td>
                    <td>${item.active == 1 ? 'Active' : 'Inactive'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Error loading services</p>';
    }
}

// ==================== UPDATE SKILLS VALUE FROM CHECKBOXES ====================
function updateSkillsValue() {
    const checked = document.querySelectorAll('#skills-table-container input:checked');
    const values = Array.from(checked).map(cb => cb.value);

    const hiddenInput = document.getElementById('skills');
    if (hiddenInput) {
        hiddenInput.value = values.join(',');
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.db-nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.db-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDB = btn.dataset.db;
            updateTableSelector();
        });
    });
    
    document.getElementById('addBtn').addEventListener('click', () => openAddModal());
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    document.getElementById('clearSearch').addEventListener('click', () => {
        searchInput.value = '';
        handleSearch();
        searchInput.focus();
    });
    
    updateTableSelector();
});

// ==================== UPDATE TABLE SELECTOR ====================
function updateTableSelector() {
    const selector = document.getElementById('tableSelector');
    const tables = Object.keys(tableConfig[currentDB]);
    
    selector.innerHTML = '';
    tables.forEach((table, index) => {
        const btn = document.createElement('button');
        btn.textContent = tableConfig[currentDB][table].name;
        btn.className = index === 0 ? 'active' : '';
        btn.onclick = () => {
            document.querySelectorAll('#tableSelector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTable = table;
            loadData();
        };
        selector.appendChild(btn);
    });
    
    currentTable = tables[0];
    document.getElementById('tableTitle').textContent = tableConfig[currentDB][currentTable].name;
    loadData();
}

// ==================== LOAD DATA ====================
async function loadData() {
    const container = document.getElementById('tableContainer');
    const config = tableConfig[currentDB][currentTable];
    
    container.innerHTML = `<div class="loading-state">
        <div class="spinner"></div>
        <p>Loading ${config.name.toLowerCase()}...</p>
    </div>`;
    
    document.getElementById('searchInput').value = '';
    
    try {
        const response = await fetch(config.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        allTableData = await response.json();
        filteredData = [...allTableData];
        renderFilteredTable();
        updateSummary(filteredData);
        document.getElementById('tableTitle').textContent = config.name;
    } catch (error) {
        showToast('error', `Failed to load data: ${error.message}`);
        container.innerHTML = `<div class="empty-state">
            <span style="font-size: 48px;">📊</span>
            <p>Unable to load data. Please try again.</p>
        </div>`;
    }
}

// ==================== SEARCH FUNCTION ====================
function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredData = [...allTableData];
    } else {
        filteredData = allTableData.filter(item => {
            return Object.values(item).some(value => {
                if (value === null || value === undefined) return false;
                return value.toString().toLowerCase().includes(searchTerm);
            });
        });
    }
    
    renderFilteredTable();
    updateSummary(filteredData);
    document.getElementById('recordCount').textContent = 
        `${filteredData.length} of ${allTableData.length} records`;
}

// ==================== RENDER TABLE ====================
function renderFilteredTable() {
    const container = document.getElementById('tableContainer');
    const config = tableConfig[currentDB][currentTable];
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!filteredData || filteredData.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <span style="font-size: 48px;">🔍</span>
            <p>No matching records found</p>
        </div>`;
        return;
    }
    
    let html = '<table><thead><tr>';
    config.columns.forEach(col => {
        html += `<th>${col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>`;
    });
    html += '<th>Actions</th></tr></thead><tbody>';
    
    filteredData.forEach(item => {
        html += '<tr>';
        config.columns.forEach(col => {
            let value = item[col];
            let displayValue = '';
            
            if (col === 'active') {
                displayValue = value === 1 ? 
                    '<span class="status-badge status-active">Active</span>' : 
                    '<span class="status-badge status-inactive">Inactive</span>';
            } else if (col.includes('price') || col === 'salary') {
                displayValue = value ? `₹${value.toLocaleString()}` : '-';
            } else if (col === 'partner_code') {
                displayValue = value || '-';
            } else if (col === 'skills' && value) {
                const skillsList = value.split(',').map(s => s.trim()).join(', ');
                displayValue = skillsList;
            } else if (col === 'business_type') {
                // SAFE VERSION: Check if value exists and is string
                displayValue = (value && typeof value === 'string')
                    ? value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    : '-';
            } else if (col === 'background') {
                // SAFE VERSION: Check if value exists and is string
                displayValue = (value && typeof value === 'string')
                    ? value.replace(/\b\w/g, l => l.toUpperCase())
                    : '-';
            } else {
                displayValue = value !== null && value !== undefined ? value.toString() : '-';
            }
            
            if (searchTerm && displayValue.toLowerCase().includes(searchTerm)) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                displayValue = displayValue.replace(regex, '<span class="search-highlight">$1</span>');
            }
            
            html += `<td>${displayValue}</td>`;
        });
        
        const itemStr = JSON.stringify(item).replace(/'/g, "&apos;");
        html += `<td class="action-cell">
            <button class="btn-icon" onclick='openEditModal(${itemStr})' title="Edit">✏️</button>
            <button class="btn-icon delete" onclick='deleteItem(${itemStr})' title="Delete">🗑️</button>
        </td></tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ==================== UPDATE SUMMARY ====================
function updateSummary(data) {
    if (!data || data.length === 0) {
        document.getElementById('totalCount').textContent = '0';
        document.getElementById('activeCount').textContent = '0';
        document.getElementById('inactiveCount').textContent = '0';
        return;
    }
    
    const total = data.length;
    const active = data.filter(item => item.active === 1).length;
    const inactive = total - active;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('activeCount').textContent = active;
    document.getElementById('inactiveCount').textContent = inactive;
    document.getElementById('recordCount').textContent = `${total} records`;
}

// ==================== OPEN ADD MODAL ====================
async function openAddModal() {
    editId = null;
    editItemData = null;
    
    const config = tableConfig[currentDB][currentTable];
    document.getElementById('modalTitle').textContent = `Add New ${config.name}`;
    
    document.getElementById('modalForm').innerHTML = `<div class="loading-state">
        <div class="spinner"></div>
        <p>Loading form...</p>
    </div>`;
    document.getElementById('modal').style.display = 'block';
    
    const dropdowns = await config.getDropdowns();
    document.getElementById('modalForm').innerHTML = config.addForm(dropdowns);
}

// ==================== OPEN EDIT MODAL ====================
async function openEditModal(item) {
    editItemData = item;
    editId = item[tableConfig[currentDB][currentTable].idField];
    
    const config = tableConfig[currentDB][currentTable];
    document.getElementById('modalTitle').textContent = `Edit ${config.name}`;
    
    document.getElementById('modalForm').innerHTML = `<div class="loading-state">
        <div class="spinner"></div>
        <p>Loading form...</p>
    </div>`;
    document.getElementById('modal').style.display = 'block';
    
    const dropdowns = await config.getDropdowns();
    document.getElementById('modalForm').innerHTML = config.addForm(dropdowns);
    
    setTimeout(async () => {
        for (const key of Object.keys(item)) {
            const field = document.getElementById(key);
            if (field) {
                if (key === 'skills') {
                    field.value = item[key] || '';
                } else {
                    field.value = item[key];
                }
            }
        }
        
        const partnerField = document.getElementById('partner_code');
        if (partnerField && partnerField.value) {
            await updateSkillsByPartner(partnerField.value);
        }
    }, 200);
}

// ==================== SAVE ITEM ====================
async function saveItem() {
    const config = tableConfig[currentDB][currentTable];
    const form = document.getElementById('modalForm');
    const inputs = form.querySelectorAll('input, select, textarea');
    const data = {};
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.id === 'skills') {
            data[input.id] = input.value;
        } else {
            if (input.hasAttribute('required') && !input.value.trim()) {
                input.style.borderColor = '#ff6b6b';
                isValid = false;
            } else {
                input.style.borderColor = '';
            }
            
            if (input.id) {
                if (input.type === 'number') {
                    // FIX: Check for empty string, set to null instead of 0
                    data[input.id] = input.value === '' ? null : parseFloat(input.value);
                } else {
                    data[input.id] = input.value;
                }
            }
        }
    });
    
    if (!isValid) {
        showToast('error', 'Please fill all required fields');
        return;
    }
    
    if (editId && config.idType === 'single') {
        data[config.idField] = editId;
    }
    
    try {
        const response = await fetch(config.addEndpoint, {
            method: editId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast('success', `Record ${editId ? 'updated' : 'added'} successfully`);
            closeModal();
            loadData();
        } else {
            showToast('error', result.message || 'Operation failed');
        }
    } catch (error) {
        showToast('error', `Error: ${error.message}`);
    }
}

// ==================== DELETE ITEM ====================
async function deleteItem(item) {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    const config = tableConfig[currentDB][currentTable];
    let url = '';
    
    try {
        if (currentDB === 'partner' && currentTable === 'partner_services') {
            if (!item.partner_code || !item.service_code) {
                showToast('error', 'Missing required codes');
                return;
            }
            url = config.deleteUrl(item.partner_code, item.service_code);
        } else {
            const id = item[config.idField];
            if (!id) {
                showToast('error', 'Missing ID field');
                return;
            }
            url = config.deleteUrl(id);
        }
        
        const response = await fetch(url, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.status === 'success') {
            showToast('success', 'Record deleted successfully');
            loadData();
        } else {
            showToast('error', result.message || 'Delete failed');
        }
    } catch (error) {
        showToast('error', `Error: ${error.message}`);
    }
}

// ==================== TOAST ====================
function showToast(type, message) {
    const toast = document.getElementById('toast');
    const id = Date.now();
    
    toast.innerHTML += `
        <div class="toast ${type}" data-id="${id}">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        </div>
    `;
    
    setTimeout(() => {
        const toastEl = document.querySelector(`[data-id="${id}"]`);
        if (toastEl) toastEl.remove();
    }, 5000);
}

// ==================== CLOSE MODAL ====================
function closeModal() {
    document.getElementById('modal').style.display = 'none';
    editId = null;
    editItemData = null;
}

window.onclick = (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) closeModal();
};

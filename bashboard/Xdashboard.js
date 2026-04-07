// KWIKKWASH Dashboard JavaScript with Complete API Integration
function to24Hour(time12h) {
    if (!time12h) return "";
    if (!time12h.includes(" ")) return time12h;
    const [time, modifier] = time12h.split(" ");
    let [h, m] = time.split(":");
    if (modifier === "PM" && h !== "12") h = parseInt(h) + 12;
    if (modifier === "AM" && h === "12") h = "00";
    return `${h.toString().padStart(2, "0")}:${m}`;
}

class Dashboard {
    constructor() {
        this.apiBaseUrl = 'https://app.vbo.co.in';
        this.currentPage = 'dashboard';
        
        // SINGLE SOURCE OF TRUTH
        this.allBookings = [];
        this.filteredBookings = [];
        this.dashboardBookings = [];
        this.customersData = [];
        this.citiesData = {};
        
        // DASHBOARD STATE
        this.selectedPeriod = 'all_time';
        this.selectedCity = 'all';
        
        // BOOKINGS PAGE STATE
        this.currentPageNumber = 1;
        this.rowsPerPage = 25;
        this.totalPages = 1;
        
        // FILTER STATE
        this.activeFilters = {
            dateRange: { start: '', end: '' },
            status: [],
            city: 'all',
            searchTerm: ''
        };
        
        // REVENUE FILTER STATE
        this.revenueFilters = {
            period: 'month',
            city: 'all'
        };
        
        // PERFORMANCE
        this.searchTimeout = null;
        this.lastUpdateTime = null;
        
        // CHART STATE
        this.charts = {
            city: null,
            cityPerformance: null,
            revenue: null,
            paymentMethods: null,
            services: null
        };
        this.chartColors = this.generateChartColors(20);
        
        // UI COMPONENTS
        this.employees = [
            { id: 'team_a', name: 'Team A', email: 'team.a@kwikkwash.com', role: 'Service Team' },
            { id: 'team_b', name: 'Team B', email: 'team.b@kwikkwash.com', role: 'Service Team' },
            { id: 'team_c', name: 'Team C', email: 'team.c@kwikkwash.com', role: 'Service Team' },
            { id: 'admin', name: 'Admin', email: 'admin@kwikkwash.com', role: 'Administrator' }
        ];
        this.notifications = [];
        
        this.init();
    }

    generateChartColors(count) {
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            const hue = Math.floor(i * hueStep);
            const saturation = 70 + Math.random() * 20;
            const lightness = 50 + Math.random() * 10;
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }
        return colors;
    }

    getChartColor(index, opacity = 1) {
        if (index >= this.chartColors.length) {
            const hue = (index * 137) % 360;
            return `hsl(${hue}, 70%, 55%)`;
        }
        const color = this.chartColors[index];
        if (opacity < 1) {
            return color.replace('hsl', 'hsla').replace(')', `, ${opacity})`);
        }
        return color;
    }

    getStatusColor(status) {
        const colors = {
            'paid': '#00ff00', 'pending': '#F6C84C', 'failed': '#ff0000',
            'confirmed': '#2196f3', 'completed': '#4caf50', 'cancelled': '#f44336'
        };
        return colors[status] || '#666';
    }

    async init() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            const appContainer = document.getElementById('appContainer');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (appContainer) appContainer.style.display = 'block';
        }, 1000);

        this.initEventListeners();
        this.updateTimeDisplay();
        this.checkAPIStatus();
        await this.loadAllData();
        this.initCharts();
        
        setInterval(() => this.checkForUpdates(), 5 * 60 * 1000);
        setInterval(() => this.updateTimeDisplay(), 60000);
    }

    updateTimeDisplay() {
        try {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });
            const dateString = now.toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            
            const currentTimeEl = document.getElementById('currentTime');
            if (currentTimeEl) currentTimeEl.textContent = `${dateString} • ${timeString}`;
        } catch (error) {
            console.error('Error updating time:', error);
        }
    }

    initEventListeners() {
        // Menu toggle
        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) menuBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });

        // Navigation
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar) sidebar.classList.remove('active');
                }
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshData());

        // Quick action buttons
        const newBookingBtn = document.getElementById('newBookingBtn');
        if (newBookingBtn) newBookingBtn.addEventListener('click', () => this.showAddCustomerModal());

        const barcodeGenerateBtn = document.getElementById('barcodeGenerateBtn');
        if (barcodeGenerateBtn) barcodeGenerateBtn.addEventListener('click', () => this.showBarcodeGenerator());

        const refreshDataBtn = document.getElementById('refreshDataBtn');
        if (refreshDataBtn) refreshDataBtn.addEventListener('click', () => this.refreshAllData());

        const cityReportBtn = document.getElementById('cityReportBtn');
        if (cityReportBtn) cityReportBtn.addEventListener('click', () => this.exportCityReport());

        // View All link from dashboard
        const viewAllBookings = document.getElementById('viewAllBookings');
        if (viewAllBookings) {
            viewAllBookings.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage('bookings');
            });
        }

        // Export city report
        const exportCityReportBtn = document.getElementById('exportCityReport');
        if (exportCityReportBtn) exportCityReportBtn.addEventListener('click', () => this.exportCityReport());

        // Close modals
        const closeEditModal = document.getElementById('closeEditModal');
        if (closeEditModal) closeEditModal.addEventListener('click', () => this.closeModal('editBookingModal'));

        const closeCommentModal = document.getElementById('closeCommentModal');
        if (closeCommentModal) closeCommentModal.addEventListener('click', () => this.closeModal('addCommentModal'));

        const closeBarcodeModal = document.getElementById('closeBarcodeModal');
        if (closeBarcodeModal) closeBarcodeModal.addEventListener('click', () => this.closeModal('barcodeModal'));

        const closeCustomerModal = document.getElementById('closeCustomerModal');
        if (closeCustomerModal) closeCustomerModal.addEventListener('click', () => this.closeModal('addCustomerModal'));

        const closeCityModal = document.getElementById('closeCityModal');
        if (closeCityModal) closeCityModal.addEventListener('click', () => this.closeModal('updateCityModal'));

        const closeBookingModal = document.getElementById('closeBookingModal');
        if (closeBookingModal) closeBookingModal.addEventListener('click', () => this.closeModal('bookingDetailsModal'));

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });

        // Filter toggle
        const filterToggle = document.getElementById('filterToggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                const filterPanel = document.getElementById('filterPanel');
                if (filterPanel) filterPanel.classList.toggle('active');
            });
        }

        // Apply filters
        const applyFiltersBtn = document.getElementById('applyFilters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.applyBookingsFilters();
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearBookingsFilters());

        // Pagination
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => {
            if (this.currentPageNumber > 1) {
                this.currentPageNumber--;
                this.updateBookingsTable();
            }
        });
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
            if (this.currentPageNumber < this.totalPages) {
                this.currentPageNumber++;
                this.updateBookingsTable();
            }
        });

        // Rows per page
        const rowsPerPageSelect = document.getElementById('rowsPerPage');
        if (rowsPerPageSelect) {
            rowsPerPageSelect.addEventListener('change', (e) => {
                this.rowsPerPage = parseInt(e.target.value);
                this.currentPageNumber = 1;
                this.updateBookingsTable();
            });
        }

        // UNIVERSAL SEARCH WITH DEBOUNCE
        const bookingSearch = document.getElementById('bookingSearch');
        if (bookingSearch) {
            bookingSearch.addEventListener('input', (e) => {
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.activeFilters.searchTerm = e.target.value.trim();
                    this.applyCombinedFilters();
                }, 300);
            });
        }

        // Customer search
        const customerSearch = document.getElementById('customerSearch');
        if (customerSearch) customerSearch.addEventListener('input', (e) => this.filterCustomers(e.target.value));

        // Customer sort
        const customerSort = document.getElementById('customerSort');
        if (customerSort) customerSort.addEventListener('change', (e) => this.sortCustomers(e.target.value));

        // FILTER INPUTS
        const statusCheckboxes = document.querySelectorAll('input[name="status"]');
        statusCheckboxes.forEach(cb => cb.addEventListener('change', () => this.updateActiveFiltersFromUI()));

        const cityFilterSelect = document.getElementById('cityFilter');
        if (cityFilterSelect) cityFilterSelect.addEventListener('change', (e) => {
            this.activeFilters.city = e.target.value;
        });

        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        if (startDateInput) startDateInput.addEventListener('change', () => {
            this.activeFilters.dateRange.start = startDateInput.value;
        });
        if (endDateInput) endDateInput.addEventListener('change', () => {
            this.activeFilters.dateRange.end = endDateInput.value;
        });

        // Revenue filters
        const revenuePeriod = document.getElementById('revenuePeriod');
        if (revenuePeriod) {
            revenuePeriod.addEventListener('change', (e) => {
                this.revenueFilters.period = e.target.value;
                this.loadRevenueData();
            });
        }

        const revenueCity = document.getElementById('revenueCity');
        if (revenueCity) {
            revenueCity.addEventListener('change', (e) => {
                this.revenueFilters.city = e.target.value;
                this.loadRevenueData();
            });
        }

        // City Analysis date range
        const analysisStartDate = document.getElementById('analysisStartDate');
        const analysisEndDate = document.getElementById('analysisEndDate');
        if (analysisStartDate) {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            analysisStartDate.value = firstDay.toISOString().split('T')[0];
            analysisStartDate.addEventListener('change', () => {
                this.updateAnalysisPage();
            });
        }
        if (analysisEndDate) {
            const today = new Date();
            analysisEndDate.value = today.toISOString().split('T')[0];
            analysisEndDate.addEventListener('change', () => {
                this.updateAnalysisPage();
            });
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Online/offline detection
        window.addEventListener('online', () => {
            this.showToast('Back online! Syncing data...', 'success');
            this.refreshData();
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may not work.', 'warning');
        });
    }

    async checkAPIStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/userin/health`);
            const data = await response.json();
            
            const apiStatus = document.getElementById('apiStatus');
            const apiStatusText = document.getElementById('apiStatusText');
            const dbStatus = document.getElementById('dbStatus');
            const dbStatusText = document.getElementById('dbStatusText');
            
            if (data.status === 'ok') {
                if (apiStatus) apiStatus.className = 'status-dot online';
                if (apiStatusText) apiStatusText.textContent = 'Online';
                if (data.database && data.database.exists) {
                    if (dbStatus) dbStatus.className = 'status-dot online';
                    if (dbStatusText) dbStatusText.textContent = 'Connected';
                } else {
                    if (dbStatus) dbStatus.className = 'status-dot offline';
                    if (dbStatusText) dbStatusText.textContent = 'Not Found';
                }
            } else {
                if (apiStatus) apiStatus.className = 'status-dot offline';
                if (apiStatusText) apiStatusText.textContent = 'Offline';
                if (dbStatus) dbStatus.className = 'status-dot offline';
                if (dbStatusText) dbStatusText.textContent = 'Error';
            }
        } catch (error) {
            const apiStatus = document.getElementById('apiStatus');
            const apiStatusText = document.getElementById('apiStatusText');
            if (apiStatus) apiStatus.className = 'status-dot offline';
            if (apiStatusText) apiStatusText.textContent = 'Offline';
            console.error('API Status check failed:', error);
        }
    }

    async loadAllData() {
        try {
            this.showLoading();
            const bookingsResponse = await fetch(`${this.apiBaseUrl}/userin/bookings`);
            const bookingsData = await bookingsResponse.json();
            
            if (bookingsData.status === 'success') {
                this.allBookings = bookingsData.data;
                this.filteredBookings = [...this.allBookings];
                this.dashboardBookings = [...this.allBookings];
                this.processCityData();
                this.updateDashboardData();
                this.updateBookingsTable();
                this.updateCityDropdowns();
            }
            this.hideLoading();
        } catch (error) {
            console.error('Error loading all data:', error);
            this.showToast('Failed to load data', 'error');
            this.hideLoading();
        }
    }

    processCityData() {
        this.citiesData = {};
        this.allBookings.forEach(booking => {
            let city = booking.city || 'Unknown';
            if (!this.citiesData[city]) {
                this.citiesData[city] = {
                    name: city, bookings: 0, revenue: 0, completed: 0, pending: 0
                };
            }
            this.citiesData[city].bookings++;
            this.citiesData[city].revenue += parseFloat(booking.total_amount || 0);
            if (booking.status === 'completed') this.citiesData[city].completed++;
            else if (booking.status === 'pending') this.citiesData[city].pending++;
        });
    }

    // DATA CALCULATION FUNCTIONS
    calculateDashboardData() {
        const recentBookings = [...this.allBookings]
            .sort((a, b) => {
                const dateA = new Date(a.booking_date + ' ' + a.booking_time);
                const dateB = new Date(b.booking_date + ' ' + b.booking_time);
                return dateB - dateA;
            })
            .slice(0, 10);
        
        return {
            kpis: this.calculateKPIs(this.allBookings),
            cityDistribution: this.calculateCityDistribution(this.allBookings),
            recentBookings: recentBookings
        };
    }

    calculateFilteredBookings() {
        let filtered = [...this.allBookings];
        
        // Date range
        if (this.activeFilters.dateRange.start) {
            filtered = filtered.filter(b => b.booking_date >= this.activeFilters.dateRange.start);
        }
        if (this.activeFilters.dateRange.end) {
            filtered = filtered.filter(b => b.booking_date <= this.activeFilters.dateRange.end);
        }
        
        // Status filters
        if (this.activeFilters.status.length > 0) {
            filtered = filtered.filter(b => this.activeFilters.status.includes(b.status));
        }
        
        // City filter
        if (this.activeFilters.city !== 'all') {
            filtered = filtered.filter(b => b.city === this.activeFilters.city);
        }
        
        // Search term (UNIVERSAL SEARCH)
        if (this.activeFilters.searchTerm) {
            const term = this.activeFilters.searchTerm.toLowerCase();
            filtered = filtered.filter(b => {
                return (
                    (b.booking_id && b.booking_id.toLowerCase().includes(term)) ||
                    (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
                    (b.customer_mobile && b.customer_mobile.includes(term)) ||
                    (b.city && b.city.toLowerCase().includes(term)) ||
                    (b.services && b.services.toLowerCase().includes(term)) ||
                    (b.employee_name && b.employee_name.toLowerCase().includes(term)) ||
                    (b.payment_status && b.payment_status.toLowerCase().includes(term)) ||
                    (b.status && b.status.toLowerCase().includes(term)) ||
                    (b.payment_mode && b.payment_mode.toLowerCase().includes(term))
                );
            });
        }
        
        return filtered;
    }

    calculateKPIs(bookings) {
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        
        const cityCounts = {};
        bookings.forEach(b => {
            const city = b.city || 'Unknown';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
        
        let topCity = '-';
        let maxCount = 0;
        for (const [city, count] of Object.entries(cityCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topCity = city;
            }
        }
        
        return { totalBookings, totalRevenue, completedBookings, topCity };
    }

    calculateCityDistribution(bookings) {
        const distribution = {};
        bookings.forEach(booking => {
            const city = booking.city || 'Unknown';
            distribution[city] = (distribution[city] || 0) + 1;
        });
        return Object.entries(distribution)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }

    // RENDER FUNCTIONS
    updateDashboardData() {
        const data = this.calculateDashboardData();
        this.renderKPIs(data.kpis);
        this.renderCityChart(data.cityDistribution);
        this.renderRecentBookings(data.recentBookings);
        this.updateCounts();
    }

    renderKPIs(kpis) {
        const kpiTotalBookings = document.getElementById('kpiTotalBookings');
        const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
        const kpiCompleted = document.getElementById('kpiCompleted');
        const kpiTopCity = document.getElementById('kpiTopCity');
        
        if (kpiTotalBookings) kpiTotalBookings.textContent = kpis.totalBookings.toLocaleString();
        if (kpiTotalRevenue) kpiTotalRevenue.textContent = `₹${kpis.totalRevenue.toLocaleString('en-IN')}`;
        if (kpiCompleted) kpiCompleted.textContent = kpis.completedBookings.toLocaleString();
        if (kpiTopCity) kpiTopCity.textContent = kpis.topCity || '-';
    }

    renderCityChart(cityDistribution) {
        if (!this.charts.city) this.initChart('city');
        
        if (cityDistribution.length === 0) {
            const cityChartContainer = document.querySelector('#cityChart').parentElement;
            if (cityChartContainer) {
                cityChartContainer.innerHTML = `
                    <div class="empty-chart">
                        <i class="fas fa-chart-pie"></i>
                        <p>No bookings for selected period</p>
                    </div>
                `;
            }
            return;
        }
        
        const cityChartCanvas = document.getElementById('cityChart');
        if (cityChartCanvas && cityChartCanvas.style.display === 'none') {
            cityChartCanvas.style.display = 'block';
        }
        
        this.charts.city.data.labels = cityDistribution.map(c => c.name);
        this.charts.city.data.datasets[0].data = cityDistribution.map(c => c.count);
        this.charts.city.data.datasets[0].backgroundColor = cityDistribution.map((_, i) => 
            this.getChartColor(i, 0.7));
        this.charts.city.data.datasets[0].borderColor = cityDistribution.map((_, i) => 
            this.getChartColor(i, 1));
        
        this.charts.city.update();
        this.renderCityLegend(cityDistribution);
    }

    renderCityLegend(cityDistribution) {
        const legend = document.getElementById('cityLegend');
        if (!legend) return;
        legend.innerHTML = '';
        cityDistribution.forEach((city, index) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${this.getChartColor(index)}"></span>
                <span>${city.name}: ${city.count} bookings</span>
            `;
            legend.appendChild(item);
        });
    }

    renderRecentBookings(recentBookings) {
        const tableBody = document.getElementById('recentBookingsTable');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (recentBookings.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" class="text-center">No recent bookings</td></tr>
            `;
            return;
        }
        recentBookings.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="booking-id">${booking.booking_id}</span></td>
                <td>${booking.customer_name || 'N/A'}</td>
                <td>${booking.city || 'Unknown'}</td>
                <td><span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span></td>
                <td>₹${parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}</td>
            `;
            row.addEventListener('click', () => this.showBookingDetails(booking.booking_id));
            tableBody.appendChild(row);
        });
    }

    // CHART INITIALIZATION
    initChart(chartType) {
        switch (chartType) {
            case 'city':
                const cityCtx = document.getElementById('cityChart');
                if (cityCtx) {
                    this.charts.city = new Chart(cityCtx.getContext('2d'), {
                        type: 'doughnut',
                        data: { 
                            labels: [], 
                            datasets: [{ 
                                data: [], 
                                backgroundColor: [], 
                                borderColor: [], 
                                borderWidth: 1 
                            }] 
                        },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { display: false } 
                            } 
                        }
                    });
                }
                break;
            case 'revenue':
                const revenueCtx = document.getElementById('revenueChart');
                if (revenueCtx) {
                    this.charts.revenue = new Chart(revenueCtx.getContext('2d'), {
                        type: 'line',
                        data: { 
                            labels: [], 
                            datasets: [
                                {
                                    label: 'Pending Revenue',
                                    data: [],
                                    borderColor: '#F6C84C',
                                    backgroundColor: 'rgba(246, 200, 76, 0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4
                                },
                                {
                                    label: 'Received Revenue',
                                    data: [],
                                    borderColor: '#00ff00',
                                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4
                                }
                            ]
                        },
                        options: {
                            responsive: true, 
                            maintainAspectRatio: false, 
                            plugins: { 
                                legend: { 
                                    display: true,
                                    position: 'top'
                                } 
                            },
                            scales: {
                                y: {
                                    beginAtZero: true, 
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                    ticks: { 
                                        callback: function(value) { 
                                            return '₹' + value.toLocaleString('en-IN'); 
                                        } 
                                    }
                                },
                                x: { 
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' } 
                                }
                            }
                        }
                    });
                }
                break;
            case 'paymentMethods':
                const paymentCtx = document.getElementById('paymentMethodsChart');
                if (paymentCtx) {
                    this.charts.paymentMethods = new Chart(paymentCtx.getContext('2d'), {
                        type: 'pie',
                        data: {
                            labels: [],
                            datasets: [{
                                data: [],
                                backgroundColor: [],
                                borderColor: [],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            }
                        }
                    });
                }
                break;
            case 'services':
                const servicesCtx = document.getElementById('servicesChart');
                if (servicesCtx) {
                    this.charts.services = new Chart(servicesCtx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Service Count',
                                data: [],
                                backgroundColor: '#F6C84C',
                                borderColor: '#F6C84C',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                                },
                                x: {
                                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                                }
                            }
                        }
                    });
                }
                break;
        }
    }

    initCharts() {
        this.initChart('city');
        this.initChart('revenue');
        this.initChart('paymentMethods');
        this.initChart('services');
    }

    // FILTER FUNCTIONS
    applyCombinedFilters() {
        this.filteredBookings = this.calculateFilteredBookings();
        this.currentPageNumber = 1;
        this.updateBookingsTable();
        if (this.filteredBookings.length === 0) {
            this.showEmptyState('No bookings match your search and filters');
        }
    }

    updateActiveFiltersFromUI() {
        const statusCheckboxes = document.querySelectorAll('input[name="status"]:checked');
        this.activeFilters.status = Array.from(statusCheckboxes).map(cb => cb.value);
        
        const cityFilterSelect = document.getElementById('cityFilter');
        if (cityFilterSelect) this.activeFilters.city = cityFilterSelect.value;
        
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) this.activeFilters.dateRange.start = startDate.value;
        if (endDate) this.activeFilters.dateRange.end = endDate.value;
    }

    applyBookingsFilters() {
        this.updateActiveFiltersFromUI();
        this.applyCombinedFilters();
        if (window.innerWidth <= 768) {
            const filterPanel = document.getElementById('filterPanel');
            if (filterPanel) filterPanel.classList.remove('active');
        }
    }

    clearBookingsFilters() {
        this.activeFilters = {
            dateRange: { start: '', end: '' },
            status: [],
            city: 'all',
            searchTerm: ''
        };
        
        document.querySelectorAll('input[name="status"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[name="status"][value="pending"], input[name="status"][value="confirmed"], input[name="status"][value="completed"]').forEach(cb => cb.checked = true);
        
        const cityFilterSelect = document.getElementById('cityFilter');
        if (cityFilterSelect) cityFilterSelect.value = 'all';
        
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        
        const searchInput = document.getElementById('bookingSearch');
        if (searchInput) searchInput.value = '';
        
        this.applyCombinedFilters();
    }

    updateCityDropdowns() {
        const uniqueCities = [...new Set(this.allBookings.map(b => b.city || 'Unknown').filter(c => c))];
        
        // Update bookings city filter
        const cityFilterSelect = document.getElementById('cityFilter');
        if (cityFilterSelect) {
            cityFilterSelect.innerHTML = `
                <option value="all">All Cities</option>
                ${uniqueCities.map(city => `<option value="${city}">${city}</option>`).join('')}
            `;
            cityFilterSelect.value = this.activeFilters.city;
        }
        
        // Update revenue city filter
        const revenueCitySelect = document.getElementById('revenueCity');
        if (revenueCitySelect) {
            revenueCitySelect.innerHTML = `
                <option value="all">All Cities</option>
                ${uniqueCities.map(city => `<option value="${city}">${city}</option>`).join('')}
            `;
            revenueCitySelect.value = this.revenueFilters.city;
        }
        
        // Update city analysis city filter
        const citySelect = document.getElementById('citySelect');
        if (citySelect) {
            citySelect.innerHTML = `
                <option value="">All Cities</option>
                ${uniqueCities.map(city => `<option value="${city}">${city}</option>`).join('')}
            `;
        }
    }

    updateBookingsTable() {
        const tableBody = document.getElementById('allBookingsTable');
        if (!tableBody) return;
        
        const startIndex = (this.currentPageNumber - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const pageBookings = this.filteredBookings.slice(startIndex, endIndex);
        this.totalPages = Math.ceil(this.filteredBookings.length / this.rowsPerPage);
        
        if (pageBookings.length === 0) {
            this.showEmptyState('No bookings match your filters');
        } else {
            tableBody.innerHTML = pageBookings.map(booking => `
                <tr>
                    <td><span class="booking-id">${booking.booking_id}</span></td>
                    <td>
                        <div>${booking.customer_name || 'N/A'}</div>
                        <small>${booking.customer_mobile || 'N/A'}</small>
                    </td>
                    <td>
                        <div>${booking.booking_date || 'N/A'}</div>
                        <small>${booking.booking_time || 'N/A'}</small>
                    </td>
                    <td>${booking.city || 'Unknown'}</td>
                    <td>
                        <div class="employee-badge">${booking.employee_name || 'Unassigned'}</div>
                        ${booking.employee_email ? `<small>${booking.employee_email}</small>` : ''}
                    </td>
                    <td>₹${parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td><span class="status-badge status-${booking.payment_status || 'pending'}">${booking.payment_status || 'pending'}</span></td>
                    <td><span class="status-badge status-${booking.status || 'pending'}">${booking.status || 'pending'}</span></td>
                    <td>
                        <button class="action-icon" onclick="dashboard.showBookingDetails('${booking.booking_id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-icon" onclick="dashboard.showEditBookingModal('${booking.booking_id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        const currentPageEl = document.getElementById('currentPage');
        const totalPagesEl = document.getElementById('totalPages');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const showingCountEl = document.getElementById('showingCount');
        const totalCountEl = document.getElementById('totalCount');
        
        if (currentPageEl) currentPageEl.textContent = this.currentPageNumber;
        if (totalPagesEl) totalPagesEl.textContent = this.totalPages;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPageNumber === 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPageNumber === this.totalPages;
        if (showingCountEl) showingCountEl.textContent = pageBookings.length;
        if (totalCountEl) totalCountEl.textContent = this.filteredBookings.length;
    }

    showEmptyState(message) {
        const tableBody = document.getElementById('allBookingsTable');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-search"></i>
                            <h3>${message}</h3>
                            <p>Try changing your search or filters</p>
                            <button class="btn-secondary" onclick="dashboard.clearBookingsFilters()">
                                Clear All Filters
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
        
        const pageElement = document.getElementById(`${page}Page`);
        if (pageElement) pageElement.classList.add('active');
        document.querySelectorAll(`[data-page="${page}"]`).forEach(item => item.classList.add('active'));
        
        this.currentPage = page;
        switch (page) {
            case 'bookings':
                this.updateBookingsTable();
                break;
            case 'revenue':
                this.loadRevenueData();
                break;
            case 'customers':
                this.loadCustomersData();
                break;
            case 'analysis':
                this.updateAnalysisPage();
                break;
            case 'dashboard':
                this.updateDashboardData();
                break;
        }
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    }

    // REVENUE DATA FUNCTIONS
    async loadRevenueData() {
        try {
            const endDate = new Date();
            const startDate = new Date();
            
            switch (this.revenueFilters.period) {
                case 'week': startDate.setDate(endDate.getDate() - 7); break;
                case 'month': startDate.setMonth(endDate.getMonth() - 1); break;
                case 'quarter': startDate.setMonth(endDate.getMonth() - 3); break;
                case 'year': startDate.setFullYear(endDate.getFullYear() - 1); break;
            }
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            const response = await fetch(`${this.apiBaseUrl}/userin/bookings/filter?start_date=${startDateStr}&end_date=${endDateStr}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateRevenueAnalysis(data.data);
            }
        } catch (error) {
            console.error('Error loading revenue data:', error);
        }
    }

    updateRevenueAnalysis(bookings) {
        // Filter by city if selected
        let filteredBookings = bookings;
        if (this.revenueFilters.city !== 'all') {
            filteredBookings = bookings.filter(b => b.city === this.revenueFilters.city);
        }
        
        // Group by date
        const revenueByDate = {
            pending: {},
            received: {}
        };
        
        filteredBookings.forEach(booking => {
            if (booking.booking_date) {
                const date = booking.booking_date;
                const amount = parseFloat(booking.total_amount || 0);
                
                if (booking.payment_status === 'paid') {
                    revenueByDate.received[date] = (revenueByDate.received[date] || 0) + amount;
                } else {
                    revenueByDate.pending[date] = (revenueByDate.pending[date] || 0) + amount;
                }
            }
        });
        
        // Get all unique dates
        const allDates = [...new Set([
            ...Object.keys(revenueByDate.pending),
            ...Object.keys(revenueByDate.received)
        ])].sort();
        
        // Prepare data for chart
        const pendingData = allDates.map(date => revenueByDate.pending[date] || 0);
        const receivedData = allDates.map(date => revenueByDate.received[date] || 0);
        
        // Calculate total revenue
        const totalPending = pendingData.reduce((a, b) => a + b, 0);
        const totalReceived = receivedData.reduce((a, b) => a + b, 0);
        const totalRevenue = totalPending + totalReceived;
        
        // Update revenue summary
        const periodRevenue = document.getElementById('periodRevenue');
        if (periodRevenue) periodRevenue.textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
        
        // Update chart
        if (this.charts.revenue) {
            this.charts.revenue.data.labels = allDates;
            this.charts.revenue.data.datasets[0].data = pendingData;
            this.charts.revenue.data.datasets[1].data = receivedData;
            this.charts.revenue.update();
        }
        
        // Update payment methods chart
        this.updatePaymentMethodsChart(filteredBookings);
        
        // Update services chart
        this.updateServicesChart(filteredBookings);
    }

    updatePaymentMethodsChart(bookings) {
        const paymentMethods = {};
        bookings.forEach(booking => {
            const method = booking.payment_mode || 'Unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });
        
        const labels = Object.keys(paymentMethods);
        const data = Object.values(paymentMethods);
        const colors = labels.map((_, i) => this.getChartColor(i, 0.7));
        
        if (this.charts.paymentMethods) {
            this.charts.paymentMethods.data.labels = labels;
            this.charts.paymentMethods.data.datasets[0].data = data;
            this.charts.paymentMethods.data.datasets[0].backgroundColor = colors;
            this.charts.paymentMethods.update();
            
            // Update legend
            const legend = document.getElementById('paymentMethodsLegend');
            if (legend) {
                legend.innerHTML = labels.map((label, i) => `
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${colors[i]}"></span>
                        <span>${label}: ${data[i]}</span>
                    </div>
                `).join('');
            }
        }
    }

    updateServicesChart(bookings) {
        const services = {};
        bookings.forEach(booking => {
            if (booking.services) {
                const serviceList = booking.services.split(',').map(s => s.trim());
                serviceList.forEach(service => {
                    services[service] = (services[service] || 0) + 1;
                });
            }
        });
        
        // Get top 10 services
        const sortedServices = Object.entries(services)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const labels = sortedServices.map(s => s[0]);
        const data = sortedServices.map(s => s[1]);
        
        if (this.charts.services) {
            this.charts.services.data.labels = labels;
            this.charts.services.data.datasets[0].data = data;
            this.charts.services.update();
            
            // Update legend
            const legend = document.getElementById('servicesLegend');
            if (legend) {
                legend.innerHTML = sortedServices.map((service, i) => `
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: ${this.getChartColor(i)}"></span>
                        <span>${service[0]}: ${service[1]}</span>
                    </div>
                `).join('');
            }
        }
    }

    // CITY ANALYSIS FUNCTIONS
    updateAnalysisPage() {
        const startDate = document.getElementById('analysisStartDate').value;
        const endDate = document.getElementById('analysisEndDate').value;
        
        // Filter bookings by date range
        let filteredBookings = this.allBookings;
        if (startDate) {
            filteredBookings = filteredBookings.filter(b => b.booking_date >= startDate);
        }
        if (endDate) {
            filteredBookings = filteredBookings.filter(b => b.booking_date <= endDate);
        }
        
        // Calculate city performance
        const cityPerformance = this.calculateCityPerformance(filteredBookings);
        this.updateCityPerformanceGrid(cityPerformance);
        this.updateTopCitiesList(cityPerformance);
    }

    calculateCityPerformance(bookings) {
        const performance = {};
        bookings.forEach(booking => {
            const city = booking.city || 'Unknown';
            if (!performance[city]) {
                performance[city] = { 
                    name: city, 
                    bookings: 0, 
                    revenue: 0,
                    pending: 0,
                    completed: 0
                };
            }
            performance[city].bookings++;
            performance[city].revenue += parseFloat(booking.total_amount || 0);
            
            if (booking.status === 'pending') performance[city].pending++;
            if (booking.status === 'completed') performance[city].completed++;
        });
        
        return Object.values(performance)
            .sort((a, b) => b.revenue - a.revenue);
    }

    updateCityPerformanceGrid(cities) {
        const grid = document.getElementById('cityPerformanceGrid');
        if (!grid) return;
        
        if (cities.length === 0) {
            grid.innerHTML = '<div class="city-card"><p>No data available for this period</p></div>';
            return;
        }
        
        grid.innerHTML = cities.map((city, index) => `
            <div class="city-card">
                <div class="city-header">
                    <h3 class="city-name">${city.name}</h3>
                    <span class="city-rank">#${index + 1}</span>
                </div>
                <div class="city-stats">
                    <div class="city-stat">
                        <div class="city-stat-value">${city.bookings}</div>
                        <div class="city-stat-label">Bookings</div>
                    </div>
                    <div class="city-stat">
                        <div class="city-stat-value">₹${city.revenue.toLocaleString('en-IN')}</div>
                        <div class="city-stat-label">Revenue</div>
                    </div>
                    <div class="city-stat">
                        <div class="city-stat-value">${city.completed}</div>
                        <div class="city-stat-label">Completed</div>
                    </div>
                    <div class="city-stat">
                        <div class="city-stat-value">${city.pending}</div>
                        <div class="city-stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateTopCitiesList(cities) {
        const list = document.getElementById('topCitiesList');
        if (!list) return;
        const topCities = cities.slice(0, 10);
        if (topCities.length === 0) {
            list.innerHTML = '<p>No data available</p>';
            return;
        }
        list.innerHTML = topCities.map((city, index) => `
            <div class="top-city-item">
                <div class="top-city-rank">${index + 1}</div>
                <div class="top-city-info">
                    <div class="top-city-name">${city.name}</div>
                    <div class="top-city-bookings">${city.bookings} bookings</div>
                </div>
                <div class="top-city-revenue">₹${city.revenue.toLocaleString('en-IN')}</div>
            </div>
        `).join('');
    }

    // REST OF THE ORIGINAL FUNCTIONS (mostly unchanged, just removed Today page related functions)
    async showBookingDetails(bookingId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/userin/bookings/${bookingId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                const booking = data.data;
                const content = document.getElementById('bookingDetailsContent');
                if (!content) return;
                
                const hasLocation = booking.latitude && booking.longitude;
                
                content.innerHTML = `
                    <div class="booking-details">
                        <div class="detail-section">
                            <h4>Booking Information</h4>
                            <div class="detail-row">
                                <span class="detail-label">Booking ID:</span>
                                <span class="detail-value">${booking.booking_id}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Date & Time:</span>
                                <span class="detail-value">${booking.booking_date} at ${booking.booking_time}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">City:</span>
                                <span class="detail-value">${booking.city || 'Unknown'}</span>
                                <button class="edit-city-btn" onclick="dashboard.showUpdateCityModal('${booking.booking_id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Customer Information</h4>
                            <div class="detail-row">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${booking.customer_name || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Mobile:</span>
                                <span class="detail-value">${booking.customer_mobile || 'N/A'}</span>
                            </div>
                            ${booking.customer_email ? `
                            <div class="detail-row">
                                <span class="detail-label">Email:</span>
                                <span class="detail-value">${booking.customer_email}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="detail-section">
                            <h4>Location Information</h4>
                            <div class="detail-row">
                                <span class="detail-label">Service Location:</span>
                                <span class="detail-value">${booking.address || 'Not specified'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Coordinates:</span>
                                <span class="detail-value">
                                    ${hasLocation ? 
                                        `${booking.latitude}, ${booking.longitude}` : 
                                        'Not available'}
                                </span>
                            </div>
                            <div class="detail-actions">
                                <button class="btn-location ${hasLocation ? '' : 'disabled'}" 
                                        onclick="${hasLocation ? `dashboard.showLocationMap(${booking.latitude}, ${booking.longitude}, '${booking.customer_name}')` : 'dashboard.showLocationNotAvailable()'}"
                                        ${!hasLocation ? 'disabled' : ''}>
                                    <i class="fas fa-map-marker-alt"></i> 
                                    ${hasLocation ? 'View on Map' : 'Location Not Available'}
                                </button>
                                ${hasLocation ? '' : `
                                <button class="btn-call" onclick="dashboard.callCustomer('${booking.customer_mobile}')">
                                    <i class="fas fa-phone"></i> Call Customer
                                </button>
                                `}
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Service Details</h4>
                            <div class="detail-row">
                                <span class="detail-label">Services:</span>
                                <span class="detail-value">${booking.services || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Addons:</span>
                                <span class="detail-value">${booking.addons || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Team Information</h4>
                            <div class="detail-row">
                                <span class="detail-label">Assigned Team:</span>
                                <span class="detail-value">${booking.employee_name || 'Not assigned'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Team Contact:</span>
                                <span class="detail-value">${booking.employee_email || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Payment Information</h4>
                            <div class="detail-row">
                                <span class="detail-label">Total Amount:</span>
                                <span class="detail-value">₹${parseFloat(booking.total_amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Status:</span>
                                <span class="status-badge status-${booking.payment_status || 'pending'}">${booking.payment_status || 'pending'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Payment Mode:</span>
                                <span class="detail-value">${booking.payment_mode || 'Not specified'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-actions">
                            <button class="btn-primary" onclick="dashboard.showEditBookingModal('${booking.booking_id}')">
                                <i class="fas fa-edit"></i> Edit Booking
                            </button>
                            <button class="btn-secondary" onclick="dashboard.showBarcodeModalForBooking('${booking.booking_id}')">
                                <i class="fas fa-qrcode"></i> Generate UPI QR
                            </button>
                        </div>
                    </div>
                `;
                
                this.showModal('bookingDetailsModal');
            }
        } catch (error) {
            console.error('Error loading booking details:', error);
            this.showToast('Failed to load booking details', 'error');
        }
    }

    showEditBookingModal(bookingId) {
        const booking = this.allBookings.find(b => b.booking_id === bookingId);
        if (!booking) return;
        
        const content = document.getElementById('editBookingContent');
        if (!content) return;
        
        content.innerHTML = `
            <div class="edit-form">
                <div id="editBookingQR" style="margin-bottom:20px; text-align: center;"></div>
                
                <div class="form-group">
                    <label>Status</label>
                    <div class="status-options">
                        <div class="status-option">
                            <input type="radio" id="booking-status-completed" name="booking_status" value="completed" ${booking.status === 'completed' ? 'checked' : ''}>
                            <label for="booking-status-completed">Completed</label>
                        </div>
                        <div class="status-option">
                            <input type="radio" id="booking-status-cancelled" name="booking_status" value="cancelled" ${booking.status === 'cancelled' ? 'checked' : ''}>
                            <label for="booking-status-cancelled">Cancelled</label>
                        </div>
                    </div>
                </div>
                
                <div class="payment-section">
                    <div class="payment-status">
                        <label>Mark Payment as Done</label>
                        <label class="switch">
                            <input type="checkbox" id="markPaymentDone" ${booking.payment_status === 'paid' ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>Payment Mode</label>
                        <div class="payment-methods">
                            <div class="payment-method ${booking.payment_mode === 'upi' ? 'active' : ''}" data-method="upi">
                                <i class="fas fa-qrcode"></i>
                                <span>UPI</span>
                            </div>
                            <div class="payment-method ${booking.payment_mode === 'cash' ? 'active' : ''}" data-method="cash">
                                <i class="fas fa-money-bill-wave"></i>
                                <span>Cash</span>
                            </div>
                            <div class="payment-method ${booking.payment_mode === 'card' ? 'active' : ''}" data-method="card">
                                <i class="fas fa-credit-card"></i>
                                <span>Card</span>
                            </div>
                        </div>
                        <input type="hidden" id="paymentMode" value="${booking.payment_mode || 'cash'}">
                    </div>
                </div>
                
                <div class="employee-selection">
                    <label>Employee who completed service</label>
                    <div class="employee-grid" id="employeeSelection">
                        ${this.employees.map(emp => `
                            <div class="employee-card ${booking.employee_id === emp.id ? 'active' : ''}" data-employee="${emp.id}">
                                <div class="employee-avatar">${emp.name.charAt(0)}</div>
                                <div class="employee-name">${emp.name}</div>
                                <div class="employee-role">${emp.role}</div>
                            </div>
                        `).join('')}
                    </div>
                    <input type="hidden" id="selectedEmployee" value="${booking.employee_id || ''}">
                </div>
                
                <div class="form-group">
                    <label>Additional Notes</label>
                    <textarea id="editNotes" placeholder="Add any additional notes...">${booking.notes || ''}</textarea>
                </div>
                
                <div class="form-actions">
                    <button class="btn-secondary" onclick="dashboard.closeModal('editBookingModal')">Cancel</button>
                    <button class="btn-primary" onclick="dashboard.updateBooking('${bookingId}')">Save Changes</button>
                </div>
            </div>
        `;
        
        this.generateBarcodeForEdit(booking);
        
        document.querySelectorAll('.payment-method').forEach(method => {
            method.addEventListener('click', () => {
                document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
                method.classList.add('active');
                const paymentMode = document.getElementById('paymentMode');
                if (paymentMode) paymentMode.value = method.dataset.method;
            });
        });
        
        document.querySelectorAll('.employee-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.employee-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const selectedEmployee = document.getElementById('selectedEmployee');
                if (selectedEmployee) selectedEmployee.value = card.dataset.employee;
            });
        });
        
        this.showModal('editBookingModal');
    }

    generateBarcodeForEdit(booking) {
        const barcodeDisplay = document.getElementById('editBookingQR');
        if (!barcodeDisplay) return;
        
        const upiId = "kwikkwash@upi";
        const businessName = "KWIKKWASH";
        const amount = parseFloat(booking.total_amount || 0);
        const bookingId = booking.booking_id;
        
        if (amount <= 0) {
            this.showToast('Amount is zero, QR generated without amount', 'warning');
        }
        
        let upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&tn=${encodeURIComponent(`Payment for booking ${bookingId}`)}&cu=INR`;
        if (amount > 0) upiUrl += `&am=${amount}`;
        
        barcodeDisplay.innerHTML = `
            <div class="qr-code-container">
                <div class="upi-details">
                    <div class="upi-detail-row">
                        <span class="upi-label">UPI ID:</span>
                        <span class="upi-value">${upiId}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Business:</span>
                        <span class="upi-value">${businessName}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Amount:</span>
                        <span class="upi-value">${amount > 0 ? '₹' + amount.toLocaleString('en-IN') : 'Enter amount manually'}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Reference:</span>
                        <span class="upi-value">${bookingId}</span>
                    </div>
                </div>
                <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 10px;">
                    <div style="color: black; font-weight: bold; margin-bottom: 10px;">Scan QR to Pay</div>
                    <div id="editQrcodeCanvas" style="display: inline-block;"></div>
                </div>
            </div>
        `;
        
        this.generateQRCodeForElement(upiUrl, 'editQrcodeCanvas');
    }

    async updateBooking(bookingId) {
        try {
            const editModal = document.getElementById('editBookingModal');
            if (!editModal) {
                this.showToast('Edit modal not found', 'error');
                return;
            }
            
            const editForm = editModal.querySelector('.edit-form');
            if (!editForm) {
                this.showToast('Edit form not found', 'error');
                return;
            }
            
            const statusRadio = editForm.querySelector('input[name="booking_status"]:checked');
            const paymentDone = editForm.querySelector('#markPaymentDone');
            const paymentMode = editForm.querySelector('#paymentMode');
            const employeeId = editForm.querySelector('#selectedEmployee');
            const notes = editForm.querySelector('#editNotes');
            
            if (!statusRadio) {
                this.showToast('Please select a status', 'warning');
                return;
            }
            
            if (!paymentDone || !paymentMode || !employeeId || !notes) {
                this.showToast('Error: Form elements not found', 'error');
                return;
            }
            
            const status = statusRadio.value;
            const paymentDoneValue = paymentDone.checked;
            const paymentModeValue = paymentMode.value;
            const employeeIdValue = employeeId.value;
            const notesValue = notes.value;
            
            const employee = this.employees.find(emp => emp.id === employeeIdValue);
            
            const updateData = {
                status: status,
                payment_status: paymentDoneValue ? 'paid' : 'pending',
                payment_mode: paymentModeValue,
                employee_id: employeeIdValue,
                employee_name: employee ? employee.name : '',
                employee_email: employee ? employee.email : '',
                notes: notesValue
            };
            
            console.log('Update payload:', updateData);
            
            const response = await fetch(`${this.apiBaseUrl}/userin/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.closeModal('editBookingModal');
                this.showToast('Booking updated successfully!', 'success');
                await this.loadAllData();
                this.updateBookingsTable();
                
                if (document.getElementById('bookingDetailsModal').classList.contains('active')) {
                    this.showBookingDetails(bookingId);
                }
            } else {
                this.showToast(`Failed to update: ${result.message || 'Unknown error'}`, 'error');
            }
            
        } catch (error) {
            console.error('Error updating booking:', error);
            this.showToast('Failed to update booking', 'error');
        }
    }

    showLocationMap(latitude, longitude, customerName) {
        try {
            const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=15`;
            window.open(mapsUrl, '_blank');
            this.showMapModal(latitude, longitude, customerName);
        } catch (error) {
            console.error('Error opening map:', error);
            window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
        }
    }

    showMapModal(latitude, longitude, customerName) {
        const mapModalHTML = `
            <div class="modal" id="mapModal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-map-marker-alt"></i> Location: ${customerName}</h3>
                        <button class="modal-close" onclick="dashboard.closeModal('mapModal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; gap: 15px; margin-bottom: 10px;">
                                <div><strong>Latitude:</strong> ${latitude}</div>
                                <div><strong>Longitude:</strong> ${longitude}</div>
                            </div>
                            <button class="btn-primary" onclick="window.open('https://www.google.com/maps?q=${latitude},${longitude}&z=15', '_blank')">
                                <i class="fas fa-external-link-alt"></i> Open in Google Maps
                            </button>
                        </div>
                        <div id="mapContainer" style="width: 100%; height: 400px; border-radius: 8px; overflow: hidden;">
                            <iframe 
                                width="100%" 
                                height="400" 
                                frameborder="0" 
                                scrolling="no" 
                                marginheight="0" 
                                marginwidth="0" 
                                src="https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=15&output=embed"
                                style="border: 1px solid #333;">
                            </iframe>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="dashboard.closeModal('mapModal')">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        if (!document.getElementById('mapModal')) {
            const div = document.createElement('div');
            div.innerHTML = mapModalHTML;
            document.body.appendChild(div.firstElementChild);
        }
        
        this.showModal('mapModal');
    }

    showLocationNotAvailable() {
        this.showToast('Map location is not available for this booking. Please call the customer!', 'warning');
    }

    callCustomer(phoneNumber) {
        if (!phoneNumber) {
            this.showToast('Phone number not available', 'error');
            return;
        }
        const formattedNumber = phoneNumber.replace(/\D/g, '');
        if (confirm(`Call customer at ${phoneNumber}?`)) {
            window.location.href = `tel:${formattedNumber}`;
        }
    }

    showAddCommentModal(bookingId) {
        const content = document.getElementById('addCommentContent');
        if (!content) return;
        content.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>Your Name</label>
                    <input type="text" id="commentAuthor" value="Admin" placeholder="Enter your name">
                </div>
                <div class="form-group">
                    <label>Comment</label>
                    <textarea id="commentText" placeholder="Enter your comment..." rows="4"></textarea>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="dashboard.closeModal('addCommentModal')">Cancel</button>
                    <button class="btn-primary" onclick="dashboard.saveComment('${bookingId}')">Save Comment</button>
                </div>
            </div>
        `;
        this.showModal('addCommentModal');
    }

    async saveComment(bookingId) {
        try {
            const author = document.getElementById('commentAuthor');
            const text = document.getElementById('commentText');
            if (!text || !text.value.trim()) {
                this.showToast('Please enter a comment', 'warning');
                return;
            }
            const commentData = {
                author: author ? author.value : 'Admin',
                comment: text.value
            };
            const response = await fetch(`${this.apiBaseUrl}/userin/${bookingId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            const result = await response.json();
            if (result.status === 'success') {
                this.closeModal('addCommentModal');
                this.showToast('Comment added successfully!', 'success');
            } else {
                this.showToast(`Failed to add comment: ${result.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving comment:', error);
            this.showToast('Failed to save comment', 'error');
        }
    }

    showBarcodeModalForBooking(bookingId) {
        const booking = this.allBookings.find(b => b.booking_id === bookingId);
        if (!booking) return;
        this.showModal('barcodeModal');
        this.generateBarcode(booking);
    }

    showBarcodeGenerator() {
        const content = document.getElementById('barcodeContent');
        if (!content) return;
        content.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>Select Booking</label>
                    <select id="bookingSelect" onchange="dashboard.onBookingSelectChange(this.value)">
                        <option value="">Select a booking</option>
                        ${this.allBookings.filter(b => b.status !== 'cancelled').map(b => `
                            <option value="${b.booking_id}">${b.booking_id} - ${b.customer_name} - ₹${parseFloat(b.total_amount || 0).toLocaleString('en-IN')}</option>
                        `).join('')}
                    </select>
                </div>
                <div id="barcodeDisplay"></div>
            </div>
        `;
        this.showModal('barcodeModal');
    }

    onBookingSelectChange(bookingId) {
        if (!bookingId) {
            const barcodeDisplay = document.getElementById('barcodeDisplay');
            if (barcodeDisplay) barcodeDisplay.innerHTML = '';
            return;
        }
        const booking = this.allBookings.find(b => b.booking_id === bookingId);
        if (booking) this.generateBarcode(booking);
    }

    generateBarcode(booking) {
        const barcodeDisplay = document.getElementById('barcodeDisplay');
        if (!barcodeDisplay) return;
        
        const upiId = "kwikkwash@upi";
        const businessName = "KWIKKWASH";
        const amount = parseFloat(booking.total_amount || 0);
        const bookingId = booking.booking_id;
        
        if (amount <= 0) {
            this.showToast('Amount is zero, QR generated without amount', 'warning');
        }
        
        let upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&tn=${encodeURIComponent(`Payment for booking ${bookingId}`)}&cu=INR`;
        if (amount > 0) upiUrl += `&am=${amount}`;
        
        barcodeDisplay.innerHTML = `
            <div class="qr-code-container">
                <div class="upi-details">
                    <div class="upi-detail-row">
                        <span class="upi-label">UPI ID:</span>
                        <span class="upi-value">${upiId}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Business:</span>
                        <span class="upi-value">${businessName}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Amount:</span>
                        <span class="upi-value">${amount > 0 ? '₹' + amount.toLocaleString('en-IN') : 'Enter amount manually'}</span>
                    </div>
                    <div class="upi-detail-row">
                        <span class="upi-label">Reference:</span>
                        <span class="upi-value">${bookingId}</span>
                    </div>
                </div>
                <div style="text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 10px;">
                    <div style="color: black; font-weight: bold; margin-bottom: 10px;">Scan QR to Pay</div>
                    <div id="qrcodeCanvas" style="display: inline-block;"></div>
                </div>
                <div class="form-actions" style="margin-top: 20px;">
                    <button class="btn-primary" onclick="dashboard.copyUPIDetails()">
                        <i class="fas fa-copy"></i> Copy UPI Details
                    </button>
                    <button class="btn-secondary" onclick="dashboard.downloadQR()">
                        <i class="fas fa-download"></i> Download QR
                    </button>
                </div>
            </div>
        `;
        this.generateQRCodeForElement(upiUrl, 'qrcodeCanvas');
    }

    generateQRCodeForElement(text, elementId) {
        try {
            if (typeof QRCode !== 'undefined') {
                const qrcodeContainer = document.getElementById(elementId);
                if (qrcodeContainer) {
                    qrcodeContainer.innerHTML = '';
                    new QRCode(qrcodeContainer, {
                        text: text,
                        width: 200, height: 200,
                        colorDark: "#000000", colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            } else {
                const qrcodeContainer = document.getElementById(elementId);
                if (qrcodeContainer) {
                    qrcodeContainer.innerHTML = `
                        <div style="color: #666; padding: 20px; text-align: center;">
                            <i class="fas fa-qrcode" style="font-size: 48px; color: #F6C84C;"></i>
                            <div style="margin-top: 10px;">Install qrcode.js library</div>
                            <div style="font-size: 12px; margin-top: 5px;">OR scan this code manually</div>
                            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                                <div style="font-weight: bold;">UPI: ${"kwikkwash@upi"}</div>
                                <div>${text.split('am=')[1] ? 'Amount: ₹' + text.split('am=')[1]?.split('&')[0] : 'Amount: Enter manually'}</div>
                            </div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            const qrcodeContainer = document.getElementById(elementId);
            if (qrcodeContainer) {
                qrcodeContainer.innerHTML = `
                    <div style="color: #666; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff9900;"></i>
                        <div style="margin-top: 10px;">QR Code Error</div>
                        <div style="font-size: 12px; margin-top: 5px;">Please try again</div>
                    </div>
                `;
            }
        }
    }

    copyUPIDetails() {
        const upiId = "kwikkwash@upi";
        const businessName = "KWIKKWASH";
        const text = `UPI Payment Details\nUPI ID: ${upiId}\nBusiness: ${businessName}\nAmount: Please enter amount manually\nReference: Please enter booking reference\n\nOr scan the QR code for payment`;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('UPI details copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showToast('Failed to copy details', 'error');
        });
    }

    downloadQR() {
        try {
            const qrcodeContainer = document.getElementById('qrcodeCanvas');
            if (!qrcodeContainer) {
                this.showToast('QR code not available', 'error');
                return;
            }
            let canvas = qrcodeContainer.querySelector('canvas');
            let img = qrcodeContainer.querySelector('img');
            if (!canvas && img) {
                canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
            }
            if (!canvas) {
                this.showToast('QR code not generated yet', 'error');
                return;
            }
            const link = document.createElement('a');
            link.download = `kwikkwash-payment-qr-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showToast('QR code downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error downloading QR:', error);
            this.showToast('Failed to download QR code', 'error');
        }
    }

    showAddCustomerModal() {
        const content = document.getElementById('addCustomerContent');
        if (!content) return;
        content.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>Customer Name *</label>
                    <input type="text" id="customerName" placeholder="Enter customer name" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Mobile Number *</label>
                        <input type="tel" id="customerMobile" placeholder="Enter 10-digit mobile number" pattern="[0-9]{10}" required>
                    </div>
                    <div class="form-group">
                        <label>City</label>
                        <input type="text" id="customerCity" placeholder="Enter city">
                    </div>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea id="customerAddress" placeholder="Enter full address" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label>Services Required</label>
                    <textarea id="customerServices" placeholder="Describe services required" rows="3"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Preferred Date</label>
                        <input type="date" id="customerDate">
                    </div>
                    <div class="form-group">
                        <label>Preferred Time</label>
                        <input type="time" id="customerTime">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="dashboard.closeModal('addCustomerModal')">Cancel</button>
                    <button class="btn-primary" onclick="dashboard.addNewCustomer()">Add Customer & Booking</button>
                </div>
            </div>
        `;
        const customerDate = document.getElementById('customerDate');
        if (customerDate) customerDate.value = new Date().toISOString().split('T')[0];
        this.showModal('addCustomerModal');
    }

    async addNewCustomer() {
        try {
            const customerName = document.getElementById('customerName');
            const customerMobile = document.getElementById('customerMobile');
            const customerCity = document.getElementById('customerCity');
            const customerAddress = document.getElementById('customerAddress');
            const customerServices = document.getElementById('customerServices');
            const customerDate = document.getElementById('customerDate');
            const customerTime = document.getElementById('customerTime');
            
            if (!customerName || !customerMobile || !customerName.value || !customerMobile.value) {
                this.showToast('Please fill required fields', 'warning');
                return;
            }
            
            const customerData = {
                name: customerName.value,
                mobile: customerMobile.value,
                address: customerAddress ? customerAddress.value : '',
                city: customerCity ? customerCity.value : '',
                services: customerServices ? customerServices.value : 'Walk-in Customer',
                date: customerDate ? customerDate.value : new Date().toISOString().split('T')[0],
                time: customerTime ? customerTime.value : '10:00',
                notes: ''
            };
            
            const response = await fetch(`${this.apiBaseUrl}/userin/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.closeModal('addCustomerModal');
                this.showToast('Customer and booking added successfully!', 'success');
                this.refreshAllData();
            } else {
                this.showToast(`Failed to add customer: ${result.message || 'Unknown error'}`, 'error');
            }
            
        } catch (error) {
            console.error('Error adding new customer:', error);
            this.showToast('Failed to add customer', 'error');
        }
    }

    showUpdateCityModal(bookingId) {
        const booking = this.allBookings.find(b => b.booking_id === bookingId);
        if (!booking) return;
        const content = document.getElementById('updateCityContent');
        if (!content) return;
        content.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>Current City</label>
                    <div class="current-city" style="padding: 10px; background: rgba(246, 200, 76, 0.1); border-radius: 5px; margin-bottom: 15px;">
                        ${booking.city || 'Unknown'}
                    </div>
                </div>
                <div class="form-group">
                    <label>Update City</label>
                    <input type="text" id="newCity" value="${booking.city || ''}" placeholder="Enter city name">
                    <small style="opacity: 0.7; display: block; margin-top: 5px;">Leave empty to detect from coordinates</small>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="dashboard.closeModal('updateCityModal')">Cancel</button>
                    <button class="btn-primary" onclick="dashboard.updateCity('${bookingId}')">Update City</button>
                </div>
            </div>
        `;
        this.showModal('updateCityModal');
    }

    async updateCity(bookingId) {
        try {
            const newCityEl = document.getElementById('newCity');
            if (!newCityEl) return;
            const newCity = newCityEl.value.trim();
            const updateData = { city: newCity || null };
            const response = await fetch(`${this.apiBaseUrl}/userin/bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const result = await response.json();
            if (result.status === 'success') {
                this.closeModal('updateCityModal');
                this.showToast('City updated successfully!', 'success');
                this.refreshAllData();
                if (document.getElementById('bookingDetailsModal').classList.contains('active')) {
                    this.showBookingDetails(bookingId);
                }
            } else {
                this.showToast(`Failed to update city: ${result.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating city:', error);
            this.showToast('Failed to update city', 'error');
        }
    }

    exportCityReport() {
        let csv = 'City,Bookings,Revenue,Completed,Pending,Avg Revenue per Booking\n';
        Object.values(this.citiesData).forEach(city => {
            const avgRevenue = city.bookings > 0 ? city.revenue / city.bookings : 0;
            csv += `"${city.name}",${city.bookings},${city.revenue},${city.completed},${city.pending},${avgRevenue.toFixed(2)}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kwikkwash-city-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('City report exported successfully!', 'success');
    }

    async loadCustomersData() {
        try {
            const customers = {};
            this.allBookings.forEach(booking => {
                const mobile = booking.customer_mobile;
                if (mobile) {
                    if (!customers[mobile]) {
                        customers[mobile] = {
                            name: booking.customer_name || 'Unknown',
                            mobile: mobile,
                            bookings: 0,
                            totalSpent: 0,
                            lastVisit: booking.booking_date || '',
                            status: 'active'
                        };
                    }
                    customers[mobile].bookings++;
                    customers[mobile].totalSpent += parseFloat(booking.total_amount || 0);
                    if (booking.booking_date > customers[mobile].lastVisit) {
                        customers[mobile].lastVisit = booking.booking_date;
                    }
                }
            });
            this.updateCustomersTable(Object.values(customers));
        } catch (error) {
            console.error('Error loading customers data:', error);
        }
    }

    updateCustomersTable(customers) {
        const tableBody = document.getElementById('customersTable');
        if (!tableBody) return;
        const totalCustomers = customers.length;
        const activeCustomers = customers.filter(c => this.isRecent(c.lastVisit, 30)).length;
        const repeatRate = totalCustomers > 0 ? Math.round((customers.filter(c => c.bookings > 1).length / totalCustomers) * 100) : 0;
        const avgBookings = totalCustomers > 0 ? (customers.reduce((sum, c) => sum + c.bookings, 0) / totalCustomers).toFixed(1) : 0;
        
        const totalCustomersEl = document.getElementById('totalCustomers');
        const activeCustomersEl = document.getElementById('activeCustomers');
        const repeatCustomersEl = document.getElementById('repeatCustomers');
        const avgBookingsEl = document.getElementById('avgBookings');
        
        if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
        if (activeCustomersEl) activeCustomersEl.textContent = activeCustomers;
        if (repeatCustomersEl) repeatCustomersEl.textContent = `${repeatRate}%`;
        if (avgBookingsEl) avgBookingsEl.textContent = avgBookings;
        
        if (customers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No customers found</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = customers.map(customer => `
                <tr>
                    <td>
                        <div class="customer-name">${customer.name}</div>
                        <small>${customer.mobile}</small>
                    </td>
                    <td>${customer.mobile}</td>
                    <td>${customer.bookings}</td>
                    <td>₹${customer.totalSpent.toLocaleString('en-IN')}</td>
                    <td>${customer.lastVisit || 'Never'}</td>
                    <td><span class="status-badge status-${customer.status}">${customer.status}</span></td>
                    <td>
                        <button class="action-icon" onclick="dashboard.viewCustomer('${customer.mobile}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-icon" onclick="dashboard.contactCustomer('${customer.mobile}')" title="Contact">
                            <i class="fas fa-phone"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    filterCustomers(searchTerm) {
        const tableRows = document.querySelectorAll('#customersTable tr');
        tableRows.forEach(row => {
            const customerName = row.querySelector('.customer-name');
            const mobile = row.querySelector('td:nth-child(2)');
            let show = false;
            if (customerName && mobile) {
                const nameText = customerName.textContent.toLowerCase();
                const mobileText = mobile.textContent.toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                if (nameText.includes(searchLower) || mobileText.includes(searchLower)) {
                    show = true;
                }
            }
            row.style.display = show ? '' : 'none';
        });
    }

    sortCustomers(sortBy) {
        const customers = this.extractCustomersFromTable();
        switch (sortBy) {
            case 'recent': customers.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit)); break;
            case 'bookings': customers.sort((a, b) => b.bookings - a.bookings); break;
            case 'spent': customers.sort((a, b) => b.totalSpent - a.totalSpent); break;
            case 'name': customers.sort((a, b) => a.name.localeCompare(b.name)); break;
        }
        this.updateCustomersTable(customers);
    }

    extractCustomersFromTable() {
        const rows = document.querySelectorAll('#customersTable tr');
        const customers = [];
        rows.forEach(row => {
            const nameCell = row.querySelector('.customer-name');
            const mobileCell = row.querySelector('td:nth-child(2)');
            const bookingsCell = row.querySelector('td:nth-child(3)');
            const spentCell = row.querySelector('td:nth-child(4)');
            const lastVisitCell = row.querySelector('td:nth-child(5)');
            const statusCell = row.querySelector('.status-badge');
            if (nameCell && mobileCell) {
                customers.push({
                    name: nameCell.textContent.trim(),
                    mobile: mobileCell.textContent.trim(),
                    bookings: parseInt(bookingsCell?.textContent || 0),
                    totalSpent: parseFloat(spentCell?.textContent?.replace('₹', '').replace(/,/g, '') || 0),
                    lastVisit: lastVisitCell?.textContent.trim() || '',
                    status: statusCell?.textContent.trim() || 'active'
                });
            }
        });
        return customers;
    }

    isRecent(dateString, days) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return date >= cutoff;
    }

    refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) refreshBtn.classList.add('rotating');
        this.loadAllData();
        setTimeout(() => {
            if (refreshBtn) refreshBtn.classList.remove('rotating');
        }, 1000);
    }

    refreshAllData() {
        this.showToast('Refreshing all data...', 'info');
        this.refreshData();
        switch (this.currentPage) {
            case 'bookings': this.updateBookingsTable(); break;
            case 'revenue': this.loadRevenueData(); break;
            case 'customers': this.loadCustomersData(); break;
            case 'analysis': this.updateAnalysisPage(); break;
            case 'dashboard': this.updateDashboardData(); break;
        }
    }

    exportData() {
        let csv = 'Booking ID,Customer Name,Mobile,Date,Time,Services,Amount,Payment Status,Status\n';
        this.allBookings.forEach(booking => {
            csv += `"${booking.booking_id}","${booking.customer_name || ''}","${booking.customer_mobile || ''}","${booking.booking_date || ''}","${booking.booking_time || ''}","${booking.services || ''}",${booking.total_amount || 0},"${booking.payment_status || ''}","${booking.status || ''}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kwikkwash-bookings-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.showToast('Data exported successfully!', 'success');
    }

    checkForUpdates() {
        this.refreshData();
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 5000);
    }

    showLoading() {
        document.querySelectorAll('.kpi-value, .stat-value').forEach(el => {
            el.classList.add('loading-shimmer');
        });
    }

    hideLoading() {
        document.querySelectorAll('.loading-shimmer').forEach(el => {
            el.classList.remove('loading-shimmer');
        });
    }

    updateCounts() {
        const bookingCount = document.getElementById('bookingCount');
        if (bookingCount) bookingCount.textContent = this.allBookings.length;
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    handleResize() {
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
        }
    }

    viewCustomer(mobile) {
        this.showToast(`View customer ${mobile} - feature coming soon!`, 'info');
    }

    contactCustomer(mobile) {
        this.showToast(`Contact customer ${mobile} - feature coming soon!`, 'info');
    }
}

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});

const API_BASE = 'https://bot.strikit.in/api/dashboard';
let currentToken = localStorage.getItem('strikit_token');
let currentOwner = JSON.parse(localStorage.getItem('strikit_owner') || 'null');
let revenueChartInstance = null;
let comparisonChartInstance = null;
let comparisonData = null;

// DOM Elements
const views = {
    login: document.getElementById('view-login'),
    main: document.getElementById('view-main')
};
const pages = {
    dashboard: document.getElementById('page-dashboard'),
    bookings: document.getElementById('page-bookings'),
    revenue: document.getElementById('page-revenue'),
    settings: document.getElementById('page-settings')
};

// Utilities
const showLoader = () => document.getElementById('global-loader').classList.remove('hidden');
const hideLoader = () => document.getElementById('global-loader').classList.add('hidden');

const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// API Fetch Helper
const apiCall = async (endpoint, options = {}) => {
    showLoader();
    const headers = { 'Content-Type': 'application/json' };
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });
        
        if (response.status === 401) {
            handleLogout();
            throw new Error('Session expired. Please login again.');
        }
        
        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : await response.blob();
        
        if (!response.ok) throw new Error(data.message || 'API request failed');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    } finally {
        hideLoader();
    }
};

// Initialize App
const initApp = () => {
    if (currentToken && currentOwner) {
        showView('main');
        updateUserInfo();
        loadDashboardStats();
    } else {
        showView('login');
    }
    setupEventListeners();
};

const showView = (viewName) => {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
};

const showPage = (pageName) => {
    Object.values(pages).forEach(p => p.classList.add('hidden'));
    pages[pageName].classList.remove('hidden');
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(nav => {
        if (nav.dataset.target === pageName) nav.classList.add('active');
        else nav.classList.remove('active');
    });
    
    // Capitalize title
    document.getElementById('page-title').innerText = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Load page data
    if (pageName === 'dashboard') loadDashboardStats();
    if (pageName === 'bookings') loadBookings();
    if (pageName === 'revenue') loadRevenue('daily');
    if (pageName === 'settings') loadSettings();
};

const updateUserInfo = () => {
    document.getElementById('user-name').innerText = currentOwner.name || 'Owner';
    document.getElementById('turf-name-header').innerText = currentOwner.turfName || 'My Turf';
    
    const roleBadge = document.getElementById('user-role');
    const accessType = currentOwner.accessType || 'view';
    roleBadge.innerText = accessType === 'edit' ? 'Edit Access' : 'View Only';
    roleBadge.className = `badge badge-${accessType}`;
    
    // Lock settings if view only
    const settingsLockedMsg = document.getElementById('settings-locked-msg');
    const settingsContent = document.getElementById('settings-content');
    
    if (accessType === 'view') {
        settingsLockedMsg.classList.remove('hidden');
        settingsContent.style.opacity = '0.5';
        settingsContent.style.pointerEvents = 'none';
    } else {
        settingsLockedMsg.classList.add('hidden');
        settingsContent.style.opacity = '1';
        settingsContent.style.pointerEvents = 'auto';
    }
};

// Data Loaders
const loadDashboardStats = async () => {
    try {
        const stats = await apiCall('/stats');
        document.getElementById('stat-today-bookings').innerText = stats.todayBookings || 0;
        document.getElementById('stat-month-revenue').innerText = formatMoney(stats.monthRevenue || 0);
        document.getElementById('stat-total-bookings').innerText = stats.totalBookings || 0;
        
        const statusEl = document.getElementById('stat-active-status');
        statusEl.innerText = stats.activeStatus ? 'Active' : 'Inactive';
        statusEl.className = `stat-value ${stats.activeStatus ? 'status-active' : 'status-inactive'}`;
        
        await loadComparisonChart();
    } catch (e) { console.error('Failed to load stats'); }
};

const loadComparisonChart = async () => {
    try {
        comparisonData = await apiCall('/comparison');
        renderComparisonChart('revenue');
    } catch (e) {
        console.error('Failed to load comparison data', e);
    }
};

const renderComparisonChart = (metric) => {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }
    
    const datasets = {
        revenue: {
            thisMonth: comparisonData.revenue.thisMonth,
            lastMonth: comparisonData.revenue.lastMonth,
            labelSuffix: ' (INR)'
        },
        bookings: {
            thisMonth: comparisonData.bookings.thisMonth,
            lastMonth: comparisonData.bookings.lastMonth,
            labelSuffix: ' Bookings'
        }
    };
    
    const activeData = datasets[metric];
    
    comparisonChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: comparisonData.labels,
            datasets: [
                {
                    label: `This Month${activeData.labelSuffix}`,
                    data: activeData.thisMonth,
                    borderColor: '#00e676',
                    backgroundColor: 'rgba(0, 230, 118, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: `Last Month${activeData.labelSuffix}`,
                    data: activeData.lastMonth,
                    borderColor: '#9ca3af',
                    backgroundColor: 'rgba(156, 163, 175, 0.05)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#9ca3af' }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
};

const loadBookings = async () => {
    const from = document.getElementById('filter-from-date').value;
    const to = document.getElementById('filter-to-date').value;
    let url = '/bookings';
    if (from && to) url += `?from=${from}&to=${to}`;
    
    try {
        const data = await apiCall(url);
        const tbody = document.getElementById('bookings-table-body');
        tbody.innerHTML = '';
        
        if (!data.bookings || data.bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No bookings found</td></tr>';
            return;
        }
        
        data.bookings.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td>${b.team || '-'}</td>
                <td>${b.captain || '-'}</td>
                <td>${b.phone}</td>
                <td>${formatMoney(b.amount)}</td>
                <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error('Failed to load bookings'); }
};

const loadRevenue = async (period = 'daily') => {
    try {
        const data = await apiCall(`/revenue?period=${period}`);
        
        document.getElementById('rev-today').innerText = formatMoney(data.summary?.today || 0);
        document.getElementById('rev-week').innerText = formatMoney(data.summary?.week || 0);
        document.getElementById('rev-month').innerText = formatMoney(data.summary?.month || 0);
        
        renderChart(data.chart || [], period);
    } catch (e) { console.error('Failed to load revenue'); }
};

const renderChart = (chartData, period) => {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }
    
    const labels = chartData.map(d => d.date);
    const amounts = chartData.map(d => d.amount);
    
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: amounts,
                borderColor: '#00e676',
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#00c853',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
};

const loadSettings = async () => {
    if (currentOwner.accessType === 'view') return;
    try {
        const me = await apiCall('/me');
        // Populate form
        document.getElementById('set-turf-name').value = me.turfName || '';
        document.getElementById('set-address').value = me.address || '';
        document.getElementById('set-price').value = me.price || '';
        document.getElementById('set-weekend-price').value = me.weekendPrice || '';
        document.getElementById('set-open-time').value = me.openingTime || '';
        document.getElementById('set-close-time').value = me.closingTime || '';
        
        document.getElementById('set-bank-name').value = me.bankName || '';
        document.getElementById('set-acc-name').value = me.accountName || '';
        document.getElementById('set-acc-number').value = me.accountNumber || '';
        document.getElementById('set-ifsc').value = me.ifsc || '';
    } catch (e) { console.error('Failed to load settings'); }
};

// Auth Actions
const handleLogin = async (e, type) => {
    e.preventDefault();
    const phone = document.getElementById(type === 'view' ? 'login-phone-view' : 'login-phone-edit').value;
    const password = type === 'edit' ? document.getElementById('login-password').value : undefined;
    
    const body = type === 'edit' ? { phone, password } : { phone };
    const endpoint = type === 'edit' ? '/login-edit' : '/login';
    
    try {
        const res = await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        currentToken = res.token;
        currentOwner = { ...res.owner, accessType: type };
        
        localStorage.setItem('strikit_token', currentToken);
        localStorage.setItem('strikit_owner', JSON.stringify(currentOwner));
        
        showToast('Login successful!');
        showView('main');
        updateUserInfo();
        showPage('dashboard');
    } catch (e) {
        // Error already handled in apiCall
    }
};

const handleLogout = () => {
    currentToken = null;
    currentOwner = null;
    localStorage.removeItem('strikit_token');
    localStorage.removeItem('strikit_owner');
    showView('login');
};

// Event Listeners Setup
const setupEventListeners = () => {
    // Login Tabs
    document.querySelectorAll('.login-container .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.login-container .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.login-container .tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`${e.target.dataset.tab}-content`).classList.add('active');
        });
    });

    // Login Forms
    document.getElementById('form-login-view').addEventListener('submit', (e) => handleLogin(e, 'view'));
    document.getElementById('form-login-edit').addEventListener('submit', (e) => handleLogin(e, 'edit'));
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.dataset.target;
            showPage(target);
            document.querySelector('.sidebar').classList.remove('show'); // close mobile menu
        });
    });

    // Mobile Menu Toggle
    document.getElementById('btn-mobile-menu').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('show');
    });

    // Bookings Filters
    document.getElementById('btn-filter-bookings').addEventListener('click', loadBookings);

    // Comparison Tabs
    document.querySelectorAll('#comparison-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#comparison-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const metric = e.target.dataset.metric;
            if (comparisonData) {
                renderComparisonChart(metric);
            }
        });
    });
    
    // Revenue Tabs
    document.querySelectorAll('#page-revenue .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#page-revenue .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadRevenue(e.target.dataset.period);
        });
    });

    // Settings Forms
    document.getElementById('form-turf-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            turfName: document.getElementById('set-turf-name').value,
            address: document.getElementById('set-address').value,
            price: document.getElementById('set-price').value,
            weekendPrice: document.getElementById('set-weekend-price').value,
            openingTime: document.getElementById('set-open-time').value,
            closingTime: document.getElementById('set-close-time').value
        };
        try {
            await apiCall('/turf', { method: 'PUT', body: JSON.stringify(data) });
            showToast('Turf details updated successfully');
            currentOwner.turfName = data.turfName;
            localStorage.setItem('strikit_owner', JSON.stringify(currentOwner));
            updateUserInfo();
        } catch (e) {}
    });

    document.getElementById('form-bank-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            bankName: document.getElementById('set-bank-name').value,
            accountName: document.getElementById('set-acc-name').value,
            accountNumber: document.getElementById('set-acc-number').value,
            ifsc: document.getElementById('set-ifsc').value
        };
        try {
            await apiCall('/bank', { method: 'PUT', body: JSON.stringify(data) });
            showToast('Bank details updated successfully');
        } catch (e) {}
    });

    document.getElementById('form-change-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            currentPassword: document.getElementById('set-current-pwd').value,
            newPassword: document.getElementById('set-new-pwd').value
        };
        try {
            await apiCall('/change-password', { method: 'POST', body: JSON.stringify(data) });
            showToast('Password changed successfully');
            document.getElementById('form-change-password').reset();
        } catch (e) {}
    });

    document.getElementById('btn-relogin').addEventListener('click', () => {
        handleLogout();
        // Switch to edit tab
        document.querySelector('.tab-btn[data-tab="login-edit"]').click();
    });

    // Downloads
    document.getElementById('btn-download-csv').addEventListener('click', async () => {
        const from = document.getElementById('filter-from-date').value;
        const to = document.getElementById('filter-to-date').value;
        let url = '/bookings/download';
        if (from && to) url += `?from=${from}&to=${to}`;
        
        try {
            const blob = await apiCall(url, { headers: { 'Accept': 'text/csv' } });
            downloadBlob(blob, 'bookings.csv');
        } catch (e) {}
    });

    document.getElementById('btn-download-pdf').addEventListener('click', async () => {
        const from = document.getElementById('revenue-from-date').value;
        const to = document.getElementById('revenue-to-date').value;
        let params = [];
        if (from) params.push(`from_date=${from}`);
        if (to) params.push(`to_date=${to}`);
        let url = '/revenue/download';
        if (params.length > 0) url += `?${params.join('&')}`;
        
        try {
            const blob = await apiCall(url, { headers: { 'Accept': 'application/pdf' } });
            downloadBlob(blob, 'revenue_report.pdf');
        } catch (e) {}
    });

    // Forgot Password Flow
    const modalForgot = document.getElementById('modal-forgot-pwd');
    document.getElementById('link-forgot-pwd').addEventListener('click', (e) => {
        e.preventDefault();
        modalForgot.classList.remove('hidden');
        document.getElementById('step-req-otp').classList.add('active');
        document.getElementById('step-req-otp').classList.remove('hidden');
        document.getElementById('step-verify-otp').classList.remove('active');
        document.getElementById('step-verify-otp').classList.add('hidden');
    });

    document.querySelector('.modal-close').addEventListener('click', () => {
        modalForgot.classList.add('hidden');
    });

    let resetPhone = '';
    document.getElementById('form-req-otp').addEventListener('submit', async (e) => {
        e.preventDefault();
        resetPhone = document.getElementById('forgot-phone').value;
        try {
            await apiCall('/forgot-password', { method: 'POST', body: JSON.stringify({ phone: resetPhone }) });
            showToast('OTP sent to your WhatsApp');
            document.getElementById('step-req-otp').classList.add('hidden');
            document.getElementById('step-req-otp').classList.remove('active');
            document.getElementById('step-verify-otp').classList.remove('hidden');
            document.getElementById('step-verify-otp').classList.add('active');
        } catch (e) {}
    });

    document.getElementById('form-verify-otp').addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = document.getElementById('forgot-otp').value;
        const newPassword = document.getElementById('forgot-new-pwd').value;
        try {
            await apiCall('/reset-password', { method: 'POST', body: JSON.stringify({ phone: resetPhone, otp, newPassword }) });
            showToast('Password reset successfully! Please login.');
            modalForgot.classList.add('hidden');
            document.getElementById('form-verify-otp').reset();
        } catch (e) {}
    });
};


const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// Run app
document.addEventListener('DOMContentLoaded', initApp);

// ========================================
// Royal Photowaala Admin Panel JavaScript
// Combined Login + Dashboard Functionality
// ========================================

// Demo credentials (replace with real backend authentication)
const LOGIN_CREDENTIALS = { username: 'admin', password: 'admin123' };
let isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';

document.addEventListener('DOMContentLoaded', function() {
  const loginScreen = document.getElementById('loginScreen');
  const dashboardScreen = document.getElementById('dashboardScreen');
  
  // Show appropriate screen on load
  if (isLoggedIn) {
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'flex';
    initDashboard();
  }

  // LOGIN FORM HANDLER
  document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (username === LOGIN_CREDENTIALS.username && password === LOGIN_CREDENTIALS.password) {
      // Successful login
      localStorage.setItem('adminLoggedIn', 'true');
      isLoggedIn = true;
      loginScreen.style.display = 'none';
      dashboardScreen.style.display = 'flex';
      document.getElementById('loginForm').reset();
      showToast('Welcome back, Admin!', 'success');
      initDashboard();
    } else {
      showError('Invalid username or password');
    }
  });

  // LOGOUT HANDLER
  document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('adminLoggedIn');
    isLoggedIn = false;
    dashboardScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    document.getElementById('loginForm').reset();
    hideError();
    showToast('Logged out successfully', 'success');
  });
});

// ========================================
// DASHBOARD INITIALIZATION
// ========================================
function initDashboard() {
  initNavigation();
  initDarkMode();
  loadStats();
  loadMockData();
  initGalleryDragDrop();
  initForms();
  initFilters();
  initModals();
}

// Navigation between sections
function initNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('data-section');
      
      // Update active nav link
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Show target section
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(section).classList.add('active');
    });
  });
}

// Dark/Light mode toggle
function initDarkMode() {
  const toggle = document.querySelector('.toggle-mode');
  if (toggle) {
    toggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      this.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
      localStorage.setItem('darkMode', isDark);
    });
    
    // Load saved theme
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      toggle.textContent = '☀️ Light Mode';
    }
  }
}

// Load statistics (mock data - replace with API)
function loadStats() {
  document.getElementById('totalBookings').textContent = '12';
  document.getElementById('pendingBookings').textContent = '3';
  document.getElementById('confirmedBookings').textContent = '9';
  document.getElementById('totalImages').textContent = '45';
}

// Load mock data for tables
function loadMockData() {
  loadMockBookings();
  loadMockReviews();
}

function loadMockBookings() {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = `
    <tr>
      <td>#001</td>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td>+91 98765 43210</td>
      <td>Premium Wedding</td>
      <td>2025-12-20</td>
      <td><select class="status-select">
        <option>pending</option>
        <option>confirmed</option>
        <option>completed</option>
      </select></td>
      <td>
        <button class="btn-view" title="View Details">👁️</button>
        <button class="btn-delete" title="Delete">🗑️</button>
      </td>
    </tr>
    <tr>
      <td>#002</td>
      <td>Jane Smith</td>
      <td>jane@example.com</td>
      <td>+91 98765 43211</td>
      <td>Basic Portrait</td>
      <td>2025-12-25</td>
      <td><select class="status-select"><option>pending</option></select></td>
      <td><button class="btn-view">👁️</button> <button class="btn-delete">🗑️</button></td>
    </tr>
  `;
}

function loadMockReviews() {
  const tbody = document.getElementById('reviewsTableBody');
  tbody.innerHTML = `
    <tr>
      <td>#001</td>
      <td>Sarah K.</td>
      <td>★★★★★</td>
      <td>Amazing photographer!</td>
      <td>2025-12-20</td>
      <td class="review-status approved">Approved</td>
      <td>
        <button class="btn-approve">✅</button>
        <button class="btn-delete">🗑️</button>
      </td>
    </tr>
  `;
}

// Gallery drag & drop with SortableJS
function initGalleryDragDrop() {
  const gallery = document.getElementById('galleryImages');
  if (typeof Sortable !== 'undefined' && gallery) {
    new Sortable(gallery, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: function() {
        showToast('Gallery order updated!', 'success');
      }
    });
  }
}

// Form handlers
function initForms() {
  document.querySelectorAll('form[id^="add"]').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const fileInput = this.querySelector('input[type="file"]');
      if (fileInput.files.length > 0) {
        showToast('Image uploaded successfully!', 'success');
      } else {
        showToast('Please select a file first', 'error');
      }
    });
  });
}

// Filter handlers
function initFilters() {
  // Status filter for bookings
  document.getElementById('statusFilter')?.addEventListener('change', function() {
    showToast(`Filtering by: ${this.value}`, 'info');
  });

  // Review filter
  document.getElementById('reviewStatusFilter')?.addEventListener('change', function() {
    showToast(`Showing: ${this.value} reviews`, 'info');
  });

  // Refresh buttons
  document.getElementById('refreshBookings')?.addEventListener('click', loadMockBookings);
  document.getElementById('refreshReviews')?.addEventListener('click', loadMockReviews);
}

// Modal handlers
function initModals() {
  const modal = document.getElementById('bookingModal');
  const closeBtn = document.querySelector('.modal-close');
  
  // Close modal
  closeBtn?.addEventListener('click', () => modal.classList.remove('show'));
  
  // Close on outside click
  modal?.addEventListener('click', function(e) {
    if (e.target === this) {
      this.classList.remove('show');
    }
  });

  // View buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-view')) {
      modal.querySelector('#modalBody').innerHTML = `
        <div class="booking-details">
          <p><strong>Name:</strong> John Doe</p>
          <p><strong>Email:</strong> john@example.com</p>
          <p><strong>Phone:</strong> +91 98765 43210</p>
          <p><strong>Package:</strong> Premium Wedding</p>
          <p><strong>Date:</strong> 2025-12-20</p>
          <p><strong>Status:</strong> Pending</p>
        </div>
      `;
      modal.classList.add('show');
    }
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showError(message) {
  const errorBox = document.getElementById('errorBox');
  errorBox.textContent = message;
  errorBox.style.display = 'block';
  setTimeout(() => hideError(), 5000);
}

function hideError() {
  document.getElementById('errorBox').style.display = 'none';
}

// Action button handlers
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('btn-delete')) {
    if (confirm('Are you sure you want to delete this?')) {
      e.target.closest('tr').remove();
      showToast('Item deleted successfully', 'success');
    }
  }
});

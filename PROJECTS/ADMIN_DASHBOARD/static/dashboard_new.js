/**
 * Royal Photowaala - Admin Dashboard JavaScript
 * Handles bookings, gallery, logo, and home images management
 */

const API_BASE = '/api'; // Add /api prefix for backend routes
const dbName = "RoyalPhotowaalaDB";
let db;

// ==================== INITIALIZATION ====================
console.log('🚀 Dashboard JavaScript loading...');
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 DOM Content Loaded - Starting initialization...');
  
  try {
    console.log('🚀 Initializing core functions...');
    initIndexedDB();
    initNavigation();
    initDarkMode();
    
    console.log('🚀 Loading bookings after delay...');
    // Load bookings after a short delay to ensure session is ready
    setTimeout(() => {
      console.log('📅 Starting to load bookings...');
      loadBookings();
    }, 500);
    
    console.log('🚀 Loading images...');
    // Load shared images
    renderGalleryImages();
    renderLogo();
    renderHomeImages();
    
    // Update image stats
    updateImageStats();
    
    console.log('🚀 Setting up event listeners...');
    // Event listeners
    document.getElementById('addImageForm')?.addEventListener('submit', handleAddImage);
    document.getElementById('addLogoForm')?.addEventListener('submit', handleAddLogo);
    document.getElementById('addHomeForm')?.addEventListener('submit', handleAddHomeImage);
    document.getElementById('refreshBookings')?.addEventListener('click', loadBookings);
    document.getElementById('archiveBookings')?.addEventListener('click', archiveOldBookings);
    document.getElementById('statusFilter')?.addEventListener('change', filterBookings);
    document.querySelector('.modal-close')?.addEventListener('click', closeModal);
    
    console.log('🚀 Dashboard initialization complete');
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    console.error('❌ Error stack:', error.stack);
  }
});

// ==================== BOOKINGS MANAGEMENT ====================
async function loadBookings() {
  console.log('📅 loadBookings function called');
  const tbody = document.getElementById('bookingsTableBody');
  
  if (!tbody) {
    console.error('📅 bookingsTableBody element not found!');
    return;
  }
  
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading bookings...</td></tr>';
  
  try {
    console.log('📅 Fetching bookings from:', `${API_BASE}/bookings`);
    
    const response = await fetch(`${API_BASE}/bookings`, {
      credentials: 'include' // Include session cookies
    });
    
    console.log('📅 Response received:', response);
    console.log('📅 Response status:', response.status);
    console.log('📅 Response headers:', response.headers);
    
    if (!response.ok) {
      console.log('📅 Response not OK:', response.status, response.statusText);
      if (response.status === 401) {
        console.log('📅 Redirecting to login - 401 Unauthorized');
        window.location.href = '/login';
        return;
      }
      throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText}`);
    }
    
    console.log('📅 Response OK, parsing JSON...');
    const data = await response.json();
    console.log('📅 Bookings data received:', data);
    const bookings = data.bookings || [];
    
    console.log('📅 Processing bookings:', bookings.length);
    
    // Update statistics
    updateBookingStats(bookings);
    
    // Render bookings table
    renderBookingsTable(bookings);
    
    console.log('📅 Bookings loaded successfully');
  } catch (error) {
    console.error('❌ Error loading bookings:', error);
    console.error('❌ Error type:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error details:', error.stack);
    
    // Show error message as described in the image
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="error-cell">
          <div class="error-message">
            ❌ Failed to load bookings. Please refresh.
          </div>
        </td>
      </tr>
    `;
    showToast('Failed to load bookings', 'error');
  }
}

function renderBookingsTable(bookings) {
  console.log('📅 renderBookingsTable called with:', bookings.length, 'bookings');
  const tbody = document.getElementById('bookingsTableBody');
  
  if (!tbody) {
    console.error('📅 bookingsTableBody element not found!');
    return;
  }
  
  console.log('📅 Found tbody element:', tbody);
  
  if (bookings.length === 0) {
    console.log('📅 No bookings found, showing empty message');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No bookings found</td></tr>';
    return;
  }
  
  console.log('📅 Rendering bookings table with', bookings.length, 'bookings');
  
  try {
    tbody.innerHTML = bookings.map(booking => {
      console.log('📅 Rendering booking:', booking);
      return `
    <tr data-id="${booking.id}">
      <td>${booking.id}</td>
      <td>${escapeHtml(booking.name)}</td>
      <td>${escapeHtml(booking.phone)}</td>
      <td>${escapeHtml(booking.package)}</td>
      <td>${formatDate(booking.date)}</td>
      <td>${escapeHtml(booking.details || 'N/A')}</td>
      <td>
        <select class="status-select" data-id="${booking.id}" onchange="updateBookingStatus(${booking.id}, this.value)">
          <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
          <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
          <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>🎉 Completed</option>
        </select>
      </td>
      <td class="action-buttons">
        <button class="btn-view" onclick="viewBookingDetails(${booking.id})" title="View Details">👁️</button>
        <button class="btn-delete" onclick="deleteBooking(${booking.id})" title="Delete">🗑️</button>
      </td>
    </tr>
  `;
    }).join('');
    
    console.log('📅 Bookings table rendered successfully');
  } catch (error) {
    console.error('📅 Error rendering bookings table:', error);
    console.error('📅 Error stack:', error.stack);
  }
}

// ==================== NAVIGATION ====================
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.content-section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.dataset.section;
      
      // Update active states
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById(targetSection)?.classList.add('active');
    });
  });
}

// ==================== DARK MODE ====================
function initDarkMode() {
  const darkBtn = document.querySelector('.toggle-mode'); // Use class selector instead of ID
  if (!darkBtn) {
    console.log('🌙 Dark mode button not found');
    return;
  }
  
  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    darkBtn.textContent = "🌞 Light Mode";
  }
  
  darkBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    darkBtn.textContent = isDark ? "🌞 Light Mode" : "🌙 Dark Mode";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// ==================== IMAGE MANAGEMENT ====================
async function renderGalleryImages() {
  try {
    const response = await fetch('/api/gallery-images', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      const container = document.getElementById('galleryImages');
      if (!container) return;
      
      if (data.images.length === 0) {
        container.innerHTML = '<p class="empty-state">No gallery images yet. Upload your first image!</p>';
        return;
      }
      
      container.innerHTML = data.images.map(img => `
        <div class="image-item" data-filename="${img.filename}">
          <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
          <img src="${img.url}" alt="Gallery Image" loading="lazy" />
          <button class="delete-btn" onclick="deleteGalleryImage('${img.filename}')" title="Delete">🗑️</button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading gallery images:', error);
  }
}

async function renderLogo() {
  try {
    const response = await fetch('/api/logo', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success && data.logo) {
      const container = document.getElementById('logoPreview');
      if (container) {
        container.innerHTML = `<img src="${data.logo.url}" alt="Logo" style="max-width: 200px; max-height: 100px;" />`;
      }
    }
  } catch (error) {
    console.error('Error loading logo:', error);
  }
}

async function renderHomeImages() {
  console.log('🏠 Loading home images...');
  try {
    const response = await fetch('/api/home-images', {
      credentials: 'include'
    });
    const data = await response.json();
    
    console.log('🏠 Home images response:', data);
    
    if (data.success) {
      const container = document.getElementById('homeImages');
      if (!container) {
        console.log('🏠 Home images container not found');
        return;
      }
      
      console.log('🏠 Found home images container, images count:', data.images.length);
      
      if (data.images.length === 0) {
        container.innerHTML = '<p class="empty-state">No home images yet. Upload your first image!</p>';
        return;
      }
      
      container.innerHTML = data.images.map(img => {
        console.log('🏠 Rendering home image:', img);
        return `
        <div class="image-item" data-filename="${img.filename}">
          <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
          <img src="${img.url}" alt="Home Image" loading="lazy" />
          <button class="delete-btn" onclick="deleteHomeImage('${img.filename}')" title="Delete">🗑️</button>
        </div>
      `;
      }).join('');
      
      console.log('🏠 Home images rendered successfully');
    } else {
      console.log('🏠 Home images API returned success:false');
    }
  } catch (error) {
    console.error('❌ Error loading home images:', error);
  }
}

// ==================== FORM HANDLERS ====================
async function handleAddImage(e) {
  e.preventDefault();
  const file = e.target.imageFile.files[0];
  
  if (!file) {
    showToast('Please select an image', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('imageFile', file);
  
  try {
    const response = await fetch('/api/gallery-images', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      showToast('Gallery image uploaded successfully!', 'success');
      renderGalleryImages();
      e.target.reset();
    } else {
      showToast(data.message || 'Failed to upload image', 'error');
    }
  } catch (error) {
    console.error('Gallery upload error:', error);
    showToast('Failed to upload image', 'error');
  }
}

async function handleAddLogo(e) {
  e.preventDefault();
  const file = e.target.logoFile.files[0];
  
  if (!file) {
    showToast('Please select a logo', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('logoFile', file);
  
  try {
    const response = await fetch('/api/logo', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      showToast('Logo uploaded successfully!', 'success');
      renderLogo();
      e.target.reset();
    } else {
      showToast(data.message || 'Failed to upload logo', 'error');
    }
  } catch (error) {
    console.error('Logo upload error:', error);
    showToast('Failed to upload logo', 'error');
  }
}

async function handleAddHomeImage(e) {
  e.preventDefault();
  const file = e.target.homeFile.files[0];
  
  if (!file) {
    showToast('Please select an image', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('homeFile', file);
  
  try {
    const response = await fetch('/api/home-images', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      showToast('Home image uploaded successfully!', 'success');
      renderHomeImages();
      e.target.reset();
    } else {
      showToast(data.message || 'Failed to upload home image', 'error');
    }
  } catch (error) {
    console.error('Home image upload error:', error);
    showToast('Failed to upload home image', 'error');
  }
}

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateBookingStats(bookings) {
  const totalElement = document.getElementById('totalBookings');
  const pendingElement = document.getElementById('pendingBookings');
  const confirmedElement = document.getElementById('confirmedBookings');
  
  if (totalElement) totalElement.textContent = bookings.length;
  if (pendingElement) pendingElement.textContent = bookings.filter(b => b.status === 'pending').length;
  if (confirmedElement) confirmedElement.textContent = bookings.filter(b => b.status === 'confirmed').length;
}

function updateImageStats() {
  // Update image statistics if needed
}

// Placeholder functions for features not yet implemented
function initIndexedDB() {
  console.log('🗄️ IndexedDB initialization (placeholder)');
}

function deleteGalleryImage(filename) {
  if (confirm('Delete this gallery image?')) {
    fetch(`/api/gallery-images/${filename}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showToast('Gallery image deleted', 'success');
        renderGalleryImages();
      } else {
        showToast(data.message || 'Failed to delete image', 'error');
      }
    })
    .catch(error => {
      console.error('Error deleting image:', error);
      showToast('Failed to delete image', 'error');
    });
  }
}

function deleteHomeImage(filename) {
  console.log('🏠 Deleting home image:', filename);
  if (confirm('Delete this home image?')) {
    fetch(`/api/home-images/${filename}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    .then(response => {
      console.log('🏠 Delete response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('🏠 Delete response data:', data);
      if (data.success) {
        showToast('Home image deleted', 'success');
        renderHomeImages();
      } else {
        showToast(data.message || 'Failed to delete image', 'error');
      }
    })
    .catch(error => {
      console.error('❌ Error deleting image:', error);
      showToast('Failed to delete image', 'error');
    });
  }
}

function updateBookingStatus(bookingId, newStatus) {
  fetch(`/api/bookings/${bookingId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
    credentials: 'include'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast(`Booking status updated to ${newStatus}`, 'success');
      loadBookings(); // Refresh to update stats
    } else {
      showToast('Failed to update status', 'error');
      loadBookings(); // Revert UI
    }
  })
  .catch(error => {
    console.error('Error updating status:', error);
    showToast('Failed to update status', 'error');
    loadBookings();
  });
}

function deleteBooking(bookingId) {
  if (confirm('Delete this booking?')) {
    fetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showToast('Booking deleted successfully', 'success');
        loadBookings();
      } else {
        showToast('Failed to delete booking', 'error');
      }
    })
    .catch(error => {
      console.error('Error deleting booking:', error);
      showToast('Failed to delete booking', 'error');
    });
  }
}

function viewBookingDetails(bookingId) {
  // Placeholder for viewing booking details
  showToast('Booking details feature coming soon', 'info');
}

function filterBookings() {
  const filterValue = document.getElementById('statusFilter').value;
  const rows = document.querySelectorAll('#bookingsTableBody tr');
  
  rows.forEach(row => {
    if (filterValue === 'all') {
      row.style.display = '';
    } else {
      const status = row.querySelector('.status-select')?.value;
      row.style.display = status === filterValue ? '' : 'none';
    }
  });
}

function archiveOldBookings() {
  showToast('Archive feature coming soon', 'info');
}

function closeModal() {
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = button.dataset.loadingText || 'Loading...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

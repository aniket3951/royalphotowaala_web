/**
 * Royal Photowaala - Admin Dashboard JavaScript
 * Handles bookings, gallery, logo, and home images management
 */

const API_BASE = 'http://localhost:5000/api'; // Point to main website API

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
  initNavigation();
  initDarkMode();
  loadBookings();
  loadSiteAssets();
  loadHomeImages();
  loadGalleryImages();
  
  // Event Listeners
  document.getElementById('addImageForm').addEventListener('submit', handleAddImage);
  document.getElementById('addLogoForm').addEventListener('submit', handleAddLogo);
  document.getElementById('addHomeForm').addEventListener('submit', handleAddHomeImage);
  document.getElementById('refreshBookings').addEventListener('click', loadBookings);
  document.getElementById('statusFilter').addEventListener('change', filterBookings);
});

// ==================== ASSET LOADING FUNCTIONS ====================
async function loadSiteAssets() {
  try {
    const response = await fetch(`${API_BASE}/site-assets`);
    if (!response.ok) throw new Error('Failed to load site assets');
    
    const assets = await response.json();
    renderLogo(assets.logo);
  } catch (error) {
    console.error('Error loading site assets:', error);
  }
}

async function loadHomeImages() {
  try {
    const response = await fetch(`${API_BASE}/home-images`);
    if (!response.ok) throw new Error('Failed to load home images');
    
    const images = await response.json();
    renderHomeImages(images);
  } catch (error) {
    console.error('Error loading home images:', error);
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
  const darkBtn = document.querySelector('.toggle-mode');
  
  // Load saved theme
  if (localStorage.getItem("theme") === "dark") {
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

// ==================== BOOKINGS MANAGEMENT ====================
async function loadBookings() {
  console.log('🔍 Loading bookings from:', API_BASE + '/bookings');
  
  try {
    const response = await fetch(`${API_BASE}/bookings`, {
      credentials: 'include'
    });
    
    console.log('📥 Bookings response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Bookings fetch failed:', errorText);
      throw new Error('Failed to fetch bookings');
    }
    
    const data = await response.json();
    console.log('✅ Bookings data:', data);
    
    const bookings = data.bookings || [];
    
    // Update statistics
    updateBookingStats(bookings);
    
    // Render bookings table
    renderBookingsTable(bookings);
    
  } catch (error) {
    console.error('❌ Error loading bookings:', error);
    const tbody = document.getElementById('bookingsTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" class="error-cell">Failed to load bookings. Please refresh.</td></tr>';
    }
    showToast('Failed to load bookings', 'error');
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No bookings found</td></tr>';
    return;
  }
  
  tbody.innerHTML = bookings.map(booking => `
    <tr data-id="${booking.id}">
      <td>${booking.id}</td>
      <td>${escapeHtml(booking.name)}</td>
      <td><a href="mailto:${escapeHtml(booking.email)}">${escapeHtml(booking.email)}</a></td>
      <td><a href="tel:${escapeHtml(booking.phone)}">${escapeHtml(booking.phone)}</a></td>
      <td>${escapeHtml(booking.package)}</td>
      <td>${formatDate(booking.date)}</td>
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
  `).join('');
}

async function updateBookingStatus(bookingId, newStatus) {
  try {
    const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error('Failed to update status');
    
    showToast(`Booking status updated to ${newStatus}`, 'success');
    loadBookings(); // Refresh to update stats
    
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Failed to update status', 'error');
    loadBookings(); // Revert UI
  }
}

async function deleteBooking(bookingId) {
  if (!confirm('Are you sure you want to delete this booking?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to delete booking');
    
    showToast('Booking deleted successfully', 'success');
    loadBookings();
    
  } catch (error) {
    console.error('Error deleting booking:', error);
    showToast('Failed to delete booking', 'error');
  }
}

function viewBookingDetails(bookingId) {
  // Find booking in current table
  const row = document.querySelector(`tr[data-id="${bookingId}"]`);
  if (!row) return;
  
  const cells = row.querySelectorAll('td');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <div class="booking-details">
      <p><strong>Booking ID:</strong> ${cells[0].textContent}</p>
      <p><strong>Name:</strong> ${cells[1].textContent}</p>
      <p><strong>Email:</strong> ${cells[2].textContent}</p>
      <p><strong>Phone:</strong> ${cells[3].textContent}</p>
      <p><strong>Package:</strong> ${cells[4].textContent}</p>
      <p><strong>Event Date:</strong> ${cells[5].textContent}</p>
      <p><strong>Status:</strong> ${cells[6].querySelector('select').selectedOptions[0].textContent}</p>
    </div>
  `;
  
  document.getElementById('bookingModal').classList.add('show');
}

function closeModal() {
  document.getElementById('bookingModal').classList.remove('show');
}

function filterBookings() {
  const filterValue = document.getElementById('statusFilter').value;
  const rows = document.querySelectorAll('#bookingsTableBody tr');
  
  rows.forEach(row => {
    if (filterValue === 'all') {
      row.style.display = '';
    } else {
      const select = row.querySelector('.status-select');
      if (select && select.value === filterValue) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

function updateBookingStats(bookings) {
  document.getElementById('totalBookings').textContent = bookings.length;
  document.getElementById('pendingBookings').textContent = 
    bookings.filter(b => b.status === 'pending').length;
  document.getElementById('confirmedBookings').textContent = 
    bookings.filter(b => b.status === 'confirmed').length;
}

async function archiveOldBookings() {
  if (!confirm('This will archive all bookings older than 3 months to an Excel file. Continue?')) {
    return;
  }
  
  const btn = document.getElementById('archiveBookings');
  const originalText = btn.textContent;
  btn.textContent = '⏳ Archiving...';
  btn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE}/archive-bookings`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to archive bookings');
    
    const data = await response.json();
    showToast('Old bookings archived successfully! Check the archives folder.', 'success');
    loadBookings(); // Refresh the list
    
  } catch (error) {
    console.error('Error archiving bookings:', error);
    showToast('Failed to archive bookings', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

// ==================== GALLERY MANAGEMENT ====================
async function loadGalleryImages() {
  try {
    const response = await fetch(`${API_BASE}/gallery`);
    if (!response.ok) throw new Error('Failed to load gallery images');
    
    const images = await response.json();
    renderGalleryImages(images);
  } catch (error) {
    console.error('Error loading gallery images:', error);
  }
}

function renderGalleryImages(images) {
  const container = document.getElementById('galleryImages');
  
  if (!images || images.length === 0) {
    container.innerHTML = '<p class="empty-state">No images yet. Upload your first image!</p>';
    return;
  }
  
  container.innerHTML = images.map(img => `
    <div class="image-item" data-id="${img.id}">
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <img src="${img.url}" alt="${img.caption || 'Gallery Image'}" loading="lazy" />
      <button class="delete-btn" onclick="deleteGalleryImage('${img.public_id}')" title="Delete">🗑️</button>
    </div>
  `).join('');
}

async function handleAddImage(e) {
  e.preventDefault();
  const file = e.target.imageFile.files[0];
  
  console.log('🔍 Uploading image:', file);
  
  if (!file) {
    showToast('Please select an image', 'error');
    return;
  }
  
  if (file.size > 100 * 1024 * 1024) {
    showToast('Image must be less than 100MB', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('image', file);
  
  console.log('📤 Sending to API:', API_BASE + '/upload');
  
  try {
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Upload result:', result);
    
    if (result.ok) {
      e.target.reset();
      await loadGalleryImages();
      showToast('Image added to gallery', 'success');
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    showToast('Failed to upload image: ' + error.message, 'error');
  }
}

async function deleteGalleryImage(publicId) {
  if (!confirm('Delete this image from gallery?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/gallery/${publicId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete image');
    
    const result = await response.json();
    if (result.ok) {
      await loadGalleryImages();
      showToast('Image deleted successfully', 'success');
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    showToast('Failed to delete image', 'error');
  }
}

// ==================== LOGO MANAGEMENT ====================
function renderLogo(logo) {
  const logoSection = document.getElementById('logo');
  const uploadForm = logoSection.querySelector('.upload-form');
  
  if (logo && logo.url) {
    // Add preview
    const preview = document.createElement('div');
    preview.className = 'logo-preview';
    preview.innerHTML = `
      <img src="${logo.url}" alt="Current Logo" style="max-width: 200px; max-height: 100px; margin: 10px 0; border-radius: 5px;">
      <p style="color: #666; font-size: 0.9em;">Current logo</p>
    `;
    uploadForm.parentNode.insertBefore(preview, uploadForm.nextSibling);
  }
}

async function handleAddLogo(e) {
  e.preventDefault();
  const file = e.target.logoFile.files[0];
  
  console.log('🔍 Uploading logo:', file);
  
  if (!file) {
    showToast('Please select a logo', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('asset_type', 'logo');
  formData.append('alt_text', 'Royal Photowaala Logo');
  
  console.log('📤 Sending logo to API:', API_BASE + '/site-assets');
  
  try {
    const response = await fetch(`${API_BASE}/site-assets`, {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Logo response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Logo upload failed:', errorText);
      throw new Error(`Logo upload failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Logo upload result:', result);
    
    if (result.ok) {
      e.target.reset();
      // Remove old preview if exists
      const oldPreview = document.querySelector('.logo-preview');
      if (oldPreview) oldPreview.remove();
      // Reload assets to show new logo
      await loadSiteAssets();
      showToast('Logo updated successfully', 'success');
    } else {
      throw new Error(result.error || 'Logo upload failed');
    }
  } catch (error) {
    console.error('❌ Logo upload error:', error);
    showToast('Failed to upload logo: ' + error.message, 'error');
  }
}

// ==================== HOME IMAGES MANAGEMENT ====================
function renderHomeImages(images) {
  const container = document.getElementById('homeImages');
  
  if (!images || images.length === 0) {
    container.innerHTML = '<p class="empty-state">No home images yet. Upload your first image!</p>';
    return;
  }
  
  container.innerHTML = images.map(img => `
    <div class="image-item" data-id="${img.id}">
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <img src="${img.url}" alt="${img.caption || 'Home Image'}" loading="lazy" />
      <button class="delete-btn" onclick="deleteHomeImage(${img.id})" title="Delete">🗑️</button>
    </div>
  `).join('');
}

async function handleAddHomeImage(e) {
  e.preventDefault();
  const file = e.target.homeFile.files[0];
  
  console.log('🔍 Uploading home image:', file);
  
  if (!file) {
    showToast('Please select an image', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('caption', `Home image ${Date.now()}`);
  formData.append('display_order', '0');
  
  console.log('📤 Sending home image to API:', API_BASE + '/home-images');
  
  try {
    const response = await fetch(`${API_BASE}/home-images`, {
      method: 'POST',
      body: formData
    });
    
    console.log('📥 Home image response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Home image upload failed:', errorText);
      throw new Error(`Home image upload failed: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Home image upload result:', result);
    
    if (result.ok) {
      e.target.reset();
      await loadHomeImages();
      showToast('Home image added successfully', 'success');
    } else {
      throw new Error(result.error || 'Home image upload failed');
    }
  } catch (error) {
    console.error('❌ Home image upload error:', error);
    showToast('Failed to upload home image: ' + error.message, 'error');
  }
}

async function deleteHomeImage(id) {
  if (!confirm('Delete this home image?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/home-images/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete home image');
    
    const result = await response.json();
    if (result.ok) {
      await loadHomeImages();
      showToast('Home image deleted', 'success');
    }
  } catch (error) {
    console.error('Error deleting home image:', error);
    showToast('Failed to delete home image', 'error');
  }
}

// ==================== DRAG AND DROP ====================
function initSortable(container, storeName) {
  if (!container || container.children.length === 0) return;
  
  Sortable.create(container, {
    animation: 200,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: function(evt) {
      saveImageOrder(container, storeName);
      showToast('Image order updated', 'success');
    }
  });
}

function saveImageOrder(container, storeName) {
  const items = Array.from(container.querySelectorAll('.image-item'));
  const orderedIds = items.map(item => parseInt(item.dataset.id));
  
  // Get all images from store
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  
  store.getAll().onsuccess = (e) => {
    const allImages = e.target.result || [];
    
    // Clear the store
    const clearTx = db.transaction(storeName, "readwrite");
    const clearStore = clearTx.objectStore(storeName);
    clearStore.clear();
    
    clearTx.oncomplete = () => {
      // Re-add images in new order
      const addTx = db.transaction(storeName, "readwrite");
      const addStore = addTx.objectStore(storeName);
      
      orderedIds.forEach(id => {
        const image = allImages.find(img => img.id === id);
        if (image) {
          // Remove old id to let autoIncrement assign new sequential ids
          const { id: oldId, ...imageData } = image;
          addStore.add(imageData);
        }
      });
      
      addTx.oncomplete = () => {
        // Refresh the display
        if (storeName === 'galleryImages') {
          renderGalleryImages();
        } else if (storeName === 'homeImages') {
          renderHomeImages();
        }
      };
    };
  };
}

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
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

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('bookingModal');
  if (e.target === modal) {
    closeModal();
  }
});

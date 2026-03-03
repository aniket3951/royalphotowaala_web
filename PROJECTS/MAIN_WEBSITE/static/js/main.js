/**
 * Royal Photowaala - Main JavaScript
 * Handles IndexedDB, gallery, slideshow, and booking form
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
 
    // Toggle theme on click
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");

      const isLight = document.body.classList.contains("light-theme");
      themeToggle.textContent = isLight ? "☀️" : "🌙";
      localStorage.setItem("theme", isLight ? "light" : "dark");
    });
  }
// --- Initialize IndexedDB ---
  const dbName = "RoyalPhotowaalaDB";
  let db;
  const request = indexedDB.open(dbName, 1);

  // If DB fails to open
  request.onerror = () => console.error("IndexedDB open error");

  // When DB opens successfully
  request.onsuccess = () => {
  db = request.result;
  loadLogo();            // keep
  loadSlideshow();       // keep
  loadGalleryFromServer(); // ✅ NEW
};


  // Create DB stores if not exist
  request.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("galleryImages"))
      db.createObjectStore("galleryImages", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("homeImages"))
      db.createObjectStore("homeImages", { keyPath: "id", autoIncrement: true });
    if (!db.objectStoreNames.contains("websiteLogo"))
      db.createObjectStore("websiteLogo", { keyPath: "id" });
  };

  // --- Load Website Logo ---
  function loadLogo() {
    const transaction = db.transaction("websiteLogo", "readonly");
    const store = transaction.objectStore("websiteLogo");
    const request = store.get(1);
    request.onsuccess = () => {
      const container = document.getElementById("logo-container");
      container.innerHTML = "";
      if (request.result && request.result.data) {
        const img = document.createElement("img");
        img.src = request.result.data;
        img.alt = "Royal Photowaala Logo";
        img.style.height = "80px";
        img.style.marginRight = "10px";
        img.loading = "eager"; // Logo should load immediately
        container.appendChild(img);
      }
    };
  }
// ✅ NEW: Load gallery from backend (Cloudinary + DB)
async function loadGalleryFromServer() {
  try {
    const res = await fetch("/api/gallery");
    const images = await res.json();

    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";

    if (!images || images.length === 0) {
      gallery.innerHTML = "<p>No images uploaded yet.</p>";
      return;
    }

    images.forEach((img, i) => {
      const imageEl = document.createElement("img");
      imageEl.src = img.url;            // 🔥 Cloudinary URL
      imageEl.alt = img.caption || `Gallery Image ${i + 1}`;
      imageEl.loading = "lazy";
      imageEl.decoding = "async";
      gallery.appendChild(imageEl);
    });

  } catch (err) {
    console.error("Gallery load failed", err);
  }
}

  // --- Slideshow for Home Section ---
  function loadSlideshow() {
    const transaction = db.transaction("homeImages", "readonly");
    const store = transaction.objectStore("homeImages");
    const request = store.getAll();
    request.onsuccess = () => {
      const home = document.querySelector(".home");
      const images = request.result || [];
      if (images.length === 0) {
        // Default background if no image found
        home.style.backgroundImage = "url('https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e')";
        return;
      }
      let current = 0;
      home.style.backgroundImage = `url('${images[current].data}')`;
      // Change image every 4 seconds
      setInterval(() => {
        current = (current + 1) % images.length;
        home.style.backgroundImage = `url('${images[current].data}')`;
      }, 4000);
    };
  }

  // --- Form Validation Helper ---
  function validateForm() {
    const form = document.getElementById("bookingForm");
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    let isFirstError = true;

    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    // Check each input
    inputs.forEach(input => {
      const value = input.value.trim();
      const parent = input.parentElement;

      // Required field validation
      if (input.required && !value) {
        showError(input, 'This field is required');
        isValid = false;
        return;
      }

      // Email validation
      if (input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          showError(input, 'Please enter a valid email address');
          isValid = false;
          return;
        }
      }

      // Phone validation
      if (input.name === 'phone' && value) {
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(value)) {
          showError(input, 'Please enter a valid 10-digit phone number');
          isValid = false;
          return;
        }
      }

      // Date validation
      if (input.type === 'date' && value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          showError(input, 'Please select a future date');
          isValid = false;
          return;
        }
      }
    });

    return isValid;
  }

  function showError(input, message) {
    const parent = input.parentElement;
    input.classList.add('error');
    
    // Check if error message already exists
    if (!parent.querySelector('.error-message')) {
      const error = document.createElement('div');
      error.className = 'error-message';
      error.textContent = message;
      error.style.color = '#ff4444';
      error.style.fontSize = '0.8em';
      error.style.marginTop = '5px';
      parent.appendChild(error);
    }

    // Scroll to first error
    if (isFirstError) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      isFirstError = false;
    }
  }

// --- Booking Form Submission ---
document.getElementById("bookingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit']");
  
  // Clear previous messages
  const existingMessages = form.querySelectorAll('.form-message');
  existingMessages.forEach(msg => msg.remove());
  
  // Validate form
  if (!validateForm()) {
    return false;
  }
  
  // Get form data
  const formData = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    package: document.getElementById("package").value,
    date: document.getElementById("date").value,
    details: document.getElementById("details").value.trim()
  };
  
  try {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
    
    // Send booking request
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to process booking');
    }
    
    if (!data.wa_link) {
      throw new Error('No WhatsApp link received from server');
    }
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'form-message success';
    successMsg.innerHTML = '✅ Booking successful! Redirecting to WhatsApp...';
    form.appendChild(successMsg);
    successMsg.scrollIntoView({ behavior: 'smooth' });
    
    // Try to open WhatsApp
    try {
      // First try to open in a new tab
      const newWindow = window.open(data.wa_link, '_blank');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // If popup was blocked, show instructions
        showWhatsAppFallback(form, data.wa_link);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      showWhatsAppFallback(form, data.wa_link);
    }
    
    // Reset form
    form.reset();
    
  } catch (error) {
    console.error('Booking error:', error);
    const errorMsg = document.createElement('div');
    errorMsg.className = 'form-message error';
    errorMsg.innerHTML = `❌ ${error.message || 'An error occurred. Please try again or contact us directly.'}`;
    form.appendChild(errorMsg);
    errorMsg.scrollIntoView({ behavior: 'smooth' });
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = 'Book Now';
  }
});

// Show WhatsApp fallback with manual instructions
function showWhatsAppFallback(form, waLink) {
  const messageText = decodeURIComponent(waLink.split('text=')[1] || '').replace(/\+/g, ' ');
  
  const fallbackDiv = document.createElement('div');
  fallbackDiv.className = 'form-message info';
  fallbackDiv.innerHTML = `
    <p>Could not open WhatsApp automatically. Please click the button below or send this message manually:</p>
    <div class="whatsapp-fallback">
      <a href="${waLink}" class="btn btn-whatsapp" target="_blank" rel="noopener">
        <i class="fab fa-whatsapp"></i> Open in WhatsApp
      </a>
      <div class="message-preview">
        <p><strong>Message to send:</strong></p>
        <pre>${messageText}</pre>
      </div>
    </div>
  `;
  
  form.appendChild(fallbackDiv);
  fallbackDiv.scrollIntoView({ behavior: 'smooth' });
}

  // Close menu when a link is clicked
  document.querySelectorAll("nav ul li a").forEach(a => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("show");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("nav") && navLinks.classList.contains("show")) {
      navLinks.classList.remove("show");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // --- Smooth Scroll Enhancement ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
});
// ---------- LOAD APPROVED REVIEWS ----------
fetch("/api/reviews")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("reviewList");
    list.innerHTML = "";

    data.forEach(r => {
      list.innerHTML += `
        <div class="review-card">
          <strong>${r.name}</strong> – ${"⭐".repeat(r.rating)}
          <p>${r.comment}</p>
        </div>
      `;
    });
  });

// ---------- SUBMIT REVIEW ----------
document.getElementById("reviewForm").addEventListener("submit", e => {
  e.preventDefault();

  fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: document.getElementById("reviewName").value,
      rating: document.getElementById("reviewRating").value,
      comment: document.getElementById("reviewComment").value
    })
  })
  .then(res => res.json())
  .then(() => {
    alert("Review submitted for approval!");
    document.getElementById("reviewForm").reset();
  });
});


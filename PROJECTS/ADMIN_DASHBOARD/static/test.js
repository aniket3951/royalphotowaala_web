// Simple test to verify JavaScript is working
console.log('🔧 Test script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 DOM Content Loaded');
  
  // Test basic functionality
  const navLinks = document.querySelectorAll('.nav-link');
  console.log('🔧 Found nav links:', navLinks.length);
  
  // Test bookings fetch
  setTimeout(() => {
    console.log('🔧 Testing bookings fetch...');
    fetch('/api/bookings', {
      credentials: 'include'
    })
    .then(response => {
      console.log('🔧 Bookings response status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('🔧 Bookings data:', data);
    })
    .catch(error => {
      console.error('🔧 Bookings fetch error:', error);
    });
  }, 1000);
});

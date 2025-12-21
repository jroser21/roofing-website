// Premier Roofing Website - JavaScript

// =============================================
// CONFIGURATION
// =============================================
const GOOGLE_API_KEY = 'AIzaSyCzCJaCaLJkVbHf5X8aqIB1WdHBNDoGgvc';

// Backend API URL (change in production)
const API_URL = 'http://localhost:3000/api';

// Pricing per square (adjust as needed)
const PRICE_PER_SQUARE_LOW = 465;    // 3-Tab shingles
const PRICE_PER_SQUARE_MID = 550;    // Architectural shingles
const PRICE_PER_SQUARE_HIGH = 750;   // Designer/Premium shingles

// =============================================
// Google Maps & Solar API Integration
// =============================================

let autocomplete;
let map;
let selectedPlace = null;

// Initialize Google Places Autocomplete
function initAutocomplete() {
  const addressInput = document.getElementById('addressInput');

  if (!addressInput) return;

  autocomplete = new google.maps.places.Autocomplete(addressInput, {
    types: ['address'],
    componentRestrictions: { country: 'us' }
  });

  autocomplete.addListener('place_changed', function() {
    selectedPlace = autocomplete.getPlace();

    if (!selectedPlace.geometry) {
      console.log('No geometry for selected place');
      return;
    }
  });

  // Set up analyze button
  const analyzeBtn = document.getElementById('analyzeBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', analyzeRoof);
  }

  // Allow Enter key to trigger analysis
  addressInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      analyzeRoof();
    }
  });
}

// Analyze roof using Google Solar API
async function analyzeRoof() {
  const addressInput = document.getElementById('addressInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const btnText = analyzeBtn.querySelector('.btn-text');
  const btnLoading = analyzeBtn.querySelector('.btn-loading');
  const resultsSection = document.getElementById('estimateResults');
  const errorSection = document.getElementById('estimateError');

  if (!addressInput.value.trim()) {
    showNotification('Please enter an address', 'error');
    return;
  }

  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline-flex';
  analyzeBtn.disabled = true;
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';

  try {
    let lat, lng;

    // Get coordinates from selected place or geocode the address
    if (selectedPlace && selectedPlace.geometry) {
      lat = selectedPlace.geometry.location.lat();
      lng = selectedPlace.geometry.location.lng();
    } else {
      // Geocode the address
      const geocodeResult = await geocodeAddress(addressInput.value);
      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
      } else {
        throw new Error('Could not geocode address');
      }
    }

    // Call Google Solar API for building insights
    const solarData = await getBuildingInsights(lat, lng);

    if (solarData && solarData.solarPotential) {
      displayResults(solarData, lat, lng);
    } else {
      throw new Error('No solar data available for this location');
    }

  } catch (error) {
    console.error('Error analyzing roof:', error);
    showError(error.message || 'Unable to analyze this property. Please try again.');
  } finally {
    // Reset button state
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    analyzeBtn.disabled = false;
  }
}

// Geocode address to coordinates
async function geocodeAddress(address) {
  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        });
      } else {
        reject(new Error('Geocoding failed'));
      }
    });
  });
}

// Get building insights from Google Solar API
async function getBuildingInsights(lat, lng) {
  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    // If Solar API fails, use estimation based on typical roof sizes
    console.log('Solar API not available, using estimation');
    return estimateRoofSize(lat, lng);
  }

  return response.json();
}

// Fallback estimation when Solar API is not available
function estimateRoofSize(lat, lng) {
  // This returns a mock response structure similar to Solar API
  // In production, you might use other data sources or manual input

  // Average US home is about 2,500 sq ft with roof area ~1.5x floor area
  const estimatedRoofArea = 2000 + Math.random() * 1500; // 2000-3500 sq ft
  const segments = Math.floor(3 + Math.random() * 5); // 3-7 segments

  return {
    solarPotential: {
      wholeRoofStats: {
        areaMeters2: estimatedRoofArea * 0.0929, // Convert sq ft to sq m
      },
      roofSegmentStats: Array(segments).fill({
        pitchDegrees: 20 + Math.random() * 15
      }),
      maxArrayPanelsCount: Math.floor(estimatedRoofArea / 18) // ~18 sq ft per panel
    },
    isEstimate: true
  };
}

// Display results - Full Report
function displayResults(data, lat, lng) {
  const resultsSection = document.getElementById('estimateResults');
  const errorSection = document.getElementById('estimateError');
  const addressInput = document.getElementById('addressInput');

  errorSection.style.display = 'none';
  resultsSection.style.display = 'block';

  // Initialize satellite map
  initSatelliteMap(lat, lng);

  // Get solar potential data
  const solarPotential = data.solarPotential;
  const roofSegments = solarPotential.roofSegmentStats || [];
  const numSegments = roofSegments.length || 1;

  // Calculate roof area
  const roofAreaM2 = solarPotential.wholeRoofStats?.areaMeters2 ||
                     solarPotential.maxArrayAreaMeters2 ||
                     200;
  const roofAreaSqFt = Math.round(roofAreaM2 * 10.764);
  const roofSquares = parseFloat((roofAreaSqFt / 100).toFixed(1));

  // Calculate pitches for each segment
  const pitchData = roofSegments.map((segment, index) => {
    const pitchDegrees = segment.pitchDegrees || 0;
    const pitchRatio = degreesToPitchRatio(pitchDegrees);
    const segmentAreaM2 = segment.stats?.areaMeters2 || (roofAreaM2 / numSegments);
    const segmentAreaSqFt = Math.round(segmentAreaM2 * 10.764);
    const azimuth = segment.azimuthDegrees || 0;
    const direction = degreesToDirection(azimuth);

    return {
      name: `Facet ${index + 1}`,
      pitchDegrees,
      pitchRatio,
      areaSqFt: segmentAreaSqFt,
      direction
    };
  });

  // Calculate predominant pitch (weighted by area)
  let avgPitchDegrees = 0;
  if (roofSegments.length > 0) {
    const totalArea = pitchData.reduce((sum, p) => sum + p.areaSqFt, 0);
    avgPitchDegrees = pitchData.reduce((sum, p) => sum + (p.pitchDegrees * p.areaSqFt / totalArea), 0);
  }
  const predominantPitch = degreesToPitchRatio(avgPitchDegrees);

  // Calculate roof complexity
  const complexity = calculateComplexity(numSegments, avgPitchDegrees, pitchData);

  // Calculate waste factor based on complexity
  const wasteFactor = calculateWasteFactor(complexity.level);

  // Calculate linear measurements (estimates based on roof geometry)
  const linearMeasurements = estimateLinearMeasurements(roofAreaSqFt, numSegments, avgPitchDegrees);

  // Calculate material estimates
  const materials = calculateMaterials(roofSquares, wasteFactor, linearMeasurements);

  // Calculate prices (including waste factor)
  const effectiveSquares = roofSquares * (1 + wasteFactor / 100);
  const priceLow = Math.round(effectiveSquares * PRICE_PER_SQUARE_LOW);
  const priceMid = Math.round(effectiveSquares * PRICE_PER_SQUARE_MID);
  const priceHigh = Math.round(effectiveSquares * PRICE_PER_SQUARE_HIGH);

  // =============================================
  // Update DOM with all report data
  // =============================================

  // Report header
  document.getElementById('reportDate').textContent = `Generated: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })}`;
  document.getElementById('reportAddress').textContent = addressInput.value;

  // Roof Summary
  document.getElementById('roofArea').textContent = roofAreaSqFt.toLocaleString();
  document.getElementById('roofSquares').textContent = roofSquares.toFixed(1);
  document.getElementById('roofSegments').textContent = numSegments;
  document.getElementById('roofPitch').textContent = predominantPitch;

  // Complexity
  document.getElementById('complexityBar').style.width = `${complexity.percentage}%`;
  document.getElementById('complexityDescription').textContent = complexity.description;

  // Waste Factor
  document.getElementById('wasteFactor').textContent = `${wasteFactor}%`;

  // Pitch Table
  const pitchTableEl = document.getElementById('pitchTable');
  pitchTableEl.innerHTML = pitchData.map(p => `
    <div class="pitch-row">
      <span class="facet-name">${p.name}</span>
      <div class="facet-details">
        <span>Pitch: <strong>${p.pitchRatio}</strong></span>
        <span>Area: <strong>${p.areaSqFt.toLocaleString()} sq ft</strong></span>
        <span>Facing: <strong>${p.direction}</strong></span>
      </div>
    </div>
  `).join('');

  // Linear Measurements
  document.getElementById('ridgeLength').textContent = `${linearMeasurements.ridges} ft`;
  document.getElementById('hipLength').textContent = `${linearMeasurements.hips} ft`;
  document.getElementById('valleyLength').textContent = `${linearMeasurements.valleys} ft`;
  document.getElementById('eaveLength').textContent = `${linearMeasurements.eaves} ft`;
  document.getElementById('rakeLength').textContent = `${linearMeasurements.rakes} ft`;
  document.getElementById('flashingLength').textContent = `${linearMeasurements.flashing} ft`;

  // Material Estimates
  document.getElementById('shingleBundles3').textContent = materials.bundles3Tab;
  document.getElementById('shingleBundlesArch').textContent = materials.bundlesArch;
  document.getElementById('underlaymentRolls').textContent = materials.underlayment;
  document.getElementById('dripEdge').textContent = materials.dripEdge;
  document.getElementById('ridgeCap').textContent = materials.ridgeCap;
  document.getElementById('nailsLbs').textContent = materials.nails;

  // Price Estimates
  document.getElementById('priceLow').textContent = `$${priceLow.toLocaleString()}`;
  document.getElementById('priceMid').textContent = `$${priceMid.toLocaleString()}`;
  document.getElementById('priceHigh').textContent = `$${priceHigh.toLocaleString()}`;

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Save estimate to backend
  saveEstimateToBackend({
    address: addressInput.value,
    latitude: lat,
    longitude: lng,
    roof_area_sqft: roofAreaSqFt,
    roof_squares: roofSquares,
    num_facets: numSegments,
    predominant_pitch: predominantPitch,
    complexity: complexity.level,
    waste_factor: wasteFactor,
    price_low: priceLow,
    price_mid: priceMid,
    price_high: priceHigh
  });

  // Show note if using estimation
  if (data.isEstimate) {
    showNotification('Using estimated values. For accurate measurements, contact us for a professional assessment.', 'info');
  }
}

// Save estimate to backend database
async function saveEstimateToBackend(estimateData) {
  try {
    await fetch(`${API_URL}/estimates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(estimateData)
    });
    console.log('Estimate saved to database');
  } catch (error) {
    console.error('Failed to save estimate:', error);
    // Don't show error to user - this is just for tracking
  }
}

// Convert degrees to pitch ratio (e.g., "6:12")
function degreesToPitchRatio(degrees) {
  const rise = Math.tan(degrees * Math.PI / 180) * 12;
  return `${Math.round(rise * 10) / 10}:12`;
}

// Convert azimuth degrees to compass direction
function degreesToDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Calculate roof complexity
function calculateComplexity(segments, avgPitch, pitchData) {
  let score = 0;

  // More segments = more complex
  if (segments <= 2) score += 10;
  else if (segments <= 4) score += 25;
  else if (segments <= 6) score += 40;
  else if (segments <= 10) score += 60;
  else score += 80;

  // Steeper pitch = more complex
  if (avgPitch > 35) score += 20;
  else if (avgPitch > 25) score += 10;
  else if (avgPitch > 15) score += 5;

  // Varying pitches = more complex
  if (pitchData.length > 1) {
    const pitches = pitchData.map(p => p.pitchDegrees);
    const variance = Math.max(...pitches) - Math.min(...pitches);
    if (variance > 15) score += 15;
    else if (variance > 10) score += 10;
    else if (variance > 5) score += 5;
  }

  // Determine level and description
  let level, description;
  if (score <= 25) {
    level = 'simple';
    description = 'Simple roof with minimal cuts. Standard installation procedures apply.';
  } else if (score <= 50) {
    level = 'moderate';
    description = 'Moderate complexity with some angles and valleys. Additional labor required.';
  } else if (score <= 75) {
    level = 'complex';
    description = 'Complex roof with multiple facets and varying pitches. Experienced crew recommended.';
  } else {
    level = 'very_complex';
    description = 'Very complex roof requiring specialized techniques. Higher material waste expected.';
  }

  return {
    score,
    percentage: Math.min(score, 100),
    level,
    description
  };
}

// Calculate waste factor based on complexity
function calculateWasteFactor(complexityLevel) {
  const factors = {
    'simple': 10,
    'moderate': 12,
    'complex': 15,
    'very_complex': 18
  };
  return factors[complexityLevel] || 12;
}

// Estimate linear measurements based on roof geometry
function estimateLinearMeasurements(areaSqFt, segments, avgPitch) {
  // These are estimates based on typical roof geometries
  // Actual measurements require precise roof modeling

  const perimeter = Math.sqrt(areaSqFt) * 4; // Rough perimeter estimate
  const pitchMultiplier = 1 + (avgPitch / 100); // Adjust for pitch

  // Estimate based on segment count and area
  const ridges = Math.round((segments * 15 + Math.sqrt(areaSqFt) * 0.3) * pitchMultiplier);
  const hips = Math.round(segments > 2 ? (segments - 2) * 12 * pitchMultiplier : 0);
  const valleys = Math.round(segments > 3 ? (segments - 3) * 10 * pitchMultiplier : 0);
  const eaves = Math.round(perimeter * 0.35);
  const rakes = Math.round(perimeter * 0.25 * pitchMultiplier);
  const flashing = Math.round((ridges + valleys) * 0.5 + 20); // Plus estimated wall flashing

  return { ridges, hips, valleys, eaves, rakes, flashing };
}

// Calculate material estimates
function calculateMaterials(squares, wasteFactor, linear) {
  const wasteMultiplier = 1 + (wasteFactor / 100);
  const effectiveSquares = squares * wasteMultiplier;

  // Shingle bundles (3 bundles per square for 3-tab, 3-4 for architectural)
  const bundles3Tab = Math.ceil(effectiveSquares * 3);
  const bundlesArch = Math.ceil(effectiveSquares * 3.5);

  // Underlayment (1 roll covers ~4 squares)
  const underlayment = Math.ceil(effectiveSquares / 4);

  // Drip edge (10ft pieces, eaves + rakes)
  const dripEdge = Math.ceil((linear.eaves + linear.rakes) / 10);

  // Ridge cap (roughly 25 linear feet per bundle)
  const ridgeCap = Math.ceil((linear.ridges + linear.hips) / 25);

  // Nails (approximately 2.5 lbs per square)
  const nails = Math.ceil(effectiveSquares * 2.5);

  return {
    bundles3Tab,
    bundlesArch,
    underlayment,
    dripEdge,
    ridgeCap,
    nails
  };
}

// Print report function
function printReport() {
  window.print();
}

// Initialize satellite map view
function initSatelliteMap(lat, lng) {
  const mapContainer = document.getElementById('satelliteMap');

  // Clear placeholder
  mapContainer.innerHTML = '';

  map = new google.maps.Map(mapContainer, {
    center: { lat, lng },
    zoom: 20,
    mapTypeId: 'satellite',
    tilt: 0,
    disableDefaultUI: true,
    zoomControl: true
  });

  // Add marker for the property
  new google.maps.Marker({
    position: { lat, lng },
    map: map,
    title: 'Your Property'
  });
}

// Show error message
function showError(message) {
  const resultsSection = document.getElementById('estimateResults');
  const errorSection = document.getElementById('estimateError');
  const errorMessage = document.getElementById('errorMessage');

  resultsSection.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = message;
}

// Reset estimate tool
function resetEstimate() {
  const addressInput = document.getElementById('addressInput');
  const resultsSection = document.getElementById('estimateResults');
  const errorSection = document.getElementById('estimateError');

  addressInput.value = '';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';
  selectedPlace = null;

  // Reset map placeholder
  const mapContainer = document.getElementById('satelliteMap');
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div class="map-placeholder">
        <span>&#128506;</span>
        <p>Satellite view will appear here</p>
      </div>
    `;
  }

  addressInput.focus();
}

// Initialize contact form address autocomplete
function initContactAutocomplete() {
  const contactAddressInput = document.getElementById('contactAddress');
  if (contactAddressInput) {
    new google.maps.places.Autocomplete(contactAddressInput, {
      types: ['address'],
      componentRestrictions: { country: 'us' }
    });
  }
}

// Make functions globally available
window.initAutocomplete = initAutocomplete;
window.initContactAutocomplete = initContactAutocomplete;
window.resetEstimate = resetEstimate;
window.printReport = printReport;

// =============================================
// Main Document Ready
// =============================================

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinks.classList.toggle('active');

      // Animate hamburger menu
      const spans = mobileMenuBtn.querySelectorAll('span');
      spans.forEach(span => span.classList.toggle('active'));
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // Header scroll effect
  const header = document.querySelector('header');

  window.addEventListener('scroll', function() {
    if (window.scrollY > 100) {
      header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    } else {
      header.style.boxShadow = '0 2px 15px rgba(0, 0, 0, 0.1)';
    }
  });

  // Phone Number Formatting
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits

      if (value.length > 10) {
        value = value.slice(0, 10); // Limit to 10 digits
      }

      if (value.length > 6) {
        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
      } else if (value.length > 3) {
        value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
      } else if (value.length > 0) {
        value = `(${value}`;
      }

      e.target.value = value;
    });
  }

  // Contact Form Handling
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Get form data
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);

      // Basic validation
      if (!data.firstName || !data.lastName || !data.email || !data.phone) {
        showNotification('Please fill in all required fields.', 'error');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
      }

      // Show loading state
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        // Submit to backend API
        const response = await fetch(`${API_URL}/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address || null,
            service: data.service || null,
            message: data.message || null
          })
        });

        const result = await response.json();

        if (result.success) {
          showNotification('Thank you! Your message has been sent. We\'ll contact you within 24 hours.', 'success');
          contactForm.reset();
        } else {
          throw new Error(result.error || 'Failed to submit form');
        }

      } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Sorry, there was an error. Please try again or call us directly.', 'error');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Notification function
  function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">&times;</button>
    `;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '8px',
      backgroundColor: type === 'success' ? '#27ae60' : type === 'info' ? '#3498db' : '#e74c3c',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      zIndex: '9999',
      animation: 'slideIn 0.3s ease',
      maxWidth: '400px'
    });

    // Style the close button
    const closeBtn = notification.querySelector('button');
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '20px',
      cursor: 'pointer',
      padding: '0',
      lineHeight: '1'
    });

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe elements for animation
  const animatedElements = document.querySelectorAll('.service-card, .feature-item, .testimonial-card, .team-card, .gallery-item');

  animatedElements.forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
    observer.observe(el);
  });
});

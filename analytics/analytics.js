// ================================
// CONFIG
// ================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbyMFPQ3pMHty3O0U2gpKZHgBT1vNPfIC0xJBYb18ZlVKf7h7UsPaavAX-sRyG_CxiWJ/exec";

// Global data storage
let allData = null;
let filteredData = null;

// DOM Elements
const cityFilter = document.getElementById('cityFilter');
const typeFilter = document.getElementById('typeFilter');
const dateFilter = document.getElementById('dateFilter');
const heatmapCanvas = document.getElementById('heatmap');
const chartCanvas = document.getElementById('chart');

// ================================
// MAIN INITIALIZATION
// ================================
function init() {
  loadData();
  
  // Setup filter event listeners
  cityFilter.addEventListener('change', applyFilters);
  typeFilter.addEventListener('change', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  
  // Auto-refresh every 5 minutes
  setInterval(loadData, 5 * 60 * 1000);
}

// ================================
// DATA LOADING
// ================================
function loadData() {
  fetch(GAS_URL)
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        throw new Error('GAS returned unsuccessful response');
      }
      allData = data;
      updateCityFilter(data);
      applyFilters();
      
      // Hide loading indicators
      document.getElementById('loadingMap').style.display = 'none';
      document.getElementById('loadingChart').style.display = 'none';
    })
    .catch(err => {
      console.error('Failed to load analytics data:', err);
      // Show error state
      const errorEl = document.getElementById('loadingMap');
      errorEl.textContent = 'Failed to load data. Retrying...';
      errorEl.style.color = '#ff6b6b';
      
      // Retry after 10 seconds
      setTimeout(loadData, 10000);
    });
}

// ================================
// FILTER LOGIC
// ================================
function updateCityFilter(data) {
  // Extract unique cities from raw data
  const cities = new Set();
  
  if (data.cities && Array.isArray(data.cities)) {
    data.cities.forEach(cityObj => {
      if (cityObj.city && cityObj.city !== 'null' && cityObj.city !== 'Unknown') {
        cities.add(cityObj.city);
      }
    });
  } else if (data.raw && data.raw.rows) {
    // Fallback to raw rows if cities array not available
    data.raw.rows.forEach(row => {
      if (row.city && row.city !== 'null' && row.city !== 'Unknown') {
        cities.add(row.city);
      }
    });
  }
  
  // Sort cities by count (most popular first)
  const sortedCities = Array.from(cities).sort((a, b) => {
    const countA = data.cities?.find(c => c.city === a)?.count || 0;
    const countB = data.cities?.find(c => c.city === b)?.count || 0;
    return countB - countA; // Descending order
  });
  
  // Update city filter dropdown
  cityFilter.innerHTML = '<option value="all">All Cities</option>';
  sortedCities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    cityFilter.appendChild(option);
  });
}

function applyFilters() {
  if (!allData) return;
  
  // Get filter values
  const selectedCity = cityFilter.value;
  const selectedType = typeFilter.value;
  const selectedDateRange = dateFilter.value;
  
  // Get rows from raw data
  let filteredRows = allData.raw?.rows || [];
  
  // Apply city filter
  if (selectedCity !== 'all') {
    filteredRows = filteredRows.filter(row => 
      row.city === selectedCity
    );
  }
  
  // Apply type filter
  if (selectedType !== 'all') {
    filteredRows = filteredRows.filter(row => 
      row.type === selectedType
    );
  }
  
  // Apply date filter
  if (selectedDateRange !== 'all') {
    const days = parseInt(selectedDateRange);
    if (!isNaN(days)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filteredRows = filteredRows.filter(row => {
        if (!row.timestamp) return true;
        try {
          const rowDate = new Date(row.timestamp);
          return rowDate >= cutoffDate;
        } catch {
          return true;
        }
      });
    }
  }
  
  // Prepare filtered data structure
  filteredData = {
    points: prepareHeatmapPoints(filteredRows),
    daily: prepareDailyData(filteredRows),
    totals: calculateTotals(filteredRows),
    filteredRows: filteredRows
  };
  
  // Update UI
  updateStats(filteredData.totals);
  drawHeatmap(filteredData.points);
  drawChart(filteredData.daily);
}

function prepareHeatmapPoints(rows) {
  const points = [];
  
  rows.forEach(row => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      points.push({
        lat: Number(row.lat),
        lon: Number(row.lon),
        city: row.city,
        type: row.type
      });
    }
  });
  
  return points;
}

function prepareDailyData(rows) {
  const dailyMap = {};
  
  rows.forEach(row => {
    if (row.timestamp) {
      try {
        const date = new Date(row.timestamp);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    }
  });
  
  // Convert to array and sort by date
  return Object.keys(dailyMap)
    .map(date => ({ date, count: dailyMap[date] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateTotals(rows) {
  const total = rows.length;
  const pwa = rows.filter(r => r.type === "PWA").length;
  const browser = rows.filter(r => r.type === "BROWSER").length;
  
  return { total, pwa, browser };
}

function updateStats(totals) {
  document.getElementById('total').textContent = totals.total;
  document.getElementById('pwa').textContent = totals.pwa;
  document.getElementById('browser').textContent = totals.browser;
}

// ================================
// CANVAS HEATMAP
// ================================
function drawHeatmap(points) {
  const ctx = heatmapCanvas.getContext('2d');
  const width = heatmapCanvas.width;
  const height = heatmapCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  
  if (!points || points.length === 0) {
    ctx.fillStyle = '#F6C84C';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No location data available', width / 2, height / 2);
    return;
  }
  
  // Filter points with valid coordinates
  const validPoints = points.filter(p => 
    p.lat && p.lon && 
    !isNaN(p.lat) && !isNaN(p.lon) &&
    p.lat >= -90 && p.lat <= 90 &&
    p.lon >= -180 && p.lon <= 180
  );
  
  if (validPoints.length === 0) {
    ctx.fillStyle = '#F6C84C';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No valid coordinates found', width / 2, height / 2);
    return;
  }
  
  // Group points by location for intensity
  const pointGroups = {};
  validPoints.forEach(point => {
    // Round coordinates to 2 decimal places for grouping
    const key = `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
    if (!pointGroups[key]) {
      pointGroups[key] = {
        lat: point.lat,
        lon: point.lon,
        count: 0
      };
    }
    pointGroups[key].count++;
  });
  
  // Calculate bounds for auto-zoom
  const bounds = validPoints.reduce((acc, point) => {
    if (point.lat < acc.minLat) acc.minLat = point.lat;
    if (point.lat > acc.maxLat) acc.maxLat = point.lat;
    if (point.lon < acc.minLon) acc.minLon = point.lon;
    if (point.lon > acc.maxLon) acc.maxLon = point.lon;
    return acc;
  }, {
    minLat: 90, maxLat: -90,
    minLon: 180, maxLon: -180
  });
  
  // If all points are in same location, add some padding
  if (bounds.maxLat - bounds.minLat < 0.1 || bounds.maxLon - bounds.minLon < 0.1) {
    bounds.minLat -= 0.5;
    bounds.maxLat += 0.5;
    bounds.minLon -= 0.5;
    bounds.maxLon += 0.5;
  }
  
  // Add padding to bounds
  const latPadding = (bounds.maxLat - bounds.minLat) * 0.1;
  const lonPadding = (bounds.maxLon - bounds.minLon) * 0.1;
  bounds.minLat -= latPadding || 0.5;
  bounds.maxLat += latPadding || 0.5;
  bounds.minLon -= lonPadding || 0.5;
  bounds.maxLon += lonPadding || 0.5;
  
  // Function to convert lat/lon to canvas coordinates
  function project(lat, lon) {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * (width - 40) + 20;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (height - 40) + 20;
    return { x, y };
  }
  
  // Find max intensity for gradient scaling
  const maxCount = Math.max(...Object.values(pointGroups).map(g => g.count), 1);
  
  // Draw heatmap points with intensity
  Object.values(pointGroups).forEach(group => {
    const { x, y } = project(group.lat, group.lon);
    
    // Calculate intensity based on point count
    const intensity = Math.min(group.count / maxCount, 1);
    const radius = 15 + (intensity * 20); // Larger radius for more points
    
    // Create gradient with intensity-based opacity
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const opacity = 0.3 + (intensity * 0.5); // 0.3 to 0.8 opacity
    gradient.addColorStop(0, `rgba(246, 200, 76, ${opacity})`);
    gradient.addColorStop(0.7, `rgba(246, 200, 76, ${opacity * 0.5})`);
    gradient.addColorStop(1, 'rgba(246, 200, 76, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw city name for filtered view
  if (cityFilter.value !== 'all') {
    const city = cityFilter.value;
    ctx.fillStyle = '#F6C84C';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${city}`, width / 2, 20);
  }
  
  // Draw point count
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`${validPoints.length} locations`, width - 10, height - 10);
  
  // Draw map outline for India (assuming most users are in India)
  drawIndiaOutline(ctx, bounds, width, height, project);
}

function drawIndiaOutline(ctx, bounds, width, height, project) {
  // India approximate boundaries
  const indiaBounds = {
    minLat: 8.0, maxLat: 37.0,
    minLon: 68.0, maxLon: 97.0
  };
  
  // Check if India is visible in current view
  const indiaVisible = 
    indiaBounds.maxLat > bounds.minLat && 
    indiaBounds.minLat < bounds.maxLat &&
    indiaBounds.maxLon > bounds.minLon && 
    indiaBounds.minLon < bounds.maxLon;
  
  if (indiaVisible) {
    // Draw a subtle outline for India
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    
    const topLeft = project(indiaBounds.maxLat, indiaBounds.minLon);
    const bottomRight = project(indiaBounds.minLat, indiaBounds.maxLon);
    
    ctx.strokeRect(
      topLeft.x, 
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
    
    ctx.setLineDash([]);
    
    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const center = project(
      (indiaBounds.minLat + indiaBounds.maxLat) / 2,
      (indiaBounds.minLon + indiaBounds.maxLon) / 2
    );
    ctx.fillText('India', center.x, center.y);
  }
}

// ================================
// CANVAS CHART
// ================================
function drawChart(dailyData) {
  const ctx = chartCanvas.getContext('2d');
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Draw background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  
  if (!dailyData || dailyData.length === 0) {
    ctx.fillStyle = '#F6C84C';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No daily data available', width / 2, height / 2);
    return;
  }
  
  // Get max value for scaling
  const maxCount = Math.max(...dailyData.map(d => d.count), 1);
  
  // Chart padding
  const padding = 30;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding;
  
  // Draw grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (chartHeight * i / 5);
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    // Value labels
    const value = Math.round(maxCount * (5 - i) / 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(value, padding - 5, y + 3);
  }
  
  // Vertical grid lines (every 7th day)
  const daysToShow = Math.min(dailyData.length, 30); // Show max 30 days
  for (let i = 0; i < daysToShow; i++) {
    if (i % 7 === 0) {
      const x = padding + (chartWidth * i / (daysToShow - 1 || 1));
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
  }
  
  // Draw chart line
  ctx.strokeStyle = '#F6C84C';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  // Only show last 30 days for readability
  const recentData = dailyData.slice(-30);
  
  ctx.beginPath();
  recentData.forEach((day, index) => {
    const x = padding + (chartWidth * index / (recentData.length - 1 || 1));
    const y = padding + chartHeight - (day.count / maxCount) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  
  // Draw data points
  ctx.fillStyle = '#F6C84C';
  recentData.forEach((day, index) => {
    const x = padding + (chartWidth * index / (recentData.length - 1 || 1));
    const y = padding + chartHeight - (day.count / maxCount) * chartHeight;
    
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw date labels for first, last, and middle points
    if (index === 0 || index === recentData.length - 1 || index === Math.floor(recentData.length / 2)) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      
      // Format date (show only day/month)
      const date = new Date(day.date);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      
      ctx.fillText(label, x, height - 10);
    }
  });
  
  // Draw chart title
  ctx.fillStyle = '#F6C84C';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  const selectedType = typeFilter.value === 'all' ? 'All Users' : typeFilter.value + ' Users';
  ctx.fillText(`Daily Activity - ${selectedType}`, width / 2, 20);
  
  // Draw total for selected period
  const total = recentData.reduce((sum, day) => sum + day.count, 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`Total: ${total} users`, padding + 5, padding - 5);
}

// ================================
// START APP
// ================================
// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

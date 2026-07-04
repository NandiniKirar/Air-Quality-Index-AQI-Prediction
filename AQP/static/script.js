// ==========================================
// AuraAQI - Dashboard Logic
// ==========================================

// Global state
let currentTab = 'insights';
let statsLoaded = false;
let statsData = null;
let leafletMap = null;
let mapMarkersGroup = null;
let averagesChart = null;
let performanceChart = null;

// Table pagination state
let tableState = {
    page: 1,
    perPage: 15,
    search: '',
    sortBy: 'aqi',
    sortOrder: 'asc'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSliders();
    initTable();
    
    // Initial prediction run based on default slider values
    runPrediction();
    
    // Pre-fetch API stats to prepare other tabs
    loadStats();
});

// ==========================================
// Tab Navigation
// ==========================================
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            if (targetTab === currentTab) return;
            
            // Update nav active classes
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Toggle tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeContent = document.getElementById(`tab-${targetTab}`);
            activeContent.classList.add('active');
            
            currentTab = targetTab;
            
            // Trigger specific page initializations
            if (targetTab === 'insights') {
                initMapIfNeeded();
                initChartsIfNeeded();
            } else if (targetTab === 'explorer') {
                fetchTableData();
            }
        });
    });
}

// ==========================================
// Predictor Controls & Gauge
// ==========================================
let predictTimeout = null;

function initSliders() {
    const pollutants = ['pm25', 'ozone', 'no2', 'co'];
    
    pollutants.forEach(p => {
        const slider = document.getElementById(`input-${p}`);
        const numInput = document.getElementById(`num-${p}`);
        
        // Sync range slider to numeric input
        slider.addEventListener('input', (e) => {
            numInput.value = e.target.value;
            updateSliderTrack(p, e.target.value, slider.min, slider.max);
            debouncedPredict();
        });
        
        // Sync numeric input to range slider
        numInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = 0;
            // Bound value
            const min = parseInt(slider.min);
            const max = parseInt(slider.max);
            if (val < min) val = min;
            if (val > max) val = max;
            
            numInput.value = val;
            slider.value = val;
            updateSliderTrack(p, val, min, max);
            debouncedPredict();
        });
        
        // Initialize fill values on load
        updateSliderTrack(p, slider.value, slider.min, slider.max);
    });
}

// Visual track fill for sliders
function updateSliderTrack(pollutant, value, min, max) {
    const percentage = ((value - min) / (max - min)) * 100;
    const parent = document.querySelector(`.slider-group[data-pollutant="${pollutant}"]`);
    const fill = parent.querySelector('.range-track-fill');
    if (fill) {
        fill.style.width = `${percentage}%`;
    }
}

// Debounce the prediction calls to prevent server spamming on scroll
function debouncedPredict() {
    clearTimeout(predictTimeout);
    predictTimeout = setTimeout(runPrediction, 150);
}

async function runPrediction() {
    const pm25 = parseFloat(document.getElementById('input-pm25').value);
    const ozone = parseFloat(document.getElementById('input-ozone').value);
    const no2 = parseFloat(document.getElementById('input-no2').value);
    const co = parseFloat(document.getElementById('input-co').value);
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pm25, ozone, no2, co })
        });
        
        const result = await response.json();
        if (result.success) {
            updatePredictionUI(result.predicted_aqi);
        } else {
            console.error("Prediction failed:", result.detail);
        }
    } catch (err) {
        console.error("Error connecting to prediction API:", err);
    }
}

// Categorize and color AQI values
function getAQICategory(aqi) {
    if (aqi <= 50) {
        return {
            class: 'good',
            label: 'Good',
            color: 'var(--aqi-good)',
            emoji: 'fa-face-smile',
            desc: 'Air quality is satisfactory, and air pollution poses little or no risk.',
            recommendations: [
                'Perfect day for outdoor sports, activities, and ventilation.',
                'No health precautions are necessary for anyone.'
            ]
        };
    } else if (aqi <= 100) {
        return {
            class: 'moderate',
            label: 'Moderate',
            color: 'var(--aqi-moderate)',
            emoji: 'fa-face-meh',
            desc: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
            recommendations: [
                'Sensitive individuals should consider reducing heavy outdoor exertion.',
                'Good day for ventilation, but monitor for symptoms.'
            ]
        };
    } else if (aqi <= 150) {
        return {
            class: 'sensitive',
            label: 'Sensitive Groups',
            color: 'var(--aqi-sensitive)',
            emoji: 'fa-face-frown-open',
            desc: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
            recommendations: [
                'Active children and adults, and people with respiratory disease, should limit outdoor exertion.',
                'Keep windows closed to reduce pollution indoors.'
            ]
        };
    } else if (aqi <= 200) {
        return {
            class: 'unhealthy',
            label: 'Unhealthy',
            color: 'var(--aqi-unhealthy)',
            emoji: 'fa-face-frown',
            desc: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
            recommendations: [
                'Everyone should limit heavy or prolonged outdoor activities.',
                'Keep windows closed and run indoor air purifiers.'
            ]
        };
    } else if (aqi <= 300) {
        return {
            class: 'very-unhealthy',
            label: 'Very Unhealthy',
            color: 'var(--aqi-very-unhealthy)',
            emoji: 'fa-face-sad-tear',
            desc: 'Health alert: The risk of health effects is increased for everyone.',
            recommendations: [
                'Everyone should avoid outdoor physical activities.',
                'Close windows, run indoor filters, and wear high-filtration masks (N95) if going outside.'
            ]
        };
    } else {
        return {
            class: 'hazardous',
            label: 'Hazardous',
            color: 'var(--aqi-hazardous)',
            emoji: 'fa-skull',
            desc: 'Health warning of emergency conditions: everyone is more likely to be affected.',
            recommendations: [
                'Everyone should remain indoors and keep physical activity levels low.',
                'Use high-grade air purifiers and close all ventilation intakes.'
            ]
        };
    }
}

function updatePredictionUI(aqi) {
    const category = getAQICategory(aqi);
    
    // Update numeric values and class
    document.getElementById('predicted-aqi-value').textContent = Math.round(aqi);
    
    const classBadge = document.getElementById('predicted-aqi-class');
    classBadge.textContent = category.label;
    classBadge.className = 'aqi-class-badge'; // Reset classes
    classBadge.classList.add(`${category.class}-bg`);
    classBadge.style.backgroundColor = category.color;
    
    // Update Gauge Fill
    const fillCircle = document.getElementById('gauge-fill');
    fillCircle.style.stroke = category.color;
    // Radial gauge circumference is 502 (r=80). Max AQI on gauge represents 350.
    const maxGaugeVal = 350;
    const offset = 502 - (502 * Math.min(aqi, maxGaugeVal)) / maxGaugeVal;
    fillCircle.style.strokeDashoffset = offset;
    
    // Update health card
    const healthEmoji = document.getElementById('health-emoji');
    healthEmoji.className = `fa-solid ${category.emoji}`;
    healthEmoji.style.color = category.color;
    
    document.getElementById('health-title').textContent = category.label;
    document.getElementById('health-title').style.color = category.color;
    document.getElementById('health-desc').textContent = category.desc;
    
    // Update recommendations
    const recList = document.getElementById('health-recommendations');
    recList.innerHTML = '';
    category.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recList.appendChild(li);
    });
}

// ==========================================
// API Stats Loading
// ==========================================
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        if (result.success) {
            statsData = result;
            statsLoaded = true;
            
            // Populate metrics summary on load (so it's ready for Tab 4)
            document.getElementById('metric-r2').textContent = result.metrics.r2.toFixed(4);
            document.getElementById('metric-mae').textContent = result.metrics.mae.toFixed(4);
            document.getElementById('metric-mse').textContent = result.metrics.mse.toFixed(4);
        }
    } catch (err) {
        console.error("Failed to load statistics:", err);
    }
}

// ==========================================
// Map Initialization
// ==========================================
function initMapIfNeeded() {
    if (leafletMap || !statsLoaded) return;
    
    // Base view: center map around coordinate cluster (calculate average coords or use standard)
    const mapPoints = statsData.map_points;
    let initialCenter = [20.5937, 78.9629]; // fallback (India center)
    if (mapPoints && mapPoints.length > 0) {
        const avgLat = mapPoints.reduce((sum, p) => sum + p.lat, 0) / mapPoints.length;
        const avgLng = mapPoints.reduce((sum, p) => sum + p.lng, 0) / mapPoints.length;
        initialCenter = [avgLat, avgLng];
    }
    
    // Instantiate map
    leafletMap = L.map('map', {
        zoomControl: true,
        maxZoom: 18,
        minZoom: 2
    }).setView(initialCenter, 5);
    
    // Dark matter CartoDB theme to match design aesthetics
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(leafletMap);
    
    // Group markers for toggle / performance
    mapMarkersGroup = L.layerGroup().addTo(leafletMap);
    
    // Add markers
    mapPoints.forEach(point => {
        const cat = getAQICategory(point.aqi);
        const marker = L.circleMarker([point.lat, point.lng], {
            radius: 6,
            fillColor: cat.color,
            color: '#ffffff',
            weight: 0.8,
            opacity: 0.8,
            fillOpacity: 0.65
        });
        
        // Popup content detailing AQI levels
        const popupContent = `
            <div class="map-popup-title">Location AQI: ${point.aqi} (${cat.label})</div>
            <div class="map-popup-grid">
                <span>Lat / Lng:</span> <strong>${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</strong>
                <span>PM2.5:</span> <strong>${point.pm25}</strong>
                <span>Ozone:</span> <strong>${point.ozone}</strong>
                <span>NO2:</span> <strong>${point.no2}</strong>
                <span>CO:</span> <strong>${point.co}</strong>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        mapMarkersGroup.addLayer(marker);
    });

    // Invalidate map size once to force correct dimensions rendering in CSS grid layout
    setTimeout(() => {
        leafletMap.invalidateSize();
    }, 200);
}

// ==========================================
// Charts & Correlation Heatmap
// ==========================================
function initChartsIfNeeded() {
    if (!statsLoaded) return;
    
    // 1. Averages Chart
    if (!averagesChart) {
        const ctx = document.getElementById('chart-averages').getContext('2d');
        const averages = statsData.averages;
        
        averagesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['PM2.5 AQI', 'Ozone AQI', 'NO2 AQI', 'CO AQI'],
                datasets: [{
                    label: 'Average AQI Value',
                    data: [averages.pm25, averages.ozone, averages.no2, averages.co],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.45)',  // PM2.5 Red
                        'rgba(245, 158, 11, 0.45)', // Ozone Yellow
                        'rgba(139, 92, 246, 0.45)', // NO2 Purple
                        'rgba(59, 130, 246, 0.45)'  // CO Blue
                    ],
                    borderColor: [
                        '#ef4444',
                        '#f59e0b',
                        '#8b5cf6',
                        '#3b82f6'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        titleFont: { family: 'Outfit' },
                        bodyFont: { family: 'Inter' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.04)' },
                        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } }
                    }
                }
            }
        });
    }

    // 2. Correlation Matrix Heatmap Image is static, loaded directly from disk (correlation_heatmap.png)

    // 3. Performance Chart (Actual vs Predicted Curve) - Rendered on tab load if active
    initPerformanceChartIfNeeded();
}

function initPerformanceChartIfNeeded() {
    if (performanceChart || currentTab !== 'metrics' || !statsLoaded) return;
    
    const ctx = document.getElementById('chart-performance').getContext('2d');
    const avp = statsData.actual_vs_pred;
    const indices = Array.from({ length: avp.actual.length }, (_, i) => i + 1);
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: indices,
            datasets: [
                {
                    label: 'Actual AQI',
                    data: avp.actual,
                    borderColor: '#10b981',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: false
                },
                {
                    label: 'Predicted AQI (Random Forest)',
                    data: avp.pred,
                    borderColor: '#6366f1',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: false,
                    borderDash: [4, 4]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#f8fafc', font: { family: 'Inter', size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Inter' }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { display: false } // Hide dense index labels
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }
                }
            }
        }
    });
}

// Add tab switch trigger check for metrics line chart initialization
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.getAttribute('data-tab') === 'metrics') {
            setTimeout(initPerformanceChartIfNeeded, 100);
        }
    });
});

// ==========================================
// Data Explorer Table (Paginated API)
// ==========================================
let tableSearchTimeout = null;

function initTable() {
    // Wire search bar
    const searchBar = document.getElementById('table-search');
    searchBar.addEventListener('input', (e) => {
        clearTimeout(tableSearchTimeout);
        tableSearchTimeout = setTimeout(() => {
            tableState.search = e.target.value;
            tableState.page = 1; // reset page on search
            fetchTableData();
        }, 300);
    });

    // Wire pagination buttons
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (tableState.page > 1) {
            tableState.page--;
            fetchTableData();
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        tableState.page++;
        fetchTableData();
    });

    // Wire sorting headers
    document.querySelectorAll('.data-table th.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const col = header.getAttribute('data-col');
            if (tableState.sortBy === col) {
                // toggle direction
                tableState.sortOrder = tableState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                tableState.sortBy = col;
                tableState.sortOrder = 'asc';
            }
            
            // Update UI sort arrows
            document.querySelectorAll('.data-table th.sortable i').forEach(icon => {
                icon.className = 'fa-solid fa-sort';
            });
            const icon = header.querySelector('i');
            icon.className = tableState.sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            
            fetchTableData();
        });
    });
}

async function fetchTableData() {
    const url = `/api/data?page=${tableState.page}&per_page=${tableState.perPage}&search=${encodeURIComponent(tableState.search)}&sort_by=${tableState.sortBy}&sort_order=${tableState.sortOrder}`;
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            renderTable(result.data, result.total_records, result.page, result.per_page);
        }
    } catch (err) {
        console.error("Failed to fetch dataset table rows:", err);
    }
}

function renderTable(data, totalRecords, page, perPage) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">No matching records found. Try clearing your search filter.</td></tr>`;
        document.getElementById('table-showing-range').textContent = '0-0';
        document.getElementById('table-total-records').textContent = '0';
        document.getElementById('page-indicator').textContent = 'Page 1 of 1';
        document.getElementById('btn-prev-page').disabled = true;
        document.getElementById('btn-next-page').disabled = true;
        return;
    }
    
    // Populate records
    data.forEach(row => {
        const tr = document.createElement('tr');
        const cat = getAQICategory(row.aqi);
        
        tr.innerHTML = `
            <td><span class="td-aqi-badge" style="background-color: ${cat.color};">${row.aqi}</span></td>
            <td>${row.pm25}</td>
            <td>${row.ozone}</td>
            <td>${row.no2}</td>
            <td>${row.co}</td>
            <td>${row.lat.toFixed(4)}</td>
            <td>${row.lng.toFixed(4)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Update pagination descriptors
    const startIdx = (page - 1) * perPage + 1;
    const endIdx = Math.min(page * perPage, totalRecords);
    document.getElementById('table-showing-range').textContent = `${startIdx}-${endIdx}`;
    document.getElementById('table-total-records').textContent = totalRecords;
    
    const totalPages = Math.ceil(totalRecords / perPage);
    document.getElementById('page-indicator').textContent = `Page ${page} of ${totalPages}`;
    
    // Enable/disable page buttons
    document.getElementById('btn-prev-page').disabled = (page === 1);
    document.getElementById('btn-next-page').disabled = (page >= totalPages);
}

/**
 * WeatherSense - Terrestrial Forecast Dashboard
 * JavaScript Module for Terrestrial Forecast Page
 * Prepared for FastAPI integration
 */

// ================================
// Configuration & API Endpoints
// ================================
const API_CONFIG = {
    baseUrl: '', // Will be set to FastAPI backend URL
    endpoints: {
        forecast: '/data/terrestrial-forecast',
        currentForecast: '/data/terrestrial-forecast/current',
        historyForecast: '/data/terrestrial-forecast/history',
        models: '/data/terrestrial-forecast/models'
    }
};

// ================================
// State Management
// ================================
const appState = {
    selectedLocation: {
        name: 'Leiria',
        lat: 39.7436,
        lng: -8.8071,
        altitude: 50
    },
    selectedVariable: 'temperature',
    selectedTimeRange: 24,
    currentData: {
        icon: null,
        ecmwf: null,
        arpege: null,
        ipma: null,
        openweather: null
    },
    forecastData: [],
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    }
};

// ================================
// Model Colors Configuration
// ================================
const MODEL_COLORS = {
    icon: '#00d4ff',
    ecmwf: '#22d3ee',
    arpege: '#06b6d4',
    ipma: '#00ff88',
    openweather: '#a855f7'
};

// ================================
// Mock Data for Development
// ================================
const mockCurrentForecast = {
    icon: {
        temperature: 23.5,
        minTemp: 18,
        maxTemp: 26,
        humidity: 62,
        windSpeed: 18,
        windGust: 28,
        windDirection: 'NW',
        precipitation: 15,
        pressure: 1015,
        cloudCover: 40,
        visibility: 18,
        forecastTime: '14:00',
        quality: 92
    },
    ecmwf: {
        temperature: 24.1,
        minTemp: 18,
        maxTemp: 27,
        humidity: 60,
        windSpeed: 16,
        windGust: 26,
        windDirection: 'NW',
        precipitation: 12,
        pressure: 1016,
        cloudCover: 35,
        visibility: 20,
        forecastTime: '14:00',
        quality: 95
    },
    arpege: {
        temperature: 23.8,
        minTemp: 17,
        maxTemp: 26,
        humidity: 64,
        windSpeed: 20,
        windGust: 32,
        windDirection: 'NW',
        precipitation: 18,
        pressure: 1014,
        cloudCover: 45,
        visibility: 16,
        forecastTime: '14:00',
        quality: 88
    },
    ipma: {
        temperature: 24.2,
        minTemp: 18,
        maxTemp: 27,
        humidity: 61,
        windSpeed: 17,
        windGust: 28,
        windDirection: 'NW',
        precipitation: 10,
        pressure: 1015,
        cloudCover: 30,
        visibility: 19,
        forecastTime: '14:00',
        quality: 94
    },
    openweather: {
        temperature: 23.9,
        minTemp: 17,
        maxTemp: 26,
        humidity: 63,
        windSpeed: 19,
        windGust: 32,
        windDirection: 'NW',
        precipitation: 20,
        pressure: 1014,
        cloudCover: 42,
        visibility: 17,
        forecastTime: '14:00',
        quality: 87
    }
};

// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    initializeEvolutionChart();
    initializeTimeline();
    initializeEventListeners();
    loadInitialData();
    initializeTable();
    updateLastUpdateTime();

    // Auto-refresh every 10 minutes
    //setInterval(refreshForecastData, 600000);
});

// ================================
// Map Initialization
// ================================
let map;
let markers = [];
let selectedMarker;

function initializeMap() {
    // Initialize Leaflet map centered on Leiria district
    map = L.map('map', {
        zoomControl: false
    }).setView([39.7436, -8.8071], 8);

    // Satellite layer
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri'
        }
    ).addTo(map);

    // Labels layer (cities, roads, places)
    const labelsLayer = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Labels © Esri',
            pane: 'overlayPane'
        }
    ).addTo(map);

    // Add Leiria district boundary
    addDistrictBoundary();

    // Add weather station markers
    addForecastMarkers();

    // Map click handler
    map.on('click', function (e) {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });

    // Custom zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => map.zoomIn());

    document.getElementById('zoomOut').addEventListener('click', () => map.zoomOut());

    document.getElementById('centerMap').addEventListener('click', () => {
        map.setView([39.7436, -8.8071], 8);
    });
}
function addDistrictBoundary() {
    // Simplified Leiria district boundary coordinates
    const leiriaBoundary = [
        [40.0736, -8.4771],
        [40.0236, -8.7271],
        [39.9236, -8.9271],
        [39.7736, -9.0271],
        [39.5236, -9.1271],
        [39.3736, -9.0771],
        [39.3736, -8.8271],
        [39.4236, -8.5771],
        [39.5736, -8.4271],
        [39.7736, -8.3771],
        [39.9236, -8.3771],
        [40.0736, -8.4771]
    ];

    L.polygon(leiriaBoundary, {
        color: '#00d4ff',
        weight: 2,
        fillColor: '#00d4ff',
        fillOpacity: 0.05,
        dashArray: '5, 10'
    }).addTo(map);
}

function addForecastMarkers() {
    const forecastPoints = [
        { name: "São Pedro de Moel", lat: 39.766853, lng: -9.019775 },
        { name: "Figueira da Foz", lat: 40.1508, lng: -8.8618 },
        { name: "Nazaré / Alcobaça", lat: 39.601, lng: -9.07 },
        { name: "Peniche / Cabo Carvoeiro", lat: 39.361378, lng: -9.387817 },
        { name: "Óbidos", lat: 39.360421, lng: -9.157214 },
        { name: "Bidoeira de Cima", lat: 39.842572, lng: -8.743315 },
        { name: "ESTG Leiria", lat: 39.735122, lng: -8.821217 },
        { name: "Pinhal de Leiria", lat: 39.8225, lng: -8.9450 },
        { name: "Pedrógão Grande", lat: 39.919392, lng: -8.133316 },
        { name: "Ansião", lat: 39.910834, lng: -8.434238 },
        { name: "Castanheira de Pêra", lat: 40.002723, lng: -8.205671 },
        { name: "Caranguejeira", lat: 39.744706, lng: -8.691161 }
    ];

    const providerColors = {
        openmeteo: '#0ea5e9',
        ipma: '#00ff88',
        openweather: '#a855f7'
    };

    forecastPoints.forEach(point => {
        const color = providerColors[point.provider];

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: ${color};
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.8);
                box-shadow: 0 0 12px ${color};
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([point.lat, point.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(createPopupContent(point));

        marker.on('click', () => {
            selectLocation(point.lat, point.lng, point.name);
        });

        markers.push(marker);
    });
}

function createPopupContent(point) {
    const providerLabels = {
        openmeteo: 'Open-Meteo',
        ipma: 'IPMA',
        openweather: 'OpenWeather'
    };

    const providerColors = {
        openmeteo: '#0ea5e9',
        ipma: '#00ff88',
        openweather: '#a855f7'
    };

    return `
        <div style="color: #f8fafc; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: ${providerColors[point.provider]};">
                ${point.name}
            </h4>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Fonte: ${providerLabels[point.provider]}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                ${point.lat.toFixed(4)}°N, ${Math.abs(point.lng).toFixed(4)}°W
            </p>
        </div>
    `;
}

function selectLocation(lat, lng, name = null) {
    appState.selectedLocation = {
        lat: lat,
        lng: lng,
        name: name || `${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`,
        altitude: Math.floor(Math.random() * 200) + 10
    };

    // Update selected marker
    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    const selectedIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background: #a855f7;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.9);
            box-shadow: 0 0 16px #a855f7;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    selectedMarker = L.marker([lat, lng], { icon: selectedIcon }).addTo(map);

    // Update UI
    updateLocationPanel();
    updateContextSection();
    refreshForecastData();
}

function updateLocationPanel() {
    const loc = appState.selectedLocation;
    document.getElementById('selectedLocationName').textContent = loc.name;
    document.getElementById('selectedLocationCoords').textContent =
        `${loc.lat.toFixed(4)}° N, ${Math.abs(loc.lng).toFixed(4)}° W`;
    document.getElementById('locationAltitude').textContent = `${loc.altitude} m`;
}

function updateContextSection() {
    const loc = appState.selectedLocation;

    const contextLocation = document.getElementById('contextLocation');
    const contextCoords = document.getElementById('contextCoords');

    if (contextLocation) {
        contextLocation.textContent = loc.name;
    }

    if (contextCoords) {
        contextCoords.textContent =
            `${loc.lat.toFixed(4)}° N, ${Math.abs(loc.lng).toFixed(4)}° W`;
    }
}

// ================================
// Charts Initialization
// ================================
let evolutionChart;

function initializeEvolutionChart() {
    const canvas = document.getElementById('evolutionChart');
    if (!canvas) return;

    if (evolutionChart) {
        evolutionChart.destroy();
        evolutionChart = null;
    }

    canvas.removeAttribute('width');
    canvas.removeAttribute('height');
    canvas.removeAttribute('style');

    const ctx = canvas.getContext('2d');
    const data = generateEvolutionData(appState.selectedVariable, appState.selectedTimeRange);

    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'ICON',
                    data: data.icon,
                    borderColor: MODEL_COLORS.icon,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'ECMWF',
                    data: data.ecmwf,
                    borderColor: MODEL_COLORS.ecmwf,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'ARPEGE',
                    data: data.arpege,
                    borderColor: MODEL_COLORS.arpege,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'IPMA',
                    data: data.ipma,
                    borderColor: MODEL_COLORS.ipma,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6
                },
                {
                    label: 'OpenWeather',
                    data: data.openweather,
                    borderColor: MODEL_COLORS.openweather,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 200,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            const unit = getVariableUnit(appState.selectedVariable);
                            return `${context.dataset.label}: ${context.parsed.y}${unit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                        callback: function (value) {
                            return value + getVariableUnit(appState.selectedVariable);
                        }
                    }
                }
            }
        }
    });
}

function generateEvolutionData(variable, hours) {
    const labels = [];
    const now = new Date();
    const pointCount = Math.floor(hours / 3) + 1;

    for (let i = 0; i < pointCount; i++) {
        const time = new Date(now.getTime() + (i * 3 * 60 * 60 * 1000));
        labels.push(time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
    }

    const baseValues = {
        temperature: { base: 22, variance: 5 },
        humidity: { base: 60, variance: 15 },
        windSpeed: { base: 15, variance: 10 },
        windGust: { base: 25, variance: 15 },
        precipitation: { base: 20, variance: 30 },
        cloudCover: { base: 40, variance: 30 },
        pressure: { base: 1015, variance: 5 }
    };

    const config = baseValues[variable] || baseValues.temperature;

    const generateModelData = (offset = 0) => {
        return labels.map((_, i) => {
            const hourOfDay = (now.getHours() + i * 3) % 24;
            const dayFactor = Math.sin((hourOfDay - 6) * Math.PI / 12);
            const base = config.base + (variable === 'temperature' ? dayFactor * 4 : 0);
            const value = base + (Math.random() - 0.5) * config.variance + offset;
            return Math.round(value * 10) / 10;
        });
    };

    return {
        labels,
        icon: generateModelData(0),
        ecmwf: generateModelData(0.5),
        arpege: generateModelData(-0.3),
        ipma: generateModelData(0.8),
        openweather: generateModelData(-0.5)
    };
}

function getVariableUnit(variable) {
    const units = {
        temperature: '°C',
        humidity: '%',
        windSpeed: ' km/h',
        windGust: ' km/h',
        precipitation: '%',
        cloudCover: '%',
        pressure: ' hPa'
    };
    return units[variable] || '';
}

function updateEvolutionChart() {
    const data = generateEvolutionData(appState.selectedVariable, appState.selectedTimeRange);

    evolutionChart.data.labels = data.labels;
    evolutionChart.data.datasets[0].data = data.icon;
    evolutionChart.data.datasets[1].data = data.ecmwf;
    evolutionChart.data.datasets[2].data = data.arpege;
    evolutionChart.data.datasets[3].data = data.ipma;
    evolutionChart.data.datasets[4].data = data.openweather;

    evolutionChart.update('none');

    updateAnalytics(data);
}

// ================================
// Timeline Initialization
// ================================
function initializeTimeline() {
    const timelineScroll = document.getElementById('timelineScroll');
    const now = new Date();

    let html = '';
    for (let i = 0; i < 16; i++) {
        const time = new Date(now.getTime() + (i * 3 * 60 * 60 * 1000));
        const isCurrentBlock = i === 0;

        const weatherIcons = ['fa-sun', 'fa-cloud-sun', 'fa-cloud', 'fa-cloud-rain'];
        const iconIndex = Math.floor(Math.random() * weatherIcons.length);

        const temp = Math.round(22 + Math.random() * 6);
        const wind = Math.round(15 + Math.random() * 10);
        const gust = Math.round(wind + 10 + Math.random() * 5);
        const precip = Math.round(Math.random() * 30);
        const cloud = Math.round(30 + Math.random() * 40);

        html += `
            <div class="timeline-block ${isCurrentBlock ? 'current' : ''}">
                <div class="timeline-datetime">
                    <span class="timeline-date">${time.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })}</span>
                    <span class="timeline-hour">${time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <i class="fas ${weatherIcons[iconIndex]} timeline-icon"></i>
                <span class="timeline-temp">${temp}°C</span>
                <div class="timeline-details">
                    <span><i class="fas fa-wind"></i> ${wind} km/h</span>
                    <span><i class="fas fa-burst"></i> ${gust} km/h</span>
                    <span><i class="fas fa-droplet"></i> ${precip}%</span>
                    <span><i class="fas fa-cloud"></i> ${cloud}%</span>
                </div>
            </div>
        `;
    }

    timelineScroll.innerHTML = html;
}

// ================================
// Event Listeners
// ================================
function initializeEventListeners() {
    // Variable selector buttons
    document.querySelectorAll('.var-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            appState.selectedVariable = this.dataset.variable;
            updateEvolutionChart();
        });
    });

    // Time range buttons
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            appState.selectedTimeRange = parseInt(this.dataset.range);
            updateEvolutionChart();
        });
    });

    // Timeline navigation
    document.getElementById('timelinePrev').addEventListener('click', function () {
        const scroll = document.getElementById('timelineScroll');
        scroll.scrollBy({ left: -300, behavior: 'smooth' });
    });

    document.getElementById('timelineNext').addEventListener('click', function () {
        const scroll = document.getElementById('timelineScroll');
        scroll.scrollBy({ left: 300, behavior: 'smooth' });
    });

    // Table search
    document.getElementById('tableSearch').addEventListener('input', function () {
        filterTable(this.value);
    });

    // Export CSV
    document.getElementById('exportCsv').addEventListener('click', exportToCsv);

    // Pagination
    document.getElementById('prevPage').addEventListener('click', function () {
        if (appState.pagination.currentPage > 1) {
            appState.pagination.currentPage--;
            renderTable();
        }
    });

    document.getElementById('nextPage').addEventListener('click', function () {
        const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
        if (appState.pagination.currentPage < totalPages) {
            appState.pagination.currentPage++;
            renderTable();
        }
    });
}

// ================================
// Data Loading & API Integration
// ================================
function loadInitialData() {
    // Load mock data for development
    appState.currentData = mockCurrentForecast;
    appState.tableData = generateMockTableData();
    appState.pagination.totalItems = appState.tableData.length;

    updateModelCards();
    updateCurrentForecast();
    updateOperationalCards();
    renderTable();

    // For production, uncomment these:
    // fetchCurrentForecast();
    // fetchForecastHistory();
}

function refreshForecastData() {
    loadInitialData();
    updateLastUpdateTime();
}

// Prepared for FastAPI integration
async function fetchCurrentForecast() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.currentForecast}?lat=${appState.selectedLocation.lat}&lng=${appState.selectedLocation.lng}`);
        const data = await response.json();
        appState.currentData = data;
        updateModelCards();
        updateCurrentForecast();
    } catch (error) {
        console.error('Error fetching current forecast:', error);
    }
}

async function fetchForecastHistory() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.historyForecast}?lat=${appState.selectedLocation.lat}&lng=${appState.selectedLocation.lng}&hours=${appState.selectedTimeRange}`);
        const data = await response.json();
        appState.forecastData = data;
        updateEvolutionChart();
    } catch (error) {
        console.error('Error fetching forecast history:', error);
    }
}

async function fetchForecastModels() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.models}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching forecast models:', error);
        return [];
    }
}

// ================================
// UI Update Functions
// ================================
function updateModelCards() {
    const data = appState.currentData;

    // ICON
    document.getElementById('iconTemp').textContent = `${data.icon.temperature}°C`;
    document.getElementById('iconWind').textContent = `${data.icon.windSpeed} km/h`;
    document.getElementById('iconPrecip').textContent = `${data.icon.precipitation}%`;
    document.getElementById('iconCloud').textContent = `${data.icon.cloudCover}%`;

    // ECMWF
    document.getElementById('ecmwfTemp').textContent = `${data.ecmwf.temperature}°C`;
    document.getElementById('ecmwfWind').textContent = `${data.ecmwf.windSpeed} km/h`;
    document.getElementById('ecmwfPrecip').textContent = `${data.ecmwf.precipitation}%`;
    document.getElementById('ecmwfCloud').textContent = `${data.ecmwf.cloudCover}%`;

    // ARPEGE
    document.getElementById('arpegeTemp').textContent = `${data.arpege.temperature}°C`;
    document.getElementById('arpegeWind').textContent = `${data.arpege.windSpeed} km/h`;
    document.getElementById('arpegePrecip').textContent = `${data.arpege.precipitation}%`;
    document.getElementById('arpegeCloud').textContent = `${data.arpege.cloudCover}%`;

    // IPMA
    document.getElementById('ipmaTemp').textContent = `${data.ipma.temperature}°C`;
    document.getElementById('ipmaWind').textContent = `${data.ipma.windSpeed} km/h`;
    document.getElementById('ipmaGust').textContent = `${data.ipma.windGust} km/h`;
    document.getElementById('ipmaPrecip').textContent = `${data.ipma.precipitation}%`;
    document.getElementById('ipmaCloud').textContent = `${data.ipma.cloudCover}%`;

    // OpenWeather
    document.getElementById('owTemp').textContent = `${data.openweather.temperature}°C`;
    document.getElementById('owWind').textContent = `${data.openweather.windSpeed} km/h`;
    document.getElementById('owGust').textContent = `${data.openweather.windGust} km/h`;
    document.getElementById('owPrecip').textContent = `${data.openweather.precipitation}%`;
    document.getElementById('owCloud').textContent = `${data.openweather.cloudCover}%`;
}

function updateCurrentForecast() {
    const data = appState.currentData;

    // Calculate average from all models
    const temps = [data.icon.temperature, data.ecmwf.temperature, data.arpege.temperature, data.ipma.temperature, data.openweather.temperature];
    const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);

    document.getElementById('currentTemp').textContent = avgTemp;
    document.getElementById('currentMin').textContent = `${Math.min(data.icon.minTemp, data.ecmwf.minTemp, data.arpege.minTemp, data.ipma.minTemp, data.openweather.minTemp)}°C`;
    document.getElementById('currentMax').textContent = `${Math.max(data.icon.maxTemp, data.ecmwf.maxTemp, data.arpege.maxTemp, data.ipma.maxTemp, data.openweather.maxTemp)}°C`;

    // Average other values
    const avgHumidity = Math.round([data.icon.humidity, data.ecmwf.humidity, data.arpege.humidity, data.ipma.humidity, data.openweather.humidity].reduce((a, b) => a + b, 0) / 5);
    const avgWind = Math.round([data.icon.windSpeed, data.ecmwf.windSpeed, data.arpege.windSpeed, data.ipma.windSpeed, data.openweather.windSpeed].reduce((a, b) => a + b, 0) / 5);
    const avgGust = Math.round([data.icon.windGust, data.ecmwf.windGust, data.arpege.windGust, data.ipma.windGust, data.openweather.windGust].reduce((a, b) => a + b, 0) / 5);
    const avgPrecip = Math.round([data.icon.precipitation, data.ecmwf.precipitation, data.arpege.precipitation, data.ipma.precipitation, data.openweather.precipitation].reduce((a, b) => a + b, 0) / 5);
    const avgCloud = Math.round([data.icon.cloudCover, data.ecmwf.cloudCover, data.arpege.cloudCover, data.ipma.cloudCover, data.openweather.cloudCover].reduce((a, b) => a + b, 0) / 5);
    const avgPressure = Math.round([data.icon.pressure, data.ecmwf.pressure, data.arpege.pressure, data.ipma.pressure, data.openweather.pressure].reduce((a, b) => a + b, 0) / 5);
    const avgVisibility = Math.round([data.icon.visibility, data.ecmwf.visibility, data.arpege.visibility, data.ipma.visibility, data.openweather.visibility].reduce((a, b) => a + b, 0) / 5);

    document.getElementById('currentHumidity').textContent = `${avgHumidity}%`;
    document.getElementById('currentPressure').textContent = `${avgPressure} hPa`;
    document.getElementById('currentCloud').textContent = `${avgCloud}%`;
    document.getElementById('currentVisibility').textContent = `${avgVisibility} km`;
    document.getElementById('currentWind').textContent = `${avgWind} km/h NW`;
    document.getElementById('currentGust').textContent = `${avgGust} km/h`;
    document.getElementById('currentWindDir').textContent = `315° NW`;
    document.getElementById('currentPrecipProb').textContent = `${avgPrecip}%`;

    // Update forecast time
    const now = new Date();
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    document.getElementById('currentForecastTime').textContent =
        `Hoje, ${now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
}

function updateAnalytics(data) {
    // Calculate analytics from the evolution chart data
    const allValues = [...data.icon, ...data.ecmwf, ...data.arpege, ...data.ipma, ...data.openweather];
    const avg = (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1);
    const min = Math.min(...allValues).toFixed(1);
    const max = Math.max(...allValues).toFixed(1);
    const spread = (max - min).toFixed(1);

    const unit = getVariableUnit(appState.selectedVariable);

    document.getElementById('avgValue').textContent = `${avg}${unit}`;
    document.getElementById('minValue').textContent = `${min}${unit}`;
    document.getElementById('maxValue').textContent = `${max}${unit}`;
    document.getElementById('spreadValue').textContent = `${spread}${unit}`;

    // Find highest and lowest model predictions for the first time point
    const firstPointValues = [
        { model: 'ICON', value: data.icon[0] },
        { model: 'ECMWF', value: data.ecmwf[0] },
        { model: 'ARPEGE', value: data.arpege[0] },
        { model: 'IPMA', value: data.ipma[0] },
        { model: 'OpenWeather', value: data.openweather[0] }
    ];

    const highest = firstPointValues.reduce((a, b) => a.value > b.value ? a : b);
    const lowest = firstPointValues.reduce((a, b) => a.value < b.value ? a : b);

    document.getElementById('highestModel').textContent = `${highest.model} (${highest.value}${unit})`;
    document.getElementById('lowestModel').textContent = `${lowest.model} (${lowest.value}${unit})`;
    document.getElementById('maxDifference').textContent = `${(highest.value - lowest.value).toFixed(1)}${unit}`;

    // Calculate agreement (models within 10% of mean)
    const mean = firstPointValues.reduce((a, b) => a + b.value, 0) / 5;
    const agreeing = firstPointValues.filter(m => Math.abs(m.value - mean) < mean * 0.1).length;
    document.getElementById('agreementValue').textContent = `${Math.round(agreeing / 5 * 100)}%`;
    document.getElementById('modelsAgreeing').textContent = `${agreeing} de 5`;
}

function updateOperationalCards() {
    // Drone conditions
    const dronePercentage = 75 + Math.floor(Math.random() * 20);
    document.getElementById('dronePercentage').textContent = `${dronePercentage}%`;
    const droneGauge = document.getElementById('droneGauge');
    droneGauge.setAttribute('stroke-dasharray', `${dronePercentage * 2.83} 283`);

    if (dronePercentage >= 70) {
        document.getElementById('droneStatus').className = 'operational-status favorable';
        document.getElementById('droneStatus').innerHTML = '<i class="fas fa-circle-check"></i> Favorável';
    } else if (dronePercentage >= 40) {
        document.getElementById('droneStatus').className = 'operational-status moderate';
        document.getElementById('droneStatus').innerHTML = '<i class="fas fa-triangle-exclamation"></i> Atenção';
    } else {
        document.getElementById('droneStatus').className = 'operational-status unfavorable';
        document.getElementById('droneStatus').innerHTML = '<i class="fas fa-circle-xmark"></i> Não recomendado';
    }

    // Fire risk
    const firePercentage = 30 + Math.floor(Math.random() * 40);
    document.getElementById('firePercentage').textContent = `${firePercentage}%`;
    const fireGauge = document.getElementById('fireGauge');
    fireGauge.setAttribute('stroke-dasharray', `${firePercentage * 2.83} 283`);

    if (firePercentage <= 30) {
        document.getElementById('fireStatus').className = 'operational-status favorable';
        document.getElementById('fireStatus').innerHTML = '<i class="fas fa-circle-check"></i> Baixo';
        fireGauge.style.stroke = '#10b981';
    } else if (firePercentage <= 60) {
        document.getElementById('fireStatus').className = 'operational-status moderate';
        document.getElementById('fireStatus').innerHTML = '<i class="fas fa-triangle-exclamation"></i> Moderado';
        fireGauge.style.stroke = '#f59e0b';
    } else {
        document.getElementById('fireStatus').className = 'operational-status unfavorable';
        document.getElementById('fireStatus').innerHTML = '<i class="fas fa-fire"></i> Elevado';
        fireGauge.style.stroke = '#ef4444';
    }
}

function updateLastUpdateTime() {
    const now = new Date();

    const contextUpdate = document.getElementById('contextUpdate');

    if (contextUpdate) {
        contextUpdate.textContent =
            now.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            });
    }
}

// ================================
// Table Functions
// ================================
function generateMockTableData() {
    const models = ['ICON', 'ECMWF', 'ARPEGE', 'IPMA', 'OpenWeather'];
    const variables = ['Temperatura', 'Humidade', 'Vento', 'Rajada', 'Precipitação', 'Nebulosidade', 'Pressão'];
    const units = ['°C', '%', 'km/h', 'km/h', '%', '%', 'hPa'];
    const data = [];

    const now = new Date();

    for (let i = 0; i < 240; i++) {
        const time = new Date(now.getTime() + (Math.floor(i / 5) * 3 * 60 * 60 * 1000));
        const modelIndex = i % 5;
        const varIndex = Math.floor(Math.random() * variables.length);

        data.push({
            date: time.toLocaleDateString('pt-PT'),
            time: time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            source: models[modelIndex],
            variable: variables[varIndex],
            value: (15 + Math.random() * 20).toFixed(1),
            unit: units[varIndex],
            lat: (39.7 + Math.random() * 0.3).toFixed(4),
            lng: (-8.8 - Math.random() * 0.3).toFixed(4)
        });
    }

    return data;
}

function initializeTable() {
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    const start = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const end = start + appState.pagination.itemsPerPage;
    const pageData = appState.tableData.slice(start, end);

    let html = '';
    pageData.forEach(row => {
        const sourceClass = row.source.toLowerCase().replace(' ', '');
        html += `
            <tr>
                <td>${row.date}</td>
                <td>${row.time}</td>
                <td><span class="source-badge ${sourceClass}">${row.source}</span></td>
                <td>${row.variable}</td>
                <td>${row.value}</td>
                <td>${row.unit}</td>
                <td>${row.lat}</td>
                <td>${row.lng}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Update pagination info
    document.getElementById('paginationInfo').textContent =
        `Mostrando ${start + 1}-${Math.min(end, appState.pagination.totalItems)} de ${appState.pagination.totalItems} registos`;

    // Update button states
    document.getElementById('prevPage').disabled = appState.pagination.currentPage === 1;
    document.getElementById('nextPage').disabled = end >= appState.pagination.totalItems;

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
    const currentPage = appState.pagination.currentPage;
    const pageNumbers = document.getElementById('pageNumbers');

    let html = '';
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    pageNumbers.innerHTML = html;
}

function goToPage(page) {
    appState.pagination.currentPage = page;
    renderTable();
}

function filterTable(searchTerm) {
    if (!searchTerm) {
        appState.tableData = generateMockTableData();
    } else {
        const term = searchTerm.toLowerCase();
        appState.tableData = generateMockTableData().filter(row =>
            row.source.toLowerCase().includes(term) ||
            row.variable.toLowerCase().includes(term) ||
            row.date.includes(term)
        );
    }
    appState.pagination.totalItems = appState.tableData.length;
    appState.pagination.currentPage = 1;
    renderTable();
}

function exportToCsv() {
    const headers = ['Data', 'Hora', 'Fonte/Modelo', 'Variável', 'Valor', 'Unidade', 'Latitude', 'Longitude'];
    const csvContent = [
        headers.join(','),
        ...appState.tableData.map(row =>
            [row.date, row.time, row.source, row.variable, row.value, row.unit, row.lat, row.lng].join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `weathersense_forecast_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// Make goToPage globally accessible
window.goToPage = goToPage;

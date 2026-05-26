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

let cachedForecastRecords = null;

async function getForecastRecords() {
    if (cachedForecastRecords) {
        return cachedForecastRecords;
    }

    const response = await fetch('/data/forecast/terrestrial?limit=50000');
    cachedForecastRecords = await response.json();

    return cachedForecastRecords;
}
let currentForecastProvider = 'openmeteo';

// ================================
// Mock Data for Development
// ================================
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
    initializeForecastTabs();
    initializeForecastHistoryChart();
    loadHistoricalForecasts();
    initializeForecastHistoryListeners();

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
        { name: "São Pedro de Moel", lat: 39.766853, lng: -9.019775, provider: "openmeteo" },
        { name: "Figueira da Foz", lat: 40.1508, lng: -8.8618, provider: "openmeteo" },
        { name: "Nazaré / Alcobaça", lat: 39.601, lng: -9.07, provider: "ipma" },
        { name: "Peniche / Cabo Carvoeiro", lat: 39.361378, lng: -9.387817, provider: "openweather" },
        { name: "Óbidos", lat: 39.360421, lng: -9.157214, provider: "ipma" },
        { name: "Bidoeira de Cima", lat: 39.842572, lng: -8.743315, provider: "openmeteo" },
        { name: "ESTG Leiria", lat: 39.735122, lng: -8.821217, provider: "ipma" },
        { name: "Pinhal de Leiria", lat: 39.8225, lng: -8.9450, provider: "openmeteo" },
        { name: "Pedrógão Grande", lat: 39.919392, lng: -8.133316, provider: "openweather" },
        { name: "Ansião", lat: 39.910834, lng: -8.434238, provider: "ipma" },
        { name: "Castanheira de Pêra", lat: 40.002723, lng: -8.205671, provider: "openmeteo" },
        { name: "Caranguejeira", lat: 39.744706, lng: -8.691161, provider: "ipma" }
    ];


    forecastPoints.forEach(point => {
        const color = '#00d4ff';

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
            .bindPopup(`
                <div style="color: #f8fafc; padding: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #00d4ff;">
                        ${point.name}
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                        Ponto de observação
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                        ${point.lat.toFixed(4)}°N, ${Math.abs(point.lng).toFixed(4)}°W
                    </p>
                </div>
            `);

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
    cachedForecastRecords = null;

    updateLocationPanel();
    updateContextSection();

    refreshForecastData();
    initializeTimeline();
    loadHistoricalForecasts();
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

function initializeForecastTabs() {
    document.querySelectorAll('.forecast-model-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document
                .querySelectorAll('.forecast-model-tab')
                .forEach(t => t.classList.remove('active'));

            tab.classList.add('active');

            currentForecastProvider = tab.dataset.provider;

            initializeTimeline();
        });
    });
}
async function initializeTimeline() {
    const timelineScroll = document.getElementById('timelineScroll');

    if (!timelineScroll) return;

    try {
        const records = await getForecastRecords();

        let html = '';

        if (currentForecastProvider === 'openmeteo') {
            const openMeteoModels = ['ICON', 'ECMWF', 'ARPEGE'];

            html = openMeteoModels
                .map(modelName => {
                    const timelineData = buildOpenMeteoTimeline(records, modelName);

                    if (!timelineData.length) return '';

                    return renderTimelineModelRow({
                        provider: 'Open-Meteo',
                        model: modelName,
                        frequency: '1H',
                        data: timelineData
                    });
                })
                .join('');
        }

        if (currentForecastProvider === 'ipma') {

            const timelineData =
                buildIpmaTimeline(records);

            html = renderTimelineModelRow({
                provider: 'IPMA',
                model: 'ECMWF + AROME',
                frequency: '1H',
                data: timelineData
            });
        }

        if (currentForecastProvider === 'openweather') {

            const timelineData =
                buildOpenWeatherTimeline(records);

            html = renderTimelineModelRow({
                provider: 'OpenWeather',
                model: 'OWM',
                frequency: '3H',
                data: timelineData
            });
        }

        timelineScroll.innerHTML =
            html || '<p class="empty-state">Sem dados futuros disponíveis.</p>';

        initializeTimelineArrows();

    } catch (error) {
        console.error('Erro ao carregar previsões futuras:', error);
    }
}

function initializeTimelineArrows() {
    document
        .querySelectorAll('.timeline-arrow')
        .forEach(button => {
            button.addEventListener('click', () => {
                const model = button.dataset.model;
                const timeline = document.getElementById(`timeline-${model}`);

                if (!timeline) return;

                const direction = button.classList.contains('next') ? 1 : -1;

                timeline.scrollBy({
                    left: direction * 600,
                    behavior: 'smooth'
                });
            });
        });
}
function buildOpenMeteoTimeline(records, modelName) {
    const lat = appState.selectedLocation.lat;
    const lng = appState.selectedLocation.lng;

    const modelRecords = records.filter(item =>
        item.source?.toLowerCase() === 'open-meteo' &&
        item.model?.toUpperCase().includes(modelName) &&
        item.requestedLocation &&
        Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
        Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
    );

    const latestRequestId = modelRecords[0]?.requestId;

    const latestRecords = modelRecords.filter(item =>
        item.requestId === latestRequestId
    );

    const grouped = {};

    latestRecords.forEach(record => {
        const key = `${record.date} ${record.time}`;

        if (!grouped[key]) {
            grouped[key] = {
                dateRaw: record.date,
                timeRaw: record.time,
                date: formatTimelineDate(record.date),
                time: record.time.slice(0, 5),

                temperature: null,
                minTemp: null,
                maxTemp: null,
                humidity: null,
                pressure: null,
                cloudCover: null,
                visibility: null,
                windSpeed: null,
                windSpeedMax: null,
                windGust: null,
                windDirectionDegrees: null,
                windDirection: null,
                precipitation: null,
                sunrise: null,
                sunset: null,

                icon: 'fa-cloud-sun'
            };
        }

        const field = record.variable?.fieldName;
        const value = record.value;

        switch (field) {
            case 'temperatureC':
                grouped[key].temperature = Number(value);
                break;

            case 'temperatureMinC':
                grouped[key].minTemp = Number(value);
                break;

            case 'temperatureMaxC':
                grouped[key].maxTemp = Number(value);
                break;

            case 'humidityPercent':
                grouped[key].humidity = Number(value);
                break;

            case 'pressureHpa':
                grouped[key].pressure = Number(value);
                break;

            case 'cloudCoverPercent':
                grouped[key].cloudCover = Number(value);
                break;

            case 'visibilityKm':
                grouped[key].visibility = Number(value);
                break;

            case 'windSpeedKmh':
                grouped[key].windSpeed = Number(value);
                break;

            case 'windSpeedMaxKmh':
                grouped[key].windSpeedMax = Number(value);
                break;

            case 'windGustKmh':
                grouped[key].windGust = Number(value);
                break;

            case 'windDirectionDegrees':
                grouped[key].windDirectionDegrees = Number(value);
                grouped[key].windDirection =
                    `${Math.round(Number(value))}° ${degreesToCardinal(Number(value))}`;
                break;

            case 'precipitationMm':
                grouped[key].precipitation = Number(value);
                break;

            case 'sunriseH':
                grouped[key].sunrise = value;
                break;

            case 'sunsetH':
                grouped[key].sunset = value;
                break;
        }
    });

    const sorted = Object.values(grouped)
        .sort((a, b) =>
            new Date(`${a.dateRaw}T${a.timeRaw}`) -
            new Date(`${b.dateRaw}T${b.timeRaw}`)
        );

    console.log(
        modelName,
        sorted.map(item => `${item.dateRaw} ${item.timeRaw}`)
    );

    return sorted.slice(0, 24);
}

function buildOpenWeatherTimeline(records) {

    const lat = appState.selectedLocation.lat;
    const lng = appState.selectedLocation.lng;

    const filtered = records.filter(item =>
        item.source?.toLowerCase() === 'openweather' &&
        item.requestedLocation &&
        Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
        Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
    );

    const latestRequestId = filtered[0]?.requestId;

    const latestRequestRecords = filtered.filter(
        item => item.requestId === latestRequestId
    );

    const grouped = {};

    latestRequestRecords.forEach(item => {

        const key = `${item.date} ${item.time}`;

        if (!grouped[key]) {
            grouped[key] = {
                datetime: key,
                dateRaw: item.date,
                date: formatTimelineDate(item.date),
                time: item.time.slice(0, 5),
                icon: 'fa-cloud-sun'
            };
        }

        const field = item.variable?.fieldName;
        const value = item.value;

        switch (field) {

            case 'temperatureC':
                grouped[key].temperature = value;
                break;

            case 'temperatureMinC':
                grouped[key].minTemp = value;
                break;

            case 'temperatureMaxC':
                grouped[key].maxTemp = value;
                break;

            case 'humidityPercent':
                grouped[key].humidity = value;
                break;

            case 'pressureHpa':
                grouped[key].pressure = value;
                break;

            case 'cloudCoverPercent':
                grouped[key].cloudCover = value;
                break;

            case 'windSpeedKmh':
                grouped[key].windSpeed = value;
                break;

            case 'windGustKmh':
                grouped[key].windGust = value;
                break;

            case 'windDirectionDegrees':
                grouped[key].windDirection =
                    `${value}° ${degreesToCardinal(value)}`;
                break;

            case 'precipitationMm':
                grouped[key].precipitation = value;
                break;

            case 'precipitationProbabilityPercent':
                grouped[key].precipitationProbability = value;
                break;
        }
    });

    return Object.values(grouped)
        .sort((a, b) =>
            new Date(a.datetime) - new Date(b.datetime)
        )
        .slice(0, 8);
}

function renderTimelineModelRow(modelData) {

    return `
        <div class="timeline-model-row">

            <div class="timeline-model-left">

                ${renderTimelineModelSummary(
        modelData.data,
        modelData.model
    )}

                <div class="timeline-model-controls">

                    <button
                        class="timeline-arrow prev"
                        data-model="${modelData.model}">
                        <i class="fas fa-chevron-left"></i>
                    </button>

                    <button
                        class="timeline-arrow next"
                        data-model="${modelData.model}">
                        <i class="fas fa-chevron-right"></i>
                    </button>

                </div>

            </div>

            <div
                class="timeline-model-hours"
                id="timeline-${modelData.model}">

                ${renderTimelineBlocks(modelData.data, modelData.provider)}
            </div>

        </div>
    `;
}
function buildIconTimeline(records) {
    const lat = appState.selectedLocation.lat;
    const lng = appState.selectedLocation.lng;

    const iconRecords = records.filter(item =>
        item.source?.toLowerCase() === 'open-meteo' &&
        item.model?.toUpperCase() === 'ICON' &&
        item.requestedLocation &&
        Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
        Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
    );

    const latestRequestId = iconRecords[0]?.requestId;

    const latestRecords = iconRecords.filter(item =>
        item.requestId === latestRequestId
    );

    const grouped = {};

    latestRecords.forEach(record => {
        const key = `${record.date} ${record.time}`;

        if (!grouped[key]) {
            grouped[key] = {
                dateRaw: record.date,
                timeRaw: record.time,
                date: formatTimelineDate(record.date),
                time: record.time.slice(0, 5),
                temperature: null,
                minTemp: null,
                maxTemp: null,
                humidity: null,
                pressure: null,
                cloudCover: null,
                visibility: null,
                windSpeed: null,
                windSpeedMax: null,
                windGust: null,
                windDirectionDegrees: null,
                windDirection: null,
                precipitation: null,
                sunrise: null,
                sunset: null,
                icon: 'fa-cloud-sun'
            };
        }

        const field = record.variable?.fieldName;
        const value = record.value;

        switch (field) {
            case 'temperatureC':
                grouped[key].temperature = Number(value);
                break;

            case 'temperatureMinC':
                grouped[key].minTemp = Number(value);
                break;

            case 'temperatureMaxC':
                grouped[key].maxTemp = Number(value);
                break;

            case 'humidityPercent':
                grouped[key].humidity = Number(value);
                break;

            case 'pressureHpa':
                grouped[key].pressure = Number(value);
                break;

            case 'cloudCoverPercent':
                grouped[key].cloudCover = Number(value);
                break;

            case 'visibilityKm':
                grouped[key].visibility = Number(value);
                break;

            case 'windSpeedKmh':
                grouped[key].windSpeed = Number(value);
                break;

            case 'windSpeedMaxKmh':
                grouped[key].windSpeedMax = Number(value);
                break;

            case 'windGustKmh':
                grouped[key].windGust = Number(value);
                break;

            case 'windDirectionDegrees':
                grouped[key].windDirectionDegrees = Number(value);
                grouped[key].windDirection =
                    `${Math.round(Number(value))}° ${degreesToCardinal(Number(value))}`;
                break;

            case 'precipitationMm':
                grouped[key].precipitation = Number(value);
                break;

            case 'sunriseH':
                grouped[key].sunrise = value;
                break;

            case 'sunsetH':
                grouped[key].sunset = value;
                break;
        }
    });

    return Object.values(grouped)
        .sort((a, b) =>
            new Date(`${a.dateRaw}T${a.timeRaw}`) -
            new Date(`${b.dateRaw}T${b.timeRaw}`)
        )
        .slice(0, 24);
}

function buildIpmaTimeline(records) {

    const lat = appState.selectedLocation.lat;
    const lng = appState.selectedLocation.lng;

    const filtered = records.filter(item =>
        item.source?.toLowerCase() === 'ipma' &&
        item.requestedLocation &&
        Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
        Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
    );

    const latestRequestId = filtered[0]?.requestId;

    const latestRequestRecords = filtered.filter(
        item => item.requestId === latestRequestId
    );

    const grouped = {};

    latestRequestRecords.forEach(item => {

        const key = `${item.date} ${item.time}`;

        if (!grouped[key]) {
            grouped[key] = {
                datetime: key,
                dateRaw: item.date,
                timeRaw: item.time,
                date: formatTimelineDate(item.date),
                time: item.time.slice(0, 5),

                temperature: null,
                minTemp: null,
                maxTemp: null,
                humidity: null,
                pressure: null,
                cloudCover: null,
                visibility: null,
                windSpeed: null,
                windGust: null,
                windDirection: null,
                precipitation: null,
                precipitationProbability: null,
                sunrise: null,
                sunset: null,

                icon: 'fa-cloud-sun'
            };
        }

        const field = item.variable?.fieldName;
        const rawValue = item.value;
        const value = rawValue !== null && rawValue !== undefined
            ? Number(rawValue)
            : null;

        switch (field) {

            case 'temperatureC':
                grouped[key].temperature = value;
                break;

            case 'temperatureMinC':
                grouped[key].minTemp = value;
                break;

            case 'temperatureMaxC':
                grouped[key].maxTemp = value;
                break;

            case 'humidityPercent':
                grouped[key].humidity = value;
                break;

            case 'windSpeedKmh':
                grouped[key].windSpeed = value;
                break;

            case 'windGustKmh':
                grouped[key].windGust = value;
                break;

            case 'windDirectionCardinal':
                grouped[key].windDirection = rawValue;
                break;

            case 'windDirectionDegrees':
                grouped[key].windDirection =
                    `${Math.round(value)}° ${degreesToCardinal(value)}`;
                break;

            case 'precipitationProbabilityPercent':
                grouped[key].precipitationProbability =
                    value !== -99 ? value : null;
                break;
        }
    });

    return Object.values(grouped)
        .sort((a, b) =>
            new Date(a.datetime.replace(' ', 'T')) -
            new Date(b.datetime.replace(' ', 'T'))
        )
        .slice(0, 24);
}

function formatTimelineDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString('pt-PT', {
        weekday: 'short',
        day: '2-digit'
    });
}
function formatTimelineShortDate(dateString) {

    const date = new Date(dateString);

    return date.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short'
    });

}

function getDailySummaryByDate(forecastData) {
    const groupedByDate = {};

    forecastData.forEach(item => {
        if (!groupedByDate[item.dateRaw]) {
            groupedByDate[item.dateRaw] = {
                dateRaw: item.dateRaw,
                minTemp: item.minTemp,
                maxTemp: item.maxTemp,
                sunrise: item.sunrise,
                sunset: item.sunset
            };
        }
    });

    return groupedByDate;
}
function renderTimelineModelSummary(forecastData, modelName = 'ICON') {
    const first = forecastData[0];

    if (!first) return '';

    const days = Object.values(
        forecastData.reduce((acc, item) => {
            if (!acc[item.dateRaw]) {
                acc[item.dateRaw] = {
                    label: formatTimelineShortDate(item.dateRaw),
                    minTemp: item.minTemp,
                    maxTemp: item.maxTemp,
                    sunrise: item.sunrise,
                    sunset: item.sunset
                };
            }

            return acc;
        }, {})
    );

    return `
        <div class="timeline-model-summary premium-summary">

            <div class="timeline-model-main">
                <div class="timeline-model-icon">
                    <i class="fas fa-cloud-sun"></i>
                </div>

                <div class="timeline-model-info">
                    <span class="timeline-model-provider">
    Open-Meteo -
    <strong>${modelName}</strong>
</span>
                   
                </div>
            </div>

            <div class="timeline-days-wrapper">

                ${days.map(day => `
                    <div class="timeline-day-summary">

                        <div class="timeline-day-title">
                            <i class="fas fa-calendar-days"></i>
                            <span>${day.label}</span>
                        </div>

                        <div class="timeline-day-temp-grid">

                            <div>
                                <span>MÍN</span>
                                <strong class="temp-min">
                                    ${day.minTemp !== null && day.minTemp !== undefined
            ? `${Number(day.minTemp).toFixed(1)}°C`
            : '—'}
                                </strong>
                            </div>

                            <div>
                                <span>MÁX</span>
                                <strong class="temp-max">
                                    ${day.maxTemp !== null && day.maxTemp !== undefined
            ? `${Number(day.maxTemp).toFixed(1)}°C`
            : '—'}
                                </strong>
                            </div>

                        </div>

                        <div class="timeline-day-sun premium-sun">
                            <span>
                                <i class="fas fa-sun"></i>
                                ${day.sunrise ?? '—'}
                            </span>

                            <span>
                                <i class="fas fa-moon"></i>
                                ${day.sunset ?? '—'}
                            </span>
                        </div>

                    </div>
                `).join('')}

            </div>

        </div>
    `;
}

function renderTimelineBlocks(forecastData, provider = '') {

    return forecastData.map((forecast, index) => {

        const isIpma = provider === 'IPMA';

        return `
            <div class="timeline-block ${index === 0 ? 'current' : ''}">

                <div class="timeline-datetime">
                    <span class="timeline-date">${forecast.date}</span>
                    <span class="timeline-hour">${forecast.time}</span>
                </div>

                <i class="fas ${forecast.icon} timeline-icon"></i>

                <span class="timeline-temp">
                    ${forecast.temperature !== null ? `${forecast.temperature.toFixed(1)}°C` : '—'}
                </span>

                <div class="timeline-details">

                    <span><i class="fas fa-droplet"></i> ${forecast.humidity !== null ? `${forecast.humidity}%` : '—'}</span>

                    ${!isIpma ? `
                        <span><i class="fas fa-gauge"></i> ${forecast.pressure !== null ? `${forecast.pressure.toFixed(1)} hPa` : '—'}</span>
                        <span><i class="fas fa-cloud"></i> ${forecast.cloudCover !== null ? `${forecast.cloudCover}%` : '—'}</span>
                    ` : ''}

                    <span><i class="fas fa-wind"></i> ${forecast.windSpeed !== null ? `${forecast.windSpeed.toFixed(1)} km/h` : '—'}</span>

                    ${!isIpma ? `
                        <span><i class="fas fa-burst"></i> ${forecast.windGust !== null ? `${forecast.windGust.toFixed(1)} km/h` : '—'}</span>
                    ` : ''}

                    <span><i class="fas fa-location-arrow"></i> ${forecast.windDirection ?? '—'}</span>

                    <span>
                        <i class="fas fa-cloud-rain"></i>
                        ${forecast.precipitation !== null && forecast.precipitation !== undefined
                ? `${forecast.precipitation} mm`
                : forecast.precipitationProbability !== null && forecast.precipitationProbability !== undefined
                    ? `${forecast.precipitationProbability}%`
                    : '—'
            }
                    </span>

                </div>

            </div>
        `;
    }).join('');
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

    appState.tableData = generateMockTableData();

    appState.pagination.totalItems =
        appState.tableData.length;

    renderTable();

    fetchCurrentForecast();

    updateLastUpdateTime();
}

function refreshForecastData() {
    fetchCurrentForecast();
    updateLastUpdateTime();
    //updateForecastOperational();
}

// Prepared for FastAPI integration


function getNearestForecastKey(records) {
    const now = new Date();

    let nearestKey = null;
    let nearestDiff = Infinity;

    const keys = [...new Set(
        records.map(item => `${item.date} ${item.time}`)
    )];

    keys.forEach(key => {
        const forecastDate = new Date(key.replace(' ', 'T'));
        const diff = Math.abs(forecastDate - now);

        if (diff < nearestDiff) {
            nearestDiff = diff;
            nearestKey = key;
        }
    });

    return nearestKey;
}

function mapOpenWeatherForecast(records) {

    function getValue(fieldNames) {
        if (!Array.isArray(fieldNames)) {
            fieldNames = [fieldNames];
        }

        const record = records.find(item =>
            fieldNames.includes(item.variable?.fieldName)
        );

        return record ? Number(record.value) : null;
    }

    return {
        temperature: getValue('temperatureC'),
        minTemp: getValue('temperatureMinC'),
        maxTemp: getValue('temperatureMaxC'),

        humidity: getValue([
            'humidityPercent',
            'relativeHumidityPercent'
        ]),

        pressure: getValue([
            'pressureHpa',
            'atmosphericPressureHpa'
        ]),

        cloudCover: getValue('cloudCoverPercent'),

        visibility: getValue('visibilityKm'),

        windSpeed: getValue('windSpeedKmh'),
        windGust: getValue('windGustKmh'),
        windDirectionDegrees: getValue('windDirectionDegrees'),

        precipitation: getValue('precipitationProbabilityPercent'),

        forecastTime: records[0]?.time ?? '—',
        forecastDate: records[0]?.date ?? '—'
    };
}

function updateOpenWeatherCard(data) {

    setText(
        'owTemp',
        data.temperature !== null
            ? `${data.temperature.toFixed(1)}°C`
            : '—'
    );

    setText(
        'owMinTemp',
        data.minTemp !== null
            ? `${data.minTemp.toFixed(1)}°C`
            : '—'
    );

    setText(
        'owMaxTemp',
        data.maxTemp !== null
            ? `${data.maxTemp.toFixed(1)}°C`
            : '—'
    );

    setText(
        'owHumidity',
        data.humidity !== null
            ? `${data.humidity}%`
            : '—'
    );

    setText(
        'owPressure',
        data.pressure !== null
            ? `${data.pressure} hPa`
            : '—'
    );

    setText(
        'owCloud',
        data.cloudCover !== null
            ? `${data.cloudCover}%`
            : '—'
    );

    setText(
        'owVisibility',
        data.visibility !== null
            ? `${data.visibility} km`
            : '—'
    );

    setText(
        'owWind',
        data.windSpeed !== null
            ? `${data.windSpeed.toFixed(1)} km/h`
            : '—'
    );

    setText(
        'owGust',
        data.windGust !== null
            ? `${data.windGust.toFixed(1)} km/h`
            : '—'
    );

    setText(
        'owWindDir',
        data.windDirectionDegrees !== null
            ? `${Math.round(data.windDirectionDegrees)}° ${degreesToCardinal(data.windDirectionDegrees)}`
            : '—'
    );

    setText(
        'owPrecip',
        data.precipitation !== null
            ? `${data.precipitation}%`
            : '—'
    );

    setText(
        'owForecastTime',
        data.forecastTime !== '—'
            ? `${data.forecastDate} ${data.forecastTime.slice(0, 5)}`
            : '—'
    );
}

function setText(id, value) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = value;
    }
}

function mapIpmaForecast(records) {
    console.log(records);

    function getValue(fieldName) {
        const record = records.find(item =>
            item.variable?.fieldName === fieldName
        );

        return record ? Number(record.value) : null;
    }

    function getText(fieldName) {
        const record = records.find(item =>
            item.variable?.fieldName === fieldName
        );

        return record ? record.value : null;
    }

    return {
        temperature: getValue('temperatureC'),
        minTemp: getValue('temperatureMinC'),
        maxTemp: getValue('temperatureMaxC'),
        feelsLike: getValue('feelsLikeTemperatureC'),
        humidity: getValue('humidityPercent'),

        windSpeed: getValue('windSpeedKmh'),
        windGust: getValue('windGustKmh'),
        windDirectionDegrees: getValue('windDirectionDegrees'),
        windDirectionCardinal: getText('windDirectionCardinal'),

        precipitation: getValue('precipitationProbabilityPercent'),

        pressure: getValue('pressureHpa'),
        cloudCover: getValue('cloudCoverPercent'),
        visibility: getValue('visibilityKm'),

        forecastTime: records[0]?.time ?? '—',
        forecastDate: records[0]?.date ?? '—',
        distance: records[0]?.location?.distanceKm ?? null
    };
}

function updateIpmaCard(data) {

    setText(
        'ipmaTemp',
        data.temperature !== null
            ? `${data.temperature.toFixed(1)}°C`
            : '—'
    );
    setText(
        'ipmaTempMin',
        data.minTemp !== null &&
            data.minTemp !== undefined
            ? `${Number(data.minTemp).toFixed(1)}°C`
            : '—'
    );

    setText(
        'ipmaTempMax',
        data.maxTemp !== null &&
            data.maxTemp !== undefined
            ? `${Number(data.maxTemp).toFixed(1)}°C`
            : '—'
    );

    setText(
        'ipmaFeelsLike',
        data.feelsLike !== null
            ? `${data.feelsLike.toFixed(1)}°C`
            : '—'
    );

    setText(
        'ipmaHumidity',
        data.humidity !== null
            ? `${data.humidity.toFixed(1)}%`
            : '—'
    );

    setText(
        'ipmaWind',
        data.windSpeed !== null
            ? `${data.windSpeed.toFixed(1)} km/h`
            : '—'
    );

    setText(
        'ipmaWindDir',
        data.windDirectionCardinal ?? '—'
    );

    setText(
        'ipmaPrecip',
        data.precipitation !== null &&
            Number(data.precipitation) !== -99
            ? `${data.precipitation}%`
            : '—'
    );

    setText(
        'ipmaForecastTime',
        data.forecastTime !== '—'
            ? `${data.forecastDate} ${data.forecastTime.slice(0, 5)}`
            : '—'
    );
}


async function fetchCurrentForecast() {

    try {

        const records = await getForecastRecords();



        const lat = appState.selectedLocation.lat;
        const lng = appState.selectedLocation.lng;

        // =========================
        // OPENWEATHER
        // =========================

        const openWeatherRecords = records.filter(item =>
            item.source?.toLowerCase() === 'openweather' &&
            item.requestedLocation &&
            Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
            Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
        );

        const latestOWRequestId = openWeatherRecords[0]?.requestId;

        const latestOWRequestRecords = openWeatherRecords.filter(item =>
            item.requestId === latestOWRequestId
        );

        const nearestOWForecastKey = getNearestForecastKey(latestOWRequestRecords);

        const latestOWRecords = latestOWRequestRecords.filter(item =>
            `${item.date} ${item.time}` === nearestOWForecastKey
        );

        const openweather = mapOpenWeatherForecast(latestOWRecords);

        appState.currentData.openweather = openweather;

        updateOpenWeatherCard(openweather);

        // =========================
        // IPMA
        // =========================

        const ipmaRecords = records.filter(item =>
            item.source?.toLowerCase() === 'ipma' &&
            item.requestedLocation &&
            Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
            Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
        );

        const latestIpmaRequestId = ipmaRecords[0]?.requestId;

        const latestIpmaRequestRecords = ipmaRecords.filter(item =>
            item.requestId === latestIpmaRequestId
        );

        const nearestIpmaForecastKey = getNearestForecastKey(latestIpmaRequestRecords);

        const latestIpmaRecords = latestIpmaRequestRecords.filter(item =>
            `${item.date} ${item.time}` === nearestIpmaForecastKey
        );

        const ipma = mapIpmaForecast(latestIpmaRecords);

        appState.currentData.ipma = ipma;

        updateIpmaCard(ipma);

        // =========================
        // OPEN-METEO
        // =========================

        const openMeteoRecords = records.filter(item =>
            item.source?.toLowerCase() === 'open-meteo' &&
            item.requestedLocation &&
            Number(item.requestedLocation.latitude).toFixed(4) === Number(lat).toFixed(4) &&
            Number(item.requestedLocation.longitude).toFixed(4) === Number(lng).toFixed(4)
        );

        const openMeteoModels = {
            icon: 'ICON',
            ecmwf: 'ECMWF',
            arpege: 'ARPEGE'
        };

        Object.entries(openMeteoModels).forEach(([key, modelName]) => {
            const modelRecords = openMeteoRecords.filter(item =>
                item.model?.toUpperCase().includes(modelName)
            );

            const latestRequestId = modelRecords[0]?.requestId;

            const latestRequestRecords = modelRecords.filter(item =>
                item.requestId === latestRequestId
            );

            const nearestForecastKey = getNearestForecastKey(latestRequestRecords);

            const latestRecords = latestRequestRecords.filter(item =>
                `${item.date} ${item.time}` === nearestForecastKey
            );

            const mapped = mapOpenMeteoForecast(latestRecords);

            appState.currentData[key] = mapped;

            updateOpenMeteoCard(key, mapped);



        });
        updateForecastAgreement();
        updateForecastOperational();

    } catch (error) {

        console.error('Erro previsão terrestre:', error);

    }

}

function mapOpenMeteoForecast(records) {
    function getValue(fieldName) {
        const record = records.find(item =>
            item.variable?.fieldName === fieldName
        );

        if (!record || record.value === null || record.value === undefined) {
            return null;
        }

        const value = Number(record.value);

        return Number.isNaN(value) ? null : value;
    }

    function getText(fieldName) {
        const record = records.find(item =>
            item.variable?.fieldName === fieldName
        );

        if (!record) {
            return null;
        }

        return record.value ?? record.valueText ?? null;
    }

    return {
        temperature: getValue('temperatureC'),
        minTemp: getValue('temperatureMinC'),
        maxTemp: getValue('temperatureMaxC'),

        humidity: getValue('humidityPercent'),
        pressure: getValue('pressureHpa'),
        cloudCover: getValue('cloudCoverPercent'),
        visibility: getValue('visibilityKm'),

        windSpeed: getValue('windSpeedKmh'),
        windSpeedMax: getValue('windSpeedMaxKmh'),
        windGust: getValue('windGustKmh'),
        windDirectionDegrees: getValue('windDirectionDegrees'),

        precipitation: getValue('precipitationMm'),
        precipitationProbability: getValue('precipitationProbabilityPercent'),

        sunrise: getText('sunriseH'),
        sunset: getText('sunsetH'),

        forecastTime: records[0]?.time ?? '—',
        forecastDate: records[0]?.date ?? '—',
        model: records[0]?.model ?? '—',
        requestId: records[0]?.requestId ?? null
    };
}

function updateOpenMeteoCard(modelKey, data) {
    const prefix = {
        icon: 'icon',
        ecmwf: 'ecmwf',
        arpege: 'arpege'
    }[modelKey];

    setText(`${prefix}Temp`, data.temperature !== null ? `${data.temperature.toFixed(1)}°C` : '—');

    setText(
        `${prefix}MinMax`,
        data.minTemp !== null && data.maxTemp !== null
            ? `${data.minTemp.toFixed(1)}°C / ${data.maxTemp.toFixed(1)}°C`
            : '— / —'
    );

    setText(`${prefix}Humidity`, data.humidity !== null ? `${data.humidity}%` : '—');
    setText(`${prefix}Pressure`, data.pressure !== null ? `${data.pressure} hPa` : '—');
    setText(`${prefix}Cloud`, data.cloudCover !== null ? `${data.cloudCover}%` : '—');
    setText(`${prefix}Visibility`, data.visibility !== null ? `${data.visibility.toFixed(2)} km` : '—');

    setText(`${prefix}Wind`, data.windSpeed !== null ? `${data.windSpeed.toFixed(1)} km/h` : '—');
    setText(`${prefix}Gust`, data.windGust !== null ? `${data.windGust.toFixed(1)} km/h` : '—');
    setText(
        `${prefix}WindDir`,
        data.windDirectionDegrees !== null
            ? `${Math.round(data.windDirectionDegrees)}° ${degreesToCardinal(data.windDirectionDegrees)}`
            : '—'
    );

    setText(`${prefix}Precip`, data.precipitation !== null ? `${data.precipitation} mm` : '—');

    setText(`${prefix}Sunrise`, data.sunrise ?? '—');
    setText(`${prefix}Sunset`, data.sunset ?? '—');
    if (modelKey === 'icon') {
        setText(
            'openmeteoForecastTime',
            data.forecastTime !== '—'
                ? `${data.forecastDate} ${data.forecastTime.slice(0, 5)}`
                : '—'
        );
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


function degreesToCardinal(deg) {

    if (deg === null || deg === undefined) {
        return '—';
    }

    const directions = [
        'N', 'NNE', 'NE', 'ENE',
        'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW',
        'W', 'WNW', 'NW', 'NNW'
    ];

    const index = Math.round(deg / 22.5) % 16;

    return directions[index];
}

function getValidValues(models, field) {

    return models
        .map(model => model?.[field])

        .filter(value =>

            value !== null &&
            value !== undefined &&

            Number(value) !== -99 &&
            Number(value) !== -99.0 &&

            !Number.isNaN(Number(value))
        )

        .map(Number);
}

function calculateSpread(values) {
    if (!values.length) return null;

    return Math.max(...values) - Math.min(...values);
}

function scoreFromSpread(spread, thresholds) {
    if (spread === null) return null;

    if (spread <= thresholds.excellent) return 100;
    if (spread <= thresholds.good) return 85;
    if (spread <= thresholds.medium) return 65;
    if (spread <= thresholds.low) return 45;

    return 25;
}

function updateSpreadRow(valueId, indicatorId, spread, unit, thresholds) {
    const valueEl = document.getElementById(valueId);
    const indicatorEl = document.getElementById(indicatorId);

    if (!valueEl || !indicatorEl) return;

    if (spread === null) {
        valueEl.textContent = '—';
        indicatorEl.className = 'comp-indicator equal';
        indicatorEl.innerHTML = '<i class="fas fa-minus"></i>';
        return;
    }

    valueEl.textContent = `${spread.toFixed(1)}${unit}`;

    const score = scoreFromSpread(spread, thresholds);

    if (score >= 85) {
        indicatorEl.className = 'comp-indicator higher';
        indicatorEl.innerHTML = '<i class="fas fa-check"></i>';
    } else if (score >= 65) {
        indicatorEl.className = 'comp-indicator equal';
        indicatorEl.innerHTML = '<i class="fas fa-equals"></i>';
    } else {
        indicatorEl.className = 'comp-indicator lower';
        indicatorEl.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    }

    return score;
}

function updateForecastAgreement() {
    const models = [
        appState.currentData.icon,
        appState.currentData.ecmwf,
        appState.currentData.arpege,
        appState.currentData.ipma,
        appState.currentData.openweather
    ].filter(Boolean);

    if (!models.length) return;

    const rows = [
        {
            field: 'temperature',
            valueId: 'forecastTempSpread',
            indicatorId: 'forecastTempIndicator',
            unit: '°C',
            thresholds: { excellent: 1, good: 2, medium: 4, low: 6 }
        },
        {
            field: 'humidity',
            valueId: 'forecastHumiditySpread',
            indicatorId: 'forecastHumidityIndicator',
            unit: '%',
            thresholds: { excellent: 5, good: 10, medium: 20, low: 30 }
        },
        {
            field: 'windSpeed',
            valueId: 'forecastWindSpread',
            indicatorId: 'forecastWindIndicator',
            unit: ' km/h',
            thresholds: { excellent: 3, good: 7, medium: 12, low: 20 }
        },
        {
            field: 'precipitation',
            valueId: 'forecastPrecipSpread',
            indicatorId: 'forecastPrecipIndicator',
            unit: '',
            thresholds: { excellent: 0.5, good: 2, medium: 5, low: 10 }
        },
        {
            field: 'pressure',
            valueId: 'forecastPressureSpread',
            indicatorId: 'forecastPressureIndicator',
            unit: ' hPa',
            thresholds: { excellent: 1, good: 3, medium: 6, low: 10 }
        },
        {
            field: 'visibility',
            valueId: 'forecastVisibilitySpread',
            indicatorId: 'forecastVisibilityIndicator',
            unit: ' km',
            thresholds: { excellent: 2, good: 5, medium: 10, low: 20 }
        }
    ];

    const scores = [];

    rows.forEach(row => {
        const values = getValidValues(models, row.field);
        const spread = calculateSpread(values);

        const score = updateSpreadRow(
            row.valueId,
            row.indicatorId,
            spread,
            row.unit,
            row.thresholds
        );

        if (score !== null && score !== undefined) {
            scores.push(score);
        }
    });

    const agreement =
        scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null;

    const progress = document.getElementById('forecastAgreementProgress');
    const value = document.getElementById('forecastAgreementValue');

    if (progress && value) {
        progress.style.width = agreement !== null ? `${agreement}%` : '0%';
        value.textContent = agreement !== null ? `${agreement}%` : '—';
    }
}

function average(values) {

    const valid = values.filter(v =>

        v !== null &&
        v !== undefined &&
        Number(v) !== -99 &&
        !Number.isNaN(Number(v))
    );

    if (!valid.length) return null;

    return (
        valid.reduce((a, b) => a + Number(b), 0)
        / valid.length
    );
}
function getForecastModels() {
    return [
        appState.currentData.icon,
        appState.currentData.ecmwf,
        appState.currentData.arpege,
        appState.currentData.ipma,
        appState.currentData.openweather
    ].filter(Boolean);
}

function averageValues(values) {
    const valid = values
        .filter(v =>
            v !== null &&
            v !== undefined &&
            Number(v) !== -99 &&
            Number(v) !== -99.0 &&
            !Number.isNaN(Number(v))
        )
        .map(Number);

    if (valid.length === 0) return null;

    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function mostCommonValue(values) {
    const valid = values.filter(v => v && v !== '—');

    if (!valid.length) return '—';

    const counts = {};

    valid.forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])[0][0];
}

function updateForecastDroneReadiness() {
    const models = getForecastModels();

    if (!models.length) return;

    const wind = averageValues(models.map(m => m.windSpeed));
    const precipitation = averageValues(models.map(m => m.precipitation));
    const visibility = averageValues(models.map(m => m.visibility));

    const windDirection = mostCommonValue(
        models.map(m => {
            if (m.windDirectionCardinal) return m.windDirectionCardinal;

            if (m.windDirectionDegrees !== null && m.windDirectionDegrees !== undefined) {
                return degreesToCardinal(m.windDirectionDegrees);
            }

            return null;
        })
    );

    let score = 100;

    if (wind !== null && wind > 30) score -= 35;
    else if (wind !== null && wind > 20) score -= 20;

    if (precipitation !== null && precipitation > 1) score -= 35;
    else if (precipitation !== null && precipitation > 0) score -= 15;

    if (visibility !== null && visibility < 3) score -= 30;
    else if (visibility !== null && visibility < 5) score -= 15;

    score = Math.max(0, score);

    let label = 'Operacional';
    let note = 'Condições favoráveis para voo.';
    let cssClass = 'safe';

    if (score < 60) {
        label = 'Não recomendado';
        note = 'Operação não recomendada pelas condições previstas.';
        cssClass = 'danger';
    } else if (score < 80) {
        label = 'Atenção';
        note = 'Operação possível, mas com atenção às condições meteorológicas previstas.';
        cssClass = 'warning';
    }

    setText('droneScore', `${score}%`);
    setText('droneStatusText', label);

    setText(
        'droneWind',
        wind !== null ? `${wind.toFixed(1)} km/h` : '—'
    );

    setText(
        'dronePrecip',
        precipitation !== null ? `${precipitation.toFixed(1)} mm` : '—'
    );

    setText(
        'droneVisibility',
        visibility !== null ? `${visibility.toFixed(1)} km` : '—'
    );

    setText('droneWindDir', windDirection);

    const droneScore = document.getElementById('droneScore');

    if (droneScore) {
        droneScore.className = `obs-value ${cssClass}`;
    }

    setText('operationalDroneText', note);

    const droneSide = document.querySelector('.drone-side');

    if (droneSide) {
        droneSide.classList.remove('drone-safe', 'drone-warning', 'drone-danger');
        droneSide.classList.add(`drone-${cssClass}`);
    }
}

function updateForecastFireRisk() {
    const models = getForecastModels();

    if (!models.length) return;

    const temp = averageValues(models.map(m => m.temperature));
    const humidity = averageValues(models.map(m => m.humidity));
    const wind = averageValues(models.map(m => m.windSpeed));
    const precipitation = averageValues(models.map(m => m.precipitation));

    const windDirection = mostCommonValue(
        models.map(m => {
            if (m.windDirectionCardinal) return m.windDirectionCardinal;

            if (m.windDirectionDegrees !== null && m.windDirectionDegrees !== undefined) {
                return degreesToCardinal(m.windDirectionDegrees);
            }

            return null;
        })
    );

    let score = 0;

    if (temp !== null && temp >= 30) score += 30;
    else if (temp !== null && temp >= 25) score += 20;

    if (humidity !== null && humidity <= 30) score += 30;
    else if (humidity !== null && humidity <= 45) score += 15;

    if (wind !== null && wind >= 25) score += 25;
    else if (wind !== null && wind >= 15) score += 15;

    if (precipitation !== null && precipitation === 0) score += 15;

    score = Math.min(100, score);

    let label = 'Baixo';
    let note = 'Condições atmosféricas previstas estáveis.';
    let cssClass = 'safe';

    if (score >= 75) {
        label = 'Muito elevado';
        note = 'Condições previstas favoráveis à propagação de incêndios.';
        cssClass = 'danger';
    } else if (score >= 50) {
        label = 'Elevado';
        note = 'Risco elevado devido às condições meteorológicas previstas.';
        cssClass = 'warning';
    } else if (score >= 25) {
        label = 'Moderado';
        note = 'Condições previstas moderadas de risco.';
        cssClass = 'warning';
    }

    setText('fireScore', `${score}%`);
    setText('fireStatusText', label);

    setText(
        'fireTemp',
        temp !== null ? `${temp.toFixed(1)}°C` : '—'
    );

    setText(
        'fireHumidity',
        humidity !== null ? `${humidity.toFixed(0)}%` : '—'
    );

    setText(
        'fireWind',
        wind !== null ? `${wind.toFixed(1)} km/h` : '—'
    );

    setText('fireWindDir', windDirection);

    setText(
        'firePrecip',
        precipitation !== null ? `${precipitation.toFixed(1)} mm` : '—'
    );

    const fireScore = document.getElementById('fireScore');

    if (fireScore) {
        fireScore.className = `obs-value ${cssClass}`;
    }

    setText('operationalFireText', note);

    const fireSide = document.querySelector('.fire-side');

    if (fireSide) {
        fireSide.classList.remove('fire-safe', 'fire-warning', 'fire-danger');
        fireSide.classList.add(`fire-${cssClass}`);
    }
}

function updateForecastOperational() {
    updateForecastDroneReadiness();
    updateForecastFireRisk();
}

let forecastHistoryChart;

function initializeForecastHistoryChart() {
    const canvas = document.getElementById('forecastHistoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    forecastHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'ICON', data: [], borderColor: MODEL_COLORS.icon, backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, pointRadius: 0, spanGaps: true },
                { label: 'ECMWF', data: [], borderColor: MODEL_COLORS.ecmwf, backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, pointRadius: 0, spanGaps: true },
                { label: 'ARPEGE', data: [], borderColor: MODEL_COLORS.arpege, backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, pointRadius: 0, spanGaps: true },
                { label: 'IPMA', data: [], borderColor: MODEL_COLORS.ipma, backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, pointRadius: 0, spanGaps: true },
                { label: 'OpenWeather', data: [], borderColor: MODEL_COLORS.openweather, backgroundColor: 'transparent', borderWidth: 2, tension: 0.35, pointRadius: 0, spanGaps: true }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.1)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.1)' } }
            }
        }
    });
}

async function loadHistoricalForecasts() {
    try {
        const records = await getForecastRecords();

        const variable = document.getElementById('forecastHistoryVariable')?.value || 'temperature';
        const range = document.querySelector(
            '.forecast-history-range-buttons button.active'
        )?.dataset.range || '24h';
        const data = buildHistoricalForecastChartData(records, variable, range);

        updateHistoricalForecastChart(data);

    } catch (error) {
        console.error('Erro ao carregar histórico de previsões:', error);
    }
}

function buildHistoricalForecastChartData(records, selectedVariable, selectedRange) {
    const variableMap = {
        temperature: 'temperatureC',
        humidity: 'humidityPercent',
        windSpeed: 'windSpeedKmh',
        precipitation: 'precipitationMm',
        pressure: 'pressureHpa',
        cloudCover: 'cloudCoverPercent'
    };

    const fieldName = variableMap[selectedVariable] || 'temperatureC';

    let filtered = records.filter(item =>
        item.requestId &&
        item.requestId.startsWith('FOR_T-') &&
        item.variable?.fieldName === fieldName
    );

    filtered = filtered.filter(item => {
        if (!item.requestedLocation) return false;

        return (
            Number(item.requestedLocation.latitude).toFixed(4) === Number(appState.selectedLocation.lat).toFixed(4) &&
            Number(item.requestedLocation.longitude).toFixed(4) === Number(appState.selectedLocation.lng).toFixed(4)
        );
    });

    filtered = filterForecastHistoryByRange(filtered, selectedRange);

    filtered.sort((a, b) =>
        `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );

    const grouped = {};

    filtered.forEach(item => {
        const hour = item.time.slice(0, 2);
        const key = `${item.date} ${hour}:00`;

        if (!grouped[key]) {
            grouped[key] = {
                label: formatForecastHistoryLabel(item.date, `${hour}:00`),
                icon: null,
                ecmwf: null,
                arpege: null,
                ipma: null,
                openweather: null
            };
        }

        const source = item.source?.toLowerCase();
        const model = item.model?.toUpperCase() || '';
        const value = Number(item.value);

        if (Number.isNaN(value) || value === -99) return;

        if (source === 'open-meteo' && model.includes('ICON')) grouped[key].icon = value;
        if (source === 'open-meteo' && model.includes('ECMWF')) grouped[key].ecmwf = value;
        if (source === 'open-meteo' && model.includes('ARPEGE')) grouped[key].arpege = value;
        if (source === 'ipma') grouped[key].ipma = value;
        if (source === 'openweather') grouped[key].openweather = value;
    });

    const points = Object.values(grouped);

    return {
        labels: points.map(p => p.label),
        icon: points.map(p => p.icon),
        ecmwf: points.map(p => p.ecmwf),
        arpege: points.map(p => p.arpege),
        ipma: points.map(p => p.ipma),
        openweather: points.map(p => p.openweather),
        variable: selectedVariable
    };
}

function updateHistoricalForecastChart(data) {
    if (!forecastHistoryChart) return;

    forecastHistoryChart.data.labels = data.labels;
    forecastHistoryChart.data.datasets[0].data = data.icon;
    forecastHistoryChart.data.datasets[1].data = data.ecmwf;
    forecastHistoryChart.data.datasets[2].data = data.arpege;
    forecastHistoryChart.data.datasets[3].data = data.ipma;
    forecastHistoryChart.data.datasets[4].data = data.openweather;

    const unit = getForecastHistoryUnit(data.variable);

    forecastHistoryChart.options.scales.y.ticks.callback = function (value) {
        return `${value}${unit}`;
    };

    forecastHistoryChart.options.plugins.tooltip.callbacks.label = function (context) {
        if (context.raw === null || context.raw === undefined) {
            return `${context.dataset.label}: —`;
        }

        return `${context.dataset.label}: ${context.raw}${unit}`;
    };

    forecastHistoryChart.update();

    const allValues = [
        ...data.icon,
        ...data.ecmwf,
        ...data.arpege,
        ...data.ipma,
        ...data.openweather
    ].filter(v => v !== null && v !== undefined && !Number.isNaN(v));

    if (!allValues.length) {
        setText('forecastHistoryAvg', '—');
        setText('forecastHistoryMin', '—');
        setText('forecastHistoryMax', '—');
        setText('forecastHistoryCount', '0');
        return;
    }

    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    setText('forecastHistoryAvg', `${avg.toFixed(1)}${unit}`);
    setText('forecastHistoryMin', `${Math.min(...allValues).toFixed(1)}${unit}`);
    setText('forecastHistoryMax', `${Math.max(...allValues).toFixed(1)}${unit}`);
    setText('forecastHistoryCount', allValues.length.toLocaleString('pt-PT'));
}


function filterForecastHistoryByRange(records, selectedRange) {
    const now = new Date();

    let days = 1;

    if (selectedRange === '7d') days = 7;
    if (selectedRange === '30d') days = 30;

    const minDate = new Date(
        now.getTime() - days * 24 * 60 * 60 * 1000
    );

    return records.filter(item => {
        const itemDate = new Date(`${item.date}T${item.time}`);

        return itemDate >= minDate && itemDate <= now;
    });
}
function formatForecastHistoryLabel(date, time) {
    const [year, month, day] = date.split('-');
    return `${day}/${month} ${time.slice(0, 5)}`;
}

function getForecastHistoryUnit(variable) {
    const units = {
        temperature: '°C',
        humidity: '%',
        windSpeed: ' km/h',
        precipitation: ' mm',
        pressure: ' hPa',
        cloudCover: '%'
    };

    return units[variable] || '';
}
function initializeForecastHistoryListeners() {

    const container = document.querySelector(
        '.forecast-history-range-buttons'
    );

    if (!container) return;

    container.addEventListener('click', (e) => {

        const button = e.target.closest('button');

        if (!button) return;

        container
            .querySelectorAll('button')
            .forEach(btn => btn.classList.remove('active'));

        button.classList.add('active');

        loadHistoricalForecasts();
    });

    const variableSelect =
        document.getElementById('forecastHistoryVariable');

    if (variableSelect) {
        variableSelect.addEventListener(
            'change',
            loadHistoricalForecasts
        );
    }
}

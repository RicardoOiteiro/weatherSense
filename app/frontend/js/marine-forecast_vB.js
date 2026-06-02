/**
 * WeatherSense - Marine Forecast Dashboard
 * JavaScript Module for Marine Forecast Page
 * Prepared for FastAPI integration
 */

// ================================
// Configuration & API Endpoints
// ================================
const API_CONFIG = {
    baseUrl: '', // Will be set to FastAPI backend URL
    endpoints: {
        marineCurrent: '/data/forecast/marine/current',
        marineTimeline: '/data/marine/timeline',
        marineHistory: '/data/marine/history',
        marineRecords: '/data/marine/records'
    }
};

// ================================
// State Management
// ================================
const appState = {
    selectedLocation: {
        name: 'Costa de Nazaré',
        lat: 39.6011,
        lng: -9.0711,
        distanceToCoast: 5.2
    },
    currentData: {
        ipma: null,
        openmeteo: null,
        wwo: null
    },
    forecastData: {
        ipma: [],
        openmeteo: []
    },
    historicalData: [],
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    },
    selectedVariable: 'waveHeight',
    selectedTimeRange: 24
};

// ================================
// Mock Data for Development
// ================================
const mockCurrentData = {
    ipma: {
        waveHeight: 1.8,
        waveDirection: 'NW',
        wavePeriod: 8.5,
        swellHeight: 2.1,
        swellDirection: 'W',
        swellPeriod: 12,
        seaTemp: 17.5,
        windSpeed: 22,
        windGust: 35,
        windDirection: 'NW',
        timestamp: '14:30'
    },
    openmeteo: {
        waveHeight: 1.9,
        waveDirection: 'NW',
        wavePeriod: 8.2,
        swellHeight: 2.3,
        swellDirection: 'W',
        swellPeriod: 11.5,
        seaTemp: 17.8,
        windSpeed: 24,
        windGust: 38,
        windDirection: 'NW',
        timestamp: '14:25'
    },
    wwo: {
        waveHeight: 1.7,
        waveDirection: 'NW',
        wavePeriod: 8.0,
        swellHeight: 2.0,
        seaTemp: 17.2,
        windSpeed: 20,
        windGust: 32,
        windDirection: 'NW',
        visibility: 15,
        timestamp: '14:20'
    }
};

const mockFutureData = {
    ipma: {
        waveHeight: 2.0,
        wavePeriod: 9.0,
        waveDirection: 'NW',
        swellHeight: 2.4,
        swellPeriod: 13,
        swellDirection: 'W',
        seaTemp: 17.6,
        windSpeed: 25,
        windGust: 40,
        windDirection: 'NW',
        time: '+3h'
    },
    openmeteo: {
        waveHeight: 2.1,
        wavePeriod: 8.8,
        waveDirection: 'NW',
        swellHeight: 2.5,
        swellPeriod: 12.5,
        swellDirection: 'W',
        seaTemp: 17.9,
        windSpeed: 27,
        windGust: 42,
        windDirection: 'NW',
        time: '+3h'
    }
};

// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    initializeCharts();
    initializeEventListeners();
    loadInitialData();
    updateLastUpdateTime();
    initializeOperationalGauges();
    initializeTable();
    initializeMarineForecastTabs();


    // Auto-refresh every 5 minutes
    setInterval(refreshCurrentData, 300000);
});

// ================================
// Map Initialization
// ================================
let map;
let markers = [];
let selectedMarker;

function initializeMap() {
    map = L.map('map', { zoomControl: false }).setView([39.7436, -8.8071], 8);

    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri' }
    ).addTo(map);

    L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Labels © Esri', pane: 'overlayPane' }
    ).addTo(map);

    addCoastalBoundary();
    addMarineMarkers();

    map.on('click', function (e) {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => map.zoomIn());
    document.getElementById('zoomOut')?.addEventListener('click', () => map.zoomOut());
    document.getElementById('centerMap')?.addEventListener('click', () => {
        map.setView([39.7436, -8.8071], 8);
    });
}

function addCoastalBoundary() {
    // Simplified Leiria coastal area
    const coastalLine = [
        [39.95, -8.95],
        [39.85, -9.05],
        [39.75, -9.10],
        [39.65, -9.12],
        [39.55, -9.15],
        [39.45, -9.18],
        [39.35, -9.20]
    ];

    L.polyline(coastalLine, {
        color: '#22d3ee',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);

    // Ocean area polygon
    const oceanArea = [
        [40.0, -9.0],
        [40.0, -9.5],
        [39.2, -9.5],
        [39.2, -9.2],
        [39.35, -9.20],
        [39.45, -9.18],
        [39.55, -9.15],
        [39.65, -9.12],
        [39.75, -9.10],
        [39.85, -9.05],
        [39.95, -8.95],
        [40.0, -9.0]
    ];

    L.polygon(oceanArea, {
        color: '#22d3ee',
        weight: 1,
        fillColor: '#0077b6',
        fillOpacity: 0.1
    }).addTo(map);
}

function addMarineMarkers() {

    const marinePoints = [
        { name: "Figueira Offshore", lat: 40.12, lng: -9.05 },
        { name: "Vieira / Pedrógão Offshore", lat: 39.93, lng: -9.12 },
        { name: "São Pedro Offshore", lat: 39.73, lng: -9.18 },
        { name: "Nazaré Nearshore", lat: 39.60, lng: -9.20 },
        { name: "Nazaré Canyon", lat: 39.52, lng: -9.35 },
        { name: "Peniche Offshore", lat: 39.30, lng: -9.45 },
        { name: "Berlenga Offshore", lat: 39.41, lng: -9.52 }
    ];

    marinePoints.forEach(point => {

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div style="
                    background: #22d3ee;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.8);
                    box-shadow: 0 0 12px #22d3ee;
                "></div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker(
            [point.lat, point.lng],
            { icon: customIcon }
        )
            .addTo(map)
            .bindPopup(`
            <div style="color: #f8fafc; padding: 8px;">
                <h4 style="margin:0 0 8px 0; color:#22d3ee;">
                    ${point.name}
                </h4>
                <p style="margin:0; font-size:12px;">
                    Ponto de previsão marítima
                </p>
                <p style="margin-top:4px; font-size:11px;">
                    ${point.lat.toFixed(2)}° N,
                    ${Math.abs(point.lng).toFixed(2)}° W
                </p>
            </div>
        `);

        marker.on('click', () => {
            selectLocation(
                point.lat,
                point.lng,
                point.name
            );
        });

        markers.push(marker);
    });
}

function createMarinePopupContent(point) {
    let sourceColor;
    if (point.source === 'ipma') {
        sourceColor = '#22d3ee';
    } else if (point.source === 'openmeteo') {
        sourceColor = '#14b8a6';
    } else {
        sourceColor = '#ff8c00';
    }

    return `
        <div style="color: #f8fafc; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: ${sourceColor};">
                ${point.name}
            </h4>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Fonte: ${point.source.toUpperCase()}
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
        distanceToCoast: (Math.random() * 10 + 2).toFixed(1)
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

    console.log("Marcador selecionado:", lat, lng, name);
    // Update UI

    refreshCurrentData();
    initializeMarineTimeline();
}


// ================================
// Charts Initialization
// ================================
let evolutionChart;
let historyChart;

function initializeCharts() {
    initializeEvolutionChart();
    initializeHistoryChart();
}

function initializeEvolutionChart() {
    const ctx = document.getElementById('evolutionChart').getContext('2d');

    const gradient1 = ctx.createLinearGradient(0, 0, 0, 350);
    gradient1.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
    gradient1.addColorStop(1, 'rgba(34, 211, 238, 0)');

    const gradient2 = ctx.createLinearGradient(0, 0, 0, 350);
    gradient2.addColorStop(0, 'rgba(20, 184, 166, 0.3)');
    gradient2.addColorStop(1, 'rgba(20, 184, 166, 0)');

    const mockEvolutionData = generateMockEvolutionData(24);

    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mockEvolutionData.labels,
            datasets: [
                {
                    label: 'IPMA Marine',
                    data: mockEvolutionData.ipma,
                    borderColor: '#22d3ee',
                    backgroundColor: gradient1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#22d3ee',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'Open-Meteo Marine',
                    data: mockEvolutionData.openmeteo,
                    borderColor: '#14b8a6',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#14b8a6',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
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
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} m`;
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
                        font: { size: 11 },
                        maxRotation: 0
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
                            return value + ' m';
                        }
                    }
                }
            }
        }
    });
}

function initializeHistoryChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    const gradient1 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient1.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
    gradient1.addColorStop(1, 'rgba(34, 211, 238, 0)');

    const gradient2 = ctx.createLinearGradient(0, 0, 0, 300);
    gradient2.addColorStop(0, 'rgba(20, 184, 166, 0.4)');
    gradient2.addColorStop(1, 'rgba(20, 184, 166, 0)');

    const mockHistoryData = generateMockHistoryData();

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mockHistoryData.labels,
            datasets: [
                {
                    label: 'IPMA Marine',
                    data: mockHistoryData.ipma,
                    borderColor: '#22d3ee',
                    backgroundColor: gradient1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Open-Meteo Marine',
                    data: mockHistoryData.openmeteo,
                    borderColor: '#14b8a6',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        usePointStyle: true,
                        pointStyle: 'circle'
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
                        font: { size: 10 },
                        maxRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function generateMockEvolutionData(hours) {
    const labels = [];
    const ipma = [];
    const openmeteo = [];
    const now = new Date();

    for (let i = 0; i < hours; i += 3) {
        const time = new Date(now.getTime() + i * 60 * 60 * 1000);
        labels.push(time.getHours().toString().padStart(2, '0') + ':00');

        const baseWave = 1.5 + Math.sin(i / 6) * 0.5;
        ipma.push(baseWave + Math.random() * 0.3);
        openmeteo.push(baseWave + Math.random() * 0.3 + 0.1);
    }

    return { labels, ipma, openmeteo };
}

function generateMockHistoryData() {
    const labels = [];
    const ipma = [];
    const openmeteo = [];

    for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }));

        const baseWave = 1.8 + Math.random() * 1.2;
        ipma.push(baseWave);
        openmeteo.push(baseWave + (Math.random() - 0.5) * 0.4);
    }

    return { labels, ipma, openmeteo };
}

// ================================
// Event Listeners
// ================================
function initializeEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-range-buttons .btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-buttons .btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const range = parseInt(this.dataset.range);
            updateEvolutionChart(range);
        });
    });

    // Variable selector
    document.getElementById('chartVariable').addEventListener('change', function () {
        appState.selectedVariable = this.value;
        updateEvolutionChart(appState.selectedTimeRange);
    });

    // History variable selector
    document.getElementById('historyVariable').addEventListener('change', function () {
        updateHistoryChart(this.value);
    });

    // Table search
    document.getElementById('tableSearch').addEventListener('input', function () {
        filterTable(this.value);
    });

    // Export CSV
    document.getElementById('exportCsv').addEventListener('click', exportTableToCsv);
}

function updateEvolutionChart(hours) {
    appState.selectedTimeRange = hours;
    const newData = generateMockEvolutionData(hours);

    evolutionChart.data.labels = newData.labels;
    evolutionChart.data.datasets[0].data = newData.ipma;
    evolutionChart.data.datasets[1].data = newData.openmeteo;
    evolutionChart.update();

    // Update analytics
    updateAnalytics(newData);
}

function updateHistoryChart(variable) {
    const newData = generateMockHistoryData();
    historyChart.data.labels = newData.labels;
    historyChart.data.datasets[0].data = newData.ipma;
    historyChart.data.datasets[1].data = newData.openmeteo;
    historyChart.update();

    updateHistorySummary(newData);
}

function updateAnalytics(data) {
    const allValues = [...data.ipma, ...data.openmeteo];
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const spread = max - min;

    // Calculate agreement
    let agreementSum = 0;
    for (let i = 0; i < data.ipma.length; i++) {
        const diff = Math.abs(data.ipma[i] - data.openmeteo[i]);
        agreementSum += (1 - diff / max) * 100;
    }
    const agreement = agreementSum / data.ipma.length;

    document.getElementById('avgForecastValue').textContent = avg.toFixed(2) + ' m';
    document.getElementById('minForecastValue').textContent = min.toFixed(2) + ' m';
    document.getElementById('maxForecastValue').textContent = max.toFixed(2) + ' m';
    document.getElementById('spreadValue').textContent = spread.toFixed(2) + ' m';
    document.getElementById('agreementValue').textContent = agreement.toFixed(0) + '%';
    document.getElementById('recordsCount').textContent = data.ipma.length * 2;

    // Update comparison bars
    updateComparisonBars(data);
}

function updateComparisonBars(data) {
    const waveHeightDiff = Math.abs(data.ipma[0] - data.openmeteo[0]);
    document.getElementById('waveHeightDiff').style.width = Math.min(waveHeightDiff * 50, 100) + '%';
    document.getElementById('waveHeightDiffValue').textContent = '±' + waveHeightDiff.toFixed(2) + ' m';

    // Mock other differences
    const mockDiffs = {
        wavePeriod: (Math.random() * 2).toFixed(1),
        swellHeight: (Math.random() * 0.5).toFixed(2),
        windSpeed: Math.floor(Math.random() * 10),
        seaTemp: (Math.random() * 1).toFixed(1)
    };

    document.getElementById('wavePeriodDiff').style.width = mockDiffs.wavePeriod * 25 + '%';
    document.getElementById('wavePeriodDiffValue').textContent = '±' + mockDiffs.wavePeriod + ' s';

    document.getElementById('swellHeightDiff').style.width = mockDiffs.swellHeight * 100 + '%';
    document.getElementById('swellHeightDiffValue').textContent = '±' + mockDiffs.swellHeight + ' m';

    document.getElementById('windSpeedDiff').style.width = mockDiffs.windSpeed * 5 + '%';
    document.getElementById('windSpeedDiffValue').textContent = '±' + mockDiffs.windSpeed + ' km/h';

    document.getElementById('seaTempDiff').style.width = mockDiffs.seaTemp * 50 + '%';
    document.getElementById('seaTempDiffValue').textContent = '±' + mockDiffs.seaTemp + ' °C';

    // Show disagreement alert if significant
    const disagreementAlert = document.getElementById('disagreementAlert');
    if (waveHeightDiff > 0.5 || parseFloat(mockDiffs.windSpeed) > 8) {
        disagreementAlert.classList.add('visible');
    } else {
        disagreementAlert.classList.remove('visible');
    }
}

function updateHistorySummary(data) {
    const allValues = [...data.ipma, ...data.openmeteo];
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    document.getElementById('historyAvg').textContent = avg.toFixed(2) + ' m';
    document.getElementById('historyMin').textContent = Math.min(...allValues).toFixed(2) + ' m';
    document.getElementById('historyMax').textContent = Math.max(...allValues).toFixed(2) + ' m';
    document.getElementById('historyTotal').textContent = allValues.length;
}

// ================================
// Data Loading & Updates
// ================================
function loadInitialData() {
    // Load mock data for development
    refreshCurrentData();
    initializeMarineTimeline();
    updateEvolutionChart(24);
    updateHistorySummary(generateMockHistoryData());
    updateOperationalAnalysis();
    updateActivitySuitability();
}

async function refreshCurrentData() {
    try {

        const { lat, lng } = appState.selectedLocation;

        console.log("A pedir dados para:", lat, lng);

        const response = await fetch(
            `/data/forecast/marine/current?lat=${lat}&lon=${lng}`
        );

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        console.log("Dados recebidos:", data);

        appState.currentData = {
            ipma: mapMarineCurrent(data.ipma),
            openmeteo: mapMarineCurrent(data.openmeteo),
            wwo: mapMarineCurrent(data.worldweatheronline)
        };

        updateCurrentConditions(appState.currentData);
        updateLastUpdateTime();

    } catch (error) {
        console.error('Erro ao carregar previsão marítima atual:', error);
    }
}
function mapMarineCurrent(sourceData) {
    if (!sourceData) return null;

    const values = sourceData.values || {};

    function getValue(field) {
        const value = values[field]?.value;

        if (
            value === null ||
            value === undefined ||
            value === -99 ||
            value === -99.0
        ) {
            return null;
        }

        return Number(value) || value;
    }

    function getRange(minField, maxField) {
        const min = getValue(minField);
        const max = getValue(maxField);

        if (min == null && max == null) return null;
        if (min === max) return min;

        return `${min} - ${max}`;
    }

    return {
        source: sourceData.source,
        model: sourceData.model,
        timestamp: sourceData.time?.slice(0, 5) ?? '—',

        waveHeight: getValue('waveHeightM') ?? getRange('waveHeightMinM', 'waveHeightMaxM'),
        waveDirection:
            values.waveDirectionCardinal?.value ??
            getValue('waveDirectionDegrees'),
        wavePeriod: getValue('wavePeriodS') ?? getRange('wavePeriodMinS', 'wavePeriodMaxS'),

        swellHeight: getValue('swellHeightM'),
        swellDirection:
            values.swellDirectionCardinal?.value ??
            getValue('swellDirectionDegrees'),
        swellPeriod: getValue('swellPeriodS'),

        seaTemp:
            getValue('waterTemperatureC') ??
            getRange('waterTemperatureMinC', 'waterTemperatureMaxC'),

        windSpeed: getValue('windSpeedKmh'),
        windGust: getValue('windGustKmh'),
        windDirection:
            values.windDirectionCardinal?.value ??
            getValue('windDirectionDegrees'),

        visibility: getValue('visibilityKm')
    };
}

function formatValue(value, decimals = 1) {
    if (value === null || value === undefined || value === '—') return '—';

    const number = Number(value);

    if (!Number.isNaN(number)) {
        return number.toFixed(decimals);
    }

    return value;
}

function updateCurrentConditions(data) {

    // IPMA Marine
    if (data.ipma) {
        document.getElementById('ipmaCurrentTime').textContent = data.ipma.timestamp;
        document.getElementById('ipmaWaveHeight').textContent = formatValue(data.ipma.waveHeight);
        document.getElementById('ipmaWaveDir').textContent = data.ipma.waveDirection ?? '—';
        document.getElementById('ipmaWavePeriod').textContent = formatValue(data.ipma.wavePeriod);
        document.getElementById('ipmaSwellHeight').textContent = formatValue(data.ipma.swellHeight);
        document.getElementById('ipmaSwellDir').textContent = data.ipma.swellDirection ?? '—';
        document.getElementById('ipmaSwellPeriod').textContent = formatValue(data.ipma.swellPeriod);
        document.getElementById('ipmaSeaTemp').textContent = formatValue(data.ipma.seaTemp);
        document.getElementById('ipmaWindSpeed').textContent = formatValue(data.ipma.windSpeed, 0);
        document.getElementById('ipmaWindGust').textContent = formatValue(data.ipma.windGust, 0);
    }

    // Open-Meteo Marine
    if (data.openmeteo) {
        document.getElementById('openmeteoCurrentTime').textContent = data.openmeteo.timestamp;
        document.getElementById('openmeteoWaveHeight').textContent = formatValue(data.openmeteo.waveHeight);
        document.getElementById('openmeteoWaveDir').textContent = data.openmeteo.waveDirection ?? '—';
        document.getElementById('openmeteoWavePeriod').textContent = formatValue(data.openmeteo.wavePeriod);
        document.getElementById('openmeteoSwellHeight').textContent = formatValue(data.openmeteo.swellHeight);
        document.getElementById('openmeteoSwellDir').textContent = data.openmeteo.swellDirection ?? '—';
        document.getElementById('openmeteoSwellPeriod').textContent = formatValue(data.openmeteo.swellPeriod);
        document.getElementById('openmeteoSeaTemp').textContent = formatValue(data.openmeteo.seaTemp);
        document.getElementById('openmeteoWindSpeed').textContent = formatValue(data.openmeteo.windSpeed, 0);
        document.getElementById('openmeteoWindGust').textContent = formatValue(data.openmeteo.windGust, 0);
    }

    // WorldWeatherOnline
    if (data.wwo) {
        document.getElementById('wwoWaveHeight').textContent = formatValue(data.wwo.waveHeight);
        document.getElementById('wwoWaveDir').textContent = data.wwo.waveDirection ?? '—';
        document.getElementById('wwoWavePeriod').textContent = formatValue(data.wwo.wavePeriod);
        document.getElementById('wwoSwellHeight').textContent = formatValue(data.wwo.swellHeight);
        document.getElementById('wwoSwellDir').textContent = data.wwo.swellDirection ?? '—';
        document.getElementById('wwoSwellPeriod').textContent = formatValue(data.wwo.swellPeriod);
        document.getElementById('wwoSeaTemp').textContent = formatValue(data.wwo.seaTemp);
        document.getElementById('wwoWindSpeed').textContent = formatValue(data.wwo.windSpeed, 0);
        document.getElementById('wwoWindGust').textContent = formatValue(data.wwo.windGust, 0);
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentUpdateTime').textContent = timeStr;
}

// ================================
// Timeline Generation
// ================================


function createTimelineBlock(time, hourOffset) {
    const block = document.createElement('div');
    block.className = 'timeline-block';

    const dateStr = time.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
    const hourStr = time.getHours().toString().padStart(2, '0') + ':00';

    // Mock data
    const waveHeight = (1.5 + Math.sin(hourOffset / 6) * 0.5 + Math.random() * 0.3).toFixed(1);
    const wavePeriod = (8 + Math.random() * 3).toFixed(1);
    const swellHeight = (2.0 + Math.random() * 0.5).toFixed(1);
    const swellPeriod = (11 + Math.random() * 3).toFixed(0);
    const seaTemp = (17 + Math.random() * 2).toFixed(1);
    const windSpeed = Math.floor(18 + Math.random() * 15);
    const windDir = ['N', 'NE', 'NW', 'W'][Math.floor(Math.random() * 4)];

    // Weather icon based on conditions
    let weatherIcon = 'fa-water';
    if (parseFloat(waveHeight) > 2.5) {
        weatherIcon = 'fa-water';
    } else if (windSpeed > 30) {
        weatherIcon = 'fa-wind';
    }

    block.innerHTML = `
        <div class="timeline-header">
            <span class="timeline-date">${dateStr}</span>
            <span class="timeline-hour">${hourStr}</span>
        </div>
        <div class="timeline-icon">
            <i class="fas ${weatherIcon}"></i>
        </div>
        <div class="timeline-data">
            <div class="timeline-row">
                <span class="timeline-row-label">Onda</span>
                <span class="timeline-row-value">${waveHeight} m</span>
            </div>
            <div class="timeline-row">
                <span class="timeline-row-label">Período</span>
                <span class="timeline-row-value">${wavePeriod} s</span>
            </div>
            <div class="timeline-row">
                <span class="timeline-row-label">Swell</span>
                <span class="timeline-row-value">${swellHeight} m</span>
            </div>
            <div class="timeline-row">
                <span class="timeline-row-label">Temp.</span>
                <span class="timeline-row-value">${seaTemp} °C</span>
            </div>
            <div class="timeline-row">
                <span class="timeline-row-label">Vento</span>
                <span class="timeline-row-value">${windSpeed} ${windDir}</span>
            </div>
        </div>
        <div class="timeline-source">
            <span class="timeline-source-badge ipma">IPMA</span>
            <span class="timeline-source-badge openmeteo">OM</span>
        </div>
    `;

    return block;
}

// ================================
// Operational Analysis
// ================================
function initializeOperationalGauges() {
    updateNavigationGauge(75);
}

function updateNavigationGauge(percentage) {
    const gaugeFill = document.getElementById('navGaugeFill');
    const gaugeValue = document.getElementById('navGaugeValue');

    // Calculate stroke-dashoffset (314 is full circle, 0 is empty)
    const offset = 314 - (314 * percentage / 100);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeValue.textContent = percentage + '%';

    // Update status
    const statusEl = document.getElementById('navStatus');
    if (percentage >= 80) {
        statusEl.textContent = 'Excelente';
        statusEl.className = 'operational-status excellent';
        gaugeFill.style.stroke = '#10b981';
    } else if (percentage >= 60) {
        statusEl.textContent = 'Bom';
        statusEl.className = 'operational-status good';
        gaugeFill.style.stroke = '#22d3ee';
    } else if (percentage >= 40) {
        statusEl.textContent = 'Moderado';
        statusEl.className = 'operational-status moderate';
        gaugeFill.style.stroke = '#f59e0b';
    } else {
        statusEl.textContent = 'Mau';
        statusEl.className = 'operational-status poor';
        gaugeFill.style.stroke = '#ef4444';
    }
}

function updateOperationalAnalysis() {
    // Mock operational data
    document.getElementById('navLimitingFactor').textContent = 'Altura Onda';
    document.getElementById('navWaveHeight').textContent = '1.8 m';
    document.getElementById('navWavePeriod').textContent = '8.5 s';
    document.getElementById('navWindSpeed').textContent = '22 km/h';
    document.getElementById('navVisibility').textContent = '15 km';
}

function updateActivitySuitability() {
    const activities = [
        { id: 'recreational', percent: 85, status: 'good' },
        { id: 'fishing', percent: 70, status: 'moderate' },
        { id: 'surf', percent: 92, status: 'excellent' },
        { id: 'coastal', percent: 55, status: 'warning' }
    ];

    activities.forEach(activity => {
        document.getElementById(activity.id + 'Bar').style.width = activity.percent + '%';
        document.getElementById(activity.id + 'Bar').className = 'bar-fill ' + activity.status;
        document.getElementById(activity.id + 'Percent').textContent = activity.percent + '%';
    });
}

// ================================
// Table Management
// ================================
function initializeTable() {
    const mockRecords = generateMockTableRecords();
    appState.tableData = mockRecords;
    appState.pagination.totalItems = mockRecords.length;
    renderTable();
}

function generateMockTableRecords() {
    const records = [];
    const sources = ['IPMA Marine', 'Open-Meteo Marine'];
    const variables = ['wave_height', 'wave_period', 'swell_height', 'sea_temp', 'wind_speed'];
    const units = { wave_height: 'm', wave_period: 's', swell_height: 'm', sea_temp: '°C', wind_speed: 'km/h' };

    for (let i = 0; i < 50; i++) {
        const date = new Date();
        date.setHours(date.getHours() - i * 3);

        const source = sources[Math.floor(Math.random() * sources.length)];
        const variable = variables[Math.floor(Math.random() * variables.length)];

        let value;
        switch (variable) {
            case 'wave_height':
                value = (1.5 + Math.random() * 1.5).toFixed(2);
                break;
            case 'wave_period':
                value = (7 + Math.random() * 5).toFixed(1);
                break;
            case 'swell_height':
                value = (1.8 + Math.random() * 1.2).toFixed(2);
                break;
            case 'sea_temp':
                value = (15 + Math.random() * 5).toFixed(1);
                break;
            case 'wind_speed':
                value = Math.floor(15 + Math.random() * 25);
                break;
        }

        records.push({
            date: date.toLocaleDateString('pt-PT'),
            time: date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
            source: source,
            model: source.includes('IPMA') ? 'ECMWF-WAM' : 'ERA5',
            variable: variable.replace('_', ' '),
            value: value,
            unit: units[variable],
            lat: (39.4 + Math.random() * 0.4).toFixed(4),
            lng: (-9.0 - Math.random() * 0.5).toFixed(4)
        });
    }

    return records;
}

function renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    const start = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage;
    const end = start + appState.pagination.itemsPerPage;
    const pageData = appState.tableData.slice(start, end);

    tbody.innerHTML = pageData.map(record => `
        <tr>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td>${record.source}</td>
            <td>${record.model}</td>
            <td>${record.variable}</td>
            <td>${record.value}</td>
            <td>${record.unit}</td>
            <td>${record.lat}</td>
            <td>${record.lng}</td>
        </tr>
    `).join('');

    updateTableInfo();
    renderPagination();
}

function updateTableInfo() {
    const start = (appState.pagination.currentPage - 1) * appState.pagination.itemsPerPage + 1;
    const end = Math.min(start + appState.pagination.itemsPerPage - 1, appState.pagination.totalItems);
    document.getElementById('tableInfo').textContent =
        `Mostrando ${start}-${end} de ${appState.pagination.totalItems} registos`;
}

function renderPagination() {
    const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
    const pagination = document.getElementById('pagination');

    let html = '';

    // Previous button
    html += `<button ${appState.pagination.currentPage === 1 ? 'disabled' : ''} 
        onclick="changePage(${appState.pagination.currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="${i === appState.pagination.currentPage ? 'active' : ''}" 
            onclick="changePage(${i})">${i}</button>`;
    }

    // Next button
    html += `<button ${appState.pagination.currentPage === totalPages ? 'disabled' : ''} 
        onclick="changePage(${appState.pagination.currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    appState.pagination.currentPage = page;
    renderTable();
}

function filterTable(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filtered = generateMockTableRecords().filter(record =>
        record.source.toLowerCase().includes(term) ||
        record.variable.toLowerCase().includes(term) ||
        record.date.includes(term)
    );
    appState.tableData = filtered;
    appState.pagination.totalItems = filtered.length;
    appState.pagination.currentPage = 1;
    renderTable();
}

function exportTableToCsv() {
    const headers = ['Data', 'Hora', 'Fonte', 'Modelo', 'Variável', 'Valor', 'Unidade', 'Latitude', 'Longitude'];
    const rows = appState.tableData.map(r =>
        [r.date, r.time, r.source, r.model, r.variable, r.value, r.unit, r.lat, r.lng].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'marine_forecast_records.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ================================
// API Integration (Prepared for FastAPI)
// ================================
async function fetchMarineCurrent() {
    try {
        const response = await fetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.marineCurrent);
        const data = await response.json();
        updateCurrentConditions(data);
    } catch (error) {
        console.error('Error fetching marine current data:', error);
        // Fallback to mock data
        updateCurrentConditions(mockCurrentData);
    }
}

async function fetchMarineTimeline() {
    try {
        const response = await fetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.marineTimeline);
        const data = await response.json();
        // Process timeline data
    } catch (error) {
        console.error('Error fetching marine timeline:', error);
    }
}

async function fetchMarineHistory() {
    try {
        const response = await fetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.marineHistory);
        const data = await response.json();
        // Process history data
    } catch (error) {
        console.error('Error fetching marine history:', error);
    }
}

async function fetchMarineRecords(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(
            `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.marineRecords}?${queryString}`
        );
        const data = await response.json();
        appState.tableData = data.records;
        appState.pagination.totalItems = data.total;
        renderTable();
    } catch (error) {
        console.error('Error fetching marine records:', error);
    }
}

async function getMarineFutureForecastData() {
    const { lat, lng } = appState.selectedLocation;

    const response = await fetch(
        `/data/forecast/marine/future?lat=${lat}&lon=${lng}`
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar previsão marítima futura: ${response.status}`);
    }

    return await response.json();
}
let currentMarineForecastProvider = 'ipma';
async function initializeMarineTimeline() {
    const container = document.getElementById('timelineScroll');
    if (!container) return;

    try {
        const data = await getMarineFutureForecastData();

        let html = '';

        if (currentMarineForecastProvider === 'ipma') {
            html = renderMarineTimelineModelRow({
                provider: 'IPMA Marine',
                model: 'ECMWF + AROME',
                type: 'Diário',
                data: data.ipma || []
            });
        }

        if (currentMarineForecastProvider === 'openmeteo') {
            html = renderMarineTimelineModelRow({
                provider: 'Open-Meteo Marine',
                model: 'DWD EWAM',
                type: 'Horário',
                data: data.openmeteo || []
            });
        }

        if (currentMarineForecastProvider === 'worldweatheronline') {
            html = renderMarineTimelineModelRow({
                provider: 'WorldWeatherOnline',
                model: 'Proprietary Model - WWO',
                type: 'Horário',
                data: data.worldweatheronline || []
            });
        }

        container.innerHTML =
            html || '<p class="empty-state">Sem previsões marítimas futuras disponíveis.</p>';

        initializeTimelineArrows();

    } catch (error) {
        console.error('Erro ao carregar timeline marítima:', error);
        container.innerHTML = '<p class="empty-state">Erro ao carregar previsões marítimas futuras.</p>';
    }
}

function initializeMarineForecastTabs() {
    document.querySelectorAll('.forecast-model-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.forecast-model-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            currentMarineForecastProvider = tab.dataset.provider;

            initializeMarineTimeline();
        });
    });
}

function initializeTimelineArrows() {
    document.querySelectorAll('.timeline-arrow').forEach(button => {
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

function renderMarineTimelineModelRow(modelData) {
    const modelId = modelData.provider
        .toLowerCase()
        .replaceAll(' ', '-')
        .replaceAll('.', '')
        .replaceAll('+', '')
        .replaceAll('/', '');

    return `
        <div class="timeline-model-row">
            <div class="timeline-model-left">
                ${renderMarineTimelineModelSummary(modelData.data, modelData.model, modelData.provider, modelData.type)}
                <div class="timeline-model-controls">
                    <button class="timeline-arrow prev" data-model="${modelId}">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="timeline-arrow next" data-model="${modelId}">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="timeline-model-hours" id="timeline-${modelId}">
                ${renderMarineTimelineBlocks(modelData.data, modelData.provider)}
            </div>
        </div>
    `;
}

function renderMarineTimelineModelSummary(forecastData, modelName, provider, type) {
    return `
        <div class="timeline-model-summary premium-summary">
            <div class="timeline-model-main">
                <div class="timeline-model-icon">
                    <i class="fas fa-water"></i>
                </div>
                <div class="timeline-model-info">
                    <span class="timeline-model-provider">
                        ${provider} - <strong>${modelName}</strong>
                    </span>
                    <span class="timeline-model-name">${type}</span>
                </div>
            </div>
        </div>
    `;
}

function renderMarineTimelineBlocks(records, provider) {
    return records.map((record, index) => {

        const forecast = mapMarineTimelineRecord(record, provider);

        const details = [];

        // IPMA
        if (forecast.waveDirection !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-compass"></i>
                    Onda: ${forecast.waveDirection}
                </span>
            `);
        }

        if (forecast.wavePeriod !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-clock"></i>
                    Período: ${forecast.wavePeriod} s
                </span>
            `);
        }

        // Swell
        if (forecast.swellHeight !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-water"></i>
                    Swell: ${forecast.swellHeight} m
                </span>
            `);
        }

        if (forecast.swellDirection !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-location-arrow"></i>
                    Dir. Swell: ${forecast.swellDirection}
                </span>
            `);
        }

        if (forecast.swellPeriod !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-clock"></i>
                    Período Swell: ${forecast.swellPeriod} s
                </span>
            `);
        }

        // Temperatura
        if (forecast.seaTemp !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-temperature-half"></i>
                    Água: ${forecast.seaTemp} °C
                </span>
            `);
        }

        // WWO
        if (forecast.windSpeed !== '—') {
            details.push(`
                <span>
                    <i class="fas fa-wind"></i>
                    Vento: ${forecast.windSpeed} km/h
                </span>
            `);
        }

        return `
            <div class="timeline-block ${index === 0 ? 'current' : ''}">
                <div class="timeline-datetime">
                    <span class="timeline-date">${forecast.date}</span>
                    <span class="timeline-hour">${forecast.time}</span>
                </div>

                <i class="fas fa-water timeline-icon"></i>

                <span class="timeline-temp">
                    ${forecast.waveHeight} m
                </span>

                <div class="timeline-details">
                    ${details.join('')}
                </div>
            </div>
        `;
    }).join('');
}
function mapMarineTimelineRecord(record, provider) {
    const values = record.values || {};

    function getValue(field) {
        const value = values[field]?.value;

        if (
            value === null ||
            value === undefined ||
            value === -99 ||
            value === -99.0
        ) {
            return null;
        }

        return Number(value) || value;
    }

    function getRange(minField, maxField) {
        const min = getValue(minField);
        const max = getValue(maxField);

        if (min == null && max == null) return '—';
        if (min === max) return formatValue(min);

        return `${formatValue(min)} - ${formatValue(max)}`;
    }

    const isIpma = provider.includes('IPMA');

    return {
        date: formatTimelineShortDate(record.date),
        time: isIpma ? 'Diário' : record.time?.slice(0, 5),

        waveHeight:
            getValue('waveHeightM') != null
                ? formatValue(getValue('waveHeightM'))
                : getRange('waveHeightMinM', 'waveHeightMaxM'),

        waveDirection:
            values.waveDirectionCardinal?.value ??
            getValue('waveDirectionDegrees') ??
            '—',

        wavePeriod:
            getValue('wavePeriodS') != null
                ? formatValue(getValue('wavePeriodS'))
                : getRange('wavePeriodMinS', 'wavePeriodMaxS'),

        swellHeight:
            getValue('swellHeightM') != null
                ? formatValue(getValue('swellHeightM'))
                : '—',

        swellDirection:
            values.swellDirectionCardinal?.value ??
            getValue('swellDirectionDegrees') ??
            '—',

        swellPeriod:
            getValue('swellPeriodS') != null
                ? formatValue(getValue('swellPeriodS'))
                : '—',

        seaTemp:
            getValue('waterTemperatureC') != null
                ? formatValue(getValue('waterTemperatureC'))
                : getRange('waterTemperatureMinC', 'waterTemperatureMaxC'),

        windSpeed:
            getValue('windSpeedKmh') != null
                ? formatValue(getValue('windSpeedKmh'), 0)
                : '—'
    };
}

function formatTimelineShortDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short'
    });
}

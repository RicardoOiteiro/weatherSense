/**
 * WeatherSense - Meteorological Observations Dashboard
 * JavaScript Module for Observations Page
 * Prepared for FastAPI integration
 */

// ================================
// Configuration & API Endpoints
// ================================
const API_CONFIG = {
    baseUrl: '', // Will be set to FastAPI backend URL
    endpoints: {
        observations: '/data/observations',
        currentObservations: '/data/observations/current',
        historyObservations: '/data/observations/history'
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
    filters: {
        startDate: null,
        endDate: null,
        time: null,
        location: null,
        source: null,
        variable: null
    },
    currentData: {
        ipma: null,
        foreca: null
    },
    historicalData: [],
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    }
};

// ================================
// Mock Data for Development
// ================================
const mockCurrentData = {
    ipma: {
        temperature: 22.5,
        humidity: 65,
        windSpeed: 18,
        windDirection: 'NW',
        precipitation: 0.0,
        pressure: 1015,
        visibility: 15,
        cloudCover: 35,
        observationTime: '14:30',
        distance: 2.3
    },
    foreca: {
        temperature: 23.1,
        humidity: 62,
        windSpeed: 20,
        windDirection: 'NW',
        precipitation: 0.0,
        pressure: 1014,
        visibility: 18,
        cloudCover: 30,
        observationTime: '14:25',
        distance: 1.8
    }
};

const mockHistoricalData = generateMockHistoricalData();

const mockTableData = generateMockTableData();

// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    initializeCharts();
    
    initializeEventListeners();
    loadInitialData();
    updateLastUpdateTime();

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
    addWeatherMarkers();

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

function addWeatherMarkers() {
    const stations = [
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

    stations.forEach(station => {
        const markerColor = '#00d4ff';

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: ${markerColor};
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.8);
                box-shadow: 0 0 12px ${markerColor};
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([station.lat, station.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(`
                <div style="color: #f8fafc; padding: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #00d4ff;">
                        ${station.name}
                    </h4>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                        Ponto de observação
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                        ${station.lat.toFixed(4)}°N, ${Math.abs(station.lng).toFixed(4)}°W
                    </p>
                </div>
            `);

        marker.on('click', () => {
            selectLocation(station.lat, station.lng, station.name);
        });

        markers.push(marker);
    });
}

function createPopupContent(station) {
    return `
        <div style="color: #f8fafc; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: ${station.source === 'ipma' ? '#00d4ff' : '#00ff88'};">
                ${station.name}
            </h4>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Fonte: ${station.source.toUpperCase()}
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                ${station.lat.toFixed(4)}°N, ${Math.abs(station.lng).toFixed(4)}°W
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
    //calculateDistances();
    refreshCurrentData();
    loadHistoricalObservations();
}

function updateLocationPanel() {
    const loc = appState.selectedLocation;
    document.getElementById('selectedLocationName').textContent = loc.name;
    document.getElementById('selectedLocationCoords').textContent =
        `${loc.lat.toFixed(4)}° N, ${Math.abs(loc.lng).toFixed(4)}° W`;
    document.getElementById('locationAltitude').textContent = `${loc.altitude} m`;
}

function calculateDistances() {
    // Calculate distances to nearest IPMA and Foreca stations
    const ipmaDistance = (Math.random() * 5 + 1).toFixed(1);
    const forecaDistance = (Math.random() * 5 + 1).toFixed(1);

    document.getElementById('ipmaDistance').textContent = `${ipmaDistance} km`;
    document.getElementById('forecaDistance').textContent = `${forecaDistance} km`;
    document.getElementById('ipmaCardDistance').textContent = `${ipmaDistance} km`;
    document.getElementById('forecaCardDistance').textContent = `${forecaDistance} km`;
}

// ================================
// Charts Initialization
// ================================
let historyChart;
let sourceComparisonChart;
let distributionChart;

function initializeCharts() {
    initializeHistoryChart();

    if (document.getElementById('sourceComparisonChart')) {
        initializeSourceComparisonChart();
    }

    if (document.getElementById('distributionChart')) {
        initializeDistributionChart();
    }
}

function initializeHistoryChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    const gradient1 = ctx.createLinearGradient(0, 0, 0, 350);
    gradient1.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
    gradient1.addColorStop(1, 'rgba(0, 212, 255, 0)');

    const gradient2 = ctx.createLinearGradient(0, 0, 0, 350);
    gradient2.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
    gradient2.addColorStop(1, 'rgba(0, 255, 136, 0)');

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mockHistoricalData.labels,
            datasets: [
                {
                    label: 'IPMA',
                    data: mockHistoricalData.ipma,
                    borderColor: '#00d4ff',
                    backgroundColor: gradient1,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00d4ff',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    spanGaps: true,
                },
                {
                    label: 'Foreca',
                    data: mockHistoricalData.foreca,
                    borderColor: '#00ff88',
                    backgroundColor: gradient2,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00ff88',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    spanGaps: true,
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
                            const unit = getHistoricalUnit(appState.historicalData.variable);
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}${unit}`;
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
                        font: {
                            size: 11
                        },
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
                        font: {
                            size: 11
                        },
                        callback: function (value) {
                            const unit = getHistoricalUnit(appState.historicalData.variable);
                            return value + unit;
                        }
                    }
                }
            }
        }
    });
}

function initializeSourceComparisonChart() {
    const ctx = document.getElementById('sourceComparisonChart').getContext('2d');

    sourceComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temperatura', 'Humidade', 'Vento', 'Precipitação', 'Pressão'],
            datasets: [
                {
                    label: 'IPMA',
                    data: [22.5, 65, 18, 0.5, 1015],
                    backgroundColor: 'rgba(0, 212, 255, 0.7)',
                    borderColor: '#00d4ff',
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: 'Foreca',
                    data: [23.1, 62, 20, 0.3, 1014],
                    backgroundColor: 'rgba(0, 255, 136, 0.7)',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            size: 11
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function initializeDistributionChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');

    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['IPMA', 'Foreca', 'Outros'],
            datasets: [{
                data: [580, 520, 148],
                backgroundColor: [
                    'rgba(0, 212, 255, 0.8)',
                    'rgba(0, 255, 136, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderColor: [
                    '#00d4ff',
                    '#00ff88',
                    '#a855f7'
                ],
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            size: 11
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} registos (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ================================
// Data Loading & API Integration
// ================================
async function loadInitialData() {
    // Load current observations
    await loadCurrentObservations();

    // Load historical data
    await loadHistoricalObservations();

    // Load table data
    await loadTableData();
}

async function loadCurrentObservations() {
    try {
        const response = await fetch("/data/observations?limit=50000");
        const records = await response.json();

        const observationRecords = records.filter(item =>
            item.requestId &&
            item.requestId.startsWith("OBS-")
        );

        const nearbyRecords = observationRecords.filter(item => {
            if (!item.requestedLocation) return false;

            return (
                Number(item.requestedLocation.latitude).toFixed(4) === Number(appState.selectedLocation.lat).toFixed(4)
                &&
                Number(item.requestedLocation.longitude).toFixed(4) === Number(appState.selectedLocation.lng).toFixed(4)
            );
        });

        const sortedRecords = nearbyRecords.sort((a, b) => {
            const dateA = `${a.date} ${a.time}`;
            const dateB = `${b.date} ${b.time}`;
            return dateB.localeCompare(dateA);
        });

        const latestRequestId = sortedRecords[0]?.requestId;

        const latestRecords = sortedRecords.filter(item =>
            item.requestId === latestRequestId
        );

        const ipmaRecords = latestRecords.filter(item =>
            item.source?.toLowerCase() === "ipma"
        );

        const forecaRecords = latestRecords.filter(item =>
            item.source?.toLowerCase() === "foreca"
        );

        const data = {
            ipma: mapRecordsToCurrentCard(ipmaRecords),
            foreca: mapRecordsToCurrentCard(forecaRecords)
        };

        appState.currentData = data;
        updateCurrentObservationsUI(data);

    } catch (error) {
        console.error("Erro ao carregar observações atuais da BD:", error);
        updateCurrentObservationsUI(mockCurrentData);
    }
}

function mapRecordsToCurrentCard(records) {
    function getValue(description) {
        const record = records.find(item =>
            item.variable?.description === description
        );

        return record ? record.value : null;
    }

    return {
        temperature: getValue("Air temperature") !== null ? Number(getValue("Air temperature")) : null,
        humidity: getValue("Relative humidity") !== null ? Number(getValue("Relative humidity")) : null,
        windSpeed: getValue("Wind speed") !== null ? Number(getValue("Wind speed")) : null,
        windDirection: getValue("Wind direction (cardinal)") ?? "—",
        windDirectionDegrees: getValue("Wind direction (degrees)"),
        precipitation: getValue("Precipitation") !== null ? Number(getValue("Precipitation")) : null,
        precipitationPeriod: getValue("Precipitation period"),
        pressure: getValue("Atmospheric pressure") !== null ? Number(getValue("Atmospheric pressure")) : null,
        visibility: getValue("Visibility") !== null ? Number(getValue("Visibility")) : null,
        windGust: getValue("Wind gust speed") !== null ? Number(getValue("Wind gust speed")) : null,
        cloudCover: null,
        observationTime: records[0]?.time ?? "—",
        distance: records[0]?.location?.distanceKm ?? null,
        station: records[0]?.location?.name ?? "—"
    };
}

async function loadHistoricalObservations() {
    try {
        const response = await fetch("/data/observations?limit=50000");
        const records = await response.json();

        const selectedVariable = document.getElementById("historyVariable").value || "temperature";
        const selectedRange = document.querySelector(".time-range-buttons .btn.active")?.dataset.range || "24h";

        const data = buildHistoricalChartData(records, selectedVariable, selectedRange);

        appState.historicalData = data;
        updateHistoricalCharts(data);

    } catch (error) {
        console.error("Erro ao carregar histórico da BD:", error);
    }
}
function buildHistoricalChartData(records, selectedVariable, selectedRange) {
    const variableMap = {
        temperature: "Air temperature",
        humidity: "Relative humidity",
        wind_speed: "Wind speed",
        precipitation: "Precipitation",
        pressure: "Atmospheric pressure"
    };

    const variableDescription =
        variableMap[selectedVariable] || "Air temperature";

    let filtered = records.filter(item =>
        item.requestId &&
        item.requestId.startsWith("OBS-") &&
        item.variable?.description === variableDescription
    );

    if (appState.selectedLocation?.lat && appState.selectedLocation?.lng) {
        filtered = filtered.filter(item => {
            if (!item.requestedLocation) return false;

            return (
                Number(item.requestedLocation.latitude).toFixed(4) ===
                Number(appState.selectedLocation.lat).toFixed(4)
                &&
                Number(item.requestedLocation.longitude).toFixed(4) ===
                Number(appState.selectedLocation.lng).toFixed(4)
            );
        });
    }

    filtered = filterBySelectedRange(filtered, selectedRange);

    filtered.sort((a, b) => {
        const dateA = `${a.date} ${a.time}`;
        const dateB = `${b.date} ${b.time}`;
        return dateA.localeCompare(dateB);
    });

    const grouped = {};

    filtered.forEach(item => {
        const hour = item.time.slice(0, 2);
        const key = `${item.date} ${hour}:00`;

        if (!grouped[key]) {
            grouped[key] = {
                label: formatChartLabel(item.date, `${hour}:00`, selectedRange),
                ipma: null,
                foreca: null
            };
        }

        const source = item.source?.toLowerCase();
        const value = Number(item.value);

        if (source === "ipma") {
            grouped[key].ipma = value;
        }

        if (source === "foreca") {
            grouped[key].foreca = value;
        }
    });

    const points = Object.values(grouped);

    return {
        labels: points.map(p => p.label),
        ipma: points.map(p => p.ipma),
        foreca: points.map(p => p.foreca),
        variable: selectedVariable
    };
}
function formatChartLabel(date, time, range) {
    const [year, month, day] = date.split("-");

    return `${day}/${month} ${time.slice(0, 5)}`;
}

function filterBySelectedRange(records, selectedRange) {
    if (!records.length) return [];

    const now = new Date();

    let days = 1;

    if (selectedRange === "7d") days = 7;
    if (selectedRange === "30d") days = 30;

    const minDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return records.filter(item => {
        const itemDate = new Date(`${item.date}T${item.time}`);
        return itemDate >= minDate;
    });
}

function getHistoricalUnit(variable) {
    const units = {
        temperature: " °C",
        humidity: " %",
        wind_speed: " km/h",
        precipitation: " mm",
        pressure: " hPa"
    };

    return units[variable] || "";
}

async function loadTableData() {
    try {
        const response = await fetch("/data/observations?limit=100");
        const data = await response.json();

        const mappedData = data.map(item => ({
            date: item.date,
            time: item.time,
            source: item.source,
            location: item.location?.name || "Local selecionado",
            variable: item.variable?.description || item.variable?.fieldName,
            value: item.value ?? "-",
            unit: item.variable?.unit || "",
            distance: item.location?.distanceKm ?? "-",
            latitude: item.location?.latitude ?? "-",
            longitude: item.location?.longitude ?? "-"
        }));

        appState.tableData = mappedData;
        appState.pagination.totalItems = mappedData.length;
        renderTable(mappedData);

    } catch (error) {
        console.error("Erro ao carregar tabela:", error);
        renderTable(mockTableData);
    }
}

function refreshCurrentData() {
    loadCurrentObservations();
    updateLastUpdateTime();
    loadHistoricalObservations();
}

// ================================
// UI Update Functions
// ================================
function formatValue(value, decimals = null) {
    if (value === null || value === undefined || value === "" || Number.isNaN(value)) {
        return "—";
    }

    if (typeof value === "number" && decimals !== null) {
        return value.toFixed(decimals);
    }

    return value;
}

function updateCurrentObservationsUI(data) {
    // IPMA
    document.getElementById('ipmaTemp').textContent = formatValue(data.ipma.temperature, 1);
    document.getElementById('ipmaHumidity').textContent = formatValue(data.ipma.humidity);
    document.getElementById('ipmaWindSpeed').textContent = formatValue(data.ipma.windSpeed, 1);
    document.getElementById('ipmaWindDir').textContent = formatValue(data.ipma.windDirection);
    document.getElementById('ipmaPrecip').textContent = formatValue(data.ipma.precipitation, 1);
    document.getElementById('ipmaPressure').textContent = formatValue(data.ipma.pressure, 1);
    document.getElementById('ipmaVisibility').textContent = formatValue(data.ipma.visibility);
    document.getElementById('ipmaCloudCover').textContent = formatValue(data.ipma.cloudCover);
    document.getElementById('ipmaObsTime').textContent = formatValue(data.ipma.observationTime);
    document.getElementById('ipmaCardDistance').textContent =
        data.ipma.distance !== null ? `${data.ipma.distance} km` : "—";

    document.getElementById('ipmaDistance').textContent =
        data.ipma.distance !== null ? `${data.ipma.distance} km` : "—";

    document.getElementById('ipmaStationName').textContent =
        data.ipma.station ?? "IPMA";

    // Foreca
    document.getElementById('forecaTemp').textContent = formatValue(data.foreca.temperature, 1);
    document.getElementById('forecaHumidity').textContent = formatValue(data.foreca.humidity);
    document.getElementById('forecaWindSpeed').textContent = formatValue(data.foreca.windSpeed, 1);
    document.getElementById('forecaWindDir').textContent = formatValue(data.foreca.windDirection);
    document.getElementById('forecaPrecip').textContent = formatValue(data.foreca.precipitation, 1);
    document.getElementById('forecaPressure').textContent = formatValue(data.foreca.pressure, 1);
    document.getElementById('forecaVisibility').textContent = formatValue(data.foreca.visibility);
    document.getElementById('forecaCloudCover').textContent = formatValue(data.foreca.cloudCover);
    document.getElementById('forecaObsTime').textContent = formatValue(data.foreca.observationTime);
    document.getElementById('forecaCardDistance').textContent =
        data.foreca.distance !== null ? `${data.foreca.distance} km` : "—";

    document.getElementById('forecaDistance').textContent =
        data.foreca.distance !== null ? `${data.foreca.distance} km` : "—";
    document.getElementById('forecaStationName').textContent =
        data.foreca.station ?? "Foreca";


    updateDroneReadiness(data);
    updateFireRisk(data);
    updateComparison(data);
}

function updateDroneReadiness(data) {
    function averageValues(values) {
        const valid = values.filter(v => v !== null && v !== undefined);

        if (valid.length === 0) return null;

        return valid.reduce((a, b) => a + b, 0) / valid.length;
    }

    const wind = averageValues([
        data.ipma.windSpeed,
        data.foreca.windSpeed
    ]);

    const precipitation = averageValues([
        data.ipma.precipitation,
        data.foreca.precipitation
    ]);

    const visibility = averageValues([
        data.ipma.visibility,
        data.foreca.visibility
    ]);

    const ipmaDir = data.ipma.windDirection;
    const forecaDir = data.foreca.windDirection;

    let windDirection = "—";

    if (ipmaDir && forecaDir) {
        windDirection =
            ipmaDir === forecaDir
                ? ipmaDir
                : `${ipmaDir} / ${forecaDir}`;
    } else {
        windDirection = ipmaDir || forecaDir || "—";
    }


    let score = 100;

    if (wind !== null && wind > 30) score -= 35;
    else if (wind !== null && wind > 20) score -= 20;

    if (precipitation !== null && precipitation > 1) score -= 35;
    else if (precipitation !== null && precipitation > 0) score -= 15;

    if (visibility !== null && visibility < 3) score -= 30;
    else if (visibility !== null && visibility < 5) score -= 15;

    score = Math.max(0, score);

    let label = "Operacional";
    let note = "Condições favoráveis para voo.";
    let cssClass = "safe";

    if (score < 60) {
        note = "Operação não recomendada pelas condições atuais.";
        cssClass = "danger";
    } else if (score < 80) {
        note = "Operação possível, mas com atenção às condições meteorológicas.";
        cssClass = "warning";
    }
    if (score < 60) label = "Não recomendado";
    else if (score < 80) label = "Atenção";

    document.getElementById("droneScore").textContent = `${score}%`;
    document.getElementById("droneStatusText").textContent = label;

    document.getElementById("droneWind").textContent =
        wind !== null ? `${wind.toFixed(1)} km/h` : "—";

    document.getElementById("dronePrecip").textContent =
        precipitation !== null ? `${precipitation.toFixed(1)} mm` : "—";

    document.getElementById("droneVisibility").textContent =
        visibility !== null ? `${visibility.toFixed(1)} km` : "—";

    document.getElementById("droneScore").className = `obs-value ${cssClass}`;
    document.getElementById("droneStatusText").textContent = label;

    document.getElementById("droneWindDir").textContent = windDirection;

    document.getElementById("operationalDroneText").textContent = note;

    const droneSide = document.querySelector(".drone-side");

    droneSide.classList.remove("drone-safe", "drone-warning", "drone-danger");
    droneSide.classList.add(`drone-${cssClass}`);
}

function updateFireRisk(data) {
    const temp = averageValues([data.ipma.temperature, data.foreca.temperature]);
    const humidity = averageValues([data.ipma.humidity, data.foreca.humidity]);
    const wind = averageValues([data.ipma.windSpeed, data.foreca.windSpeed]);
    const precipitation = averageValues([data.ipma.precipitation, data.foreca.precipitation]);

    const ipmaDir = data.ipma.windDirection;
    const forecaDir = data.foreca.windDirection;

    let windDirection = "—";

    if (ipmaDir && forecaDir) {
        windDirection = ipmaDir === forecaDir ? ipmaDir : `${ipmaDir} / ${forecaDir}`;
    } else {
        windDirection = ipmaDir || forecaDir || "—";
    }

    let score = 0;

    if (temp !== null && temp >= 30) score += 30;
    else if (temp !== null && temp >= 25) score += 20;

    if (humidity !== null && humidity <= 30) score += 30;
    else if (humidity !== null && humidity <= 45) score += 15;

    if (wind !== null && wind >= 25) score += 25;
    else if (wind !== null && wind >= 15) score += 15;

    if (precipitation !== null && precipitation === 0) score += 15;

    score = Math.min(100, score);

    let label = "Baixo";
    let note = "Condições atmosféricas estáveis.";
    let cssClass = "safe";

    if (score >= 75) {
        label = "Muito elevado";
        note = "Condições favoráveis à propagação de incêndios.";
        cssClass = "danger";
    } else if (score >= 50) {
        label = "Elevado";
        note = "Risco elevado devido às condições meteorológicas.";
        cssClass = "warning";
    } else if (score >= 25) {
        label = "Moderado";
        note = "Condições moderadas de risco.";
        cssClass = "warning";
    }

    document.getElementById("fireScore").textContent = `${score}%`;
    document.getElementById("fireScore").className = `obs-value ${cssClass}`;
    document.getElementById("fireStatusText").textContent = label;

    document.getElementById("fireTemp").textContent =
        temp !== null ? `${temp.toFixed(1)}°C` : "—";

    document.getElementById("fireHumidity").textContent =
        humidity !== null ? `${humidity.toFixed(0)}%` : "—";

    document.getElementById("fireWind").textContent =
        wind !== null ? `${wind.toFixed(1)} km/h` : "—";

    document.getElementById("fireWindDir").textContent = windDirection;

    document.getElementById("firePrecip").textContent =
        precipitation !== null ? `${precipitation.toFixed(1)} mm` : "—";



    document.getElementById("operationalFireText").textContent = note;
    const fireSide = document.querySelector(".fire-side");

    fireSide.classList.remove("fire-safe", "fire-warning", "fire-danger");
    fireSide.classList.add(`fire-${cssClass}`);
}

function averageValues(values) {
    const valid = values.filter(v => v !== null && v !== undefined && !Number.isNaN(v));
    if (!valid.length) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function updateComparison(data) {
    const comparisons = [
        { id: 'temp', ipma: data.ipma.temperature, foreca: data.foreca.temperature, unit: '°C' },
        { id: 'humidity', ipma: data.ipma.humidity, foreca: data.foreca.humidity, unit: '%' },
        { id: 'wind', ipma: data.ipma.windSpeed, foreca: data.foreca.windSpeed, unit: ' km/h' },
        { id: 'precip', ipma: data.ipma.precipitation, foreca: data.foreca.precipitation, unit: ' mm' },
        { id: 'pressure', ipma: data.ipma.pressure, foreca: data.foreca.pressure, unit: ' hPa' },
        { id: 'visibility', ipma: data.ipma.visibility, foreca: data.foreca.visibility, unit: ' km' }
    ];

    let agreementScore = 0;

    comparisons.forEach(comp => {
        const diff = comp.ipma - comp.foreca;
        const diffElement = document.getElementById(`${comp.id}Diff`);
        const indicatorElement = document.getElementById(`${comp.id}Indicator`);

        const formattedDiff = (diff >= 0 ? '+' : '') + diff.toFixed(1) + comp.unit;
        diffElement.textContent = formattedDiff;

        if (Math.abs(diff) < 1) {
            diffElement.className = 'comp-diff';
            indicatorElement.innerHTML = '<i class="fas fa-equals"></i>';
            indicatorElement.className = 'comp-indicator equal';
            agreementScore += 1;
        } else if (diff > 0) {
            diffElement.className = 'comp-diff positive';
            indicatorElement.innerHTML = '<i class="fas fa-arrow-up"></i>';
            indicatorElement.className = 'comp-indicator higher';
            agreementScore += 0.5;
        } else {
            diffElement.className = 'comp-diff negative';
            indicatorElement.innerHTML = '<i class="fas fa-arrow-down"></i>';
            indicatorElement.className = 'comp-indicator lower';
            agreementScore += 0.5;
        }
    });

    const agreement = Math.round((agreementScore / comparisons.length) * 100);
    document.getElementById('agreementProgress').style.width = `${agreement}%`;
    document.getElementById('agreementValue').textContent = `${agreement}%`;
}

function updateHistoricalCharts(data) {
    if (historyChart) {
        historyChart.data.labels = data.labels;
        historyChart.data.datasets[0].data = data.ipma;
        historyChart.data.datasets[1].data = data.foreca;
        historyChart.update();
    }

    // Update summary cards
    const allValues = [...data.ipma, ...data.foreca]
        .filter(v => v !== null && v !== undefined && !Number.isNaN(v));
    if (!allValues.length) {
        return;
    }
    const avg = (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(1);
    const min = Math.min(...allValues).toFixed(1);
    const max = Math.max(...allValues).toFixed(1);

    const unit = getHistoricalUnit(data.variable);

    document.getElementById('historyAvg').textContent = `${avg}${unit}`;
    document.getElementById('historyMin').textContent = `${min}${unit}`;
    document.getElementById('historyMax').textContent = `${max}${unit}`;
    document.getElementById('historyCount').textContent = allValues.length.toLocaleString();

}

function renderTable(data) {
    const tbody = document.getElementById('recordsTableBody');
    const { currentPage, itemsPerPage } = appState.pagination;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    tbody.innerHTML = pageData.map(record => `
        <tr>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td><span class="source-cell ${record.source.toLowerCase()}">${record.source}</span></td>
            <td>${record.location}</td>
            <td>${record.variable}</td>
            <td>${record.value}</td>
            <td>${record.unit}</td>
            <td>${record.distance}</td>
            <td>${record.latitude}</td>
            <td>${record.longitude}</td>
        </tr>
    `).join('');

    // Update pagination info
    document.getElementById('showingCount').textContent =
        `${startIndex + 1}-${Math.min(endIndex, data.length)}`;
    document.getElementById('totalCount').textContent = data.length.toLocaleString();

    // Update pagination buttons
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = endIndex >= data.length;

    renderPaginationButtons(data.length);
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdateTime').textContent = timeStr;
}

// ================================
// Event Listeners
// ================================
function initializeEventListeners() {
    // Filter controls

    // Time range buttons
    document.querySelectorAll('.time-range-buttons .btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-buttons .btn')
                .forEach(b => b.classList.remove('active'));

            this.classList.add('active');

            loadHistoricalObservations();
        });
    });

    document.getElementById('historyVariable').addEventListener('change', function () {
        loadHistoricalObservations();
    });

    // Table controls
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('refreshTable').addEventListener('click', loadTableData);
    document.getElementById('tableSearch').addEventListener('input', searchTable);

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
}



// ================================
// Filter Functions
// ================================
function applyFilters() {
    appState.filters = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        time: document.getElementById('timeFilter').value,
        location: document.getElementById('locationFilter').value,
        source: document.getElementById('sourceFilter').value,
        variable: document.getElementById('variableFilter').value
    };

    loadHistoricalObservations();
    loadTableData();
}

function clearFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('timeFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('sourceFilter').value = '';
    document.getElementById('variableFilter').value = '';

    appState.filters = {
        startDate: null,
        endDate: null,
        time: null,
        location: null,
        source: null,
        variable: null
    };

    loadHistoricalObservations();
    loadTableData();
}

// ================================
// Table Functions
// ================================
function searchTable(event) {
    const searchTerm = event.target.value.toLowerCase();
    const filteredData = mockTableData.filter(record =>
        Object.values(record).some(value =>
            String(value).toLowerCase().includes(searchTerm)
        )
    );

    appState.tableData = filteredData;
    appState.pagination.currentPage = 1;
    renderTable(filteredData);
}

function changePage(direction) {
    appState.pagination.currentPage += direction;
    renderTable(appState.tableData);
}

function exportToCSV() {
    const headers = ['Data', 'Hora', 'Fonte', 'Localização', 'Variável', 'Valor', 'Unidade', 'Distância km', 'Latitude', 'Longitude'];
    const rows = appState.tableData.map(record => [
        record.date,
        record.time,
        record.source,
        record.location,
        record.variable,
        record.value,
        record.unit,
        record.distance,
        record.latitude,
        record.longitude
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `observacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ================================
// Chart Update Functions
// ================================
function loadHistoricalDataByRange(range) {
    let labels, ipmaData, forecaData;

    switch (range) {
        case '24h':
            labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
            ipmaData = generateRandomData(24, 15, 28);
            forecaData = generateRandomData(24, 15, 28);
            break;
        case '7d':
            labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            ipmaData = generateRandomData(7, 15, 28);
            forecaData = generateRandomData(7, 15, 28);
            break;
        case '30d':
            labels = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
            ipmaData = generateRandomData(30, 12, 30);
            forecaData = generateRandomData(30, 12, 30);
            break;
    }

    const data = { labels, ipma: ipmaData, foreca: forecaData };
    updateHistoricalCharts(data);
}

function updateHistoricalVariable(variable) {
    // In real implementation, fetch data for the selected variable
    console.log('Loading data for variable:', variable);

    // Update chart title unit based on variable
    const units = {
        temperature: '°C',
        humidity: '%',
        wind_speed: 'km/h',
        precipitation: 'mm',
        pressure: 'hPa'
    };

    // Regenerate mock data for demonstration
    loadHistoricalDataByRange('24h');
}

// ================================
// Mock Data Generators
// ================================
function generateMockHistoricalData() {
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    return {
        labels,
        ipma: generateRandomData(24, 15, 28),
        foreca: generateRandomData(24, 15, 28)
    };
}

function generateMockTableData() {
    const locations = ['Leiria', 'Marinha Grande', 'Pombal', 'Caldas da Rainha', 'Peniche', 'Nazaré', 'Alcobaça', 'Batalha'];
    const variables = ['Temperatura', 'Humidade', 'Velocidade do Vento', 'Precipitação', 'Pressão'];
    const units = { 'Temperatura': '°C', 'Humidade': '%', 'Velocidade do Vento': 'km/h', 'Precipitação': 'mm', 'Pressão': 'hPa' };
    const sources = ['IPMA', 'Foreca'];

    const data = [];
    const today = new Date();

    for (let i = 0; i < 100; i++) {
        const date = new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const location = locations[Math.floor(Math.random() * locations.length)];
        const variable = variables[Math.floor(Math.random() * variables.length)];
        const source = sources[Math.floor(Math.random() * sources.length)];

        let value;
        switch (variable) {
            case 'Temperatura': value = (15 + Math.random() * 15).toFixed(1); break;
            case 'Humidade': value = Math.floor(40 + Math.random() * 50); break;
            case 'Velocidade do Vento': value = Math.floor(5 + Math.random() * 30); break;
            case 'Precipitação': value = (Math.random() * 5).toFixed(1); break;
            case 'Pressão': value = Math.floor(1000 + Math.random() * 30); break;
        }

        data.push({
            date: date.toLocaleDateString('pt-PT'),
            time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:00`,
            source: source,
            location: location,
            variable: variable,
            value: value,
            unit: units[variable],
            distance: (Math.random() * 10).toFixed(1),
            latitude: (39.3 + Math.random() * 0.8).toFixed(4),
            longitude: (-9.4 + Math.random() * 1.2).toFixed(4)
        });
    }

    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateRandomData(count, min, max) {
    const data = [];
    let current = (min + max) / 2;

    for (let i = 0; i < count; i++) {
        current += (Math.random() - 0.5) * 3;
        current = Math.max(min, Math.min(max, current));
        data.push(parseFloat(current.toFixed(1)));
    }

    return data;
}

// ================================
// API Helper Functions (for FastAPI integration)
// ================================
async function fetchAPI(endpoint, params = {}) {
    const url = new URL(`${API_CONFIG.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function postAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ================================
// Utility Functions
// ================================
function formatNumber(num, decimals = 1) {
    return num.toFixed(decimals);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('pt-PT');
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function safeValue(value, unit = "") {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === 0
    ) {
        return "—";
    }

    return `${value} ${unit}`.trim();
}


function renderPaginationButtons(totalItems) {
    const pageNumbers = document.getElementById("pageNumbers");

    const totalPages =
        Math.ceil(totalItems / appState.pagination.itemsPerPage);

    const currentPage = appState.pagination.currentPage;

    pageNumbers.innerHTML = "";

    function createButton(page) {
        const btn = document.createElement("button");

        btn.className =
            page === currentPage
                ? "page-btn active"
                : "page-btn";

        btn.textContent = page;

        btn.addEventListener("click", () => {
            appState.pagination.currentPage = page;
            renderTable(appState.tableData);
        });

        pageNumbers.appendChild(btn);
    }

    // primeiras páginas
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
        createButton(i);
    }

    // dots
    if (totalPages > 4) {
        const dots = document.createElement("span");
        dots.className = "page-dots";
        dots.textContent = "...";
        pageNumbers.appendChild(dots);

        createButton(totalPages);
    }
}
/**
 * WeatherSense - Marine Forecast Dashboard
 * JavaScript Module for Marine Forecast Page
 * Prepared for FastAPI integration
 */
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
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    },
    selectedVariable: 'waveHeight',
    selectedTimeRange: 24
};
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

// ================================
// Mock Data for Development
// ================================



// ================================
// Initialization
// ================================
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    initializeEventListeners();
    initializeTable();
    initializeMarineForecastTabs();
    initializeMarineHistoryChart();
    initializeMarineHistoryListeners();



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

    selectLocation(39.9300, -9.1200, "Vieira / Pedrógão ");
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
        { name: "Figueira da Foz", lat: 40.1234, lng: -9.0556 },
        { name: "Vieira / Pedrógão", lat: 39.9300, lng: -9.1200 },
        { name: "São Pedro de Moel", lat: 39.7300, lng: -9.1800 },
        { name: "Nazaré Costa", lat: 39.6000, lng: -9.2000 },
        { name: "Nazaré Desfiladeiro", lat: 39.5200, lng: -9.3500 },
        { name: "Peniche Costa", lat: 39.3000, lng: -9.4500 },
        { name: "Berlenga", lat: 39.4100, lng: -9.5200 }
    ];

    marinePoints.forEach(point => {

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div style="
                    background: #00d4ff;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.8);
                    box-shadow: 0 0 12px #00d4ff;
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
        <h4 style="margin: 0 0 8px 0; color: #00d4ff;">${point.name}</h4>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">Ponto de previsão marítima</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
            ${point.lat.toFixed(4)}°N, ${Math.abs(point.lng).toFixed(4)}°W
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

function selectLocation(lat, lng, name = null) {
    appState.selectedLocation = {
        lat: lat,
        lng: lng,
        name: name || `${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`,
        distanceToCoast: (Math.random() * 10 + 2).toFixed(1)
    };

    setText('selectedLocationName', appState.selectedLocation.name);
    setText(
        'selectedLocationCoords',
        `${Number(lat).toFixed(4)}°N, ${Math.abs(Number(lng)).toFixed(4)}°W`
    );

    if (selectedMarker) {
        map.removeLayer(selectedMarker);
    }

    const selectedIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background: #a855f7;
            width: 16px; height: 16px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 0 12px #a855f7;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    selectedMarker = L.marker([lat, lng], { icon: selectedIcon }).addTo(map);

    refreshCurrentData();
    initializeMarineTimeline();
    loadMarineHistoricalForecast();
    loadMarineRecordsData(1);
}


// ================================
// Charts Initialization
// ================================








let marineHistoryChart;

function initializeMarineHistoryChart() {
    const canvas = document.getElementById('historyChart');
    if (!canvas) return;

    marineHistoryChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'IPMA',
                    data: [],
                    borderColor: '#22d3ee',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: true
                },
                {
                    label: 'Open-Meteo',
                    data: [],
                    borderColor: '#14b8a6',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: true
                },
                {
                    label: 'WorldWeatherOnline',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(148,163,184,0.1)' }
                },
                y: {
                    ticks: { color: '#64748b' },
                    grid: { color: 'rgba(148,163,184,0.1)' }
                }
            }
        }
    });
}

async function getMarineHistoricalForecastData() {
    const { lat, lng } = appState.selectedLocation;

    const variable =
        document.getElementById('historyVariable')?.value || 'waveHeight';

    const range =
        document.querySelector('.forecast-history-range-buttons .btn.active')?.dataset.range || '24h';

    const response = await fetch(
        `/data/forecast/marine/history?lat=${Number(lat).toFixed(4)}&lon=${Number(lng).toFixed(4)}&variable=${variable}&range=${range}`
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar histórico marítimo: ${response.status}`);
    }

    return await response.json();
}

async function loadMarineHistoricalForecast() {
    try {
        const data = await getMarineHistoricalForecastData();
        updateMarineHistoricalChart(data);
    } catch (error) {
        console.error('Erro ao carregar histórico marítimo:', error);
    }
}

function roundMarineSeries(values, decimals = 2) {
    return (values || []).map(value => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return null;
        }

        return Number(Number(value).toFixed(decimals));
    });
}

function updateMarineHistoricalChart(data) {
    if (!marineHistoryChart) return;
    marineHistoryChart.data.labels = data.labels;
    marineHistoryChart.data.datasets[0].data = roundMarineSeries(data.ipma, 2);
    marineHistoryChart.data.datasets[1].data = roundMarineSeries(data.openmeteo, 2);
    marineHistoryChart.data.datasets[2].data = roundMarineSeries(data.worldweatheronline, 2);

    const unit = getMarineHistoryUnit(data.variable);

    marineHistoryChart.options.scales.y.ticks.callback = value =>
        `${formatValue(value, 2)}${unit}`;

    marineHistoryChart.options.plugins.tooltip = {
        callbacks: {
            label: context => context.raw != null
                ? `${context.dataset.label}: ${formatValue(context.raw, 2)}${unit}`
                : `${context.dataset.label}: —`
        }
    };

    marineHistoryChart.update();

    const allValues = [
        ...(data.ipma || []),
        ...(data.openmeteo || []),
        ...(data.worldweatheronline || [])
    ].filter(v => v != null && !Number.isNaN(Number(v)));

    if (!allValues.length) {
        setText('historyAvg', '—');
        setText('historyMin', '—');
        setText('historyMax', '—');
        setText('historyTotal', '0');
        return;
    }

    const numericValues = allValues.map(Number);
    const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;

    setText('historyAvg', `${avg.toFixed(2)}${unit}`);
    setText('historyMin', `${Math.min(...numericValues).toFixed(2)}${unit}`);
    setText('historyMax', `${Math.max(...numericValues).toFixed(2)}${unit}`);
    setText('historyTotal', numericValues.length.toLocaleString('pt-PT'));
}

function getMarineHistoryUnit(variable) {
    const units = {
        waveHeight: ' m',
        wavePeriod: ' s',
        waveDirection: '°',
        swellHeight: ' m',
        swellPeriod: ' s',
        swellDirection: '°',
        waterTemperature: '°C',
        seaTemperature: '°C',
        currentSpeed: ' m/s',
        currentDirection: '°'
    };

    return units[variable] || '';
}

function initializeMarineHistoryListeners() {
    document.addEventListener('click', function (e) {
        const button = e.target.closest('.forecast-history-range-buttons button');
        if (!button) return;

        const container = button.closest('.forecast-history-range-buttons');

        container.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        loadMarineHistoricalForecast();
    });

    document.getElementById('historyVariable')?.addEventListener('change', () => {
        loadMarineHistoricalForecast();
    });
}
// ================================
// Event Listeners
// ================================
function initializeEventListeners() {
    document.getElementById('tableSearch')
        ?.addEventListener('input', () => {
            loadMarineRecordsData(1);
        });

    document.getElementById('historyTableVariable')
        ?.addEventListener('change', () => {
            loadMarineRecordsData(1);
        });

    document.getElementById('exportCsv')
        ?.addEventListener('click', exportTableToCsv);
}









// ================================
// Data Loading & Updates
// ================================

async function refreshCurrentData() {
    try {

        const { lat, lng } = appState.selectedLocation;
        const response = await fetch(
            `/data/forecast/marine/current?lat=${Number(lat).toFixed(4)}&lon=${Number(lng).toFixed(4)}`
        );

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        appState.currentData = {
            ipma: mapMarineCurrent(data.ipma),
            openmeteo: mapMarineCurrent(data.openmeteo),
            wwo: mapMarineCurrent(data.worldweatheronline)
        };

        updateCurrentConditions(appState.currentData);
        updateMarineDistance();
        updateMarineOperationalAnalysis();
        updateMarineAgreement();

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
        distanceKm: sourceData.location?.distanceKm ?? null,

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
        const waveDir = data.openmeteo.waveDirection;

        document.getElementById('openmeteoWaveDir')
            .textContent = waveDir != null
                ? `${degreesToCardinal(waveDir)} (${waveDir}°)`
                : '—';
        document.getElementById('openmeteoWavePeriod').textContent = formatValue(data.openmeteo.wavePeriod);
        document.getElementById('openmeteoSwellHeight').textContent = formatValue(data.openmeteo.swellHeight);
        const swellDir = data.openmeteo.swellDirection;

        document.getElementById('openmeteoSwellDir')
            .textContent = swellDir != null
                ? `${degreesToCardinal(swellDir)} (${swellDir}°)`
                : '—';
        document.getElementById('openmeteoSwellPeriod').textContent = formatValue(data.openmeteo.swellPeriod);
        document.getElementById('openmeteoSeaTemp').textContent = formatValue(data.openmeteo.seaTemp);
        document.getElementById('openmeteoWindSpeed').textContent = formatValue(data.openmeteo.windSpeed, 0);
        document.getElementById('openmeteoWindGust').textContent = formatValue(data.openmeteo.windGust, 0);
    }

    // WorldWeatherOnline
    if (data.wwo) {
        document.getElementById('wwoCurrentTime').textContent = data.wwo.timestamp;
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

// ================================
// Table Management
// ================================
function initializeTable() {
    renderTable();
    renderPagination();
}


function renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    const pageData = appState.tableData;

    tbody.innerHTML = pageData.map(record => `
    <tr>
        <td>${record.requestDate}</td>
        <td>${record.requestTime}</td>
        <td>${record.forecastDate}</td>
        <td>${record.forecastTime}</td>
        <td>${record.source}</td>
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

    if (!pagination) return;

    const currentPage = appState.pagination.currentPage;
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    let html = '';

    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    html += `<button ${currentPage >= totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(
        appState.pagination.totalItems / appState.pagination.itemsPerPage
    );

    if (page < 1 || page > totalPages) return;

    loadMarineRecordsData(page);
}



function exportTableToCsv() {
    const headers = [
        'Data Pedido',
        'Hora Pedido',
        'Data Previsão',
        'Hora Previsão',
        'Fonte',
        'Variável',
        'Valor',
        'Unidade',
        'Latitude',
        'Longitude'
    ];

    const rows = appState.tableData.map(r =>
        [
            r.requestDate,
            r.requestTime,
            r.forecastDate,
            r.forecastTime,
            r.source,
            r.variable,
            r.value,
            r.unit,
            r.lat,
            r.lng
        ].join(',')
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



async function getMarineFutureForecastData() {
    const { lat, lng } = appState.selectedLocation;

    const response = await fetch(
        `/data/forecast/marine/timeline?lat=${Number(lat).toFixed(4)}&lon=${Number(lng).toFixed(4)}`
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
                provider: 'IPMA ',
                model: 'ECMWF + AROME',
                type: 'Diário',
                data: data.ipma || []
            });
        }

        if (currentMarineForecastProvider === 'openmeteo') {
            html = renderMarineTimelineModelRow({
                provider: 'Open-Meteo ',
                model: 'DWD EWAM',
                type: 'Horário',
                data: data.openmeteo || []
            });
        }

        if (currentMarineForecastProvider === 'worldweatheronline') {
            html = renderMarineTimelineModelRow({
                provider: 'WorldWeatherOnline',
                model: 'WWO',
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
    const typeIcon = type === 'Diário'
        ? 'fa-calendar-days'
        : 'fa-clock';

    return `
        <div class="timeline-model-summary premium-summary">
            <div class="timeline-model-main">
                <div class="timeline-model-icon">
                    <i class="fas fa-water"></i>
                </div>

                <div class="timeline-model-info">
                    <span class="timeline-model-provider">
                        <span class="provider-badge">${provider}</span>
                        <span class="model-separator">—</span>
                        <strong>${modelName}</strong>
                    </span>

                    <span class="timeline-model-name">
                        <i class="fas ${typeIcon}"></i>
                        ${type}
                    </span>
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


async function getMarineForecastRecordsPage(page = 1) {

    const { lat, lng } = appState.selectedLocation;

    const pageSize = appState.pagination.itemsPerPage;

    const search =
        document.getElementById('tableSearch')?.value.trim() || '';

    const variable =
        document.getElementById('historyTableVariable')?.value || '';



    const params = new URLSearchParams({
        lat: Number(lat).toFixed(4),
        lon: Number(lng).toFixed(4),
        page,
        page_size: pageSize,
        search,
        variable
    });



    if (search) {
        params.append('search', search);
    }


    if (variable) {
        params.append('variable', variable);
    }


    const response = await fetch(
        `/data/forecast/marine/records?${params.toString()}`
    );


    if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
    }


    return await response.json();

}

async function loadMarineRecordsData(page = 1) {
    try {
        const data = await getMarineForecastRecordsPage(page);
        appState.tableData = data.rows;
        appState.pagination.currentPage = data.page;
        appState.pagination.itemsPerPage = data.pageSize;
        appState.pagination.totalItems = data.total;

        renderTable();

    } catch (error) {
        console.error('Erro ao carregar registos marítimos:', error);

        appState.tableData = [];
        appState.pagination.totalItems = 0;

        renderTable();
    }
}

function parseMarineNumber(value) {
    if (value === null || value === undefined || value === '—') return null;

    if (typeof value === 'string' && value.includes('-')) {
        const parts = value
            .split('-')
            .map(v => Number(v.trim()))
            .filter(v => !Number.isNaN(v));

        if (!parts.length) return null;
        return parts.reduce((a, b) => a + b, 0) / parts.length;
    }

    const number = Number(value);
    return Number.isNaN(number) ? null : number;
}

function getMarineModels() {
    return [
        appState.currentData.ipma,
        appState.currentData.openmeteo,
        appState.currentData.wwo
    ].filter(Boolean);
}

function averageMarineField(models, field) {
    const values = models
        .map(model => parseMarineNumber(model[field]))
        .filter(value => value !== null);

    if (!values.length) return null;

    return values.reduce((a, b) => a + b, 0) / values.length;
}

function mostCommonMarineValue(values) {
    const valid = values.filter(v => v !== null && v !== undefined && v !== '—');

    if (!valid.length) return '—';

    const counts = {};

    valid.forEach(value => {
        counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function setOperationalClass(id, cssClass) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove('safe', 'warning', 'danger');
    el.classList.add(cssClass);
}

function updateMarineOperationalAnalysis() {
    const models = getMarineModels();

    if (!models.length) return;

    const wind = averageMarineField(models, 'windSpeed');
    const gust = averageMarineField(models, 'windGust');
    const waveHeight = averageMarineField(models, 'waveHeight');
    const wavePeriod = averageMarineField(models, 'wavePeriod');
    const swellHeight = averageMarineField(models, 'swellHeight');
    const seaTemp = averageMarineField(models, 'seaTemp');

    const direction = mostCommonMarineValue([
        ...models.map(m => m.waveDirection),
        ...models.map(m => m.swellDirection)
    ]);

    const droneScore = updateMarineDroneConditions(
        wind,
        gust,
        waveHeight,
        wavePeriod
    );


    const seaScore = updateMarineSurfaceStability(
        waveHeight,
        wavePeriod,
        swellHeight,
        seaTemp,
        direction
    );


    updateMarineStatusPanels(
        droneScore,
        seaScore
    );
}

function updateMarineDroneConditions(wind, gust, waveHeight, wavePeriod) {
    let score = 100;

    if (wind !== null) {
        if (wind > 30) score -= 35;
        else if (wind > 20) score -= 20;
        else if (wind > 15) score -= 10;
    }

    if (gust !== null) {
        if (gust > 45) score -= 35;
        else if (gust > 35) score -= 20;
        else if (gust > 25) score -= 10;
    }

    if (waveHeight !== null) {
        if (waveHeight > 2.5) score -= 30;
        else if (waveHeight > 1.5) score -= 18;
        else if (waveHeight > 1.0) score -= 8;
    }

    if (wavePeriod !== null) {
        if (wavePeriod < 4) score -= 20;
        else if (wavePeriod < 6) score -= 10;
    }

    score = Math.max(0, Math.round(score));

    let status = 'Operacional';
    let text = 'Condições favoráveis para voo costeiro com drone.';
    let cssClass = 'safe';

    if (score < 60) {
        status = 'Não recomendado';
        text = 'Operação com drone não recomendada devido às condições marítimas previstas.';
        cssClass = 'danger';
    } else if (score < 80) {
        status = 'Condicionado';
        text = 'Operação possível, mas com atenção ao vento, rajadas e ondulação.';
        cssClass = 'warning';
    }

    setText('marineDroneScore', `${score}%`);
    setText('marineDroneStatusText', status);
    setText('marineDroneWind', wind !== null ? `${wind.toFixed(1)} km/h` : '—');
    setText('marineDroneGust', gust !== null ? `${gust.toFixed(1)} km/h` : '—');
    setText('marineDroneWave', waveHeight !== null ? `${waveHeight.toFixed(1)} m` : '—');
    setText('marineDronePeriod', wavePeriod !== null ? `${wavePeriod.toFixed(1)} s` : '—');


    setOperationalClass('marineDroneScore', cssClass);

    return score;
}

function updateMarineSurfaceStability(waveHeight, wavePeriod, swellHeight, seaTemp, direction) {
    let score = 100;

    if (waveHeight !== null) {
        if (waveHeight > 2.5) score -= 35;
        else if (waveHeight > 1.5) score -= 20;
        else if (waveHeight > 1.0) score -= 10;
    }

    if (swellHeight !== null) {
        if (swellHeight > 2.5) score -= 30;
        else if (swellHeight > 1.5) score -= 18;
        else if (swellHeight > 1.0) score -= 8;
    }

    if (wavePeriod !== null) {
        if (wavePeriod < 4) score -= 20;
        else if (wavePeriod < 6) score -= 10;
    }

    score = Math.max(0, Math.round(score));

    let status = 'Estável';
    let text = 'Estado do mar favorável para operações costeiras.';
    let cssClass = 'safe';

    if (score < 60) {
        status = 'Instável';
        text = 'Estado do mar desfavorável, exigindo maior precaução nas operações.';
        cssClass = 'danger';
    } else if (score < 80) {
        status = 'Moderado';
        text = 'Estado do mar moderado, podendo impor algumas limitações operacionais.';
        cssClass = 'warning';
    }

    setText('marineSurfaceScore', `${score}%`);
    setText('marineSurfaceStatusText', status);
    setText('marineSurfaceWave', waveHeight !== null ? `${waveHeight.toFixed(1)} m` : '—');
    setText('marineSurfaceSwell', swellHeight !== null ? `${swellHeight.toFixed(1)} m` : '—');
    setText('marineSurfaceDirection', direction ?? '—');
    setText('marineSurfaceTemp', seaTemp !== null ? `${seaTemp.toFixed(1)}°C` : '—');

    setOperationalClass('marineSurfaceScore', cssClass);

    return score;
}

function updateMarineStatusPanels(droneScore, seaScore) {

    const drone = document.getElementById("marineDroneStatusSide");
    const sea = document.getElementById("marineSurfaceStatusSide");

    if (!drone || !sea) return;

    drone.className = "status-side drone-side";
    sea.className = "status-side sea-side";


    // DRONE

    if (droneScore >= 80) {

        drone.classList.add("drone-safe");

        setText(
            "marineOperationalDroneText",
            "Condições favoráveis para operações com drone em ambiente costeiro."
        );

    }
    else if (droneScore >= 50) {

        drone.classList.add("drone-warning");

        setText(
            "marineOperationalDroneText",
            "Condições moderadas, recomendando-se maior atenção ao vento e à ondulação."
        );

    }
    else {

        drone.classList.add("drone-danger");

        setText(
            "marineOperationalDroneText",
            "Condições desfavoráveis para operações com drone."
        );

    }



    // ESTADO DO MAR

    if (seaScore >= 80) {

        sea.classList.add("sea-safe");

        setText(
            "marineOperationalSurfaceText",
            "Estado do mar favorável para operações costeiras."
        );

    }
    else if (seaScore >= 50) {

        sea.classList.add("sea-warning");

        setText(
            "marineOperationalSurfaceText",
            "Estado do mar moderado, com algumas limitações operacionais."
        );

    }
    else {

        sea.classList.add("sea-danger");

        setText(
            "marineOperationalSurfaceText",
            "Estado do mar desfavorável, exigindo maior precaução nas operações."
        );

    }

}

function updateMarineAgreement() {

    const models = [
        appState.currentData.ipma,
        appState.currentData.openmeteo,
        appState.currentData.wwo
    ].filter(Boolean);


    if (!models.length) return;



    const rows = [

        {
            field: 'waveHeight',
            valueId: 'marineWaveSpread',
            indicatorId: 'marineWaveIndicator',
            unit: ' m',
            thresholds: {
                excellent: 0.1,
                good: 0.3,
                medium: 0.6,
                low: 1
            }
        },

        {
            field: 'wavePeriod',
            valueId: 'marinePeriodSpread',
            indicatorId: 'marinePeriodIndicator',
            unit: ' s',
            thresholds: {
                excellent: 0.5,
                good: 1,
                medium: 2,
                low: 3
            }
        },


        {
            field: 'swellHeight',
            valueId: 'marineSwellSpread',
            indicatorId: 'marineSwellIndicator',
            unit: ' m',
            thresholds: {
                excellent: 0.1,
                good: 0.3,
                medium: 0.5,
                low: 1
            }
        },


        {
            field: 'swellPeriod',
            valueId: 'marineSwellPeriodSpread',
            indicatorId: 'marineSwellPeriodIndicator',
            unit: ' s',
            thresholds: {
                excellent: 0.5,
                good: 1,
                medium: 2,
                low: 3
            }
        },

        {
            field: 'seaTemp',
            valueId: 'marineTempSpread',
            indicatorId: 'marineTempIndicator',
            unit: ' °C',
            thresholds: {
                excellent: 0.5,
                good: 1,
                medium: 2,
                low: 3
            }
        },


        {
            field: 'windSpeed',
            valueId: 'marineWindSpread',
            indicatorId: 'marineWindIndicator',
            unit: ' km/h',
            thresholds: {
                excellent: 3,
                good: 7,
                medium: 12,
                low: 20
            }
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


        if (score != null)
            scores.push(score);


    });



    const agreement = scores.length
        ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
        : null;



    document.getElementById(
        'marineAgreementProgress'
    ).style.width =
        agreement != null
            ? `${agreement}%`
            : '0%';



    document.getElementById(
        'marineAgreementValue'
    ).textContent =
        agreement != null
            ? `${agreement}%`
            : '—';

}

function getValidValues(models, field) {
    return models
        .map(model => parseMarineNumber(model?.[field]))
        .filter(value => value !== null);
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
    if (!valueEl || !indicatorEl) return null;

    if (spread === null) {
        valueEl.textContent = '—';
        indicatorEl.className = 'comp-indicator equal';
        indicatorEl.innerHTML = '<i class="fas fa-minus"></i>';
        return null;
    }

    valueEl.textContent = `${spread.toFixed(1)}${unit}`;

    const score = scoreFromSpread(spread, thresholds);

    if (score >= 85) {
        indicatorEl.className = 'comp-indicator higher';
        indicatorEl.innerHTML = '<i class="fas fa-check"></i>';
    }
    else if (score >= 65) {
        indicatorEl.className = 'comp-indicator equal';
        indicatorEl.innerHTML = '<i class="fas fa-minus"></i>';
    }
    else {
        indicatorEl.className = 'comp-indicator lower';
        indicatorEl.innerHTML = '<i class="fas fa-triangle-exclamation"></i>';
    }

    return score;
}

function updateMarineDistance() {

    setText(

        'ipmaCardDistance',

        appState.currentData.ipma?.distanceKm != null

            ? `${appState.currentData.ipma.distanceKm.toFixed(2)} km`

            : '—'

    );


    setText(

        'openmeteoCardDistance',

        appState.currentData.openmeteo?.distanceKm != null

            ? `${appState.currentData.openmeteo.distanceKm.toFixed(2)} km`

            : '—'

    );


    setText(

        'wwoCardDistance',

        appState.currentData.wwo?.distanceKm != null

            ? `${appState.currentData.wwo.distanceKm.toFixed(2)} km`

            : '—'

    );

}

function degreesToCardinal(degrees) {

    if (degrees == null) return '—';

    const directions = [
        'N', 'NNE', 'NE', 'ENE',
        'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW',
        'W', 'WNW', 'NW', 'NNW'
    ];

    const index = Math.round(degrees / 22.5) % 16;

    return directions[index];

}
// ============================================================================
// WeatherSense - Observações Meteorológicas
// ============================================================================
//
// Estrutura do ficheiro:
//
//  1. State
//     - Estado global da aplicação
//     - Configurações e localizações monitorizadas
//
//  2. Generic Helpers
//     - Funções auxiliares
//     - Formatação e cálculos genéricos
//
//  3. Fetch / API
//     - Comunicação com o backend FastAPI
//     - Carregamento de observações e histórico
//
//  5. Map
//     - Mapa Leaflet
//     - Pontos de observação
//     - Seleção de localizações
//
//  6. Current Observations
//     - Observações atuais
//     - Atualização dos cards IPMA e Foreca
//
//  7. Historical Observations
//     - Histórico temporal
//     - Estatísticas e métricas históricas
//
//  8. Charts
//     - Gráficos Chart.js
//     - Evolução temporal das variáveis
//
//  9. Operational Analysis
//     - Condições para Drone
//     - Risco de Incêndio
//     - Comparação IPMA vs Foreca
//
// 10. Table
//     - Registos históricos
//     - Paginação
//     - Exportação CSV
//
// 11. UI Events
//     - Eventos da interface
//     - Filtros e navegação
//
// ============================================================================

// ================================
// 1. State
// ================================
const appState = {
    selectedLocation: {
        name: 'Leiria',
        lat: 39.7436,
        lng: -8.8071,
    },
    currentData: {
        ipma: null,
        foreca: null
    },
    historicalData: {
        labels: [],
        ipma: [],
        foreca: [],
        variable: 'temperature'
    },
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    }
};

let map;
let markers = [];
let selectedMarker;
let historyChart;

const OBSERVATION_LOCATIONS = [
    { name: 'São Pedro de Moel', lat: 39.7669, lng: -9.0198 },
    { name: 'Figueira da Foz', lat: 40.1508, lng: -8.8618 },
    { name: 'Nazaré / Alcobaça', lat: 39.6010, lng: -9.0700 },
    { name: 'Peniche / Cabo Carvoeiro', lat: 39.3614, lng: -9.3878 },
    { name: 'Óbidos', lat: 39.3604, lng: -9.1572 },
    { name: 'Bidoeira de Cima', lat: 39.8426, lng: -8.7433 },
    { name: 'ESTG Leiria', lat: 39.7351, lng: -8.8212 },
    { name: 'Pinhal de Leiria', lat: 39.8225, lng: -8.9450 },
    { name: 'Pedrógão Grande', lat: 39.9194, lng: -8.1333 },
    { name: 'Ansião', lat: 39.9108, lng: -8.4342 },
    { name: 'Castanheira de Pêra', lat: 40.0027, lng: -8.2057 },
    { name: 'Caranguejeira', lat: 39.7447, lng: -8.6912 }
];

// ================================
// 2. Generic helpers
// ================================
function getEl(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = getEl(id);
    if (el) el.textContent = value;
}

function formatValue(value, decimals = null) {
    if (value === null || value === undefined || value === '' || Number.isNaN(value)) {
        return '—';
    }

    if (typeof value === 'number' && decimals !== null) {
        return value.toFixed(decimals);
    }

    return value;
}

function averageValues(values) {
    const valid = values
        .filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(Number);

    if (!valid.length) return null;

    return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function getSharedWindDirection(data) {
    const ipmaDir = data.ipma?.windDirection;
    const forecaDir = data.foreca?.windDirection;

    if (ipmaDir && forecaDir) {
        return ipmaDir === forecaDir ? ipmaDir : `${ipmaDir} / ${forecaDir}`;
    }

    return ipmaDir || forecaDir || '—';
}

function getHistoricalUnit(variable) {
    const units = {
        temperature: ' °C',
        humidity: ' %',
        wind_speed: ' km/h',
        precipitation: ' mm',
        pressure: ' hPa'
    };

    return units[variable] || '';
}

function getSummaryValue(provider, fieldName) {
    return provider?.values?.[fieldName]?.value ?? null;
}

function createEmptyCardData() {
    return {
        temperature: null,
        humidity: null,
        windSpeed: null,
        windDirection: '—',
        windDirectionDegrees: null,
        windGust: null,
        precipitation: null,
        precipitationPeriod: null,
        pressure: null,
        visibility: null,
        cloudCover: null,
        observationTime: '—',
        distance: null,
        station: '—'
    };
}

// ================================
// 3. Fetch/API
// ================================
async function getCurrentObservationRecords() {
    const { lat, lng } = appState.selectedLocation;

    const response = await fetch(
        `/data/observations/current?lat=${lat}&lon=${lng}`
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar observações atuais: ${response.status}`);
    }

    return await response.json();
}

async function getHistoricalObservationData() {
    const { lat, lng } = appState.selectedLocation;
    const variable = getEl('historyVariable')?.value || 'temperature';
    const range = document.querySelector('.time-range-buttons .btn.active')?.dataset.range || '24h';

    const response = await fetch(
        `/data/observations/history?lat=${lat}&lon=${lng}&variable=${variable}&range=${range}`
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar histórico: ${response.status}`);
    }

    return await response.json();
}

async function getTableObservationData(page = 1) {
    const { lat, lng } = appState.selectedLocation;
    const pageSize = appState.pagination.itemsPerPage;
    const search = getEl('tableSearch')?.value.trim() || '';

    const variable =
        getEl('historyTableVariable')?.value || '';

    const params = new URLSearchParams({
        lat,
        lon: lng,
        page,
        page_size: pageSize
    });

    if (search) {
        params.append('search', search);
    }

    if (variable) {
        params.append('variable', variable);
    }

    const response = await fetch(`/data/observations/records?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar tabela: ${response.status}`);
    }

    return await response.json();
}

// ================================
// 4. Initialization
// ================================
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeCharts();
    initializeEventListeners();

    setInterval(refreshCurrentData, 300000);
});

async function refreshCurrentData() {
    try {
        await Promise.all([
            loadCurrentObservations(),
            loadHistoricalObservations()
        ]);


    } catch (error) {
        console.error('Erro ao atualizar observações:', error);
    }
}

async function refreshAllData() {
    try {
        await Promise.all([
            loadCurrentObservations(),
            loadHistoricalObservations(),
            loadTableData(1)
        ]);


    } catch (error) {
        console.error('Erro ao atualizar todos os dados:', error);
    }
}



// ================================
// 5. Map
// ================================
function initializeMap() {
    const mapElement = getEl('map');
    if (!mapElement) return;

    map = L.map('map', { zoomControl: false }).setView([39.7436, -8.8071], 8);

    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Tiles © Esri' }
    ).addTo(map);

    L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Labels © Esri',
            pane: 'overlayPane'
        }
    ).addTo(map);

    addDistrictBoundary();
    addWeatherMarkers();

    map.on('click', e => {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });

    getEl('zoomIn')?.addEventListener('click', () => map.zoomIn());
    getEl('zoomOut')?.addEventListener('click', () => map.zoomOut());
    getEl('centerMap')?.addEventListener('click', () => {
        map.setView([39.7436, -8.8071], 8);
    });
    selectLocation(39.735122, -8.821217, 'ESTG Leiria');
}

function addDistrictBoundary() {
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
    OBSERVATION_LOCATIONS.forEach(station => {
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
                    <h4 style="margin: 0 0 8px 0; color: #00d4ff;">${station.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Ponto de observação</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                        ${station.lat.toFixed(4)}°N, ${Math.abs(station.lng).toFixed(4)}°W
                    </p>
                </div>
            `);

        marker.on('click', e => {
            L.DomEvent.stopPropagation(e);
            selectLocation(station.lat, station.lng, station.name);
        });

        markers.push(marker);
    });
}

async function selectLocation(lat, lng, name = null) {
    appState.selectedLocation = {
        lat,
        lng,
        name: name || `${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`,
    };

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

    updateLocationPanel();

    appState.pagination.currentPage = 1;
    await refreshAllData();
}

function updateLocationPanel() {
    const loc = appState.selectedLocation;
    setText('selectedLocationName', loc.name);
    setText('selectedLocationCoords', `${loc.lat.toFixed(4)}° N, ${Math.abs(loc.lng).toFixed(4)}° W`);

}

// ================================
// 6. Current observations
// ================================
async function loadCurrentObservations() {
    try {
        const data = await getCurrentObservationRecords();

        const currentData = {
            ipma: mapCurrentSummaryToCard(data.ipma),
            foreca: mapCurrentSummaryToCard(data.foreca)
        };

        appState.currentData = currentData;
        updateCurrentObservationsUI(currentData);

    } catch (error) {
        console.error('Erro ao carregar observações atuais:', error);

        updateCurrentObservationsUI({
            ipma: createEmptyCardData(),
            foreca: createEmptyCardData()
        });
    }
}

function mapCurrentSummaryToCard(provider) {
    return {
        temperature: getSummaryValue(provider, 'temperatureC'),
        humidity: getSummaryValue(provider, 'humidityPercent'),
        windSpeed: getSummaryValue(provider, 'windSpeedKmh'),
        windDirection: getSummaryValue(provider, 'windDirectionCardinal') ?? '—',
        windDirectionDegrees: getSummaryValue(provider, 'windDirectionDegrees'),
        windGust: getSummaryValue(provider, 'windGustKmh'),
        precipitation: getSummaryValue(provider, 'precipitationMm'),
        precipitationPeriod: getSummaryValue(provider, 'precipitationPeriod'),
        pressure: getSummaryValue(provider, 'pressureHpa'),
        visibility: getSummaryValue(provider, 'visibilityKm'),
        cloudCover: getSummaryValue(provider, 'cloudCoverPercent'),
        observationTime: provider?.time ?? '—',
        distance: provider?.distanceKm ?? null,
        station: provider?.station ?? '—'
    };
}

function updateCurrentObservationsUI(data) {
    updateObservationProviderCard('ipma', data.ipma);
    updateObservationProviderCard('foreca', data.foreca);

    updateDroneReadiness(data);
    updateFireRisk(data);
    updateComparison(data);
}

function updateObservationProviderCard(prefix, data) {
    setText(`${prefix}Temp`, formatValue(data.temperature, 1));
    setText(`${prefix}Humidity`, formatValue(data.humidity));
    setText(`${prefix}WindSpeed`, formatValue(data.windSpeed, 1));
    setText(`${prefix}WindDir`, formatValue(data.windDirection));
    setText(`${prefix}Precip`, formatValue(data.precipitation, 1));
    setText(`${prefix}Pressure`, formatValue(data.pressure, 1));
    setText(`${prefix}Visibility`, formatValue(data.visibility));
    setText(`${prefix}CloudCover`, formatValue(data.cloudCover));
    setText(`${prefix}ObsTime`, formatValue(data.observationTime));
    setText(`${prefix}CardDistance`, data.distance !== null ? `${data.distance} km` : '—');
    setText(`${prefix}StationName`, data.station ?? '—');
}

// ================================
// 7. Historical observations
// ================================
async function loadHistoricalObservations() {
    try {
        const data = await getHistoricalObservationData();

        appState.historicalData = data;
        updateHistoricalCharts(data);

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

function updateHistoricalCharts(data) {
    if (historyChart) {
        historyChart.data.labels = data.labels;
        historyChart.data.datasets[0].data = data.ipma;
        historyChart.data.datasets[1].data = data.foreca;
        historyChart.update();
    }

    const allValues = [...data.ipma, ...data.foreca]
        .filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)))
        .map(Number);

    const unit = getHistoricalUnit(data.variable);

    if (!allValues.length) {
        setText('historyAvg', '—');
        setText('historyMin', '—');
        setText('historyMax', '—');
        setText('historyCount', '0');
        return;
    }

    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;

    setText('historyAvg', `${avg.toFixed(1)}${unit}`);
    setText('historyMin', `${Math.min(...allValues).toFixed(1)}${unit}`);
    setText('historyMax', `${Math.max(...allValues).toFixed(1)}${unit}`);
    setText('historyCount', allValues.length.toLocaleString('pt-PT'));
}

// ================================
// 8. Charts
// ================================
function initializeCharts() {
    initializeHistoryChart();
}

function initializeHistoryChart() {
    const canvas = getEl('historyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const gradientIpma = ctx.createLinearGradient(0, 0, 0, 350);
    gradientIpma.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
    gradientIpma.addColorStop(1, 'rgba(0, 212, 255, 0)');

    const gradientForeca = ctx.createLinearGradient(0, 0, 0, 350);
    gradientForeca.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
    gradientForeca.addColorStop(1, 'rgba(0, 255, 136, 0)');

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'IPMA',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: gradientIpma,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00d4ff',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    spanGaps: true
                },
                {
                    label: 'Foreca',
                    data: [],
                    borderColor: '#00ff88',
                    backgroundColor: gradientForeca,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00ff88',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    spanGaps: true
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
                        label(context) {
                            const unit = getHistoricalUnit(appState.historicalData.variable);

                            if (context.parsed.y === null || context.parsed.y === undefined) {
                                return `${context.dataset.label}: —`;
                            }

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
                        callback(value) {
                            const unit = getHistoricalUnit(appState.historicalData.variable);

                            if (value === null || value === undefined || Number.isNaN(Number(value))) {
                                return '—';
                            }

                            return `${Number(value).toFixed(1)}${unit}`;
                        }
                    }
                }
            }
        }
    });
}

// ================================
// 9. Operational analysis
// ================================
function updateDroneReadiness(data) {
    const wind = averageValues([data.ipma.windSpeed, data.foreca.windSpeed]);
    const precipitation = averageValues([data.ipma.precipitation, data.foreca.precipitation]);
    const visibility = averageValues([data.ipma.visibility, data.foreca.visibility]);
    const windDirection = getSharedWindDirection(data);

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
        note = 'Operação não recomendada pelas condições atuais.';
        cssClass = 'danger';
    } else if (score < 80) {
        label = 'Atenção';
        note = 'Operação possível, mas com atenção às condições meteorológicas.';
        cssClass = 'warning';
    }

    setText('droneScore', `${score}%`);
    setText('droneStatusText', label);
    setText('droneWind', wind !== null ? `${wind.toFixed(1)} km/h` : '—');
    setText('dronePrecip', precipitation !== null ? `${precipitation.toFixed(1)} mm` : '—');
    setText('droneVisibility', visibility !== null ? `${visibility.toFixed(1)} km` : '—');
    setText('droneWindDir', windDirection);
    setText('operationalDroneText', note);

    const droneScore = getEl('droneScore');
    if (droneScore) droneScore.className = `obs-value ${cssClass}`;

    const droneSide = document.querySelector('.drone-side');
    if (droneSide) {
        droneSide.classList.remove('drone-safe', 'drone-warning', 'drone-danger');
        droneSide.classList.add(`drone-${cssClass}`);
    }
}

function updateFireRisk(data) {
    const temp = averageValues([data.ipma.temperature, data.foreca.temperature]);
    const humidity = averageValues([data.ipma.humidity, data.foreca.humidity]);
    const wind = averageValues([data.ipma.windSpeed, data.foreca.windSpeed]);
    const precipitation = averageValues([data.ipma.precipitation, data.foreca.precipitation]);
    const windDirection = getSharedWindDirection(data);

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
    let note = 'Condições atmosféricas estáveis.';
    let cssClass = 'safe';

    if (score >= 75) {
        label = 'Muito elevado';
        note = 'Condições favoráveis à propagação de incêndios.';
        cssClass = 'danger';
    } else if (score >= 50) {
        label = 'Elevado';
        note = 'Risco elevado devido às condições meteorológicas.';
        cssClass = 'warning';
    } else if (score >= 25) {
        label = 'Moderado';
        note = 'Condições moderadas de risco.';
        cssClass = 'warning';
    }

    setText('fireScore', `${score}%`);
    setText('fireStatusText', label);
    setText('fireTemp', temp !== null ? `${temp.toFixed(1)}°C` : '—');
    setText('fireHumidity', humidity !== null ? `${humidity.toFixed(0)}%` : '—');
    setText('fireWind', wind !== null ? `${wind.toFixed(1)} km/h` : '—');
    setText('fireWindDir', windDirection);
    setText('firePrecip', precipitation !== null ? `${precipitation.toFixed(1)} mm` : '—');
    setText('operationalFireText', note);

    const fireScore = getEl('fireScore');
    if (fireScore) fireScore.className = `obs-value ${cssClass}`;

    const fireSide = document.querySelector('.fire-side');
    if (fireSide) {
        fireSide.classList.remove('fire-safe', 'fire-warning', 'fire-danger');
        fireSide.classList.add(`fire-${cssClass}`);
    }
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
    let validComparisons = 0;

    comparisons.forEach(comp => {
        const diffElement = getEl(`${comp.id}Diff`);
        const indicatorElement = getEl(`${comp.id}Indicator`);

        if (!diffElement || !indicatorElement) return;

        if (
            comp.ipma === null ||
            comp.ipma === undefined ||
            comp.foreca === null ||
            comp.foreca === undefined
        ) {
            diffElement.textContent = '—';
            diffElement.className = 'comp-diff';
            indicatorElement.innerHTML = '<i class="fas fa-minus"></i>';
            indicatorElement.className = 'comp-indicator equal';
            return;
        }

        const diff = Number(comp.ipma) - Number(comp.foreca);

        if (Number.isNaN(diff)) {
            diffElement.textContent = '—';
            return;
        }

        validComparisons++;
        diffElement.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${comp.unit}`;

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

    const agreement = validComparisons
        ? Math.round((agreementScore / validComparisons) * 100)
        : 0;

    const progress = getEl('agreementProgress');
    if (progress) progress.style.width = `${agreement}%`;

    setText('agreementValue', validComparisons ? `${agreement}%` : '—');
}

// ================================
// 10. Table
// ================================
async function loadTableData(page = 1) {
    try {
        const data = await getTableObservationData(page);

        appState.tableData = data.rows;
        appState.pagination.currentPage = data.page;
        appState.pagination.itemsPerPage = data.pageSize;
        appState.pagination.totalItems = data.total;

        renderTable(data.rows);

    } catch (error) {
        console.error('Erro ao carregar tabela:', error);
        appState.tableData = [];
        appState.pagination.totalItems = 0;
        renderTable([]);
    }
}

function renderTable(data = appState.tableData) {
    const tbody = getEl('recordsTableBody');
    if (!tbody) return;

    tbody.innerHTML = data.map(record => {
        const sourceClass = String(record.source).toLowerCase();

        return `
            <tr>
                <td>${record.date}</td>
                <td>${record.time}</td>
                <td><span class="source-cell ${sourceClass}">${record.source}</span></td>
                <td>${record.location}</td>
                <td>${record.variable}</td>
                <td>${record.value}</td>
                <td>${record.unit}</td>
                <td>${record.distance}</td>
                <td>${record.latitude}</td>
                <td>${record.longitude}</td>
            </tr>
        `;
    }).join('');

    const { currentPage, itemsPerPage, totalItems } = appState.pagination;
    const startIndex = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

    setText('showingCount', `${startIndex}-${endIndex}`);
    setText('totalCount', totalItems.toLocaleString('pt-PT'));

    const prevPage = getEl('prevPage');
    const nextPage = getEl('nextPage');

    if (prevPage) prevPage.disabled = currentPage === 1;
    if (nextPage) nextPage.disabled = endIndex >= totalItems;

    renderPaginationButtons(totalItems);
}

async function searchTable() {
    appState.pagination.currentPage = 1;
    await loadTableData(1);
}

async function changePage(direction) {
    const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
    const nextPage = appState.pagination.currentPage + direction;

    if (nextPage < 1 || nextPage > totalPages) return;

    await loadTableData(nextPage);
}

function renderPaginationButtons(totalItems) {
    const pageNumbers = getEl('pageNumbers');
    if (!pageNumbers) return;

    const totalPages = Math.ceil(totalItems / appState.pagination.itemsPerPage);
    const currentPage = appState.pagination.currentPage;

    pageNumbers.innerHTML = '';

    if (totalPages <= 1) return;

    const createButton = page => {
        const btn = document.createElement('button');
        btn.className = page === currentPage ? 'page-btn active' : 'page-btn';
        btn.textContent = page;

        btn.addEventListener('click', async () => {
            await loadTableData(page);
        });

        pageNumbers.appendChild(btn);
    };

    const visiblePages = new Set([
        1,
        totalPages,
        currentPage - 1,
        currentPage,
        currentPage + 1
    ]);

    const pages = [...visiblePages]
        .filter(page => page >= 1 && page <= totalPages)
        .sort((a, b) => a - b);

    let previousPage = 0;

    pages.forEach(page => {
        if (page - previousPage > 1) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            pageNumbers.appendChild(dots);
        }

        createButton(page);
        previousPage = page;
    });
}

function exportToCSV() {
    const headers = [
        'Data',
        'Hora',
        'Fonte',
        'Localização',
        'Variável',
        'Valor',
        'Unidade',
        'Distância km',
        'Latitude',
        'Longitude'
    ];

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
        ...rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `observacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ================================
// 11. UI events
// ================================
function initializeEventListeners() {
    document.querySelectorAll('.time-range-buttons .btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.time-range-buttons .btn')
                .forEach(button => button.classList.remove('active'));

            this.classList.add('active');
            loadHistoricalObservations();
        });
    });

    getEl('historyVariable')?.addEventListener('change', loadHistoricalObservations);
    getEl('exportCSV')?.addEventListener('click', exportToCSV);
    getEl('tableSearch')?.addEventListener('input', searchTable);
    getEl('prevPage')?.addEventListener('click', () => changePage(-1));
    getEl('nextPage')?.addEventListener('click', () => changePage(1));
    getEl('historyTableVariable')
        ?.addEventListener('change', () => {

            appState.pagination.currentPage = 1;

            loadTableData(1);

        });
}
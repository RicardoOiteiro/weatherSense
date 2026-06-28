// ============================================================================
// WeatherSense - Previsão Terrestre
// ============================================================================
//
// Estrutura do ficheiro:
//
//  1. State
//     - Estado global da aplicação
//     - Configurações e constantes
//
//  2. Utilities
//     - Funções auxiliares
//     - Formatação e cálculos genéricos
//
//  3. Data Mapping
//     - Normalização dos dados recebidos das APIs
//
//  4. API Services
//     - Comunicação com o backend FastAPI
//
//  5. Application Initialization
//     - Inicialização da aplicação
//
//  6. Map Management
//     - Gestão do mapa Leaflet
//     - Seleção de localizações
//
//  7. Current Forecast Management
//     - Previsões atuais
//     - Atualização dos cards dos modelos
//
//  8. Timeline Forecast
//     - Previsões futuras
//     - Timeline temporal dos modelos
//
//  9. Forecast Agreement Analysis
//     - Concordância entre modelos
//     - Cálculo de spreads
//
// 10. Operational Analysis
//     - Condições para drone
//     - Risco de incêndio
//
// 11. Historical Forecast Analysis
//     - Histórico de previsões
//     - Gráficos e estatísticas
//
// 12. Records Table
//     - Tabela de registos
//     - Paginação e exportação CSV
//
// 13. Event Listeners
//     - Eventos da interface
//
// 14. UI Updates
//     - Atualizações visuais
//     - Refresh da interface
//
// ============================================================================
// ================================
// 1. State
// =================================
const appState = {
    selectedLocation: {
        name: 'Leiria',
        lat: 39.7436,
        lng: -8.8071,
    },
    currentData: {
        icon: null,
        ecmwf: null,
        arpege: null,
        ipma: null,
        openweather: null
    },
    tableData: [],
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0
    }
};

const MODEL_COLORS = {
    icon: '#00d4ff',
    ecmwf: '#22d3ee',
    arpege: '#06b6d4',
    ipma: '#00ff88',
    openweather: '#a855f7'
};


// ================================
// 2. Utilities
// ================================

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function degreesToCardinal(deg) {
    if (deg === null || deg === undefined) return '—';

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

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ================================
// 3. Data Mapping
// ================================


let currentForecastProvider = 'openmeteo';


function mapCurrentForecast(data) {

    const values = data.values || {};

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

    return {
        temperature: getValue('temperatureC'),
        minTemp: getValue('temperatureMinC'),
        maxTemp: getValue('temperatureMaxC'),
        feelsLike: getValue('feelsLikeTemperatureC'),
        humidity: getValue('humidityPercent'),
        pressure: getValue('pressureHpa'),
        cloudCover: getValue('cloudCoverPercent'),
        visibility: getValue('visibilityKm'),
        windSpeed: getValue('windSpeedKmh'),
        windSpeedMax: getValue('windSpeedMaxKmh'),
        windGust: getValue('windGustKmh'),
        windDirectionDegrees: getValue('windDirectionDegrees'),
        windDirectionCardinal: values.windDirectionCardinal?.value ?? null,
        precipitation: getValue('precipitationMm'),
        precipitationProbability: getValue('precipitationProbabilityPercent'),
        sunrise: values.sunriseH?.value ?? null,
        sunset: values.sunsetH?.value ?? null,
        forecastTime: data.time ?? '—',
        forecastDate: data.date ?? '—',
        model: data.model ?? '—',
        distanceKm: data.distanceKm ?? null,
    };
}


// ================================
// 4. API Services
// ================================

async function getCurrentForecastRecords() {
    const { lat, lng } = appState.selectedLocation;

    const response = await fetch(
        `/data/forecast/terrestrial/current?lat=${lat}&lon=${lng}`
    );

    if (!response.ok) {
        throw new Error('Erro ao carregar previsões atuais');
    }

    return response.json();
}

async function getForecastTimelineData() {
    const { lat, lng } = appState.selectedLocation;

    const response = await fetch(
        `/data/forecast/terrestrial/timeline?lat=${lat}&lon=${lng}&provider=${currentForecastProvider}&hours=24`
    );

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar timeline: ${response.status}`);
    }

    return await response.json();
}

async function getForecastRecordsPage(page = 1) {
    const { lat, lng } = appState.selectedLocation;
    const pageSize = appState.pagination.itemsPerPage;
    const search = document.getElementById('tableSearch')?.value.trim() || '';
    const variable =
        document.getElementById('forecastTableVariable')?.value || '';

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

    const response = await fetch(`/data/forecast/terrestrial/records?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`Erro HTTP ao carregar registos: ${response.status}`);
    }

    return await response.json();
}

async function getHistoricalForecastData() {

    const { lat, lng } = appState.selectedLocation;

    const variable =
        document.getElementById('forecastHistoryVariable')?.value
        || 'temperature';

    const range =
        document.querySelector(
            '.forecast-history-range-buttons .btn.active'
        )?.dataset.range || '24h';

    const response = await fetch(
        `/data/forecast/terrestrial/history?lat=${lat}&lon=${lng}&variable=${variable}&range=${range}`
    );

    if (!response.ok) {
        throw new Error(
            `Erro HTTP ao carregar histórico previsão: ${response.status}`
        );
    }

    return await response.json();
}


// ================================
// 5. Application Initialization
// ================================

document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    initializeEventListeners();

    initializeTable();

    initializeForecastTabs();
    initializeForecastHistoryChart();
    initializeForecastHistoryListeners();
    //refreshAfterLocationChange();


});

// ================================
// 6. Map Management
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

    addDistrictBoundary();
    addForecastMarkers();

    map.on('click', function (e) {
        selectLocation(e.latlng.lat, e.latlng.lng);
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => map.zoomIn());
    document.getElementById('zoomOut')?.addEventListener('click', () => map.zoomOut());
    document.getElementById('centerMap')?.addEventListener('click', () => {
        map.setView([39.7436, -8.8071], 8);
    });

    selectLocation(39.735122, -8.821217, 'ESTG Leiria');
}

function addDistrictBoundary() {
    const leiriaBoundary = [
        [40.0736, -8.4771], [40.0236, -8.7271], [39.9236, -8.9271],
        [39.7736, -9.0271], [39.5236, -9.1271], [39.3736, -9.0771],
        [39.3736, -8.8271], [39.4236, -8.5771], [39.5736, -8.4271],
        [39.7736, -8.3771], [39.9236, -8.3771], [40.0736, -8.4771]
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

    forecastPoints.forEach(point => {
        const color = '#00d4ff';

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: ${color};
                width: 16px; height: 16px;
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
                    <h4 style="margin: 0 0 8px 0; color: #00d4ff;">${point.name}</h4>
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Ponto de observação</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">
                        ${point.lat.toFixed(4)}°N, ${Math.abs(point.lng).toFixed(4)}°W
                    </p>
                </div>
            `);

        marker.on('click', () => selectLocation(point.lat, point.lng, point.name));
        markers.push(marker);
    });
}

function selectLocation(lat, lng, name = null) {
    appState.selectedLocation = {
        lat,
        lng,
        name: name || `${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`,
    };

    if (selectedMarker) map.removeLayer(selectedMarker);

    const selectedIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
            background: #a855f7;
            width: 20px; height: 20px;
            border-radius: 50%;
            border: 3px solid rgba(255,255,255,0.9);
            box-shadow: 0 0 16px #a855f7;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    selectedMarker = L.marker([lat, lng], { icon: selectedIcon }).addTo(map);

    updateLocationPanel();
    refreshAfterLocationChange();
}

function updateLocationPanel() {
    const loc = appState.selectedLocation;
    setText('selectedLocationName', loc.name);
    document.getElementById('selectedLocationCoords').textContent =
        `${loc.lat.toFixed(4)}° N, ${Math.abs(loc.lng).toFixed(4)}° W`;
}


// ================================
// 7. Current Forecast Management
// ================================

async function fetchCurrentForecast() {
    try {

        const data = await getCurrentForecastRecords();

        const currentData = {
            icon: data.openmeteo?.icon
                ? mapCurrentForecast(data.openmeteo.icon)
                : null,

            ecmwf: data.openmeteo?.ecmwf
                ? mapCurrentForecast(data.openmeteo.ecmwf)
                : null,

            arpege: data.openmeteo?.arpege
                ? mapCurrentForecast(data.openmeteo.arpege)
                : null,

            ipma: data.ipma
                ? mapCurrentForecast(data.ipma)
                : null,

            openweather: data.openweather
                ? mapCurrentForecast(data.openweather)
                : null
        };

        appState.currentData = currentData;
        updateForecastDistance();

        if (currentData.openweather) {
            updateOpenWeatherCard(currentData.openweather);
        }

        if (currentData.ipma) {
            updateIpmaCard(currentData.ipma);
        }

        if (currentData.icon) {
            updateOpenMeteoCard('icon', currentData.icon);
        }

        if (currentData.ecmwf) {
            updateOpenMeteoCard('ecmwf', currentData.ecmwf);
        }

        if (currentData.arpege) {
            updateOpenMeteoCard('arpege', currentData.arpege);
        }

        updateForecastAgreement();
        updateForecastOperational();

    } catch (error) {

        console.error(
            'Erro previsão terrestre:',
            error
        );
    }
}

function updateOpenWeatherCard(data) {
    setText('owTemp', data.temperature != null ? `${data.temperature.toFixed(1)}°C` : '—');
    setText('owMinTemp', data.minTemp != null ? `${data.minTemp.toFixed(1)}°C` : '—');
    setText('owMaxTemp', data.maxTemp != null ? `${data.maxTemp.toFixed(1)}°C` : '—');
    setText('owHumidity', data.humidity != null ? `${data.humidity}%` : '—');
    setText('owPressure', data.pressure != null ? `${data.pressure} hPa` : '—');
    setText('owCloud', data.cloudCover != null ? `${data.cloudCover}%` : '—');
    setText('owVisibility', data.visibility != null ? `${data.visibility} km` : '—');
    setText('owWind', data.windSpeed != null ? `${data.windSpeed.toFixed(1)} km/h` : '—');
    setText('owGust', data.windGust != null ? `${data.windGust.toFixed(1)} km/h` : '—');
    setText('owWindDir', data.windDirectionDegrees != null
        ? `${Math.round(data.windDirectionDegrees)}° ${degreesToCardinal(data.windDirectionDegrees)}`
        : '—'
    );
    setText('owPrecip', data.precipitation != null ? `${data.precipitation}%` : '—');
    setText(
        'openweatherForecastTime',
        data.forecastTime
            ? data.forecastTime.substring(0, 5)
            : '—'
    );
}

function updateIpmaCard(data) {
    setText('ipmaTemp', data.temperature != null ? `${data.temperature.toFixed(1)}°C` : '—');
    setText('ipmaTempMin', data.minTemp != null ? `${Number(data.minTemp).toFixed(1)}°C` : '—');
    setText('ipmaTempMax', data.maxTemp != null ? `${Number(data.maxTemp).toFixed(1)}°C` : '—');
    setText('ipmaFeelsLike', data.feelsLike != null ? `${data.feelsLike.toFixed(1)}°C` : '—');
    setText('ipmaHumidity', data.humidity != null ? `${data.humidity.toFixed(1)}%` : '—');
    setText('ipmaWind', data.windSpeed != null ? `${data.windSpeed.toFixed(1)} km/h` : '—');
    setText('ipmaWindDir', data.windDirectionCardinal ?? '—');
    setText('ipmaPrecip', data.precipitation != null && Number(data.precipitation) !== -99
        ? `${data.precipitation}%`
        : '—'
    );
    setText(
        'ipmaForecastTime',
        data.forecastTime
            ? data.forecastTime.substring(0, 5)
            : '—'
    );
}

function updateOpenMeteoCard(modelKey, data) {
    const prefix = { icon: 'icon', ecmwf: 'ecmwf', arpege: 'arpege' }[modelKey];

    setText(`${prefix}Temp`, data.temperature != null ? `${data.temperature.toFixed(1)}°C` : '—');
    setText(`${prefix}MinMax`,
        data.minTemp != null && data.maxTemp != null
            ? `${data.minTemp.toFixed(1)}°C / ${data.maxTemp.toFixed(1)}°C`
            : '— / —'
    );
    setText(`${prefix}Humidity`, data.humidity != null ? `${data.humidity}%` : '—');
    setText(`${prefix}Pressure`, data.pressure != null ? `${data.pressure} hPa` : '—');
    setText(`${prefix}Cloud`, data.cloudCover != null ? `${data.cloudCover}%` : '—');
    setText(`${prefix}Visibility`, data.visibility != null ? `${data.visibility.toFixed(2)} km` : '—');
    setText(`${prefix}Wind`, data.windSpeed != null ? `${data.windSpeed.toFixed(1)} km/h` : '—');
    setText(`${prefix}Gust`, data.windGust != null ? `${data.windGust.toFixed(1)} km/h` : '—');
    setText(`${prefix}WindDir`, data.windDirectionDegrees != null
        ? `${Math.round(data.windDirectionDegrees)}° ${degreesToCardinal(data.windDirectionDegrees)}`
        : '—'
    );
    setText(`${prefix}Precip`, data.precipitation != null ? `${data.precipitation} mm` : '—');
    setText(`${prefix}Sunrise`, data.sunrise ?? '—');
    setText(`${prefix}Sunset`, data.sunset ?? '—');

    if (modelKey === 'icon') {
        setText('openmeteoForecastTime', data.forecastTime !== '—'
            ? `${data.forecastTime.slice(0, 5)}`
            : '—'
        );
    }
}


// ================================
// 8. Timeline Forecast
// ================================
function initializeForecastTabs() {
    document.querySelectorAll('.forecast-model-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.forecast-model-tab').forEach(t => t.classList.remove('active'));
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
        const data = await getForecastTimelineData();
        const models = data.models || {};

        let html = '';

        if (currentForecastProvider === 'openmeteo') {
            html = ['ICON', 'ECMWF', 'ARPEGE']
                .map(modelName => {
                    const timelineData = models[modelName] || [];

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
            const timelineData = models['ECMWF + AROME'] || [];

            html = renderTimelineModelRow({
                provider: 'IPMA',
                model: 'ECMWF + AROME',
                frequency: '1H',
                data: timelineData
            });
        }

        if (currentForecastProvider === 'openweather') {
            const timelineData = models.OWM || [];

            html = renderTimelineModelRow({
                provider: 'OpenWeather',
                model: 'OW',
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
    document.querySelectorAll('.timeline-arrow').forEach(button => {
        button.addEventListener('click', () => {
            const model = button.dataset.model;
            const timeline = document.getElementById(`timeline-${model}`);
            if (!timeline) return;

            const direction = button.classList.contains('next') ? 1 : -1;
            timeline.scrollBy({ left: direction * 600, behavior: 'smooth' });
        });
    });
}

function renderTimelineModelRow(modelData) {
    return `
        <div class="timeline-model-row">
            <div class="timeline-model-left">
                ${renderTimelineModelSummary(modelData.data, modelData.model, modelData.provider)}
                <div class="timeline-model-controls">
                    <button class="timeline-arrow prev" data-model="${modelData.model}">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="timeline-arrow next" data-model="${modelData.model}">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="timeline-model-hours" id="timeline-${modelData.model}">
                ${renderTimelineBlocks(modelData.data, modelData.provider)}
            </div>
        </div>
    `;
}

function renderTimelineModelSummary(forecastData, modelName = 'ICON', provider = 'Open-Meteo') {
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
                        ${provider} - <strong>${modelName}</strong>
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
                                    ${day.minTemp != null ? `${Number(day.minTemp).toFixed(1)}°C` : '—'}
                                </strong>
                            </div>
                            <div>
                                <span>MÁX</span>
                                <strong class="temp-max">
                                    ${day.maxTemp != null ? `${Number(day.maxTemp).toFixed(1)}°C` : '—'}
                                </strong>
                            </div>
                        </div>
                        <div class="timeline-day-sun premium-sun">
                            <span><i class="fas fa-sun"></i> ${day.sunrise ?? '—'}</span>
                            <span><i class="fas fa-moon"></i> ${day.sunset ?? '—'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderTimelineBlocks(forecastData, provider = '') {
    const isIpma = provider === 'IPMA';

    return forecastData.map((forecast, index) => `
        <div class="timeline-block ${index === 0 ? 'current' : ''}">
            <div class="timeline-datetime">
                <span class="timeline-date">${forecast.date}</span>
                <span class="timeline-hour">${forecast.time}</span>
            </div>
            <i class="fas ${forecast.icon} timeline-icon"></i>
            <span class="timeline-temp">
                ${forecast.temperature != null ? `${forecast.temperature.toFixed(1)}°C` : '—'}
            </span>
            <div class="timeline-details">
                <span><i class="fas fa-droplet"></i> ${forecast.humidity != null ? `${forecast.humidity}%` : '—'}</span>
                ${!isIpma ? `
                    <span><i class="fas fa-gauge"></i> ${forecast.pressure != null ? `${forecast.pressure.toFixed(1)} hPa` : '—'}</span>
                    <span><i class="fas fa-cloud"></i> ${forecast.cloudCover != null ? `${forecast.cloudCover}%` : '—'}</span>
                ` : ''}
                <span><i class="fas fa-wind"></i> ${forecast.windSpeed != null ? `${forecast.windSpeed.toFixed(1)} km/h` : '—'}</span>
                ${!isIpma ? `
                    <span><i class="fas fa-burst"></i> ${forecast.windGust != null ? `${forecast.windGust.toFixed(1)} km/h` : '—'}</span>
                ` : ''}
                <span><i class="fas fa-location-arrow"></i> ${forecast.windDirection ?? '—'}</span>
                <span>
                    <i class="fas fa-cloud-rain"></i>
                    ${forecast.precipitation != null
            ? `${forecast.precipitation} mm`
            : forecast.precipitationProbability != null
                ? `${forecast.precipitationProbability}%`
                : '—'
        }
                </span>
            </div>
        </div>
    `).join('');
}

function formatTimelineShortDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'short'
    });
}


// ================================
// 9. Forecast Agreement Analysis
// ================================

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
        { field: 'temperature', valueId: 'forecastTempSpread', indicatorId: 'forecastTempIndicator', unit: '°C', thresholds: { excellent: 1, good: 2, medium: 4, low: 6 } },
        { field: 'humidity', valueId: 'forecastHumiditySpread', indicatorId: 'forecastHumidityIndicator', unit: '%', thresholds: { excellent: 5, good: 10, medium: 20, low: 30 } },
        { field: 'windSpeed', valueId: 'forecastWindSpread', indicatorId: 'forecastWindIndicator', unit: ' km/h', thresholds: { excellent: 3, good: 7, medium: 12, low: 20 } },
        { field: 'precipitation', valueId: 'forecastPrecipSpread', indicatorId: 'forecastPrecipIndicator', unit: '', thresholds: { excellent: 0.5, good: 2, medium: 5, low: 10 } },
        { field: 'pressure', valueId: 'forecastPressureSpread', indicatorId: 'forecastPressureIndicator', unit: ' hPa', thresholds: { excellent: 1, good: 3, medium: 6, low: 10 } },
        { field: 'visibility', valueId: 'forecastVisibilitySpread', indicatorId: 'forecastVisibilityIndicator', unit: ' km', thresholds: { excellent: 2, good: 5, medium: 10, low: 20 } }
    ];

    const scores = [];

    rows.forEach(row => {
        const values = getValidValues(models, row.field);
        const spread = calculateSpread(values);
        const score = updateSpreadRow(row.valueId, row.indicatorId, spread, row.unit, row.thresholds);
        if (score != null) scores.push(score);
    });

    const agreement = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    const progress = document.getElementById('forecastAgreementProgress');
    const value = document.getElementById('forecastAgreementValue');

    if (progress && value) {
        progress.style.width = agreement != null ? `${agreement}%` : '0%';
        value.textContent = agreement != null ? `${agreement}%` : '—';
    }
}

// ================================
// 10. Operational Analysis
// ================================

function getForecastModels() {
    return [
        appState.currentData.icon,
        appState.currentData.ecmwf,
        appState.currentData.arpege,
        appState.currentData.ipma,
        appState.currentData.openweather
    ].filter(Boolean);
}

function getWindDirection(models) {
    return mostCommonValue(
        models.map(m => {
            if (m.windDirectionCardinal) return m.windDirectionCardinal;
            if (m.windDirectionDegrees != null) return degreesToCardinal(m.windDirectionDegrees);
            return null;
        })
    );
}

function updateForecastDroneReadiness() {
    const models = getForecastModels();
    if (!models.length) return;

    const wind = averageValues(models.map(m => m.windSpeed));
    const precipitation = averageValues(models.map(m => m.precipitation));
    const visibility = averageValues(models.map(m => m.visibility));
    const windDirection = getWindDirection(models);

    let score = 100;
    if (wind != null && wind > 30) score -= 35;
    else if (wind != null && wind > 20) score -= 20;
    if (precipitation != null && precipitation > 1) score -= 35;
    else if (precipitation != null && precipitation > 0) score -= 15;
    if (visibility != null && visibility < 3) score -= 30;
    else if (visibility != null && visibility < 5) score -= 15;
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
    setText('droneWind', wind != null ? `${wind.toFixed(1)} km/h` : '—');
    setText('dronePrecip', precipitation != null ? `${precipitation.toFixed(1)} mm` : '—');
    setText('droneVisibility', visibility != null ? `${visibility.toFixed(1)} km` : '—');
    setText('droneWindDir', windDirection);
    setText('operationalDroneText', note);

    const droneScore = document.getElementById('droneScore');
    if (droneScore) droneScore.className = `obs-value ${cssClass}`;

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
    const windDirection = getWindDirection(models);

    let score = 0;
    if (temp != null && temp >= 30) score += 30;
    else if (temp != null && temp >= 25) score += 20;
    if (humidity != null && humidity <= 30) score += 30;
    else if (humidity != null && humidity <= 45) score += 15;
    if (wind != null && wind >= 25) score += 25;
    else if (wind != null && wind >= 15) score += 15;
    if (precipitation != null && precipitation === 0) score += 15;
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
    setText('fireTemp', temp != null ? `${temp.toFixed(1)}°C` : '—');
    setText('fireHumidity', humidity != null ? `${humidity.toFixed(0)}%` : '—');
    setText('fireWind', wind != null ? `${wind.toFixed(1)} km/h` : '—');
    setText('fireWindDir', windDirection);
    setText('firePrecip', precipitation != null ? `${precipitation.toFixed(1)} mm` : '—');
    setText('operationalFireText', note);

    const fireScore = document.getElementById('fireScore');
    if (fireScore) fireScore.className = `obs-value ${cssClass}`;

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


// ================================
// 11. Historical Forecast Analysis
// ===============================
// 

let forecastHistoryChart;

function initializeForecastHistoryChart() {
    const canvas = document.getElementById('forecastHistoryChart');
    if (!canvas) return;

    forecastHistoryChart = new Chart(canvas.getContext('2d'), {
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

async function loadHistoricalForecast() {

    try {

        const data = await getHistoricalForecastData();

        appState.historicalData = data;

        updateHistoricalForecastChart(data);

    } catch (error) {

        console.error(
            'Erro ao carregar histórico previsão:',
            error
        );
    }
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

    forecastHistoryChart.options.scales.y.ticks.callback = value => `${value}${unit}`;
    forecastHistoryChart.options.plugins.tooltip = {
        ...forecastHistoryChart.options.plugins.tooltip,
        callbacks: {
            label: context => context.raw != null
                ? `${context.dataset.label}: ${context.raw}${unit}`
                : `${context.dataset.label}: —`
        }
    };

    forecastHistoryChart.update();

    const allValues = [
        ...data.icon, ...data.ecmwf, ...data.arpege, ...data.ipma, ...data.openweather
    ].filter(v => v != null && !Number.isNaN(v));

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
    const container = document.querySelector('.forecast-history-range-buttons');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        loadHistoricalForecast();
    });

    document
        .getElementById('forecastHistoryVariable')
        ?.addEventListener('change', () => {
            loadHistoricalForecast();
        });
}

// ================================
// 12. Records Table
// ================================

async function loadRecordsData(page = 1) {
    try {
        const data = await getForecastRecordsPage(page);

        appState.tableData = data.rows;
        appState.pagination.currentPage = data.page;
        appState.pagination.itemsPerPage = data.pageSize;
        appState.pagination.totalItems = data.total;

        renderTable();

    } catch (error) {
        console.error('Erro ao carregar registos:', error);
        appState.tableData = [];
        appState.pagination.totalItems = 0;
        renderTable();
    }
}

function initializeTable() {
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;

    const pageData = appState.tableData;

    tbody.innerHTML = pageData.map(row => {
        const sourceClass = row.source
            .toLowerCase()
            .replaceAll(' ', '')
            .replaceAll('·', '')
            .replaceAll('+', '')
            .replaceAll('-', '');

        return `
    <tr>
        <td>${row.requestDate}</td>
        <td>${row.requestTime}</td>
        <td>${row.forecastDate}</td>
        <td>${row.forecastTime}</td>
        <td><span class="source-badge ${sourceClass}">${row.source}</span></td>
        <td>${row.variable}</td>
        <td>${row.value}</td>
        <td>${row.unit}</td>
        <td>${row.lat}</td>
        <td>${row.lng}</td>
    </tr>
`;
    }).join('');

    const { currentPage, itemsPerPage, totalItems } = appState.pagination;

    const start = totalItems
        ? (currentPage - 1) * itemsPerPage + 1
        : 0;

    const end = Math.min(currentPage * itemsPerPage, totalItems);

    setText(
        'paginationInfo',
        `Mostrando ${start}-${end} de ${totalItems} registos`
    );

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = end >= totalItems;

    renderPagination();
}
function renderPagination() {
    const totalPages = Math.ceil(appState.pagination.totalItems / appState.pagination.itemsPerPage);
    const currentPage = appState.pagination.currentPage;
    const pageNumbers = document.getElementById('pageNumbers');

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    let html = '';
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    pageNumbers.innerHTML = html;
}

function goToPage(page) {
    loadRecordsData(page);
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


window.goToPage = goToPage;

// ================================
// 13. Event Listeners
// ================================

function initializeEventListeners() {


    document.getElementById('prevPage')?.addEventListener('click', function () {
        if (appState.pagination.currentPage > 1) {
            loadRecordsData(appState.pagination.currentPage - 1);
        }
    });

    document.getElementById('nextPage')?.addEventListener('click', function () {
        const totalPages = Math.ceil(
            appState.pagination.totalItems / appState.pagination.itemsPerPage
        );

        if (appState.pagination.currentPage < totalPages) {
            loadRecordsData(appState.pagination.currentPage + 1);
        }
    });
    document.getElementById('tableSearch')?.addEventListener('input', function () {
        loadRecordsData(1);
    });
    document.getElementById('exportCsv')?.addEventListener('click', exportToCsv);
    document.getElementById('forecastTableVariable')
        ?.addEventListener('change', function () {
            loadRecordsData(1);
        });
}

// ================================
// 14. UI Updates
// ================================


async function refreshAfterLocationChange() {

    await Promise.all([
        fetchCurrentForecast(),
        initializeTimeline(),
        loadHistoricalForecast(),
        loadRecordsData(1)
    ]);
}

function updateForecastDistance() {
    setText(
        'iconCardDistance',
        appState.currentData.icon?.distanceKm != null
            ? `${appState.currentData.icon.distanceKm.toFixed(2)} km`
            : '—'
    );

    setText(
        'ecmwfCardDistance',
        appState.currentData.ecmwf?.distanceKm != null
            ? `${appState.currentData.ecmwf.distanceKm.toFixed(2)} km`
            : '—'
    );

    setText(
        'arpegeCardDistance',
        appState.currentData.arpege?.distanceKm != null
            ? `${appState.currentData.arpege.distanceKm.toFixed(2)} km`
            : '—'
    );

    setText(
        'ipmaCardDistance',
        appState.currentData.ipma?.distanceKm != null
            ? `${appState.currentData.ipma.distanceKm.toFixed(2)} km`
            : '—'
    );

    setText(
        'openweatherCardDistance',
        appState.currentData.openweather?.distanceKm != null
            ? `${appState.currentData.openweather.distanceKm.toFixed(2)} km`
            : '—'
    );
}

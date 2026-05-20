const map = criarMapa('map');

let marker = null;
let selectedLat = null;
let selectedLon = null;
let selectedPoint = null;

const pontosObservacao = [
    { name: "São Pedro de Moel", lat: 39.766853, lon: -9.019775 },
    { name: "Figueira da Foz", lat: 40.1508, lon: -8.8618 },
    { name: "Nazaré / Alcobaça", lat: 39.601, lon: -9.07 },
    { name: "Peniche / Cabo Carvoeiro", lat: 39.361378, lon: -9.387817 },
    { name: "Óbidos", lat: 39.360421, lon: -9.157214 },
    { name: "Bidoeira de Cima", lat: 39.842572, lon: -8.743315 },
    { name: "ESTG Leiria", lat: 39.735122, lon: -8.821217 },
    { name: "Pinhal de Leiria", lat: 39.8225, lon: -8.9450 },
    { name: "Pedrógão Grande", lat: 39.919392, lon: -8.133316 },
    { name: "Ansião", lat: 39.910834, lon: -8.434238 },
    { name: "Castanheira de Pêra", lat: 40.002723, lon: -8.205671 },
    {
        name: "Caranguejeira",
        lat: 39.744706,
        lon: -8.691161
    }
];

carregarDistritoLeiria(map)
    .then(() => {
        adicionarPontosTerrestres();
    })
    .catch(error => {
        document.getElementById('historico').innerHTML =
            'Erro ao carregar o mapa do distrito de Leiria: ' + error;
    });

function adicionarPontosTerrestres() {
    pontosObservacao.forEach(ponto => {
        const obsMarker = L.circleMarker([ponto.lat, ponto.lon], {
            radius: 8,
            fillOpacity: 0.9,
            weight: 2
        }).addTo(map);

        obsMarker.bindPopup(`
            <strong>${ponto.name}</strong><br>
            Latitude: ${ponto.lat}<br>
            Longitude: ${ponto.lon}
        `);

        obsMarker.on('click', async function () {
            selectedPoint = ponto;
            selectedLat = Number(ponto.lat);
            selectedLon = Number(ponto.lon);

            guardarLocalizacao(selectedLat, selectedLon);
            atualizarTextoLocalizacao();
            colocarMarker(selectedLat, selectedLon);

            await carregarHistorico();
        });
    });
}

map.on('click', function (e) {
    selectedPoint = null;

    selectedLat = Number(e.latlng.lat.toFixed(6));
    selectedLon = Number(e.latlng.lng.toFixed(6));

    guardarLocalizacao(selectedLat, selectedLon);
    atualizarTextoLocalizacao();
    colocarMarker(selectedLat, selectedLon);

    document.getElementById('historico').innerHTML =
        'Seleciona um ponto azul para ver o histórico oficial dessa zona.';
});

function colocarMarker(lat, lon) {
    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.marker([lat, lon]).addTo(map);
}

function atualizarTextoLocalizacao() {
    const historyLocation = document.getElementById('historyLocation');

    if (!selectedLat || !selectedLon) {
        historyLocation.textContent = 'Nenhuma localização selecionada no mapa.';
        return;
    }

    historyLocation.textContent =
        `Localização selecionada: ${selectedLat}, ${selectedLon}`;
}

async function carregarHistorico() {
    const historicoDiv = document.getElementById('historico');
    const startDate = document.getElementById('histStartDate').value;
    const endDate = document.getElementById('histEndDate').value;
    const source = document.getElementById('histSource').value;

    historicoDiv.innerHTML = 'A carregar histórico...';

    try {
        const params = new URLSearchParams();

        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (source) params.append('source', source);

        const response = await fetch(
            `${API_BASE_URL}/data/forecast/terrestrial?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
            historicoDiv.innerHTML =
                `Erro ao carregar histórico: ${data.detail || 'Erro desconhecido'}`;
            return;
        }

        let filtrado = data.filter(item =>
            item &&
            item.requestId &&
            item.requestId.startsWith('FOR_T-')
        );

        if (selectedLat && selectedLon) {
            filtrado = filtrado.filter(item => {
                if (!item.requestedLocation) return false;

                return (
                    Number(item.requestedLocation.latitude) === Number(selectedLat) &&
                    Number(item.requestedLocation.longitude) === Number(selectedLon)
                );
            });
        }

        if (source) {
            filtrado = filtrado.filter(item =>
                item.source === source
            );
        }

        if (startDate) {
            filtrado = filtrado.filter(item =>
                item.date >= startDate
            );
        }

        if (endDate) {
            filtrado = filtrado.filter(item =>
                item.date <= endDate
            );
        }

        if (filtrado.length === 0) {
            historicoDiv.innerHTML =
                'Sem resultados para os filtros escolhidos.';
            return;
        }

        filtrado.sort((a, b) => {
            const dataA = `${a.date} ${a.time}`;
            const dataB = `${b.date} ${b.time}`;
            return dataB.localeCompare(dataA);
        });

        console.log(filtrado);
        const agrupado = agruparPorRequestIdFonteDataPonto(filtrado);

        historicoDiv.innerHTML = '';

        for (const chave in agrupado) {
            const grupo = agrupado[chave];
            const primeira = grupo[0];

            const card = document.createElement('div');
            card.className = 'card';

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <h3>
                            ${primeira.source.toUpperCase()}
${primeira.model ? ` · ${primeira.model}` : ''}
                            ·
                            ${primeira.date} ${primeira.time}
                        </h3>

                        <p class="request-id">
                            Pedido: ${primeira.requestId}
                        </p>
                    </div>

                    <span class="badge">
                        ${primeira.source}
                    </span>
                </div>

                <p class="location">
                    <strong>Ponto terrestre:</strong>
                    ${selectedPoint?.name || 'Ponto selecionado'}

                    <br>

                    <strong>Localização API:</strong>
                    ${primeira.location?.latitude ?? '-'},
                    ${primeira.location?.longitude ?? '-'}

                    <br>

                    <strong>Tipo:</strong>
                    Previsão terrestre
                </p>
            `;

            const details = document.createElement('details');
            const summary = document.createElement('summary');

            summary.textContent = `Ver ${grupo.length} medições`;
            details.appendChild(summary);

            grupo.sort((a, b) => {
                const nomeA = a.variable.fieldName || a.variable.description;
                const nomeB = b.variable.fieldName || b.variable.description;

                return normalizarIndice(ordemVariaveis.indexOf(nomeA)) -
                    normalizarIndice(ordemVariaveis.indexOf(nomeB));
            });

            grupo.forEach(item => {
                const linha = document.createElement('div');
                linha.className = 'measurement';

                linha.innerHTML = `
                    <span>
                        ${formatarNomeVariavel(
                    item.variable.fieldName ||
                    item.variable.description
                )}
                    </span>

                    <strong>
                        ${item.value ?? item.valueText ?? '-'}
                        ${formatarUnidade(item.variable.unit)}
                    </strong>
                `;

                details.appendChild(linha);
            });

            card.appendChild(details);
            historicoDiv.appendChild(card);
        }

    } catch (error) {
        historicoDiv.innerHTML =
            'Erro ao obter histórico: ' + error;
    }
}

const ordemVariaveis = [
    'temperatureC',
    'temperatureMinC',
    'temperatureMaxC',
    'feelsLikeTemperatureC',
    'humidityPercent',
    'pressureHpa',
    'cloudCoverPercent',
    'visibilityKm',
    'windSpeedKmh',
    'windSpeedMaxKmh',
    'windGustKmh',
    'windDirectionDegrees',
    'windDirectionCardinal',
    'precipitationMm',
    'precipitationProbabilityPercent',
    'strongWindProbabilityPercent',
    'fogProbabilityPercent',
    'thunderstormProbabilityPercent',
    'sunriseH',
    'sunsetH'
];

function agruparPorRequestIdFonteDataPonto(data) {
    return data.reduce((acc, item) => {
        const reqLat = item.requestedLocation?.latitude ?? '';
        const reqLon = item.requestedLocation?.longitude ?? '';

        const chave = [
            item.requestId,
            item.source,
            item.date,
            item.time,
            item.model || '',
            reqLat,
            reqLon
        ].join('-');

        if (!acc[chave]) {
            acc[chave] = [];
        }

        acc[chave].push(item);

        return acc;
    }, {});
}

function normalizarIndice(index) {
    return index === -1 ? 999 : index;
}

function formatarNomeVariavel(nome) {
    const nomes = {
        temperatureC: '🌡️ Temperatura',
        temperatureMinC: '🌡️ Temperatura mínima',
        temperatureMaxC: '🌡️ Temperatura máxima',
        feelsLikeTemperatureC: '🌡️ Sensação térmica',

        humidityPercent: '💧 Humidade',
        pressureHpa: '📈 Pressão atmosférica',
        cloudCoverPercent: '☁️ Nebulosidade',
        visibilityKm: '👁️ Visibilidade',

        windSpeedKmh: '💨 Vento',
        windSpeedMaxKmh: '💨 Vento máximo',
        windGustKmh: '💨 Rajada',
        windDirectionDegrees: '🧭 Direção do vento',
        windDirectionCardinal: '🧭 Direção do vento',

        precipitationMm: '🌧️ Precipitação',
        precipitationProbabilityPercent: '🌧️ Probabilidade de precipitação',

        strongWindProbabilityPercent: '⚠️ Prob. vento forte',
        fogProbabilityPercent: '🌫️ Prob. nevoeiro',
        thunderstormProbabilityPercent: '⛈️ Prob. trovoada',

        sunriseH: '🌅 Nascer do sol',
        sunsetH: '🌇 Pôr do sol'
    };

    return nomes[nome] || nome;
}

function formatarUnidade(unidade) {
    const unidades = {
        C: 'ºC',
        '%': '%',
        hPa: 'hPa',
        km: 'km',
        'km/h': 'km/h',
        mm: 'mm',
        degrees: 'º',
        cardinal: '',
        h: 'h'
    };

    return unidades[unidade] ?? unidade ?? '';
}
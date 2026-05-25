const map = criarMapa('map');

let leiriaBounds = null;
let marker = null;
let selectedLat = null;
let selectedLon = null;
let selectedPoint = null;

function distanciaKm(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
const pontosMaritimos = [
    { name: "Figueira Offshore", lat: 40.12, lon: -9.05 },
    { name: "Vieira / Pedrógão Offshore", lat: 39.93, lon: -9.12 },
    { name: "São Pedro Offshore", lat: 39.73, lon: -9.18 },
    { name: "Nazaré Nearshore", lat: 39.60, lon: -9.20 },
    { name: "Nazaré Canyon", lat: 39.52, lon: -9.35 },
    { name: "Peniche Offshore", lat: 39.30, lon: -9.45 },
    { name: "Berlenga Offshore", lat: 39.41, lon: -9.52 }
];

const pontosComIpma = [
    "Figueira Offshore",
    "Vieira / Pedrógão Offshore",
    "São Pedro Offshore",
    "Peniche Offshore"
];

carregarDistritoLeiria(map)
    .then(bounds => {
        leiriaBounds = bounds;
        adicionarPontosMaritimos();
    })
    .catch(error => {
        document.getElementById('historico').innerHTML =
            'Erro ao carregar o mapa do distrito de Leiria: ' + error;
    });

function adicionarPontosMaritimos() {
    pontosMaritimos.forEach(ponto => {
        const markerPonto = L.circleMarker([ponto.lat, ponto.lon], {
            radius: 8,
            color: '#0ea5e9',
            fillColor: '#38bdf8',
            fillOpacity: 0.9,
            weight: 2
        }).addTo(map);

        markerPonto.bindPopup(`
            <strong>${ponto.name}</strong><br>
            Latitude: ${ponto.lat}<br>
            Longitude: ${ponto.lon}
        `);

        markerPonto.on('click', async function () {
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
            `${API_BASE_URL}/data/forecast/marine?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
            historicoDiv.innerHTML =
                `Erro ao carregar histórico: ${data.detail || 'Erro desconhecido'}`;
            return;
        }

        let filtrado = data
            .filter(item =>
                item &&
                item.requestId &&
                item.requestId.startsWith('FOR_M-') &&
                item.requestedLocation
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
                item.source?.toLowerCase() === source.toLowerCase()
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

            return dataA.localeCompare(dataB);
        });

        const agrupado = agruparPorRequestIdEFonte(filtrado);

        historicoDiv.innerHTML = '';

        for (const chave in agrupado) {
            const grupo = agrupado[chave];
            const primeira = grupo[0];

            const card = document.createElement('div');
            card.className = 'card';


            const distanciaIpma = primeira.source?.toLowerCase() === 'ipma'
                ? distanciaKm(
                    selectedPoint.lat,
                    selectedPoint.lon,
                    Number(primeira.location.latitude),
                    Number(primeira.location.longitude)
                ).toFixed(1)
                : null;

            card.innerHTML = `
    <div class="card-header">
        <div>
            <h3>
                ${primeira.source.toUpperCase()}
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

        <strong>Ponto marítimo:</strong>
        ${selectedPoint?.name || 'Ponto selecionado'}

        <br>

        <strong>Localização:</strong>
        ${primeira.location?.latitude ?? '-'},
        ${primeira.location?.longitude ?? '-'}

        <br>

        ${primeira.source?.toLowerCase() === 'ipma'
                    ? `
                    <strong>Tipo:</strong>
                    Previsão costeira regional
                    (${primeira.location?.name || 'Costa'})

                    <br>

                    <strong>Distância à costa IPMA:</strong>
                    ${distanciaIpma} km
                `
                    : `
                    <strong>Tipo:</strong>
                    Previsão offshore
                `
                }

    </p>
`;

            const details = document.createElement('details');
            const summary = document.createElement('summary');

            summary.textContent = primeira.source?.toLowerCase() === 'ipma' ? 'Ver previsão próximos 3 dias' : 'Ver previsão próximas 24 horas';
            details.appendChild(summary);

            const ordemVariaveis = [
                'waveHeightM',
                'waveHeightMinM',
                'waveHeightMaxM',
                'totalSeaMinM',
                'totalSeaMaxM',
                'waveDirectionDegrees',
                'waveDirectionCardinal',
                'wavePeriodS',
                'wavePeriodMinS',
                'wavePeriodMaxS',
                'wavePeakPeriodS',
                'swellHeightM',
                'swellDirectionDegrees',
                'swellDirectionCardinal',
                'swellPeriodS',
                'waterTemperatureC',
                'waterTemperatureMinC',
                'waterTemperatureMaxC',
                'currentSpeedMs',
                'currentDirectionDegrees',
                'windSpeedKmh',
                'windDirectionDegrees',
                'windDirectionCardinal',
                'windGustKmh'
            ];

            grupo.sort((a, b) => {
                const nomeA = a.variable.fieldName || a.variable.description;
                const nomeB = b.variable.fieldName || b.variable.description;

                const indexA = ordemVariaveis.indexOf(nomeA);
                const indexB = ordemVariaveis.indexOf(nomeB);

                return normalizarIndice(indexA) - normalizarIndice(indexB);
            });

            const isIpma = primeira.source?.toLowerCase() === 'ipma';

if (isIpma) {

    const porDia = {};

    grupo.forEach(item => {

        const chaveDia = item.date;

        if (!porDia[chaveDia]) {
            porDia[chaveDia] = [];
        }

        porDia[chaveDia].push(item);
    });

    Object.entries(porDia)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([dia, itemsDia], index) => {

            const blocoDia = document.createElement('div');
            blocoDia.className = 'forecast-hour-block';

            const tituloDia = document.createElement('h4');

            const dataObj = new Date(dia);

            const hoje = new Date();

            const amanha = new Date();
            amanha.setDate(hoje.getDate() + 1);

            const depois = new Date();
            depois.setDate(hoje.getDate() + 2);

            let descricaoDia = '';

            if (dataObj.toDateString() === hoje.toDateString()) {
                descricaoDia = 'Hoje';
            }
            else if (dataObj.toDateString() === amanha.toDateString()) {
                descricaoDia = 'Amanhã';
            }
            else if (dataObj.toDateString() === depois.toDateString()) {
                descricaoDia = 'Depois de amanhã';
            }

            tituloDia.textContent =
                `${dataObj.toLocaleDateString('pt-PT')} — ${descricaoDia}`;

            blocoDia.appendChild(tituloDia);

            itemsDia.sort((a, b) => {
                const nomeA = a.variable.fieldName || a.variable.description;
                const nomeB = b.variable.fieldName || b.variable.description;

                return normalizarIndice(ordemVariaveis.indexOf(nomeA)) -
                    normalizarIndice(ordemVariaveis.indexOf(nomeB));
            });

            itemsDia.forEach(item => {

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

                blocoDia.appendChild(linha);
            });

            details.appendChild(blocoDia);
        });

        } else {

            const porHora = {};

            grupo.forEach(item => {

                const chaveHora = `${item.date} ${item.time}`;

                if (!porHora[chaveHora]) {
                    porHora[chaveHora] = [];
                }

                porHora[chaveHora].push(item);
            });

            Object.entries(porHora)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .forEach(([hora, itemsHora]) => {

                    const blocoHora = document.createElement('div');
                    blocoHora.className = 'forecast-hour-block';

                    const tituloHora = document.createElement('h4');
                    tituloHora.textContent = hora;

                    blocoHora.appendChild(tituloHora);

                    itemsHora.sort((a, b) => {
                        const nomeA = a.variable.fieldName || a.variable.description;
                        const nomeB = b.variable.fieldName || b.variable.description;

                        return normalizarIndice(ordemVariaveis.indexOf(nomeA)) -
                            normalizarIndice(ordemVariaveis.indexOf(nomeB));
                    });

                    itemsHora.forEach(item => {

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

                        blocoHora.appendChild(linha);
                    });

                    details.appendChild(blocoHora);
                });
        }

            card.appendChild(details);
            historicoDiv.appendChild(card);
        }

    } catch (error) {
        historicoDiv.innerHTML =
            'Erro ao obter histórico: ' + error;
    }
}

function agruparPorRequestIdEFonte(data) {
    return data.reduce((acc, item) => {
        const reqLat = item.requestedLocation?.latitude ?? '';
        const reqLon = item.requestedLocation?.longitude ?? '';

        const chave = [
            item.requestId,
            item.source,
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
        waveHeightM: '🌊 Altura da onda',
        waveHeightMinM: '🌊 Onda mínima',
        waveHeightMaxM: '🌊 Onda máxima',
        totalSeaMinM: '🌊 Mar total mínimo',
        totalSeaMaxM: '🌊 Mar total máximo',
        waveDirectionDegrees: '🧭 Direção da onda',
        waveDirectionCardinal: '🧭 Direção da onda',
        wavePeriodS: '⏱️ Período da onda',
        wavePeriodMinS: '⏱️ Período mínimo',
        wavePeriodMaxS: '⏱️ Período máximo',
        wavePeakPeriodS: '⏱️ Pico da onda',
        swellHeightM: '🌊 Swell',
        swellDirectionDegrees: '🧭 Direção do swell',
        swellDirectionCardinal: '🧭 Direção do swell',
        swellPeriodS: '⏱️ Período do swell',
        waterTemperatureC: '🌡️ Temperatura da água',
        waterTemperatureMinC: '🌡️ Temp. água mínima',
        waterTemperatureMaxC: '🌡️ Temp. água máxima',
        currentSpeedMs: '🌊 Corrente',
        currentDirectionDegrees: '🧭 Direção da corrente',
        windSpeedKmh: '💨 Vento',
        windDirectionDegrees: '🧭 Direção do vento',
        windDirectionCardinal: '🧭 Direção do vento',
        windGustKmh: '💨 Rajada'
    };

    return nomes[nome] || nome;
}

function formatarUnidade(unidade) {
    const unidades = {
        C: 'ºC',
        degrees: 'º',
        cardinal: '',
        hPa: 'hPa',
        'km/h': 'km/h',
        mm: 'mm',
        '%': '%',
        h: 'h',
        s: 's',
        m: 'm',
        'm/s': 'm/s'
    };

    return unidades[unidade] ?? unidade ?? '';
}
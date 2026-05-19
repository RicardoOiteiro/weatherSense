const map = criarMapa('map');

let leiriaBounds = null;
let marker = null;
let selectedLat = null;
let selectedLon = null;

let selectedPoint = null;

const DISTANCIA_MAX_KM = 5;

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

const pontosObservacao = [
    {
        name: "Leiria (Aeródromo)",
        lat: 39.780553,
        lon: -8.818166,
    },
    {
        name: "São Pedro de Moel",
        lat: 39.766853,
        lon: -9.019775,
    },
    {
        name: "Figueira da Foz",
        lat: 40.1508,
        lon: -8.8618,
    },
    {
        name: "Nazaré / Alcobaça",
        lat: 39.601,
        lon: -9.07,
    },
    {
        name: "Peniche / Cabo Carvoeiro",
        lat: 39.361378,
        lon: -9.387817,
    },
    {
        name: "Óbidos",
        lat: 39.360421,
        lon: -9.157214
    },
    {
        name: "Bidoeira de Cima",
        lat: 39.9033,
        lon: -8.7527
    },
    {
        name: "ESTG Leiria",
        lat: 39.7345,
        lon: -8.8209
    },
    {
        name: "Pinhal de Leiria",
        lat: 39.8225,
        lon: -8.9450
    }

];

carregarDistritoLeiria(map)
    .then(bounds => {
        leiriaBounds = bounds;
        adicionarPontosObservacao();
    })
    .catch(error => {
        document.getElementById('historico').innerHTML =
            'Erro ao carregar o mapa do distrito de Leiria: ' + error;
    });

function adicionarPontosObservacao() {
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

            selectedLat = ponto.lat.toFixed(6);
            selectedLon = ponto.lon.toFixed(6);

            guardarLocalizacao(selectedLat, selectedLon);
            atualizarTextoLocalizacao();
            colocarMarker(selectedLat, selectedLon);

            document.getElementById('histType').value = 'observation';

            await carregarHistorico();
        });
    });
}

map.on('click', function (e) {
    if (leiriaBounds && !leiriaBounds.contains(e.latlng)) {
        document.getElementById('historico').innerHTML =
            'Só são permitidas localizações dentro da área definida para o projecto.';
        return;
    }

    selectedPoint = null;

    selectedLat = e.latlng.lat.toFixed(6);
    selectedLon = e.latlng.lng.toFixed(6);

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
    const type = document.getElementById('histType').value;
    const source = document.getElementById('histSource').value;

    historicoDiv.innerHTML = 'A carregar histórico...';

    try {
        const params = new URLSearchParams();

        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (type) params.append('type', type);
        if (source) params.append('source', source);

        const response = await fetch(
            `${API_BASE_URL}/data/observations?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
            historicoDiv.innerHTML =
                `Erro ao carregar histórico: ${data.detail || 'Erro desconhecido'}`;
            return;
        }



        let filtrado = data;

        // filtro por coordenadas
        if (selectedLat && selectedLon) {

            const latSelecionada = Number(selectedLat);
            const lonSelecionada = Number(selectedLon);

            filtrado = filtrado
                .map(item => {

                    if (!item.requestedLocation) return null;

                    const latItem =
                        Number(item.requestedLocation.latitude);

                    const lonItem =
                        Number(item.requestedLocation.longitude);

                    const distancia = distanciaKm(
                        latSelecionada,
                        lonSelecionada,
                        latItem,
                        lonItem
                    );

                    const distanciaEstacao = item.location
                        ? distanciaKm(
                            latSelecionada,
                            lonSelecionada,
                            Number(item.location.latitude),
                            Number(item.location.longitude)
                        )
                        : null;

                    return {
                        ...item,
                        distanciaCalculada: distancia,
                        distanciaEstacao
                    };
                })
                .filter(item => item !== null);

            filtrado.sort(
                (a, b) =>
                    a.distanciaCalculada - b.distanciaCalculada
            );

            filtrado = filtrado.filter(
                item => item.distanciaCalculada <= DISTANCIA_MAX_KM
            );

            if (selectedPoint) {

                filtrado = filtrado.filter(item => {

                    const pontoMaisProximo =
                        pontoMaisProximoDaEstacao(item);

                    return (
                        pontoMaisProximo &&
                        pontoMaisProximo.name === selectedPoint.name
                    );
                });
            }
        }

        // filtro tipo
        if (type === 'observation') {
            filtrado = filtrado.filter(item =>
                item.requestId &&
                item.requestId.startsWith('OBS-')
            );
        }
        else if (type === 'terrestrial') {
            filtrado = filtrado.filter(item =>
                item.requestId &&
                item.requestId.startsWith('FOR_T-')
            );
        }
        else if (type === 'marine') {
            filtrado = filtrado.filter(item =>
                item.requestId &&
                item.requestId.startsWith('FOR_M-')
            );
        }

        // filtro fonte
        if (source) {
            filtrado = filtrado.filter(item =>
                item.source === source
            );
        }

        // filtro datas
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
        const agrupado = agruparPorRequestIdEFonte(filtrado);

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
    <strong>Estação:</strong>
    ${primeira.location.name || 'Desconhecida'}

    <br>

    <strong>Localização:</strong>
    ${primeira.location.latitude},
    ${primeira.location.longitude}

    <br>
    <strong>Distancia Estação KM:</strong>
    ${primeira.distanciaEstacao?.toFixed(1) ?? '-'} km
    <br>
    <!--
    <strong>Distância:</strong>
    ${primeira.distanciaCalculada?.toFixed(1) ?? '-'} km 
    -->
</p>
`;

            const details = document.createElement('details');

            const summary = document.createElement('summary');

            summary.textContent =
                `Ver ${grupo.length} medições`;

            details.appendChild(summary);
            const ordemVariaveis = [
                'Air temperature',
                'Wind speed',
                'Wind direction (cardinal)',
                'Wind direction (degrees)',
                'Precipitation',
                'Precipitation period',
                'Relative humidity',
                'Atmospheric pressure',
                'Visibility'
            ];

            grupo.sort((a, b) => {

                const nomeA =
                    a.variable.description || a.variable.fieldName;

                const nomeB =
                    b.variable.description || b.variable.fieldName;

                const indexA = ordemVariaveis.indexOf(nomeA);
                const indexB = ordemVariaveis.indexOf(nomeB);

                return indexA - indexB;
            });

            grupo.forEach(item => {

                const linha = document.createElement('div');

                linha.className = 'measurement';

                linha.innerHTML = `
        <span>
            ${formatarNomeVariavel(
                    item.variable.description ||
                    item.variable.fieldName
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

    }
    catch (error) {

        historicoDiv.innerHTML =
            'Erro ao obter histórico: ' + error;
    }
}

function agruparPorRequestIdEFonte(data) {
    return data.reduce((acc, item) => {
        const chave = `${item.requestId}-${item.source}`;

        if (!acc[chave]) {
            acc[chave] = [];
        }

        acc[chave].push(item);

        return acc;
    }, {});
}

function formatarNomeVariavel(nome) {
    const nomes = {
        'Air temperature': '🌡️ Temperatura',
        'Wind speed': '💨 Vento',
        'Wind direction (cardinal)': '🧭 Direção do vento',
        'Wind direction (degrees)': '🧭 Direção em graus',
        'Precipitation': '🌧️ Precipitação',
        'Precipitation period': '⏱️ Período da precipitação',
        'Relative humidity': '💧 Humidade',
        'Atmospheric pressure': '📈 Pressão atmosférica',
        'Visibility': '👁️ Visibilidade'
    };

    return nomes[nome] || nome;
}

function formatarUnidade(unidade) {
    const unidades = {
        'C': 'ºC',
        'degrees': 'º',
        'cardinal': '',
        'hPa': 'hPa',
        'km/h': 'km/h',
        'mm': 'mm',
        '%': '%',
        'h': 'h'
    };

    return unidades[unidade] ?? unidade ?? '';
}

function pontoMaisProximoDaEstacao(item) {
    if (!item.requestedLocation) return null;

    const latItem = Number(item.requestedLocation?.latitude);
    const lonItem = Number(item.requestedLocation?.longitude);

    let pontoMaisProximo = null;
    let menorDistancia = Infinity;

    pontosObservacao.forEach(ponto => {
        const distancia = distanciaKm(
            latItem,
            lonItem,
            ponto.lat,
            ponto.lon
        );

        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            pontoMaisProximo = ponto;
        }
    });

    return pontoMaisProximo;
}

const map = criarMapa('map');

let leiriaBounds = null;
let marker = null;
let selectedLat = null;
let selectedLon = null;

carregarDistritoLeiria(map)
    .then(bounds => {
        leiriaBounds = bounds;
    })
    .catch(error => {
        document.getElementById('output').textContent =
            'Erro ao carregar o mapa do distrito de Leiria: ' + error;
    });

function obterModoSelecionado() {
    return document.querySelector('input[name="modo"]:checked').value;
}

function criarBotoesFontes(data, modo) {
    const container = document.getElementById('fontesContainer');
    const output = document.getElementById('output');

    container.innerHTML = '';

    for (const fonte in data) {
        if (fonte === 'requested_location') continue;

        const button = document.createElement('button');
        button.textContent = fonte.toUpperCase();

        button.onclick = function () {
            if (modo === 'terrestrial' && fonte === 'openmeteo') {
                criarBotoesModelos(fonte, data[fonte], data);
                return;
            }

            output.textContent = JSON.stringify({
                requested_location: data.requested_location,
                [fonte]: data[fonte]
            }, null, 2);
        };

        container.appendChild(button);
    }
}

function criarBotoesModelos(nomeFonte, fonteData, dataCompleta) {
    const container = document.getElementById('fontesContainer');
    const output = document.getElementById('output');

    container.innerHTML = '';

    const voltar = document.createElement('button');
    voltar.textContent = '← Voltar às fontes';

    voltar.onclick = function () {
        criarBotoesFontes(dataCompleta, 'terrestrial');
        output.textContent = 'Escolhe uma fonte acima.';
    };

    container.appendChild(voltar);

    for (const modelo in fonteData) {
        const button = document.createElement('button');
        const modeloData = fonteData[modelo];

        button.textContent = modeloData?.meta?.model || modelo;

        button.onclick = function () {
            output.textContent = JSON.stringify({
                requested_location: dataCompleta.requested_location,
                [nomeFonte]: {
                    [modelo]: modeloData
                }
            }, null, 2);
        };

        container.appendChild(button);
    }

    output.textContent = `Escolhe um modelo da fonte ${nomeFonte.toUpperCase()}.`;
}

map.on('click', async function (e) {
    const output = document.getElementById('output');
    const fontesContainer = document.getElementById('fontesContainer');

    const lat = e.latlng.lat.toFixed(6);
    const lon = e.latlng.lng.toFixed(6);
    const modo = obterModoSelecionado();

    selectedLat = lat;
    selectedLon = lon;

    guardarLocalizacao(lat, lon);

    document.getElementById('coords').textContent =
        `Latitude: ${lat} | Longitude: ${lon}`;

    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.marker([lat, lon]).addTo(map);

    output.textContent = 'A obter dados...';
    fontesContainer.innerHTML = '';

    try {
        const data = await obterDadosMeteorologicos(modo, lat, lon);

        if (modo === 'observation') {
            fontesContainer.innerHTML = '';
            output.textContent = JSON.stringify(data, null, 2);
            return;
        }

        criarBotoesFontes(data, modo);
        output.textContent = 'Escolhe uma fonte acima.';

    } catch (error) {
        output.textContent = 'Erro ao obter dados da API: ' + error.message;
    }
});
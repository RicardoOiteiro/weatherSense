function criarMapa(idMapa) {
    const satellite = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Tiles © Esri'
        }
    );

    const labels = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
            attribution: 'Labels © Esri',
            interactive: false
        }
    );

    const map = L.map(idMapa, {
        center: [39.5, -8.0],
        zoom: 7,
        layers: [satellite, labels]
    });

    return map;
}

async function carregarDistritoLeiria(map) {
    const response = await fetch(GEOJSON_PATH);
    const leiriaGeoJson = await response.json();

    const leiriaLayer = L.geoJSON(leiriaGeoJson, {
        style: {
            color: 'blue',
            weight: 3,
            fillOpacity: 0.05
        }
    }).addTo(map);

    const bounds = leiriaLayer.getBounds();
    map.fitBounds(bounds);

    return bounds;
}

function guardarLocalizacao(lat, lon) {
    localStorage.setItem('selectedLat', lat);
    localStorage.setItem('selectedLon', lon);
}

function obterLocalizacaoGuardada() {
    return {
        lat: localStorage.getItem('selectedLat'),
        lon: localStorage.getItem('selectedLon')
    };
}
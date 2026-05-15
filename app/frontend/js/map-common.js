function criarMapa(idMapa) {

    const portugalBounds = L.latLngBounds(
        [36.8, -9.6],
        [42.3, -6.0]
    );

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

        minZoom: 6,

        maxBounds: portugalBounds,

        maxBoundsViscosity: 1.0,

        layers: [satellite, labels]
    });

    map.fitBounds(portugalBounds);

    return map;
}
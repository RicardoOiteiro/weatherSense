window.obterDadosMeteorologicos = async function (modo, lat, lon) {
    let endpoint = '';

    if (modo === 'observation') {
        endpoint = `${API_BASE_URL}/weather/observation?lat=${lat}&lon=${lon}`;
    } else if (modo === 'marine') {
        endpoint = `${API_BASE_URL}/weather/marine?lat=${lat}&lon=${lon}`;
    } else if (modo === 'terrestrial') {
        endpoint = `${API_BASE_URL}/weather/terrestrial?lat=${lat}&lon=${lon}`;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || JSON.stringify(data, null, 2));
    }

    return data;
};
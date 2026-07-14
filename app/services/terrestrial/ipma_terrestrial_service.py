from datetime import datetime

import requests
from fastapi import HTTPException

from app.normalizers.terrestrial_normalizer import normalize_ipma_terrestrial
from app.utils.distance import haversine_km
from app.db.database import get_connection
from app.db.save_terrestrial_forecast import save_terrestrial_forecast

# =====================================================
# CONFIG
# =====================================================

IPMA_LOCATIONS_URL = "https://api.ipma.pt/open-data/distrits-islands.json"
IPMA_FORECAST_URL = "https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/{global_id}.json"
IPMA_AGGREGATE_URL = "https://api.ipma.pt/public-data/forecast/aggregate/{global_id}.json"

# =====================================================
# HELPERS
# =====================================================


# Obtém a lista de localizações disponibilizadas pelo IPMA
def get_ipma_locations():
    response = requests.get(IPMA_LOCATIONS_URL, timeout=20)
    response.raise_for_status()

    data = response.json()
    return data.get("data", [])

# Obtém a previsão agregada associada a uma localização IPMA
def get_ipma_aggregate(global_id):
    url = IPMA_AGGREGATE_URL.format(global_id=global_id)

    response = requests.get(url, timeout=20)
    response.raise_for_status()

    return response.json()

# Seleciona o registo de previsão mais próximo do momento atual
def get_nearest_aggregate_forecast(aggregate_data):
    if not isinstance(aggregate_data, list) or not aggregate_data:
        return {}

    now = datetime.now()

    # Converte as datas válidas para poder comparar cada previsão com o momento atual
    forecasts_with_date = []

    for item in aggregate_data:
        data_prev = item.get("dataPrev")

        if not data_prev:
            continue

        try:
            data_prev_dt = datetime.fromisoformat(data_prev)
            forecasts_with_date.append((item, data_prev_dt))
        except ValueError:
            continue

    if not forecasts_with_date:
        return aggregate_data[0]

    # Escolhe a previsão cuja data está temporalmente mais próxima da hora atual
    return min(
        forecasts_with_date,
        key=lambda item: abs(item[1] - now)
    )[0]

# Seleciona a localização IPMA com menor distância às coordenadas pedidas
def find_nearest_ipma_location(lat: float, lon: float):
    locations = get_ipma_locations()

    if not locations:
        raise HTTPException(
            status_code=404,
            detail="Sem locais IPMA disponíveis."
        )

    nearest = None
    nearest_distance = None

    for location in locations:
        loc_lat = float(location.get("latitude"))
        loc_lon = float(location.get("longitude"))

        # Calcula a distância entre o ponto pedido e cada localização IPMA
        distance = haversine_km(lat, lon, loc_lat, loc_lon)

        # Mantém a localização mais próxima encontrada 
        if nearest_distance is None or distance < nearest_distance:
            nearest = location
            nearest_distance = distance

    nearest["distanceKm"] = nearest_distance
    return nearest

# =====================================================
# SERVICES
# =====================================================

def get_ipma_terrestrial(lat: float, lon: float, day_index: int = 0):
    location = find_nearest_ipma_location(lat, lon)

    global_id = location.get("globalIdLocal")

    if not global_id:
        raise HTTPException(
            status_code=404,
            detail="Local IPMA sem globalIdLocal."
        )

    url = IPMA_FORECAST_URL.format(global_id=global_id)

    response = requests.get(url, timeout=20)
    response.raise_for_status()

    data = response.json()
    forecasts = data.get("data", [])

    if not forecasts:
        raise HTTPException(
            status_code=404,
            detail="Sem previsão terrestre devolvida pelo IPMA."
        )

    resultados = []

    aggregate_data = get_ipma_aggregate(global_id)

    agora = datetime.now()

    # Mantém apenas as previsões cuja data ainda não foi ultrapassada
    forecasts_futuros = []

    for item in aggregate_data:

        data_prev = item.get("dataPrev")

        if not data_prev:
            continue

        try:
            data_prev_dt = datetime.fromisoformat(data_prev)

            if data_prev_dt >= agora:
                forecasts_futuros.append(item)

        except ValueError:
            continue
    
    # Agrupa as temperaturas mínima e máxima por dia
    daily_temperature_summary = {}

    for item in aggregate_data:

        date_prev = item.get("dataPrev")

        if not date_prev:
            continue

        date_key = date_prev[:10]

        tmin = item.get("tMin")
        tmax = item.get("tMax")

        if tmin is not None or tmax is not None:

            daily_temperature_summary[date_key] = {
                "tMin": tmin,
                "tMax": tmax
            }

    # Processa no máximo as próximas 24 previsões disponíveis
    for aggregate_forecast in forecasts_futuros[:24]:

        date_key = aggregate_forecast.get("dataPrev", "")[:10]

        daily_summary = daily_temperature_summary.get(date_key, {})

        # Associa a cada previsão horária os valores mínimo e máximo do respetivo dia
        aggregate_forecast["tMin"] = daily_summary.get("tMin")
        aggregate_forecast["tMax"] = daily_summary.get("tMax")

        resultado = normalize_ipma_terrestrial(
            requested_lat=lat,
            requested_lon=lon,
            location=location,
            aggregate_current=aggregate_forecast,
            data_update=data.get("dataUpdate"),
        )
        # Mantém as coordenadas inicialmente pedidas, mesmo quando o IPMA usa a localização disponível mais próxima
        resultado["requestedLocation"] = {
            "latitude": lat,
            "longitude": lon
        }

        resultados.append(resultado)
        

    conn = get_connection()

    try:

        request_id = datetime.now().strftime("FOR_T-%y%m%d-%H%M")


        for resultado in resultados:

            save_terrestrial_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=request_id,
                context_type="drone"
            )

    finally:
        conn.close()

    return resultados
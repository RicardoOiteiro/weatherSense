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

def get_ipma_locations():
    response = requests.get(IPMA_LOCATIONS_URL, timeout=20)
    response.raise_for_status()

    data = response.json()
    return data.get("data", [])


def get_ipma_aggregate(global_id):
    url = IPMA_AGGREGATE_URL.format(global_id=global_id)

    response = requests.get(url, timeout=20)
    response.raise_for_status()

    return response.json()


def get_nearest_aggregate_forecast(aggregate_data):
    if not isinstance(aggregate_data, list) or not aggregate_data:
        return {}

    now = datetime.now()

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

    return min(
        forecasts_with_date,
        key=lambda item: abs(item[1] - now)
    )[0]


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

        distance = haversine_km(lat, lon, loc_lat, loc_lon)

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

    if day_index >= len(forecasts):
        day_index = 0

    forecast = forecasts[day_index]

    aggregate_data = get_ipma_aggregate(global_id)
    aggregate_current = get_nearest_aggregate_forecast(aggregate_data)

    resultado = normalize_ipma_terrestrial(
        requested_lat=lat,
        requested_lon=lon,
        location=location,
        forecast=forecast,
        aggregate_current=aggregate_current,
        data_update=data.get("dataUpdate"),
        global_id=data.get("globalIdLocal", global_id),
    )

    print("ANTES DE GRAVAR IPMA TERRESTRIAL NA BD")

    conn = get_connection()

    try:
        inserted_count = save_terrestrial_forecast(
            conn=conn,
            normalized_data=resultado,
            request_id=datetime.now().strftime("FOR_T-%y%m%d-%H%M"),
            context_type="drone"
        )

        print(f"IPMA TERRESTRIAL GRAVADO: {inserted_count} medições")

    finally:
        conn.close()

    return resultado
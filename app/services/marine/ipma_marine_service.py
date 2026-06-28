
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from fastapi import HTTPException

from app.normalizers.marine_normalizer import normalize_ipma_marine
from app.db.database import get_connection
from app.db.save_marine_forecast import save_marine_forecast
from app.utils.distance import haversine_km

# =====================================================
# CONFIG
# =====================================================
IPMA_SEA_LOCATIONS_URL = "https://api.ipma.pt/open-data/sea-locations.json"
IPMA_SEA_FORECAST_URL = "https://api.ipma.pt/open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day{id_day}.json"


# =====================================================
# HELPERS
# =====================================================


def km_to_nm(km: float) -> float:
    return km / 1.852

# =====================================================
# SERVICES
# =====================================================

def get_nearest_ipma_sea_location(lat: float, lon: float) -> dict:
    response = requests.get(IPMA_SEA_LOCATIONS_URL, timeout=20)
    response.raise_for_status()

    locations = response.json()

    if not locations:
        raise HTTPException(
            status_code=404,
            detail="Sem locais marítimos devolvidos pelo IPMA."
        )

    nearest_location = min(
        locations,
        key=lambda location: haversine_km(
            lat,
            lon,
            float(location.get("latitude")),
            float(location.get("longitude"))
        )
    )

    lat_loc = float(nearest_location.get("latitude"))
    lon_loc = float(nearest_location.get("longitude"))

    distance_km = haversine_km(lat, lon, lat_loc, lon_loc)

    nearest_location["distanceKm"] = round(distance_km, 2)
    nearest_location["distanceNm"] = round(km_to_nm(distance_km), 2)

    return nearest_location

def get_ipma_marine_3_days(lat: float, lon: float) -> list[dict]:
    resultados = []

    for id_day in [0, 1, 2]:

        resultado = get_ipma_marine_daily(
            lat,
            lon,
            id_day
        )

        resultado["forecastDay"] = id_day

        resultados.append(resultado)

    conn = get_connection()

    try:

        request_id = datetime.now(
            ZoneInfo("Europe/Lisbon")
        ).strftime("FOR_M-%y%m%d-%H%M")

        total_inserted = 0

        for resultado in resultados:

            inserted_count = save_marine_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=request_id,
                context_type="coastal"
            )

            total_inserted += inserted_count
    finally:
        conn.close()

    return resultados

def get_ipma_marine_daily(lat: float, lon: float, id_day: int = 0) -> dict:
    if id_day not in [0, 1, 2]:
        raise HTTPException(
            status_code=400,
            detail="id_day inválido. Usa 0 para hoje, 1 para amanhã ou 2 para depois de amanhã."
        )

    nearest_location = get_nearest_ipma_sea_location(lat, lon)

    url = IPMA_SEA_FORECAST_URL.format(id_day=id_day)

    response = requests.get(url, timeout=20)
    response.raise_for_status()

    forecast = response.json()
    data = forecast.get("data", [])

    if not data:
        raise HTTPException(
            status_code=404,
            detail="Sem previsão marítima diária devolvida pelo IPMA."
        )

    global_id_local = nearest_location.get("globalIdLocal")

    forecast_for_location = next(
        (
            item for item in data
            if item.get("globalIdLocal") == global_id_local
        ),
        None
    )

    if not forecast_for_location:
        raise HTTPException(
            status_code=404,
            detail="Sem previsão IPMA para o local marítimo mais próximo."
        )

    resultado = normalize_ipma_marine(
        requested_lat=lat,
        requested_lon=lon,
        location=nearest_location,
        forecast=forecast,
        daily=forecast_for_location,
        id_day=id_day
    )
    
    return resultado

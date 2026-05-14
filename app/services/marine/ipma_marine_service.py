import math
import requests
from fastapi import HTTPException
from zoneinfo import ZoneInfo
from app.normalizers.marine_normalizer import normalize_ipma_marine


IPMA_SEA_LOCATIONS_URL = "https://api.ipma.pt/open-data/sea-locations.json"
IPMA_SEA_FORECAST_URL = "https://api.ipma.pt/open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day{id_day}.json"

from datetime import datetime

from app.db.database import get_connection
from app.db.save_marine_forecast import save_marine_forecast

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius_km * c

 
def km_to_nm(km: float) -> float:
    return km / 1.852


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
        key=lambda location: calculate_distance_km(
            lat,
            lon,
            float(location.get("latitude")),
            float(location.get("longitude"))
        )
    )

    lat_loc = float(nearest_location.get("latitude"))
    lon_loc = float(nearest_location.get("longitude"))

    distance_km = calculate_distance_km(lat, lon, lat_loc, lon_loc)

    nearest_location["distanceKm"] = round(distance_km, 2)
    nearest_location["distanceNm"] = round(km_to_nm(distance_km), 2)

    return nearest_location

def get_ipma_marine_3_days(lat: float, lon: float) -> list[dict]:
    return [
        get_ipma_marine_daily(lat, lon, id_day)
        for id_day in [0, 1, 2]
    ]

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
        daily=forecast_for_location
    )
    print("ANTES DE GRAVAR IPMA MARINE NA BD")

    conn = get_connection()

    try:
        inserted_count = save_marine_forecast(
            conn=conn,
            normalized_data=resultado,
            request_id = datetime.now(ZoneInfo("Europe/Lisbon")).strftime("FOR_M-%y%m%d-%H%M"),
            context_type="coastal"
        )

        print(f"IPMA MARINE GRAVADO: {inserted_count} medições")

    finally:
        conn.close()

    return resultado



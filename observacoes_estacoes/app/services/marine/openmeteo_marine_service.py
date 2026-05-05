import requests
from fastapi import HTTPException
from datetime import datetime
from app.utils.distance import haversine_km

from app.normalizers.marine_normalizer import normalize_openmeteo_marine


OPENMETEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"


def get_nearest_hour_index(times: list[str]) -> int:
    now = datetime.now()
    times_dt = [datetime.fromisoformat(t) for t in times]

    return min(
        range(len(times_dt)),
        key=lambda i: abs(times_dt[i] - now)
    )


def get_openmeteo_marine(lat: float, lon: float):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "wave_height",
            "wave_direction",
            "wave_period",
            "wave_peak_period",
            "swell_wave_height",
            "swell_wave_direction",
            "swell_wave_period",
            "sea_surface_temperature",
            "ocean_current_velocity",
            "ocean_current_direction",
        ]),
        "models_wave": "dwd_ewam",
        "forecast_days": 7,
        "timezone": "auto",
    }

    response = requests.get(OPENMETEO_MARINE_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()
    hourly = data.get("hourly", {})

    if not hourly or not hourly.get("time"):
        raise HTTPException(
            status_code=404,
            detail="Sem dados marine devolvidos pelo Open-Meteo."
        )
    
    index = get_nearest_hour_index(hourly["time"])

    api_lat = data.get("latitude", lat)
    api_lon = data.get("longitude", lon)
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)


    return normalize_openmeteo_marine(
        lat=api_lat,
        lon=api_lon,
        distance_km=distance_km,
        hourly=hourly,
        index=index,
       
    )
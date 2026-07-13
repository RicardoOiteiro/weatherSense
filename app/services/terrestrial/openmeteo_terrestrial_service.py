from datetime import datetime

import requests
from fastapi import HTTPException

from app.utils.distance import haversine_km
from app.normalizers.terrestrial_normalizer import normalize_openmeteo_terrestrial
from app.db.database import get_connection
from app.db.save_terrestrial_forecast import save_terrestrial_forecast


# =====================================================
# CONFIG
# =====================================================

OPENMETEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

OPENMETEO_MODELS = [
    {
        "api_model": "ecmwf_ifs",
        "db_model": "ECMWF"
    },
    {
        "api_model": "icon_eu",
        "db_model": "ICON"
    },
    {
        "api_model": "meteofrance_arpege_europe",
        "db_model": "ARPEGE & AROME"
    },
]

# =====================================================
# HELPERS
# =====================================================


def get_next_hour_index(times: list[str]) -> int:
    now = datetime.now()
    times_dt = [datetime.fromisoformat(t) for t in times]

    for i, forecast_time in enumerate(times_dt):
        if forecast_time >= now:
            return i

    return len(times_dt) - 1


# =====================================================
# SERVICES
# =====================================================

def get_openmeteo_terrestrial(lat: float, lon: float, model: dict):
    params = {
        "latitude": lat,
        "longitude": lon,
       "models": model["api_model"],
        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "weather_code",
            "pressure_msl",
            "cloud_cover",
            "visibility",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
        ]),
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "wind_speed_10m_max",
            "sunrise",
            "sunset",
        ]),
        "forecast_days": 7,
        "timezone": "auto",
    }

    response = requests.get(OPENMETEO_FORECAST_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()
    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    if not hourly or not hourly.get("time"):
        raise HTTPException(
            status_code=404,
            detail=f"Sem dados terrestres devolvidos pelo Open-Meteo para o modelo {model}."
        )

    current_index = get_next_hour_index(hourly["time"])

    api_lat = data.get("latitude", lat)
    api_lon = data.get("longitude", lon)
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)

    resultados = []

    for index in range(
        current_index,
        min(current_index + 24, len(hourly["time"]))
    ):
    
        resultado = normalize_openmeteo_terrestrial(
            lat=api_lat,
            lon=api_lon,
            distance_km=distance_km,
            hourly=hourly,
            daily=daily,
            index=index,
            model=model["db_model"],
        )

        resultado["requestedLocation"] = {
            "latitude": lat,
            "longitude": lon
        }

        resultados.append(resultado)

    return resultados
     
     


def get_openmeteo_terrestrial_all_models(lat: float, lon: float):
    resultados = {}

    for model in OPENMETEO_MODELS:
        resultado = get_openmeteo_terrestrial(lat, lon, model)
        conn = get_connection()

        try:
            request_id = datetime.now().strftime("FOR_T-%y%m%d-%H%M")
            for previsao in resultado:

                save_terrestrial_forecast(
                    conn=conn,
                    normalized_data=previsao,
                    request_id=request_id,
                    context_type="drone"
                )

        finally:
            conn.close()

        resultados[model["db_model"]] = resultado

    return resultados
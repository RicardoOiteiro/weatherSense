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
    "ecmwf_ifs",
    "icon_eu",
    "meteofrance_arpege_europe",
]

# =====================================================
# HELPERS
# =====================================================


def get_nearest_hour_index(times: list[str]) -> int:
    now = datetime.now()
    times_dt = [datetime.fromisoformat(t) for t in times]

    return min(
        range(len(times_dt)),
        key=lambda i: abs(times_dt[i] - now)
    )


# =====================================================
# SERVICES
# =====================================================

def get_openmeteo_terrestrial(lat: float, lon: float, model: str):
    params = {
        "latitude": lat,
        "longitude": lon,
        "models": model,
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

    index = get_nearest_hour_index(hourly["time"])

    api_lat = data.get("latitude", lat)
    api_lon = data.get("longitude", lon)
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)

    return normalize_openmeteo_terrestrial(
        lat=api_lat,
        lon=api_lon,
        distance_km=distance_km,
        hourly=hourly,
        daily=daily,
        index=index,
        model=model,
    )


def get_openmeteo_terrestrial_all_models(lat: float, lon: float):
    resultados = {}

    for model in OPENMETEO_MODELS:
        resultado = get_openmeteo_terrestrial(lat, lon, model)

        print(f"ANTES DE GRAVAR OPENMETEO {model} NA BD")

        conn = get_connection()

        try:
            inserted_count = save_terrestrial_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=datetime.now().strftime("FOR_T-%y%m%d-%H%M"),
                context_type="drone"
            )

            print(
                f"OPENMETEO {model} GRAVADO: "
                f"{inserted_count} medições"
            )

        finally:
            conn.close()

        resultados[model] = resultado

    return resultados
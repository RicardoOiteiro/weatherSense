from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from fastapi import HTTPException

from app.db.database import get_connection
from app.db.save_marine_forecast import save_marine_forecast
from app.normalizers.marine_normalizer import normalize_openmeteo_marine
from app.utils.distance import haversine_km

# =====================================================
# CONFIG
# =====================================================

OPENMETEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

# =====================================================
# HELPERS
# =====================================================

# Obtém o índice da primeira previsão correspondente à hora atual ou seguinte
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

def get_openmeteo_marine(lat: float, lon: float):
    # Pede  dados horários utilizando o modelo marítimo dwd_ewam
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
    
    # arecolha começa na primeira hora de previsão ainda não ultrapassada

    index = get_next_hour_index(hourly["time"])

    # calcula a distância entre o ponto pedido e as coordenadas devolvidas  API
    api_lat = data.get("latitude", lat)
    api_lon = data.get("longitude", lon)
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)


    resultados = []

    # normaliza as próximas 24 horas disponíveis
    for i in range(index, min(index + 24, len(hourly["time"]))):

        resultado = normalize_openmeteo_marine(
            lat=api_lat,
            lon=api_lon,
            distance_km=distance_km,
            hourly=hourly,
            index=i,
        )

        # Mantém as coordenadas inicialmente pedidas para distinguir consultas que possam ser associadas ao mesmo ponto devolvido pela API

        resultado["requestedLocation"] = {
            "latitude": lat,
            "longitude": lon
        }

        resultados.append(resultado)
    
    conn = get_connection()

    #mesmo identificador agrupa todas as horas recolhidas nesta execução
    try:    
        request_id = datetime.now(
            ZoneInfo("Europe/Lisbon")
        ).strftime("FOR_M-%y%m%d-%H%M")
    
    # armazena cada hora normalizada como um conjunto de medições
        for resultado in resultados:
            save_marine_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=request_id,
                context_type="coastal"
            )

    finally:
        conn.close()

    return resultados
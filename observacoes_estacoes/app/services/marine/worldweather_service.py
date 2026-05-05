from dotenv import load_dotenv
import os
import requests
from fastapi import HTTPException
from datetime import datetime

from app.normalizers.marine_normalizer import normalize_wwo_marine
from app.utils.distance import haversine_km


WWO_URL = "https://api.worldweatheronline.com/premium/v1/marine.ashx"


def get_nearest_wwo_hour_block(hourly: list[dict]) -> dict:
    now = datetime.now()

    def block_datetime(block):
        # Na WWO, o campo "time" costuma vir como:
        # "0", "100", "200", ..., "2300"
        raw_time = str(block.get("time", "0")).zfill(4)

        hour = int(raw_time[:2])
        minute = int(raw_time[2:])

        return now.replace(hour=hour, minute=minute, second=0, microsecond=0)

    return min(
        hourly,
        key=lambda block: abs(block_datetime(block) - now)
    )




def get_wwo_marine(lat: float, lon: float):

    api_key = os.getenv("WWO_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="API key da WorldWeatherOnline não definida"
        )

    # 1️⃣ REQUEST À API
    params = {
        "key": api_key,
        "q": f"{lat},{lon}",
        "format": "json",
        "tp": 1,
        "tide": "no"
    }

    response = requests.get(WWO_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()

    # 2️⃣ EXTRAIR DADOS IMPORTANTES
    weather = data.get("data", {}).get("weather", [])

    if not weather:
        raise HTTPException(
            status_code=404,
            detail="Sem dados devolvidos pela WWO"
        )

    primeiro_dia = weather[0]
    hourly = primeiro_dia.get("hourly", [])

    

    if not hourly:
        raise HTTPException(
            status_code=404,
            detail="Sem dados horários WWO"
        )

    bloco_mais_proximo = get_nearest_wwo_hour_block(hourly)

    api_lat = lat
    api_lon = lon
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)

    # 3️⃣ NORMALIZAR
    resultado = normalize_wwo_marine(
        lat=api_lat,
        lon=api_lon,
        distance_km=distance_km,
        date=primeiro_dia.get("date"),
        hourly=bloco_mais_proximo
    )

    return resultado
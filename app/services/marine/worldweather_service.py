
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from fastapi import HTTPException

from app.normalizers.marine_normalizer import normalize_wwo_marine
from app.utils.distance import haversine_km
from app.db.database import get_connection
from app.db.save_marine_forecast import save_marine_forecast


# =====================================================
# CONFIG
# =====================================================


WWO_URL = "https://api.worldweatheronline.com/premium/v1/marine.ashx"

# =====================================================
# HELPERS
# =====================================================

def get_nearest_wwo_hour_block(hourly: list[dict]) -> dict:
    now = datetime.now()

    def block_datetime(block):
        # Na WWO, o campo "time" costuma vir como: "0", "100", "200", ..., "2300"
        raw_time = str(block.get("time", "0")).zfill(4)

        hour = int(raw_time[:2])
        minute = int(raw_time[2:])

        return now.replace(hour=hour, minute=minute, second=0, microsecond=0)

    return min(
        hourly,
        key=lambda block: abs(block_datetime(block) - now)
    )



# =====================================================
# SERVICES
# =====================================================

def get_wwo_marine(lat: float, lon: float):

    api_key = os.getenv("WWO_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="API key da WorldWeatherOnline não definida"
        )

    #REQUEST À API
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

    # EXTRAIR DADOS
    weather = data.get("data", {}).get("weather", [])

    if not weather:
        raise HTTPException(
            status_code=404,
            detail="Sem dados devolvidos pela WWO"
        )

    now = datetime.now()

    hourly_filtrado = []

    for dia in weather:

        date = dia.get("date")
        hourly = dia.get("hourly", [])

        for bloco in hourly:

            raw_time = str(bloco.get("time", "0")).zfill(4)

            hour = int(raw_time[:2])
            minute = int(raw_time[2:])

            forecast_dt = datetime.fromisoformat(
                f"{date} {hour:02d}:{minute:02d}"
            )

            diff_hours = (
                forecast_dt - now
            ).total_seconds() / 3600

            if diff_hours < 0:
                continue

            if diff_hours > 24:
                continue

            hourly_filtrado.append({
                "date": date,
                "hourly": bloco
            })

    

    if not hourly:
        raise HTTPException(
            status_code=404,
            detail="Sem dados horários WWO"
        )

    

    api_lat = lat
    api_lon = lon
    distance_km = round(haversine_km(lat, lon, api_lat, api_lon), 2)

    resultados = []

    for item in hourly_filtrado:

        resultado = normalize_wwo_marine(
            lat=lat,
            lon=lon,
            distance_km=0,
            date=item["date"],
            hourly=item["hourly"]
        )

        resultado["requestedLocation"] = {
            "latitude": lat,
            "longitude": lon
        }

        resultados.append(resultado)
    
    resultado["requestedLocation"] = {
    "latitude": lat,
    "longitude": lon
    }
    #print("WWO NORMALIZED:", resultado)
    #print("WWO META:", resultado.get("meta"))
    print("ANTES DE GRAVAR WWO MARINE NA BD")

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

        print(f"WWO MARINE GRAVADO: {inserted_count} medições")

    finally:
        conn.close()
        

    return resultados
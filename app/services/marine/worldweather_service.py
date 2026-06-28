import os
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from fastapi import HTTPException

from app.normalizers.marine_normalizer import normalize_wwo_marine
from app.db.database import get_connection
from app.db.save_marine_forecast import save_marine_forecast

# =====================================================
# CONFIG
# =====================================================


WWO_URL = "https://api.worldweatheronline.com/premium/v1/marine.ashx"

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

    # Pedido à API
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

    # Extração dos dados
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

    if not hourly_filtrado:
        raise HTTPException(
            status_code=404,
             detail="Sem dados horários WWO nas próximas 24 horas"
        )

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
    

    conn = get_connection()

    try:
        request_id = datetime.now(
            ZoneInfo("Europe/Lisbon")
        ).strftime("FOR_M-%y%m%d-%H%M")

        for resultado in resultados:

            inserted_count = save_marine_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=request_id,
                context_type="coastal"
            )

    finally:
        conn.close()
        
    return resultados
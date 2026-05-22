import os
from datetime import datetime

import requests
from fastapi import HTTPException

from pathlib import Path
from dotenv import load_dotenv

from app.normalizers.terrestrial_normalizer import normalize_openweather_terrestrial
from app.db.database import get_connection
from app.db.save_terrestrial_forecast import save_terrestrial_forecast


# =====================================================
# CONFIG
# =====================================================

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast"

BASE_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

# =====================================================
# SERVICES
# =====================================================

def get_openweather_terrestrial(lat: float, lon: float):

    api_key = os.getenv("OPENWEATHER_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="API key da OpenWeather não definida"
        )

    # 🔹 REQUEST
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric"  # importante → já vem em °C
    }

    response = requests.get(OPENWEATHER_URL, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()

    lista = data.get("list", [])

    if not lista:
        raise HTTPException(
            status_code=404,
            detail="Sem dados OpenWeather"
        )

    # BLOCO MAIS PRÓXIMO
    #bloco = get_nearest_openweather_block(lista)

    resultados = []

    for bloco in lista[:24]:

        resultado = normalize_openweather_terrestrial(
            lat=lat,
            lon=lon,
            data={
                "list": [bloco],
                "city": data.get("city")
            }
        )
        resultado["requestedLocation"] = {
            "latitude": lat,
            "longitude": lon
        }

        resultados.append(resultado)

    print("ANTES DE GRAVAR OPENWEATHER TERRESTRIAL NA BD")

    conn = get_connection()

    try:

        request_id = datetime.now().strftime("FOR_T-%y%m%d-%H%M")

        total_inserted = 0

        for resultado in resultados:

            inserted_count = save_terrestrial_forecast(
                conn=conn,
                normalized_data=resultado,
                request_id=request_id,
                context_type="drone"
            )

            total_inserted += inserted_count

        print(
            f"OPENWEATHER TERRESTRIAL GRAVADO: "
            f"{total_inserted} medições"
        )

    finally:
        conn.close()

    return resultados
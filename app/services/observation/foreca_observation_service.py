import os
import re
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv

from app.db.database import get_connection
from app.db.save_observation import save_observation
from app.normalizers.observation_normalizer import normalize_foreca_observation

# =====================================================
# CONFIG
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

FORECA_TOKEN = os.getenv("FORECA_TOKEN")

# =====================================================
# HELPERS
# =====================================================

def extrair_distancia_km(distance_text):
    if not distance_text:
        return float("inf")

    match = re.search(r"(\d+)", distance_text)

    if match:
        return float(match.group(1))

    return float("inf")


def get_foreca_observation(lat: float, lon: float):
    if not FORECA_TOKEN:
        raise ValueError("FORECA_TOKEN não encontrado no ficheiro .env")

    url = (
        f"https://pfa.foreca.com/api/v1/observation/latest/{lon},{lat}"
        f"?token={FORECA_TOKEN}&stations=3&windunit=KMH&tempunit=C&rounding=0&prec=1"
    )
    

    response = requests.get(url, timeout=15)
    response.raise_for_status()

    data = response.json()
    observations = data.get("observations", [])

    if not observations:
        return None

    obs = min(
        observations,
        key=lambda item: extrair_distancia_km(item.get("distance"))
)
    normalized = normalize_foreca_observation(obs)

    normalized["requestedLocation"] = {
        "latitude": lat,
        "longitude": lon
}
    print("REQUESTED LOCATION:", lat, lon)
    print("NORMALIZED REQUESTED:", normalized["requestedLocation"])
    
    print("ANTES DE GRAVAR FORECA NA BD")
    conn = get_connection()

    try:
        inserted_count = save_observation(
            conn=conn,
            normalized_data=normalized,
            request_id =datetime.now(ZoneInfo("Europe/Lisbon")).strftime("OBS-%y%m%d-%H%M"),
            context_type="drone"
        )

        print(f"FORECA GRAVADA: {inserted_count} medições")

    finally:
        conn.close()

    
    return normalized


    
import os,re
from pathlib import Path


import requests
from dotenv import load_dotenv

from app.normalizers.observation_normalizer import normalize_foreca_observation

BASE_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

FORECA_TOKEN = os.getenv("FORECA_TOKEN")

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
    return normalize_foreca_observation(obs)
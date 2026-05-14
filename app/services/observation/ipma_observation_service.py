import requests

from app.normalizers.observation_normalizer import normalize_ipma_observation
from app.utils.distance import haversine_km
from zoneinfo import ZoneInfo

IPMA_STATIONS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json"
IPMA_OBS_URL = "https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json"


from datetime import datetime
from app.db.database import get_connection
from app.db.save_observation import save_observation


def direcao_ipma_texto(id_direcc_vento):
    mapa = {
        0: "Sem rumo",
        1: "N",
        2: "NE",
        3: "E",
        4: "SE",
        5: "S",
        6: "SW",
        7: "W",
        8: "NW",
        9: "N",
    }
    return mapa.get(id_direcc_vento, None)


def get_ipma_observation(lat: float, lon: float):
    stations_response = requests.get(IPMA_STATIONS_URL, timeout=15)
    stations_response.raise_for_status()
    stations = stations_response.json()

    obs_response = requests.get(IPMA_OBS_URL, timeout=15)
    obs_response.raise_for_status()
    observations = obs_response.json()

    melhor_estacao = None
    melhor_observacao = None
    melhor_distancia = None

    timestamps = sorted(observations.keys(), reverse=True)

    for station in stations:
        coords = station.get("geometry", {}).get("coordinates", [])
        props = station.get("properties", {})

        if len(coords) != 2:
            continue

        station_lon, station_lat = coords[0], coords[1]
        id_estacao = props.get("idEstacao")
        nome_estacao = props.get("localEstacao")

        if id_estacao is None or nome_estacao is None:
            continue

        id_estacao = str(id_estacao)
        observacao_valida = None

        for timestamp in timestamps:
            estacoes = observations[timestamp]
            if id_estacao in estacoes and estacoes[id_estacao] is not None:
                observacao_valida = {
                    "time": timestamp,
                    "dados": estacoes[id_estacao]
                }
                break

        if observacao_valida is None:
            continue

        distancia = haversine_km(lat, lon, station_lat, station_lon)

        if melhor_estacao is None or distancia < melhor_distancia:
            melhor_estacao = {
                "station_id": id_estacao,
                "station_name": nome_estacao,
                "station_latitude": station_lat,
                "station_longitude": station_lon,
                "distance_km": round(distancia, 2),
            }
            melhor_observacao = observacao_valida
            melhor_distancia = distancia

    if melhor_estacao is None or melhor_observacao is None:
        return None

    dados = melhor_observacao["dados"]
    direcao_cardinal = direcao_ipma_texto(dados.get("idDireccVento"))

    normalized = normalize_ipma_observation(
        estacao=melhor_estacao,
        observacao=melhor_observacao,
        direcao_cardinal=direcao_cardinal
    )

    print("ANTES DE GRAVAR IPMA NA BD")

    conn = get_connection()

    try:
        inserted_count = save_observation(
            conn=conn,
            normalized_data=normalized,
            request_id =datetime.now(ZoneInfo("Europe/Lisbon")).strftime("OBS-%y%m%d-%H%M"),
            context_type="drone"
        )

        print(f"IPMA GRAVADA: {inserted_count} medições")

    finally:
        conn.close()

    return normalized
import re


def extrair_distancia_km(distance_text):
    if not distance_text:
        return None

    match = re.search(r"(\d+)", distance_text)

    if match:
        return float(match.group(1))

    return None

def valor_ipma(value):
    if value in (-99, -99.0):
        return None
    return value

def normalize_foreca_observation(obs: dict):
    visibilidade_m = obs.get("visibility")
    visibilidade_km = None

    if visibilidade_m is not None:
        visibilidade_km = round(visibilidade_m / 1000, 2)

    precipitacao_mm = None
    precipitacao_periodo = None
    prioridades = ["1h", "3h", "6h", "12h", "24h"]

    for periodo in prioridades:
        for item in obs.get("precipitation", []):
            if item.get("period") == periodo:
                precipitacao_mm = item.get("accum")
                precipitacao_periodo = item.get("period")
                break
        if precipitacao_mm is not None:
            break


    return {
        "source": "foreca",
        "station": {
            "name": obs.get("station"),
            "id": None,
            "distanceKm": extrair_distancia_km(obs.get("distance")),
            #"distanceKm": None,
            "latitude": obs.get("latitude"),
            "longitude": obs.get("longitude"),
            "elevationM": obs.get("elevation"),
        },
        "observation": {
            "dataHora": obs.get("time"),
            "temperaturaC": obs.get("temperature"),
            "ventoVelocidadeKmh": obs.get("windSpeed"),
            "ventoDirecaoGraus": obs.get("windDir"),
            "ventoDirecaoCardinal": obs.get("windDirString"),
            "precipitacaoMm": precipitacao_mm,
            "precipitacaoPeriodo": precipitacao_periodo,
            "humidade": obs.get("relHumidity"),
            "visibilidadeKm": visibilidade_km,
            "pressaoHpa": obs.get("pressure"),
            "rajadaVentoKmh": obs.get("windGust"),
        },
    }


def normalize_ipma_observation(estacao: dict, observacao: dict, direcao_cardinal: str):
    dados = observacao.get("dados", {}) if observacao else {}

    return {
        "source": "ipma",
        "station": {
            "name": estacao.get("station_name") if estacao else None,
            "id": estacao.get("station_id") if estacao else None,
            "distanceKm": estacao.get("distance_km") if estacao else None,
            "latitude": estacao.get("station_latitude") if estacao else None,
            "longitude": estacao.get("station_longitude") if estacao else None,
            "elevationM": None,
        },
        "observation": {
            "dataHora": observacao.get("time") if observacao else None,
            "temperaturaC": valor_ipma(dados.get("temperatura")),
            "ventoVelocidadeKmh": valor_ipma(dados.get("intensidadeVentoKM")),
            "ventoDirecaoGraus": None,
            "ventoDirecaoCardinal": direcao_cardinal,
            "precipitacaoMm": valor_ipma(dados.get("precAcumulada")),
            "precipitacaoPeriodo": "1h",
            "humidade": valor_ipma(dados.get("humidade")),
            "visibilidadeKm": None,
           "pressaoHpa": valor_ipma(dados.get("pressao")),
           "rajadaVentoKmh": None,
        
        },
    }
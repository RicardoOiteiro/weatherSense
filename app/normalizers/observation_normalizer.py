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

def split_date_hour(date_time):
    if not date_time:
        return None, None

    parts = date_time.split("T")
    date = parts[0]
    hour = parts[1][:5] if len(parts) > 1 else None

    return date, hour

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
    

    data_hora = obs.get("time")
    date, hour = split_date_hour(data_hora)


    return {
        "source": "foreca",
        "meta": {
            "dataNature": "Observation",
            "temporalResolution": "Hourly",

        },
        "station": {
            "name": obs.get("station"),
            #"id": None,
            "distanceKm": extrair_distancia_km(obs.get("distance")),
            #"distanceKm": None,
            "latitude": obs.get("latitude"),
            "longitude": obs.get("longitude"),
            "elevationM": obs.get("elevation"),
        },
        "time": {
            "date" : date,
            "hour": hour

        },
        "observation": {
            #"dataHora": obs.get("time"),
            "temperatureC": obs.get("temperature"),
            "windSpeedKmh": obs.get("windSpeed"),
            "windDirectionDegrees": obs.get("windDir"),
            "windDirectionCardinal": obs.get("windDirString"),
            "precipitationMm": precipitacao_mm,
            "precipitationPeriod": precipitacao_periodo,
            "humidityPercent": obs.get("relHumidity"),
            "visibilityKm": visibilidade_km,
            "pressureHpa": obs.get("pressure"),
            "windGustKmh": obs.get("windGust"),
        },
    }


def normalize_ipma_observation(estacao: dict, observacao: dict, direcao_cardinal: str):
    dados = observacao.get("dados", {}) if observacao else {}

    data_hora = observacao.get("time") if observacao else None
    date, hour = split_date_hour(data_hora)

    return {
        "source": "ipma",
        "meta": {
            "dataNature": "observation",
            "temporalResolution": "hourly",
        },
        "station": {
            "name": estacao.get("station_name") if estacao else None,
            #"id": estacao.get("station_id") if estacao else None,
            "distanceKm": estacao.get("distance_km") if estacao else None,
            "latitude": estacao.get("station_latitude") if estacao else None,
            "longitude": estacao.get("station_longitude") if estacao else None,
            "elevationM": None,
        },
        "time": {
            "date": date,
            "hour": hour,
        },
        "observation": {
            #"dataHora": observacao.get("time") if observacao else None,
            "temperatureC": valor_ipma(dados.get("temperatura")),
            "windSpeedKmh": valor_ipma(dados.get("intensidadeVentoKM")),
            "windDirectionDegrees": None,
            "windDirectionCardinal": direcao_cardinal,
            "precipitationMm": valor_ipma(dados.get("precAcumulada")),
            "precipitationPeriod": "1h",
            "humidityPercent": valor_ipma(dados.get("humidade")),
            "visibilityKm": None,
            "pressureHpa": valor_ipma(dados.get("pressao")),
            "windGustKmh": None,
        
        },
    }
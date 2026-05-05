def para_float(valor):
    if valor in (None, "", "null"):
        return None
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def para_int(valor):
    if valor in (None, "", "null"):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def get_lista_valor(dados: dict, campo: str, index: int):
    valores = dados.get(campo)

    if not valores:
        return None

    try:
        return valores[index]
    except (IndexError, TypeError):
        return None


def extrair_data(data_hora: str):
    if not data_hora:
        return None

    return data_hora.split("T")[0]


def get_daily_index_by_date(daily: dict, data: str):
    datas = daily.get("time", [])

    if not datas or not data:
        return None

    try:
        return datas.index(data)
    except ValueError:
        return None


def map_openmeteo_model(model: str):
    mapping = {
        "ecmwf_ifs": "IFS e AIFS (ECMWF)",
        "icon_eu": "ICON",
        "meteofrance_arpege_europe": "ARPEGE & AROME",
    }

    return mapping.get(model, model)

def split_date_hour(date_time):
    if not date_time:
        return None, None

    if "T" in date_time:
        parts = date_time.split("T")
    else:
        parts = date_time.split(" ")

    date = parts[0]
    hour = parts[1][:5] if len(parts) > 1 else None

    return date, hour

def normalize_openmeteo_terrestrial(lat: float, lon: float, distance_km: float, hourly: dict, daily: dict, index: int, model: str):
    data_hora = get_lista_valor(hourly, "time", index)
    date, hour = split_date_hour(data_hora)
    data = extrair_data(data_hora)
    daily_index = get_daily_index_by_date(daily, data)

    return {
        "source": "open-meteo",
        "meta": {
            "model": map_openmeteo_model(model),
            "dataNature": "forecast",
            "temporalResolution": "daily/hourly",
            "updateIntervalHours": "Não definido N/A"
        },
        "location": {
            "latitude": lat,
            "longitude": lon,
            "distanceKm" : distance_km
        },
        "time": {
            "date": date,
            "hour": hour,
            
        },
        "weather": {
            "temperatureC": para_float(get_lista_valor(hourly, "temperature_2m", index)),
            "temperatureMinC": para_float(get_lista_valor(daily, "temperature_2m_min", daily_index)) if daily_index is not None else None,
            "temperatureMaxC": para_float(get_lista_valor(daily, "temperature_2m_max", daily_index)) if daily_index is not None else None,
            "feelsLikeTemperatureC": para_float(get_lista_valor(hourly, "apparent_temperature", index)),
            "humidityPercent": para_int(get_lista_valor(hourly, "relative_humidity_2m", index)),
            "pressureHpa": para_float(get_lista_valor(hourly, "pressure_msl", index)),
            "cloudCoverPercent": para_int(get_lista_valor(hourly, "cloud_cover", index)),
            "visibilityKm": (
                para_float(get_lista_valor(hourly, "visibility", index)) / 1000
                if get_lista_valor(hourly, "visibility", index) is not None
                else None
            ),
            #"codigoTempo": para_int(get_lista_valor(hourly, "weather_code", index)),
        },
        "wind": {
            "windSpeedKmh": para_float(get_lista_valor(hourly, "wind_speed_10m", index)),
            "windSpeedMaxKmh": para_float(get_lista_valor(daily, "wind_speed_10m_max", daily_index)) if daily_index is not None else None,
            "windGustKmh": para_float(get_lista_valor(hourly, "wind_gusts_10m", index)),
            "windDirectionDegrees": para_float(get_lista_valor(hourly, "wind_direction_10m", index)),
            "windDirectionCardinal": None,
        },
        "precipitation": {
            "precipitationMm": para_float(get_lista_valor(hourly, "precipitation", index)),
            "precipitationProbabilityPercent": None,
            
        },
        "risk": {
            "strongWindProbabilityPercent": None,
            "fogProbabilityPercent": None,
            "thunderstormProbabilityPercent": None,
        },
        "sun": {
            "sunrise": get_lista_valor(daily, "sunrise", daily_index) if daily_index is not None else None,
            "sunset": get_lista_valor(daily, "sunset", daily_index) if daily_index is not None else None,
        },
    }


def normalize_ipma_terrestrial(
    requested_lat: float,
    requested_lon: float,
    location: dict,
    forecast: dict,
    aggregate_current: dict,
    data_update: str,
    global_id
):
    data_hora = aggregate_current.get("dataPrev") or forecast.get("dataPrev")
    date, hour = split_date_hour(data_hora)

    return {
        "source": "ipma",
        "meta": {
            "model": "ECMWF + AROME",
            "dataNature": "forecast",
            "temporalResolution": "daily/hourly",
            "updateIntervalHours": "12"
        },
        "location": {
            #"requestedLatitude": requested_lat,
            #"requestedLongitude": requested_lon,
            "latitude": para_float(location.get("latitude")),
            "longitude": para_float(location.get("longitude")),
            #"local": location.get("local"),
            #"globalIdLocal": global_id,
            "distanceKm": round(para_float(location.get("distanceKm")),2),
        },
        "time": {
            "date": date,
            "hour": hour,
            "dataUpdate": aggregate_current.get("dataUpdate") or data_update,
        },
        "weather": {
            "temperatureC": para_float(aggregate_current.get("tMed")),
            "temperatureMinC": para_float(forecast.get("tMin")),
            "temperatureMaxC": para_float(forecast.get("tMax")),
            "feelsLikeTemperatureC": para_float(aggregate_current.get("utci")),
            "pressureHpa": para_float(aggregate_current.get("hR")),
            "pressureHpa": None,
            "cloudCoverPercent": None,
            "visibilidadeKm": None,
            #"codigoTempo": para_int(
            #   aggregate_current.get("idTipoTempo")
            #   or forecast.get("idTipoTempo")
            #    or forecast.get("idWeatherType")
            #),
        },
        "wind": {
            "precipitationMm": para_float(aggregate_current.get("ffVento")),
            "windSpeedMaxKmh": None,
            "windGustKmh": None,
            "windDirectionDegrees": None,
            "windDirectionCardinal": (
                aggregate_current.get("ddVento")
                or forecast.get("ddVento")
                or forecast.get("predWindDir")
            ),
        },
        "precipitation": {
            "precipitationMm": None,
            "precipitationProbabilityPercent": para_float(
                aggregate_current.get("probabilidadePrecipita")
                or forecast.get("probabilidadePrecipita")
                or forecast.get("precipitaProb")
            ),
            #"intensidadePrecipitacao": (
            #    aggregate_current.get("idIntensidadePrecipita")
            #    or forecast.get("idIntensidadePrecipita")
            #    or forecast.get("classPrecInt")
            #),
        },
        "risk": {
            "strongWindProbabilityPercent": None,
            "fogProbabilityPercent": None,
            "thunderstormProbabilityPercent": None,
        },
        "sun": {
            "sunrise": None,
            "porSol": None,
        },
    }


from datetime import datetime

def get_nearest_openweather_block(lista: list[dict]) -> dict:
    now = datetime.now()

    def block_datetime(block):
        dt_txt = block.get("dt_txt")

        if not dt_txt:
            return now

        return datetime.fromisoformat(dt_txt)

    return min(
        lista,
        key=lambda block: abs(block_datetime(block) - now)
    )
def normalize_openweather_terrestrial(lat, lon, data):

    lista = data.get("list", [])
    city = data.get("city", {})

    if not lista:
        return None

    # 🔹 escolher bloco mais próximo (igual à tua lógica WWO)
    bloco = get_nearest_openweather_block(lista) #Assim já escolhe automaticamente o bloco de 3h mais próximo da hora atual.

    data_hora = bloco.get("dt_txt")
    date, hour = split_date_hour(data_hora)

    rain = bloco.get("rain", {})
    wind = bloco.get("wind", {})
    main = bloco.get("main", {})
    clouds = bloco.get("clouds", {})

    return {
        "source": "openweather",
        "meta": {
            "model": "Modelo Proprietário - OpenWeather",
            "dataNature": "Previsão",
            "temporalResolution": "horaria/diaria",
            "updateIntervalHours": "A cada 3 horas;"
        },
        "location": {
            "latitude": city.get("coord", {}).get("lat"),
            "longitude": city.get("coord", {}).get("lon"),
            "distanceKm": 0  # OpenWeather é direto
        },
        "time": {
            "date": date,
            "hour": hour,
        },
        "weather": {
            "temperatureC": para_float(main.get("temp")),
            "temperatureMinC": para_float(main.get("temp_min")),
            "temperatureMaxC": para_float(main.get("temp_max")),
            "feelsLikeTemperatureC": None,
            "humidityPercent": para_float(main.get("humidity")),
            "pressureHpa": para_float(main.get("pressure")),
            "cloudCoverPercent": para_float(clouds.get("all")),
            "visibilityKm": (
                para_float(bloco.get("visibility")) / 1000
                if bloco.get("visibility") else None
            ),
        },
        "wind": {
            "windSpeedKmh": round(para_float(wind.get("speed")) * 3.6, 2),
            "windSpeedMaxKmh": None,
            "windGustKmh": round(para_float(wind.get("gust")) * 3.6,2),
            "windDirectionDegrees": para_float(wind.get("deg")),
            "windDirectionCardinal": None,
        },
        "precipitation": {
            "precipitationMm": para_float(rain.get("1h")) if rain else None,
            "precipitationProbabilityPercent": (
                para_float(bloco.get("pop")) * 100
                if bloco.get("pop") is not None else None
            ),
        },
        "risk": {
            "strongWindProbabilityPercent": None,
            "fogProbabilityPercent": None,
            "thunderstormProbabilityPercent": None,
        },
        "sun": {
            "sunrise": None,
            "sunset": None,
        },
    }
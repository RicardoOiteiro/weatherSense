from datetime import datetime
# =====================================================
# HELPERS
# =====================================================

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

def extract_hour_only(datetime_text):
    if not datetime_text:
        return None

    if "T" in datetime_text:
        return datetime_text.split("T")[1][:5]

    return datetime_text[:5]

def extrair_data(data_hora: str):
    if not data_hora:
        return None

    return data_hora.split("T")[0]

def get_lista_valor(dados: dict, campo: str, index: int):
    valores = dados.get(campo)

    if not valores:
        return None

    try:
        return valores[index]
    except (IndexError, TypeError):
        return None
    
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
        "ecmwf_ifs": "ECMWF",
        "icon_eu": "ICON",
        "meteofrance_arpege_europe": "ARPEGE & AROME",
    }

    return mapping.get(model, model)

# =====================================================
# NORMALIZERS
# =====================================================

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
            "distanceKm": distance_km
        },
        "time": {
            "date": date,
            "hour": hour,
            
        },
        "weather": {
            "temperatureC": para_float(get_lista_valor(hourly, "temperature_2m", index)),
            "temperatureMinC": para_float(get_lista_valor(daily, "temperature_2m_min", daily_index)) if daily_index is not None else None,
            "temperatureMaxC": para_float(get_lista_valor(daily, "temperature_2m_max", daily_index)) if daily_index is not None else None,
            "humidityPercent": para_int(get_lista_valor(hourly, "relative_humidity_2m", index)),
            "pressureHpa": para_float(get_lista_valor(hourly, "pressure_msl", index)),
            "cloudCoverPercent": para_int(get_lista_valor(hourly, "cloud_cover", index)),
            "visibilityKm": (
                para_float(get_lista_valor(hourly, "visibility", index)) / 1000
                if get_lista_valor(hourly, "visibility", index) is not None
                else None
            ),
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
        "sun": {
            "sunriseH": extract_hour_only(
                get_lista_valor(daily, "sunrise", daily_index)
            ) if daily_index is not None else None,
             "sunsetH": extract_hour_only(
                get_lista_valor(daily, "sunset", daily_index)
            ) if daily_index is not None else None,
        },
    }


def normalize_ipma_terrestrial(
    requested_lat: float,
    requested_lon: float,
    location: dict,
    aggregate_current: dict,
    data_update: str,
):
    
    data_hora = aggregate_current.get("dataPrev")
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
            "latitude": para_float(location.get("latitude")),
            "longitude": para_float(location.get("longitude")),
            "distanceKm": round(para_float(location.get("distanceKm")),2),
        },
        "time": {
            "date": date,
            "hour": hour,
            "dataUpdate": aggregate_current.get("dataUpdate") or data_update,
        },
        "weather": {
            "temperatureC": para_float(aggregate_current.get("tMed")),
            "temperatureMinC": para_float(aggregate_current.get("tMin")),
            "temperatureMaxC": para_float(aggregate_current.get("tMax")),    
            "feelsLikeTemperatureC": para_float(aggregate_current.get("utci")),
            "humidityPercent": para_float(aggregate_current.get("hR")),
            "pressureHpa": None,
            "cloudCoverPercent": None,
            "visibilityKm": None,
        },
        "wind": {
            "windSpeedKmh": para_float(aggregate_current.get("ffVento")),
            "windGustKmh": None,
            "windDirectionDegrees": None,
            "windDirectionCardinal": (
                aggregate_current.get("ddVento")
            ),
        },
        "precipitation": {
            "precipitationMm": None,
            "precipitationProbabilityPercent": para_float(
                aggregate_current.get("probabilidadePrecipita")
            ),
        },
        "sun": {
            "sunrise": None,
            "porSol": None,
        },
    }


def normalize_openweather_terrestrial(lat, lon, data):

    lista = data.get("full_list", data.get("list", []))
    city = data.get("city", {})

    if not lista:
        return None


    bloco = data.get("current_block") or lista[0]

    data_hora = bloco.get("dt_txt")
    date, hour = split_date_hour(data_hora)

    rain = bloco.get("rain", {})
    wind = bloco.get("wind", {})
    main = bloco.get("main", {})
    clouds = bloco.get("clouds", {})

    # =====================================
    # TEMPERATURA ATUAL
    # =====================================

    temp = para_float(main.get("temp"))

    # =====================================
    # MIN/MAX DO DIA
    # =====================================

    temperaturas_dia = []

    for item in lista:

        item_data_hora = item.get("dt_txt")

        if not item_data_hora:
            continue

        item_date, _ = split_date_hour(item_data_hora)

        # Apenas previsões do mesmo dia
        if item_date == date:

            item_temp = para_float(
                item.get("main", {}).get("temp")
            )

            if item_temp is not None:
                temperaturas_dia.append(item_temp)

    temp_min = (
        min(temperaturas_dia)
        if temperaturas_dia else None
    )

    temp_max = (
        max(temperaturas_dia)
        if temperaturas_dia else None
    )

    # =====================================
    # VENTO
    # =====================================

    wind_speed = para_float(wind.get("speed"))
    wind_gust = para_float(wind.get("gust"))
    return {
        "source": "openweather",

        "meta": {
            "model": "Modelo Proprietário - OpenWeather",
            "dataNature": "forecast",
            "temporalResolution": "horaria/diaria",
            "updateIntervalHours": "A cada 3 horas;"
        },

        "location": {
            "latitude": city.get("coord", {}).get("lat"),
            "longitude": city.get("coord", {}).get("lon"),
            "distanceKm": 0
        },

        "time": {
            "date": date,
            "hour": hour,
        },

        "weather": {

            "temperatureC": temp,

            "temperatureMinC": temp_min,

            "temperatureMaxC": temp_max,

            "feelsLikeTemperatureC": None,

            "humidityPercent": para_float(
                main.get("humidity")
            ),

            "pressureHpa": para_float(
                main.get("pressure")
            ),

            "cloudCoverPercent": para_float(
                clouds.get("all")
            ),

            "visibilityKm": (
                para_float(bloco.get("visibility")) / 1000
                if bloco.get("visibility") is not None
                else None
            ),
        },

        "wind": {

            "windSpeedKmh": (
                round(wind_speed * 3.6, 2)
                if wind_speed is not None
                else None
            ),

            "windSpeedMaxKmh": None,

            "windGustKmh": (
                round(wind_gust * 3.6, 2)
                if wind_gust is not None
                else None
            ),

            "windDirectionDegrees": para_float(
                wind.get("deg")
            ),

            "windDirectionCardinal": None,
        },

        "precipitation": {

            "precipitationMm": (
                para_float(rain.get("1h"))
                if rain else None
            ),

            "precipitationProbabilityPercent": (
                para_float(bloco.get("pop")) * 100
                if bloco.get("pop") is not None
                else None
            ),
        },

        "sun": {
            "sunriseH": None,
            "sunsetH": None,
        },
    }
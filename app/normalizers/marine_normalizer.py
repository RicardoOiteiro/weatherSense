from datetime import datetime, timedelta

# =====================================================
# HELPERS
# =====================================================

def normalizar_hora_wwo(time_value):
    if time_value is None:
        return None

    time_str = str(time_value).zfill(4)
    horas = time_str[:2]
    minutos = time_str[2:]

    return f"{horas}:{minutos}"

def para_float(valor):
    if valor in (None, "", "null"):
        return None
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def juntar_data_hora_wwo(data, time_value):
    hora = normalizar_hora_wwo(time_value)

    if not data or not hora:
        return None

    return f"{data}T{hora}"

def split_date_hour(date_time):
    if not date_time:
        return None, None

    parts = date_time.split("T")
    date = parts[0]
    hour = parts[1][:5] if len(parts) > 1 else None

    return date, hour
   

# =====================================================
# NORMALIZERS
# =====================================================

def normalize_wwo_marine(lat: float, lon: float, distance_km: float, date: str, hourly: dict):
    data_hora = juntar_data_hora_wwo(date, hourly.get("time"))
    date, hour = split_date_hour(data_hora)
    return {
        "source": "worldweatheronline",
        "meta":{
            "model": "Modelo Proprietario - WWO",
            "dataNature": "forecast",
            "temporalResolution": "horaria",
            "updateIntervalHours": "Não definido N/A"
            
        },
        "location": {
            "latitude": lat,
            "longitude": lon,
            "distanceKm": distance_km,
        },
        "time": {
            #"dataHora": juntar_data_hora_wwo(date, hourly.get("time")),
            "date": date,
            "hour": hour,
        },
        "marine": {
            "waveHeightM": para_float(hourly.get("sigHeight_m")),
            "waveHeightMinM": None,
            "waveHeightMaxM": None,
            "totalSeaMinM": None,
            "totalSeaMaxM": None,
            "waveDirectionDegrees": None,
            "waveDirectionCardinal": None,
            "wavePeriodS": None,
            "wavePeriodMinS": None,
            "wavePeriodMaxS": None,
            "wavePeakPeriodS": None,
            "swellHeightM": para_float(hourly.get("swellHeight_m")),
            "swellDirectionDegrees": para_float(hourly.get("swellDir")),
            "swellDirectionCardinal": hourly.get("swellDir16Point"),
            "swellPeriodS": para_float(hourly.get("swellPeriod_secs")),
            "waterTemperatureC": para_float(hourly.get("waterTemp_C")),
            "waterTemperatureMinC": None,
            "waterTemperatureMaxC": None,
        },
        "wind": {
            "windSpeedKmh": para_float(hourly.get("windspeedKmph")),
            "windDirectionDegrees": para_float(hourly.get("winddirDegree")),
            "windDirectionCardinal": hourly.get("winddir16Point"),
            "windGustKmh": para_float(hourly.get("WindGustKmph")),
        },
        "current": {
            "currentSpeedMs": None,
            "currentDirectionDegrees": None,
        },
    }


def normalize_openmeteo_marine(lat: float, lon: float, distance_km: float, hourly: dict, index: int, model: str = None):
    data_hora = hourly.get("time", [None])[index]
    date, hour = split_date_hour(data_hora)
    return {
        "source": "open-meteo",
       "meta":{
            "model": "Multi-model (DWD EWAM)",
            "dataNature": "forecast",
            "temporalResolution": "horaria",
            "updateIntervalHours": "12"
        },
        "location": {
            "latitude": lat,
            "longitude": lon,
            "distanceKm": distance_km,
        },
        "time": {
            #"dataHora": hourly.get("time", [None])[index],
            "date": date,
            "hour": hour,
        },
        "marine": {
            "waveHeightM": hourly.get("wave_height", [None])[index],
            "waveHeightMinM": None,
            "waveHeightMaxM": None,
            "totalSeaMinM": None,
            "totalSeaMaxM": None,
            "waveDirectionDegrees": hourly.get("wave_direction", [None])[index],
            "waveDirectionCardinal": None,
            "wavePeriodS": hourly.get("wave_period", [None])[index],
            "wavePeriodMinS": None,
            "wavePeriodMaxS": None,
            "wavePeakPeriodS": hourly.get("wave_peak_period", [None])[index],
            "swellHeightM": hourly.get("swell_wave_height", [None])[index],
            "swellDirectionDegrees": hourly.get("swell_wave_direction", [None])[index],
            "swellDirectionCardinal": None,
            "swellPeriodS": hourly.get("swell_wave_period", [None])[index],
            "waterTemperatureC": hourly.get("sea_surface_temperature", [None])[index],
            "waterTemperatureMinC": None,
            "waterTemperatureMaxC": None,
        },
        "wind": {
            "windSpeedKmh": None,
            "windDirectionDegrees": None,
            "windDirectionCardinal": None,
            "windGustKmh": None,
        },
        "current": {
            "currentSpeedMs": hourly.get("ocean_current_velocity", [None])[index],
            "currentDirectionDegrees": hourly.get("ocean_current_direction", [None])[index],
        },
    }

def normalize_ipma_marine(requested_lat, requested_lon, location, forecast, daily, id_day):
    update_date, update_hour = split_date_hour(forecast.get("dataUpdate"))
    forecast_date = (
        datetime.now() + timedelta(days=id_day)
    ).strftime("%Y-%m-%d")
    return {
        "source": "ipma",
        "meta":{
            "model": "ECMWF + AROME",
            "dataNature": "forecast",
            "temporalResolution": "diaria",
            "updateIntervalHours": "2x/dia -> 12h"
        },
        "location": {
            #"requestedLatitude": requested_lat,
            #"requestedLongitude": requested_lon,
            "latitude": para_float(location.get("latitude")),
            "longitude": para_float(location.get("longitude")),
            #"local": location.get("local"),
            #"globalIdLocal": location.get("globalIdLocal"),
            "distanceKm": location.get("distanceKm"),
            "distanceNm": location.get("distanceNm"),
            "name": location.get("local"),
            

        },
        "time": {
            "date": forecast_date,
            "hour": "00:00",
            "dataUpdate": forecast.get("dataUpdate"),
        },
        "marine": {
            "waveHeightM": None,
            "waveHeightMinM": para_float(daily.get("waveHighMin")),
            "waveHeightMaxM": para_float(daily.get("waveHighMax")),
            "totalSeaMinM": para_float(daily.get("totalSeaMin")),
            "totalSeaMaxM": para_float(daily.get("totalSeaMax")),
            "waveDirectionDegrees": None,
            "waveDirectionCardinal": daily.get("predWaveDir"),
            "wavePeriodS": None,
            "wavePeriodMinS": para_float(daily.get("wavePeriodMin")),
            "wavePeriodMaxS": para_float(daily.get("wavePeriodMax")),
            "wavePeakPeriodS": None,
            "swellHeightM": None,
            "swellDirectionDegrees": None,
            "swellDirectionCardinal": daily.get("predWaveDir"),
            "swellPeriodS": None,
            "waterTemperatureC": None,
            "waterTemperatureMinC": para_float(daily.get("sstMin")),
            "waterTemperatureMaxC": para_float(daily.get("sstMax")),
        },
        "wind": {
            "windSpeedKmh": None,
            "windDirectionDegrees": None,
            "windDirectionCardinal": None,
            "windGustKmh": None,
        },
        "current": {
            "currentSpeedMs": None,
            "currentDirectionDegrees": None,
        },
        "requestedLocation": {
            "latitude": requested_lat,
            "longitude": requested_lon,
        },
    }
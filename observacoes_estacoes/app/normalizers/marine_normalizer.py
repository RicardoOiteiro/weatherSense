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


def normalize_wwo_marine(lat: float, lon: float, date: str, hourly: dict,):
    return {
        "source": "worldweatheronline",
        "meta":{
            "model": "Modelo Proprietario - WWO",
            "natureza_dado": "Previsão",
            "resolucao_temporal": "horaria",
            "intervalo_atualizacao_hora": "Não definido N/A"
            
        },
        "location": {
            "latitude": lat,
            "longitude": lon,
        },
        "time": {
            "dataHora": juntar_data_hora_wwo(date, hourly.get("time")),
            "data": date,
        },
        "marine": {
            "alturaOndasM": para_float(hourly.get("sigHeight_m")),
            "alturaOndasMinM": None,
            "alturaOndasMaxM": None,
            "alturaMarTotalMinM": None,
            "alturaMarTotalMaxM": None,
            "direcaoOndasGraus": None,
            "direcaoOndasCardinal": None,
            "periodoOndasS": None,
            "periodoOndasMinS": None,
            "periodoOndasMaxS": None,
            "periodoPicoOndasS": None,
            "alturaOndulacaoM": para_float(hourly.get("swellHeight_m")),
            "direcaoOndulacaoGraus": para_float(hourly.get("swellDir")),
            "direcaoOndulacaoCardinal": hourly.get("swellDir16Point"),
            "periodoOndulacaoS": para_float(hourly.get("swellPeriod_secs")),
            "temperaturaAguaC": para_float(hourly.get("waterTemp_C")),
            "temperaturaAguaMinC": None,
            "temperaturaAguaMaxC": None,
        },
        "wind": {
            "velocidadeVentoKmh": para_float(hourly.get("windspeedKmph")),
            "direcaoVentoGraus": para_float(hourly.get("winddirDegree")),
            "direcaoVentoCardinal": hourly.get("winddir16Point"),
            "rajadaVentoKmh": para_float(hourly.get("WindGustKmph")),
        },
        "current": {
            "velocidadeCorrenteMs": None,
            "direcaoCorrenteGraus": None,
        },
    }


def normalize_openmeteo_marine(lat: float, lon: float, hourly: dict, index: int, model: str = None):
    return {
        "source": "open-meteo",
       "meta":{
            "model": "Multi-model (DWD EWAM)",
            "natureza_dado": "Previsão",
            "resolucao_temporal": "horaria",
            "intervalo_atualizacao_hora": "12"
        },
        "location": {
            "latitude": lat,
            "longitude": lon,
        },
        "time": {
            "dataHora": hourly.get("time", [None])[index],
            "data": None,
        },
        "marine": {
            "alturaOndasM": hourly.get("wave_height", [None])[index],
            "alturaOndasMinM": None,
            "alturaOndasMaxM": None,
            "alturaMarTotalMinM": None,
            "alturaMarTotalMaxM": None,
            "direcaoOndasGraus": hourly.get("wave_direction", [None])[index],
            "direcaoOndasCardinal": None,
            "periodoOndasS": hourly.get("wave_period", [None])[index],
            "periodoOndasMinS": None,
            "periodoOndasMaxS": None,
            "periodoPicoOndasS": hourly.get("wave_peak_period", [None])[index],
            "alturaOndulacaoM": hourly.get("swell_wave_height", [None])[index],
            "direcaoOndulacaoGraus": hourly.get("swell_wave_direction", [None])[index],
            "direcaoOndulacaoCardinal": None,
            "periodoOndulacaoS": hourly.get("swell_wave_period", [None])[index],
            "temperaturaAguaC": hourly.get("sea_surface_temperature", [None])[index],
            "temperaturaAguaMinC": None,
            "temperaturaAguaMaxC": None,
        },
        "wind": {
            "velocidadeVentoKmh": None,
            "direcaoVentoGraus": None,
            "direcaoVentoCardinal": None,
            "rajadaVentoKmh": None,
        },
        "current": {
            "velocidadeCorrenteMs": hourly.get("ocean_current_velocity", [None])[index],
            "direcaoCorrenteGraus": hourly.get("ocean_current_direction", [None])[index],
        },
    }

def normalize_ipma_marine(requested_lat, requested_lon, location, forecast, daily):
    return {
        "source": "ipma",
        "meta":{
            "model": "ECMWF + AROME",
            "natureza_dado": "Previsão",
            "resolucao_temporal": "diaria",
            "intervalo_atualizacao_hora": "2x/dia -> 12h"
        },
        "location": {
            "requestedLatitude": requested_lat,
            "requestedLongitude": requested_lon,
            "latitude": para_float(location.get("latitude")),
            "longitude": para_float(location.get("longitude")),
            "local": location.get("local"),
            "globalIdLocal": location.get("globalIdLocal"),
            "distanceKm": location.get("distanceKm"),
            "distanceNm": location.get("distanceNm"),
        },
        "time": {
            "dataHora": None,
            "data": forecast.get("forecastDate"),
            "dataUpdate": forecast.get("dataUpdate"),
        },
        "marine": {
            "alturaOndasM": None,
            "alturaOndasMinM": para_float(daily.get("waveHighMin")),
            "alturaOndasMaxM": para_float(daily.get("waveHighMax")),
            "alturaMarTotalMinM": para_float(daily.get("totalSeaMin")),
            "alturaMarTotalMaxM": para_float(daily.get("totalSeaMax")),
            "direcaoOndasGraus": None,
            "direcaoOndasCardinal": daily.get("predWaveDir"),
            "periodoOndasS": None,
            "periodoOndasMinS": para_float(daily.get("wavePeriodMin")),
            "periodoOndasMaxS": para_float(daily.get("wavePeriodMax")),
            "periodoPicoOndasS": None,
            "alturaOndulacaoM": None,
            "direcaoOndulacaoGraus": None,
            "direcaoOndulacaoCardinal": daily.get("predWaveDir"),
            "periodoOndulacaoS": None,
            "temperaturaAguaC": None,
            "temperaturaAguaMinC": para_float(daily.get("sstMin")),
            "temperaturaAguaMaxC": para_float(daily.get("sstMax")),
        },
        "wind": {
            "velocidadeVentoKmh": None,
            "direcaoVentoGraus": None,
            "direcaoVentoCardinal": None,
            "rajadaVentoKmh": None,
        },
        "current": {
            "velocidadeCorrenteMs": None,
            "direcaoCorrenteGraus": None,
        },
    }
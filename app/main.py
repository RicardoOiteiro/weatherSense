from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.observation.foreca_observation_service import get_foreca_observation
from app.services.observation.ipma_observation_service import get_ipma_observation
from app.utils.excel_storage import guardar_json_normalizado_em_excel
from app.services.marine.worldweather_service import get_wwo_marine
from app.services.marine.openmeteo_marine_service import get_openmeteo_marine
from app.services.marine.ipma_marine_service import get_ipma_marine_daily
from app.services.terrestrial.openmeteo_terrestrial_service import get_openmeteo_terrestrial_all_models
from app.services.terrestrial.ipma_terrestrial_service import get_ipma_terrestrial
from app.services.terrestrial.openweather_terrestrial_service import get_openweather_terrestrial
from app.db.database import get_connection

from datetime import datetime, date, time
from zoneinfo import ZoneInfo


app = FastAPI(title="Projeto Meteorológico API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/frontend", StaticFiles(directory="app/frontend"), name="frontend")


@app.get("/")
def root():
    return FileResponse("app/frontend/index.html")


@app.get("/weather/observation")
def get_weather_observation(lat: float, lon: float):
    try:
        foreca_data = get_foreca_observation(lat, lon)
        #print("FORECA OK")
        ipma_data = get_ipma_observation(lat, lon)
        #print("IPMA OK")

        resultado_final = {
            "requested_location": {
                "latitude": lat,
                "longitude": lon
            },
            "foreca": foreca_data,
            "ipma": ipma_data
        }
    
        #guardar_json_normalizado_em_excel(resultado_final)

        return resultado_final

    except Exception as e:
        print("ERRO OBSERVATION:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/weather/marine")
def get_weather_marine(lat: float, lon: float):
    try:
        wwo_data = get_wwo_marine(lat, lon)
        print("WWO DATA:", wwo_data)
        print("WWO OK")

        openmeteo_data = get_openmeteo_marine(lat, lon)
        print("OPENMETEO MARINE OK")

        ipma_data = get_ipma_marine_daily(lat, lon, 0)
        print("IPMA MARINE OK")

        return {
            "requested_location": {
                "latitude": lat,
                "longitude": lon
            },
            "worldweatheronline": wwo_data,
            "openmeteo": openmeteo_data,
            "ipma": ipma_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))   


@app.get("/weather/terrestrial")
def get_weather_terrestrial(lat: float, lon: float):
    try:
        openmeteo_data = get_openmeteo_terrestrial_all_models(lat, lon)
        ipma_data = get_ipma_terrestrial(lat, lon)
        openweather_data = get_openweather_terrestrial(lat, lon)

        return {
            "requested_location": {
                "latitude": lat,
                "longitude": lon
            },
            "openmeteo": openmeteo_data,
             "ipma": {
                "daily": ipma_data
            },
            "openweather": openweather_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/data/observations")
def get_stored_observations(
    limit: int = 50000,
    lat: float | None = None,
    lon: float | None = None
):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            params = []

            where_clause = """
                WHERE mf.data_status = 'observation'
            """

            if lat is not None and lon is not None:
                where_clause += """
                    AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                    AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                """
                params.extend([str(lat), str(lon)])

            params.append(limit)

            cursor.execute(
                f"""
                SELECT 
                    mf.id_measurement,
                    mf.request_id,
                    sd.name AS source,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.name AS location_name,
                    ld.latitude,
                    ld.longitude,
                    mf.distance_km,
                    mf.raw_json
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                {where_clause}
                ORDER BY mf.request_id DESC, mf.id_measurement DESC
                LIMIT %s
                """,
                tuple(params)
            )

            rows = cursor.fetchall()

            return [
                {
                    "idMeasurement": row[0],
                    "requestId": row[1],
                    "source": row[2],
                    "variable": {
                        "fieldName": row[3],
                        "description": row[4],
                        "unit": row[5],
                    },
                    "value": row[6] if row[6] is not None else row[7],
                    "date": str(row[8]),
                    "time": str(row[9]),
                    "location": {
                        "name": row[10],
                        "latitude": row[11],
                        "longitude": row[12],
                        "distanceKm": row[13],
                    },
                    "requestedLocation": (
                        row[14].get("requestedLocation")
                        if row[14] else None
                    )
                }
                for row in rows
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


@app.get("/data/observations/current")
def get_current_observations(lat: float, lon: float):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    sd.name AS source,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.name AS station_name,
                    mf.distance_km
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                WHERE mf.data_status = 'observation'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                  AND mf.request_id = (
                      SELECT mf2.request_id
                      FROM measurement_facts mf2
                      WHERE mf2.data_status = 'observation'
                        AND mf2.raw_json->'requestedLocation'->>'latitude' = %s
                        AND mf2.raw_json->'requestedLocation'->>'longitude' = %s
                      ORDER BY mf2.request_id DESC
                      LIMIT 1
                  )
                ORDER BY sd.name, vd.field_name
                """,
                (str(lat), str(lon), str(lat), str(lon))
            )

            rows = cursor.fetchall()

            result = {}

            for row in rows:
                source = row[0].lower()

                if source not in result:
                    result[source] = {
                        "source": row[0],
                        "date": str(row[6]),
                        "time": str(row[7]),
                        "station": row[8],
                        "distanceKm": row[9],
                        "values": {}
                    }

                result[source]["values"][row[1]] = {
                    "description": row[2],
                    "unit": row[3],
                    "value": row[4] if row[4] is not None else row[5]
                }

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

@app.get("/data/observations/history")
def get_observations_history(
    lat: float,
    lon: float,
    variable: str = "temperature",
    range: str = "24h"
):
    conn = get_connection()

    variable_map = {
        "temperature": "temperatureC",
        "humidity": "humidityPercent",
        "wind_speed": "windSpeedKmh",
        "precipitation": "precipitationMm",
        "pressure": "pressureHpa"
    }

    field_name = variable_map.get(variable, "temperatureC")

    range_map = {
        "24h": 1,
        "7d": 7,
        "30d": 30
    }

    days = range_map.get(range, 1)

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    sd.name AS source,
                    cd.date,
                    hd.full_time,
                    mf.value
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                WHERE mf.data_status = 'observation'
                  AND vd.field_name = %s
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                  AND (cd.date + hd.full_time) >= NOW() - (%s * INTERVAL '1 day')
                  AND mf.value IS NOT NULL
                ORDER BY cd.date ASC, hd.full_time ASC
                """,
                (field_name, str(lat), str(lon), days)
            )

            rows = cursor.fetchall()

            grouped = {}

            for source, date, time, value in rows:
                hour = str(time)[:2]
                key = f"{date} {hour}:00"

                if key not in grouped:
                    grouped[key] = {
                        "label": f"{str(date)[8:10]}/{str(date)[5:7]} {hour}:00",
                        "ipma": None,
                        "foreca": None
                    }

                source_key = source.lower()

                if source_key == "ipma":
                    grouped[key]["ipma"] = value

                if source_key == "foreca":
                    grouped[key]["foreca"] = value

            points = list(grouped.values())

            return {
                "labels": [p["label"] for p in points],
                "ipma": [p["ipma"] for p in points],
                "foreca": [p["foreca"] for p in points],
                "variable": variable
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

@app.get("/data/observations/records")
def get_observations_table(
    lat: float,
    lon: float,
    page: int = 1,
    page_size: int = 25,
    search: str | None = None
):
    conn = get_connection()

    try:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        offset = (page - 1) * page_size

        with conn.cursor() as cursor:
            params = [str(lat), str(lon)]

            where_clause = """
                WHERE mf.data_status = 'observation'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
            """

            if search:
                where_clause += """
                    AND (
                        LOWER(sd.name) LIKE %s
                        OR LOWER(vd.description) LIKE %s
                        OR LOWER(vd.field_name) LIKE %s
                        OR LOWER(ld.name) LIKE %s
                    )
                """
                term = f"%{search.lower()}%"
                params.extend([term, term, term, term])

            count_sql = f"""
                SELECT COUNT(*)
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                {where_clause}
            """

            cursor.execute(count_sql, tuple(params))
            total = cursor.fetchone()[0]

            data_sql = f"""
                SELECT 
                    cd.date,
                    hd.full_time,
                    sd.name AS source,
                    ld.name AS location_name,
                    vd.description,
                    vd.field_name,
                    mf.value,
                    mf.value_text,
                    vd.unit,
                    mf.distance_km,
                    ld.latitude,
                    ld.longitude
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                {where_clause}
                ORDER BY cd.date DESC, hd.full_time DESC, mf.id_measurement DESC
                LIMIT %s OFFSET %s
            """

            cursor.execute(data_sql, tuple(params + [page_size, offset]))
            rows = cursor.fetchall()

            return {
                "page": page,
                "pageSize": page_size,
                "total": total,
                "rows": [
                    {
                        "date": str(row[0]),
                        "time": str(row[1]),
                        "source": row[2],
                        "location": row[3] or "Local selecionado",
                        "variable": row[4] or row[5],
                        "value": row[6] if row[6] is not None else row[7],
                        "unit": row[8] or "",
                        "distance": row[9],
                        "latitude": row[10],
                        "longitude": row[11],
                    }
                    for row in rows
                ]
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
        
@app.get("/data/forecast/marine")
def get_stored_marine_forecasts(limit: int = 50000):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    mf.id_measurement,
                    mf.request_id,
                    sd.name AS source,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.name AS location_name,
                    ld.latitude,
                    ld.longitude,
                    mf.distance_km,
                    mf.raw_json
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'marine'
                ORDER BY mf.request_id DESC, mf.id_measurement DESC
                LIMIT %s
                """,
                (limit,)
            )

            rows = cursor.fetchall()

            return [
                {
                    "idMeasurement": row[0],
                    "requestId": row[1],
                    "source": row[2],
                    "variable": {
                        "fieldName": row[3],
                        "description": row[4],
                        "unit": row[5],
                    },
                    "value": row[6] if row[6] is not None else row[7],
                    "date": str(row[8]),
                    "time": str(row[9]),
                    "location": {
                        "name": row[10],
                        "latitude": row[11],
                        "longitude": row[12],
                        "distanceKm": row[13],
                    },
                    "requestedLocation": (
                        row[14].get("requestedLocation")
                        if row[14] else None
                    )
                }
                for row in rows
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/data/forecast/terrestrial")
def get_stored_terrestrial_forecasts(limit: int = 50000):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    mf.id_measurement,
                    mf.request_id,
                    sd.name AS source,
                    sd.weather_model,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.name AS location_name,
                    ld.latitude,
                    ld.longitude,
                    mf.distance_km,
                    mf.raw_json
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld 
                    ON mf.id_location = ld.id_location
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                ORDER BY mf.request_id DESC, mf.id_measurement DESC
                LIMIT %s
                """,
                (limit,)
            )

            rows = cursor.fetchall()

            return [
                {
                    "idMeasurement": row[0],
                    "requestId": row[1],
                    "source": row[2],
                    "model": row[3],
                    "variable": {
                        "fieldName": row[4],
                        "description": row[5],
                        "unit": row[6],
                    },
                    "value": row[7] if row[7] is not None else row[8],
                    "date": str(row[9]),
                    "time": str(row[10]),
                    "location": {
                        "name": row[11],
                        "latitude": row[12],
                        "longitude": row[13],
                        "distanceKm": row[14],
                    },
                    "requestedLocation": (
                        row[15].get("requestedLocation")
                        if row[15] else None
                    )
                }
                for row in rows
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


@app.get("/data/forecast/terrestrial/current")
def get_current_terrestrial_forecast(lat: float, lon: float):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH latest_requests AS (
                    SELECT DISTINCT ON (sd.name, sd.weather_model)
                        mf.request_id,
                        sd.name AS source,
                        sd.weather_model
                    FROM measurement_facts mf
                    JOIN source_dimension sd 
                        ON mf.id_source = sd.id_source
                    WHERE mf.data_status = 'forecast'
                      AND LOWER(sd.data_type) = 'terrestrial'
                      AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                      AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                    ORDER BY sd.name, sd.weather_model, mf.request_id DESC
                )
                SELECT 
                    mf.request_id,
                    sd.name AS source,
                    sd.weather_model,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    mf.distance_km
                FROM measurement_facts mf
                JOIN source_dimension sd 
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd 
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd 
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd 
                    ON mf.id_hour_data = hd.id_hour
                JOIN latest_requests lr
                    ON lr.request_id = mf.request_id
                   AND lr.source = sd.name
                   AND lr.weather_model = sd.weather_model
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                ORDER BY sd.name, sd.weather_model, cd.date, hd.full_time, vd.field_name
                """,
                (str(lat), str(lon), str(lat), str(lon))
            )

            rows = cursor.fetchall()

            now = datetime.now(ZoneInfo("Europe/Lisbon")).replace(tzinfo=None)

            grouped = {}

            for row in rows:
                request_id = row[0]
                source = row[1]
                model = row[2]
                field_name = row[3]
                description = row[4]
                unit = row[5]
                value = row[6] if row[6] is not None else row[7]
                forecast_date = row[8]
                forecast_time = row[9]
                distance_km = row[10]

                forecast_dt = datetime.combine(forecast_date, forecast_time)

                group_key = (source.lower(), model or "sem_modelo", forecast_dt)

                if group_key not in grouped:
                    grouped[group_key] = {
                        "requestId": request_id,
                        "source": source,
                        "model": model,
                        "datetime": forecast_dt,
                        "date": str(forecast_date),
                        "time": str(forecast_time),
                        "distanceKm": distance_km,
                        "values": {}
                    }

                grouped[group_key]["values"][field_name] = {
                    "description": description,
                    "unit": unit,
                    "value": value
                }

            nearest_by_model = {}

            for item in grouped.values():
                source = item["source"].lower()
                model = (item["model"] or "").upper()

                if source == "open-meteo":
                    if "ICON" in model:
                        key = "openmeteo_icon"
                    elif "ECMWF" in model:
                        key = "openmeteo_ecmwf"
                    elif "ARPEGE" in model or "AROME" in model:
                        key = "openmeteo_arpege"
                    else:
                        key = "openmeteo"
                elif source == "openweather":
                    key = "openweather"
                elif source == "ipma":
                    key = "ipma"
                else:
                    key = source

                diff = abs(item["datetime"] - now)

                if key not in nearest_by_model or diff < nearest_by_model[key]["diff"]:
                    nearest_by_model[key] = {
                        "diff": diff,
                        "data": item
                    }

            result = {
                "ipma": None,
                "openweather": None,
                "openmeteo": {
                    "icon": None,
                    "ecmwf": None,
                    "arpege": None
                }
            }

            if "ipma" in nearest_by_model:
                result["ipma"] = nearest_by_model["ipma"]["data"]

            if "openweather" in nearest_by_model:
                result["openweather"] = nearest_by_model["openweather"]["data"]

            if "openmeteo_icon" in nearest_by_model:
                result["openmeteo"]["icon"] = nearest_by_model["openmeteo_icon"]["data"]

            if "openmeteo_ecmwf" in nearest_by_model:
                result["openmeteo"]["ecmwf"] = nearest_by_model["openmeteo_ecmwf"]["data"]

            if "openmeteo_arpege" in nearest_by_model:
                result["openmeteo"]["arpege"] = nearest_by_model["openmeteo_arpege"]["data"]

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


@app.get("/data/forecast/terrestrial/history")
def get_terrestrial_forecast_history(
    lat: float,
    lon: float,
    variable: str = "temperature",
    range: str = "24h"
):
    conn = get_connection()

    variable_map = {
        "temperature": "temperatureC",
        "humidity": "humidityPercent",
        "windSpeed": "windSpeedKmh",
        "precipitation": "precipitationMm",
        "pressure": "pressureHpa",
        "cloudCover": "cloudCoverPercent"
    }

    field_name = variable_map.get(variable)

    if not field_name:
        raise HTTPException(status_code=400, detail="Variável inválida")

    now = datetime.now(ZoneInfo("Europe/Lisbon")).replace(tzinfo=None)

    if range == "24h":
        start_date = now - timedelta(hours=24)
    elif range == "7d":
        start_date = now - timedelta(days=7)
    elif range == "30d":
        start_date = now - timedelta(days=30)
    else:
        raise HTTPException(status_code=400, detail="Range inválido")

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    sd.name AS source,
                    sd.weather_model,
                    cd_req.date,
                    hd_req.full_time,
                    mf.value,
                    mf.value_text
                FROM measurement_facts mf

                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source

                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable

                JOIN calendar_dimension cd_req
                    ON mf.id_date_request = cd_req.id_date

                JOIN hour_dimension hd_req
                    ON mf.id_hour_request = hd_req.id_hour

                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                  AND vd.field_name = %s
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s

                ORDER BY cd_req.date, hd_req.full_time
                """,
                (
                    field_name,
                    str(lat),
                    str(lon)
                )
            )

            rows = cursor.fetchall()

            grouped = {}

            for row in rows:

                source = row[0].lower()
                model = (row[1] or "").upper()

                dt = datetime.combine(row[2], row[3])

                if dt < start_date:
                    continue
                
                dt = dt.replace(minute=0, second=0, microsecond=0)
                label = dt.strftime("%d/%m %H:%M")

                value = row[4] if row[4] is not None else row[5]

                try:
                    value = float(value)
                except:
                    value = None

                if value in (-99, -99.0):
                    value = None

                if source == "open-meteo":
                    if "ICON" in model:
                        key = "icon"
                    elif "ECMWF" in model:
                        key = "ecmwf"
                    elif "ARPEGE" in model or "AROME" in model:
                        key = "arpege"
                    else:
                        key = "openmeteo"

                elif source == "openweather":
                    key = "openweather"

                elif source == "ipma":
                    key = "ipma"

                else:
                    key = source

                if label not in grouped:
                    grouped[label] = {}

                grouped[label][key] = value

            labels = sorted(grouped.keys())

            result = {
                "labels": labels,
                "icon": [],
                "ecmwf": [],
                "arpege": [],
                "ipma": [],
                "openweather": [],
                "variable": variable
            }

            for label in labels:
                result["icon"].append(grouped[label].get("icon"))
                result["ecmwf"].append(grouped[label].get("ecmwf"))
                result["arpege"].append(grouped[label].get("arpege"))
                result["ipma"].append(grouped[label].get("ipma"))
                result["openweather"].append(grouped[label].get("openweather"))

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

@app.get("/data/forecast/terrestrial/records")
def get_terrestrial_forecast_records(
    lat: float,
    lon: float,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None
):
    conn = get_connection()

    offset = (page - 1) * page_size

    try:
        with conn.cursor() as cursor:
            params = [
                str(lat),
                str(lon)
            ]

            search_clause = ""

            if search:
                search_clause = """
                    AND (
                        LOWER(sd.name) LIKE LOWER(%s)
                        OR LOWER(sd.weather_model) LIKE LOWER(%s)
                        OR LOWER(vd.field_name) LIKE LOWER(%s)
                        OR LOWER(vd.description) LIKE LOWER(%s)
                    )
                """
                term = f"%{search}%"
                params.extend([term, term, term, term])

            count_params = tuple(params)

            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM measurement_facts mf
                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                  {search_clause}
                """,
                count_params
            )

            total = cursor.fetchone()[0]

            params.extend([page_size, offset])

            cursor.execute(
                f"""
                SELECT
                    cd_req.date,
                    hd_req.full_time,
                    sd.name,
                    sd.weather_model,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    mf.raw_json->'requestedLocation'->>'latitude',
                    mf.raw_json->'requestedLocation'->>'longitude'
                FROM measurement_facts mf
                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd_req
                    ON mf.id_date_request = cd_req.id_date
                JOIN hour_dimension hd_req
                    ON mf.id_hour_request = hd_req.id_hour
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                  {search_clause}
                ORDER BY cd_req.date DESC, hd_req.full_time DESC, mf.id_measurement DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params)
            )

            rows = cursor.fetchall()

            return {
                "rows": [
                    {
                        "date": str(row[0]),
                        "time": str(row[1]),
                        "source": (
                            f"{row[2]} · {row[3]}"
                            if row[3] else row[2]
                        ),
                        "variable": row[5] or row[4],
                        "value": row[7] if row[7] is not None else row[8],
                        "unit": row[6],
                        "lat": row[9],
                        "lng": row[10]
                    }
                    for row in rows
                ],
                "page": page,
                "pageSize": page_size,
                "total": total
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


@app.get("/data/forecast/terrestrial/timeline")
def get_terrestrial_forecast_timeline(
    lat: float,
    lon: float,
    provider: str = "openmeteo",
    hours: int = 24
):
    conn = get_connection()

    now = datetime.now(ZoneInfo("Europe/Lisbon")).replace(tzinfo=None)
    end_date = now + timedelta(hours=hours)

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH latest_requests AS (
                    SELECT DISTINCT ON (sd.name, sd.weather_model)
                        mf.request_id,
                        sd.name AS source,
                        sd.weather_model
                    FROM measurement_facts mf
                    JOIN source_dimension sd
                        ON mf.id_source = sd.id_source
                    WHERE mf.data_status = 'forecast'
                      AND LOWER(sd.data_type) = 'terrestrial'
                      AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                      AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                    ORDER BY sd.name, sd.weather_model, mf.request_id DESC
                )
                SELECT
                    sd.name AS source,
                    sd.weather_model,
                    vd.field_name,
                    mf.value,
                    mf.value_text,
                    cd_data.date,
                    hd_data.full_time
                FROM measurement_facts mf
                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd_data
                    ON mf.id_date_data = cd_data.id_date
                JOIN hour_dimension hd_data
                    ON mf.id_hour_data = hd_data.id_hour
                JOIN latest_requests lr
                    ON lr.request_id = mf.request_id
                   AND lr.source = sd.name
                   AND lr.weather_model = sd.weather_model
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'terrestrial'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                ORDER BY sd.name, sd.weather_model, cd_data.date, hd_data.full_time
                """,
                (
                    str(lat),
                    str(lon),
                    str(lat),
                    str(lon)
                )
            )

            rows = cursor.fetchall()

            provider = provider.lower()
            grouped = {}

            for row in rows:
                source = row[0].lower()
                model = row[1] or ""
                model_upper = model.upper()
                field = row[2]
                raw_value = row[3] if row[3] is not None else row[4]
                forecast_dt = datetime.combine(row[5], row[6])

                if forecast_dt < now or forecast_dt > end_date:
                    continue

                if provider == "openmeteo" and source != "open-meteo":
                    continue

                if provider == "ipma" and source != "ipma":
                    continue

                if provider == "openweather" and source != "openweather":
                    continue

                if source == "open-meteo":
                    if "ICON" in model_upper:
                        model_key = "ICON"
                    elif "ECMWF" in model_upper:
                        model_key = "ECMWF"
                    elif "ARPEGE" in model_upper or "AROME" in model_upper:
                        model_key = "ARPEGE"
                    else:
                        model_key = model or "Open-Meteo"
                elif source == "ipma":
                    model_key = "ECMWF + AROME"
                elif source == "openweather":
                    model_key = "OWM"
                else:
                    model_key = model or source

                group_key = (model_key, forecast_dt)

                if group_key not in grouped:
                    grouped[group_key] = {
                        "model": model_key,
                        "dateRaw": forecast_dt.date().isoformat(),
                        "timeRaw": forecast_dt.time().isoformat(),
                        "date": forecast_dt.strftime("%a %d"),
                        "time": forecast_dt.strftime("%H:%M"),
                        "temperature": None,
                        "minTemp": None,
                        "maxTemp": None,
                        "humidity": None,
                        "pressure": None,
                        "cloudCover": None,
                        "visibility": None,
                        "windSpeed": None,
                        "windSpeedMax": None,
                        "windGust": None,
                        "windDirectionDegrees": None,
                        "windDirection": None,
                        "precipitation": None,
                        "precipitationProbability": None,
                        "sunrise": None,
                        "sunset": None,
                        "icon": "fa-cloud-sun"
                    }

                item = grouped[group_key]

                try:
                    value = float(raw_value)
                    if value in (-99, -99.0):
                        value = None
                except:
                    value = raw_value

                if field == "temperatureC":
                    item["temperature"] = value
                elif field == "temperatureMinC":
                    item["minTemp"] = value
                elif field == "temperatureMaxC":
                    item["maxTemp"] = value
                elif field == "humidityPercent":
                    item["humidity"] = value
                elif field == "pressureHpa":
                    item["pressure"] = value
                elif field == "cloudCoverPercent":
                    item["cloudCover"] = value
                elif field == "visibilityKm":
                    item["visibility"] = value
                elif field == "windSpeedKmh":
                    item["windSpeed"] = value
                elif field == "windSpeedMaxKmh":
                    item["windSpeedMax"] = value
                elif field == "windGustKmh":
                    item["windGust"] = value
                elif field == "windDirectionDegrees":
                    item["windDirectionDegrees"] = value
                    if value is not None:
                        item["windDirection"] = f"{round(value)}°"
                elif field == "windDirectionCardinal":
                    item["windDirection"] = value
                elif field == "precipitationMm":
                    item["precipitation"] = value
                elif field == "precipitationProbabilityPercent":
                    item["precipitationProbability"] = value
                elif field == "sunriseH":
                    item["sunrise"] = value
                elif field == "sunsetH":
                    item["sunset"] = value

            result = {}

            for item in grouped.values():
                model = item["model"]
                result.setdefault(model, [])
                result[model].append(item)

            for model in result:
                result[model].sort(key=lambda x: f"{x['dateRaw']} {x['timeRaw']}")

            return {
                "provider": provider,
                "hours": hours,
                "models": result
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()



@app.get("/data/forecast/marine/current")
def get_current_marine_forecast(lat: float, lon: float):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH latest_requests AS (
                    SELECT DISTINCT ON (sd.name, sd.weather_model)
                        mf.request_id,
                        sd.name AS source,
                        sd.weather_model
                    FROM measurement_facts mf
                    JOIN source_dimension sd
                        ON mf.id_source = sd.id_source
                    WHERE mf.data_status = 'forecast'
                      AND LOWER(sd.data_type) = 'marine'
                      AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                      AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                    ORDER BY sd.name, sd.weather_model, mf.request_id DESC
                )
                SELECT
                    mf.request_id,
                    sd.name AS source,
                    sd.weather_model,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.name AS location_name,
                    ld.latitude,
                    ld.longitude,
                    mf.distance_km
                FROM measurement_facts mf
                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld
                    ON mf.id_location = ld.id_location
                JOIN latest_requests lr
                    ON lr.request_id = mf.request_id
                   AND lr.source = sd.name
                   AND (
                        lr.weather_model = sd.weather_model
                        OR (lr.weather_model IS NULL AND sd.weather_model IS NULL)
                   )
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'marine'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                ORDER BY sd.name, sd.weather_model, cd.date, hd.full_time, vd.field_name
                """,
                (str(lat), str(lon), str(lat), str(lon))
            )

            rows = cursor.fetchall()

            now = datetime.now(ZoneInfo("Europe/Lisbon")).replace(tzinfo=None)

            grouped = {}

            for row in rows:
                request_id = row[0]
                source = row[1]
                model = row[2]
                field_name = row[3]
                description = row[4]
                unit = row[5]
                value = row[6] if row[6] is not None else row[7]
                forecast_date = row[8]
                forecast_time = row[9]
                location_name = row[10]
                latitude = row[11]
                longitude = row[12]
                distance_km = row[13]

                forecast_dt = datetime.combine(forecast_date, forecast_time)

                group_key = (
                    source.lower(),
                    model or "sem_modelo",
                    forecast_dt
                )

                if group_key not in grouped:
                    grouped[group_key] = {
                        "requestId": request_id,
                        "source": source,
                        "model": model,
                        "datetime": forecast_dt,
                        "date": str(forecast_date),
                        "time": str(forecast_time),
                        "location": {
                            "name": location_name,
                            "latitude": latitude,
                            "longitude": longitude,
                            "distanceKm": distance_km
                        },
                        "values": {}
                    }

                grouped[group_key]["values"][field_name] = {
                    "description": description,
                    "unit": unit,
                    "value": value
                }

            nearest_by_source = {}

            for item in grouped.values():
                source = item["source"].lower()
                model = (item["model"] or "").upper()

                if source == "open-meteo":
                    key = "openmeteo"
                elif source == "worldweatheronline":
                    key = "worldweatheronline"
                elif source == "ipma":
                    key = "ipma"
                else:
                    key = source.replace(" ", "").replace("-", "")

                diff = abs(item["datetime"] - now)

                if key not in nearest_by_source or diff < nearest_by_source[key]["diff"]:
                    nearest_by_source[key] = {
                        "diff": diff,
                        "data": item
                    }

            result = {
                "ipma": None,
                "openmeteo": None,
                "worldweatheronline": None
            }

            for key in result:
                if key in nearest_by_source:
                    result[key] = nearest_by_source[key]["data"]

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()


@app.get("/data/forecast/marine/future")
def get_marine_forecast_future(lat: float, lon: float):
    conn = get_connection()

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH latest_requests AS (
                    SELECT DISTINCT ON (sd.name, sd.weather_model)
                        mf.request_id,
                        sd.name AS source,
                        sd.weather_model
                    FROM measurement_facts mf
                    JOIN source_dimension sd
                        ON mf.id_source = sd.id_source
                    WHERE mf.data_status = 'forecast'
                      AND LOWER(sd.data_type) = 'marine'
                      AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                      AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                    ORDER BY sd.name, sd.weather_model, mf.request_id DESC
                )
                SELECT
                    mf.request_id,
                    sd.name AS source,
                    sd.weather_model,
                    vd.field_name,
                    vd.description,
                    vd.unit,
                    mf.value,
                    mf.value_text,
                    cd.date,
                    hd.full_time,
                    ld.latitude,
                    ld.longitude,
                    mf.distance_km
                FROM measurement_facts mf
                JOIN source_dimension sd
                    ON mf.id_source = sd.id_source
                JOIN variable_dimension vd
                    ON mf.id_variable = vd.id_variable
                JOIN calendar_dimension cd
                    ON mf.id_date_data = cd.id_date
                JOIN hour_dimension hd
                    ON mf.id_hour_data = hd.id_hour
                JOIN location_dimension ld
                    ON mf.id_location = ld.id_location
                JOIN latest_requests lr
                    ON lr.request_id = mf.request_id
                   AND lr.source = sd.name
                   AND (
                        lr.weather_model = sd.weather_model
                        OR (lr.weather_model IS NULL AND sd.weather_model IS NULL)
                   )
                WHERE mf.data_status = 'forecast'
                  AND LOWER(sd.data_type) = 'marine'
                  AND mf.raw_json->'requestedLocation'->>'latitude' = %s
                  AND mf.raw_json->'requestedLocation'->>'longitude' = %s
                ORDER BY sd.name, sd.weather_model, cd.date, hd.full_time, vd.field_name
                """,
                (str(lat), str(lon), str(lat), str(lon))
            )

            rows = cursor.fetchall()

            grouped = {}

            for row in rows:
                request_id = row[0]
                source = row[1]
                model = row[2]
                field_name = row[3]
                description = row[4]
                unit = row[5]
                value = row[6] if row[6] is not None else row[7]
                forecast_date = row[8]
                forecast_time = row[9]
                location_lat = row[10]
                location_lon = row[11]
                distance_km = row[12]

                forecast_dt = datetime.combine(forecast_date, forecast_time)

                source_lower = source.lower()

                if source_lower == "open-meteo":
                    source_key = "openmeteo"
                elif source_lower == "worldweatheronline":
                    source_key = "worldweatheronline"
                elif source_lower == "ipma":
                    source_key = "ipma"
                else:
                    source_key = source_lower.replace(" ", "").replace("-", "")

                group_key = (
                    source_key,
                    model or "sem_modelo",
                    forecast_dt
                )

                if group_key not in grouped:
                    grouped[group_key] = {
                        "requestId": request_id,
                        "source": source,
                        "model": model,
                        "datetime": forecast_dt.isoformat(),
                        "date": str(forecast_date),
                        "time": str(forecast_time),
                        "location": {
                            "latitude": location_lat,
                            "longitude": location_lon,
                            "distanceKm": distance_km
                        },
                        "values": {}
                    }

                grouped[group_key]["values"][field_name] = {
                    "description": description,
                    "unit": unit,
                    "value": value
                }

            result = {
                "ipma": [],
                "openmeteo": [],
                "worldweatheronline": []
            }

            for item in grouped.values():
                source_lower = item["source"].lower()

                if source_lower == "ipma":
                    result["ipma"].append(item)

                elif source_lower == "open-meteo":
                    result["openmeteo"].append(item)

                elif source_lower == "worldweatheronline":
                    result["worldweatheronline"].append(item)

            for key in result:
                result[key].sort(key=lambda x: x["datetime"])

            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
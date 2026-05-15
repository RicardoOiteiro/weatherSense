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
def get_stored_observations(limit: int = 100):
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
                    }
                }
                for row in rows
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()
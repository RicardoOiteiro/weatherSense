from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.foreca_service import get_foreca_observation
from app.services.ipma_service import get_ipma_observation
from app.utils.excel_storage import guardar_json_normalizado_em_excel
from app.services.worldweather_service import get_wwo_marine
from app.services.openmeteo_marine_service import get_openmeteo_marine
from app.services.ipma_marine_service import get_ipma_marine_daily


app = FastAPI(title="Projeto Meteorológico API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "API meteorológica a funcionar"}


@app.get("/weather/observation")
def get_weather_observation(lat: float, lon: float):
    try:
        foreca_data = get_foreca_observation(lat, lon)
        ipma_data = get_ipma_observation(lat, lon)

        resultado_final = {
            "requested_location": {
                "latitude": lat,
                "longitude": lon
            },
            "foreca": foreca_data,
            "ipma": ipma_data
        }
    
        guardar_json_normalizado_em_excel(resultado_final)

        return resultado_final

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/weather/marine")
def get_weather_marine(lat: float, lon: float):
    try:
        wwo_data = get_wwo_marine(lat, lon)
        openmeteo_data = get_openmeteo_marine(lat, lon)
        ipma_data = get_ipma_marine_daily(lat, lon, 0)

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

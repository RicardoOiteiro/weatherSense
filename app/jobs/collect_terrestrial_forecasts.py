from app.jobs.locations import LOCATIONS
from app.services.terrestrial.openweather_terrestrial_service import get_openweather_terrestrial
from app.services.terrestrial.openmeteo_terrestrial_service import get_openmeteo_terrestrial_all_models
from app.services.terrestrial.ipma_terrestrial_service import get_ipma_terrestrial


def run_terrestrial_forecast_collection():
    print("=== INÍCIO DA RECOLHA DE PREVISÕES TERRESTRES ===")

    for location in LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nPrevisão terrestre: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        try:
            get_openweather_terrestrial(lat, lon)
            print("OPENWEATHER TERRESTRIAL OK")
        except Exception as e:
            print(f"ERRO OPENWEATHER TERRESTRIAL ({name}): {e}")

        try:
            get_openmeteo_terrestrial_all_models(lat, lon)
            print("OPENMETEO TERRESTRIAL OK")
        except Exception as e:
            print(f"ERRO OPENMETEO TERRESTRIAL ({name}): {e}")

        try:
            get_ipma_terrestrial(lat, lon)
            print("IPMA TERRESTRIAL OK")
        except Exception as e:
            print(f"ERRO IPMA TERRESTRIAL ({name}): {e}")

    print("\n=== RECOLHA DE PREVISÕES TERRESTRES TERMINADA ===")
from app.jobs.locations import MARINE_LOCATIONS
from app.services.marine.openmeteo_marine_service import get_openmeteo_marine
from app.services.marine.ipma_marine_service import get_ipma_marine_3_days
from app.services.marine.worldweather_service import get_wwo_marine


def run_marine_forecast_collection():
    print("=== INÍCIO DA RECOLHA DE PREVISÕES MARÍTIMAS ===")

    for location in MARINE_LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nPrevisão marítima: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        try:
            get_openmeteo_marine(lat, lon)
            print("OPENMETEO MARINE OK")
        except Exception as e:
            print(f"ERRO OPENMETEO MARINE ({name}): {e}")

        try:
            get_ipma_marine_3_days(lat, lon)
            print("IPMA MARINE OK")
        except Exception as e:
            print(f"ERRO IPMA MARINE ({name}): {e}")

        try:
            get_wwo_marine(lat, lon)
            print("WWO MARINE OK")
        except Exception as e:
            print(f"ERRO WWO MARINE ({name}): {e}")

    print("\n=== RECOLHA DE PREVISÕES MARÍTIMAS TERMINADA ===")
from app.jobs.locations import LOCATIONS
from app.services.observation.foreca_observation_service import get_foreca_observation
from app.services.observation.ipma_observation_service import get_ipma_observation


def run_observations_collection():
    print("=== INÍCIO DA RECOLHA DE OBSERVAÇÕES ===")

    for location in LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nObservações: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        try:
            get_foreca_observation(lat, lon)
            print("FORECA OBSERVATION OK")
        except Exception as e:
            print(f"ERRO FORECA OBSERVATION ({name}): {e}")

        try:
            get_ipma_observation(lat, lon)
            print("IPMA OBSERVATION OK")
        except Exception as e:
            print(f"ERRO IPMA OBSERVATION ({name}): {e}")

    print("\n=== RECOLHA DE OBSERVAÇÕES TERMINADA ===")
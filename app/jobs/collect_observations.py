from app.jobs.locations import LOCATIONS
from app.services.observation.foreca_observation_service import get_foreca_observation
from app.services.observation.ipma_observation_service import get_ipma_observation


def run_observations_collection():
    print("=== INÍCIO DA RECOLHA DE OBSERVAÇÕES ===")

    # Executa a recolha para todas as localizações definidas em locations
    for location in LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nObservações: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        # Cada fonte é executada de forma independente para garantir que uma falha
        # não interrompe a recolha das restantes observações

        # Foreca
        try:
            get_foreca_observation(lat, lon)
            print("FORECA OBSERVATION OK")
        except Exception as e:
            print(f"ERRO FORECA OBSERVATION ({name}): {e}")

        # IPMA
        try:
            get_ipma_observation(lat, lon)
            print("IPMA OBSERVATION OK")
        except Exception as e:
            print(f"ERRO IPMA OBSERVATION ({name}): {e}")

    print("\n=== RECOLHA DE OBSERVAÇÕES TERMINADA ===")
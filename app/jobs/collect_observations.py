from app.services.observation.foreca_observation_service import get_foreca_observation
from app.services.observation.ipma_observation_service import get_ipma_observation

LOCATIONS = [
    {
        "name": "Monte Real",
        "lat": 39.83,
        "lon": -8.88
    },
    {
        "name": "Leiria (Aeródromo)",
        "lat": 39.780553,
        "lon": -8.818166
    },
    {
        "name": "Figueira da Foz",
        "lat": 40.1508,
        "lon": -8.8618
    },
    {
        "name": "Nazaré",
        "lat": 39.601,
        "lon": -9.07
    }
]


def run_collection():
    print("=== INÍCIO DA RECOLHA DE OBSERVAÇÕES ===")

    for location in LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nA recolher dados para: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        # FORECA
        try:
            get_foreca_observation(lat, lon)
            print("FORECA OK")

        except Exception as e:
            print(f"ERRO FORECA ({name}): {e}")

        # IPMA
        try:
            get_ipma_observation(lat, lon)
            print("IPMA OK")

        except Exception as e:
            print(f"ERRO IPMA ({name}): {e}")

    print("\n=== RECOLHA TERMINADA ===")


if __name__ == "__main__":
    run_collection()
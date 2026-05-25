from app.services.observation.foreca_observation_service import get_foreca_observation
from app.services.observation.ipma_observation_service import get_ipma_observation
from app.services.marine.openmeteo_marine_service import get_openmeteo_marine
from app.services.marine.ipma_marine_service import get_ipma_marine_3_days
from app.services.marine.worldweather_service import get_wwo_marine
from app.services.terrestrial.openweather_terrestrial_service import get_openweather_terrestrial
from app.services.terrestrial.openmeteo_terrestrial_service import get_openmeteo_terrestrial_all_models
from app.services.terrestrial.ipma_terrestrial_service import get_ipma_terrestrial

LOCATIONS = [
    {
        "name": "São Pedro de Moel",
        "lat": 39.766853,
        "lon": -9.019775
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
    },
    {
        "name": "Peniche",
        "lat": 39.361378,
        "lon": -9.387817
    },
    {
        "name": "Bidoeira de Cima",
        "lat": 39.842572,
        "lon": -8.743315
    },
    {
        "name": "Pinhal de Leiria",
        "lat": 39.8225,
        "lon": -8.9450
    },
    {
        "name": "Óbidos",
        "lat": 39.360421,
        "lon": -9.157214
    },
    {
    "name": "ESTG Leiria",
    "lat": 39.735122,
    "lon": -8.821217
    },
    {
    "name": "Pedrógão Grande",
    "lat": 39.919392,
    "lon": -8.133316
    },
    {
        "name": "Ansião",
        "lat": 39.910834,
        "lon": -8.434238
    },
    {
        "name": "Castanheira de Pêra",
        "lat": 40.002723,
        "lon": -8.205671
    },
    {"name": "Caranguejeira",
        "lat": 39.744706,
        "lon": -8.691161
        },

    

    

]

MARINE_LOCATIONS = [
    {
        "name": "Figueira Offshore",
        "lat": 40.12,
        "lon": -9.05
    },
    {
        "name": "Vieira / Pedrógão Offshore",
        "lat": 39.93,
        "lon": -9.12
    },
    {
        "name": "São Pedro Offshore",
        "lat": 39.73,
        "lon": -9.18
    },
    {
        "name": "Nazaré Nearshore",
        "lat": 39.60,
        "lon": -9.20
    },
    {
        "name": "Nazaré Canyon",
        "lat": 39.52,
        "lon": -9.35
    },
    {
        "name": "Peniche Offshore",
        "lat": 39.30,
        "lon": -9.45
    },
    {
        "name": "Berlenga Offshore",
        "lat": 39.41,
        "lon": -9.52
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
        
        try:
            get_openweather_terrestrial(lat, lon)
            print("OPENWEATHER TERRESTRIAL OK")

        except Exception as e:
            print(f"ERRO OPENWEATHER TERRESTRIAL ({name}): {e}")
        
            # OPENMETEO TERRESTRIAL
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


    print("\n=== INÍCIO DA RECOLHA MARÍTIMA ===")

    for location in MARINE_LOCATIONS:
        name = location["name"]
        lat = location["lat"]
        lon = location["lon"]

        print(f"\nA recolher dados marítimos para: {name}")
        print(f"Latitude: {lat} | Longitude: {lon}")

        try:
            get_openmeteo_marine(lat, lon)
            print("OPENMETEO MARINE OK")
            
        except Exception as e:
            print(f"ERRO OPENMETEO MARINE ({name}): {e}")
        
        # IPMA MARINE
        try:
            get_ipma_marine_3_days(lat, lon)
            print("IPMA MARINE OK")

        except Exception as e:
            print(f"ERRO IPMA MARINE ({name}): {e}")
        
        # WWO Marine
        try:
            get_wwo_marine(lat, lon)
            print("WWO MARINE OK")

        except Exception as e:
            print(f"ERRO WWO MARINE ({name}): {e}")
        
    

        

    print("\n=== RECOLHA TERMINADA ===")


if __name__ == "__main__":
    run_collection()
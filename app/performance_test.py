import requests
import time
import statistics

BASE_URL = "http://localhost:8000"

TOTAL_PEDIDOS = 60
TIMEOUT = 10

TERRESTRIAL_LOCATIONS = [
    {"name": "São Pedro de Moel", "lat": 39.7669, "lon": -9.0198},
    {"name": "Figueira da Foz", "lat": 40.1508, "lon": -8.8618},
    {"name": "Nazaré", "lat": 39.6010, "lon": -9.0700},
    {"name": "Peniche", "lat": 39.3614, "lon": -9.3878},
    {"name": "Bidoeira de Cima", "lat": 39.8426, "lon": -8.7433},
    {"name": "Pinhal de Leiria", "lat": 39.8225, "lon": -8.9450},
    {"name": "Óbidos", "lat": 39.3604, "lon": -9.1572},
    {"name": "ESTG Leiria", "lat": 39.7351, "lon": -8.8212},
    {"name": "Pedrógão Grande", "lat": 39.9194, "lon": -8.1333},
    {"name": "Ansião", "lat": 39.9108, "lon": -8.4342},
    {"name": "Castanheira de Pêra", "lat": 40.0027, "lon": -8.2057},
    {"name": "Caranguejeira", "lat": 39.7447, "lon": -8.6912},
]

MARINE_LOCATIONS = [
    {"name": "Figueira da Foz", "lat": 40.1234, "lon": -9.0556},
    {"name": "Vieira / Pedrógão", "lat": 39.9300, "lon": -9.1200},
    {"name": "São Pedro de Moel", "lat": 39.7300, "lon": -9.1800},
    {"name": "Nazaré Costa", "lat": 39.6000, "lon": -9.2000},
    {"name": "Nazaré Desfiladeiro", "lat": 39.5200, "lon": -9.3500},
    {"name": "Berlenga", "lat": 39.3000, "lon": -9.4500},
    {"name": "Peniche", "lat": 39.4100, "lon": -9.5200},
]

ENDPOINTS = [
    {
        "name": "Observações atuais",
        "path": "/data/observations/current",
        "type": "terrestrial",
    },
    {
        "name": "Previsão terrestre atual",
        "path": "/data/forecast/terrestrial/current",
        "type": "terrestrial",
    },
    {
        "name": "Previsão marítima atual",
        "path": "/data/forecast/marine/current",
        "type": "marine",
    },
    {
        "name": "Histórico de previsões terrestres",
        "path": "/data/forecast/terrestrial/history",
        "type": "terrestrial",
    },
    {
        "name": "Timeline marítima",
        "path": "/data/forecast/marine/timeline",
        "type": "marine",
    },
    {
        "name": "Registos de previsões terrestres",
        "path": "/data/forecast/terrestrial/records",
        "type": "terrestrial",
    },
]


def escolher_localizacao(endpoint_type, index):
    if endpoint_type == "marine":
        return MARINE_LOCATIONS[index % len(MARINE_LOCATIONS)]

    return TERRESTRIAL_LOCATIONS[index % len(TERRESTRIAL_LOCATIONS)]


def executar_teste(endpoint):
    tempos = []
    erros = 0
    codigos_http = {}

    print(f"\n=== Teste de desempenho: {endpoint['name']} ===")
    print(f"Endpoint: {endpoint['path']}")

    if endpoint["type"] == "marine":
        print(f"Localizações utilizadas: {len(MARINE_LOCATIONS)} marítimas")
    else:
        print(f"Localizações utilizadas: {len(TERRESTRIAL_LOCATIONS)} terrestres")

    for i in range(TOTAL_PEDIDOS):
        local = escolher_localizacao(endpoint["type"], i)

        url = (
            f"{BASE_URL}{endpoint['path']}"
            f"?lat={local['lat']}&lon={local['lon']}"
        )

        inicio = time.perf_counter()

        try:
            resposta = requests.get(url, timeout=TIMEOUT)
            fim = time.perf_counter()

            tempos.append((fim - inicio) * 1000)

            codigos_http[resposta.status_code] = (
                codigos_http.get(resposta.status_code, 0) + 1
            )

            if resposta.status_code != 200:
                erros += 1

            

        except requests.exceptions.RequestException:
            erros += 1

    print(f"Pedidos realizados: {TOTAL_PEDIDOS}")
    print(f"Latência média: {statistics.mean(tempos):.2f} ms")
    print(f"Latência mínima: {min(tempos):.2f} ms")
    print(f"Latência máxima: {max(tempos):.2f} ms")
    print(f"Erros: {erros}")
    print(f"Taxa de erro: {(erros / TOTAL_PEDIDOS) * 100:.2f}%")
    #print(f"Códigos HTTP: {codigos_http}")


def main():
    print("=== INÍCIO DOS TESTES DE DESEMPENHO ===")

    for endpoint in ENDPOINTS:
        executar_teste(endpoint)

    print("\n=== FIM DOS TESTES DE DESEMPENHO ===")


if __name__ == "__main__":
    main()
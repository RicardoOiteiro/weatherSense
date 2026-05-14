import time
from datetime import datetime
from zoneinfo import ZoneInfo

from app.jobs.collect_observations import run_collection


INTERVAL_SECONDS = 1800  # 30 minutos


def run_scheduler():
    print("=== SCHEDULER INICIADO ===")

    while True:
        try:
            print(f"\n[{datetime.now(ZoneInfo('Europe/Lisbon'))}] A iniciar recolha...")
            run_collection()
            print(f"[{datetime.now(ZoneInfo('Europe/Lisbon'))}] Recolha concluída.")

        except Exception as e:
            print(f"ERRO NO SCHEDULER: {e}")

        print(f"A aguardar {INTERVAL_SECONDS / 60} minutos...\n")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    run_scheduler()
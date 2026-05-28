import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.jobs.collect_observations import run_observations_collection
from app.jobs.collect_terrestrial_forecasts import run_terrestrial_forecast_collection
from app.jobs.collect_marine_forecasts import run_marine_forecast_collection


OBSERVATION_INTERVAL = 1800      # 30 minutos
FORECAST_INTERVAL = 3600         # 1 hora

LOOP_SLEEP_SECONDS = 60          # verifica a cada 60s
PAUSE_BETWEEN_BLOCKS = 5         # pausa entre recolhas


def now_lisbon():
    return datetime.now(ZoneInfo("Europe/Lisbon"))


def log(message):
    print(f"[{now_lisbon()}] {message}")


def format_remaining(seconds):
    seconds = max(0, int(seconds))

    minutes, sec = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)

    if hours > 0:
        return f"{hours}h {minutes}m {sec}s"

    if minutes > 0:
        return f"{minutes}m {sec}s"

    return f"{sec}s"


def next_run_seconds(last_run, interval):
    return max(0, interval - (time.time() - last_run))


def next_run_in(last_run, interval):
    return format_remaining(next_run_seconds(last_run, interval))


def next_run_at(last_run, interval):
    remaining = next_run_seconds(last_run, interval)
    next_time = now_lisbon() + timedelta(seconds=remaining)

    return next_time.strftime("%H:%M:%S")


def should_run(last_run, interval):
    return time.time() - last_run >= interval


def run_job(job_name, job_function):
    log(f"=== INÍCIO: {job_name} ===")

    start = time.time()

    try:
        job_function()

        duration = time.time() - start
        log(f"=== FIM: {job_name} | Duração: {duration:.1f}s ===")

        return True

    except Exception as e:
        duration = time.time() - start
        log(f"ERRO: {job_name} | Duração até erro: {duration:.1f}s | {e}")

        return False


def log_next_runs(last_observations, last_forecasts):
    log(
        "Próx. observações em "
        f"{next_run_in(last_observations, OBSERVATION_INTERVAL)} "
        f"({next_run_at(last_observations, OBSERVATION_INTERVAL)})"
    )

    log(
        "Próx. previsões em "
        f"{next_run_in(last_forecasts, FORECAST_INTERVAL)} "
        f"({next_run_at(last_forecasts, FORECAST_INTERVAL)})"
    )


def run_scheduler():
    print("=== SCHEDULER INICIADO ===")

    last_observations = 0
    last_forecasts = 0

    while True:
        try:
            log("Scheduler ativo...")

            if should_run(last_observations, OBSERVATION_INTERVAL):
                success = run_job(
                    "RECOLHA DE OBSERVAÇÕES",
                    run_observations_collection
                )

                if success:
                    last_observations = time.time()

                time.sleep(PAUSE_BETWEEN_BLOCKS)

            if should_run(last_forecasts, FORECAST_INTERVAL):
                success_terrestrial = run_job(
                    "RECOLHA DE PREVISÕES TERRESTRES",
                    run_terrestrial_forecast_collection
                )

                time.sleep(PAUSE_BETWEEN_BLOCKS)

                success_marine = run_job(
                    "RECOLHA DE PREVISÕES MARÍTIMAS",
                    run_marine_forecast_collection
                )

                if success_terrestrial or success_marine:
                    last_forecasts = time.time()

            log_next_runs(last_observations, last_forecasts)

        except Exception as e:
            log(f"ERRO GERAL NO SCHEDULER: {e}")

        log(f"A aguardar {LOOP_SLEEP_SECONDS}s...\n")
        time.sleep(LOOP_SLEEP_SECONDS)


if __name__ == "__main__":
    run_scheduler()
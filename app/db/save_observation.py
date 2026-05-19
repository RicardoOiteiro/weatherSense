import json
from datetime import datetime
from zoneinfo import ZoneInfo


# =====================================================
# CONFIG
# =====================================================

NUMERIC_VARIABLES = {
    "temperatureC",
    "windSpeedKmh",
    "windDirectionDegrees",
    "windGustKmh",
    "precipitationMm",
    "precipitationPeriod",
    "humidityPercent",
    "visibilityKm",
    "pressureHpa",
}

TEXT_VARIABLES = {
    "windDirectionCardinal",
}

# =====================================================
# HELPERS
# =====================================================



def parse_hour(hour_text):
    """
    Recebe '14:30' e devolve (14, 30).
    """
    if not hour_text:
        return None, None

    parts = hour_text.split(":")
    return int(parts[0]), int(parts[1])

# =====================================================
# DIMENSION LOOKUPS
# =====================================================

def get_calendar_id(cursor, date_text):
    cursor.execute(
        """
        SELECT id_date
        FROM calendar_dimension
        WHERE date = %s
        """,
        (date_text,)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(f"Data não existe em calendar_dimension: {date_text}")

    return row[0]


def get_hour_id(cursor, hour_text):
    hour, minute = parse_hour(hour_text)

    cursor.execute(
        """
        SELECT id_hour
        FROM hour_dimension
        WHERE hour = %s AND minute = %s
        """,
        (hour, minute)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(f"Hora não existe em hour_dimension: {hour_text}")

    return row[0]


def get_location_id(cursor, station):
    latitude = station.get("latitude")
    longitude = station.get("longitude")

    if latitude is None or longitude is None:
        raise ValueError("Latitude e longitude são obrigatórias.")
    
    latitude = round(float(latitude), 2)
    longitude = round(float(longitude), 2)

    cursor.execute(
        """
        SELECT id_location
        FROM location_dimension
        WHERE latitude = %s AND longitude = %s
        """,
        (latitude, longitude)
    )

    row = cursor.fetchone()

    if row:
        return row[0]

    cursor.execute(
        """
        INSERT INTO location_dimension
        (name, latitude, longitude, location_context, region, country)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id_location
        """,
        (
            station.get("name"),
            latitude,
            longitude,
            "station",
            None,
            "Portugal",
        )
    )

    return cursor.fetchone()[0]


def get_source_id(cursor, normalized_data):
    source_name = normalized_data.get("source")
    meta = normalized_data.get("meta", {})

    data_nature = meta.get("dataNature")
    data_type = "terrestrial"

    cursor.execute(
        """
        SELECT id_source
        FROM source_dimension
        WHERE name = %s
          AND LOWER(data_nature) = LOWER(%s)
          AND data_type = %s
        LIMIT 1
        """,
        (source_name, data_nature, data_type)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(f"Fonte não encontrada em source_dimension: {source_name}")

    return row[0]


def get_variable_id(cursor, field_name):
    cursor.execute(
        """
        SELECT id_variable
        FROM variable_dimension
        WHERE field_name = %s
        """,
        (field_name,)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(f"Variável não encontrada em variable_dimension: {field_name}")

    return row[0]


def get_context_id(cursor, context_type):
    cursor.execute(
        """
        SELECT id_context
        FROM context_dimension
        WHERE type = %s
        """,
        (context_type,)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(f"Contexto não encontrado em context_dimension: {context_type}")

    return row[0]


# =====================================================
# SAVE
# =====================================================

def save_observation(conn, normalized_data, request_id, context_type):
    station = normalized_data.get("station", {})
    observation = normalized_data.get("observation", {})
    time_data = normalized_data.get("time", {})

    requested_location = normalized_data.get("requestedLocation", {})

    requested_lat = str(requested_location.get("latitude"))
    requested_lon = str(requested_location.get("longitude"))

    data_date = time_data.get("date")
    data_hour = time_data.get("hour")

    now = datetime.now(ZoneInfo("Europe/Lisbon"))
    request_date = now.date().isoformat()
    request_hour = now.strftime("%H:%M")

    raw_json = json.dumps(normalized_data)

    inserted_count = 0

    with conn.cursor() as cursor:
        id_date_request = get_calendar_id(cursor, request_date)
        id_hour_request = get_hour_id(cursor, request_hour)

        id_date_data = get_calendar_id(cursor, data_date)
        id_hour_data = get_hour_id(cursor, data_hour)

        id_location = get_location_id(cursor, station)
        id_source = get_source_id(cursor, normalized_data)
        id_context = get_context_id(cursor, context_type)

        distance_km = station.get("distanceKm")

        for field_name, value in observation.items():

            if value is None:
                continue

            if field_name in NUMERIC_VARIABLES:

                if field_name == "precipitationPeriod":
                    value_numeric = float(str(value).replace("h", ""))

                else:
                    value_numeric = value

                value_text = None

            elif field_name in TEXT_VARIABLES:
                value_numeric = None
                value_text = str(value)

            else:
                continue

            id_variable = get_variable_id(cursor, field_name)

            cursor.execute(
                """
                SELECT id_measurement
                FROM measurement_facts
                WHERE
                    id_date_data = %s
                    AND id_hour_data = %s
                    AND id_location = %s
                    AND id_source = %s
                    AND id_variable = %s
                    AND id_context = %s
                    AND data_status = %s
                    AND raw_json->'requestedLocation'->>'latitude' = %s
                    AND raw_json->'requestedLocation'->>'longitude' = %s
                """,
                (
                    id_date_data,
                    id_hour_data,
                    id_location,
                    id_source,
                    id_variable,
                    id_context,
                    "observation",
                    requested_lat,
                    requested_lon,
                )
            )

            existing = cursor.fetchone()

            if existing:

                cursor.execute(
                    """
                    UPDATE measurement_facts
                    SET
                        request_id = %s,
                        value = %s,
                        value_text = %s,
                        raw_json = %s::jsonb,
                        distance_km = %s,
                        id_date_request = %s,
                        id_hour_request = %s
                    WHERE id_measurement = %s
                    """,
                    (
                        request_id,
                        value_numeric,
                        value_text,
                        raw_json,
                        distance_km,
                        id_date_request,
                        id_hour_request,
                        existing[0],
                    )
                )

            else:

                cursor.execute(
                    """
                    INSERT INTO measurement_facts (
                        request_id,
                        value,
                        value_text,
                        raw_json,
                        distance_km,
                        data_status,
                        id_date_request,
                        id_hour_request,
                        id_date_data,
                        id_hour_data,
                        id_location,
                        id_source,
                        id_variable,
                        id_context
                    )
                    VALUES (
                        %s, %s, %s, %s::jsonb, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s
                    )
                    """,
                    (
                        request_id,
                        value_numeric,
                        value_text,
                        raw_json,
                        distance_km,
                        "observation",
                        id_date_request,
                        id_hour_request,
                        id_date_data,
                        id_hour_data,
                        id_location,
                        id_source,
                        id_variable,
                        id_context,
                    )
                )

            inserted_count += 1

    conn.commit()
    return inserted_count
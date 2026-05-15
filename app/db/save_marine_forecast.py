import json
from datetime import datetime
from zoneinfo import ZoneInfo

# =====================================================
# CONFIG
# =====================================================

NUMERIC_VARIABLES = {
    "waveHeightM",
    "waveHeightMinM",
    "waveHeightMaxM",
    "totalSeaMinM",
    "totalSeaMaxM",
    "waveDirectionDegrees",
    "wavePeriodS",
    "wavePeriodMinS",
    "wavePeriodMaxS",
    "wavePeakPeriodS",
    "swellHeightM",
    "swellDirectionDegrees",
    "swellPeriodS",
    "waterTemperatureC",
    "waterTemperatureMinC",
    "waterTemperatureMaxC",
    "currentSpeedMs",
    "currentDirectionDegrees",
    "windSpeedKmh",
    "windDirectionDegrees",
    "windGustKmh",
}

TEXT_VARIABLES = {
    "waveDirectionCardinal",
    "swellDirectionCardinal",
    "windDirectionCardinal",
}


# =====================================================
# HELPERS
# =====================================================

def parse_hour(hour_text):
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


def get_location_id(cursor, location):
    latitude = location.get("latitude")
    longitude = location.get("longitude")

    if latitude is None or longitude is None:
        raise ValueError("Latitude e longitude são obrigatórias.")

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
            location.get("name"),
            latitude,
            longitude,
            "coastal",
            None,
            "Portugal",
        )
    )

    return cursor.fetchone()[0]


def get_source_id(cursor, normalized_data):
    source_name = normalized_data.get("source")
    meta = normalized_data.get("meta") or {}

    data_nature = meta.get("dataNature")
    data_type = "marine"

    #print("DEBUG NORMALIZED META:", meta)
    #print("DEBUG SOURCE NAME:", repr(source_name))
    #print("DEBUG DATA NATURE:", repr(data_nature))
    #print("DEBUG DATA TYPE:", repr(data_type))

    cursor.execute(
        """
        SELECT id_source
        FROM source_dimension
        WHERE LOWER(name) = LOWER(%s)
          AND LOWER(data_nature) = LOWER(%s)
          AND LOWER(data_type) = LOWER(%s)
        LIMIT 1
        """,
        (source_name, data_nature, data_type)
    )

    row = cursor.fetchone()

    if not row:
        raise ValueError(
            f"Fonte marítima não encontrada em source_dimension: "
            f"{source_name} | {data_nature} | {data_type}"
        )

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

def save_marine_forecast(conn, normalized_data, request_id, context_type="coastal"):
    location = normalized_data.get("location", {})
    time_data = normalized_data.get("time", {})

    marine = normalized_data.get("marine", {})
    wind = normalized_data.get("wind", {})
    current = normalized_data.get("current", {})

    all_data = {
        **marine,
        **wind,
        **current,
    }

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

        id_location = get_location_id(cursor, location)
        id_source = get_source_id(cursor, normalized_data)
        id_context = get_context_id(cursor, context_type)

        distance_km = location.get("distanceKm")

        for field_name, value in all_data.items():
            if value is None:
                continue

            if field_name in NUMERIC_VARIABLES:
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
                    "forecast",
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
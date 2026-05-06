CREATE EXTENSION IF NOT EXISTS postgis;

-- DIMENSÃO CALENDÁRIO
CREATE TABLE calendar_dimension (
    id_date SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    year INT,
    month INT,
    day INT,
	month_name TEXT,
    day_of_week INT,
	day_name TEXT,
	semester INT,
    quarter INT,
    week_of_year INT
);

-- DIMENSÃO HORA
CREATE TABLE hour_dimension (
    id_hour SERIAL PRIMARY KEY,
    hour INT NOT NULL,
    minute INT NOT NULL,
    full_time TIME NOT NULL,
    day_period TEXT,
    UNIQUE (hour, minute)
);

-- DIMENSÃO LOCAL
CREATE TABLE location_dimension (
    id_location SERIAL PRIMARY KEY,
    name TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_context TEXT,
    region TEXT,
    country TEXT,
    UNIQUE (latitude, longitude)
);

-- DIMENSÃO FONTE
CREATE TABLE source_dimension (
    id_source SERIAL PRIMARY KEY,
    name TEXT,
    base_url TEXT,
    weather_model TEXT,
    update_interval_hour INT, 
    data_nature TEXT, 
    data_type TEXT
);

-- DIMENSÃO VARIÁVEL
CREATE TABLE variable_dimension (
    id_variable SERIAL PRIMARY KEY,
    field_name TEXT,
    description TEXT,
    unit TEXT,
    category TEXT
);

-- DIMENSÃO CONTEXTO
CREATE TABLE context_dimension (
    id_context SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    drone_wind_limit_kmh DOUBLE PRECISION,
    drone_gust_limit_kmh DOUBLE PRECISION,
    drone_precipitation_limit DOUBLE PRECISION,
    coastal_wave_limit_m DOUBLE PRECISION,
    coastal_wind_limit_kmh DOUBLE PRECISION
);

-- TABELA DE FACTOS
CREATE TABLE measurement_facts (
    id_measurement SERIAL PRIMARY KEY,
	
	request_id TEXT NOT NULL,

   
    value DOUBLE PRECISION,
    raw_json JSONB,
    distance_km DOUBLE PRECISION,

    data_status TEXT NOT NULL,

    id_date_request INT NOT NULL REFERENCES calendar_dimension(id_date),
    id_hour_request INT NOT NULL REFERENCES hour_dimension(id_hour),

    id_date_data INT NOT NULL REFERENCES calendar_dimension(id_date),
    id_hour_data INT NOT NULL REFERENCES hour_dimension(id_hour),

    id_location INT NOT NULL REFERENCES location_dimension(id_location),
    id_source INT NOT NULL REFERENCES source_dimension(id_source),
    id_variable INT NOT NULL REFERENCES variable_dimension(id_variable),
    id_context INT NOT NULL REFERENCES context_dimension(id_context)
);



-- ÍNDICES (recomendado para pesquisas rápidas) 
CREATE INDEX idx_request_id ON measurement_facts(request_id); 
CREATE INDEX idx_request_time ON measurement_facts(id_date_request, id_hour_request);
CREATE INDEX idx_data_time ON measurement_facts(id_date_data, id_hour_data);
-- limpar
TRUNCATE TABLE measurement_facts RESTART IDENTITY CASCADE;
TRUNCATE TABLE variable_dimension RESTART IDENTITY CASCADE;
TRUNCATE TABLE location_dimension RESTART IDENTITY CASCADE;
TRUNCATE TABLE calendar_dimension RESTART IDENTITY CASCADE;
TRUNCATE TABLE hour_dimension RESTART IDENTITY CASCADE;
TRUNCATE TABLE source_dimension RESTART IDENTITY CASCADE;
TRUNCATE TABLE context_dimension RESTART IDENTITY CASCADE;

INSERT INTO context_dimension (type, drone_wind_limit_kmh, drone_gust_limit_kmh, drone_precipitation_limit, coastal_wave_limit_m, coastal_wind_limit_kmh)
VALUES
('drone', 43, 43, 2, NULL, NULL),
('coastal', NULL, NULL, NULL, 7, 80);


INSERT INTO source_dimension (name, base_url, weather_model, update_interval_hour, data_nature, data_type)
VALUES
('worldweatheronline', 'https://api.worldweatheronline.com/premium/v1/marine.ashx', 'WWO', NULL, 'forecast', 'marine'),
('open-meteo', 'https://api.open-meteo.com/v1/forecast', 'ECMWF', 6, 'forecast', 'terrestrial'),
('open-meteo', 'https://api.open-meteo.com/v1/forecast', 'ICON', 3, 'forecast', 'terrestrial'),
('open-meteo', 'https://api.open-meteo.com/v1/forecast', 'ARPEGE & AROME', 6, 'forecast', 'terrestrial'),
('open-meteo', 'https://marine-api.open-meteo.com/v1/marine', 'DWD EWAM', 1, 'forecast', 'marine'),
('ipma', 'https://api.ipma.pt/public-data/forecast/aggregate/{global_id}.json', 'ECMWF + AROME', 12, 'forecast', 'terrestrial'),
('ipma', 'https://api.ipma.pt/open-data/forecast/oceanography/daily/hp-daily-sea-forecast-day{id_day}.json', 'ECMWF + AROME', 12, 'forecast', 'marine'),
('ipma', 'https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json', NULL, 1, 'observation', 'terrestrial'),
('openweather', 'https://api.openweathermap.org/data/2.5/forecast', 'OpenWeather', NULL, 'forecast', 'terrestrial'),
('foreca', 'https://pfa.foreca.com/api/v1/observation/latest/{lon},{lat}', NULL, NULL, 'observation', 'terrestrial');


-- variavel_dimensao
INSERT INTO variable_dimension (field_name, description, unit, category)
VALUES
--atmosfera
('temperatureC', 'Air temperature', 'C', 'Atmosphere'),
('temperatureMinC', 'Minimum air temperature', 'C', 'Atmosphere'),
('temperatureMaxC', 'Maximum air temperature', 'C', 'Atmosphere'),
('feelsLikeTemperatureC', 'Feels like temperature', 'C', 'Atmosphere'),
('windSpeedKmh', 'Wind speed', 'km/h', 'Wind'),
('windSpeedMaxKmh', 'Maximum wind speed', 'km/h', 'Wind'),
('windDirectionDegrees', 'Wind direction (degrees)', 'degrees', 'Wind'),
('windDirectionCardinal', 'Wind direction (cardinal)', 'cardinal', 'Wind'),
('windGustKmh', 'Wind gust speed', 'km/h', 'Wind'),
('precipitationMm', 'Precipitation', 'mm', 'Precipitation'),
('precipitationProbabilityPercent', 'Precipitation probability', '%', 'Precipitation'),
('precipitationPeriod', 'Precipitation period', 'h', 'Precipitation'),
('humidityPercent', 'Relative humidity', '%', 'Atmosphere'),
('cloudCoverPercent', 'Cloud cover', '%', 'Atmosphere'),
('visibilityKm', 'Visibility', 'km', 'Atmosphere'),
('pressureHpa', 'Atmospheric pressure', 'hPa', 'Atmosphere'),

('sunriseH', 'Sunrise Time', 'h', 'Atmosphere'),
('sunsetH', 'Sunset Time', 'h', 'Atmosphere'),

-- mar
('waveHeightM', 'Wave height', 'm', 'Maritime'),
('waveHeightMinM', 'Minimum wave height', 'm', 'Maritime'),
('waveHeightMaxM', 'Maximum wave height', 'm', 'Maritime'),
('totalSeaMinM', 'Minimum sea height', 'm', 'Maritime'),
('totalSeaMaxM', 'Maximum sea height', 'm', 'Maritime'),
('waveDirectionDegrees', 'Wave direction (degrees)', 'degrees', 'Maritime'),
('waveDirectionCardinal', 'Wave direction (cardinal)', 'cardinal', 'Maritime'),
('wavePeriodS', 'Wave period', 's', 'Maritime'),
('wavePeriodMinS', 'Minimum wave period', 's', 'Maritime'),
('wavePeriodMaxS', 'Maximum wave period', 's', 'Maritime'),
('wavePeakPeriodS', 'Peak wave period', 's', 'Maritime'),

('swellHeightM', 'Swell height', 'm', 'Maritime'),
('swellDirectionDegrees', 'Swell direction (degrees)', 'degrees', 'Maritime'),
('swellDirectionCardinal', 'Swell direction (cardinal)', 'cardinal', 'Maritime'),
('swellPeriodS', 'Swell period', 's', 'Maritime'),
('waterTemperatureC', 'Sea water temperature', 'C', 'Maritime'),
('waterTemperatureMinC', 'Minimum sea water temperature', 'C', 'Maritime'),
('waterTemperatureMaxC', 'Maximum sea water temperature', 'C', 'Maritime'),
('currentSpeedMs', 'Sea current speed', 'm/s', 'Maritime'),
('currentDirectionDegrees', 'Sea current direction (degrees)', 'degrees', 'Maritime');


-- local_dimensao
INSERT INTO location_dimension (name, latitude, longitude, location_context, region, country)
VALUES
('Porto', 41.1579, -8.6291, 'terrestrial', 'North', 'Portugal'),
('Braga', 41.5454, -8.4265, 'terrestrial', 'North', 'Portugal'),
('Viana do Castelo', 41.6932, -8.8329, 'coastal', 'North', 'Portugal'),
('Vila Real', 41.3006, -7.7441, 'terrestrial', 'North', 'Portugal'),
('Braganca', 41.8060, -6.7567, 'terrestrial', 'North', 'Portugal'),

('Aveiro', 40.6405, -8.6538, 'coastal', 'Center', 'Portugal'),
('Coimbra', 40.2033, -8.4103, 'terrestrial', 'Center', 'Portugal'),
('Leiria', 39.7436, -8.8070, 'terrestrial', 'Center', 'Portugal'),
('Viseu', 40.6610, -7.9097, 'terrestrial', 'Center', 'Portugal'),
('Guarda', 40.5373, -7.2674, 'terrestrial', 'Center', 'Portugal'),
('Castelo Branco', 39.8222, -7.4909, 'terrestrial', 'Center', 'Portugal'),
('Nazare', 39.6010, -9.0700, 'coastal', 'Center', 'Portugal'),
('Figueira da Foz', 40.1508, -8.8618, 'coastal', 'Center', 'Portugal'),

('Lisboa', 38.7223, -9.1393, 'terrestrial', 'Lisbon', 'Portugal'),
('Sintra', 38.8029, -9.3817, 'terrestrial', 'Lisbon', 'Portugal'),
('Cascais', 38.6979, -9.4215, 'coastal', 'Lisbon', 'Portugal'),
('Setubal', 38.5244, -8.8882, 'coastal', 'Lisbon', 'Portugal'),

('Evora', 38.5710, -7.9135, 'terrestrial', 'Alentejo', 'Portugal'),
('Beja', 38.0151, -7.8632, 'terrestrial', 'Alentejo', 'Portugal'),
('Sines', 37.9561, -8.8698, 'coastal', 'Alentejo', 'Portugal'),
('Portalegre', 39.2967, -7.4285, 'terrestrial', 'Alentejo', 'Portugal'),

('Faro', 37.0194, -7.9322, 'coastal', 'Algarve', 'Portugal'),
('Portimao', 37.1366, -8.5392, 'coastal', 'Algarve', 'Portugal'),
('Lagos', 37.1020, -8.6742, 'coastal', 'Algarve', 'Portugal'),
('Tavira', 37.1253, -7.6486, 'coastal', 'Algarve', 'Portugal'),

('Funchal', 32.6511, -16.9097, 'coastal', 'Madeira', 'Portugal'),
('Ponta Delgada', 37.7405, -25.6586, 'coastal', 'Azores', 'Portugal'),

('Monte Real', 39.83, -8.88, 'station', 'Center', 'Portugal'),
('Leiria (Aerodromo)', 39.780553, -8.818166, 'station', 'Center', 'Portugal');



-- calendar_dimensao
INSERT INTO calendar_dimension (date, year, month, day, month_name, day_of_week, day_name, semester, quarter, week_of_year)
SELECT 
    d::date,
    EXTRACT(YEAR FROM d),
    EXTRACT(MONTH FROM d),
    EXTRACT(DAY FROM d),
    TRIM(TO_CHAR(d, 'TMMonth')),

    EXTRACT(ISODOW FROM d),
    TRIM(TO_CHAR(d, 'TMDay')),

    CASE WHEN EXTRACT(MONTH FROM d) <= 6 THEN 1 ELSE 2 END,
    EXTRACT(QUARTER FROM d),
    EXTRACT(WEEK FROM d)

FROM generate_series('2025-01-01', '2030-12-31', interval '1 day') d;


-- hora_dimensao
INSERT INTO hour_dimension (hour, minute, full_time, day_period)
SELECT 
    h,
    m,
    MAKE_TIME(h, m, 0),
    CASE 
        WHEN h < 7 THEN 'early morning'
        WHEN h >= 7 AND h < 12 THEN 'morning'
        WHEN h >= 12 AND h < 19 THEN 'afternoon'
        ELSE 'night'
    END
FROM generate_series(0,23) h,
     generate_series(0,59) m;

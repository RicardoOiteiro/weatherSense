-- limpar
TRUNCATE TABLE variavel_dimensao RESTART IDENTITY CASCADE;
TRUNCATE TABLE local_dimensao RESTART IDENTITY CASCADE;
TRUNCATE TABLE calendar_dimensao RESTART IDENTITY CASCADE;
TRUNCATE TABLE hora_dimensao RESTART IDENTITY CASCADE;


-- variavel_dimensao
INSERT INTO variavel_dimensao (nome_campo, descricao, unidade, categoria)
VALUES
--atmosfera
('temperaturaC', 'Temperatura do ar', 'C', 'Atmosfera'),
('velocidadeVentoKmh', 'Velocidade do vento', 'km/h', 'Vento'),
('direcaoVentoGraus', 'Direcao do vento', 'graus', 'Vento'),
('direcaoVentoCardeal', 'Direcao do vento em cardeais', 'ponto cardeal', 'Vento'),
('rajadaVentoKmh', 'Vento Rajadas', 'km/h', 'Vento'),
('precipitacaoMm', 'Precipitacao', 'mm', 'Precipitacao'),
('precipitacaoPeriodo', 'Periodo da Precipitacao', 'h', 'Precipitacao'),
('humidade', 'Humidade relativa', '%', 'Atmosfera'),
('visibilidadeKm', 'Visibilidade', 'km', 'Atmosfera'),
('pressaoHpa', 'Pressao Atmosferica', 'hPa', 'Atmosfera'),
-- mar
('alturaOndasM', 'Altura das ondas', 'm', 'Maritimo'),
('alturaOndasMinM', 'Altura minima das ondas', 'm', 'Maritimo'),
('alturaOndasMaxM', 'Altura maxima das ondas', 'm', 'Maritimo'),
('alturaMarTotalMinM', 'Altura minima do mar', 'm', 'Maritimo'),
('alturaMarTotalMaxM', 'Altura maxima do mar', 'm', 'Maritimo'),
('direcaoOndasGraus', 'Direcao das ondas em graus', 'graus', 'Maritimo'),
('direcaoOndasCardeal', 'Direcao das ondas em cardeais', 'ponto cardeal', 'Maritimo'),
('periodoOndasS', 'Periodo das ondas', 's', 'Maritimo'),
('periodoOndasMinS', 'Periodo minimo das ondas', 's', 'Maritimo'),
('periodoOndasMaxS', 'Periodo maximo das ondas', 's', 'Maritimo'),
('periodoPicoOndasS', 'Periodo do pico das ondas', 's', 'Maritimo'),
('alturaOndulacaoM', 'Altura da ondulação', 'm', 'Maritimo'),
('direcaoOndulacaoGraus', 'Direcao da ondulação em graus', 'graus', 'Maritimo'),
('direcaoOndulacaoCardeal', 'Direcao da ondulação em cardeal', 'ponto cardeal', 'Maritimo'),
('periodoOndulacaoS', 'Periodo da ondulação', 's', 'Maritimo'),
('temperaturaAguaC', 'Temperatura da agua do mar', 'C', 'Maritimo'),
('temperaturaAguaMinC', 'Temperatura minima da agua do mar', 'C', 'Maritimo'),
('temperaturaAguaMaxC', 'Temperatura maxima da agua do mar', 'C', 'Maritimo'),
('velocidadeCorrenteMs', 'Velocidade da corrente do mar', 'ms', 'Maritimo'),
('direcaoCorrenteGraus', 'Direcao da corrente', 'graus', 'Maritimo');


-- local_dimensao
INSERT INTO local_dimensao (nome, latitude, longitude, contexto, regiao, pais)
VALUES
('Lisboa', 38.7223, -9.1393, 'urbano', 'Lisboa', 'Portugal'),
('Porto', 41.1579, -8.6291, 'urbano', 'Norte', 'Portugal'),
('Leiria', 39.7436, -8.8070, 'urbano', 'Centro', 'Portugal'),
('Faro', 37.0194, -7.9322, 'costeiro', 'Algarve', 'Portugal'),
('Nazare', 39.6010, -9.0700, 'costeiro', 'Centro', 'Portugal');


-- calendar_dimensao
INSERT INTO calendar_dimensao (
    data, ano, mes, dia, nome_mes,
    dia_semana, nome_dia_semana,
    semestre, trimestre, semana_ano
)
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

FROM generate_series('2025-01-01', '2026-12-31', interval '1 day') d;


-- hora_dimensao
INSERT INTO hora_dimensao (hora, minuto, periodo_dia)
SELECT 
    h,
    m,
    CASE 
        WHEN h < 7 THEN 'madrugada'
        WHEN h >= 7 AND h < 12 THEN 'manhã'
        WHEN h >= 12 AND h < 19 THEN 'tarde'
        ELSE 'noite'
    END
FROM generate_series(0,23) h,
     generate_series(0,59) m;
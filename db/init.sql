CREATE EXTENSION IF NOT EXISTS postgis;

-- DIMENSÃO CALENDÁRIO
CREATE TABLE calendar_dimensao (
    id_data SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    ano INT,
    mes INT,
    dia INT,
	nome_mes TEXT,
    dia_semana INT,
	nome_dia_semana TEXT,
	semestre INT,
    trimestre INT,
    semana_ano INT
);

-- DIMENSÃO HORA
CREATE TABLE hora_dimensao (
    id_hora SERIAL PRIMARY KEY,
    hora INT,
    minuto INT,
    periodo_dia TEXT
);

-- DIMENSÃO LOCAL
CREATE TABLE local_dimensao (
    id_local SERIAL PRIMARY KEY,
    nome TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contexto TEXT,
    regiao TEXT,
    pais TEXT
);

-- DIMENSÃO FONTE
CREATE TABLE fonte_dimensao (
    id_fonte SERIAL PRIMARY KEY,
    nome TEXT,
    url_base TEXT,
    modelo_meteorologico TEXT,
    intervalo_atualizacao_hora INT,
    natureza_dado TEXT
);

-- DIMENSÃO VARIÁVEL
CREATE TABLE variavel_dimensao (
    id_variavel SERIAL PRIMARY KEY,
    nome_campo TEXT,
    descricao TEXT,
    unidade TEXT,
    categoria TEXT
);

-- DIMENSÃO CONTEXTO
CREATE TABLE contexto_dimensao (
    id_contexto SERIAL PRIMARY KEY,
    tipo TEXT,
    limite_vento_drone_kmh DOUBLE PRECISION,
    limite_rajada_drone_kmh DOUBLE PRECISION,
    limite_precipitacao_drone DOUBLE PRECISION,
    limite_onda_costeiro_m DOUBLE PRECISION,
    limite_vento_costeiro_kmh DOUBLE PRECISION
);

-- TABELA DE FACTOS
CREATE TABLE medicao_factos (
    id_medicao SERIAL PRIMARY KEY,
	
	id_chamada TEXT,

    valor DOUBLE PRECISION,
    valor_normalizado DOUBLE PRECISION,
    raw_json JSONB,
    concordancia DOUBLE PRECISION,

    timestamp_dados TIMESTAMP,
    timestamp_pedido TIMESTAMP,

    id_data INT REFERENCES calendar_dimensao(id_data),
    id_hora INT REFERENCES hora_dimensao(id_hora),
    id_local INT REFERENCES local_dimensao(id_local),
    id_fonte INT REFERENCES fonte_dimensao(id_fonte),
    id_variavel INT REFERENCES variavel_dimensao(id_variavel),
    id_contexto INT REFERENCES contexto_dimensao(id_contexto)
);
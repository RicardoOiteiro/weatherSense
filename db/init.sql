CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE local_dimensao (
    id_local SERIAL PRIMARY KEY,
    nome TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE fonte_dimensao (
    id_fonte SERIAL PRIMARY KEY,
    nome TEXT,
    tipo TEXT
);

CREATE TABLE variavel_dimensao (
    id_variavel SERIAL PRIMARY KEY,
    nome TEXT,
    unidade TEXT
);

CREATE TABLE medicao_factos (
    id_medicao SERIAL PRIMARY KEY,
    id_local INT REFERENCES local_dimensao(id_local),
    id_fonte INT REFERENCES fonte_dimensao(id_fonte),
    id_variavel INT REFERENCES variavel_dimensao(id_variavel),
    valor DOUBLE PRECISION,
    timestamp_dados TIMESTAMP
);
-- Normaliza `provider` en utility_bills y bill_consumptions según catálogo vigente.
-- Compatible con Supabase SQL Editor (sin tablas temporales ni BEGIN/COMMIT).
-- Idempotente: se puede re-ejecutar sin efectos colaterales.
-- Ejecutar TODO el script de una vez (Run).

-- ---------------------------------------------------------------------------
-- 1) utility_bills: mapa canónico por factura_id
-- ---------------------------------------------------------------------------
UPDATE utility_bills ub
SET provider = f.provider
FROM (
  VALUES
    -- Arrendamiento
    ('eb3a81be-4ec5-4713-8d81-52cc5b62e85b'::uuid, 'AGRO ZETA SAS'),
    ('d44086e8-a981-4d74-b0ed-c31181839adf'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('678bf267-46ca-47b5-bcc6-9a9ab840503d'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('33a61c84-88c2-4038-ad23-78f99663d06c'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('10dc09fb-23b8-471c-84d5-a56bca215154'::uuid, 'COLTEBIENES'),
    ('76c0da48-999c-482e-95f9-c6551e42bf05'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('948f0cb7-9cee-45b4-af8d-57821a9d491f'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('e03514ce-e79a-4520-aff1-62d3b796ffb6'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('f5456397-33bc-4f80-92e2-b8e74562d8f0'::uuid, 'SOTO S.A.S'),
    ('7ab858f4-c6c1-4d2c-824d-4098bac708df'::uuid, 'AGRO ZETA SAS'),
    ('20561b19-220c-4925-afaa-89da45c1d8e7'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('830d4739-4d68-494d-b9f4-473d8b02c0ce'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('2d8e3370-e612-4c98-ae14-4d3b48eafd7c'::uuid, 'CARLOS A SANCHEZ Y CIA CASYCO SAS'),
    ('6ba21973-cc14-461b-a45d-a71fcf9d088a'::uuid, 'CELPA ZONA FRANCA'),
    ('085a853c-17d6-486e-be10-7836483983aa'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('275cf90e-0c88-4993-91f7-4d79712dfe9b'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('f732a0a9-2907-4f8b-b198-3e3f448a24fc'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('a6aa2aa1-b58d-4c2b-8058-be53f74ce27d'::uuid, 'COLTEBIENES'),
    ('0df04900-d307-429d-abe3-f7710b99d780'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('d33a9bb6-297e-4312-befe-5086e844e6a9'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('f1ccbf0e-b149-47ae-9966-d7b12b21d0bf'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('df966534-218d-42be-95da-4e696f241ad2'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('efa76a98-57b3-4920-a792-812b710799e8'::uuid, 'SOTO S.A.S'),
    ('92c6b2b0-ac90-4d5a-ba6a-ea3c7c5beb74'::uuid, 'AGRO ZETA SAS'),
    ('46ed1c5c-a375-4376-9b55-3af1cd372943'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('e5fd052c-0922-4ad3-a405-7dba36fa857e'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('61077d47-365c-46ef-bb8c-41557192bdd5'::uuid, 'CARLOS A SANCHEZ Y CIA CASYCO SAS'),
    ('c1af2791-6e68-461d-87c0-2cdb939300a0'::uuid, 'CELPA ZONA FRANCA'),
    ('65aa3914-66ad-4697-9fac-500ce0e363ff'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('74877c01-7e70-4741-be98-9c31da9a4d68'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('26481139-29fe-489d-a545-a87746bf0ed6'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('bc90941b-0184-466c-85f5-b82ad6b7b7b9'::uuid, 'COLTEBIENES'),
    ('b8aaf3c9-32c2-4cc2-bfee-d1473373b98c'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('1376448b-4da4-4f9f-b702-b8be1b518d8f'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('c58947f3-fcdf-4e36-97ee-db2ddeff0574'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('a79cc91e-00d0-42ca-a217-bbec44f36dc6'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('d73529ec-4513-46d7-ab92-e34bc669c740'::uuid, 'SOTO S.A.S'),
    ('a3a42087-b115-4e6f-8420-9a637c14fe46'::uuid, 'AGRO ZETA SAS'),
    ('de5224df-6adf-4464-88ff-4563c51d1d09'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('febb4bc9-c572-4cb4-b2a5-33d7781e1b32'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('287fe869-64b3-4588-9eaf-68006e4c963e'::uuid, 'CELPA ZONA FRANCA'),
    ('f8185a99-89dd-4c37-857b-925d8e6e8245'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('56007337-d6ae-440f-a7ea-8a2b4c033d40'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('83ee1a4d-7361-4618-abcf-78bd1a13ce09'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('49942da6-7d90-4f74-aca4-3612e6cae4b5'::uuid, 'COLTEBIENES'),
    ('9e836a97-e837-43ab-a060-18aa55d4b0b0'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('84109212-d708-4ae5-bb90-598097db774b'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('c7f17742-f2d4-4bbd-b590-146097ba88cb'::uuid, 'SOTO S.A.S'),
    -- Impuesto Predial
    ('da49c631-abca-4480-8875-c7a2c973e0ca'::uuid, 'Alcaldia mayor de Bogotá'),
    ('f982b18f-4ad8-4993-8bf9-226a6cad3bfd'::uuid, 'Alcaldia distrital de Buenaventura'),
    ('ab8678b1-a311-4919-88a7-42a38a433974'::uuid, 'Municipio de Cisneros'),
    ('1c403055-cdc9-46e1-9618-b202308854c2'::uuid, 'Alcaldia municipal de Urrao'),
    ('729c1211-10ca-487f-b23c-ce45f945bc79'::uuid, 'Municipio de Guarne'),
    ('a168f3b2-0a9b-46e4-84e6-87ec1133fba3'::uuid, 'Alcaldia municipal Turbaco'),
    ('044e3c5c-c432-4fd1-90bb-99a1f67a32de'::uuid, 'Municipio de Tenjo'),
    ('b6a785ae-a3eb-4f2f-9189-f10ed0466596'::uuid, 'Municipio de Envigado'),
    ('2588fd17-7025-4bac-b7c6-a9445dee2596'::uuid, 'Municipio de Envigado'),
    ('82e5cd42-3410-4be7-8e40-e7855d1c045e'::uuid, 'Municipio de Sabaneta'),
    ('48085335-38c0-4b17-84e5-0b178aa17190'::uuid, 'Alcaldia de Barranquilla'),
    ('864e03a7-ecc3-4387-8f92-9f5f0dd94a17'::uuid, 'Alcaldia Mayor Cartagena'),
    ('0780c1e4-2cdb-47ad-b478-3817794bfca3'::uuid, 'Alcaldia de Villavicencio'),
    ('3018dd8e-d341-4ebf-b7f4-77798c7de923'::uuid, 'Alcaldia distrital de Buenaventura')
) AS f(bill_id, provider)
WHERE ub.id = f.bill_id
  AND ub.provider IS DISTINCT FROM f.provider;

-- ---------------------------------------------------------------------------
-- 2) bill_consumptions: mismo mapa por bill_id
-- ---------------------------------------------------------------------------
UPDATE bill_consumptions bc
SET provider = f.provider
FROM (
  VALUES
    ('eb3a81be-4ec5-4713-8d81-52cc5b62e85b'::uuid, 'AGRO ZETA SAS'),
    ('d44086e8-a981-4d74-b0ed-c31181839adf'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('678bf267-46ca-47b5-bcc6-9a9ab840503d'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('33a61c84-88c2-4038-ad23-78f99663d06c'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('10dc09fb-23b8-471c-84d5-a56bca215154'::uuid, 'COLTEBIENES'),
    ('76c0da48-999c-482e-95f9-c6551e42bf05'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('948f0cb7-9cee-45b4-af8d-57821a9d491f'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('e03514ce-e79a-4520-aff1-62d3b796ffb6'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('f5456397-33bc-4f80-92e2-b8e74562d8f0'::uuid, 'SOTO S.A.S'),
    ('7ab858f4-c6c1-4d2c-824d-4098bac708df'::uuid, 'AGRO ZETA SAS'),
    ('20561b19-220c-4925-afaa-89da45c1d8e7'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('830d4739-4d68-494d-b9f4-473d8b02c0ce'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('2d8e3370-e612-4c98-ae14-4d3b48eafd7c'::uuid, 'CARLOS A SANCHEZ Y CIA CASYCO SAS'),
    ('6ba21973-cc14-461b-a45d-a71fcf9d088a'::uuid, 'CELPA ZONA FRANCA'),
    ('085a853c-17d6-486e-be10-7836483983aa'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('275cf90e-0c88-4993-91f7-4d79712dfe9b'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('f732a0a9-2907-4f8b-b198-3e3f448a24fc'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('a6aa2aa1-b58d-4c2b-8058-be53f74ce27d'::uuid, 'COLTEBIENES'),
    ('0df04900-d307-429d-abe3-f7710b99d780'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('d33a9bb6-297e-4312-befe-5086e844e6a9'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('f1ccbf0e-b149-47ae-9966-d7b12b21d0bf'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('df966534-218d-42be-95da-4e696f241ad2'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('efa76a98-57b3-4920-a792-812b710799e8'::uuid, 'SOTO S.A.S'),
    ('92c6b2b0-ac90-4d5a-ba6a-ea3c7c5beb74'::uuid, 'AGRO ZETA SAS'),
    ('46ed1c5c-a375-4376-9b55-3af1cd372943'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('e5fd052c-0922-4ad3-a405-7dba36fa857e'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('61077d47-365c-46ef-bb8c-41557192bdd5'::uuid, 'CARLOS A SANCHEZ Y CIA CASYCO SAS'),
    ('c1af2791-6e68-461d-87c0-2cdb939300a0'::uuid, 'CELPA ZONA FRANCA'),
    ('65aa3914-66ad-4697-9fac-500ce0e363ff'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('74877c01-7e70-4741-be98-9c31da9a4d68'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('26481139-29fe-489d-a545-a87746bf0ed6'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('bc90941b-0184-466c-85f5-b82ad6b7b7b9'::uuid, 'COLTEBIENES'),
    ('b8aaf3c9-32c2-4cc2-bfee-d1473373b98c'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('1376448b-4da4-4f9f-b702-b8be1b518d8f'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('c58947f3-fcdf-4e36-97ee-db2ddeff0574'::uuid, 'MARIELA SANABRIA ALDANA'),
    ('a79cc91e-00d0-42ca-a217-bbec44f36dc6'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('d73529ec-4513-46d7-ab92-e34bc669c740'::uuid, 'SOTO S.A.S'),
    ('a3a42087-b115-4e6f-8420-9a637c14fe46'::uuid, 'AGRO ZETA SAS'),
    ('de5224df-6adf-4464-88ff-4563c51d1d09'::uuid, 'ANSERRA GLOBEL S.A.S.'),
    ('febb4bc9-c572-4cb4-b2a5-33d7781e1b32'::uuid, 'ARAUJO Y SEGOVIA DE CORDOBA SA'),
    ('287fe869-64b3-4588-9eaf-68006e4c963e'::uuid, 'CELPA ZONA FRANCA'),
    ('f8185a99-89dd-4c37-857b-925d8e6e8245'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('56007337-d6ae-440f-a7ea-8a2b4c033d40'::uuid, 'CENTRO LOGISTICO STOCK CARIBE SAS'),
    ('83ee1a4d-7361-4618-abcf-78bd1a13ce09'::uuid, 'CIMA COMPAÑIA INMOBILIARIA SAS'),
    ('49942da6-7d90-4f74-aca4-3612e6cae4b5'::uuid, 'COLTEBIENES'),
    ('9e836a97-e837-43ab-a060-18aa55d4b0b0'::uuid, 'FERNANDO REINA Y CIA SAS'),
    ('84109212-d708-4ae5-bb90-598097db774b'::uuid, 'PROMOTORA INMOBILIARIA DEL PACIFICO COLOMBIANO SAS'),
    ('c7f17742-f2d4-4bbd-b590-146097ba88cb'::uuid, 'SOTO S.A.S'),
    ('da49c631-abca-4480-8875-c7a2c973e0ca'::uuid, 'Alcaldia mayor de Bogotá'),
    ('f982b18f-4ad8-4993-8bf9-226a6cad3bfd'::uuid, 'Alcaldia distrital de Buenaventura'),
    ('ab8678b1-a311-4919-88a7-42a38a433974'::uuid, 'Municipio de Cisneros'),
    ('1c403055-cdc9-46e1-9618-b202308854c2'::uuid, 'Alcaldia municipal de Urrao'),
    ('729c1211-10ca-487f-b23c-ce45f945bc79'::uuid, 'Municipio de Guarne'),
    ('a168f3b2-0a9b-46e4-84e6-87ec1133fba3'::uuid, 'Alcaldia municipal Turbaco'),
    ('044e3c5c-c432-4fd1-90bb-99a1f67a32de'::uuid, 'Municipio de Tenjo'),
    ('b6a785ae-a3eb-4f2f-9189-f10ed0466596'::uuid, 'Municipio de Envigado'),
    ('2588fd17-7025-4bac-b7c6-a9445dee2596'::uuid, 'Municipio de Envigado'),
    ('82e5cd42-3410-4be7-8e40-e7855d1c045e'::uuid, 'Municipio de Sabaneta'),
    ('48085335-38c0-4b17-84e5-0b178aa17190'::uuid, 'Alcaldia de Barranquilla'),
    ('864e03a7-ecc3-4387-8f92-9f5f0dd94a17'::uuid, 'Alcaldia Mayor Cartagena'),
    ('0780c1e4-2cdb-47ad-b478-3817794bfca3'::uuid, 'Alcaldia de Villavicencio'),
    ('3018dd8e-d341-4ebf-b7f4-77798c7de923'::uuid, 'Alcaldia distrital de Buenaventura')
) AS f(bill_id, provider)
WHERE bc.bill_id = f.bill_id
  AND bc.provider IS DISTINCT FROM f.provider;

-- ---------------------------------------------------------------------------
-- 3) Normalización global Impuesto Predial (variantes ALL CAPS / tipografía)
-- ---------------------------------------------------------------------------
UPDATE utility_bills
SET provider = CASE upper(trim(both FROM translate(provider, 'ÁÉÍÓÚÜáéíóúü', 'AEIOUUaeiouu')))
  WHEN 'ALCALDIA MAYOR DE BOGOTA' THEN 'Alcaldia mayor de Bogotá'
  WHEN 'ALCALDIA DISTRITAL DE BUENAVENTURA' THEN 'Alcaldia distrital de Buenaventura'
  WHEN 'MUNICIPIO DE CISNEROS' THEN 'Municipio de Cisneros'
  WHEN 'ALCALDIA MUNICIPAL DE URRAO' THEN 'Alcaldia municipal de Urrao'
  WHEN 'MUNICIPIO DE GUARNE' THEN 'Municipio de Guarne'
  WHEN 'ALCALDIA MUNICIPAL TURBACO' THEN 'Alcaldia municipal Turbaco'
  WHEN 'MUNICIPIO DE TENJO' THEN 'Municipio de Tenjo'
  WHEN 'MUNICIPIO DE ENVIGADO' THEN 'Municipio de Envigado'
  WHEN 'MUNICIPIO DE SABANETA' THEN 'Municipio de Sabaneta'
  WHEN 'ALCALDIA DE BARRANQUILLA' THEN 'Alcaldia de Barranquilla'
  WHEN 'ALCADIA MAYOR CARTAGENA' THEN 'Alcaldia Mayor Cartagena'
  WHEN 'ALCALDIA MAYOR CARTAGENA' THEN 'Alcaldia Mayor Cartagena'
  WHEN 'ALCALDIA DE VILLAVICENCIO' THEN 'Alcaldia de Villavicencio'
  ELSE provider
END
WHERE service_type = 'property_tax';

UPDATE bill_consumptions
SET provider = CASE upper(trim(both FROM translate(provider, 'ÁÉÍÓÚÜáéíóúü', 'AEIOUUaeiouu')))
  WHEN 'ALCALDIA MAYOR DE BOGOTA' THEN 'Alcaldia mayor de Bogotá'
  WHEN 'ALCALDIA DISTRITAL DE BUENAVENTURA' THEN 'Alcaldia distrital de Buenaventura'
  WHEN 'MUNICIPIO DE CISNEROS' THEN 'Municipio de Cisneros'
  WHEN 'ALCALDIA MUNICIPAL DE URRAO' THEN 'Alcaldia municipal de Urrao'
  WHEN 'MUNICIPIO DE GUARNE' THEN 'Municipio de Guarne'
  WHEN 'ALCALDIA MUNICIPAL TURBACO' THEN 'Alcaldia municipal Turbaco'
  WHEN 'MUNICIPIO DE TENJO' THEN 'Municipio de Tenjo'
  WHEN 'MUNICIPIO DE ENVIGADO' THEN 'Municipio de Envigado'
  WHEN 'MUNICIPIO DE SABANETA' THEN 'Municipio de Sabaneta'
  WHEN 'ALCALDIA DE BARRANQUILLA' THEN 'Alcaldia de Barranquilla'
  WHEN 'ALCADIA MAYOR CARTAGENA' THEN 'Alcaldia Mayor Cartagena'
  WHEN 'ALCALDIA MAYOR CARTAGENA' THEN 'Alcaldia Mayor Cartagena'
  WHEN 'ALCALDIA DE VILLAVICENCIO' THEN 'Alcaldia de Villavicencio'
  ELSE provider
END
WHERE service_type = 'property_tax';

-- ---------------------------------------------------------------------------
-- 4) Verificación (opcional: ejecutar solo esta parte si quieres revisar)
-- ---------------------------------------------------------------------------
SELECT id, invoice_number, service_type, provider, status
FROM utility_bills
WHERE id IN (
  'eb3a81be-4ec5-4713-8d81-52cc5b62e85b'::uuid,
  'da49c631-abca-4480-8875-c7a2c973e0ca'::uuid,
  '864e03a7-ecc3-4387-8f92-9f5f0dd94a17'::uuid,
  '1c403055-cdc9-46e1-9618-b202308854c2'::uuid,
  '82e5cd42-3410-4be7-8e40-e7855d1c045e'::uuid,
  '0780c1e4-2cdb-47ad-b478-3817794bfca3'::uuid
)
ORDER BY service_type, provider;

SELECT DISTINCT provider
FROM utility_bills
WHERE service_type = 'property_tax'
ORDER BY 1;

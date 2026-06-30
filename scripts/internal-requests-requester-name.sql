-- Nombre de quien solicita en solicitudes internas
ALTER TABLE internal_requests ADD COLUMN IF NOT EXISTS requester_name text;

COMMENT ON COLUMN internal_requests.requester_name IS 'Nombre de quien solicita la solicitud interna';

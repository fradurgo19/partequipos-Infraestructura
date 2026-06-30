-- Permite listar sedes (id, nombre) en el formulario público de solicitudes internas
DROP POLICY IF EXISTS "Public read sites for internal request form" ON sites;
CREATE POLICY "Public read sites for internal request form"
  ON sites FOR SELECT
  TO anon, authenticated
  USING (true);

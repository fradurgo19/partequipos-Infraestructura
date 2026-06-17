-- Función auxiliar para actualizar contraseña de usuarios pagos (coordinador)
CREATE OR REPLACE FUNCTION update_pagos_password(p_user_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pagos_profiles
  SET password_hash = crypt(p_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_pagos_password(uuid, text) TO anon, authenticated, service_role;

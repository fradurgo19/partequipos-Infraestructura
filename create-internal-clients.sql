-- Script para actualizar perfiles de usuarios de clientes internos
-- IMPORTANTE: Los usuarios ya fueron creados en Supabase Auth UI
-- Este script actualiza sus perfiles con el rol y departamento correctos

-- Actualizar perfil de Maquinaria
UPDATE profiles 
SET 
  full_name = 'Cliente Interno - Maquinaria',
  role = 'internal_client',
  department = 'Maquinaria'
WHERE email = 'maquinariainfra@partequipos.com';

-- Actualizar perfil de Repuestos
UPDATE profiles 
SET 
  full_name = 'Cliente Interno - Repuestos',
  role = 'internal_client',
  department = 'Repuestos'
WHERE email = 'repuestosinfra@partequipos.com';

-- Actualizar perfil de Bienes Inmuebles
UPDATE profiles 
SET 
  full_name = 'Cliente Interno - Bienes Inmuebles',
  role = 'internal_client',
  department = 'Bienes inmuebles'
WHERE email = 'bienesinmueblesinfra@partequipos.com';

-- Si los perfiles no existen (el trigger no los creó), crearlos manualmente con los UUIDs reales
INSERT INTO profiles (id, email, full_name, role, department)
VALUES 
  ('ca8f8192-2c9f-4d3e-bade-b7eaa2a95089', 'maquinariainfra@partequipos.com', 'Cliente Interno - Maquinaria', 'internal_client', 'Maquinaria'),
  ('0452a343-0f08-4ef9-8782-903aa6f3c41a', 'repuestosinfra@partequipos.com', 'Cliente Interno - Repuestos', 'internal_client', 'Repuestos'),
  ('2b388eb8-0e96-4395-8c24-470798a392c1', 'bienesinmueblesinfra@partequipos.com', 'Cliente Interno - Bienes Inmuebles', 'internal_client', 'Bienes inmuebles')
ON CONFLICT (id) 
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  email = EXCLUDED.email;

-- Verificar usuarios creados
SELECT id, email, full_name, role, department, created_at
FROM profiles 
WHERE email IN (
  'maquinariainfra@partequipos.com',
  'repuestosinfra@partequipos.com',
  'bienesinmueblesinfra@partequipos.com'
)
ORDER BY email;


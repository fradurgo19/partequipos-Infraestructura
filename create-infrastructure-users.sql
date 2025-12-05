-- Script para actualizar perfiles de usuarios de infraestructura
-- IMPORTANTE: Primero crea los usuarios en Supabase Auth UI (Authentication > Users)
-- Luego ejecuta este script para actualizar sus perfiles con el rol correcto

-- Actualizar perfil de Edison Valencia
UPDATE profiles 
SET 
  full_name = 'EDISON VALENCIA',
  role = 'infrastructure',
  department = 'Infraestructura'
WHERE email = 'infraestructura@partequipos.com';

-- Actualizar perfil de Andrés Felipe Bustamante Céspedes
UPDATE profiles 
SET 
  full_name = 'ANDRES FELIPE BUSTAMANTE CESPEDES',
  role = 'infrastructure',
  department = 'Infraestructura'
WHERE email = 'fbustamante@partequipos.com';

-- Actualizar perfil de Eloísa Blandón
UPDATE profiles 
SET 
  full_name = 'ELOISA BLANDON',
  role = 'infrastructure',
  department = 'Infraestructura'
WHERE email = 'infraestructura2@partequipos.com';

-- Verificar usuarios creados
SELECT id, email, full_name, role, department, created_at
FROM profiles 
WHERE role = 'infrastructure'
ORDER BY full_name;


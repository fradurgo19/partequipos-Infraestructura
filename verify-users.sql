-- Script para verificar usuarios y perfiles existentes

-- Ver todos los usuarios en auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email IN (
  'infraestructura@partequipos.com',
  'fbustamante@partequipos.com',
  'infraestructura2@partequipos.com'
)
ORDER BY email;

-- Ver todos los perfiles (sin filtrar por rol)
SELECT id, email, full_name, role, department, created_at
FROM profiles
WHERE email IN (
  'infraestructura@partequipos.com',
  'fbustamante@partequipos.com',
  'infraestructura2@partequipos.com'
)
ORDER BY email;

-- Ver todos los perfiles con rol infrastructure
SELECT id, email, full_name, role, department, created_at
FROM profiles
WHERE role = 'infrastructure'
ORDER BY full_name;

-- Ver todos los perfiles existentes (para debug)
SELECT id, email, full_name, role, department
FROM profiles
ORDER BY created_at DESC
LIMIT 10;


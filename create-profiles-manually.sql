-- Crear o actualizar perfiles para los usuarios de infraestructura
-- Usando los IDs de auth.users que ya existen

-- Perfil para Edison Valencia (infraestructura@partequipos.com)
INSERT INTO profiles (id, email, full_name, role, department)
VALUES (
  '469d139f-a865-4bf2-8332-e2a51f73758c',
  'infraestructura@partequipos.com',
  'EDISON VALENCIA',
  'infrastructure',
  'Infraestructura'
)
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'EDISON VALENCIA',
  role = 'infrastructure',
  department = 'Infraestructura',
  email = 'infraestructura@partequipos.com';

-- Perfil para Andrés Felipe Bustamante (fbustamante@partequipos.com)
INSERT INTO profiles (id, email, full_name, role, department)
VALUES (
  '7ed8e9af-a822-4766-8c4d-0dae79eaa49d',
  'fbustamante@partequipos.com',
  'ANDRES FELIPE BUSTAMANTE CESPEDES',
  'infrastructure',
  'Infraestructura'
)
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'ANDRES FELIPE BUSTAMANTE CESPEDES',
  role = 'infrastructure',
  department = 'Infraestructura',
  email = 'fbustamante@partequipos.com';

-- Perfil para Eloísa Blandón (infraestructura2@partequipos.com)
INSERT INTO profiles (id, email, full_name, role, department)
VALUES (
  'b1d9b820-ed38-441b-909a-dfb91f5d9fdc',
  'infraestructura2@partequipos.com',
  'ELOISA BLANDON',
  'infrastructure',
  'Infraestructura'
)
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'ELOISA BLANDON',
  role = 'infrastructure',
  department = 'Infraestructura',
  email = 'infraestructura2@partequipos.com';

-- Verificar que los perfiles se crearon correctamente
SELECT id, email, full_name, role, department, created_at
FROM profiles
WHERE id IN (
  '469d139f-a865-4bf2-8332-e2a51f73758c',
  '7ed8e9af-a822-4766-8c4d-0dae79eaa49d',
  'b1d9b820-ed38-441b-909a-dfb91f5d9fdc'
)
ORDER BY full_name;


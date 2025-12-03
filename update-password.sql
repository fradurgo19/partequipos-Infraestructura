-- Actualizar contraseña del admin
UPDATE users 
SET password_hash = '$2a$10$E0GDFkdEXjGwk97YP49edufRfkBlqJy5DJqdwC4RGTQcQi3WwNtu.' 
WHERE email = 'admin@partequipos.com';


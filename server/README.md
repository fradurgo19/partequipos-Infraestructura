# Maintenance Management System - Backend API

Backend Node.js con Express para el sistema de gestión de mantenimiento.

## Requisitos

- Node.js 18+
- Supabase account con proyecto configurado

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase.

3. Iniciar servidor de desarrollo:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## Endpoints

- `GET /health` - Health check
- `POST /api/auth/login` - Login
- `GET /api/sites` - Obtener sitios
- `GET /api/tasks` - Obtener tareas
- `POST /api/upload/file` - Subir archivo
- `POST /api/upload/image/watermark` - Subir imagen con watermark

Ver código fuente para lista completa de endpoints.

## Variables de Entorno

Ver `.env.example` o `env-example-backend.txt` en la raíz del proyecto para todas las variables requeridas.

## Pruebas de flujo API → Supabase

Para verificar que todos los registros se crean y viajan correctamente a Supabase:

1. Backend con **Supabase** (no usar `USE_LOCAL_DB=true`).
2. En `server/.env` define usuario de prueba:
   - `TEST_EMAIL=tu_usuario@ejemplo.com`
   - `TEST_PASSWORD=tu_contraseña`
3. Con el servidor en marcha (`npm run dev`), en otra terminal:

```bash
cd server
npm run test:supabase
```

El script ejecuta GET de todos los recursos (sites, contractors, tasks, etc.) y POST de creación con datos mínimos, y muestra un resumen de éxitos y fallos.


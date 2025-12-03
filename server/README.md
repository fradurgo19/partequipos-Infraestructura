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

Ver `.env.example` para todas las variables requeridas.


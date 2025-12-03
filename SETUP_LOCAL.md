# 🚀 Setup PostgreSQL Local - Paso a Paso

## 1️⃣ Crear Base de Datos

Abre **pgAdmin** o **psql** y ejecuta:

```sql
CREATE DATABASE maintenance_db;
```

## 2️⃣ Ejecutar Migraciones

Conectate a la base de datos y ejecuta el archivo `migrations-local.sql`:

### Opción A: Desde psql
```bash
psql -U postgres -d maintenance_db -f migrations-local.sql
```

### Opción B: Desde pgAdmin
1. Abrir pgAdmin
2. Conectar a tu servidor PostgreSQL
3. Click derecho en `maintenance_db` > Query Tool
4. Abrir el archivo `migrations-local.sql`
5. Ejecutar (F5)

## 3️⃣ Crear Archivos .env

### Frontend (.env en la raíz):
Copiar `env-example-frontend.txt` a `.env`:
```powershell
copy env-example-frontend.txt .env
```

### Backend (server/.env):
Copiar `env-example-backend.txt` a `server/.env`:
```powershell
copy env-example-backend.txt server\.env
```

**IMPORTANTE**: Editar `server/.env` y cambiar `DB_PASSWORD=password` con tu contraseña real de PostgreSQL.

## 4️⃣ Iniciar Servidores

### Terminal 1 - Backend:
```powershell
cd server
npm run dev
```

Debes ver:
```
✅ Conectado a PostgreSQL
🚀 Server running on port 3000
```

### Terminal 2 - Frontend:
```powershell
npm run dev
```

## 5️⃣ Verificar

### Backend:
Abrir: http://localhost:3000/health

Debe mostrar:
```json
{
  "status": "ok",
  "database": "PostgreSQL local",
  "timestamp": "...",
  "db_time": "..."
}
```

### Frontend:
Abrir: http://localhost:5173

### Login:
- Email: `admin@partequipos.com`
- Password: `admin123`

## ✅ ¡Listo!

Ya estás trabajando con PostgreSQL local.

Cuando quieras migrar a Supabase para producción, solo cambia en `server/.env`:
```
USE_LOCAL_DB=false
```

Y agrega las credenciales de Supabase.


# ============================================
# Script de Configuración de Desarrollo
# Maintenance Management System
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  🚀 Setup de Desarrollo - Local" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
    
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Host "⚠️  ADVERTENCIA: Se requiere Node.js 18 o superior" -ForegroundColor Yellow
        Write-Host "   Versión actual: $nodeVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Write-Host "   Descárgalo de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verificar npm
Write-Host "📦 Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm instalado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm no está instalado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  📝 Configuración de Variables de Entorno" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Crear .env para frontend
if (Test-Path ".env") {
    Write-Host "⚠️  El archivo .env ya existe en la raíz" -ForegroundColor Yellow
    $overwrite = Read-Host "   ¿Deseas sobrescribirlo? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "   Manteniendo .env existente" -ForegroundColor Yellow
    } else {
        Remove-Item ".env"
        $createFrontendEnv = $true
    }
} else {
    $createFrontendEnv = $true
}

if ($createFrontendEnv) {
    Write-Host "📄 Creando .env para Frontend..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Por favor ingresa tus credenciales de Supabase:" -ForegroundColor Cyan
    Write-Host "(Encuéntralas en: Project Settings > API en Supabase Dashboard)" -ForegroundColor Gray
    Write-Host ""
    
    $supabaseUrl = Read-Host "   SUPABASE_URL (ej: https://xxxxx.supabase.co)"
    $supabaseAnonKey = Read-Host "   SUPABASE_ANON_KEY (clave pública)"
    
    $frontendEnv = @"
# Supabase Configuration
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseAnonKey

# Application Environment
VITE_APP_ENV=development
"@
    
    $frontendEnv | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Archivo .env creado en la raíz" -ForegroundColor Green
}

Write-Host ""

# Crear .env para backend
if (Test-Path "server\.env") {
    Write-Host "⚠️  El archivo server\.env ya existe" -ForegroundColor Yellow
    $overwrite = Read-Host "   ¿Deseas sobrescribirlo? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "   Manteniendo server\.env existente" -ForegroundColor Yellow
    } else {
        Remove-Item "server\.env"
        $createBackendEnv = $true
    }
} else {
    $createBackendEnv = $true
}

if ($createBackendEnv) {
    Write-Host "📄 Creando .env para Backend..." -ForegroundColor Yellow
    
    if (-not $supabaseUrl) {
        Write-Host ""
        Write-Host "Por favor ingresa tus credenciales de Supabase:" -ForegroundColor Cyan
        $supabaseUrl = Read-Host "   SUPABASE_URL"
        $supabaseAnonKey = Read-Host "   SUPABASE_ANON_KEY"
    }
    
    Write-Host ""
    $supabaseServiceKey = Read-Host "   SUPABASE_SERVICE_ROLE_KEY (clave privada - ¡NO compartir!)"
    
    # Generar JWT Secret aleatorio
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    $backendEnv = @"
# Supabase Configuration
SUPABASE_URL=$supabaseUrl
SUPABASE_ANON_KEY=$supabaseAnonKey
SUPABASE_SERVICE_ROLE_KEY=$supabaseServiceKey

# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=$jwtSecret

# Notifications (Opcional - deshabilitado por defecto)
NOTIFICATIONS_ENABLED=false
NOTIFICATIONS_EMAIL=false
NOTIFICATIONS_TEAMS=false
NOTIFICATIONS_WHATSAPP=false

# Logging
LOG_LEVEL=debug
DEBUG=true
"@
    
    if (-not (Test-Path "server")) {
        New-Item -Path "server" -ItemType Directory | Out-Null
    }
    
    $backendEnv | Out-File -FilePath "server\.env" -Encoding UTF8
    Write-Host "✅ Archivo server\.env creado" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  📦 Instalación de Dependencias" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Instalar dependencias del frontend
Write-Host "📦 Instalando dependencias del Frontend..." -ForegroundColor Yellow
Write-Host ""
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencias del Frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "❌ Error al instalar dependencias del Frontend" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Instalar dependencias del backend
if (Test-Path "server") {
    Write-Host "📦 Instalando dependencias del Backend..." -ForegroundColor Yellow
    Write-Host ""
    Set-Location server
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias del Backend instaladas" -ForegroundColor Green
    } else {
        Write-Host "❌ Error al instalar dependencias del Backend" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ Configuración Completada" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 ¡Todo listo para desarrollar!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🔧 Ejecutar migraciones en Supabase:" -ForegroundColor Yellow
Write-Host "   - Ve a Supabase Dashboard > SQL Editor" -ForegroundColor Gray
Write-Host "   - Ejecuta el archivo: supabase/migrations/20251031021807_initial_schema.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 📁 Crear Storage Buckets en Supabase:" -ForegroundColor Yellow
Write-Host "   - site-photos, site-blueprints, task-photos, signatures, documents" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 👤 Crear usuario de prueba en Supabase Auth" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. 🚀 Iniciar servidores de desarrollo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Terminal 1 (Frontend):" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "   Terminal 2 (Backend):" -ForegroundColor Cyan
Write-Host "   cd server" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📚 Para más detalles, consulta:" -ForegroundColor Yellow
Write-Host "   GUIA_DESPLIEGUE_LOCAL.md" -ForegroundColor White
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan


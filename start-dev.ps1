# ============================================
# Script para Iniciar Ambos Servidores
# Frontend (Vite) + Backend (Express)
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  🚀 Iniciando Servidores de Desarrollo" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que existen los archivos .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: No se encontró el archivo .env en la raíz" -ForegroundColor Red
    Write-Host "   Por favor ejecuta primero:" -ForegroundColor Yellow
    Write-Host "   .\setup-dev.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "   O crea el archivo .env manualmente." -ForegroundColor Yellow
    Write-Host "   Ver: INSTRUCCIONES_ENV.md" -ForegroundColor White
    exit 1
}

if (-not (Test-Path "server\.env")) {
    Write-Host "❌ ERROR: No se encontró el archivo server\.env" -ForegroundColor Red
    Write-Host "   Por favor ejecuta primero:" -ForegroundColor Yellow
    Write-Host "   .\setup-dev.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "   O crea el archivo server\.env manualmente." -ForegroundColor Yellow
    Write-Host "   Ver: INSTRUCCIONES_ENV.md" -ForegroundColor White
    exit 1
}

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  ADVERTENCIA: No se encontró node_modules en la raíz" -ForegroundColor Yellow
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path "server\node_modules")) {
    Write-Host "⚠️  ADVERTENCIA: No se encontró node_modules en server/" -ForegroundColor Yellow
    Write-Host "   Instalando dependencias del backend..." -ForegroundColor Yellow
    Push-Location server
    npm install
    Pop-Location
}

Write-Host "✅ Verificaciones completadas" -ForegroundColor Green
Write-Host ""

# Información para el usuario
Write-Host "📋 Información de los servidores:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🎨 Frontend (Vite):" -ForegroundColor Yellow
Write-Host "      http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "   ⚙️  Backend (Express):" -ForegroundColor Yellow
Write-Host "      http://localhost:3000" -ForegroundColor White
Write-Host "      Health: http://localhost:3000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Para detener: Presiona Ctrl+C" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Función para manejar Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Host ""
    Write-Host "🛑 Deteniendo servidores..." -ForegroundColor Yellow
    Stop-Job -Name "Frontend" -ErrorAction SilentlyContinue
    Stop-Job -Name "Backend" -ErrorAction SilentlyContinue
    Remove-Job -Name "Frontend" -ErrorAction SilentlyContinue
    Remove-Job -Name "Backend" -ErrorAction SilentlyContinue
}

# Iniciar Frontend como Job
Write-Host "🚀 Iniciando Frontend..." -ForegroundColor Green
$frontendJob = Start-Job -Name "Frontend" -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

# Esperar un momento antes de iniciar el backend
Start-Sleep -Seconds 2

# Iniciar Backend como Job
Write-Host "🚀 Iniciando Backend..." -ForegroundColor Green
$backendJob = Start-Job -Name "Backend" -ScriptBlock {
    Set-Location $using:PWD\server
    npm run dev
}

Write-Host ""
Write-Host "✅ Ambos servidores iniciados" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Mostrando logs combinados..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Mostrar logs de ambos jobs
try {
    while ($true) {
        # Mostrar logs del frontend
        $frontendOutput = Receive-Job -Name "Frontend" -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            $frontendOutput | ForEach-Object {
                Write-Host "[FRONTEND] $_" -ForegroundColor Cyan
            }
        }
        
        # Mostrar logs del backend
        $backendOutput = Receive-Job -Name "Backend" -ErrorAction SilentlyContinue
        if ($backendOutput) {
            $backendOutput | ForEach-Object {
                Write-Host "[BACKEND]  $_" -ForegroundColor Yellow
            }
        }
        
        # Verificar si algún job falló
        $frontendState = (Get-Job -Name "Frontend").State
        $backendState = (Get-Job -Name "Backend").State
        
        if ($frontendState -eq "Failed") {
            Write-Host ""
            Write-Host "❌ El servidor Frontend falló" -ForegroundColor Red
            Receive-Job -Name "Frontend"
            break
        }
        
        if ($backendState -eq "Failed") {
            Write-Host ""
            Write-Host "❌ El servidor Backend falló" -ForegroundColor Red
            Receive-Job -Name "Backend"
            break
        }
        
        Start-Sleep -Milliseconds 500
    }
}
catch {
    Write-Host ""
    Write-Host "🛑 Deteniendo servidores..." -ForegroundColor Yellow
}
finally {
    # Limpiar jobs
    Stop-Job -Name "Frontend" -ErrorAction SilentlyContinue
    Stop-Job -Name "Backend" -ErrorAction SilentlyContinue
    Remove-Job -Name "Frontend" -ErrorAction SilentlyContinue
    Remove-Job -Name "Backend" -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "✅ Servidores detenidos" -ForegroundColor Green
    Write-Host ""
}


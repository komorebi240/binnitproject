<#
.SYNOPSIS
  Starts a second set of DEV servers (database project_dev, seed users) next to the public site:
  frontend http://localhost:3001, backend port 8081. Use it to try changes without touching the public site.

.DESCRIPTION
  -Stop closes these dev servers (the public site is not touched).
  Mail is written to the backend window instead of being sent (MAIL_DEV_LOG=true).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\run-dev-parallel.ps1
  powershell -ExecutionPolicy Bypass -File .\run-dev-parallel.ps1 -Stop
#>
param([switch]$Stop)

$ErrorActionPreference = "Stop"

$BackendPort = 8081
$FrontendPort = 3001

if ($Stop) {
    foreach ($port in $BackendPort, $FrontendPort) {
        $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $listener) { continue }
        $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)").ParentProcessId
        if ($parentId) { cmd /c "taskkill /PID $parentId /T /F >nul 2>&1" }
        cmd /c "taskkill /PID $($listener.OwningProcess) /T /F >nul 2>&1"
    }
    Write-Host "Parallel dev servers stopped."
    return
}

# The child windows opened by run-local.ps1 inherit these.
$env:SERVER_PORT = "$BackendPort"
$env:FRONTEND_PORT = "$FrontendPort"
$env:BACKEND_ORIGIN = "http://localhost:$BackendPort"
$env:NEXT_DIST_DIR = ".next-dev"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:$FrontendPort"
$env:FRONTEND_URL = "http://localhost:$FrontendPort"
$env:PUBLIC_BASE_URL = "http://localhost:$FrontendPort"
$env:MAIL_DEV_LOG = "true"
$env:SPRING_PROFILES_ACTIVE = ""

& (Join-Path $PSScriptRoot "run-local.ps1") -Target all
Write-Host "Dev frontend: http://localhost:$FrontendPort  (login with the seed users, e.g. binmit2)"

<#
.SYNOPSIS
  Starts the Orbit backend and frontend for local development.

.DESCRIPTION
  -Target all (default)  opens the backend and the frontend, each in its own PowerShell window.
                         Close a window (or press Ctrl+C in it) to stop that server.
  -Target backend        runs the Spring Boot backend (profile "dev") in this window.
  -Target frontend       runs the Next.js dev server in this window.

  A server that already answers on its port is left alone, so running this twice is harmless.

  The backend reads its settings from backend\.env.local (gitignored; template: backend\.env.example).
  A variable that is already set in your shell wins over the file.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\run-local.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\run-local.ps1 -Target backend
#>
param(
    [ValidateSet("all", "backend", "frontend")]
    [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

$BackendDir = Join-Path $PSScriptRoot "backend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"
$BackendEnvFile = Join-Path $BackendDir ".env.local"
# Ports can be moved (SERVER_PORT / FRONTEND_PORT) so a second set of dev servers can run next to the public ones.
$BackendPort = if ($env:SERVER_PORT) { [int]$env:SERVER_PORT } else { 8080 }
$FrontendPort = if ($env:FRONTEND_PORT) { [int]$env:FRONTEND_PORT } else { 3000 }
$SqlServerPort = 1433
$PortProbeTimeoutMs = 1000
$RequiredBackendSettings = @(
    "JWT_SECRET", "DB_USERNAME", "DB_PASSWORD",
    "DRIVE_TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"
)
# Where backend\README.md says Maven was unpacked when it is not on PATH.
$FallbackMaven = Join-Path $env:USERPROFILE "tools\apache-maven-3.9.16\bin\mvn.cmd"

function Test-PortOpen([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $attempt = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        return ($attempt.AsyncWaitHandle.WaitOne($PortProbeTimeoutMs) -and $client.Connected)
    }
    finally {
        $client.Close()
    }
}

function Test-AlreadyRunning([string]$Name, [int]$Port) {
    if (Test-PortOpen $Port) {
        Write-Host "${Name}: already answering on port $Port, not starting another one."
        return $true
    }
    return $false
}

# The title is cosmetic: some hosts have no console to retitle, which must not stop the server.
function Set-WindowTitle([string]$Title) {
    try { $Host.UI.RawUI.WindowTitle = $Title }
    catch { Write-Verbose "Could not set the window title: $_" }
}

# Loads KEY=VALUE lines ("#" starts a comment line). A variable already set in the shell wins.
function Import-EnvFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    foreach ($line in Get-Content $Path) {
        $text = $line.Trim()
        if ($text -eq "" -or $text.StartsWith("#")) { continue }
        $separator = $text.IndexOf("=")
        if ($separator -lt 1) { continue }
        $name = $text.Substring(0, $separator).Trim()
        $value = $text.Substring($separator + 1).Trim()
        $quoted = $value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'")))
        if ($quoted) { $value = $value.Substring(1, $value.Length - 2) }
        if ($value -ne "" -and -not (Test-Path "env:$name")) {
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

function Find-Maven {
    $onPath = Get-Command mvn -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    if (Test-Path $FallbackMaven) { return $FallbackMaven }
    throw "Maven was not found. Put mvn on PATH or unpack it to $FallbackMaven (see backend\README.md, 'Running locally')."
}

function Start-Backend {
    if (Test-AlreadyRunning "Backend" $BackendPort) { return }
    Import-EnvFile $BackendEnvFile
    $missing = @($RequiredBackendSettings | Where-Object { -not (Test-Path "env:$_") })
    if ($missing.Count -gt 0) {
        throw "Missing backend settings: $($missing -join ', '). Copy backend\.env.example to backend\.env.local and fill them in."
    }
    if (-not (Test-PortOpen $SqlServerPort)) {
        Write-Warning "SQL Server does not answer on port $SqlServerPort; the backend cannot start until it is running."
    }
    $mvn = Find-Maven
    Set-WindowTitle "Orbit backend (port $BackendPort)"
    Set-Location $BackendDir
    & $mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
}

function Start-Frontend {
    if (Test-AlreadyRunning "Frontend" $FrontendPort) { return }
    Set-WindowTitle "Orbit frontend (port $FrontendPort)"
    Set-Location $FrontendDir
    if (-not (Test-Path "node_modules")) { npm install }
    npm run dev -- -p $FrontendPort
}

function Open-InNewWindow([string]$Name) {
    $arguments = @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-Target", $Name)
    Start-Process -FilePath "powershell.exe" -ArgumentList $arguments | Out-Null
}

switch ($Target) {
    "backend" { Start-Backend }
    "frontend" { Start-Frontend }
    "all" {
        if (-not (Test-AlreadyRunning "Backend" $BackendPort)) { Open-InNewWindow "backend" }
        if (-not (Test-AlreadyRunning "Frontend" $FrontendPort)) { Open-InNewWindow "frontend" }
        Write-Host ""
        Write-Host "Frontend: http://localhost:$FrontendPort"
        Write-Host "Backend:  http://localhost:$BackendPort  (Swagger UI: /swagger-ui.html, health: /actuator/health)"
        Write-Host "The backend needs about half a minute before it answers. Close a window to stop that server."
    }
}

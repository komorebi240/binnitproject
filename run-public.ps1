<#
.SYNOPSIS
  Runs Orbit in production mode on this PC and publishes it at https://app.stayorbit.cloud through
  the named Cloudflare tunnel "orbit".

.DESCRIPTION
  Start (default): stops the dev servers, builds the backend jar and the frontend, starts both
  (backend with the "prod" profile on the empty database "orbit"), then opens the tunnel.
  -Stop: closes the tunnel and both servers (run-local.ps1 brings the dev servers back).
  -SkipBuild: reuse the last builds instead of rebuilding.
  -TunnelOnly: restart just the tunnel (when the site says it cannot reach the PC but the servers are fine).

  Settings: backend\prod.env.local (production overrides: profile, database, fresh secrets, public address),
  then backend\.env.local for what it does not set (database login, SMTP). Both are git-ignored.
  This PC must stay on and online while people use the site.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\run-public.ps1
  powershell -ExecutionPolicy Bypass -File .\run-public.ps1 -Stop
#>
param(
    [switch]$Stop,
    [switch]$SkipBuild,
    [switch]$TunnelOnly
)

$ErrorActionPreference = "Stop"

$BackendDir = Join-Path $PSScriptRoot "backend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"
$StateDir = Join-Path $PSScriptRoot ".tunnel"
$LogFile = Join-Path $StateDir "cloudflared.log"
$Cloudflared = Join-Path $env:USERPROFILE "tools\cloudflared\cloudflared.exe"
$TunnelConfig = Join-Path $env:USERPROFILE ".cloudflared\orbit.yml"
$ProdEnvFile = Join-Path $BackendDir "prod.env.local"
$DevEnvFile = Join-Path $BackendDir ".env.local"
$PublicUrl = "https://app.stayorbit.cloud"
$BackendPort = 8080
$FrontendPort = 3000
$FallbackMaven = Join-Path $env:USERPROFILE "tools\apache-maven-3.9.16\bin\mvn.cmd"
$StartupTimeoutSeconds = 240
$RequiredSettings = @(
    "SPRING_PROFILES_ACTIVE", "SPRING_DATASOURCE_URL", "DB_USERNAME", "DB_PASSWORD",
    "JWT_SECRET", "DRIVE_TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"
)

# Stops whatever listens on the port together with its wrapper (npm / next / java launcher), so nothing is left behind.
function Stop-Listener([int]$Port) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) { return }
    $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)").ParentProcessId
    # cmd /c keeps taskkill's "process not found" (the first call already took the child down) from becoming an error.
    if ($parentId) { cmd /c "taskkill /PID $parentId /T /F >nul 2>&1" }
    cmd /c "taskkill /PID $($listener.OwningProcess) /T /F >nul 2>&1"
    Start-Sleep -Seconds 2
}

# The tunnel runs in its own window like the two servers; closing that window (or this) ends it.
function Stop-Tunnel {
    Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
        Where-Object { $_.CommandLine -match "orbit\.yml" } |
        ForEach-Object {
            cmd /c "taskkill /PID $($_.ParentProcessId) /T /F >nul 2>&1"
            cmd /c "taskkill /PID $($_.ProcessId) /F >nul 2>&1"
        }
}

# A window of its own, not a hidden child of this script: a child can be taken down together with the shell that started it.
function Start-Tunnel {
    if (Test-Path $LogFile) { Remove-Item $LogFile -Force }
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit", "-Command",
        "`$Host.UI.RawUI.WindowTitle = 'Orbit tunnel (app.stayorbit.cloud)'; & '$Cloudflared' tunnel --no-autoupdate --config '$TunnelConfig' run orbit 2>&1 | Tee-Object -FilePath '$LogFile'")
}

# KEY=VALUE lines ("#" starts a comment line). A variable that is already set wins, so the file read first has priority.
function Import-EnvFile([string]$Path) {
    if (-not (Test-Path $Path)) { return }
    foreach ($line in Get-Content $Path) {
        $text = $line.Trim()
        if ($text -eq "" -or $text.StartsWith("#")) { continue }
        $separator = $text.IndexOf("=")
        if ($separator -lt 1) { continue }
        $name = $text.Substring(0, $separator).Trim()
        $value = $text.Substring($separator + 1).Trim()
        if ($value -ne "" -and -not (Test-Path "env:$name")) { Set-Item -Path "env:$name" -Value $value }
    }
}

function Find-Maven {
    $onPath = Get-Command mvn -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    if (Test-Path $FallbackMaven) { return $FallbackMaven }
    throw "Maven was not found. Put mvn on PATH or unpack it to $FallbackMaven"
}

function Get-HttpCode([string]$Url) {
    return (curl.exe -s -o NUL -w "%{http_code}" --max-time 20 $Url)
}

if ($Stop) {
    Stop-Tunnel
    Stop-Listener $FrontendPort
    Stop-Listener $BackendPort
    Write-Host "The public site is closed (tunnel, frontend and backend stopped). Run run-local.ps1 for the normal dev servers."
    return
}

foreach ($required in @($Cloudflared, $TunnelConfig, $ProdEnvFile, $DevEnvFile)) {
    if (-not (Test-Path $required)) { throw "Missing: $required" }
}
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null

if ($TunnelOnly) {
    Stop-Tunnel
    Start-Tunnel
    $deadline = (Get-Date).AddSeconds(90)
    $up = $false
    while ((Get-Date) -lt $deadline -and -not $up) {
        Start-Sleep -Seconds 4
        $up = (Get-HttpCode "$PublicUrl/login") -eq "200"
    }
    if ($up) { Write-Host "Tunnel restarted: $PublicUrl answers." } else { Write-Warning "$PublicUrl does not answer yet; check the tunnel window and $LogFile" }
    return
}

Stop-Tunnel
Stop-Listener $FrontendPort
Stop-Listener $BackendPort

# Settings for the backend process (and so for the window that starts it).
Import-EnvFile $ProdEnvFile
Import-EnvFile $DevEnvFile
if (-not $env:SPRING_DATASOURCE_USERNAME) { $env:SPRING_DATASOURCE_USERNAME = $env:DB_USERNAME }
if (-not $env:SPRING_DATASOURCE_PASSWORD) { $env:SPRING_DATASOURCE_PASSWORD = $env:DB_PASSWORD }
$missing = @($RequiredSettings | Where-Object { -not (Test-Path "env:$_") })
if ($missing.Count -gt 0) { throw "Missing settings: $($missing -join ', ')" }
if ($env:SPRING_PROFILES_ACTIVE -ne "prod") { throw "SPRING_PROFILES_ACTIVE must be prod for the public site" }

if (-not $SkipBuild) {
    Write-Host "Building the backend..."
    Push-Location $BackendDir
    try {
        & (Find-Maven) -B -q -DskipTests package
        if ($LASTEXITCODE -ne 0) { throw "mvn package failed" }
    }
    finally { Pop-Location }
    Write-Host "Building the frontend (about a minute)..."
    Push-Location $FrontendDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    }
    finally { Pop-Location }
}

$jar = Get-ChildItem (Join-Path $BackendDir "target\project-*.jar") | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) { throw "No backend jar found; run without -SkipBuild" }

Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Orbit backend (public, prod profile)'; Set-Location '$BackendDir'; java -jar '$($jar.FullName)'")
# Loopback only: the tunnel (cloudflared, on this PC, dialling localhost:3000) is the frontend's one caller. Reachable from
# the LAN, it would pass a caller's own X-Forwarded-For on to the backend's rate limits. Bound by the NAME "localhost", not
# 127.0.0.1: Next.js 14 rewrites 127.0.0.1 to "localhost" in redirect targets but not in the request's own URL, so with
# 127.0.0.1 its redirects stop being relative and send visitors to https://localhost:3000/... (seen on 2026-10-08).
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit", "-Command",
    "`$Host.UI.RawUI.WindowTitle = 'Orbit frontend (public)'; Set-Location '$FrontendDir'; npm run start -- -H localhost")

# The tunnel last: nothing from outside reaches the servers before they are starting.
Start-Tunnel

Write-Host "Waiting for the backend, the frontend and $PublicUrl ..."
$ready = $false
$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
while ((Get-Date) -lt $deadline -and -not $ready) {
    Start-Sleep -Seconds 4
    $backendUp = (curl.exe -s --max-time 4 "http://localhost:$BackendPort/actuator/health") -match '"status":"UP"'
    $frontendUp = (Get-HttpCode "http://localhost:$FrontendPort/login") -eq "200"
    $ready = $backendUp -and $frontendUp -and ((Get-HttpCode "$PublicUrl/login") -eq "200")
}

if (-not $ready) {
    Write-Warning "Not everything answered within $StartupTimeoutSeconds seconds. Check the two server windows and $LogFile"
}
else {
    Write-Host ""
    Write-Host "Orbit is public at $PublicUrl"
}
Write-Host "Keep this PC on and online while people use it. Stop with: powershell -ExecutionPolicy Bypass -File .\run-public.ps1 -Stop"

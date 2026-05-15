# HireSphere — full local stack (real microservices + API gateway + optional Cognito sync)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== HireSphere local (real backend) ===" -ForegroundColor Cyan

Set-Location $root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Docker not found. Install Docker Desktop first." -ForegroundColor Red
  exit 1
}

Write-Host "[1/4] Starting Docker services (auth, booking, interview, gateway :8080)..."
docker compose up --build -d

Write-Host "[2/4] Waiting for health checks..."
Start-Sleep -Seconds 15
docker compose ps

$envExample = Join-Path $root "frontend\env.local.example"
$envLocal = Join-Path $root "frontend\.env.local"
if (-not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "[3/4] Created frontend/.env.local from example (Cognito + localhost:8080)" -ForegroundColor Green
} else {
  Write-Host "[3/4] Using existing frontend/.env.local" -ForegroundColor Yellow
}

Write-Host "[4/4] Starting frontend on http://localhost:3000 ..."
Set-Location (Join-Path $root "frontend")
if (-not (Test-Path node_modules)) { npm ci }
Write-Host ""
Write-Host "=== Ready ===" -ForegroundColor Green
Write-Host "  Frontend:    http://localhost:3000"
Write-Host "  API Gateway: http://localhost:8080"
Write-Host "  Local JWT:   candidate@hiresphere.com / password123"
Write-Host "  Cognito:     sign in with your pool user -> synced to SQLite via /auth/cognito-sync"
Write-Host ""
npm run dev

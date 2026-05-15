# Build and push HireSphere images to ECR (requires AWS CLI login)
# Usage: .\scripts\push-ecr.ps1 -Region us-east-1 -AccountId 733508957174

param(
    [string]$Region = "us-east-1",
    [string]$AccountId = "733508957174",
    [string]$AppName = "hiresphere"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Registry = "$AccountId.dkr.ecr.$Region.amazonaws.com"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $Registry

$services = @("auth-service", "booking-service", "interview-service")
foreach ($svc in $services) {
    $repo = "$Registry/$AppName/$svc"
    Write-Host "Building $svc -> $repo" -ForegroundColor Cyan
    docker build -t "${repo}:latest" "./$svc"
    docker push "${repo}:latest"
}

$gwRepo = "$Registry/$AppName/api-gateway"
Write-Host "Building api-gateway -> $gwRepo" -ForegroundColor Cyan
docker build -t "${gwRepo}:latest" ./nginx
docker push "${gwRepo}:latest"

Write-Host "Done. Deploy ECS stack: cloudformation/hiresphere-ecs-services.yaml" -ForegroundColor Green

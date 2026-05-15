# HireSphere — apply Kubernetes manifests (Windows)
# Usage: .\scripts\deploy-k8s.ps1 [-BuildImages]

param([switch]$BuildImages)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "HireSphere K8s deploy" -ForegroundColor Cyan

if ($BuildImages) {
    Write-Host "Building Docker images..."
    docker build -t hiresphere/auth-service:latest ./auth-service
    docker build -t hiresphere/booking-service:latest ./booking-service
    docker build -t hiresphere/interview-service:latest ./interview-service
    $minikube = Get-Command minikube -ErrorAction SilentlyContinue
    if ($minikube) {
        minikube image load hiresphere/auth-service:latest
        minikube image load hiresphere/booking-service:latest
        minikube image load hiresphere/interview-service:latest
    }
}

$files = @(
    "k8s/00-namespace.yaml",
    "k8s/01-secret.example.yaml",
    "k8s/nginx-configmap.yaml",
    "k8s/auth-deployment.yaml",
    "k8s/auth-service.yaml",
    "k8s/booking-deployment.yaml",
    "k8s/booking-service.yaml",
    "k8s/interview-deployment.yaml",
    "k8s/interview-service.yaml",
    "k8s/api-gateway-deployment.yaml",
    "k8s/api-gateway-service.yaml"
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) { throw "Missing manifest: $f" }
    kubectl apply -f $f
}

Write-Host ""
Write-Host "Pods:" -ForegroundColor Green
kubectl get pods -n hiresphere
Write-Host ""
Write-Host "Gateway NodePort: 30080 — set VITE_API_URL=http://<node-ip>:30080" -ForegroundColor Yellow

# Quick fix: add HTTPS API Gateway + update Amplify env (run after ECS stack exists)
param(
    [string]$Region = "us-east-1",
    [string]$EcsStack = "hiresphere-ecs",
    [string]$AmplifyAppId = "d2vg09g8z6y2es",
    [string]$AmplifyBranch = "main"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

& "$Root\scripts\deploy-ecs.ps1" -SkipPush -UseCloudFront:$false

$apiUrl = aws cloudformation describe-stacks --stack-name $EcsStack --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiHttpsUrl'].OutputValue" --output text

Write-Host ""
Write-Host "Cloud API ready: $apiUrl" -ForegroundColor Green
Write-Host "Test: curl $apiUrl/health"
Write-Host "Then run GitHub Actions -> Deploy to Amplify"

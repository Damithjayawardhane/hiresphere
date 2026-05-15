# Deploy HireSphere API to ECS + CloudFront HTTPS, then point Amplify at the API URL.
# Prerequisites: AWS CLI configured, Docker running, stack "hiresphere" already deployed.
#
# Usage:
#   .\scripts\deploy-ecs.ps1
#   .\scripts\deploy-ecs.ps1 -SkipPush
#   .\scripts\deploy-ecs.ps1 -AcmCertificateArn arn:aws:acm:us-east-1:...:certificate/...

param(
    [string]$MainStack = "hiresphere",
    [string]$EcsStack = "hiresphere-ecs",
    [string]$Region = "us-east-1",
    [string]$AccountId = "733508957174",
    [string]$AppName = "hiresphere",
    [string]$AmplifyAppId = "d2vg09g8z6y2es",
    [string]$AmplifyBranch = "main",
    [string]$AcmCertificateArn = "",
    [string]$DbPassword = "",
    [switch]$SkipPush,
    [switch]$SkipAmplifyUpdate,
    [switch]$UseCloudFront
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Get-StackOutput($name) {
    $val = aws cloudformation describe-stacks --stack-name $MainStack --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='$name'].OutputValue" --output text 2>$null
    if ($val -and $val -ne "None") { return $val.Trim() }
    return $null
}

function Discover-Infrastructure {
    Write-Host "Discovering AWS resources (stack outputs incomplete)..." -ForegroundColor Yellow
    $albName = "$AppName-alb"
    $albJson = aws elbv2 describe-load-balancers --names $albName --region $Region | ConvertFrom-Json
    if (-not $albJson.LoadBalancers.Count) {
        throw "ALB '$albName' not found. Deploy cloudformation/hiresphere-stack.yaml first."
    }
    $alb = $albJson.LoadBalancers[0]
    $albArn = $alb.LoadBalancerArn
    $albDns = $alb.DNSName
    $vpcId = $alb.VpcId
    $albSg = $alb.SecurityGroups[0]

    $subnets = aws ec2 describe-subnets --region $Region `
        --filters "Name=vpc-id,Values=$vpcId" "Name=map-public-ip-on-launch,Values=true" `
        --query "Subnets[*].SubnetId" --output text
    $subnetList = $subnets -split "\s+" | Where-Object { $_ }
    if ($subnetList.Count -lt 2) { throw "Need at least 2 public subnets in VPC $vpcId" }

    $cluster = "$AppName-cluster"
    $null = aws ecs describe-clusters --clusters $cluster --region $Region --query "clusters[0].clusterName" --output text
    if ($LASTEXITCODE -ne 0) { throw "ECS cluster '$cluster' not found" }

    return @{
        VpcId            = $vpcId
        PublicSubnet1    = $subnetList[0]
        PublicSubnet2    = $subnetList[1]
        LoadBalancerArn  = $albArn
        LoadBalancerDNS  = $albDns
        ALBSecurityGroup = $albSg
        ECSClusterName   = $cluster
    }
}

Write-Host "=== HireSphere ECS + HTTPS API deploy ===" -ForegroundColor Cyan

$poolId = Get-StackOutput "CognitoUserPoolId"
$clientId = Get-StackOutput "CognitoClientId"
if (-not $poolId) { throw "CognitoUserPoolId not found on stack $MainStack" }

$infra = @{
    VpcId            = Get-StackOutput "VpcId"
    PublicSubnet1    = Get-StackOutput "PublicSubnet1Id"
    PublicSubnet2    = Get-StackOutput "PublicSubnet2Id"
    LoadBalancerArn  = Get-StackOutput "LoadBalancerArn"
    LoadBalancerDNS  = Get-StackOutput "LoadBalancerDNS"
    ALBSecurityGroup = Get-StackOutput "ALBSecurityGroupId"
    ECSClusterName   = Get-StackOutput "ECSClusterName"
}

if (-not $infra.LoadBalancerDNS) { $infra.LoadBalancerDNS = Get-StackOutput "LoadBalancerDNS" }
if (-not $infra.VpcId -or -not $infra.LoadBalancerArn) {
    $disc = Discover-Infrastructure
    foreach ($k in $disc.Keys) {
        if (-not $infra[$k]) { $infra[$k] = $disc[$k] }
    }
}

$appIdFromStack = Get-StackOutput "AmplifyAppId"
if ($appIdFromStack) { $AmplifyAppId = $appIdFromStack }

if (-not $SkipPush) {
    & "$Root\scripts\push-ecr.ps1" -Region $Region -AccountId $AccountId -AppName $AppName
}

if (-not $DbPassword) { $DbPassword = $env:HIRESPHERE_DB_PASSWORD }
$databaseUrl = ""
if ($DbPassword) {
    $rdsHost = Get-StackOutput "RdsEndpoint"
    if (-not $rdsHost) {
        $rdsHost = aws rds describe-db-instances --db-instance-identifier "$AppName-db" --region $Region `
            --query "DBInstances[0].Endpoint.Address" --output text 2>$null
    }
    if ($rdsHost -and $rdsHost -ne "None") {
        & "$Root\scripts\init-rds-db.ps1" -DbPassword $DbPassword -MainStack $MainStack -EcsStack $EcsStack -Region $Region -AppName $AppName
        $enc = [uri]::EscapeDataString($DbPassword)
        $databaseUrl = "postgresql://hiresphere:${enc}@${rdsHost}:5432/hiresphere"
        Write-Host "RDS PostgreSQL enabled on ECS tasks." -ForegroundColor Green
    }
} else {
    Write-Host "No DB password (set -DbPassword or HIRESPHERE_DB_PASSWORD). ECS uses SQLite." -ForegroundColor Yellow
}

$overrides = @(
    "AppName=$AppName",
    "AwsAccountId=$AccountId",
    "AwsRegion=$Region",
    "VpcId=$($infra.VpcId)",
    "PublicSubnet1=$($infra.PublicSubnet1)",
    "PublicSubnet2=$($infra.PublicSubnet2)",
    "LoadBalancerArn=$($infra.LoadBalancerArn)",
    "LoadBalancerDnsName=$($infra.LoadBalancerDNS)",
    "ALBSecurityGroupId=$($infra.ALBSecurityGroup)",
    "ECSClusterName=$($infra.ECSClusterName)",
    "CognitoUserPoolId=$poolId",
    "CognitoAppClientId=$clientId"
)
if ($AcmCertificateArn) { $overrides += "AcmCertificateArn=$AcmCertificateArn" }
$overrides += "UseCloudFront=$($UseCloudFront.ToString().ToLower())"
if ($databaseUrl) { $overrides += "DatabaseUrl=$databaseUrl" }

$ecsStatus = aws cloudformation describe-stacks --stack-name $EcsStack --region $Region `
    --query "Stacks[0].StackStatus" --output text 2>$null
if ($ecsStatus -match "ROLLBACK_COMPLETE|ROLLBACK_FAILED") {
    Write-Host "Deleting failed stack $EcsStack ..." -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $EcsStack --region $Region
    aws cloudformation wait stack-delete-complete --stack-name $EcsStack --region $Region
}

Write-Host "Deploying CloudFormation stack: $EcsStack (UseCloudFront=$UseCloudFront)" -ForegroundColor Cyan
aws cloudformation deploy `
    --template-file cloudformation/hiresphere-ecs-services.yaml `
    --stack-name $EcsStack `
    --region $Region `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides @overrides
if ($LASTEXITCODE -ne 0) {
    $st = aws cloudformation describe-stacks --stack-name $EcsStack --region $Region `
        --query "Stacks[0].StackStatus" --output text 2>$null
    if ($st -eq "UPDATE_IN_PROGRESS") {
        Write-Host "Stack still updating (ECS rollout can take 15+ min). Check:" -ForegroundColor Yellow
        Write-Host "  aws cloudformation describe-stacks --stack-name $EcsStack --query Stacks[0].StackStatus" -ForegroundColor Gray
    } else {
        throw "CloudFormation deploy failed (stack status: $st)"
    }
}

$apiUrl = aws cloudformation describe-stacks --stack-name $EcsStack --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiHttpsUrl'].OutputValue" --output text
if (-not $apiUrl -or $apiUrl -like '*Use Amplify*') {
    $apiUrl = "https://$((aws cloudformation describe-stacks --stack-name $EcsStack --region $Region --query ""Stacks[0].Outputs[?OutputKey=='ApiGatewayId'].OutputValue"" --output text)).execute-api.$Region.amazonaws.com"
}

$amplifyUrl = "https://$AmplifyBranch.$AmplifyAppId.amplifyapp.com"
$albHttp = "http://$($infra.LoadBalancerDNS)"

Write-Host ""
Write-Host "=== ECS deployed ===" -ForegroundColor Green
Write-Host "  API (HTTPS):  $apiUrl"
Write-Host "  ALB:          $albHttp"
Write-Host "  Amplify UI:   $amplifyUrl"
Write-Host ""

if (-not $SkipAmplifyUpdate) {
    Write-Host "Updating Amplify build env to HTTPS API Gateway URL..." -ForegroundColor Cyan
    $envVars = "VITE_API_URL=$apiUrl,VITE_SOCKET_URL=$apiUrl,VITE_COGNITO_USER_POOL_ID=$poolId,VITE_COGNITO_CLIENT_ID=$clientId,VITE_AWS_REGION=$Region"
    aws amplify update-branch `
        --app-id $AmplifyAppId `
        --branch-name $AmplifyBranch `
        --region $Region `
        --environment-variables $envVars | Out-Null

    Write-Host "  Amplify env updated. Rebuild frontend (GitHub Actions Deploy to Amplify)." -ForegroundColor Yellow
}

Write-Host "Verify API: curl $apiUrl/health" -ForegroundColor Cyan

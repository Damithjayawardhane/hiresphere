# Create the hiresphere PostgreSQL database on RDS if it does not exist.
# RDS created before DBName was in CloudFormation only has the default "postgres" DB.
#
# Usage: .\scripts\init-rds-db.ps1 -DbPassword 'YourPassword'

param(
    [string]$MainStack = "hiresphere",
    [string]$EcsStack = "hiresphere-ecs",
    [string]$AppName = "hiresphere",
    [string]$Region = "us-east-1",
    [string]$DbPassword = "",
    [string]$DbName = "hiresphere"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not $DbPassword) { $DbPassword = $env:HIRESPHERE_DB_PASSWORD }
if (-not $DbPassword) { throw "Set -DbPassword or HIRESPHERE_DB_PASSWORD" }

function Get-StackOutput($stack, $name) {
    $val = aws cloudformation describe-stacks --stack-name $stack --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='$name'].OutputValue" --output text 2>$null
    if ($val -and $val -ne "None") { return $val.Trim() }
    return $null
}

$rdsHost = Get-StackOutput $MainStack "RdsEndpoint"
if (-not $rdsHost) {
    $rdsHost = aws rds describe-db-instances --db-instance-identifier "$AppName-db" --region $Region `
        --query "DBInstances[0].Endpoint.Address" --output text
}

$subnet1 = Get-StackOutput $MainStack "PublicSubnet1Id"
$subnet2 = Get-StackOutput $MainStack "PublicSubnet2Id"
if (-not $subnet1) {
    $alb = aws elbv2 describe-load-balancers --names "$AppName-alb" --region $Region | ConvertFrom-Json
    $vpcId = $alb.LoadBalancers[0].VpcId
    $subnets = aws ec2 describe-subnets --region $Region `
        --filters "Name=vpc-id,Values=$vpcId" "Name=map-public-ip-on-launch,Values=true" `
        --query "Subnets[*].SubnetId" --output text
    $parts = $subnets -split "\s+"
    $subnet1 = $parts[0]
    $subnet2 = $parts[1]
}

$ecsSg = aws cloudformation describe-stack-resources --stack-name $EcsStack --region $Region `
    --logical-resource-id ECSSecurityGroup --query "StackResources[0].PhysicalResourceId" --output text
$execRole = aws cloudformation describe-stack-resources --stack-name $EcsStack --region $Region `
    --logical-resource-id ECSTaskExecutionRole --query "StackResources[0].PhysicalResourceId" --output text

$cluster = "$AppName-cluster"
$sql = "SELECT 1 FROM pg_database WHERE datname='$DbName';" -replace "'", "''"
$create = "CREATE DATABASE $DbName;" -replace "'", "''"
$shellCmd = "psql -tc `"SELECT 1 FROM pg_database WHERE datname='$DbName'`" | grep -q 1 || psql -c `"CREATE DATABASE $DbName;`""

$taskDef = @{
    family = "$AppName-rds-init"
    networkMode = "awsvpc"
    requiresCompatibilities = @("FARGATE")
    cpu = "256"
    memory = "512"
    executionRoleArn = $execRole
    containerDefinitions = @(
        @{
            name = "psql"
            image = "postgres:16-alpine"
            essential = $true
            environment = @(
                @{ name = "PGHOST"; value = $rdsHost }
                @{ name = "PGUSER"; value = "hiresphere" }
                @{ name = "PGDATABASE"; value = "postgres" }
                @{ name = "PGPASSWORD"; value = $DbPassword }
            )
            command = @("sh", "-c", $shellCmd)
        }
    )
} | ConvertTo-Json -Depth 6

$taskDefFile = Join-Path $env:TEMP "hiresphere-rds-init.json"
[System.IO.File]::WriteAllText($taskDefFile, $taskDef)

Write-Host "Creating database '$DbName' on $rdsHost (if missing)..." -ForegroundColor Cyan
$reg = aws ecs register-task-definition --cli-input-json "file://$taskDefFile" --region $Region | ConvertFrom-Json
$arn = $reg.taskDefinition.taskDefinitionArn

$run = aws ecs run-task `
    --cluster $cluster `
    --task-definition $arn `
    --launch-type FARGATE `
    --network-configuration "awsvpcConfiguration={subnets=[$subnet1,$subnet2],securityGroups=[$ecsSg],assignPublicIp=ENABLED}" `
    --region $Region | ConvertFrom-Json

$taskArn = $run.tasks[0].taskArn
$deadline = (Get-Date).AddMinutes(5)
do {
    Start-Sleep -Seconds 6
    $t = aws ecs describe-tasks --cluster $cluster --tasks $taskArn --region $Region | ConvertFrom-Json
    $last = $t.tasks[0].lastStatus
    if ($last -eq "STOPPED") {
        $exit = $t.tasks[0].containers[0].exitCode
        if ($exit -ne 0) {
            aws logs filter-log-events --log-group-name /ecs/hiresphere --region $Region --limit 5 2>$null
            throw "RDS init task failed (exit $exit): $($t.tasks[0].stoppedReason)"
        }
        Write-Host "Database '$DbName' is ready." -ForegroundColor Green
        return
    }
    if ((Get-Date) -gt $deadline) { throw "RDS init task timed out (status: $last)" }
} while ($true)

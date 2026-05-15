@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "CLOUD_URL=https://main.d2vg09g8z6y2es.amplifyapp.com"
set "GATEWAY=http://localhost:8080"
set "FRONTEND=http://localhost:3000"

:MENU
cls
echo ============================================
echo   HireSphere - Run / Demo Launcher
echo ============================================
echo.
echo   [1] Local full stack  (Docker + frontend)
echo       docker compose -^> gateway :8080
echo       frontend .env.local -^> npm run dev
echo.
echo   [2] Cloud app         (Amplify + Cognito)
echo       %CLOUD_URL%
echo.
echo   [3] Kubernetes        (kubectl apply k8s/)
echo       gateway NodePort 30080
echo.
echo   [4] Manual mode       (no Docker, py services)
echo   [5] Stop Docker       (docker compose down)
echo   [6] AWS ECS + HTTPS   (push ECR, CloudFront API)
echo       needs AWS CLI + stack hiresphere
echo   [0] Exit
echo.
set /p CHOICE="Select option (0-6): "

if "%CHOICE%"=="1" goto LOCAL
if "%CHOICE%"=="2" goto CLOUD
if "%CHOICE%"=="3" goto K8S
if "%CHOICE%"=="4" goto MANUAL
if "%CHOICE%"=="5" goto STOP
if "%CHOICE%"=="6" goto ECS
if "%CHOICE%"=="0" exit /b 0
echo Invalid choice.
timeout /t 2 >nul
goto MENU

:LOCAL
echo.
echo === [1] Local full stack ===
docker --version >nul 2>&1
if errorlevel 1 (
    echo [!] Docker not found. Install Docker Desktop or use option 4.
    pause
    goto MENU
)

echo [1/4] Building and starting Docker Compose...
docker compose up --build -d
if errorlevel 1 (
    echo [!] docker compose failed.
    pause
    goto MENU
)

echo [2/4] Waiting for services (15s)...
timeout /t 15 /nobreak >nul
docker compose ps

echo [3/4] frontend/.env.local ...
if not exist "frontend\.env.local" (
    if exist "frontend\env.local.example" (
        copy /Y "frontend\env.local.example" "frontend\.env.local" >nul
        echo       Created from env.local.example
    ) else (
        echo       [!] env.local.example missing
    )
) else (
    echo       Using existing .env.local
)

echo [4/4] Starting React frontend in new window...
cd frontend
if not exist "node_modules\" call npm ci
start "HireSphere Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
cd /d "%~dp0"

echo.
echo ============================================
echo   Local stack running
echo   Frontend:    %FRONTEND%
echo   API Gateway: %GATEWAY%
echo   Cognito:     sign in with your pool user
echo   Local JWT:   candidate@hiresphere.com / password123
echo ============================================
echo.
pause
goto MENU

:CLOUD
echo.
echo === [2] Cloud (Amplify) ===
echo Opening %CLOUD_URL%
echo Use your Cognito user (register on site if needed).
echo Demo search works if ALB API is not reachable from browser.
start "" "%CLOUD_URL%"
echo.
pause
goto MENU

:K8S
echo.
echo === [3] Kubernetes ===
kubectl version --client >nul 2>&1
if errorlevel 1 (
    echo [!] kubectl not found. Install kubectl and configure cluster access.
    pause
    goto MENU
)

set /p BUILD_IMG="Build Docker images first? (y/N): "
if /I "%BUILD_IMG%"=="y" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-k8s.ps1" -BuildImages
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-k8s.ps1"
)

echo.
echo After pods are Ready:
echo   kubectl get pods -n hiresphere
echo   Gateway: NodePort 30080
echo   Optional: set frontend/.env.local VITE_API_URL=http://^<node-ip^>:30080
echo.
pause
goto MENU

:MANUAL
echo.
echo === [4] Manual mode (no Docker) ===
py --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python not found.
    pause
    goto MENU
)

py -m pip install -q flask flask-sqlalchemy flask-cors pyjwt werkzeug flask-socketio eventlet requests tenacity

if not exist "frontend\.env.local" (
    if exist "frontend\env.local.example" copy /Y "frontend\env.local.example" "frontend\.env.local" >nul
)

echo Starting Auth :5001 ...
start "HireSphere Auth" cmd /k "cd /d %~dp0auth-service && py app.py"
timeout /t 3 /nobreak >nul

echo Starting Booking :5002 ...
start "HireSphere Booking" cmd /k "cd /d %~dp0booking-service && py app.py"
timeout /t 2 /nobreak >nul

echo Starting Interview :5003 ...
start "HireSphere Interview" cmd /k "cd /d %~dp0interview-service && py app.py"
timeout /t 2 /nobreak >nul

echo Starting Frontend :3000 ...
cd frontend
if not exist "node_modules\" call npm ci
start "HireSphere Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
cd /d "%~dp0"

echo.
echo   Open %FRONTEND%  (API calls need gateway :8080 or set VITE_API_URL per service ports)
echo   Login: candidate@hiresphere.com / password123
echo.
pause
goto MENU

:STOP
echo.
echo Stopping Docker Compose...
docker compose down
echo Done.
pause
goto MENU

:ECS
echo.
echo === [6] AWS ECS + HTTPS API (CloudFront) ===
aws --version >nul 2>&1
if errorlevel 1 (
    echo [!] AWS CLI not found. Install and run: aws configure
    pause
    goto MENU
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-ecs.ps1"
echo.
pause
goto MENU

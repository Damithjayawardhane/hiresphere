@echo off
echo ============================================
echo   HireSphere Microservices - Windows Setup
echo ============================================
echo.

REM Check for Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [!] Docker not found. Falling back to manual mode...
    goto MANUAL
)

echo [1/2] Building and starting all services with Docker Compose...
docker compose up --build -d

echo.
echo [2/2] Starting React frontend...
cd frontend
call npm install
start cmd /k "npm run dev"
cd ..

echo.
echo ============================================
echo   All services running!
echo   Frontend:    http://localhost:3000
echo   API Gateway: http://localhost:8080
echo   Auth:        http://localhost:5001
echo   Booking:     http://localhost:5002
echo   Interview:   http://localhost:5003
echo ============================================
goto END

:MANUAL
echo Running services manually (no Docker)...
echo.
py -m pip install flask flask-sqlalchemy flask-cors pyjwt werkzeug flask-socketio eventlet requests

echo Starting Auth Service on :5001 ...
start cmd /k "cd auth-service && py app.py"
timeout /t 3 >nul

echo Starting Booking Service on :5002 ...
start cmd /k "cd booking-service && py app.py"
timeout /t 2 >nul

echo Starting Interview Service on :5003 ...
start cmd /k "cd interview-service && py app.py"
timeout /t 2 >nul

echo Starting React Frontend on :3000 ...
cd frontend
call npm install
start cmd /k "npm run dev"
cd ..

echo.
echo ============================================
echo   All services started!
echo   Open: http://localhost:3000
echo   Login: candidate@hiresphere.com / password123
echo ============================================

:END
pause

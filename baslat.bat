@echo off
chcp 65001 >nul
echo =======================================================
echo          COMPANY OS BASLATMA DOSYASI (OPTIMIZE)
echo =======================================================

echo.
echo [0/4] Eski servisler temizleniyor...
taskkill /F /IM company-os-backend.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul

echo.
echo [1/4] Docker servisleri ve Backend derlemesi baslatiliyor...
REM Docker ve Build paralel baslatiliyor
start /B cmd /c "docker-compose up -d"
cd backend
echo Backend derleniyor...
go build -o company-os-backend.exe main.go
if %errorlevel% neq 0 (
    echo [HATA] Backend derlenemedi.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/4] Servislerin hazir olmasi bekleniyor...
REM Postgres portunun (5432) acilmasini bekle (max 15 sn)
set "count=0"
:wait_loop
netstat -ano | findstr :5432 | findstr LISTENING >nul
if %errorlevel% equ 0 goto services_ready
set /a count+=1
if %count% geq 15 goto services_timeout
echo Bekleniyor (%count%/15)...
timeout /t 1 /nobreak >nul
goto wait_loop

:services_timeout
echo [UYARI] Servisler tam olarak hazir olmayabilir, devam ediliyor...

:services_ready
echo [OK] Servisler hazir.

echo.
echo [3/4] Backend ve Frontend baslatiliyor...
start "Company OS Backend" cmd /k "cd backend && company-os-backend.exe"
start "Company OS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [4/4] Activity Tracker baslatiliyor...
start "Activity Tracker" cmd /k "cd activity-tracker\server && node src\index.js"

echo.
echo =======================================================
echo Tum servisler baslatildi! Pencereleri kapatmayin.
echo.
echo Yonlendirmeler:
echo - Frontend: http://localhost:3000
echo - Backend: http://localhost:8086/api
echo =======================================================
timeout /t 5
exit

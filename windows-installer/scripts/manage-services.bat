@echo off
:: ScrapOS ERP - Service Management Script
:: Run as Administrator

echo.
echo ==========================================
echo   ScrapOS ERP - Service Manager
echo ==========================================
echo.

if "%1"=="" goto menu
if "%1"=="start" goto start_all
if "%1"=="stop" goto stop_all
if "%1"=="restart" goto restart_all
if "%1"=="status" goto status
goto menu

:menu
echo Choose an option:
echo   1. Start all services
echo   2. Stop all services
echo   3. Restart all services
echo   4. Check service status
echo   5. View backend logs
echo   6. Open ScrapOS in browser
echo   7. Exit
echo.
set /p choice="Enter choice (1-7): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto stop_all
if "%choice%"=="3" goto restart_all
if "%choice%"=="4" goto status
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto browser
if "%choice%"=="7" exit
goto menu

:start_all
echo.
echo Starting MongoDB...
net start MongoDB 2>nul
echo Starting ScrapOS Backend...
net start ScrapOSBackend 2>nul
echo Starting IIS...
net start W3SVC 2>nul
echo.
echo All services started!
goto end

:stop_all
echo.
echo Stopping IIS...
net stop W3SVC 2>nul
echo Stopping ScrapOS Backend...
net stop ScrapOSBackend 2>nul
echo Stopping MongoDB...
net stop MongoDB 2>nul
echo.
echo All services stopped!
goto end

:restart_all
call :stop_all
timeout /t 3 >nul
call :start_all
goto end

:status
echo.
echo Service Status:
echo ---------------
sc query MongoDB | findstr STATE
sc query ScrapOSBackend | findstr STATE
sc query W3SVC | findstr STATE
echo.
echo Port Status:
echo ------------
netstat -an | findstr ":80 :8001 :27017" | findstr LISTENING
goto end

:logs
echo.
echo Opening backend logs...
if exist "C:\ScrapOS\logs\backend-err.log" (
    notepad "C:\ScrapOS\logs\backend-err.log"
) else (
    echo Log file not found!
)
goto end

:browser
echo.
echo Opening ScrapOS in browser...
start http://localhost
goto end

:end
echo.
pause

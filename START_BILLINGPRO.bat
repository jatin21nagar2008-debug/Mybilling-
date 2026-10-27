@echo off
title BillingPro - Business Management & POS Billing System
color 0b

echo =====================================================================
echo              Starting BillingPro (1-Click Run)
echo =====================================================================
echo.

set "LOCAL_IP=localhost"
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4-Adresse"') do (
    for /f "tokens=1 delims= " %%B in ("%%A") do (
        set "LOCAL_IP=%%B"
    )
)

echo [1/2] Starting BillingPro Backend Server...
cd /d "%~dp0\server"
start "BillingPro-Backend" /min cmd /c "npm.cmd run dev"

echo [2/2] Starting BillingPro Frontend Server...
cd /d "%~dp0\client"
start "BillingPro-Frontend" /min cmd /c "npm.cmd run dev -- --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo.
echo =====================================================================
echo [OK] BillingPro is now running!
echo.
echo   [PC Access]:                  http://localhost:5173/
echo   [Mobile/Tablet Wi-Fi Access]: http://%LOCAL_IP%:5173/
echo =====================================================================
echo.
echo Tip: Ensure Mobile/Phone is connected to the SAME Wi-Fi network.
echo.
echo Opening in default browser...
start http://localhost:5173/

echo.
echo Press any key to close this launcher window (servers stay running in background)...
pause >nul

@echo off
title BillingPro - Business Management & POS Billing System
color 0b

echo =====================================================================
echo              Starting BillingPro (1-Click Run)
echo =====================================================================
echo.

cd /d "%~dp0\server"
start "BillingPro-Backend" /min cmd /c "npm.cmd run dev"

cd /d "%~dp0\client"
start "BillingPro-Frontend" /min cmd /c "npm.cmd run dev -- --host 0.0.0.0"

timeout /t 3 /nobreak >nul

echo.
echo [OK] BillingPro is now running!
echo [PC Access]: http://localhost:5173/
echo [Mobile/Tablet Wi-Fi Access]: http://10.204.91.207:5173/
echo.
echo Opening in default browser...
start http://localhost:5173/

exit

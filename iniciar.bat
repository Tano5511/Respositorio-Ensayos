@echo off
title Repertorio - servidor local
cd /d "%~dp0"
echo.
echo   Repertorio se esta iniciando en: http://localhost:8080
echo   Deja esta ventana abierta mientras usas la aplicacion.
echo   Para detenerla, cierra esta ventana o pulsa Ctrl+C.
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py servidor.py
) else (
  python servidor.py
)
pause

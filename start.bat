@echo off
:: serve.bat  ─ start a quick file server in this folder
:: Usage:  serve [port]     (default = 8000)

set PORT=%1
if "%PORT%"=="" set PORT=8000

echo Serving %cd% on http://localhost:%PORT%/
python -m http.server %PORT%

:: press Ctrl-C to stop

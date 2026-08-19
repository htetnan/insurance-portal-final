@echo off
setlocal
cd /d %~dp0
py -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
set SALARY_HOST=0.0.0.0
set SALARY_PORT=8001
py -m app.server

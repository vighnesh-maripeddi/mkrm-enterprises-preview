@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer from https://nodejs.org/ and reopen this file.
  pause
  exit /b 1
)

REM Local-only demo credentials. Change them before using the admin area.
set "ADMIN_EMAIL=admin@example.com"
set "ADMIN_PASSWORD=Change-this-local-password-2026!"
set "SESSION_SECRET=local-only-session-secret-change-this-to-a-long-random-value-2026"
set "PORT=8080"

REM Avoid silently failing if another application already uses port 8080.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=New-Object Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1',8080); $c.Close(); exit 1 } catch { exit 0 }" >nul 2>&1
if errorlevel 1 (
  echo Port 8080 is already in use. Close the other application or change PORT in this file.
  pause
  exit /b 1
)

echo.
echo Starting MKRM ENTERPRISES at http://localhost:8080
 echo Admin dashboard: http://localhost:8080/#/admin
 echo Initial admin email: %ADMIN_EMAIL%
 echo Initial password is shown in README only; after changing it, use your saved password.
 echo.
echo The server will run in a separate terminal window. Keep that window open.
start "MKRM ENTERPRISES - Local Server" cmd /k "cd /d ""%CD%"" && node server.mjs"

REM Wait for the health API before opening the website.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0; $i -lt 30; $i++){ try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/health' -UseBasicParsing -TimeoutSec 1; if($r.StatusCode -eq 200){$ready=$true; break} } catch {}; Start-Sleep -Milliseconds 400 }; if(-not $ready){exit 1}" >nul 2>&1
if errorlevel 1 (
  echo The server did not respond. Check the server terminal for an error.
  pause
  exit /b 1
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" "http://localhost:8080"
) else (
  start "" "http://localhost:8080"
)
echo.
echo Website opened. Stop the server with Ctrl+C in the server terminal.
timeout /t 3 >nul

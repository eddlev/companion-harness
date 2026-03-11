@echo off
echo Booting Sovereign Companion Setup...
cd /d "%~dp0shared\integrator"
call npm install
call npm run setup
pause
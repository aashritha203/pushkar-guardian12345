@echo off
echo Starting Backend Server...
start "Python Backend" cmd /c "python server.py"

echo Starting Frontend Dev Server...
cd pushkar-guardian
start "React Frontend" cmd /c "npm run dev"

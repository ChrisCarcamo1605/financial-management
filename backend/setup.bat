@echo off
echo ====================================================
echo Financial Management Backend - Setup Script
echo ====================================================
echo.

REM Check if Python 3.12 is available
py -3.12 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.12 is not installed!
    echo.
    echo Please install Python 3.12 from one of these sources:
    echo   1. Microsoft Store: Search for "Python 3.12"
    echo   2. python.org: https://www.python.org/downloads/release/python-3128/
    echo.
    pause
    exit /b 1
)

echo [OK] Python 3.12 found!
py -3.12 --version
echo.

REM Create virtual environment
echo [INFO] Creating virtual environment with Python 3.12...
py -3.12 -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)

echo [OK] Virtual environment created successfully!
echo.

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo [INFO] Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install dependencies
echo [INFO] Installing dependencies...
echo This may take a few minutes...
echo.
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ====================================================
echo [SUCCESS] Setup completed successfully!
echo ====================================================
echo.
echo Next steps:
echo   1. Activate the virtual environment: venv\Scripts\activate
echo   2. Start the backend: python app.py
echo.
pause

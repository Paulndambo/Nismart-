@echo off
REM Setup script for Nissmart Finance App Backend (Windows)

echo Setting up Nissmart Finance App Backend...

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit .env file with your configuration
)

REM Run migrations
echo Running migrations...
python manage.py migrate

echo Setup complete!
echo To start the server, run: python manage.py runserver


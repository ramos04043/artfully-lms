# Start Backend Script
Write-Host "🚀 Starting FastAPI Backend..." -ForegroundColor Green
Set-Location "backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

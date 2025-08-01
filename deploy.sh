#!/bin/bash

echo "🔁 Pulling latest changes from Git..."
cd ~/fastapi-app || exit
git pull origin main

echo "📦 Installing dependencies..."
source venv/bin/activate
pip install -r requirements.txt

echo "📁 Ensuring .env is in place..."
cp ~/fastapi-app/.env.example ~/fastapi-app/.env 2>/dev/null || echo ".env already exists or no template found"

echo "🚀 Restarting FastAPI app via Supervisor..."
sudo supervisorctl restart uvicorn:fastapi-uvicorn-0

echo "✅ Deployment complete."

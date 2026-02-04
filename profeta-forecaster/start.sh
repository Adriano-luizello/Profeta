#!/usr/bin/env bash
# Inicia o Profeta Forecaster API (uvicorn) em 127.0.0.1:8000
# Rode este script no seu terminal: ./start.sh ou bash start.sh

set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo "Criando venv..."
  python3 -m venv venv
  ./venv/bin/pip install -r requirements.txt
fi

if [ ! -f ".env" ]; then
  echo "⚠️  .env não encontrado. Copie env.example.txt para .env e preencha SUPABASE_URL e SUPABASE_KEY."
  exit 1
fi

echo "🚀 Iniciando Profeta Forecaster em http://127.0.0.1:8000"
echo "   Health: http://127.0.0.1:8000/health"
echo "   Ctrl+C para parar."
echo ""
./venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000

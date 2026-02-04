#!/usr/bin/env bash
# Libera a porta 8000 e inicia o backend Profeta Forecaster.
# Uso: ./start-backend.sh   (rode de dentro de profeta-forecaster)

set -e
cd "$(dirname "$0")"

echo "Verificando porta 8000..."
PIDS=$(lsof -i TCP:8000 2>/dev/null | awk 'NR>1 {print $2}' | sort -u)
if [ -n "$PIDS" ]; then
  echo "Encerrando processos na porta 8000: $PIDS"
  echo "$PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "Ativando venv e iniciando API..."
source venv/bin/activate
exec python main.py

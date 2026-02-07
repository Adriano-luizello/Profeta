#!/bin/bash

# Script para re-rodar o pipeline e calcular avg_daily_demand
# Uso: ./scripts/run-pipeline.sh [analysis_id]

set -e

echo "🔍 Buscando análise mais recente..."

# Se não passar analysis_id, buscar do .env.local ou do Supabase
if [ -z "$1" ]; then
  # Tentar buscar via API
  ANALYSIS_ID=$(curl -s "http://127.0.0.1:3000/api/analyses/latest" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -z "$ANALYSIS_ID" ]; then
    echo "❌ Erro: Não foi possível encontrar um analysis_id automaticamente."
    echo "   Use: ./scripts/run-pipeline.sh <analysis_id>"
    exit 1
  fi
else
  ANALYSIS_ID=$1
fi

echo "📊 Analysis ID: $ANALYSIS_ID"
echo ""
echo "🚀 Iniciando pipeline de forecast..."
echo ""

# Fazer request para o forecaster
curl -X POST http://127.0.0.1:8000/forecast \
  -H "Content-Type: application/json" \
  -d "{
    \"analysis_id\": \"$ANALYSIS_ID\",
    \"forecast_days\": [30, 60, 90],
    \"by_product\": true,
    \"by_category\": false
  }" \
  -v

echo ""
echo ""
echo "✅ Pipeline concluído!"
echo ""
echo "📝 Verificar logs acima para:"
echo "   - 📊 Calculando avg_daily_demand por produto..."
echo "   - 💾 Persistindo avg_daily_demand para N produtos..."
echo "   - ✅ avg_daily_demand persistido: N produtos"
echo ""
echo "🔍 Verificar no banco:"
echo "   SELECT cleaned_name, avg_daily_demand FROM products WHERE avg_daily_demand IS NOT NULL LIMIT 5;"
echo ""

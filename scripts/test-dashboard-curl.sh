#!/usr/bin/env bash
# Testa o endpoint do dashboard Model Router.
# Uso: ./scripts/test-dashboard-curl.sh [ANALYSIS_ID]
# Ex.: ./scripts/test-dashboard-curl.sh e4671a6c-6c52-4e6a-b3cb-58b92e486cec

set -e
ANALYSIS_ID="${1:-00000000-0000-0000-0000-000000000000}"
BASE_URL="${2:-http://localhost:8000}"
echo "Testing: GET ${BASE_URL}/api/dashboard/${ANALYSIS_ID}?period=30"
echo "---"
if command -v jq &>/dev/null; then
  curl -s "${BASE_URL}/api/dashboard/${ANALYSIS_ID}?period=30" | jq 'if .error then . else { keys: keys, summary: .summary, actions_counts: .actions.counts, top_best_len: (.top_best | length), top_worst_len: (.top_worst | length), all_products_len: (.all_products | length) } end'
else
  curl -s "${BASE_URL}/api/dashboard/${ANALYSIS_ID}?period=30"
fi

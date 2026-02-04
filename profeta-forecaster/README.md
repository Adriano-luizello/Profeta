# 🔮 Profeta Forecaster API

API Python com **FastAPI** + **Meta Prophet** para previsão de demanda.

---

## 🚀 Quick Start

### 1. Instalar Dependências

```bash
cd profeta-forecaster
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar exemplo
cp env.example.txt .env

# Editar .env com suas credenciais
nano .env
```

Preencha:
- `SUPABASE_URL` - URL do seu projeto Supabase
- `SUPABASE_KEY` - Anon key do Supabase

### 3. Rodar API

```bash
python main.py
```

A API estará disponível em: **http://localhost:8000**

---

## 📋 Endpoints

### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "API is healthy",
  "version": "1.0.0"
}
```

### Gerar Forecast
```bash
POST /forecast
```

**Request Body:**
```json
{
  "analysis_id": "uuid-da-analise",
  "forecast_days": [30, 60, 90],
  "by_product": true,
  "by_category": true
}
```

**Response:**
```json
{
  "analysis_id": "uuid-da-analise",
  "created_at": "2026-01-21T...",
  "product_forecasts": [
    {
      "product_id": "...",
      "product_name": "Camiseta Azul",
      "category": "Vestuário > Camisetas > Básicas",
      "historical_data": [...],
      "forecast_30d": [
        {
          "date": "2026-01-22",
          "predicted_quantity": 12.5,
          "lower_bound": 10.2,
          "upper_bound": 14.8
        },
        ...
      ],
      "forecast_60d": [...],
      "forecast_90d": [...],
      "metrics": {
        "trend": "increasing",
        "seasonality_strength": 0.5
      },
      "recommendations": {
        "restock_date": "2026-01-28",
        "suggested_quantity": 150,
        "confidence": 0.8,
        "reasoning": "..."
      }
    }
  ],
  "category_forecasts": [...],
  "stats": {...}
}
```

### Buscar Forecast Existente
```bash
GET /forecast/{analysis_id}
```

---

## 🧪 Teste Rápido

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Gerar Forecast
```bash
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id": "seu-analysis-id",
    "forecast_days": [30, 60, 90],
    "by_product": true,
    "by_category": true
  }'
```

---

## 🏗️ Estrutura do Projeto

```
profeta-forecaster/
├── main.py                 # FastAPI app
├── models/
│   └── forecaster.py       # Prophet forecasting logic
├── schemas/
│   └── forecast.py         # Pydantic models
├── utils/
│   └── __init__.py
├── requirements.txt        # Dependências Python
├── env.example.txt         # Exemplo de .env
├── README.md               # Este arquivo
└── Dockerfile              # Para deploy (futuro)
```

---

## 📊 Como Funciona

### 1. Dados Sintéticos
Como ainda não temos dados históricos reais, a API **gera automaticamente** 365 dias de dados sintéticos para cada produto, considerando:
- ✅ Tendência (crescimento/decrescimento)
- ✅ Sazonalidade (baseada no campo `seasonality` do produto)
- ✅ Ruído aleatório (simula variações naturais)

### 2. Prophet Training
Para cada produto (ou categoria), a API:
1. Treina um modelo Prophet com os dados sintéticos
2. Detecta automaticamente tendências e sazonalidade
3. Gera previsões para 30, 60 e 90 dias

### 3. Métricas e Recomendações
- **Tendência**: increasing, decreasing, ou stable
- **Seasonality Strength**: 0.0 a 1.0
- **Recomendações**: Data e quantidade de reabastecimento

---

## 🚢 Deploy

### Railway.app (Recomendado)

1. Criar conta: https://railway.app
2. Novo projeto: "New Project" → "Deploy from GitHub"
3. Conectar repositório
4. Configurar variáveis:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `API_PORT=8000`
5. Deploy automático!

URL da API: `https://seu-projeto.railway.app`

### Render.com (Free Tier)

1. Criar conta: https://render.com
2. Novo Web Service
3. Conectar GitHub
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python main.py`
6. Adicionar variáveis de ambiente

**Nota**: Free tier tem sleep após 15min de inatividade.

---

## 🔧 Troubleshooting

### Erro: "Prophet não encontrado"
```bash
pip install prophet==1.1.5
```

### Erro: "gcc not found" (ao instalar Prophet)
Prophet requer compilador C. No Mac:
```bash
xcode-select --install
```

### Erro: "Supabase connection failed"
Verifique:
- ✅ `.env` existe e tem valores corretos
- ✅ `SUPABASE_URL` e `SUPABASE_KEY` estão corretos
- ✅ Não tem espaços extras nas variáveis

---

## 📚 Recursos

- **Prophet Docs**: https://facebook.github.io/prophet/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Supabase Python**: https://supabase.com/docs/reference/python/introduction

---

## 🎯 Próximos Passos

1. ✅ **Rodar local** (`python main.py`)
2. ✅ **Testar** com `curl` ou Postman
3. ✅ **Integrar** com Next.js (frontend)
4. ✅ **Deploy** no Railway/Render
5. ✅ **Usar dados reais** (quando disponíveis)

---

**Dúvidas?** Consulte os logs da API (muito verbosos para ajudar no debug!) 🔍

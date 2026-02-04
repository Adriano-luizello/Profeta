"""
Profeta Forecaster API
FastAPI + Prophet para previsão de demanda
"""
from pathlib import Path
import os
from dotenv import load_dotenv

# Carregar .env do backend e, se necessário, .env.local da raiz
_root = Path(__file__).resolve().parent
_env = _root / ".env"
_env_local = _root.parent / ".env.local"
load_dotenv(_env)
load_dotenv(_env_local)
# URL: preferir SUPABASE_URL, fallback NEXT_PUBLIC_SUPABASE_URL
if not os.getenv("SUPABASE_URL") and os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    os.environ["SUPABASE_URL"] = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
# KEY: backend usa SERVICE_ROLE quando disponível (contorna RLS em products); senão anon
service_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
if service_key:
    os.environ["SUPABASE_KEY"] = service_key
elif not os.getenv("SUPABASE_KEY") and os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"):
    os.environ["SUPABASE_KEY"] = (os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "").strip()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from schemas.forecast import (
    ForecastRequest,
    ForecastResponse,
    HealthResponse
)
from models.forecaster import ProphetForecaster
from api.dashboard_routes import router as dashboard_router

# Inicializar FastAPI
app = FastAPI(
    title="Profeta Forecaster API",
    description="API de forecasting com Meta Prophet",
    version="1.0.0"
)

# CORS - permitir Next.js (localhost e 127.0.0.1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas do dashboard (model router + agregados)
app.include_router(dashboard_router)

# Inicializar forecaster só se houver credenciais (de .env ou .env.local)
_supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
_supabase_key = (os.getenv("SUPABASE_KEY") or "").strip()
_has_supabase = (
    _supabase_url and _supabase_key
    and _supabase_url.startswith("https://")
    and "your-project" not in _supabase_url
)
if _has_supabase:
    forecaster = ProphetForecaster(supabase_url=_supabase_url, supabase_key=_supabase_key)
else:
    forecaster = None
    logger.warning("Supabase não configurado: defina SUPABASE_URL e SUPABASE_KEY em profeta-forecaster/.env ou use .env.local na raiz")


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint"""
    return {
        "status": "ok",
        "message": "Profeta Forecaster API is running",
        "version": "1.0.0"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "API is healthy",
        "version": "1.0.0"
    }


@app.post("/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Gera forecast para uma análise específica
    
    Args:
        request: ForecastRequest com analysis_id e parâmetros
    
    Returns:
        ForecastResponse com previsões e métricas
    """
    if forecaster is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase não configurado. Defina SUPABASE_URL e SUPABASE_KEY em profeta-forecaster/.env ou na raiz .env.local",
        )
    try:
        logger.info(f"🔮 Gerando forecast para análise: {request.analysis_id}")
        
        # Gerar forecast
        result = await forecaster.generate_forecast(
            analysis_id=request.analysis_id,
            forecast_days=request.forecast_days,
            by_product=request.by_product,
            by_category=request.by_category
        )
        
        logger.info(f"✅ Forecast gerado com sucesso!")
        return result
        
    except ValueError as e:
        logger.error(f"❌ Erro de validação: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"❌ Erro ao gerar forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast/{analysis_id}")
async def get_forecast(analysis_id: str):
    """
    Busca forecast existente
    
    Args:
        analysis_id: ID da análise
    
    Returns:
        Forecast salvo no banco
    """
    if forecaster is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase não configurado. Defina SUPABASE_URL e SUPABASE_KEY em profeta-forecaster/.env ou na raiz .env.local",
        )
    try:
        forecast = await forecaster.get_forecast(analysis_id)
        
        if not forecast:
            raise HTTPException(
                status_code=404,
                detail=f"Forecast não encontrado para análise {analysis_id}"
            )
        
        return forecast
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", 8000))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    logger.info(f"🚀 Iniciando API em {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )

"""
Pydantic schemas para forecasting
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class ForecastRequest(BaseModel):
    """Request para gerar forecast"""
    analysis_id: str = Field(..., description="ID da análise")
    forecast_days: List[int] = Field(
        default=[30, 60, 90],
        description="Horizontes de previsão em dias"
    )
    by_product: bool = Field(
        default=True,
        description="Gerar forecast por produto individual"
    )
    by_category: bool = Field(
        default=True,
        description="Gerar forecast por categoria"
    )


class ForecastDataPoint(BaseModel):
    """Ponto de dados do forecast"""
    date: str = Field(..., description="Data no formato ISO")
    predicted_quantity: float = Field(..., description="Quantidade prevista")
    lower_bound: float = Field(..., description="Limite inferior (intervalo de confiança)")
    upper_bound: float = Field(..., description="Limite superior (intervalo de confiança)")


class HistoricalDataPoint(BaseModel):
    """Ponto de dados históricos"""
    date: str = Field(..., description="Data no formato ISO")
    quantity: float = Field(..., description="Quantidade real")


class ForecastMetrics(BaseModel):
    """Métricas do forecast"""
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error")
    rmse: Optional[float] = Field(None, description="Root Mean Squared Error")
    mae: Optional[float] = Field(None, description="Mean Absolute Error")
    trend: str = Field(..., description="increasing, decreasing, ou stable")
    seasonality_strength: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Força da sazonalidade (0-1)"
    )
    accuracy_level: Optional[str] = Field(
        None,
        description="excellent (<20% MAPE), good (<50%), needs_improvement, insufficient_data, no_overlap, contains_zeros, error"
    )
    sample_size: Optional[int] = Field(None, description="Número de pontos usados no backtesting")


class ForecastRecommendations(BaseModel):
    """Recomendações baseadas no forecast"""
    restock_date: Optional[str] = Field(None, description="Data recomendada para reabastecimento")
    suggested_quantity: Optional[int] = Field(None, description="Quantidade sugerida")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confiança da recomendação")
    reasoning: str = Field(..., description="Explicação da recomendação")


class ProductForecast(BaseModel):
    """Forecast de um produto específico"""
    product_id: str
    product_name: str
    category: str
    
    historical_data: List[HistoricalDataPoint]
    
    forecast_30d: List[ForecastDataPoint]
    forecast_60d: List[ForecastDataPoint]
    forecast_90d: List[ForecastDataPoint]
    
    metrics: ForecastMetrics
    recommendations: ForecastRecommendations


class CategoryForecast(BaseModel):
    """Forecast de uma categoria"""
    category: str
    product_count: int
    
    historical_data: List[HistoricalDataPoint]
    
    forecast_30d: List[ForecastDataPoint]
    forecast_60d: List[ForecastDataPoint]
    forecast_90d: List[ForecastDataPoint]
    
    metrics: ForecastMetrics


class ForecastResponse(BaseModel):
    """Response do forecast"""
    analysis_id: str
    created_at: str
    
    # Forecast por produto
    product_forecasts: Optional[List[ProductForecast]] = None
    
    # Forecast por categoria
    category_forecasts: Optional[List[CategoryForecast]] = None
    
    # Estatísticas gerais
    stats: Dict[str, Any] = Field(
        default_factory=dict,
        description="Estatísticas gerais do forecast"
    )


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: str
    version: str

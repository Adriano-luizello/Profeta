"""
Model Router Service
Selects the best forecasting model based on context and product metrics.
"""
from typing import Literal, Dict, Any, List, Optional
from dataclasses import dataclass
import numpy as np

ModelType = Literal['prophet', 'xgboost', 'ensemble']
TimeHorizon = Literal[30, 60, 90]


@dataclass
class ModelSelection:
    """Result of model selection"""
    model: ModelType
    confidence: float  # 0-1
    reason: str
    weights: Optional[Dict[str, float]] = None  # For ensemble


class ModelRouter:
    """
    Smart model router that selects the best forecasting model
    based on context, time horizon, and product characteristics.
    """

    # Thresholds
    XGBOOST_EXCELLENT_THRESHOLD = 25.0  # MAPE < 25% = excellent
    XGBOOST_GOOD_THRESHOLD = 60.0       # MAPE < 60% = usable
    PROPHET_UNUSABLE_THRESHOLD = 500.0  # MAPE > 500% = unusable

    def select_model(
        self,
        xgboost_mape: Optional[float],
        prophet_mape: Optional[float],
        time_horizon: TimeHorizon,
        context: str = 'forecast'  # 'forecast', 'action', 'trend', 'seasonality'
    ) -> ModelSelection:
        """
        Select the best model based on context and metrics.

        Args:
            xgboost_mape: XGBoost MAPE (%)
            prophet_mape: Prophet MAPE (%)
            time_horizon: 30, 60, or 90 days
            context: What we're using the model for

        Returns:
            ModelSelection with model, confidence, reason, and weights
        """

        # Handle missing data
        if xgboost_mape is None and prophet_mape is None:
            return ModelSelection(
                model='xgboost',
                confidence=0.5,
                reason='Dados insuficientes, usando XGBoost como padrão'
            )

        if xgboost_mape is None:
            return ModelSelection(
                model='prophet',
                confidence=0.6,
                reason='Apenas Prophet disponível'
            )

        if prophet_mape is None:
            return ModelSelection(
                model='xgboost',
                confidence=0.8,
                reason='Apenas XGBoost disponível'
            )

        # Context-specific routing
        if context == 'seasonality':
            return self._select_for_seasonality(prophet_mape)

        if context == 'action':
            return self._select_for_action(xgboost_mape, prophet_mape)

        # Main forecast selection logic
        return self._select_for_forecast(
            xgboost_mape,
            prophet_mape,
            time_horizon
        )

    def _select_for_forecast(
        self,
        xgboost_mape: float,
        prophet_mape: float,
        time_horizon: TimeHorizon
    ) -> ModelSelection:
        """Select model for forecasting based on time horizon."""

        # RULE 1: XGBoost clearly superior (MAPE < 60% AND much better than Prophet)
        if xgboost_mape < self.XGBOOST_GOOD_THRESHOLD and xgboost_mape < prophet_mape * 0.5:
            improvement = (prophet_mape / xgboost_mape) if xgboost_mape and prophet_mape is not None else 0

            if time_horizon == 30:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.95,
                    reason=f'XGBoost {improvement:.0f}x mais acurado (curto prazo)'
                )
            elif time_horizon == 60:
                return ModelSelection(
                    model='ensemble',
                    confidence=0.85,
                    reason=f'XGBoost {improvement:.0f}x melhor, ensemble para médio prazo',
                    weights={'xgboost': 0.7, 'prophet': 0.3}
                )
            else:  # 90 days
                return ModelSelection(
                    model='ensemble',
                    confidence=0.75,
                    reason='Ensemble: XGBoost acurado + sazonalidade Prophet',
                    weights={'xgboost': 0.5, 'prophet': 0.5}
                )

        # RULE 2: Short-term (30 days) - prefer XGBoost if reasonable
        if time_horizon == 30:
            if xgboost_mape < self.XGBOOST_GOOD_THRESHOLD:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.85,
                    reason='Lags recentes mais importantes em curto prazo'
                )
            else:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.65,
                    reason=f'XGBoost para curto prazo (MAPE {xgboost_mape:.1f}%)'
                )

        # RULE 3: Long-term (90 days) - consider Prophet's seasonality
        if time_horizon == 90:
            if prophet_mape < self.PROPHET_UNUSABLE_THRESHOLD:
                return ModelSelection(
                    model='ensemble',
                    confidence=0.75,
                    reason='Ensemble: sazonalidade importante em longo prazo',
                    weights={'xgboost': 0.5, 'prophet': 0.5}
                )
            else:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.70,
                    reason='Prophet impreciso, usando XGBoost'
                )

        # RULE 4: Medium-term (60 days) - balanced ensemble
        if time_horizon == 60:
            if xgboost_mape < self.XGBOOST_GOOD_THRESHOLD and prophet_mape < self.PROPHET_UNUSABLE_THRESHOLD:
                return ModelSelection(
                    model='ensemble',
                    confidence=0.80,
                    reason='Ensemble: balancear lags recentes e sazonalidade',
                    weights={'xgboost': 0.7, 'prophet': 0.3}
                )
            elif xgboost_mape < self.XGBOOST_GOOD_THRESHOLD:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.75,
                    reason='XGBoost confiável, Prophet impreciso'
                )
            else:
                return ModelSelection(
                    model='xgboost',
                    confidence=0.65,
                    reason=f'XGBoost para médio prazo (MAPE {xgboost_mape:.1f}%)'
                )

        # RULE 5: Default - use best MAPE
        best_model = 'xgboost' if xgboost_mape < prophet_mape else 'prophet'
        best_mape = min(xgboost_mape, prophet_mape)

        return ModelSelection(
            model=best_model,
            confidence=0.70,
            reason=f'Menor MAPE: {best_mape:.1f}%'
        )

    def _select_for_action(
        self,
        xgboost_mape: float,
        prophet_mape: float
    ) -> ModelSelection:
        """Select model for urgent actions (reposition, discount, etc)."""
        if xgboost_mape < self.XGBOOST_GOOD_THRESHOLD:
            return ModelSelection(
                model='xgboost',
                confidence=0.95,
                reason='Decisões urgentes requerem maior acurácia'
            )
        elif xgboost_mape < prophet_mape:
            return ModelSelection(
                model='xgboost',
                confidence=0.80,
                reason='XGBoost mais acurado que Prophet'
            )
        else:
            return ModelSelection(
                model='prophet',
                confidence=0.75,
                reason='Prophet mais acurado para este produto'
            )

    def _select_for_seasonality(self, prophet_mape: float) -> ModelSelection:
        """Select model for seasonality detection - always Prophet."""
        return ModelSelection(
            model='prophet',
            confidence=0.90,
            reason='Prophet especializado em detectar sazonalidade'
        )

    def calculate_ensemble_forecast(
        self,
        xgboost_forecast: List[float],
        prophet_forecast: List[float],
        weights: Dict[str, float]
    ) -> List[float]:
        """Calculate weighted ensemble forecast. Aligns lengths (pad shorter with 0) to avoid broadcast error."""
        xgb_weight = weights.get('xgboost', 0.5)
        prophet_weight = weights.get('prophet', 0.5)

        # Ensure weights sum to 1
        total = xgb_weight + prophet_weight
        xgb_weight /= total
        prophet_weight /= total

        # Align lengths: same length required for numpy broadcast (fixes shapes (3,) vs (60,))
        target_len = max(len(xgboost_forecast), len(prophet_forecast))
        if target_len == 0:
            return []
        xgb_padded = list(xgboost_forecast) + [0.0] * (target_len - len(xgboost_forecast))
        prophet_padded = list(prophet_forecast) + [0.0] * (target_len - len(prophet_forecast))

        xgb_array = np.array(xgb_padded)
        prophet_array = np.array(prophet_padded)
        ensemble = xgb_array * xgb_weight + prophet_array * prophet_weight
        return ensemble.tolist()

    def get_forecast_for_period(
        self,
        product_data: Dict[str, Any],
        time_horizon: TimeHorizon
    ) -> Dict[str, Any]:
        """Get the best forecast for a given time horizon."""
        selection = self.select_model(
            xgboost_mape=product_data.get('xgboost_mape'),
            prophet_mape=product_data.get('prophet_mape'),
            time_horizon=time_horizon,
            context='forecast'
        )

        # Get forecasts
        xgb_forecast = product_data.get('xgboost_forecast', [])
        prophet_forecast = product_data.get('prophet_forecast', [])

        # Calculate final forecast based on selection
        if selection.model == 'xgboost':
            forecast = xgb_forecast[:time_horizon] if xgb_forecast else []
        elif selection.model == 'prophet':
            forecast = prophet_forecast[:time_horizon] if prophet_forecast else []
        elif selection.model == 'ensemble':
            xgb_truncated = xgb_forecast[:time_horizon] if xgb_forecast else []
            prophet_truncated = prophet_forecast[:time_horizon] if prophet_forecast else []

            if xgb_truncated and prophet_truncated:
                forecast = self.calculate_ensemble_forecast(
                    xgb_truncated,
                    prophet_truncated,
                    selection.weights or {'xgboost': 0.5, 'prophet': 0.5}
                )
            elif xgb_truncated:
                forecast = xgb_truncated
            else:
                forecast = prophet_truncated
        else:
            forecast = []

        return {
            'forecast': forecast,
            'total': sum(forecast) if forecast else 0,
            'model': selection.model,
            'confidence': selection.confidence,
            'reason': selection.reason,
            'weights': selection.weights
        }


# Global instance
model_router = ModelRouter()

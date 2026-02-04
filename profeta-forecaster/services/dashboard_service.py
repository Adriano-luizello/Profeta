"""
Dashboard Data Service
Aggregates data from multiple sources for dashboard display.
Uses ModelRouter to select best model for each context.
"""
from typing import List, Dict, Any, Literal, Optional
from supabase import Client
from datetime import datetime
import statistics

from services.model_router import model_router, TimeHorizon


def _to_float(x: Any) -> float:
    """Convert Supabase numeric/Decimal to float safely."""
    if x is None:
        return 0.0
    if isinstance(x, (int, float)):
        return float(x)
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


class DashboardService:
    """Service to prepare dashboard data with intelligent model routing."""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_dashboard_data(
        self,
        analysis_id: str,
        time_horizon: TimeHorizon = 30
    ) -> Dict[str, Any]:
        """
        Get complete dashboard data for given analysis and time period.

        Args:
            analysis_id: UUID of the analysis
            time_horizon: 30, 60, or 90 days

        Returns:
            Complete dashboard data with best model selections
        """
        # Fetch all products for this analysis
        products = self._fetch_products(analysis_id)

        # Get forecasts for each product
        products_with_forecasts = []
        for product in products:
            product["analysis_id"] = analysis_id
            product_data = self._get_product_with_forecasts(
                product,
                time_horizon
            )
            products_with_forecasts.append(product_data)

        # Calculate dashboard metrics
        dashboard = {
            "analysis_id": analysis_id,
            "time_horizon": time_horizon,
            "generated_at": datetime.utcnow().isoformat(),

            # Summary cards
            "summary": self._calculate_summary(products_with_forecasts, time_horizon),

            # Actions
            "actions": self._calculate_actions(products_with_forecasts, time_horizon),

            # Top products
            "top_best": self._get_top_best(products_with_forecasts, limit=5),
            "top_worst": self._get_top_worst(products_with_forecasts, limit=5),

            # All products
            "all_products": products_with_forecasts,
        }

        return dashboard

    def _fetch_products(self, analysis_id: str) -> List[Dict]:
        """Fetch all products for analysis."""
        response = (
            self.supabase.table("products")
            .select("*")
            .eq("analysis_id", analysis_id)
            .execute()
        )
        return response.data if response.data else []

    def _get_product_with_forecasts(
        self,
        product: Dict,
        time_horizon: TimeHorizon
    ) -> Dict[str, Any]:
        """Get product with both forecasts and best model selection."""
        product_id = product["id"]
        analysis_id = product.get("analysis_id", "")

        # Fetch XGBoost data
        xgboost_data = self._fetch_xgboost_data(product_id)

        # Fetch Prophet data (from forecast_results)
        prophet_data = self._fetch_prophet_data(product_id, analysis_id, time_horizon)

        # Select best model for this time horizon
        forecast_result = model_router.get_forecast_for_period(
            product_data={
                "xgboost_forecast": xgboost_data.get("forecast", []),
                "prophet_forecast": prophet_data.get("forecast", []),
                "xgboost_mape": xgboost_data.get("mape"),
                "prophet_mape": prophet_data.get("mape"),
            },
            time_horizon=time_horizon
        )

        # Determine status
        status = self._calculate_product_status(
            product=product,
            forecast=forecast_result["forecast"],
            time_horizon=time_horizon
        )

        return {
            "id": product_id,
            "name": product.get("cleaned_name", product.get("original_name", "Unknown")),
            "sku": product.get("sku", ""),

            # Forecast (best model)
            "forecast": forecast_result["forecast"],
            "forecast_total": forecast_result["total"],
            "forecast_model": forecast_result["model"],
            "forecast_confidence": forecast_result["confidence"],
            "forecast_reason": forecast_result["reason"],
            "forecast_weights": forecast_result.get("weights"),

            # Metrics
            "xgboost_mape": xgboost_data.get("mape"),
            "prophet_mape": prophet_data.get("mape"),
            "displayed_mape": xgboost_data.get("mape") or prophet_data.get("mape"),

            # XGBoost details
            "xgboost_mae": xgboost_data.get("mae"),
            "xgboost_features": xgboost_data.get("feature_importance", {}),

            # Prophet details
            "prophet_forecast": prophet_data.get("forecast", []),
            "prophet_trend": prophet_data.get("trend"),
            "prophet_seasonality": prophet_data.get("seasonality"),

            # Status & Actions
            "status": status["status"],
            "status_reason": status["reason"],
            "actions": status["actions"],

            # Business metrics (placeholder for future)
            "current_stock": product.get("current_stock", 0),
            "avg_daily_sales": product.get("avg_daily_sales", 0),
        }

    def _fetch_xgboost_data(self, product_id: str) -> Dict:
        """Fetch XGBoost forecasts and metadata."""
        # Get forecasts (table uses predicted_quantity, not yhat)
        forecasts_response = (
            self.supabase.table("forecasts_xgboost")
            .select("forecast_date, predicted_quantity")
            .eq("product_id", product_id)
            .order("forecast_date")
            .execute()
        )

        # Get metadata
        metadata_response = (
            self.supabase.table("model_metadata")
            .select("*")
            .eq("product_id", product_id)
            .eq("model_type", "xgboost")
            .limit(1)
            .execute()
        )

        forecast = []
        if forecasts_response.data:
            forecast = [
                float(row.get("predicted_quantity", 0) or 0)
                for row in forecasts_response.data
            ]

        metadata = {}
        if metadata_response.data:
            metadata = metadata_response.data[0]

        mape_val = metadata.get("mape")
        conf_val = metadata.get("confidence_score")
        return {
            "forecast": forecast,
            "mape": _to_float(mape_val) if mape_val is not None else None,
            "mae": _to_float(metadata.get("mae")) if metadata.get("mae") is not None else None,
            "feature_importance": metadata.get("feature_importance") or {},
            "confidence": _to_float(conf_val) if conf_val is not None else None,
        }

    def _fetch_prophet_data(
        self, product_id: str, analysis_id: str, time_horizon: TimeHorizon = 30
    ) -> Dict:
        """Fetch Prophet forecasts from forecast_results."""
        if not analysis_id:
            return {}

        response = (
            self.supabase.table("forecast_results")
            .select("response")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return {}

        # Extract Prophet data from JSONB
        forecast_data = response.data[0].get("response", {})
        product_forecasts = forecast_data.get("product_forecasts", [])

        # Find this product's forecast
        prophet_forecast = None
        for pf in product_forecasts:
            if str(pf.get("product_id")) == str(product_id):
                prophet_forecast = pf
                break

        if not prophet_forecast:
            return {}

        # Pick horizon list: forecast_30d, forecast_60d, forecast_90d
        horizon_key = f"forecast_{time_horizon}d"
        points = prophet_forecast.get(horizon_key) or prophet_forecast.get("forecast", [])
        forecast_values = []
        if isinstance(points, list):
            for point in points:
                if isinstance(point, dict):
                    val = point.get("predicted_quantity", point.get("yhat", 0))
                else:
                    val = float(point)
                forecast_values.append(float(val) if val is not None else 0)

        prophet_mape = prophet_forecast.get("metrics", {}).get("mape")
        return {
            "forecast": forecast_values,
            "mape": _to_float(prophet_mape) if prophet_mape is not None else None,
            "trend": prophet_forecast.get("trend"),
            "seasonality": prophet_forecast.get("seasonality"),
        }

    def _calculate_product_status(
        self,
        product: Dict,
        forecast: List[float],
        time_horizon: TimeHorizon
    ) -> Dict[str, Any]:
        """
        Calculate product status and recommended actions.

        Returns:
            {
                'status': 'critical' | 'attention' | 'ok',
                'reason': 'Ruptura em 3 dias',
                'actions': ['reposition_urgent', 'discount']
            }
        """
        current_stock = _to_float(product.get("current_stock")) or 0.0

        if not forecast:
            return {
                "status": "unknown",
                "reason": "Dados insuficientes",
                "actions": [],
            }

        # Calculate daily consumption (average over forecast period)
        total_forecast = sum(forecast)
        daily_consumption = total_forecast / time_horizon if time_horizon > 0 else 0

        # Calculate days until stockout
        if daily_consumption > 0:
            days_until_stockout = current_stock / daily_consumption
        else:
            days_until_stockout = float("inf")

        # Determine status
        actions = []

        if days_until_stockout < 5:
            status = "critical"
            reason = f"Ruptura em {int(days_until_stockout)} dias"
            actions.append("reposition_urgent")
        elif days_until_stockout < 10:
            status = "attention"
            reason = f"Reposição planejada ({int(days_until_stockout)} dias)"
            actions.append("reposition_planned")
        else:
            status = "ok"
            reason = "Estoque saudável"

        return {
            "status": status,
            "reason": reason,
            "actions": actions,
        }

    def _calculate_summary(
        self,
        products: List[Dict],
        time_horizon: TimeHorizon
    ) -> Dict[str, Any]:
        """Calculate summary metrics for dashboard cards."""
        if not products:
            return {
                "total_forecast": 0,
                "forecast_change_pct": 0,
                "avg_confidence": 0,
                "avg_mape": 0,
                "avg_prophet_mape": 0,
                "improvement_vs_prophet": 0,
                "predominant_model": "xgboost",
            }

        # Total forecast (ensure numeric)
        total_forecast = sum(_to_float(p.get("forecast_total")) for p in products)

        # Average confidence
        confidences = [_to_float(p["forecast_confidence"]) for p in products if p.get("forecast_confidence") is not None]
        avg_confidence = statistics.mean(confidences) if confidences else 0

        # Average MAPE (XGBoost)
        xgb_mapes = [_to_float(p["xgboost_mape"]) for p in products if p.get("xgboost_mape") is not None]
        avg_xgb_mape = statistics.mean(xgb_mapes) if xgb_mapes else 0

        # Average Prophet MAPE
        prophet_mapes = [_to_float(p["prophet_mape"]) for p in products if p.get("prophet_mape") is not None]
        avg_prophet_mape = statistics.mean(prophet_mapes) if prophet_mapes else 0

        # Improvement (guard against None from statistics.mean edge case)
        avg_p = avg_prophet_mape if avg_prophet_mape is not None else 0.0
        avg_x = avg_xgb_mape if avg_xgb_mape is not None else 0.0
        improvement = (avg_p / avg_x) if avg_x > 0 else 0

        # Predominant model
        model_counts: Dict[str, int] = {}
        for p in products:
            model = p.get("forecast_model", "xgboost")
            model_counts[model] = model_counts.get(model, 0) + 1
        predominant_model = max(model_counts, key=model_counts.get) if model_counts else "xgboost"

        return {
            "total_forecast": int(total_forecast),
            "forecast_change_pct": 0,
            "avg_confidence": round(avg_confidence * 100, 1),
            "avg_mape": round(avg_xgb_mape, 1),
            "avg_prophet_mape": round(avg_prophet_mape, 1),
            "improvement_vs_prophet": round(improvement, 0),
            "predominant_model": predominant_model,
        }

    def _calculate_actions(
        self,
        products: List[Dict],
        time_horizon: TimeHorizon
    ) -> Dict[str, Any]:
        """Calculate action counts for dashboard."""
        critical = []
        attention = []
        opportunity = []

        for product in products:
            status = product.get("status", "unknown")

            if status == "critical":
                critical.append({
                    "product_id": product["id"],
                    "product_name": product.get("name", ""),
                    "reason": product.get("status_reason", ""),
                    "actions": product.get("actions", []),
                })
            elif status == "attention":
                attention.append({
                    "product_id": product["id"],
                    "product_name": product.get("name", ""),
                    "reason": product.get("status_reason", ""),
                    "actions": product.get("actions", []),
                })

        return {
            "critical": critical,
            "attention": attention,
            "opportunity": opportunity,
            "counts": {
                "critical": len(critical),
                "attention": len(attention),
                "opportunity": len(opportunity),
            },
        }

    def _get_top_best(
        self,
        products: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """Get top products by XGBoost MAPE (lower is better)."""
        with_mape = [p for p in products if p.get("xgboost_mape") is not None]
        sorted_products = sorted(with_mape, key=lambda p: p["xgboost_mape"])
        return sorted_products[:limit]

    def _get_top_worst(
        self,
        products: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """
        Get worst products based on:
        1. High MAPE (> 40%)
        2. Critical status
        3. Low performance
        """
        products_with_score = []
        for product in products:
            score = self._calculate_worst_score(product)
            products_with_score.append({**product, "worst_score": score})

        sorted_products = sorted(
            products_with_score,
            key=lambda p: p["worst_score"],
            reverse=True
        )
        return sorted_products[:limit]

    def _calculate_worst_score(self, product: Dict) -> float:
        """
        Calculate "worst" score for a product.
        Higher score = worse product.
        """
        score = 0.0

        # Criterion 1: MAPE (40% weight)
        mape = product.get("xgboost_mape")
        if mape is not None:
            if mape > 60:
                score += 100
            elif mape > 40:
                score += 60
            else:
                score += (mape / 100) * 40

        # Criterion 2: Status (30% weight)
        status = product.get("status", "ok")
        if status == "critical":
            score += 100
        elif status == "attention":
            score += 50

        return score


def get_dashboard_for_analysis(
    supabase: Client,
    analysis_id: str,
    time_horizon: TimeHorizon = 30
) -> Dict[str, Any]:
    """
    Convenience function to get dashboard data.

    Usage:
        dashboard = get_dashboard_for_analysis(supabase, analysis_id, 30)
    """
    service = DashboardService(supabase)
    return service.get_dashboard_data(analysis_id, time_horizon)

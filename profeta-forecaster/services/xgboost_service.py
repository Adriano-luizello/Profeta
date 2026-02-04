"""
XGBoost Service para Forecasting
Treina modelos por produto usando features engineered
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
from loguru import logger
import pickle
import base64


class XGBoostForecaster:
    """Serviço de forecasting com XGBoost."""

    def __init__(self):
        """Inicializa o forecaster XGBoost."""
        # Hiperparâmetros otimizados para forecasting
        self.params = {
            "objective": "reg:squarederror",
            "max_depth": 4,
            "learning_rate": 0.1,
            "n_estimators": 100,
            "min_child_weight": 3,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "gamma": 0.1,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "random_state": 42,
        }

    def prepare_training_data(
        self,
        features_df: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepara dados para treino do XGBoost.

        Args:
            features_df: DataFrame com features calculadas

        Returns:
            X (features), y (target)
        """
        if len(features_df) < 3:
            raise ValueError("Dados insuficientes para treino (mínimo 3 pontos)")

        # Target = quantidade vendida
        # Assumindo que 'y' está no DataFrame ou usar lag_1 shifted
        if "y" in features_df.columns:
            y = features_df["y"]
        else:
            # Usar a própria quantidade como target
            # (lag_1 é a venda do mês anterior, queremos prever o próximo)
            raise ValueError("Coluna 'y' (target) não encontrada")

        # Features para treino (excluir target, metadata e colunas do Supabase)
        exclude_cols = [
            "ds",
            "y",
            "feature_date",  # Datas e target
            "category",
            "brand",
            "cluster",  # Categorias textuais
            "id",
            "analysis_id",
            "product_id",  # UUIDs do Supabase
            "created_at",
            "updated_at",  # Timestamps do Supabase
        ]
        feature_cols = [col for col in features_df.columns if col not in exclude_cols]

        X = features_df[feature_cols].copy()

        # One-hot encoding para categorias (se quiser usar)
        # Por enquanto, excluímos categorias textuais

        logger.info(f"📊 Dados preparados: {len(X)} amostras, {len(feature_cols)} features")
        logger.info(f"   Features: {feature_cols}")

        return X, y

    def train_model(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        validate: bool = True,
    ) -> Dict:
        """
        Treina modelo XGBoost com validação opcional.

        Args:
            X: Features
            y: Target
            validate: Se True, faz validação com TimeSeriesSplit

        Returns:
            Dict com modelo e métricas
        """
        logger.info("🤖 Treinando modelo XGBoost...")

        if validate and len(X) >= 6:
            # Validação com TimeSeriesSplit
            mape_scores = []
            mae_scores = []

            tscv = TimeSeriesSplit(n_splits=min(3, len(X) // 2))

            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

                model = xgb.XGBRegressor(**self.params)
                model.fit(X_train, y_train, verbose=False)

                y_pred = model.predict(X_val)

                # Remover zeros para MAPE
                mask = y_val > 0
                if mask.sum() > 0:
                    mape = mean_absolute_percentage_error(y_val[mask], y_pred[mask]) * 100
                    mape_scores.append(mape)

                mae = mean_absolute_error(y_val, y_pred)
                mae_scores.append(mae)

            avg_mape = np.mean(mape_scores) if mape_scores else None
            avg_mae = np.mean(mae_scores)

            logger.info(f"✅ Validação: MAPE={avg_mape:.1f}%, MAE={avg_mae:.1f}")
        else:
            avg_mape = None
            avg_mae = None
            logger.info("⏭️ Validação pulada (poucos dados)")

        # Treinar modelo final com todos os dados
        model = xgb.XGBRegressor(**self.params)
        model.fit(X, y, verbose=False)

        # Feature importance
        feature_importance = dict(zip(X.columns, model.feature_importances_))
        top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[:5]

        logger.info(f"🎯 Top 5 features: {[f[0] for f in top_features]}")

        return {
            "model": model,
            "mape": avg_mape,
            "mae": avg_mae,
            "feature_importance": feature_importance,
            "feature_cols": list(X.columns),
        }

    def predict(
        self,
        model: xgb.XGBRegressor,
        last_features: pd.DataFrame,
        n_periods: int = 30,
    ) -> pd.DataFrame:
        """
        Gera previsões para os próximos n períodos.

        Args:
            model: Modelo treinado
            last_features: Últimas features conhecidas
            n_periods: Número de períodos para prever

        Returns:
            DataFrame com previsões
        """
        logger.info(f"🔮 Gerando previsões para {n_periods} períodos...")

        # Usar apenas colunas numéricas (XGBoost não aceita datetime)
        feature_cols = (
            model.feature_names_in_
            if hasattr(model, "feature_names_in_")
            else [c for c in last_features.columns if c not in ("ds", "y") and pd.api.types.is_numeric_dtype(last_features[c]) or (last_features[c].dtype == bool)]
        )
        last_date = pd.to_datetime(last_features["ds"].iloc[-1])
        predictions = []
        current_features = last_features[feature_cols].iloc[-1:].copy()

        for i in range(n_periods):
            # Prever próximo valor
            pred = model.predict(current_features)[0]
            predictions.append(pred)

            # Atualizar features para próxima previsão (apenas colunas que existem)
            if "lag_12" in current_features.columns and "lag_6" in current_features.columns:
                current_features["lag_12"] = current_features["lag_6"].values[0]
            if "lag_6" in current_features.columns and "lag_3" in current_features.columns:
                current_features["lag_6"] = current_features["lag_3"].values[0]
            if "lag_3" in current_features.columns and "lag_1" in current_features.columns:
                current_features["lag_3"] = current_features["lag_1"].values[0]
            if "lag_1" in current_features.columns:
                current_features["lag_1"] = pred

            # Atualizar rolling means (simplificado), se existirem
            if "rolling_mean_3m" in current_features.columns:
                l1 = current_features["lag_1"].values[0] if "lag_1" in current_features.columns else 0.0
                l3 = current_features["lag_3"].values[0] if "lag_3" in current_features.columns else 0.0
                l6 = current_features["lag_6"].values[0] if "lag_6" in current_features.columns else 0.0
                n = sum(1 for v in [l1, l3, l6] if v != 0) or 1
                current_features["rolling_mean_3m"] = (float(l1) + float(l3) + float(l6)) / max(n, 1)
            if "rolling_mean_6m" in current_features.columns:
                current_features["rolling_mean_6m"] = current_features["rolling_mean_3m"].values[0]

        # Criar DataFrame de previsões
        forecast_dates = [last_date + timedelta(days=30 * (i + 1)) for i in range(n_periods)]

        forecast_df = pd.DataFrame(
            {
                "ds": forecast_dates,
                "yhat": predictions,
                "yhat_lower": [p * 0.8 for p in predictions],  # Intervalo simplificado
                "yhat_upper": [p * 1.2 for p in predictions],
            }
        )

        logger.info(f"✅ Previsões geradas: média={np.mean(predictions):.1f}")

        return forecast_df

    def serialize_model(self, model: xgb.XGBRegressor) -> str:
        """Serializa modelo para salvar no banco."""
        model_bytes = pickle.dumps(model)
        return base64.b64encode(model_bytes).decode("utf-8")

    def deserialize_model(self, model_str: str) -> xgb.XGBRegressor:
        """Deserializa modelo do banco."""
        model_bytes = base64.b64decode(model_str.encode("utf-8"))
        return pickle.loads(model_bytes)


# Teste manual (opcional)
if __name__ == "__main__":
    # Dados de teste
    dates = pd.date_range("2024-01-01", periods=20, freq="MS")

    # Simular features
    features_df = pd.DataFrame(
        {
            "ds": dates,
            "y": [
                100,
                120,
                110,
                150,
                200,
                180,
                160,
                140,
                130,
                150,
                160,
                180,
                200,
                250,
                300,
                280,
                260,
                240,
                220,
                240,
            ],
            "lag_1": [
                0,
                100,
                120,
                110,
                150,
                200,
                180,
                160,
                140,
                130,
                150,
                160,
                180,
                200,
                250,
                300,
                280,
                260,
                240,
                220,
            ],
            "lag_3": [
                0,
                0,
                0,
                100,
                120,
                110,
                150,
                200,
                180,
                160,
                140,
                130,
                150,
                160,
                180,
                200,
                250,
                300,
                280,
                260,
            ],
            "rolling_mean_3m": [
                100,
                110,
                110,
                127,
                157,
                177,
                180,
                160,
                143,
                143,
                147,
                163,
                180,
                213,
                243,
                277,
                280,
                260,
                247,
                240,
            ],
            "rolling_mean_6m": [
                100,
                110,
                110,
                120,
                136,
                150,
                158,
                163,
                162,
                160,
                155,
                158,
                165,
                180,
                200,
                220,
                238,
                253,
                260,
                257,
            ],
            "month": [d.month for d in dates],
            "quarter": [(d.month - 1) // 3 + 1 for d in dates],
            "is_holiday": [m in [11, 12] for m in [d.month for d in dates]],
            "is_peak_season": [m in [11, 12] for m in [d.month for d in dates]],
        }
    )

    # Treinar
    forecaster = XGBoostForecaster()
    X, y = forecaster.prepare_training_data(features_df)
    result = forecaster.train_model(X, y, validate=True)

    print("\n📊 Resultados:")
    print(f"MAPE: {result['mape']:.1f}%" if result["mape"] is not None else "MAPE: N/A")
    print(f"MAE: {result['mae']:.1f}" if result["mae"] is not None else "MAE: N/A")
    print(f"\nTop Features:")
    for feat, imp in sorted(result["feature_importance"].items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {feat}: {imp:.3f}")

    # Prever
    forecast = forecaster.predict(result["model"], features_df, n_periods=3)
    print("\n🔮 Previsões:")
    print(forecast)

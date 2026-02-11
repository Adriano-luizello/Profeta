"""
Prophet Forecaster - Core forecasting logic
"""

import pandas as pd
import numpy as np
from prophet import Prophet
from calendar import monthrange
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from loguru import logger
from supabase import create_client, Client

from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

from schemas.forecast import (
    ForecastDataPoint,
    HistoricalDataPoint,
    ForecastMetrics,
    ForecastRecommendations,
    ProductForecast,
    CategoryForecast,
    ForecastResponse
)
from services.feature_engineer import FeatureEngineer
from services.model_router import model_router

# suppress_stdout_stderr removido: causava "I/O operation on closed file" com ThreadPoolExecutor
# (race condition ao redirecionar sys.stdout/stderr em múltiplas threads)


def calculate_forecast_metrics(actual: pd.Series, predicted: pd.Series) -> dict:
    """
    Calcula métricas de acurácia do forecast.

    Args:
        actual: Valores reais
        predicted: Valores previstos

    Returns:
        Dict com MAPE, MAE e nível de acurácia
    """
    try:
        if len(actual) < 2 or len(predicted) < 2:
            return {
                "mape": None,
                "mae": None,
                "accuracy_level": "insufficient_data",
                "sample_size": len(actual),
            }

        common_index = actual.index.intersection(predicted.index)
        if len(common_index) == 0:
            return {
                "mape": None,
                "mae": None,
                "accuracy_level": "no_overlap",
                "sample_size": 0,
            }

        actual_aligned = actual.loc[common_index]
        predicted_aligned = predicted.loc[common_index]

        mask = actual_aligned > 0
        if mask.sum() == 0:
            return {
                "mape": None,
                "mae": float(mean_absolute_error(actual_aligned, predicted_aligned)),
                "accuracy_level": "contains_zeros",
                "sample_size": len(actual_aligned),
            }

        actual_nonzero = actual_aligned[mask]
        predicted_nonzero = predicted_aligned[mask]

        mape = mean_absolute_percentage_error(actual_nonzero, predicted_nonzero) * 100
        mae = mean_absolute_error(actual_aligned, predicted_aligned)

        if mape < 20:
            accuracy_level = "excellent"
        elif mape < 50:
            accuracy_level = "good"
        else:
            accuracy_level = "needs_improvement"

        return {
            "mape": round(float(mape), 2),
            "mae": round(float(mae), 2),
            "accuracy_level": accuracy_level,
            "sample_size": len(actual_aligned),
        }

    except Exception as e:
        logger.error(f"Erro ao calcular métricas: {e}")
        return {
            "mape": None,
            "mae": None,
            "accuracy_level": "error",
            "error": str(e),
        }


class ProphetForecaster:
    """Classe para forecasting com Prophet"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """
        Inicializa o forecaster
        
        Args:
            supabase_url: URL do Supabase
            supabase_key: Chave do Supabase
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client inicializado")
    
    async def generate_forecast(
        self,
        analysis_id: str,
        forecast_days: List[int] = [30, 60, 90],
        by_product: bool = True,
        by_category: bool = True
    ) -> ForecastResponse:
        """
        Gera forecast para uma análise
        
        Args:
            analysis_id: ID da análise
            forecast_days: Lista de horizontes (ex: [30, 60, 90])
            by_product: Forecast por produto
            by_category: Forecast por categoria
        
        Returns:
            ForecastResponse com previsões
        """
        import time
        
        # ===== TIMING: FORECAST TOTAL START =====
        forecast_total_start = time.time()
        
        logger.info("=" * 60)
        logger.info("PROPHET FORECAST - INICIANDO")
        logger.info("=" * 60)
        logger.info(f"📊 Buscando produtos para análise {analysis_id}")

        # ===== TIMING: FETCH PRODUTOS START =====
        fetch_start = time.time()
        products = await self._fetch_products(analysis_id)
        fetch_sec = time.time() - fetch_start

        if not products:
            raise ValueError(f"Nenhum produto encontrado para análise {analysis_id}")

        logger.info(f"📦 {len(products)} produtos encontrados ({fetch_sec:.2f}s)")

        product_ids = [p["id"] for p in products]

        # Tentar buscar dados reais primeiro
        sales_df = self._fetch_sales_history(product_ids)

        if sales_df.empty:
            logger.warning("⚠️  Sem dados reais em sales_history, usando sintético como fallback")
            historical_data = self._generate_synthetic_data(products)
            use_synthetic = True
        else:
            historical_data = self._sales_to_historical_dict(sales_df, product_ids)
            if not historical_data:
                logger.warning("⚠️  Nenhum produto com dados válidos, usando sintético como fallback")
                historical_data = self._generate_synthetic_data(products)
                use_synthetic = True
            else:
                logger.info("✅ Usando dados REAIS do sales_history")
                use_synthetic = False

        logger.info(f"Linhas de histórico (agregado): {sum(len(df) for df in historical_data.values())}")
        if historical_data:
            all_ds = pd.concat([df["ds"] for df in historical_data.values()])
            logger.info(f"Período: {all_ds.min()} a {all_ds.max()}")
        logger.info(f"Usando dados sintéticos: {use_synthetic}")
        logger.info("=" * 60)
        
        # ============================================
        # DECISÃO: USAR PROPHET OU APENAS XGBOOST?
        # ============================================
        # Avaliar qualidade dos dados para decidir se roda Prophet
        sample_df = list(historical_data.values())[0] if historical_data else pd.DataFrame()
        prophet_decision = self._should_use_prophet(sample_df)
        
        logger.info("=" * 60)
        logger.info("[Prophet Toggle] Avaliando dados...")
        logger.info(f"[Prophet Toggle] {prophet_decision['reason']}")
        if prophet_decision['use_prophet']:
            logger.info(f"[Prophet Toggle] ✅ Prophet ATIVADO ({prophet_decision['data_points']} pontos {prophet_decision['data_frequency']})")
        else:
            logger.info(f"[Prophet Toggle] ⏭️ Prophet DESATIVADO — apenas XGBoost será usado")
        logger.info("=" * 60)

        # ============================================
        # FASE 2: Feature Engineering
        # ============================================
        # ===== TIMING: FEATURE ENGINEERING START =====
        fe_start = time.time()
        
        if not use_synthetic and not sales_df.empty:
            logger.info("🔧 Calculando features para XGBoost...")

            from services.feature_engineer import FeatureEngineer
            feature_engineer = FeatureEngineer()
            feature_store_records = []

            for product in products:
                try:
                    # Filtrar histórico deste produto
                    product_sales = sales_df[sales_df["product_id"] == product["id"]].copy()

                    if len(product_sales) < 3:
                        logger.warning(f"⚠️ Produto {product['id']}: dados insuficientes para features")
                        continue

                    # Preparar DataFrame para feature engineering
                    product_sales = product_sales.sort_values("ds")
                    df_features = product_sales[["ds", "y"]].copy()

                    # Calcular features
                    features_df = feature_engineer.calculate_features(df_features, product)

                    if len(features_df) > 0:
                        # Preparar para inserir no DB
                        records = feature_engineer.prepare_feature_store_data(
                            features_df,
                            str(product["id"]),
                            analysis_id,
                        )
                        feature_store_records.extend(records)

                        product_name = product.get("cleaned_name", product.get("original_name", product["id"]))
                        logger.info(f"✅ Features calculadas para {product_name}: {len(records)} registros")

                except Exception as e:
                    logger.error(f"❌ Erro ao calcular features para produto {product['id']}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    continue

            # Salvar features no banco
            if feature_store_records:
                try:
                    logger.info(f"💾 Salvando {len(feature_store_records)} registros no feature_store...")

                    self.supabase.table("feature_store").upsert(
                        feature_store_records,
                        on_conflict="product_id,feature_date",
                    ).execute()

                    logger.info(f"✅ Features salvas: {len(feature_store_records)} registros")

                except Exception as e:
                    logger.error(f"❌ Erro ao salvar features: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.warning("⚠️ Nenhuma feature calculada")

            # ===== TIMING: FEATURE ENGINEERING END =====
            fe_sec = time.time() - fe_start
            logger.info(f"✅ Feature engineering concluído ({fe_sec:.2f}s)")
        else:
            fe_sec = time.time() - fe_start
            logger.info(f"⏭️ Feature engineering omitido ({fe_sec:.2f}s)")
        # ============================================

        # ============================================
        # FASE 3: XGBoost Forecasting (PARALELO)
        # ============================================
        # ===== TIMING: XGBOOST START =====
        xgb_start = time.time()
        
        if not use_synthetic and not sales_df.empty and by_product:
            logger.info("🤖 Treinando modelos XGBoost por produto (PARALELO)...")

            from services.xgboost_service import XGBoostForecaster
            xgb_forecaster = XGBoostForecaster()
            
            # Função isolada para treinar um produto (roda em paralelo)
            def train_single_product_xgboost(product: Dict) -> Optional[Dict]:
                """
                Treina XGBoost para um único produto.
                Retorna resultado ou None se falhar/pular.
                """
                try:
                    product_id = str(product["id"])
                    product_name = product.get("cleaned_name", product.get("original_name", product_id))
                    
                    # Buscar features deste produto
                    features_query = (
                        self.supabase.table("feature_store")
                        .select("*")
                        .eq("product_id", product_id)
                        .order("feature_date", desc=False)
                        .execute()
                    )

                    if not features_query.data or len(features_query.data) < 6:
                        logger.warning(
                            f"⏭️ XGBoost pulado para {product_name}: poucos dados ({len(features_query.data) if features_query.data else 0} pontos)"
                        )
                        return None

                    # Converter para DataFrame
                    features_df = pd.DataFrame(features_query.data)
                    features_df["ds"] = pd.to_datetime(features_df["feature_date"])

                    # Buscar vendas reais para 'y'
                    product_sales = sales_df[sales_df["product_id"] == product["id"]].copy()
                    product_sales = product_sales.sort_values("ds")

                    # Merge features com vendas reais
                    features_df = features_df.merge(
                        product_sales[["ds", "y"]],
                        on="ds",
                        how="left",
                    )

                    # Remover NaN em y
                    features_df = features_df.dropna(subset=["y"])

                    if len(features_df) < 6:
                        logger.warning(
                            f"⏭️ XGBoost pulado para {product_name}: dados insuficientes após merge"
                        )
                        return None

                    # Preparar dados
                    X, y = xgb_forecaster.prepare_training_data(features_df)

                    # Treinar modelo
                    result = xgb_forecaster.train_model(X, y, validate=True)

                    # Gerar previsões
                    forecast = xgb_forecaster.predict(
                        result["model"],
                        features_df,
                        n_periods=3,  # 30, 60, 90 dias (3 meses)
                    )

                    mape_str = f"{result['mape']:.1f}%" if result["mape"] is not None else "N/A"
                    logger.info(f"✅ XGBoost para {product_name}: MAPE={mape_str}, MAE={result['mae']:.1f}" if result["mae"] is not None else f"✅ XGBoost para {product_name}: MAPE={mape_str}")

                    return {
                        "product_id": product_id,
                        "product_name": product_name,
                        "mape": result["mape"],
                        "mae": result["mae"],
                        "forecast": forecast.to_dict("records"),
                        "feature_importance": result["feature_importance"],
                        "training_samples": len(X),
                    }

                except Exception as e:
                    logger.error(f"❌ Erro XGBoost para produto {product.get('id', 'unknown')}: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
                    return None
            
            # Paralelizar com ThreadPoolExecutor (mesmo padrão do Prophet)
            total_products = len(products)
            max_workers = min(8, total_products)
            logger.info(f"⚡ Usando {max_workers} workers paralelos para XGBoost")
            
            xgboost_results = []
            completed = 0
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_product = {
                    executor.submit(train_single_product_xgboost, product): product
                    for product in products
                }
                
                for future in as_completed(future_to_product):
                    product = future_to_product[future]
                    completed += 1
                    try:
                        result = future.result()
                        if result is not None:
                            xgboost_results.append(result)
                            logger.info(f"  ✓ [{completed}/{total_products}] {result['product_name']}: XGBoost concluído")
                        else:
                            logger.debug(f"  ⏭️ [{completed}/{total_products}] {product.get('cleaned_name', product['id'])}: pulado")
                    except Exception as e:
                        logger.warning(f"  ✗ [{completed}/{total_products}] {product.get('id', 'unknown')}: {e}")

            # Salvar previsões XGBoost no banco
            if xgboost_results:
                try:
                    logger.info(f"💾 Salvando previsões XGBoost para {len(xgboost_results)} produtos...")

                    def convert_to_native(obj):
                        """Converte tipos NumPy/Pandas para tipos nativos Python (JSON serializable)."""
                        import numpy as np
                        import pandas as pd

                        if isinstance(obj, (np.integer, np.int64, np.int32)):
                            return int(obj)
                        elif isinstance(obj, (np.floating, np.float64, np.float32)):
                            return float(obj)
                        elif isinstance(obj, np.ndarray):
                            return obj.tolist()
                        elif isinstance(obj, pd.Timestamp):
                            return obj.isoformat()
                        elif isinstance(obj, dict):
                            return {k: convert_to_native(v) for k, v in obj.items()}
                        elif isinstance(obj, (list, tuple)):
                            return [convert_to_native(item) for item in obj]
                        else:
                            return obj

                    # Preparar registros para forecasts_xgboost
                    xgb_records = []
                    for res in xgboost_results:
                        for forecast_point in res["forecast"]:
                            ds_val = forecast_point["ds"]
                            forecast_date_str = pd.Timestamp(ds_val).strftime("%Y-%m-%d") if hasattr(ds_val, "strftime") else str(ds_val)[:10]
                            xgb_records.append({
                                "analysis_id": analysis_id,
                                "product_id": res["product_id"],
                                "forecast_date": forecast_date_str,
                                "predicted_quantity": float(forecast_point["yhat"]),
                                "lower_bound": float(forecast_point["yhat_lower"]),
                                "upper_bound": float(forecast_point["yhat_upper"]),
                                "confidence_score": 0.8,
                                "model_version": "xgboost-3.1.3",
                                "features_used": convert_to_native(res["feature_importance"]),
                            })

                    # Salvar no banco
                    self.supabase.table("forecasts_xgboost").upsert(
                        xgb_records,
                        on_conflict="product_id,forecast_date",
                    ).execute()

                    logger.info(f"✅ {len(xgb_records)} previsões XGBoost salvas")

                    # Salvar metadata dos modelos
                    model_metadata = []
                    for res in xgboost_results:
                        model_metadata.append({
                            "analysis_id": analysis_id,
                            "product_id": res["product_id"],
                            "model_type": "xgboost",
                            "mape": float(res["mape"]) if res["mape"] is not None else None,
                            "mae": float(res["mae"]) if res["mae"] is not None else None,
                            "feature_importance": convert_to_native(res["feature_importance"]),
                            "training_samples": int(res.get("training_samples", 0)),
                            "hyperparameters": convert_to_native(xgb_forecaster.params),
                        })

                    self.supabase.table("model_metadata").upsert(
                        model_metadata,
                        on_conflict="product_id,model_type",
                    ).execute()

                    logger.info(f"✅ Metadata de {len(model_metadata)} modelos salva")

                except Exception as e:
                    logger.error(f"❌ Erro ao salvar XGBoost: {e}")
                    import traceback
                    logger.error(traceback.format_exc())
            else:
                logger.warning("⚠️ Nenhum modelo XGBoost treinado")

            # ===== TIMING: XGBOOST END =====
            xgb_sec = time.time() - xgb_start
            logger.info(f"✅ XGBoost forecasting concluído ({xgb_sec:.2f}s)")
        else:
            xgb_sec = time.time() - xgb_start
            logger.info(f"⏭️ XGBoost omitido ({xgb_sec:.2f}s)")
        # ============================================

        response = ForecastResponse(
            analysis_id=analysis_id,
            created_at=datetime.now().isoformat()
        )
        
        # ===== TIMING: PROPHET START =====
        prophet_start = time.time()
        prophet_product_sec = 0
        prophet_category_sec = 0
        
        # Forecast por produto (condicional baseado na decisão)
        if by_product and prophet_decision['use_prophet']:
            logger.info("🔮 Gerando forecast por produto (Prophet)...")
            prophet_product_start = time.time()
            response.product_forecasts = self._forecast_by_product(
                products,
                historical_data,
                forecast_days,
            )
            prophet_product_sec = time.time() - prophet_product_start
        elif by_product:
            logger.info(f"⏭️ Prophet PULADO para produtos — {prophet_decision['reason']}")
            # Gerar forecast APENAS com XGBoost (sem rodar Prophet)
            response.product_forecasts = self._forecast_by_product_xgboost_only(
                products,
                historical_data,
                forecast_days,
            )
        
        # Forecast por categoria (condicional baseado na decisão)
        xgb_category_sec = 0
        if by_category and prophet_decision['use_prophet']:
            logger.info("🔮 Gerando forecast por categoria (Prophet)...")
            prophet_category_start = time.time()
            response.category_forecasts = self._forecast_by_category(
                products,
                historical_data,
                forecast_days
            )
            prophet_category_sec = time.time() - prophet_category_start
        elif by_category:
            logger.info(f"⏭️ Prophet PULADO para categorias — {prophet_decision['reason']}")
            logger.info("🏷️ Gerando categorias via XGBoost agregado (Prophet desativado)...")
            xgb_category_start = time.time()
            # Agregar forecasts dos produtos por categoria
            response.category_forecasts = self._forecast_by_category_xgboost_only(
                response.product_forecasts,
                products,
                historical_data
            )
            xgb_category_sec = time.time() - xgb_category_start
        
        # ===== TIMING: PROPHET END =====
        prophet_sec = time.time() - prophet_start
        
        # Estatísticas gerais
        response.stats = {
            "total_products": len(products),
            "categories": len(set(p["refined_category"] for p in products)),
            "forecast_horizons": forecast_days,
            "generated_at": datetime.now().isoformat()
        }
        
        # ===== TIMING: FORECAST TOTAL END =====
        forecast_total_sec = time.time() - forecast_total_start
        
        # Log final com breakdown de tempo
        logger.info("=" * 60)
        logger.info("[Forecast] TIMING SUMMARY")
        
        if prophet_decision['use_prophet']:
            logger.info(f"[Forecast] Total: {forecast_total_sec:.1f}s | FE: {fe_sec:.1f}s | XGB: {xgb_sec:.1f}s | Prophet: {prophet_sec:.1f}s")
            if prophet_product_sec > 0:
                logger.info(f"[Forecast] Prophet produtos: {prophet_product_sec:.1f}s | {len(products)} produtos | {prophet_product_sec/max(1, len(products)):.2f}s/produto")
            if prophet_category_sec > 0:
                logger.info(f"[Forecast] Prophet categorias (PARALELO): {prophet_category_sec:.1f}s")
        else:
            logger.info(f"[Forecast] Total: {forecast_total_sec:.1f}s | FE: {fe_sec:.1f}s | XGB: {xgb_sec:.1f}s | XGB Cat: {xgb_category_sec:.1f}s | Prophet: DESATIVADO")
            logger.info(f"[Forecast] Motivo: {prophet_decision['reason']}")
            logger.info(f"[Forecast] {len(products)} produtos processados apenas com XGBoost")
            if xgb_category_sec > 0:
                logger.info(f"[Forecast] Categorias XGBoost agregadas: {xgb_category_sec:.1f}s | {len(response.category_forecasts or [])} categorias")
        
        logger.info("=" * 60)
        
        # Calcular e persistir avg_daily_demand por produto
        if response.product_forecasts:
            logger.info("📊 Calculando avg_daily_demand por produto...")
            self._calculate_and_persist_avg_daily_demand(response.product_forecasts, sales_df)
        
        # Salvar no banco
        await self._save_forecast(response)

        # Log dos valores finais por produto para debug (remover após investigação)
        if response.product_forecasts:
            for pf in response.product_forecasts[:2]:
                logger.info(f"RESPONSE DEBUG [{pf.product_name}]:")
                f30 = pf.forecast_30d or []
                f60 = pf.forecast_60d or []
                f90 = pf.forecast_90d or []
                logger.info(
                    f"  forecast_30d: {len(f30)} pts, first={f30[0].predicted_quantity if f30 else 'EMPTY'}, last={f30[-1].predicted_quantity if f30 else 'EMPTY'}"
                )
                logger.info(
                    f"  forecast_60d: {len(f60)} pts, first={f60[0].predicted_quantity if f60 else 'EMPTY'}, last={f60[-1].predicted_quantity if f60 else 'EMPTY'}"
                )
                logger.info(
                    f"  forecast_90d: {len(f90)} pts, first={f90[0].predicted_quantity if f90 else 'EMPTY'}, last={f90[-1].predicted_quantity if f90 else 'EMPTY'}"
                )
        
        return response
    
    def _generate_synthetic_data(
        self,
        products: List[Dict],
        days: int = 365
    ) -> Dict[str, pd.DataFrame]:
        """
        Gera dados sintéticos de vendas para teste
        
        Args:
            products: Lista de produtos
            days: Número de dias de histórico
        
        Returns:
            Dict com DataFrames por produto
        """
        logger.info(f"🎲 Gerando {days} dias de dados sintéticos...")
        
        historical_data = {}
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        for product in products:
            product_id = product["id"]
            product_name = product["original_name"]
            base_quantity = product.get("quantity", 10)
            seasonality = product.get("seasonality", "year-round")
            
            # Criar range de datas
            dates = pd.date_range(start=start_date, end=end_date, freq='D')
            
            # Componente de tendência
            trend = np.linspace(base_quantity * 0.8, base_quantity * 1.2, len(dates))
            
            # Componente de sazonalidade
            seasonal = self._get_seasonal_component(seasonality, len(dates))
            
            # Ruído aleatório
            noise = np.random.normal(0, base_quantity * 0.1, len(dates))
            
            # Combinar componentes
            quantities = np.maximum(0, trend + seasonal * base_quantity * 0.3 + noise)
            
            # Criar DataFrame
            df = pd.DataFrame({
                'ds': dates,  # Prophet requer coluna 'ds'
                'y': quantities  # Prophet requer coluna 'y'
            })
            
            historical_data[product_id] = df
            
            logger.debug(f"  ✓ {product_name}: {len(df)} registros")
        
        return historical_data
    
    def _get_seasonal_component(
        self,
        seasonality: str,
        length: int
    ) -> np.ndarray:
        """
        Gera componente sazonal baseado no tipo
        
        Args:
            seasonality: Tipo de sazonalidade
            length: Comprimento da série
        
        Returns:
            Array com componente sazonal
        """
        t = np.arange(length)
        
        if "winter" in seasonality.lower():
            # Pico no inverno (meio e fim do ano)
            return np.sin(2 * np.pi * t / 365 + np.pi)
        
        elif "summer" in seasonality.lower():
            # Pico no verão (início do ano)
            return np.sin(2 * np.pi * t / 365)
        
        elif "holiday" in seasonality.lower():
            # Picos em datas específicas (Natal, Black Friday)
            holidays = np.zeros(length)
            # Simular picos em dezembro
            for i in range(length):
                if (i % 365) > 330:  # Últimos 35 dias do ano
                    holidays[i] = 2.0
            return holidays
        
        else:
            # Year-round: sazonalidade fraca
            return np.sin(2 * np.pi * t / 365) * 0.2
    
    def _forecast_by_product_xgboost_only(
        self,
        products: List[Dict],
        historical_data: Dict[str, pd.DataFrame],
        forecast_days: List[int],
    ) -> List[ProductForecast]:
        """
        Gera forecast usando APENAS XGBoost (quando Prophet está desativado).
        Muito mais rápido que Prophet para dados mensais.
        """
        logger.info("🤖 Gerando forecast por produto (XGBoost ONLY - sem Prophet)...")
        forecasts = []
        
        for product in products:
            product_id = product["id"]
            if product_id not in historical_data:
                logger.warning(
                    f"⚠️  Pulando {product.get('cleaned_name', product['original_name'])}: sem dados históricos"
                )
                continue
            
            df = historical_data[product_id]
            if len(df) < self.MIN_POINTS:
                logger.warning(
                    f"⚠️  Pulando {product.get('cleaned_name', product['original_name'])}: poucos dados ({len(df)} pontos)"
                )
                continue
            
            product_name = product.get("cleaned_name", product["original_name"])
            category = product.get("refined_category", "Sem Categoria")
            
            # Dados históricos
            historical = [
                HistoricalDataPoint(
                    date=row["ds"].isoformat(),
                    quantity=float(row["y"]),
                )
                for _, row in df.tail(30).iterrows()
            ]
            
            # Buscar XGBoost forecasts
            product_id_str = str(product_id)
            xgb_raw = self._fetch_xgboost_forecasts(product_id_str)
            xgb_metrics = self._fetch_xgboost_metrics(product_id_str)
            
            if not xgb_raw:
                logger.warning(f"  ⚠️ [{product_name}] sem dados XGBoost — pulando")
                continue
            
            last_date = df["ds"].max()
            
            # Expandir XGBoost para horizontes
            xgb_30d = self._expand_xgboost_to_daily(xgb_raw, last_date, 30)
            xgb_60d = self._expand_xgboost_to_daily(xgb_raw, last_date, 60)
            xgb_90d = self._expand_xgboost_to_daily(xgb_raw, last_date, 90)
            
            # Converter para ForecastDataPoint
            forecast_30d = [ForecastDataPoint(**d) for d in xgb_30d]
            forecast_60d = [ForecastDataPoint(**d) for d in xgb_60d]
            forecast_90d = [ForecastDataPoint(**d) for d in xgb_90d]
            
            # Métricas do XGBoost
            metrics = ForecastMetrics(
                mape=xgb_metrics.get("mape", 0.0) if xgb_metrics else 0.0,
                rmse=xgb_metrics.get("rmse", 0.0) if xgb_metrics else 0.0,
                mae=xgb_metrics.get("mae", 0.0) if xgb_metrics else 0.0,
                trend="stable",
                seasonality_strength=0.0,
                model_used="xgboost"
            )
            
            # Gerar recomendações
            recommendations = self._generate_recommendations(
                product,
                forecast_30d,
                metrics
            )
            
            logger.info(f"  ✓ [{product_name}]: forecast XGBoost gerado (30d={len(forecast_30d)}, 60d={len(forecast_60d)}, 90d={len(forecast_90d)})")
            
            forecasts.append(ProductForecast(
                product_id=product_id,
                product_name=product_name,
                category=category,
                historical_data=historical,
                forecast_30d=forecast_30d,
                forecast_60d=forecast_60d,
                forecast_90d=forecast_90d,
                metrics=metrics,
                recommendations=recommendations
            ))
        
        return forecasts

    def _forecast_by_product(
        self,
        products: List[Dict],
        historical_data: Dict[str, pd.DataFrame],
        forecast_days: List[int],
    ) -> List[ProductForecast]:
        """
        Gera forecast para cada produto em paralelo usando ThreadPoolExecutor.
        Threads compartilham memória e funcionam bem com Prophet/Stan.
        """
        max_days = max(forecast_days)
        tasks = []
        for product in products:
            product_id = product["id"]
            if product_id not in historical_data:
                logger.warning(
                    f"⚠️  Pulando {product.get('cleaned_name', product['original_name'])}: sem dados históricos"
                )
                continue
            df = historical_data[product_id]
            if len(df) < self.MIN_POINTS:
                logger.warning(
                    f"⚠️  Pulando {product.get('cleaned_name', product['original_name'])}: poucos dados ({len(df)} pontos)"
                )
                continue
            tasks.append((product, df, max_days))

        if not tasks:
            return []

        total = len(tasks)
        max_workers = min(8, total)
        logger.info(f"🔮 Gerando forecast para {total} produtos (PARALELO)...")
        logger.info(f"⚡ Usando {max_workers} workers paralelos")

        def train_one(product: Dict, df: pd.DataFrame, max_d: int) -> Tuple[str, Optional[pd.DataFrame]]:
            """Treina Prophet para um produto (roda em thread). Retorna (product_id, forecast_result) ou (product_id, None)."""
            # Silenciar warnings verbosos do Stan e Prophet
            import logging
            logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
            logging.getLogger("prophet").setLevel(logging.ERROR)
            product_id = product["id"]
            try:
                model = Prophet(
                    yearly_seasonality=True,
                    weekly_seasonality=True,
                    daily_seasonality=False,
                    interval_width=0.8,
                    changepoint_prior_scale=0.05,
                    seasonality_prior_scale=10.0,
                )
                try:
                    model.add_country_holidays(country_name="BR")
                except Exception:
                    pass
                # Treinar modelo (warnings do Stan podem aparecer nos logs)
                model.fit(df)
                future = model.make_future_dataframe(periods=max_d)
                forecast_result = model.predict(future)
                return (product_id, forecast_result)
            except Exception as e:
                logger.error(f"Erro ao treinar produto {product_id}: {e}")
                return (product_id, None)

        results_by_id: Dict[str, Tuple[pd.DataFrame, pd.DataFrame]] = {}
        completed = 0

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_product = {
                executor.submit(train_one, product, df, max_days): product
                for product, df, max_days in tasks
            }
            for future in as_completed(future_to_product):
                product = future_to_product[future]
                product_id = product["id"]
                completed += 1
                try:
                    pid, forecast_result = future.result()
                    if forecast_result is not None:
                        results_by_id[product_id] = (forecast_result, historical_data[product_id])
                        logger.info(
                            f"  ✓ [{completed}/{total}] {product.get('cleaned_name', product['original_name'])}: forecast gerado"
                        )
                    else:
                        logger.warning(f"  ✗ [{completed}/{total}] {product_id}: pulado (dados insuficientes ou erro)")
                except Exception as e:
                    logger.warning(f"  ✗ [{completed}/{total}] {product_id}: {e}")

        forecasts = []
        for product in products:
            product_id = product["id"]
            if product_id not in results_by_id:
                continue
            forecast_result, df = results_by_id[product_id]
            product_name = product.get("cleaned_name", product["original_name"])
            category = product.get("refined_category", "Sem Categoria")
            historical = [
                HistoricalDataPoint(
                    date=row["ds"].isoformat(),
                    quantity=float(row["y"]),
                )
                for _, row in df.tail(30).iterrows()
            ]
            prophet_30d = self._extract_forecast_period(forecast_result, df, 30)
            prophet_60d = self._extract_forecast_period(forecast_result, df, 60)
            prophet_90d = self._extract_forecast_period(forecast_result, df, 90)
            metrics = self._calculate_metrics(df, forecast_result, product)

            # Model Router: escolher melhor modelo por horizonte (XGBoost, Prophet ou Ensemble)
            product_id_str = str(product_id)
            xgb_raw = self._fetch_xgboost_forecasts(product_id_str)
            xgb_metrics = self._fetch_xgboost_metrics(product_id_str)
            if not xgb_raw:
                logger.info(
                    f"  [{product_name}] sem dados XGBoost no forecasts_xgboost - usando Prophet"
                )
            last_date = df["ds"].max()

            def to_dict_list(lst):
                return [
                    {"date": p.date, "predicted_quantity": p.predicted_quantity, "lower_bound": p.lower_bound, "upper_bound": p.upper_bound}
                    for p in lst
                ]

            def to_forecast_data_points(lst):
                return [ForecastDataPoint(**d) for d in lst]

            xgb_30d = self._expand_xgboost_to_daily(xgb_raw, last_date, 30) if xgb_raw else []
            xgb_60d = self._expand_xgboost_to_daily(xgb_raw, last_date, 60) if xgb_raw else []
            xgb_90d = self._expand_xgboost_to_daily(xgb_raw, last_date, 90) if xgb_raw else []

            logger.info(
                f"  [{product_name}] Prophet: 30d={len(prophet_30d)} pts, 60d={len(prophet_60d)} pts, 90d={len(prophet_90d)} pts"
            )
            logger.info(
                f"  [{product_name}] XGBoost: 30d={len(xgb_30d)} pts, 60d={len(xgb_60d)} pts, 90d={len(xgb_90d)} pts"
            )
            if prophet_90d:
                prophet_90d_mean = sum(p.predicted_quantity for p in prophet_90d) / len(prophet_90d)
                logger.info(f"  [{product_name}] Prophet 90d média: {prophet_90d_mean:.1f}")
            if xgb_90d:
                xgb_90d_mean = sum(p.get("predicted_quantity", 0) for p in xgb_90d) / len(xgb_90d)
                logger.info(f"  [{product_name}] XGBoost 90d média: {xgb_90d_mean:.1f}")

            prophet_mape = metrics.mape
            xgb_mape = xgb_metrics.get("mape") if xgb_metrics else None

            # Sinalizar se dados são mensais para _select_best_forecast
            self._current_df_is_monthly = self._is_historical_monthly(df)

            forecast_30d_final = self._select_best_forecast(
                prophet_forecast=to_dict_list(prophet_30d),
                xgboost_forecast=xgb_30d,
                prophet_mape=prophet_mape,
                xgboost_mape=xgb_mape,
                horizon=30,
                product_name=product_name,
            )
            forecast_60d_final = self._select_best_forecast(
                prophet_forecast=to_dict_list(prophet_60d),
                xgboost_forecast=xgb_60d,
                prophet_mape=prophet_mape,
                xgboost_mape=xgb_mape,
                horizon=60,
                product_name=product_name,
            )
            forecast_90d_final = self._select_best_forecast(
                prophet_forecast=to_dict_list(prophet_90d),
                xgboost_forecast=xgb_90d,
                prophet_mape=prophet_mape,
                xgboost_mape=xgb_mape,
                horizon=90,
                product_name=product_name,
            )

            historical_mean = (
                sum(h.quantity for h in historical) / len(historical) if historical else 0.0
            )
            forecast_30d_final = self._validate_forecast_values(
                forecast_30d_final, xgb_30d, product_name, 30, historical_mean
            )
            forecast_60d_final = self._validate_forecast_values(
                forecast_60d_final, xgb_60d, product_name, 60, historical_mean
            )
            forecast_90d_final = self._validate_forecast_values(
                forecast_90d_final, xgb_90d, product_name, 90, historical_mean
            )

            self._current_df_is_monthly = False

            # === CLAMP: limitar previsões diárias antes de agregar ===
            forecast_30d_final = self._clamp_daily_forecasts(forecast_30d_final, df)
            forecast_60d_final = self._clamp_daily_forecasts(forecast_60d_final, df)
            forecast_90d_final = self._clamp_daily_forecasts(forecast_90d_final, df)

            # Se dados históricos são mensais, agregar previsões diárias em mensais (mesma escala no gráfico)
            if self._is_historical_monthly(df):
                forecast_30d_final = self._aggregate_daily_to_monthly(forecast_30d_final)
                forecast_60d_final = self._aggregate_daily_to_monthly(forecast_60d_final)
                forecast_90d_final = self._aggregate_daily_to_monthly(forecast_90d_final)

                # === CLAMP MENSAL: rede de segurança pós-agregação ===
                forecast_30d_final = self._clamp_monthly_forecasts(forecast_30d_final, df)
                forecast_60d_final = self._clamp_monthly_forecasts(forecast_60d_final, df)
                forecast_90d_final = self._clamp_monthly_forecasts(forecast_90d_final, df)
                logger.info(
                    f"  [{product_name}] Previsões agregadas para mensal (mesma escala que histórico)"
                )

            # Usar forecast_final (Model Router) - NUNCA Prophet original
            forecast_30d_for_product = (
                to_forecast_data_points(forecast_30d_final)
                if forecast_30d_final
                else prophet_30d
            )
            forecast_60d_for_product = (
                to_forecast_data_points(forecast_60d_final)
                if forecast_60d_final
                else prophet_60d
            )
            forecast_90d_for_product = (
                to_forecast_data_points(forecast_90d_final)
                if forecast_90d_final
                else prophet_90d
            )

            # Atualizar metrics com MAPE do modelo escolhido (30d) para refletir no dashboard
            selection_30d = model_router.select_model(
                xgboost_mape=xgb_mape,
                prophet_mape=prophet_mape,
                time_horizon=30,
                context="forecast",
            )
            if selection_30d.model == "xgboost" and xgb_metrics and xgb_metrics.get("mape") is not None:
                metrics = ForecastMetrics(
                    mape=xgb_metrics.get("mape"),
                    rmse=metrics.rmse,
                    mae=xgb_metrics.get("mae"),
                    trend=metrics.trend,
                    seasonality_strength=metrics.seasonality_strength,
                    accuracy_level=metrics.accuracy_level,
                    sample_size=metrics.sample_size,
                )
            elif selection_30d.model == "ensemble" and xgb_metrics and xgb_metrics.get("mape") is not None and prophet_mape is not None:
                w = selection_30d.weights or {"xgboost": 0.5, "prophet": 0.5}
                xgb_w = w.get("xgboost", 0.5)
                prophet_w = w.get("prophet", 0.5)
                ensemble_mape = (
                    (xgb_metrics.get("mape") or 0) * xgb_w
                    + (prophet_mape or 0) * prophet_w
                )
                metrics = ForecastMetrics(
                    mape=round(ensemble_mape, 2),
                    rmse=metrics.rmse,
                    mae=metrics.mae,
                    trend=metrics.trend,
                    seasonality_strength=metrics.seasonality_strength,
                    accuracy_level=metrics.accuracy_level,
                    sample_size=metrics.sample_size,
                )

            # Log valores finais por horizonte (investigação de inconsistências 30d/60d/90d)
            logger.info(
                f"  [{product_name}] FINAL forecast_30d: {[round(f.predicted_quantity, 2) for f in forecast_30d_for_product]}"
            )
            logger.info(
                f"  [{product_name}] FINAL forecast_60d: {[round(f.predicted_quantity, 2) for f in forecast_60d_for_product]}"
            )
            logger.info(
                f"  [{product_name}] FINAL forecast_90d: {[round(f.predicted_quantity, 2) for f in forecast_90d_for_product]}"
            )

            recommendations = self._generate_recommendations(
                product,
                forecast_30d_for_product,
                metrics,
            )
            forecasts.append(
                ProductForecast(
                    product_id=product_id,
                    product_name=product_name,
                    category=category,
                    historical_data=historical,
                    forecast_30d=forecast_30d_for_product,
                    forecast_60d=forecast_60d_for_product,
                    forecast_90d=forecast_90d_for_product,
                    metrics=metrics,
                    recommendations=recommendations,
                )
            )

        logger.info(f"✅ Forecast por produto concluído: {len(forecasts)}/{total} produtos")
        return forecasts

    def _forecast_by_category_xgboost_only(
        self,
        product_forecasts: List[ProductForecast],
        products: List[Dict],
        historical_data: Dict[str, pd.DataFrame]
    ) -> List[CategoryForecast]:
        """
        Gera forecasts de categoria agregando os forecasts XGBoost dos produtos.
        Usado quando Prophet está desativado (dados mensais/esparsos).
        Mais rápido e consistente: soma dos produtos = forecast da categoria.
        """
        import time
        cat_start = time.time()
        
        logger.info("🏷️ Gerando forecast por categoria (XGBoost agregado)...")
        
        # 1. Agrupar product_forecasts por categoria
        categories = {}
        for pf in product_forecasts:
            cat = pf.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(pf)
        
        category_forecasts = []
        
        for cat_name, cat_pfs in categories.items():
            logger.info(f"  🏷️  Categoria: {cat_name} ({len(cat_pfs)} produtos)")
            
            try:
                # 2. Agregar historical_data (somar vendas por data)
                historical_dfs = []
                for pf in cat_pfs:
                    # Converter HistoricalDataPoint para DataFrame
                    hist_data = [{"ds": pd.to_datetime(h.date), "y": h.quantity} for h in pf.historical_data]
                    if hist_data:
                        historical_dfs.append(pd.DataFrame(hist_data))
                
                if historical_dfs:
                    aggregated_hist_df = pd.concat(historical_dfs).groupby('ds').sum().reset_index()
                    aggregated_historical = [
                        HistoricalDataPoint(
                            date=row['ds'].isoformat(),
                            quantity=float(row['y'])
                        )
                        for _, row in aggregated_hist_df.tail(30).iterrows()
                    ]
                else:
                    aggregated_historical = []
                
                # 3. Agregar forecasts 30d, 60d, 90d (somar por data)
                def aggregate_forecasts(forecast_list_of_lists):
                    """Agrega forecasts de múltiplos produtos por data."""
                    all_points = []
                    for pf in cat_pfs:
                        for forecast_list in [forecast_list_of_lists(pf)]:
                            for fp in forecast_list:
                                all_points.append({
                                    'date': fp.date,
                                    'predicted_quantity': fp.predicted_quantity,
                                    'lower_bound': fp.lower_bound,
                                    'upper_bound': fp.upper_bound
                                })
                    
                    if not all_points:
                        return []
                    
                    # Converter para DataFrame e agregar por data
                    df = pd.DataFrame(all_points)
                    df['date'] = pd.to_datetime(df['date'])
                    aggregated = df.groupby('date').agg({
                        'predicted_quantity': 'sum',
                        'lower_bound': 'sum',
                        'upper_bound': 'sum'
                    }).reset_index()
                    
                    # Converter de volta para ForecastDataPoint
                    return [
                        ForecastDataPoint(
                            date=row['date'].isoformat(),
                            predicted_quantity=float(row['predicted_quantity']),
                            lower_bound=float(row['lower_bound']),
                            upper_bound=float(row['upper_bound'])
                        )
                        for _, row in aggregated.iterrows()
                    ]
                
                forecast_30d = aggregate_forecasts(lambda pf: pf.forecast_30d)
                forecast_60d = aggregate_forecasts(lambda pf: pf.forecast_60d)
                forecast_90d = aggregate_forecasts(lambda pf: pf.forecast_90d)
                
                # 4. Calcular metrics agregadas (média ponderada por número de pontos)
                total_mape = sum(pf.metrics.mape or 0 for pf in cat_pfs if pf.metrics.mape is not None)
                total_mae = sum(pf.metrics.mae or 0 for pf in cat_pfs if pf.metrics.mae is not None)
                total_rmse = sum(pf.metrics.rmse or 0 for pf in cat_pfs if pf.metrics.rmse is not None)
                count = len(cat_pfs)
                
                metrics = ForecastMetrics(
                    mape=total_mape / count if count > 0 else 0.0,
                    rmse=total_rmse / count if count > 0 else 0.0,
                    mae=total_mae / count if count > 0 else 0.0,
                    trend="stable",
                    seasonality_strength=0.0
                )
                
                logger.info(f"    ✓ [{cat_name}] forecast agregado: 30d={len(forecast_30d)}, 60d={len(forecast_60d)}, 90d={len(forecast_90d)}")
                
                category_forecasts.append(CategoryForecast(
                    category=cat_name,
                    product_count=len(cat_pfs),
                    historical_data=aggregated_historical,
                    forecast_30d=forecast_30d,
                    forecast_60d=forecast_60d,
                    forecast_90d=forecast_90d,
                    metrics=metrics
                ))
                
            except Exception as e:
                logger.error(f"    ✗ [{cat_name}] erro ao agregar: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        cat_sec = time.time() - cat_start
        logger.info(f"[Forecast] Categorias XGBoost agregadas: {cat_sec:.1f}s ({len(category_forecasts)} categorias)")
        
        return category_forecasts

    def _forecast_single_category(
        self,
        category: str,
        cat_products: List[Dict],
        historical_data: Dict[str, pd.DataFrame],
        forecast_days: List[int]
    ) -> Optional[CategoryForecast]:
        """
        Gera forecast para UMA categoria (para rodar em paralelo via ThreadPoolExecutor).
        """
        # Silenciar warnings do Prophet/Stan
        import logging
        logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
        logging.getLogger("prophet").setLevel(logging.ERROR)
        
        try:
            # Agregar dados históricos
            aggregated_df = self._aggregate_historical_data(
                cat_products,
                historical_data
            )
            
            if aggregated_df.empty:
                return None

            if len(aggregated_df) < self.MIN_POINTS:
                logger.warning(
                    f"  ⚠️  Categoria {category}: poucos dados agregados ({len(aggregated_df)} pontos, mínimo {self.MIN_POINTS}), pulando"
                )
                return None

            # Treinar Prophet
            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=True,
                daily_seasonality=False,
                interval_width=0.8,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
            )
            try:
                model.add_country_holidays(country_name="BR")
            except Exception:
                pass

            model.fit(aggregated_df)
            
            # Gerar forecasts
            max_days = max(forecast_days)
            future = model.make_future_dataframe(periods=max_days)
            forecast_result = model.predict(future)
            
            # Extrair dados
            historical = [
                HistoricalDataPoint(
                    date=row['ds'].isoformat(),
                    quantity=float(row['y'])
                )
                for _, row in aggregated_df.tail(30).iterrows()
            ]
            
            forecast_30d = self._extract_forecast_period(forecast_result, aggregated_df, 30)
            forecast_60d = self._extract_forecast_period(forecast_result, aggregated_df, 60)
            forecast_90d = self._extract_forecast_period(forecast_result, aggregated_df, 90)

            def _to_dict_list_fc(pts):
                return [
                    {"date": p.date, "predicted_quantity": p.predicted_quantity, "lower_bound": p.lower_bound, "upper_bound": p.upper_bound}
                    for p in pts
                ]

            # === CLAMP diário antes de agregar ===
            forecast_30d_dict = self._clamp_daily_forecasts(_to_dict_list_fc(forecast_30d), aggregated_df)
            forecast_60d_dict = self._clamp_daily_forecasts(_to_dict_list_fc(forecast_60d), aggregated_df)
            forecast_90d_dict = self._clamp_daily_forecasts(_to_dict_list_fc(forecast_90d), aggregated_df)

            # Se dados agregados são mensais, agregar previsões diárias em mensais
            if self._is_historical_monthly(aggregated_df):
                forecast_30d_agg = self._aggregate_daily_to_monthly(forecast_30d_dict)
                forecast_60d_agg = self._aggregate_daily_to_monthly(forecast_60d_dict)
                forecast_90d_agg = self._aggregate_daily_to_monthly(forecast_90d_dict)

                # === CLAMP mensal pós-agregação ===
                forecast_30d_agg = self._clamp_monthly_forecasts(forecast_30d_agg, aggregated_df)
                forecast_60d_agg = self._clamp_monthly_forecasts(forecast_60d_agg, aggregated_df)
                forecast_90d_agg = self._clamp_monthly_forecasts(forecast_90d_agg, aggregated_df)

                forecast_30d = [ForecastDataPoint(**d) for d in forecast_30d_agg]
                forecast_60d = [ForecastDataPoint(**d) for d in forecast_60d_agg]
                forecast_90d = [ForecastDataPoint(**d) for d in forecast_90d_agg]
                logger.debug(f"  [{category}] Previsões agregadas para mensal (categoria)")
            
            # Calcular métricas
            metrics = self._calculate_metrics(aggregated_df, forecast_result, {"seasonality": "year-round"})
            
            return CategoryForecast(
                category=category,
                product_count=len(cat_products),
                historical_data=historical,
                forecast_30d=forecast_30d,
                forecast_60d=forecast_60d,
                forecast_90d=forecast_90d,
                metrics=metrics
            )
        except Exception as e:
            logger.error(f"  ✗ Erro ao processar categoria {category}: {e}")
            return None

    def _forecast_by_category(
        self,
        products: List[Dict],
        historical_data: Dict[str, pd.DataFrame],
        forecast_days: List[int]
    ) -> List[CategoryForecast]:
        """
        Gera forecast agregado por categoria (PARALELO com ThreadPoolExecutor)
        """
        # Agrupar produtos por categoria
        categories = {}
        for product in products:
            category = product.get("refined_category", "Sem Categoria")
            if category not in categories:
                categories[category] = []
            categories[category].append(product)
        
        if not categories:
            return []
        
        # Paralelizar usando ThreadPoolExecutor (mesmo padrão dos produtos)
        total_categories = len(categories)
        max_workers = min(8, total_categories)
        
        logger.info(f"🔮 Gerando forecast para {total_categories} categorias (PARALELO)...")
        logger.info(f"⚡ Usando {max_workers} workers paralelos")
        
        forecasts = []
        completed = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submeter todas as categorias para processamento paralelo
            future_to_category = {
                executor.submit(
                    self._forecast_single_category,
                    category,
                    cat_products,
                    historical_data,
                    forecast_days
                ): category
                for category, cat_products in categories.items()
            }
            
            # Coletar resultados conforme completam
            for future in as_completed(future_to_category):
                category_name = future_to_category[future]
                completed += 1
                try:
                    result = future.result()
                    if result is not None:
                        forecasts.append(result)
                        logger.info(f"  ✓ [{completed}/{total_categories}] {category_name}: forecast gerado")
                    else:
                        logger.warning(f"  ✗ [{completed}/{total_categories}] {category_name}: pulado (dados insuficientes)")
                except Exception as e:
                    logger.error(f"  ✗ [{completed}/{total_categories}] {category_name}: erro - {str(e)}")
        
        logger.info(f"✅ Forecast categorias concluído: {len(forecasts)}/{total_categories} categorias processadas")
        
        return forecasts
    
    def _aggregate_historical_data(
        self,
        products: List[Dict],
        historical_data: Dict[str, pd.DataFrame]
    ) -> pd.DataFrame:
        """Agrega dados históricos de múltiplos produtos"""
        dfs = []
        
        for product in products:
            product_id = product["id"]
            if product_id in historical_data:
                dfs.append(historical_data[product_id])
        
        if not dfs:
            return pd.DataFrame()
        
        # Somar quantidades por data
        aggregated = pd.concat(dfs).groupby('ds').sum().reset_index()
        return aggregated
    
    def _extract_forecast_period(
        self,
        forecast: pd.DataFrame,
        historical: pd.DataFrame,
        days: int
    ) -> List[ForecastDataPoint]:
        """Extrai período específico do forecast"""
        last_historical_date = historical['ds'].max()

        # Garantir que ambos são timezone-naive para comparação
        if hasattr(last_historical_date, "tzinfo") and last_historical_date.tzinfo is not None:
            last_historical_date = last_historical_date.replace(tzinfo=None)
        ds_series = forecast["ds"]
        if hasattr(ds_series.dt, "tz") and ds_series.dt.tz is not None:
            forecast = forecast.copy()
            forecast["ds"] = forecast["ds"].apply(
                lambda x: x.replace(tzinfo=None) if getattr(x, "tzinfo", None) else x
            )

        logger.debug(
            f"  _extract_forecast_period: last_date={last_historical_date} (type={type(last_historical_date).__name__}), "
            f"forecast ds range={forecast['ds'].min()} to {forecast['ds'].max()}, filtering for {days} days"
        )
        future_data = forecast[forecast['ds'] > last_historical_date]
        logger.debug(
            f"  _extract_forecast_period: {len(future_data)} linhas futuras encontradas (pedido: {days})"
        )
        forecast_period = future_data.head(days)

        return [
            ForecastDataPoint(
                date=row['ds'].isoformat(),
                predicted_quantity=float(max(0, row['yhat'])),
                lower_bound=float(max(0, row['yhat_lower'])),
                upper_bound=float(max(0, row['yhat_upper']))
            )
            for _, row in forecast_period.iterrows()
        ]
    
    def _calculate_metrics(
        self,
        historical: pd.DataFrame,
        forecast: pd.DataFrame,
        product: Dict
    ) -> ForecastMetrics:
        """Calcula métricas do forecast"""
        # Detectar tendência
        trend_values = forecast["trend"].tail(30).values
        if trend_values[-1] > trend_values[0] * 1.1:
            trend = "increasing"
        elif trend_values[-1] < trend_values[0] * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"

        # Força da sazonalidade
        seasonality = product.get("seasonality", "year-round")
        if "seasonal" in str(seasonality).lower():
            seasonality_strength = 0.7
        elif "peak" in str(seasonality).lower():
            seasonality_strength = 0.5
        else:
            seasonality_strength = 0.2

        # Métricas de acurácia via backtesting (ajustado para dados mensais: mínimo 20 pontos)
        MIN_POINTS_FOR_BACKTESTING = 20  # Aceita dados mensais (ex: 20 meses)
        mape_val, mae_val = None, None
        accuracy_level_val, sample_size_val = None, None
        if len(historical) >= MIN_POINTS_FOR_BACKTESTING:
            # Backtesting proporcional ao tamanho dos dados
            # Para 20 pontos mensais: últimos 6 meses para validação (25% ou mínimo 6)
            validation_size = max(6, len(historical) // 4)
            train_df = historical.iloc[:-validation_size].copy()
            validation_df = historical.iloc[-validation_size:].copy()
            logger.info(
                f"📊 Backtesting: {len(train_df)} treino, {len(validation_df)} validação"
            )
            validation_model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=len(train_df) >= 14,
                daily_seasonality=False,
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
            )
            try:
                validation_model.add_country_holidays(country_name="BR")
            except Exception:
                pass
            validation_model.fit(train_df)
            future_ds = validation_df[["ds"]].copy()
            validation_forecast = validation_model.predict(future_ds)
            validation_actual = validation_df.set_index("ds")["y"]
            validation_pred = validation_forecast.set_index("ds")["yhat"]
            acc = calculate_forecast_metrics(validation_actual, validation_pred)
            mape_val = acc.get("mape")
            mae_val = acc.get("mae")
            accuracy_level_val = acc.get("accuracy_level")
            sample_size_val = acc.get("sample_size")
        else:
            accuracy_level_val = "insufficient_data"
            sample_size_val = len(historical)

        return ForecastMetrics(
            mape=mape_val,
            rmse=None,
            mae=mae_val,
            trend=trend,
            seasonality_strength=seasonality_strength,
            accuracy_level=accuracy_level_val,
            sample_size=sample_size_val,
        )
    
    def _calculate_and_persist_avg_daily_demand(
        self,
        product_forecasts: List[ProductForecast],
        sales_df: pd.DataFrame
    ):
        """
        Calcula avg_daily_demand a partir dos forecasts gerados e persiste no Supabase.
        
        Args:
            product_forecasts: Lista de forecasts por produto
            sales_df: DataFrame com histórico de vendas (para determinar se é mensal/diário)
        """
        updates = []
        
        for pf in product_forecasts:
            try:
                # Usar forecast_90d para calcular avg_daily_demand (horizonte mais longo)
                forecast_data = pf.forecast_90d or pf.forecast_60d or pf.forecast_30d
                
                if not forecast_data:
                    logger.warning(f"⚠️  Sem dados de forecast para {pf.product_name}, pulando avg_daily_demand")
                    continue
                
                # Converter para DataFrame
                forecast_df = pd.DataFrame([
                    {"date": fp.date, "predicted_quantity": fp.predicted_quantity}
                    for fp in forecast_data
                ])
                
                if forecast_df.empty:
                    continue
                
                # Determinar se o forecast é diário ou mensal pela frequência das datas
                forecast_df['date'] = pd.to_datetime(forecast_df['date'])
                forecast_df = forecast_df.sort_values('date')
                
                dates = forecast_df['date']
                if len(dates) > 1:
                    avg_gap = (dates.iloc[-1] - dates.iloc[0]).days / max(len(dates) - 1, 1)
                    is_monthly = avg_gap > 15  # gap médio > 15 dias = mensal
                else:
                    is_monthly = False
                
                total_predicted = forecast_df['predicted_quantity'].sum()
                
                if is_monthly:
                    # Para forecast mensal: total previsto / dias no período
                    total_days = (dates.iloc[-1] - dates.iloc[0]).days + 30  # +30 para incluir último mês
                    avg_daily = total_predicted / max(total_days, 1)
                else:
                    # Para forecast diário: total previsto / número de dias
                    total_days = (dates.iloc[-1] - dates.iloc[0]).days + 1
                    avg_daily = total_predicted / max(total_days, 1)
                
                # Garantir que não seja negativo
                avg_daily = max(avg_daily, 0)
                
                # Arredondar para 4 casas decimais
                avg_daily = round(float(avg_daily), 4)
                
                updates.append({
                    "id": pf.product_id,
                    "avg_daily_demand": avg_daily
                })
                
                logger.info(f"  {pf.product_name}: avg_daily_demand = {avg_daily:.4f} un/dia")
                
            except Exception as e:
                logger.error(f"❌ Erro ao calcular avg_daily_demand para {pf.product_name}: {e}")
                continue
        
        # Persistir no Supabase (batch update)
        if updates:
            try:
                logger.info(f"💾 Persistindo avg_daily_demand para {len(updates)} produtos...")
                
                for update in updates:
                    self.supabase.table("products").update({
                        "avg_daily_demand": update["avg_daily_demand"]
                    }).eq("id", update["id"]).execute()
                
                logger.info(f"✅ avg_daily_demand persistido: {len(updates)} produtos")
                
            except Exception as e:
                logger.error(f"❌ Erro ao persistir avg_daily_demand: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            logger.warning("⚠️ Nenhum avg_daily_demand calculado")
    
    def _generate_recommendations(
        self,
        product: Dict,
        forecast_30d: List[ForecastDataPoint],
        metrics: ForecastMetrics
    ) -> ForecastRecommendations:
        """Gera recomendações baseadas no forecast"""
        # Calcular demanda total nos próximos 30 dias
        total_demand = sum(f.predicted_quantity for f in forecast_30d)
        
        # Estoque atual
        current_stock = product.get("quantity", 10)
        
        # Se demanda > estoque, recomendar reabastecimento
        if total_demand > current_stock * 1.5:
            suggested_quantity = int(total_demand * 1.2)  # 20% buffer
            restock_date = (datetime.now() + timedelta(days=7)).isoformat()
            confidence = 0.8
            reasoning = (
                f"Demanda prevista ({int(total_demand)} unidades) excede "
                f"estoque atual ({current_stock}). Recomendo reabastecer "
                f"{suggested_quantity} unidades até {restock_date[:10]}."
            )
        else:
            suggested_quantity = 0
            restock_date = None
            confidence = 0.6
            reasoning = (
                f"Estoque atual ({current_stock}) é suficiente para "
                f"demanda prevista ({int(total_demand)}). "
                f"Não é necessário reabastecer no momento."
            )
        
        return ForecastRecommendations(
            restock_date=restock_date,
            suggested_quantity=suggested_quantity,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def _fetch_sales_history(self, product_ids: List[str]) -> pd.DataFrame:
        """
        Busca histórico de vendas real do Supabase.

        Args:
            product_ids: Lista de IDs de produtos

        Returns:
            DataFrame com colunas: product_id, ds (date), y (quantity)
        """
        if not product_ids:
            return pd.DataFrame()

        logger.info(f"📥 Buscando histórico de vendas para {len(product_ids)} produtos")

        try:
            response = (
                self.supabase.table("sales_history")
                .select("product_id, date, quantity")
                .in_("product_id", product_ids)
                .order("date", desc=False)
                .execute()
            )

            if not response.data:
                logger.warning("Nenhum dado encontrado em sales_history")
                return pd.DataFrame()

            df = pd.DataFrame(response.data)
            df = df.rename(columns={"date": "ds", "quantity": "y"})
            df["ds"] = pd.to_datetime(df["ds"])
            df["y"] = pd.to_numeric(df["y"], errors="coerce")
            df = df.dropna(subset=["ds", "y"])

            logger.info(f"✅ {len(df)} linhas de histórico carregadas")
            logger.info(f"   Período: {df['ds'].min()} a {df['ds'].max()}")
            logger.info(f"   Produtos: {df['product_id'].nunique()}")

            return df

        except Exception as e:
            logger.error(f"Erro ao buscar sales_history: {e}")
            return pd.DataFrame()

    def _fetch_xgboost_forecasts(self, product_id: str) -> List[Dict]:
        """
        Busca forecasts XGBoost salvos em forecasts_xgboost.
        Retorna lista ordenada por data.
        XGBoost gera 3 pontos (30, 60, 90 dias) - não diários.
        """
        try:
            product_id_str = str(product_id)
            response = (
                self.supabase.table("forecasts_xgboost")
                .select("forecast_date, predicted_quantity, lower_bound, upper_bound")
                .eq("product_id", product_id_str)
                .order("forecast_date")
                .execute()
            )

            data = response.data if hasattr(response, "data") else []
            if not data:
                return []

            result = [
                {
                    "date": str(row.get("forecast_date", ""))[:10] if row.get("forecast_date") else "",
                    "predicted_quantity": float(row.get("predicted_quantity") or 0),
                    "lower_bound": float(row.get("lower_bound") or row.get("predicted_quantity", 0) * 0.8),
                    "upper_bound": float(row.get("upper_bound") or row.get("predicted_quantity", 0) * 1.2),
                }
                for row in data
            ]
            return result
        except Exception as e:
            logger.warning(f"Erro ao buscar XGBoost para {product_id}: {e}")
            return []

    def _fetch_xgboost_metrics(self, product_id: str) -> Optional[Dict]:
        """
        Busca métricas XGBoost de model_metadata.
        """
        try:
            response = (
                self.supabase.table("model_metadata")
                .select("mape, mae")
                .eq("product_id", str(product_id))
                .eq("model_type", "xgboost")
                .limit(1)
                .execute()
            )

            if not response.data:
                return None

            row = response.data[0]
            return {
                "mape": float(row["mape"]) if row.get("mape") is not None else None,
                "mae": float(row["mae"]) if row.get("mae") is not None else None,
            }
        except Exception as e:
            logger.warning(f"Erro ao buscar métricas XGBoost para {product_id}: {e}")
            return None

    def _expand_xgboost_to_daily(
        self,
        xgb_raw: List[Dict],
        last_historical_date: pd.Timestamp,
        horizon: int,
    ) -> List[Dict]:
        """
        Converte os 3 pontos mensais do XGBoost em pontos diários.
        Cada ponto XGBoost representa demanda total do período (30 dias).
        Distribui uniformemente para alinhar com formato Prophet (diário).
        """
        if not xgb_raw or horizon <= 0:
            return []

        days_per_bucket = 30
        result = []
        start = pd.Timestamp(last_historical_date) + timedelta(days=1)

        for i in range(horizon):
            bucket_idx = min(i // days_per_bucket, len(xgb_raw) - 1)
            point = xgb_raw[bucket_idx]
            pred = point["predicted_quantity"]
            lb = point.get("lower_bound", pred * 0.8)
            ub = point.get("upper_bound", pred * 1.2)
            daily_pred = pred / days_per_bucket
            daily_lb = lb / days_per_bucket
            daily_ub = ub / days_per_bucket
            d = start + timedelta(days=i)
            result.append({
                "date": d.strftime("%Y-%m-%d"),
                "predicted_quantity": daily_pred,
                "lower_bound": daily_lb,
                "upper_bound": daily_ub,
            })

        return result

    def _select_best_forecast(
        self,
        prophet_forecast: List[Dict],
        xgboost_forecast: List[Dict],
        prophet_mape: Optional[float],
        xgboost_mape: Optional[float],
        horizon: int,
        product_name: str = "",
    ) -> List[Dict]:
        """
        Usa Model Router para escolher melhor forecast.
        Retorna no formato esperado: [{'date': '...', 'predicted_quantity': N, 'lower_bound': N, 'upper_bound': N}]
        Fallback para XGBoost se Prophet não rodou.
        """
        try:
            # Se Prophet não rodou (toggle desativado), usar APENAS XGBoost
            if not prophet_forecast or len(prophet_forecast) == 0:
                if xgboost_forecast and len(xgboost_forecast) > 0:
                    logger.debug(f"  [{product_name}] {horizon}d: XGBoost (Prophet não executado)")
                    return self._xgboost_to_prophet_format(xgboost_forecast) if isinstance(xgboost_forecast[0], dict) and 'date' in xgboost_forecast[0] else xgboost_forecast
                else:
                    logger.warning(f"  [{product_name}] {horizon}d: SEM FORECAST (nem Prophet nem XGBoost)")
                    return []
            
            # Quando histórico é mensal e horizonte > 30d, usar só XGBoost
            # (Prophet gera diário com poucos dados mensais e explode ao reagregar)
            if hasattr(self, '_current_df_is_monthly') and self._current_df_is_monthly and horizon in [60, 90]:
                if xgboost_forecast and any(p.get("predicted_quantity", 0) > 0 for p in xgboost_forecast):
                    logger.info(f"  [{product_name}] Histórico mensal + horizonte {horizon}d → usando só XGBoost")
                    return self._xgboost_to_prophet_format(xgboost_forecast) if isinstance(xgboost_forecast[0], dict) and 'date' in xgboost_forecast[0] else xgboost_forecast

            # Se não tem XGBoost, usar Prophet
            if not xgboost_forecast or xgboost_mape is None:
                if prophet_forecast:
                    logger.debug(f"  [{product_name}] {horizon}d: Prophet (sem XGBoost)")
                return prophet_forecast

            # Se não tem Prophet (mas passou pela primeira verificação), usar XGBoost
            if prophet_mape is None:
                logger.debug(f"  [{product_name}] {horizon}d: XGBoost (Prophet sem métricas)")
                return self._xgboost_to_prophet_format(xgboost_forecast)

            # Usar Model Router (time_horizon deve ser 30, 60 ou 90)
            th = 30 if horizon <= 45 else (60 if horizon <= 75 else 90)
            selection = model_router.select_model(
                xgboost_mape=xgboost_mape,
                prophet_mape=prophet_mape,
                time_horizon=th,
                context="forecast",
            )

            if selection.model == "xgboost":
                logger.info(f"  [{product_name}] {horizon}d: XGBoost ({selection.reason})")
                return self._xgboost_to_prophet_format(xgboost_forecast)
            elif selection.model == "prophet":
                logger.info(f"  [{product_name}] {horizon}d: Prophet ({selection.reason})")
                return prophet_forecast
            elif selection.model == "ensemble":
                logger.info(f"  [{product_name}] {horizon}d: Ensemble ({selection.reason})")
                return self._calculate_ensemble(
                    prophet_forecast,
                    xgboost_forecast,
                    selection.weights or {"xgboost": 0.5, "prophet": 0.5},
                )
            else:
                return prophet_forecast
        except Exception as e:
            logger.warning(f"Model Router erro para {product_name} {horizon}d: {e}, fallback seguro")
            # Fallback: usar o que tiver valores não-zero
            if xgboost_forecast and any(p.get("predicted_quantity", 0) > 0 for p in xgboost_forecast):
                return xgboost_forecast
            return prophet_forecast

    def _validate_forecast_values(
        self,
        forecast_data: List[Dict],
        xgb_data: List[Dict],
        product_name: str,
        horizon: int,
        historical_mean: float,
    ) -> List[Dict]:
        """Se forecast selecionado tem valores ~0 mas XGBoost tem valores razoáveis, usar XGBoost."""
        if not forecast_data:
            return xgb_data if xgb_data else forecast_data

        pred_key = "predicted_quantity"
        forecast_mean = (
            sum(p.get(pred_key, 0) for p in forecast_data) / len(forecast_data)
            if forecast_data
            else 0
        )

        if historical_mean > 0 and forecast_mean < historical_mean * 0.01 and xgb_data:
            xgb_mean = (
                sum(p.get(pred_key, 0) for p in xgb_data) / len(xgb_data)
                if xgb_data
                else 0
            )
            if xgb_mean > forecast_mean:
                logger.warning(
                    f"  ⚠️ [{product_name}] {horizon}d: forecast ~0 (média={forecast_mean:.1f}), "
                    f"substituindo por XGBoost (média={xgb_mean:.1f})"
                )
                return xgb_data

        return forecast_data

    def _clamp_daily_forecasts(
        self,
        daily_forecast: List[Dict],
        df: pd.DataFrame,
        max_multiplier: float = 3.0,
    ) -> List[Dict]:
        """
        Limita cada previsão diária a max_multiplier * (máximo diário histórico).
        Se histórico é mensal, estima máximo diário = max_mensal / 30.
        Impede que Prophet gere picos absurdos que explodem ao agregar mensalmente.
        """
        if not daily_forecast or df is None or len(df) < 2:
            return daily_forecast

        hist_values = df["y"].dropna().tolist()
        if not hist_values or max(hist_values) <= 0:
            return daily_forecast

        # Detectar se histórico é mensal ou diário
        avg_gap = 1
        if len(df) >= 2:
            date_range_days = (df["ds"].max() - df["ds"].min()).days
            avg_gap = date_range_days / max(1, len(df) - 1)

        max_hist = max(hist_values)

        if avg_gap > 20:
            # Histórico mensal → estimar máximo diário
            max_daily = max_hist / 30.0
        else:
            max_daily = max_hist

        # Floor mínimo para produtos com histórico muito baixo
        max_daily = max(max_daily, 0.5)
        cap = max_daily * max_multiplier

        clamped = []
        for point in daily_forecast:
            pred = point.get("predicted_quantity", 0)
            clamped_pred = max(0, min(pred, cap))
            ratio = clamped_pred / pred if pred > 0 else 1.0
            clamped.append({
                **point,
                "predicted_quantity": clamped_pred,
                "lower_bound": max(0, point.get("lower_bound", 0) * ratio),
                "upper_bound": max(0, point.get("upper_bound", 0) * ratio),
            })

        return clamped

    def _clamp_monthly_forecasts(
        self,
        monthly_forecast: List[Dict],
        df: pd.DataFrame,
        max_multiplier: float = 2.5,
    ) -> List[Dict]:
        """
        Rede de segurança pós-agregação: nenhum mês pode exceder
        max_multiplier * (máximo mensal histórico).
        """
        if not monthly_forecast or df is None or len(df) < 2:
            return monthly_forecast

        hist_values = df["y"].dropna().tolist()
        if not hist_values or max(hist_values) <= 0:
            return monthly_forecast

        # Detectar se histórico é mensal ou diário
        date_range_days = (df["ds"].max() - df["ds"].min()).days
        avg_gap = date_range_days / max(1, len(df) - 1)

        if avg_gap > 20:
            # Já mensal
            max_monthly = max(hist_values)
        else:
            # Diário → agrupar por mês e pegar máximo
            df_copy = df.copy()
            df_copy["month"] = df_copy["ds"].dt.to_period("M")
            monthly_sums = df_copy.groupby("month")["y"].sum()
            max_monthly = monthly_sums.max() if len(monthly_sums) > 0 else max(hist_values)

        cap = max_monthly * max_multiplier

        clamped = []
        for point in monthly_forecast:
            pred = point.get("predicted_quantity", 0)
            if pred > cap and cap > 0:
                ratio = cap / pred
                clamped.append({
                    **point,
                    "predicted_quantity": cap,
                    "lower_bound": point.get("lower_bound", 0) * ratio,
                    "upper_bound": point.get("upper_bound", 0) * ratio,
                })
            else:
                clamped.append(point)

        return clamped

    def _should_use_prophet(self, sales_df: pd.DataFrame) -> dict:
        """
        Decide se Prophet deve ser executado baseado na qualidade/frequência dos dados.
        
        Prophet precisa de:
        - Dados frequentes (diários ou semanais, não mensais)
        - Volume mínimo de pontos (>= 90 para capturar sazonalidade)
        
        Returns:
            {
                'use_prophet': bool,
                'reason': str,
                'data_frequency': str,
                'data_points': int
            }
        """
        if sales_df is None or len(sales_df) == 0:
            return {
                'use_prophet': False,
                'reason': 'Sem dados de vendas',
                'data_frequency': 'unknown',
                'data_points': 0
            }
        
        data_points = len(sales_df)
        
        # Detectar se dados são mensais
        if self._is_historical_monthly(sales_df):
            return {
                'use_prophet': False,
                'reason': f'Dados mensais ({data_points} pontos). Prophet otimizado para dados diários. Usando apenas XGBoost.',
                'data_frequency': 'monthly',
                'data_points': data_points
            }
        
        # Calcular gap médio entre pontos
        date_range_days = (sales_df['ds'].max() - sales_df['ds'].min()).days
        avg_gap = date_range_days / max(1, data_points - 1)
        
        if avg_gap <= 2:
            frequency = 'daily'
        elif avg_gap <= 10:
            frequency = 'weekly'
        else:
            frequency = 'sparse'
        
        # Prophet precisa de >= 90 pontos E dados frequentes para sazonalidade
        min_points = 90
        use_prophet = data_points >= min_points and frequency in ('daily', 'weekly')
        
        if not use_prophet:
            reason = f'Dados insuficientes para Prophet ({data_points} pontos {frequency}, mínimo {min_points} diários/semanais). Usando apenas XGBoost.'
        else:
            reason = f'Dados adequados para Prophet ({data_points} pontos {frequency}). Rodando Prophet + XGBoost para melhor acurácia.'
        
        return {
            'use_prophet': use_prophet,
            'reason': reason,
            'data_frequency': frequency,
            'data_points': data_points
        }

    def _is_historical_monthly(self, df: pd.DataFrame) -> bool:
        """
        Detecta se dados históricos são mensais (poucos pontos, intervalo grande entre datas).
        Usado para agregar previsões diárias em mensais e manter mesma escala no gráfico.
        """
        if df is None or len(df) < 2:
            return False
        date_range_days = (df["ds"].max() - df["ds"].min()).days
        n_points = len(df)
        # Média de dias entre pontos consecutivos
        avg_gap = date_range_days / max(1, n_points - 1)
        # Se intervalo médio > 25 dias e poucos pontos, tratar como mensal
        is_monthly = avg_gap > 25 and n_points <= 36
        if is_monthly:
            logger.debug(
                f"  Dados históricos detectados como mensais: {n_points} pts, "
                f"range {date_range_days}d, avg_gap={avg_gap:.0f}d"
            )
        return is_monthly

    def _aggregate_daily_to_monthly(
        self, daily_forecast: List[Dict]
    ) -> List[Dict]:
        """
        Agregar previsões diárias em mensais para consistência com dados históricos mensais.
        Retorna lista de dicts no mesmo formato (date, predicted_quantity, lower_bound, upper_bound).
        """
        if not daily_forecast:
            return daily_forecast

        monthly = defaultdict(
            lambda: {"sum": 0.0, "count": 0, "lower_sum": 0.0, "upper_sum": 0.0}
        )
        for point in daily_forecast:
            date_str = point.get("date", "")[:10]
            if len(date_str) < 7:
                continue
            month_key = date_str[:7]  # "2026-01"
            pred = point.get("predicted_quantity", 0)
            lb = point.get("lower_bound", pred * 0.8)
            ub = point.get("upper_bound", pred * 1.2)
            monthly[month_key]["sum"] += pred
            monthly[month_key]["count"] += 1
            monthly[month_key]["lower_sum"] += lb
            monthly[month_key]["upper_sum"] += ub

        result = []
        for month_key in sorted(monthly.keys()):
            m = monthly[month_key]
            if m["count"] == 0:
                continue
            year, month = int(month_key[:4]), int(month_key[5:7])
            last_day = monthrange(year, month)[1]
            date_str = f"{month_key}-{last_day:02d}"
            result.append({
                "date": date_str,
                "predicted_quantity": m["sum"],
                "lower_bound": m["lower_sum"],
                "upper_bound": m["upper_sum"],
            })
        return result

    def _xgboost_to_prophet_format(self, xgb_forecast: List[Dict]) -> List[Dict]:
        """
        Converte formato XGBoost para formato Prophet (garante bounds).
        """
        result = []
        for point in xgb_forecast:
            pred = point["predicted_quantity"]
            result.append({
                "date": point["date"],
                "predicted_quantity": pred,
                "lower_bound": point.get("lower_bound", pred * 0.8),
                "upper_bound": point.get("upper_bound", pred * 1.2),
            })
        return result

    def _calculate_ensemble(
        self,
        prophet_forecast: List[Dict],
        xgboost_forecast: List[Dict],
        weights: Dict[str, float],
    ) -> List[Dict]:
        """
        Ensemble adaptativo: pondera Prophet e XGBoost ponto a ponto.
        Quando Prophet diverge muito (ex.: ~0 em meses futuros), reduz peso do Prophet
        para evitar puxar a previsão para baixo.
        """
        prophet_weight = weights.get("prophet", 0.5)
        xgboost_weight = weights.get("xgboost", 0.5)
        total = prophet_weight + xgboost_weight
        prophet_weight /= total
        xgboost_weight /= total

        result = []
        min_len = min(len(prophet_forecast), len(xgboost_forecast))

        for i in range(min_len):
            prophet_point = prophet_forecast[i]
            xgboost_point = xgboost_forecast[i]
            p_val = prophet_point["predicted_quantity"]
            x_val = xgboost_point["predicted_quantity"]

            # Ensemble adaptativo: se Prophet diverge muito do XGBoost, reduzir peso do Prophet
            if x_val > 0:
                ratio = p_val / x_val
                if ratio < 0.1 or ratio > 10:
                    effective_prophet_weight = 0.1
                    effective_xgboost_weight = 0.9
                    logger.debug(
                        f"  Ensemble adaptativo ponto {i}: Prophet/XGBoost ratio={ratio:.1f}, usando 90% XGBoost"
                    )
                elif ratio < 0.3 or ratio > 3:
                    effective_prophet_weight = 0.25
                    effective_xgboost_weight = 0.75
                else:
                    effective_prophet_weight = prophet_weight
                    effective_xgboost_weight = xgboost_weight
            else:
                effective_prophet_weight = prophet_weight
                effective_xgboost_weight = xgboost_weight

            ensemble_pred = p_val * effective_prophet_weight + x_val * effective_xgboost_weight
            ensemble_lb = (
                prophet_point.get("lower_bound", p_val * 0.8) * effective_prophet_weight
                + xgboost_point.get("lower_bound", x_val * 0.8) * effective_xgboost_weight
            )
            ensemble_ub = (
                prophet_point.get("upper_bound", p_val * 1.2) * effective_prophet_weight
                + xgboost_point.get("upper_bound", x_val * 1.2) * effective_xgboost_weight
            )

            result.append({
                "date": prophet_point["date"],
                "predicted_quantity": max(0.0, ensemble_pred),
                "lower_bound": max(0.0, ensemble_lb),
                "upper_bound": max(0.0, ensemble_ub),
            })

        return result

    # Constantes de validação (aceitam dados mensais: 12 meses = 1 ano)
    MIN_POINTS = 12  # mínimo de pontos (ex.: 12 meses)
    MIN_DAYS = 180   # range mínimo em dias (~6 meses)

    def _validate_sales_data(self, df: pd.DataFrame) -> bool:
        """
        Valida se dados de vendas são adequados para Prophet.

        Critérios ajustados para aceitar dados mensais:
        - Mínimo 12 pontos (ex.: 1 ano de dados mensais)
        - Range mínimo 180 dias (~6 meses)
        - Sem valores negativos
        """
        if df is None or df.empty or len(df) < self.MIN_POINTS:
            logger.warning(
                f"Poucos dados: {len(df) if df is not None else 0} pontos (mínimo: {self.MIN_POINTS})"
            )
            return False

        date_range = (df["ds"].max() - df["ds"].min()).days
        if date_range < self.MIN_DAYS:
            logger.warning(
                f"Range de datas muito pequeno: {date_range} dias (mínimo: {self.MIN_DAYS})"
            )
            return False

        if (df["y"] < 0).any():
            logger.warning("Dados contêm valores negativos")
            return False

        logger.info(f"✅ Dados válidos: {len(df)} pontos, {date_range} dias de range")
        return True

    def _sales_to_historical_dict(
        self, sales_df: pd.DataFrame, product_ids: List[str]
    ) -> Dict[str, pd.DataFrame]:
        """
        Converte DataFrame de sales_history (product_id, ds, y) em
        Dict[product_id, DataFrame com ds, y] apenas para produtos
        que passam em _validate_sales_data.
        """
        historical_data: Dict[str, pd.DataFrame] = {}
        for pid in product_ids:
            product_df = sales_df[sales_df["product_id"] == pid][["ds", "y"]].copy()
            if product_df.empty:
                continue
            product_df = product_df.sort_values("ds").reset_index(drop=True)
            if self._validate_sales_data(product_df):
                historical_data[pid] = product_df
            else:
                logger.warning(f"Produto {pid}: dados insuficientes ou inválidos, pulando")

        return historical_data

    async def _fetch_products(self, analysis_id: str) -> List[Dict]:
        """Busca produtos do Supabase"""
        result = self.supabase.table("products") \
            .select("*") \
            .eq("analysis_id", analysis_id) \
            .execute()
        
        return result.data if result.data else []
    
    async def _save_forecast(self, forecast: ForecastResponse):
        """Salva forecast no Supabase"""
        try:
            # TODO: Implementar salvamento no banco
            # Por enquanto apenas log
            logger.info(f"💾 Forecast salvo para análise {forecast.analysis_id}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar forecast: {e}")
    
    async def get_forecast(self, analysis_id: str) -> Optional[Dict]:
        """Busca forecast existente"""
        try:
            # TODO: Implementar busca no banco
            logger.info(f"Buscando forecast para {analysis_id}")
            return None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar forecast: {e}")
            return None

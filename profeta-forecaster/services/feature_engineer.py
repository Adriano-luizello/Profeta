"""
Feature Engineering para XGBoost
Calcula features a partir do histórico de vendas
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List
from loguru import logger


class FeatureEngineer:
    """Calcula features para machine learning."""

    # Feriados importantes no Brasil
    BRAZILIAN_HOLIDAYS = {
        1: False,   # Janeiro
        2: True,    # Fevereiro (Carnaval)
        3: False,
        4: True,    # Abril (Páscoa - variável)
        5: True,    # Maio (Dia das Mães)
        6: True,    # Junho (Dia dos Namorados, Festa Junina)
        7: False,
        8: True,    # Agosto (Dia dos Pais)
        9: False,
        10: True,   # Outubro (Dia das Crianças)
        11: True,   # Novembro (Black Friday)
        12: True,   # Dezembro (Natal)
    }

    PEAK_SEASON_MONTHS = [11, 12]  # Novembro e Dezembro

    def __init__(self):
        """Inicializa o feature engineer."""
        pass

    def calculate_features(
        self,
        historical: pd.DataFrame,
        product: Dict
    ) -> pd.DataFrame:
        """
        Calcula todas as features para um produto.

        Args:
            historical: DataFrame com colunas ['ds', 'y']
            product: Dict com info do produto (category, brand, etc.)

        Returns:
            DataFrame com features calculadas por data
        """
        logger.info(f"🔧 Calculando features para produto {product.get('id', 'unknown')}")

        if len(historical) < 3:
            logger.warning(f"⚠️ Dados insuficientes: {len(historical)} pontos")
            return pd.DataFrame()

        # Criar DataFrame de features
        df = historical.copy()
        df = df.sort_values('ds').reset_index(drop=True)

        # 1. Lag Features
        df = self._add_lag_features(df)

        # 2. Rolling Statistics
        df = self._add_rolling_features(df)

        # 3. Seasonality Features
        df = self._add_seasonality_features(df)

        # 4. Trend Features
        df = self._add_trend_features(df)

        # 5. Product Attributes
        df = self._add_product_attributes(df, product)

        # Remover linhas com NaN (primeiras linhas que não têm lags)
        df_clean = df.dropna()

        logger.info(f"✅ Features calculadas: {len(df_clean)} linhas, {len(df_clean.columns)} colunas")

        return df_clean

    def _add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Adiciona lag features (vendas de meses anteriores)."""
        df['lag_1'] = df['y'].shift(1)   # Mês anterior
        df['lag_3'] = df['y'].shift(3)   # 3 meses atrás
        df['lag_6'] = df['y'].shift(6)   # 6 meses atrás
        df['lag_12'] = df['y'].shift(12) # 12 meses atrás (ano anterior)

        return df

    def _add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Adiciona estatísticas móveis (média, desvio, min, max)."""
        # Média móvel
        df['rolling_mean_3m'] = df['y'].rolling(window=3, min_periods=1).mean()
        df['rolling_mean_6m'] = df['y'].rolling(window=6, min_periods=1).mean()

        # Desvio padrão móvel
        df['rolling_std_3m'] = df['y'].rolling(window=3, min_periods=1).std()

        # Mínimo e máximo móvel
        df['rolling_min_3m'] = df['y'].rolling(window=3, min_periods=1).min()
        df['rolling_max_3m'] = df['y'].rolling(window=3, min_periods=1).max()

        return df

    def _add_seasonality_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Adiciona features de sazonalidade."""
        # Extrair mês e trimestre
        df['month'] = pd.to_datetime(df['ds']).dt.month
        df['quarter'] = pd.to_datetime(df['ds']).dt.quarter

        # Flags de feriados/temporadas
        df['is_holiday'] = df['month'].map(self.BRAZILIAN_HOLIDAYS)
        df['is_peak_season'] = df['month'].isin(self.PEAK_SEASON_MONTHS)

        return df

    def _add_trend_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Adiciona features de tendência."""
        # Tendência linear simples
        df['linear_trend'] = range(len(df))

        # Momentum (diferença entre média recente e antiga)
        recent_mean = df['y'].rolling(window=3, min_periods=1).mean()
        old_mean = df['y'].rolling(window=6, min_periods=1).mean()
        df['momentum'] = recent_mean - old_mean

        return df

    def _add_product_attributes(self, df: pd.DataFrame, product: Dict) -> pd.DataFrame:
        """Adiciona atributos do produto (desnormalizados)."""
        df['category'] = product.get('refined_category', 'Unknown')
        df['brand'] = product.get('attributes', {}).get('brand', 'Unknown')
        df['cluster'] = product.get('attributes', {}).get('cluster', 'Unknown')

        return df

    def prepare_feature_store_data(
        self,
        df: pd.DataFrame,
        product_id: str,
        analysis_id: str
    ) -> List[Dict]:
        """
        Prepara dados no formato para inserir no feature_store.

        Args:
            df: DataFrame com features calculadas
            product_id: ID do produto
            analysis_id: ID da análise

        Returns:
            Lista de dicts prontos para INSERT
        """
        records = []

        for _, row in df.iterrows():
            record = {
                'analysis_id': analysis_id,
                'product_id': product_id,
                'feature_date': row['ds'].strftime('%Y-%m-%d'),

                # Lag features
                'lag_1': float(row['lag_1']) if pd.notna(row['lag_1']) else None,
                'lag_3': float(row['lag_3']) if pd.notna(row['lag_3']) else None,
                'lag_6': float(row['lag_6']) if pd.notna(row['lag_6']) else None,
                'lag_12': float(row['lag_12']) if pd.notna(row['lag_12']) else None,

                # Rolling stats
                'rolling_mean_3m': float(row['rolling_mean_3m']) if pd.notna(row['rolling_mean_3m']) else None,
                'rolling_mean_6m': float(row['rolling_mean_6m']) if pd.notna(row['rolling_mean_6m']) else None,
                'rolling_std_3m': float(row['rolling_std_3m']) if pd.notna(row['rolling_std_3m']) else None,
                'rolling_min_3m': float(row['rolling_min_3m']) if pd.notna(row['rolling_min_3m']) else None,
                'rolling_max_3m': float(row['rolling_max_3m']) if pd.notna(row['rolling_max_3m']) else None,

                # Seasonality
                'month': int(row['month']),
                'quarter': int(row['quarter']),
                'is_holiday': bool(row['is_holiday']),
                'is_peak_season': bool(row['is_peak_season']),

                # Trend
                'linear_trend': float(row['linear_trend']) if pd.notna(row['linear_trend']) else None,
                'momentum': float(row['momentum']) if pd.notna(row['momentum']) else None,

                # Product attributes
                'category': str(row['category']),
                'brand': str(row['brand']),
                'cluster': str(row['cluster']),
            }

            records.append(record)

        logger.info(f"📦 Preparados {len(records)} registros para feature_store")
        return records


# Para testar localmente:
if __name__ == "__main__":
    # Dados de exemplo
    dates = pd.date_range('2024-01-01', periods=20, freq='MS')
    data = pd.DataFrame({
        'ds': dates,
        'y': [100, 120, 110, 150, 200, 180, 160, 140, 130, 150,
              160, 180, 200, 250, 300, 280, 260, 240, 220, 240]
    })

    product = {
        'id': 'test-123',
        'refined_category': 'Test Category',
        'attributes': {'brand': 'Test Brand', 'cluster': 'A'}
    }

    fe = FeatureEngineer()
    features = fe.calculate_features(data, product)

    print("\n📊 Features calculadas:")
    print(features.head(10))
    print(f"\nColunas: {features.columns.tolist()}")

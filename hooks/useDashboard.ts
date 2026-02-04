'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, TimeHorizon } from '@/lib/types/dashboard';

export function useDashboard(analysisId: string, initialPeriod: TimeHorizon = 30) {
  const [period, setPeriod] = useState<TimeHorizon>(initialPeriod);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!analysisId) {
      setError('Analysis ID não fornecido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Usar rota de API do Next (proxy) para evitar CORS e "failed to fetch"
      const response = await fetch(
        `/api/dashboard/${analysisId}?period=${period}`
      );

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        const message =
          errorData.error ||
          errorData.detail ||
          `Erro ao buscar dados do dashboard (${response.status})`;
        throw new Error(message);
      }

      const dashboardData: DashboardData = await response.json();
      setData(dashboardData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro no useDashboard:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [analysisId, period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    period,
    setPeriod,
    data,
    loading,
    error,
    refresh,
  };
}

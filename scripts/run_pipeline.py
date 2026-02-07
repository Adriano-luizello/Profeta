#!/usr/bin/env python3
"""
Script para re-rodar o pipeline e calcular avg_daily_demand
Uso: python scripts/run_pipeline.py [analysis_id]
"""

import os
import sys
import requests
from pathlib import Path

# Adicionar raiz ao path
root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

# Carregar .env
from dotenv import load_dotenv
load_dotenv(root / '.env.local')

from supabase import create_client

def get_latest_analysis():
    """Busca a análise mais recente completada"""
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("❌ Erro: SUPABASE_URL e SUPABASE_KEY não encontrados no .env.local")
        sys.exit(1)
    
    supabase = create_client(url, key)
    
    result = supabase.table('analyses') \
        .select('id, file_name, created_at') \
        .eq('status', 'completed') \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()
    
    if not result.data:
        print("❌ Nenhuma análise completada encontrada")
        sys.exit(1)
    
    return result.data[0]

def run_forecast(analysis_id):
    """Executa o forecast via API"""
    url = 'http://127.0.0.1:8000/forecast'
    
    payload = {
        'analysis_id': analysis_id,
        'forecast_days': [30, 60, 90],
        'by_product': True,
        'by_category': False
    }
    
    print(f"🚀 Iniciando pipeline para análise: {analysis_id}")
    print()
    
    response = requests.post(url, json=payload, timeout=300)
    
    if response.status_code == 200:
        print()
        print("✅ Pipeline concluído com sucesso!")
        return True
    else:
        print(f"❌ Erro no pipeline: {response.status_code}")
        print(response.text)
        return False

def verify_results():
    """Verifica se avg_daily_demand foi calculado"""
    url = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    supabase = create_client(url, key)
    
    result = supabase.table('products') \
        .select('cleaned_name, original_name, avg_daily_demand') \
        .not_.is_('avg_daily_demand', 'null') \
        .limit(5) \
        .execute()
    
    if result.data:
        print()
        print("📊 Produtos com avg_daily_demand calculado:")
        for p in result.data:
            name = p.get('cleaned_name') or p.get('original_name')
            demand = p.get('avg_daily_demand')
            print(f"   {name}: {demand:.4f} un/dia")
    else:
        print()
        print("⚠️  Nenhum produto com avg_daily_demand ainda")

if __name__ == '__main__':
    # Buscar analysis_id
    if len(sys.argv) > 1:
        analysis_id = sys.argv[1]
        print(f"📊 Usando analysis_id fornecido: {analysis_id}")
    else:
        print("🔍 Buscando análise mais recente...")
        analysis = get_latest_analysis()
        analysis_id = analysis['id']
        print(f"📊 Análise encontrada: {analysis['file_name']} ({analysis['created_at'][:10]})")
    
    print()
    
    # Rodar forecast
    success = run_forecast(analysis_id)
    
    if success:
        # Verificar resultados
        verify_results()
        print()
        print("🎉 Pronto! Abra o dashboard em http://127.0.0.1:3000/dashboard")

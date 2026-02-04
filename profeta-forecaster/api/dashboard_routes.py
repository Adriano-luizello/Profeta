"""
Dashboard API routes: agregado de dados para o frontend.
"""
import os
import traceback
from pathlib import Path
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from services.dashboard_service import get_dashboard_for_analysis

router = APIRouter(prefix="/api", tags=["dashboard"])

# Caminho do .env (profeta-forecaster/.env)
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


_ENV_LOCAL_PATH = Path(__file__).resolve().parent.parent.parent / ".env.local"


def _read_env_file(path: Path, keys: list) -> dict:
    """Lê variáveis diretamente do arquivo (fallback)."""
    out = {}
    if not path.exists():
        return out
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip().replace("\r", "")
                for prefix in keys:
                    if line.startswith(prefix + "=") and "=" in line:
                        out[prefix] = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    except Exception:
        pass
    return out


def _get_supabase_client():
    """
    Cria cliente Supabase. Usa SERVICE_ROLE_KEY quando disponível para contornar RLS
    (tabela products exige usuário; anon key sem login retorna 0 linhas).
    """
    want_keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    file_env = _read_env_file(_ENV_PATH, want_keys)
    file_local = _read_env_file(_ENV_LOCAL_PATH, want_keys)
    # Merge: .env do backend primeiro, depois .env.local da raiz
    merged = {**file_local, **file_env}
    url = (
        merged.get("SUPABASE_URL") or merged.get("NEXT_PUBLIC_SUPABASE_URL")
        or os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    ).strip().replace("\r", "")
    key = (
        merged.get("SUPABASE_SERVICE_ROLE_KEY") or merged.get("SUPABASE_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        or merged.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or ""
    ).strip().replace("\r", "")
    if not url or not key:
        load_dotenv(_ENV_PATH, override=True)
        load_dotenv(_ENV_LOCAL_PATH, override=True)
        url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or url or "").strip().replace("\r", "")
        key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or key or ""
        ).strip().replace("\r", "")
    if not url or not key or not url.startswith("https://") or "your-project" in url:
        return None
    from supabase import create_client
    return create_client(url, key)


@router.get("/dashboard/{analysis_id}")
def dashboard(analysis_id: str, period: int = Query(30, ge=1, le=365)):
    """
    Dados agregados do dashboard para uma análise.
    GET /api/dashboard/{analysis_id}?period=30
    """
    load_dotenv(_ENV_PATH, override=True)
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_KEY") or "").strip()
    supabase = _get_supabase_client()
    if not supabase:
        return {
            "analysis_id": analysis_id,
            "time_horizon": period,
            "error": "Supabase não configurado. Verifique SUPABASE_URL e SUPABASE_KEY em profeta-forecaster/.env",
            "debug": {
                "env_file_used": str(_ENV_PATH),
                "env_file_exists": _ENV_PATH.exists(),
                "SUPABASE_URL_length": len(url),
                "SUPABASE_KEY_length": len(key),
            },
            "summary": {},
            "all_products": [],
            "actions": {"critical": [], "attention": [], "opportunity": [], "counts": {}},
            "top_best": [],
            "top_worst": [],
        }
    try:
        time_horizon = 30 if period not in (30, 60, 90) else period
        data = get_dashboard_for_analysis(supabase, analysis_id, time_horizon=time_horizon)
        return data
    except Exception as e:
        want_keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY"]
        file_env = _read_env_file(_ENV_PATH, want_keys)
        url_from_file = (file_env.get("SUPABASE_URL") or "").strip()
        tb = traceback.format_exc()
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "detail": tb,
                "debug_after_error": {
                    "env_file": str(_ENV_PATH),
                    "env_exists": _ENV_PATH.exists(),
                    "SUPABASE_URL_from_file_length": len(url_from_file),
                },
            },
        )

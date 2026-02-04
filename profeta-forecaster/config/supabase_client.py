from pathlib import Path
import os
from dotenv import load_dotenv
from supabase import create_client

_root = Path(__file__).resolve().parent.parent
_env = _root / ".env"
_env_local = _root.parent / ".env.local"
load_dotenv(dotenv_path=_env)
load_dotenv(dotenv_path=_env_local)

SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or ""
).strip()

supabase = create_client(
    supabase_url=SUPABASE_URL,
    supabase_key=SUPABASE_KEY,
)

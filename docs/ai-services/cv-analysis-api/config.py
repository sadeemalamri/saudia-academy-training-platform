# ==========================================
# Configuration — reads secrets from environment variables ONLY.
# ==========================================
# No real keys are ever hard-coded here. If a required variable is
# missing, the app fails fast with a clear error instead of silently
# falling back to a bundled key.
#
# Locally: copy .env.example to .env and fill in your values, or export
# the variables in your shell before running `python main.py`.
# On Render: set these under your service's Environment tab.
# ==========================================

import os

try:
    # Optional convenience for local development. Not required in
    # production (Render injects real env vars directly).
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


def _require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {name}. "
            f"Set it in your environment or in a local .env file "
            f"(see .env.example)."
        )
    return value


SUPABASE_URL = _require("SUPABASE_URL")
SUPABASE_KEY = _require("SUPABASE_KEY")
OPENAI_API_KEY = _require("OPENAI_API_KEY")

# Comma-separated list of origins allowed to call this API from the
# browser, e.g. "https://yourusername.github.io,http://localhost:5500"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

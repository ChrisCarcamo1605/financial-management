import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Database ──────────────────────────────────────────────────────────────
    _database_url = os.getenv('DATABASE_URL')
    if _database_url:
        if _database_url.startswith('postgresql://'):
            _database_url = _database_url.replace('postgresql://', 'postgresql+psycopg2://', 1)
        SQLALCHEMY_DATABASE_URI = _database_url
    else:
        # Fallback: direct Supabase PostgreSQL connection (DB only, not Auth)
        _host = os.getenv('SUPABASE_URL', '').replace('https://', '').replace('.supabase.co', '')
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql+psycopg2://postgres:{os.getenv('SUPABASE_DB_PASSWORD')}"
            f"@db.{_host}.supabase.co:5432/postgres"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # ── JWT / Auth ────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'change-this-secret-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 90000))    # 15 min
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 904800))  # 7 days

    # ── Cookie settings ───────────────────────────────────────────────────────
    # Set COOKIE_SECURE=true and COOKIE_SAMESITE=None in production when
    # frontend and backend are on different Railway domains.
    COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
    COOKIE_SAMESITE = os.getenv('COOKIE_SAMESITE', 'Lax')

    # ── CORS ──────────────────────────────────────────────────────────────────
    _origins_raw = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
    CORS_ORIGINS = [o.strip() for o in _origins_raw.split(',') if o.strip()]

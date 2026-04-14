import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuración principal de la aplicación."""

    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')

    # Database Configuration (Supabase PostgreSQL)
    SUPABASE_HOST = os.getenv('SUPABASE_URL', '').replace('https://', '').replace('.supabase.co', '')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or (
        f"postgresql+psycopg2://postgres:{os.getenv('SUPABASE_DB_PASSWORD')}"
        f"@db.{SUPABASE_HOST}.supabase.co:5432/postgres"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hora

    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

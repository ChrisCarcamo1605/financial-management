# Financial Management API

Backend API para la gestión de finanzas personales construida con Flask, SQLAlchemy, pandas y PostgreSQL (local con Docker o Supabase).

## 🚀 Características

- ✅ Autenticación propia con JWT (access en memoria + refresh en cookie httponly)
- ✅ CRUD completo de cuentas bancarias
- ✅ Gestión de categorías de ingresos/gastos
- ✅ Registro de transacciones con balance automático
- ✅ Presupuestos mensuales/semanales con seguimiento
- ✅ Dashboard con resumen financiero
- ✅ **Analytics avanzados con pandas** (tendencias, cash flow, heatmaps)
- ✅ Row Level Security (RLS) en Supabase
- ✅ API RESTful con validaciones

## 📋 Requisitos

- **Python 3.12** (requerido para pandas)
- Docker (Postgres local) o cualquier PostgreSQL (p. ej. Supabase)

## ⚙️ Configuración (desarrollo)

```bash
docker compose up -d db                 # Postgres local en :5433 (desde la raíz del repo)
cd backend
uv venv --python 3.12 .venv && uv pip install --python .venv -r requirements.txt
cp .env.example .env                    # apunta a la DB de Docker
.venv/bin/python app.py                 # crea las tablas y sirve en :5000
.venv/bin/python seed.py --reset        # usuario demo@caudal.app / demo1234
```

`seed.py` se niega a correr contra una base de datos remota salvo con `--allow-remote`.

### Migraciones

Las tablas nuevas se crean con `db.create_all()`, pero las columnas nuevas en tablas
existentes requieren SQL. Ejecuta en orden los archivos de `migrations/` (son idempotentes):

- `001_frontend_v2_preferences.sql`: preferencias de apariencia, formato regional y layout del inicio.
- `002_background_tones.sql`: tono de fondo para tema claro y oscuro.
- `003_income_source_links.sql`: cuenta y categoría por fuente de ingreso.
- `004_card_reserve_statuses.sql`: confirmación de reservas de tarjeta por quincena.
- `005_language.sql`: idioma de la interfaz (es/en).

## 📚 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Crear cuenta |
| POST | `/api/auth/login` | Iniciar sesión (devuelve access token + cookie de refresh) |
| POST | `/api/auth/refresh` | Renovar access token con la cookie |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Obtener usuario actual |

### Cuentas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/accounts` | Listar cuentas |
| POST | `/api/accounts` | Crear cuenta |
| PUT | `/api/accounts/:id` | Actualizar cuenta |
| DELETE | `/api/accounts/:id` | Eliminar cuenta |

### Categorías

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/categories` | Listar categorías |
| POST | `/api/categories` | Crear categoría |
| PUT | `/api/categories/:id` | Actualizar categoría |
| DELETE | `/api/categories/:id` | Eliminar categoría |

### Transacciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/transactions` | Listar transacciones (con filtros) |
| POST | `/api/transactions` | Crear transacción |
| PUT | `/api/transactions/:id` | Actualizar transacción |
| DELETE | `/api/transactions/:id` | Eliminar transacción |

### Presupuestos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/budgets` | Listar presupuestos |
| POST | `/api/budgets` | Crear presupuesto |
| PUT | `/api/budgets/:id` | Actualizar presupuesto |
| DELETE | `/api/budgets/:id` | Eliminar presupuesto |

### Dashboard

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Resumen financiero |

### Analytics (Pandas)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/analytics/spending-by-category` | Gastos por categoría con agregación pandas |
| GET | `/api/analytics/cash-flow` | Análisis de flujo de caja temporal |
| GET | `/api/analytics/trends` | Tendencias con promedios móviles |
| GET | `/api/analytics/category-comparison` | Comparación de categorías |
| GET | `/api/analytics/account-performance` | Rendimiento por cuenta |
| GET | `/api/analytics/spending-heatmap` | Mapa de calor de gastos |

**Parámetros de consulta para Analytics:**
- `start_date`: Fecha inicio (YYYY-MM-DD)
- `end_date`: Fecha fin (YYYY-MM-DD)
- `group_by`: Agrupación temporal (day/week/month/quarter/year)
- `window`: Ventana de promedio móvil (para trends)

## 🔐 Autenticación

Todos los endpoints (excepto `/api/auth/verify` y `/api/health`) requieren un token JWT válido en el header:

```
Authorization: Bearer <access_token de /api/auth/login>
```

## 📊 Ejemplos de Uso

### Crear una cuenta

```bash
curl -X POST http://localhost:5000/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cuenta Principal",
    "balance": 1000.00,
    "currency": "USD"
  }'
```

### Crear una transacción

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "category_id": 1,
    "amount": 50.00,
    "type": "expense",
    "description": "Compras en supermercado",
    "date": "2024-01-15"
  }'
```

### Obtener resumen del dashboard

```bash
curl -X GET http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🗄️ Estructura de la Base de Datos

### Tablas principales:

- **accounts**: Cuentas bancarias del usuario
- **categories**: Categorías de ingresos/gastos
- **transactions**: Transacciones financieras
- **budgets**: Presupuestos por categoría

Todas las tablas tienen Row Level Security (RLS) activado para asegurar que cada usuario solo acceda a sus propios datos.

## 🛠️ Tecnologías

- **Flask**: Framework web
- **SQLAlchemy**: ORM
- **pandas**: Análisis de datos y agregaciones avanzadas
- **numpy**: Operaciones numéricas
- **Flask-CORS**: Soporte CORS
- **PyJWT**: Verificación de tokens JWT
- **PostgreSQL**: base de datos (Docker en desarrollo, Supabase u otro en producción)
- **Chart.js**: Visualización de datos (frontend)

## 📝 Notas

- Las transacciones actualizan automáticamente el balance de la cuenta
- Los presupuestos incluyen información de gastos y porcentaje usado
- Todas las fechas están en formato `YYYY-MM-DD`
- Los montos son decimales (float)

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verifica que `SUPABASE_DB_PASSWORD` sea correcto
- Asegúrate de que tu IP esté permitida en Supabase

### Error de autenticación
- Verifica que `SUPABASE_JWT_SECRET` sea correcto
- Asegúrate de que el token no haya expirado

### Error de CORS
- Configura `CORS_ORIGINS` en `.env` con la URL de tu frontend

## 📄 Licencia

MIT

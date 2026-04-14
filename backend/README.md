# Financial Management API

Backend API para la gestión de finanzas personales construida con Flask, SQLAlchemy, pandas y Supabase.

## 🚀 Características

- ✅ Autenticación con Supabase Auth
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
- Cuenta de Supabase (gratuita en https://supabase.com)

## ⚙️ Configuración

### 1. Configurar Supabase

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el archivo `schema.sql` para crear las tablas
4. Obtén las credenciales desde **Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (Service Role Key)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_JWT_SECRET`

### 2. Instalar Python 3.12

**IMPORTANTE**: Este proyecto requiere Python 3.12 para compatibilidad con pandas.

**Opción A - Microsoft Store:**
1. Abre Microsoft Store
2. Busca "Python 3.12"
3. Instálalo

**Opción B - python.org:**
Descarga desde: https://www.python.org/downloads/release/python-3128/

### 3. Configurar el proyecto

**Windows (automático):**
```bash
cd backend
setup.bat
```

**Manual:**
```bash
cd backend
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-service-role-key
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_JWT_SECRET=tu-jwt-secret
SUPABASE_DB_PASSWORD=tu-database-password

JWT_SECRET_KEY=tu-super-secret-jwt-key

CORS_ORIGINS=http://localhost:3000
```

### 5. Ejecutar la aplicación

**Windows:**
```bash
venv\Scripts\activate
python app.py
```

**Linux/Mac:**
```bash
source venv/bin/activate
python app.py
```

La API estará disponible en: `http://localhost:5000`

## 📚 Endpoints de la API

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/verify` | Verificar token JWT |
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
Authorization: Bearer <your-supabase-jwt-token>
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
- **Supabase**: Base de datos PostgreSQL + Auth
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

# Financial Management - Project Context

## Project Overview

**Financial Management** is a full-stack personal finance application consisting of:

- **Backend**: A REST API built with Flask, SQLAlchemy, pandas, and numpy, backed by a Supabase PostgreSQL database.
- **Frontend**: A React SPA with Bootstrap, Chart.js, and Supabase Auth for authentication.

The app supports CRUD operations for bank accounts, categories, transactions, and budgets, along with advanced analytics (spending trends, cash flow analysis, heatmaps) powered by pandas. Row Level Security (RLS) in Supabase ensures each user can only access their own data.

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Flask, Flask-SQLAlchemy, Flask-CORS, Flask-RESTX, PyJWT, pandas, numpy |
| **Frontend** | React 18, React Router v6, Bootstrap 5, Axios, Chart.js, Supabase JS |
| **Database** | Supabase (PostgreSQL) with RLS |
| **Auth** | Supabase Auth (JWT) |
| **API Docs** | Swagger UI / OpenAPI (flask-restx) |

---

## Directory Structure

```
financial-management/
├── backend/
│   ├── app.py                  # Flask app factory + entry point
│   ├── config.py               # App configuration (env vars)
│   ├── requirements.txt        # Python dependencies
│   ├── schema.sql              # Supabase DB schema (tables, RLS policies, triggers)
│   ├── setup.bat               # Windows setup script
│   ├── generate_data.py        # Fake data generator
│   ├── routes/                 # Flask Blueprints (API endpoints)
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── categories.py
│   │   ├── transactions.py
│   │   ├── budgets.py
│   │   └── analytics.py        # Pandas-powered analytics endpoints
│   ├── models/                 # SQLAlchemy ORM models
│   │   ├── account.py
│   │   ├── category.py
│   │   ├── transaction.py
│   │   └── budget.py
│   ├── services/
│   │   ├── supabase_auth.py    # JWT verification & Supabase Auth integration
│   │   └── analytics.py        # Pandas analytics service
│   └── utils/
│       ├── decorators.py       # @token_required, @optional_token decorators
│       └── pagination.py       # Reusable pagination helper
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx             # Main app component + routing
│   │   ├── index.jsx           # Entry point
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components (Dashboard, Login, etc.)
│   │   ├── context/            # AuthContext for authentication state
│   │   └── services/
│   │       ├── api.js          # Axios API client
│   │       └── supabase.js     # Supabase client
│   └── public/
└── QWEN.md
```

---

## Building and Running

### Backend

```bash
cd backend

# One-time setup (Windows)
setup.bat
# Or manually:
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with Supabase credentials

# Run
venv\Scripts\activate
python app.py
```

Backend runs on **http://localhost:5000**. Swagger UI available at **http://localhost:5000/api/docs**.

**Required Python version: 3.12** (for pandas compatibility).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with Supabase credentials
npm start
```

Frontend runs on **http://localhost:3000**.

### Environment Variables

**Backend** (`.env`):
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Service Role Key
- `SUPABASE_ANON_KEY` - Anon Key
- `SUPABASE_JWT_SECRET` - JWT Secret
- `SUPABASE_DB_PASSWORD` - Database password
- `JWT_SECRET_KEY` - JWT signing secret
- `CORS_ORIGINS` - Allowed origins (comma-separated)

**Frontend** (`.env`):
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Anon Key
- `REACT_APP_API_URL` - Backend URL (optional, defaults to localhost:5000)

---

## API Endpoints

All endpoints except `/api/auth/verify`, `/api/health`, and `/api/auth/me` require a Bearer JWT token in the `Authorization` header.

| Namespace | Methods | Endpoint | Description |
|-----------|---------|----------|-------------|
| Health | GET | `/api/health` | Health check |
| Auth | POST | `/api/auth/verify` | Verify JWT token |
| Auth | GET | `/api/auth/me` | Get current user |
| Accounts | GET, POST | `/api/accounts` | List/Create accounts (paginated) |
| Accounts | PUT, DELETE | `/api/accounts/:id` | Update/Delete account |
| Categories | GET, POST | `/api/categories` | List/Create categories (paginated, filterable by `type`) |
| Categories | PUT, DELETE | `/api/categories/:id` | Update/Delete category |
| Transactions | GET, POST | `/api/transactions` | List/Create transactions (paginated, filterable) |
| Transactions | PUT, DELETE | `/api/transactions/:id` | Update/Delete transaction |
| Budgets | GET, POST | `/api/budgets` | List/Create budgets (paginated) |
| Budgets | PUT, DELETE | `/api/budgets/:id` | Update/Delete budget |
| Dashboard | GET | `/api/dashboard/summary` | Financial summary |
| Analytics | GET | `/api/analytics/spending-by-category` | Spending breakdown |
| Analytics | GET | `/api/analytics/cash-flow` | Cash flow analysis |
| Analytics | GET | `/api/analytics/trends` | Spending trends with moving averages |
| Analytics | GET | `/api/analytics/category-comparison` | Category comparison |
| Analytics | GET | `/api/analytics/account-performance` | Account performance |
| Analytics | GET | `/api/analytics/spending-heatmap` | Spending heatmap |

### Pagination

Paginated endpoints return:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "per_page": 20,
  "total_pages": 8
}
```

| Endpoint | Default per_page | Max per_page |
|----------|-----------------|--------------|
| Accounts | 20 | 100 |
| Categories | 50 | 200 |
| Budgets | 20 | 100 |
| Transactions | Uses `limit`/`offset` pattern (default 100, max 500) |

Query params: `page`, `per_page` (or `limit`/`offset` for transactions).

---

## Database Schema

Four main tables, all with Row Level Security (RLS) enabled:

- **accounts** - Bank accounts (id, user_id, name, balance, currency)
- **categories** - Income/expense categories (id, user_id, name, type, color, icon)
- **transactions** - Financial records (id, user_id, account_id, category_id, amount, type, description, date)
- **budgets** - Budget limits (id, user_id, category_id, amount, period, start_date, end_date)

All tables have `created_at` and `updated_at` timestamps. RLS policies ensure users only access their own data.

Run `schema.sql` in Supabase SQL Editor to create tables, indexes, RLS policies, and triggers.

---

## Key Architecture Patterns

### Authentication Flow
1. Frontend authenticates via Supabase Auth (email/password)
2. Supabase returns a JWT token stored in localStorage
3. Frontend sends `Authorization: Bearer <token>` with each API request
4. Backend verifies token via `@token_required` decorator (in `utils/decorators.py`)
5. Verified `user_id` is injected into route handlers for data filtering

### Pagination Helper
The reusable `utils/pagination.py` helper standardizes paginated responses. Usage:
```python
from utils.pagination import paginate_query

query = Model.query.filter_by(user_id=user_id).order_by(Model.created_at.desc())
return paginate_query(
    query=query,
    model_to_dict_fn=lambda item: item.to_dict(),
    page=page,
    per_page=per_page,
    max_per_page=100
)
```

### Analytics Service
Analytics endpoints (`routes/analytics.py`) use pandas for data aggregation, grouping, and transformations (moving averages, time-based grouping, heatmaps). Data is fetched from PostgreSQL and processed with pandas/numpy before returning as JSON.

### Balance Management
Transaction creation/update/deletion automatically adjusts account balances. The account model does not use triggers; balance changes are handled in the route handlers.

---

## Development Conventions

- **Backend**: Flask Blueprints for modular routing, SQLAlchemy ORM for database access, service layer for external integrations (Supabase Auth, analytics)
- **Frontend**: React functional components, React Router for navigation, AuthContext for shared auth state, Axios for API calls
- **API responses**: Consistent JSON format with `error` field for errors, `data`/resource name for success
- **Error handling**: Try/except blocks with db.session.rollback() on mutations, descriptive error messages returned to client
- **Date format**: All dates use `YYYY-MM-DD` format
- **Amounts**: Decimal/float values

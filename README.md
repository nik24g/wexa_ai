# StockFlow (Inventory Management MVP)

A small multi-tenant inventory app. A user signs up (which also creates their
organization), logs in, manages products, adjusts stock, and gets a dashboard
with inventory totals and a low-stock list. All data is scoped to the
signed-in user's organization, so one org can never see another org's data.

Built for the Wexa AI Full Stack Developer assessment (Phase 1, the 6-hour MVP).

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | React 19 + Vite, React Router, Axios, Tailwind CSS v4 |
| Backend  | Django 5 + Django REST Framework, SimpleJWT for auth |
| Database | SQLite (swappable to PostgreSQL/RDS for production) |
| Docs     | drf-spectacular (OpenAPI 3), served as Swagger UI + ReDoc |

## Repository Structure

```
wexa ai/
├── backend/                 # Django REST API
│   ├── stockflow/           # project settings, root URLs
│   ├── accounts/            # Organization + custom User, JWT auth
│   ├── inventory/           # Product model, CRUD, dashboard, settings
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React (Vite) SPA
│   └── src/
│       ├── api/             # axios client + token handling
│       ├── auth/            # auth context
│       ├── components/      # layout, UI primitives, route guard
│       └── pages/           # Login, Signup, Dashboard, Products, Settings
├── docs/
│   └── API_GUIDE.md         # full endpoint reference
└── README.md
```

## Running it locally

You'll need Python 3.11+ and Node 18+ (I used 22).

### Backend (http://127.0.0.1:8000)

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
copy .env.example .env           # macOS/Linux: cp .env.example .env
python manage.py migrate
python manage.py runserver
```

To get some data to click around with, you can seed a demo org, a login, and a
few sample products (a couple are intentionally low on stock):

```bash
python manage.py seed_demo
```

| Account    | Email                 | Password       |
| ---------- | --------------------- | -------------- |
| App login  | `demo@stockflow.com`  | `DemoPass123!` |
| Admin site | `admin@stockflow.com` | `Admin12345!`  |

(Or just make your own admin with `python manage.py createsuperuser`.)

### Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, hit **Sign up**, and create your organization.

In dev the Vite server proxies `/api/*` to Django, so there's nothing else to
configure. For production, point the frontend at the deployed backend by setting
`VITE_API_BASE_URL`.

## API Documentation

The backend serves interactive docs:

- Swagger UI: http://127.0.0.1:8000/api/docs/
- ReDoc: http://127.0.0.1:8000/api/redoc/
- Raw OpenAPI schema: http://127.0.0.1:8000/api/schema/

There's also a written endpoint reference in [`docs/API_GUIDE.md`](docs/API_GUIDE.md).

## Features

- **Auth & tenancy.** Email/password signup creates an `Organization`; login is
  JWT-based. One user per org, as per the spec.
- **Product CRUD.** Name, SKU (unique within an org), description, quantity,
  cost/selling price, and an optional per-product low-stock threshold.
- **Stock adjustments.** Bump quantity up or down from the product list. The
  product's `last_updated_by` is recorded on every change.
- **Dashboard.** Total products, total units on hand, and the low-stock table.
- **Settings.** Org-level default low-stock threshold (defaults to 5), used for
  any product that doesn't set its own.

A product counts as low stock when `quantity_on_hand <= effective_threshold`,
where `effective_threshold` is the product's own threshold if set, otherwise the
org's `default_low_stock_threshold`.

## A note on multi-tenancy

Every product query is filtered by `request.user.organization`, and the org is
set server-side on create (never trusted from the request body). SKU uniqueness
is a per-org database constraint. The result is that a user can't read or write
another organization's data.

## Deployment (AWS)

Local dev runs on SQLite. The plan for AWS, which doesn't require code changes:

- **Backend:** Django behind Gunicorn on Elastic Beanstalk (or EC2). Switch
  SQLite to Amazon RDS (PostgreSQL) by setting the DB config via env vars.
- **Frontend:** `npm run build`, then serve the static `dist/` from S3 +
  CloudFront.
- **Config:** `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`,
  `CORS_ALLOWED_ORIGINS`, and DB credentials all come from environment variables,
  never committed.

## Submission checklist

- [ ] GitHub repository link
- [ ] Deployed frontend URL
- [ ] Deployed backend/API URL
- [x] API guide / documentation (`docs/API_GUIDE.md` + Swagger UI)

# StockFlow API Guide

Base URL (local): `http://127.0.0.1:8000/api`

All responses are JSON. Authentication uses JWT Bearer tokens (via
`djangorestframework-simplejwt`). Send the access token on every protected
request:

```
Authorization: Bearer <access_token>
```

Interactive docs:

- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI schema: `/api/schema/`

## Authentication

### Sign up (creates organization + owner user)

`POST /api/auth/signup/` (public)

Request:

```json
{
  "email": "owner@example.com",
  "password": "Sup3rSecret!",
  "organization_name": "My Test Store"
}
```

Response `201 Created`:

```json
{
  "access": "<jwt-access>",
  "refresh": "<jwt-refresh>",
  "user": {
    "id": 1,
    "email": "owner@example.com",
    "first_name": "",
    "last_name": "",
    "organization": {
      "id": 1,
      "name": "My Test Store",
      "default_low_stock_threshold": 5
    }
  }
}
```

The password must pass Django's validators (min 8 chars, not all numeric, not a
common password). A duplicate email returns `400`.

### Log in

`POST /api/auth/login/` (public)

Request:

```json
{ "email": "owner@example.com", "password": "Sup3rSecret!" }
```

Response `200 OK` has the same shape as signup (`access`, `refresh`, `user`).
Invalid credentials return `401`.

### Refresh access token

`POST /api/auth/refresh/` (public)

Request: `{ "refresh": "<jwt-refresh>" }`
Response: `{ "access": "<new-jwt-access>" }`

### Current user

`GET /api/auth/me/` (authenticated)

Returns the `user` object (same shape as above).

## Products

A product belongs to the caller's organization, and SKU is unique within an
organization.

### Product object

```json
{
  "id": 1,
  "name": "Widget",
  "sku": "WID-001",
  "description": "",
  "quantity_on_hand": 13,
  "cost_price": "4.50",
  "selling_price": "9.99",
  "low_stock_threshold": 5,
  "effective_threshold": 5,
  "is_low_stock": false,
  "last_updated_by_email": "owner@example.com",
  "created_at": "2026-06-02T18:00:00Z",
  "updated_at": "2026-06-02T18:05:00Z"
}
```

`effective_threshold` and `is_low_stock` are computed, read-only fields.
`low_stock_threshold` may be `null`, in which case the org default applies.

### List products

`GET /api/products/` (authenticated)

Query params:

- `search`: matches `name` or `sku` (case-insensitive, partial).
- `ordering`: for example `name`, `-quantity_on_hand`, `created_at`.

Returns an array of products scoped to your org.

### Create product

`POST /api/products/` (authenticated)

Only `name` and `sku` are required:

```json
{
  "name": "Widget",
  "sku": "WID-001",
  "description": "Optional text",
  "quantity_on_hand": 10,
  "cost_price": "4.50",
  "selling_price": "9.99",
  "low_stock_threshold": 5
}
```

Returns `201` with the created product. A duplicate SKU within the org returns `400`.

### Retrieve / update / delete

- `GET /api/products/{id}/`: single product.
- `PUT /api/products/{id}/`: full update.
- `PATCH /api/products/{id}/`: partial update.
- `DELETE /api/products/{id}/`: hard delete, returns `204`.

### Adjust stock (relative +/-)

`POST /api/products/{id}/adjust-stock/` (authenticated)

```json
{ "delta": 10, "note": "restock" }
```

- `delta`: signed integer, can't be `0`.
- `note`: optional free text.
- An adjustment that would make the quantity negative is rejected with `400`.

Returns `200` with the updated product. `last_updated_by` is set to the caller.

## Dashboard

`GET /api/dashboard/` (authenticated)

```json
{
  "total_products": 2,
  "total_quantity": 113,
  "low_stock_count": 1,
  "low_stock_items": [ /* array of product objects */ ]
}
```

## Settings

The organization-level default low-stock threshold.

### Get settings

`GET /api/settings/` (authenticated)

```json
{ "default_low_stock_threshold": 5 }
```

### Update settings

`PATCH /api/settings/` (authenticated)

Request: `{ "default_low_stock_threshold": 10 }`
Response: `{ "default_low_stock_threshold": 10 }`

## Error format

Errors follow DRF conventions:

```json
{ "detail": "Authentication credentials were not provided." }
```

or field-level:

```json
{ "sku": ["A product with this SKU already exists in your organization."] }
```

| Status | Meaning |
| ------ | ------- |
| 400    | Validation error |
| 401    | Missing/invalid/expired token |
| 403    | Authenticated but not allowed |
| 404    | Not found (or not in your organization) |

## Quick cURL walkthrough

```bash
# 1. Sign up
curl -X POST http://127.0.0.1:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"Sup3rSecret!","organization_name":"My Test Store"}'

# 2. Use the returned access token
TOKEN="<access-token>"

# 3. Create a product
curl -X POST http://127.0.0.1:8000/api/products/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WID-001","quantity_on_hand":3,"low_stock_threshold":5}'

# 4. Adjust stock
curl -X POST http://127.0.0.1:8000/api/products/1/adjust-stock/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"delta":10,"note":"restock"}'

# 5. Dashboard
curl http://127.0.0.1:8000/api/dashboard/ -H "Authorization: Bearer $TOKEN"
```

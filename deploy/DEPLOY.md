# Deploying StockFlow on a single EC2 instance (Ubuntu)

This sets up the app on one Ubuntu EC2 box:

- Nginx serves the built React app and reverse-proxies `/api`, `/admin`, and
  `/static` to Gunicorn.
- Gunicorn runs Django (managed by systemd).
- SQLite is the database (file lives in `backend/db.sqlite3`).

Assumes Security Group inbound allows ports 22 (SSH) and 80 (HTTP).

Throughout, replace `YOUR_EC2_PUBLIC_IP` with your instance's public IP.

## 1. Install system packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git

# Node.js 20 (to build the frontend)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Clone the repo

```bash
cd ~
git clone https://github.com/nik24g/wexa_ai.git
cd wexa_ai
```

## 3. Backend: virtualenv + dependencies

```bash
cd ~/wexa_ai/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 4. Backend: environment file

Generate a secret key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Create `~/wexa_ai/backend/.env` (use `deploy/env.production.example` as a
reference). `DJANGO_ALLOWED_HOSTS` must contain whatever host users type in the
browser (your domain and/or the EC2 IP), and `CSRF_TRUSTED_ORIGINS` must include
the full origin with scheme:

```
DJANGO_SECRET_KEY=<paste the generated key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=wexa.voltrify.in,127.0.0.1
CSRF_TRUSTED_ORIGINS=https://wexa.voltrify.in
DEFAULT_LOW_STOCK_THRESHOLD=5
```

> If you reach the site by IP instead of a domain, put that IP in
> `DJANGO_ALLOWED_HOSTS`. A wrong/missing host is the usual cause of a plain
> "Bad Request (400)" page. If TLS is terminated by a proxy in front of EC2
> (e.g. Cloudflare), use the `https://` origin in `CSRF_TRUSTED_ORIGINS`.

## 5. Backend: migrate, collect static, seed

```bash
cd ~/wexa_ai/backend
source venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput

# Optional: demo data + login (demo@stockflow.com / DemoPass123!)
python manage.py seed_demo
# Or create your own admin instead:
# python manage.py createsuperuser
```

## 6. Run Gunicorn via systemd

```bash
sudo cp ~/wexa_ai/deploy/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable --now gunicorn
sudo systemctl status gunicorn          # should be "active (running)"

# Sanity check (should return HTTP 200/302):
curl -I http://127.0.0.1:8000/admin/login/
```

## 7. Build the frontend and publish it

The frontend talks to the API at `/api` on the same origin, so no build-time
config is needed.

```bash
cd ~/wexa_ai/frontend
npm ci
npm run build

sudo mkdir -p /var/www/stockflow
sudo cp -r dist/* /var/www/stockflow/
```

## 8. Configure Nginx

```bash
sudo cp ~/wexa_ai/deploy/nginx.conf /etc/nginx/sites-available/stockflow
sudo ln -sf /etc/nginx/sites-available/stockflow /etc/nginx/sites-enabled/stockflow
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                           # config test should pass
sudo systemctl restart nginx
```

## 9. Open the app

Visit `http://YOUR_EC2_PUBLIC_IP` in a browser. Sign up (or log in with the
seeded demo account), and you should be able to manage products end to end.

- App: `http://YOUR_EC2_PUBLIC_IP`
- API docs (Swagger): `http://YOUR_EC2_PUBLIC_IP/api/docs/`
- Admin: `http://YOUR_EC2_PUBLIC_IP/admin/`

## Redeploying after changes

```bash
cd ~/wexa_ai
git pull

# Backend
cd backend && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn

# Frontend
cd ../frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/stockflow/
```

## Troubleshooting

- **502 Bad Gateway**: Gunicorn isn't running. Check
  `sudo systemctl status gunicorn` and `journalctl -u gunicorn -e`.
- **400 Bad Request**: `DJANGO_ALLOWED_HOSTS` doesn't include your IP. Fix the
  `.env` and `sudo systemctl restart gunicorn`.
- **Admin page has no styling**: `collectstatic` wasn't run, or `/static/` isn't
  proxied. Re-run collectstatic and reload Nginx.
- **Admin login "CSRF verification failed"**: add `http://YOUR_EC2_PUBLIC_IP` to
  `CSRF_TRUSTED_ORIGINS` in `.env`, then restart Gunicorn.
- **Can't reach the site at all**: confirm port 80 is open in the EC2 Security
  Group, and `sudo systemctl status nginx` is active.
```

# dir Self-Hosted Guide

> Full local or VPS deployment using Docker Compose + Nginx.
> SSL/HTTPS: add via `certbot --nginx` when ready.

---

## Prerequisites

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 / Debian 12 / Fedora 39 | Ubuntu 24.04 LTS |
| RAM | 1 GB | 2 GB |
| Disk | 10 GB | 40 GB |
| CPU | 1 vCPU | 2 vCPU |
| Docker | 24+ | latest |
| Port 80 | open | open |

---

## Quick Install (one-liner)

```bash
curl -fsSL https://raw.githubusercontent.com/5mil/dir/self-hosted/deploy/self-hosted/install.sh \
  | sudo bash -s -- --domain your-domain.com
```

---

## Manual Install

```bash
git clone https://github.com/5mil/dir.git /opt/dir
cd /opt/dir/deploy/self-hosted

# Configure
cp .env.example .env
nano .env   # set DB_PASSWORD, JWT_SECRET, ENCRYPTION_KEY

# Start stack
docker compose --env-file .env up -d

# Nginx
sudo cp nginx/dir.conf /etc/nginx/sites-available/dir
sudo sed -i 's/YOUR_DOMAIN/your-domain.com/g' /etc/nginx/sites-available/dir
sudo ln -s /etc/nginx/sites-available/dir /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Stack

```
dir-postgres   PostgreSQL 16-alpine   internal network only
dir-redis      Redis 7-alpine         internal network only
dir-app        NocoBase latest        127.0.0.1:13000
dir-watchtower auto-update check      daily
```

Nginx proxies port 80 → `127.0.0.1:13000`.

---

## Port Map

| Port | Exposed To | Service |
|---|---|---|
| 13000 | 127.0.0.1 only | NocoBase |
| 5432 | Docker internal | PostgreSQL |
| 6379 | Docker internal | Redis |
| 80 | public | Nginx → NocoBase |

---

## Useful Commands

```bash
./health.sh                              # container + API status
sudo ./backup.sh                         # manual backup now
sudo ./restore.sh /opt/dir/backups/DATE  # restore
sudo ./upgrade.sh                        # upgrade NocoBase
docker compose logs -f                   # live logs
docker compose logs -f app               # app logs only
docker compose restart                   # restart all
docker compose down                      # stop all
```

---

## Adding SSL Later

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com --email you@email.com --agree-tos --redirect
```

---

## Backup

Daily systemd timer at 03:00 (installed by `install.sh`).

```bash
systemctl status dir-backup.timer
```

Backup contents:
- `postgres.sql.gz` — full PostgreSQL dump
- `storage.tar.gz` — uploaded files
- `.env.bak` — environment snapshot

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App not starting | `docker compose logs app` |
| DB connection error | Check `DB_PASSWORD` in `.env` |
| 502 Bad Gateway | Wait for healthy — `docker inspect dir-app` |
| Out of disk | `docker system prune -f`; check `/opt/dir/backups` |

---

*dir self-hosted v0.1.0 — Stardate 2026.169*

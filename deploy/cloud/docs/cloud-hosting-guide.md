# dir Cloud Hosting Guide

> Two Always-Free deployment paths: **Render.com** and **Google Cloud (e2-micro)**.

---

## Option A — Render.com (Simplest)

Render provides managed PostgreSQL + Redis + web service with zero server management.

### Free Tier Limits (Render)

| Resource | Free Tier |
|---|---|
| Web service | Spins down after 15 min idle (free plan) |
| PostgreSQL | 1 GB storage, 90-day retention |
| Redis | 25 MB |
| Bandwidth | 100 GB/mo |

> **Upgrade to Render Starter ($7/mo)** to prevent spin-down for a production dir instance.

### Deploy Steps

1. Push `5mil/dir` to GitHub (already done)
2. Go to [render.com/dashboard](https://render.com/dashboard) → **New** → **Blueprint**
3. Connect `github.com/5mil/dir`, select branch `cloud-hosting`
4. Render reads `deploy/cloud/render/render.yaml` and provisions:
   - `dir-app` (NocoBase web service)
   - `dir-postgres` (managed PostgreSQL)
   - `dir-redis` (managed Redis)
5. Wait ~3 min for first deploy
6. Open your Render URL → create admin on first visit

### Manual Redeploy

```bash
export RENDER_API_KEY=rnd_your_key
export RENDER_SERVICE_ID=srv_your_id
./deploy/cloud/render/render-deploy.sh
```

---

## Option B — Google Cloud e2-micro (Always Free)

GCP Always Free: 1 `e2-micro` VM per month in `us-central1`, `us-west1`, or `us-east1`.

### Free Tier Limits (GCloud)

| Resource | Free Tier |
|---|---|
| VM | 1 e2-micro (0.25 vCPU, 1 GB RAM) |
| Disk | 30 GB HDD |
| Egress | 1 GB/mo to internet |
| GCS | 5 GB Standard storage (US) |

### Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Deploy

```bash
cd deploy/cloud/gcloud

# One command: create VM + install dir
./gcloud-deploy.sh --project my-project --domain your-domain.com
```

This will:
1. Create `e2-micro` VM in `us-central1-a`
2. Open firewall ports 80 + 22
3. Copy `self-hosted` stack to VM
4. Run `install.sh` on VM
5. Print the external IP

### Status Check

```bash
GCLOUD_PROJECT=my-project ./gcloud-status.sh
```

### GCS Backup Sync

```bash
# Sync latest backup to GCS (5 GB free tier)
BUCKET=gs://my-dir-backups ./gcloud-backup-sync.sh
```

### SSH into VM

```bash
gcloud compute ssh dir-vm --zone=us-central1-a --project=my-project
```

### Add SSL (on VM)

```bash
gcloud compute ssh dir-vm --zone=us-central1-a --project=my-project
# Inside VM:
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com --email you@email.com --agree-tos --redirect
```

---

## Platform Comparison

| Feature | Render (free) | GCloud e2-micro |
|---|---|---|
| Setup complexity | Minimal (Blueprint) | Moderate (CLI) |
| Always-on | No (spins down) | Yes |
| Database | Managed | Docker container |
| RAM | 512 MB | 1 GB |
| Disk | Ephemeral | 30 GB persistent |
| Egress | 100 GB/mo | 1 GB/mo free |
| SSL | Auto (Render) | Manual (Certbot) |
| Best for | Quick demos | Production free tier |

---

## Environment Variables

See `render/render-env.example` and `gcloud/gcloud-env.example` for all required vars.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Render 502 | Service spinning up — wait 60s or upgrade plan |
| GCloud VM unreachable | Check firewall rule `dir-allow-http` |
| DB connection error | Verify DB env vars in Render dashboard |
| Disk full (GCloud) | `docker system prune -f`; check `/opt/dir/backups` |

---

*dir cloud-hosting v0.1.0 — Stardate 2026.169*

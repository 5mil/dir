# Google Cloud Always Free Deployment

## Free Tier Resources Used

- **Compute:** e2-micro VM (2 vCPU shared, 1 GB RAM) — 1 instance free in us-central1/us-east1/us-west1
- **Storage:** 30 GB standard persistent disk
- **Networking:** 1 GB egress/month to non-China/Australia regions
- **Note:** Cloud SQL is NOT always free — use PostgreSQL installed on the VM instead

## Prerequisites

- Google Cloud account with billing enabled (required even for free tier)
- `gcloud` CLI installed locally
- SSH key pair

## Steps

### 1. Create VM

```bash
gcloud compute instances create dir-vm \
  --machine-type=e2-micro \
  --zone=us-east1-b \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server
```

### 2. Open Firewall

```bash
gcloud compute firewall-rules create allow-http-https \
  --allow=tcp:80,tcp:443 \
  --target-tags=http-server,https-server
```

### 3. SSH and Install Docker

```bash
gcloud compute ssh dir-vm --zone=us-east1-b

# On the VM:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

### 4. Deploy dir

```bash
git clone https://github.com/5mil/dir.git
cd dir/deploy/self-hosted
cp .env.example .env
# Edit .env
docker compose up -d
```

### 5. SSL with Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Monitoring (Free)

- Cloud Monitoring agent: `sudo apt-get install -y google-cloud-ops-agent`
- View logs: GCP Console → Logging → Logs Explorer

## Backup to GCS (Free bucket)

```bash
gsutil mb gs://dir-backups-yourid
docker exec dir-postgres pg_dump -U dir_user dir_db | gsutil cp - gs://dir-backups-yourid/backup_$(date +%Y%m%d).sql
```

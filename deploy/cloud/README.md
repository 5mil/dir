# Cloud Hosting Deployment Path

Two cloud paths are supported:

1. **[Render Free Tier](./render/)** — Easiest zero-cost start
2. **[Google Cloud Always Free](./gcloud/)** — More control, always-on

## Choosing a Path

| Feature | Render Free | GCloud Always Free |
|---|---|---|
| RAM | 512 MiB | 614 MiB (f1-micro) |
| Storage | 1 GB SSD | 10 GB (Cloud SQL) |
| Uptime | 750 hrs/month (spins down) | Always on |
| SSL | Auto (managed) | Manual / managed |
| DB | Managed PostgreSQL | Cloud SQL PostgreSQL |
| Cold Start | Yes (free tier sleeps) | No |
| Cost | Free | Free (within limits) |

For persistent production use, **Google Cloud Always Free** is recommended.

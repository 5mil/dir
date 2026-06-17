# Render Free Tier Deployment

## Prerequisites

- Render account (free): https://render.com
- GitHub repo connected to Render

## Steps

### 1. Create PostgreSQL Database

- Dashboard → New → PostgreSQL
- Name: `dir-db`
- Plan: Free
- Region: Oregon (us-west)
- Copy the **Internal Database URL**

### 2. Create Web Service

- Dashboard → New → Web Service
- Connect `5mil/dir` repo
- Runtime: **Docker**
- Root Directory: `deploy/cloud/render`
- Plan: Free
- Set environment variables:

```
DATABASE_URL=<Internal Database URL from step 1>
APP_KEY=<your 32-char secret>
APP_ENV=production
```

### 3. Deploy

Render auto-deploys on push to `main`. First deploy takes ~5 min.

## Limitations (Free Tier)

- Service spins down after 15 min of inactivity
- 512 MiB RAM — NocoBase runs lean but avoid heavy plugin stacks
- 750 hrs/month compute (enough for one always-on service)
- 1 GB PostgreSQL storage

## render.yaml (Blueprint)

See `render.yaml` in this directory for one-click deploy config.

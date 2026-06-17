# Self-Hosted Deployment Path

This path covers deploying `dir` on your own hardware, a VPS, or a bare-metal server.

## Requirements

- Linux (Ubuntu 22.04 LTS or Debian 12 recommended)
- Docker >= 24.x
- Docker Compose >= 2.x
- 2 GB RAM minimum (4 GB recommended)
- Domain name + DNS access (for SSL)

## Quick Start

```bash
git clone https://github.com/5mil/dir.git
cd dir/deploy/self-hosted
cp .env.example .env
# Edit .env with your database credentials and domain
docker-compose up -d
```

## Stack

- **NocoBase** — app server on port 13000
- **PostgreSQL 15** — database
- **Nginx** — reverse proxy
- **Certbot / Let's Encrypt** — SSL

## Environment Variables

See `.env.example` for all required variables.

## SSL Setup

```bash
sudo certbot --nginx -d yourdomain.com
```

## Backup

```bash
docker exec dir-postgres pg_dump -U dir_user dir_db > backup_$(date +%Y%m%d).sql
yarn nocobase dump --output ./backups
```

## Health Check

```bash
docker-compose ps
curl http://localhost:13000/api/app:getInfo
```

## Production Checklist

- [ ] SSL/TLS via Certbot
- [ ] Database credentials rotated
- [ ] PM2 or Docker health checks enabled
- [ ] Rate limiting on AI/API endpoints
- [ ] GDPR compliance review
- [ ] Automated daily backups
- [ ] Firewall configured (ufw)

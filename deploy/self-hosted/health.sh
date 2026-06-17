#!/usr/bin/env bash
# dir Health Check — container states + API ping + disk

echo "╔══════════════════════════════════════════╗"
echo "║         dir Health Check                 ║"
echo "╠══════════════════════════════════════════╣"

for service in dir-postgres dir-redis dir-app; do
  STATUS=$(docker inspect --format='{{.State.Status}}' "$service" 2>/dev/null || echo "not found")
  HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "$service" 2>/dev/null || echo "n/a")
  printf "║  %-15s %-10s health:%-9s║\n" "$service" "$STATUS" "$HEALTH"
done

echo "╠══════════════════════════════════════════╣"

HTTP=$(curl -so /dev/null -w "%{http_code}" http://127.0.0.1:13000/api/health 2>/dev/null || echo "000")
printf "║  API /health            HTTP %-13s║\n" "$HTTP"

DF=$(df -h /opt/dir 2>/dev/null | awk 'NR==2{printf "used=%-6s avail=%s", $3,$4}' || echo "n/a")
printf "║  Disk: %-34s║\n" "$DF"

echo "╚══════════════════════════════════════════╝"

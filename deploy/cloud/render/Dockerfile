# =============================================================
# dir — Render Dockerfile
# Wraps official NocoBase image with Render port conventions
# =============================================================
FROM nocobase/nocobase:latest

# Render assigns PORT env var; NocoBase uses APP_PORT
# The entrypoint respects APP_PORT=10000 set in render.yaml
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD wget -qO- http://localhost:10000/api/health || exit 1

#!/usr/bin/env bash
# =============================================================
# dir Self-Hosted Installer
# Installs Docker, Docker Compose, NocoBase + PostgreSQL,
# Nginx reverse proxy on any Debian/Ubuntu or RHEL/Fedora host.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/5mil/dir/self-hosted/deploy/self-hosted/install.sh | sudo bash
#   -- or --
#   sudo ./install.sh [--domain example.com] [--email admin@example.com]
#
# What it does:
#   1. Detects OS (apt / dnf / pacman)
#   2. Installs Docker + Docker Compose plugin
#   3. Copies compose stack to /opt/dir
#   4. Generates .env from template (random secrets)
#   5. Pulls images + starts stack
#   6. Configures Nginx reverse proxy
#   7. Installs dir-backup.service (systemd daily backup)
#   8. Prints access URL
# =============================================================
set -euo pipefail

DOMAIN=""
EMAIL=""
INSTALL_DIR="/opt/dir"
COMPOSE_FILE="$INSTALL_DIR/deploy/self-hosted/docker-compose.yml"
ENV_FILE="$INSTALL_DIR/deploy/self-hosted/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2";  shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

info()  { echo -e "\033[0;34m[dir]\033[0m $*"; }
ok()    { echo -e "\033[0;32m[ OK]\033[0m $*"; }
warn()  { echo -e "\033[0;33m[WARN]\033[0m $*"; }
err()   { echo -e "\033[0;31m[ERR]\033[0m $*"; exit 1; }

detect_os() {
  if   command -v apt-get &>/dev/null; then echo apt
  elif command -v dnf     &>/dev/null; then echo dnf
  elif command -v pacman  &>/dev/null; then echo pacman
  else err "Unsupported package manager"; fi
}

install_docker_apt() {
  info "Installing Docker (apt)..."
  apt-get update -qq
  apt-get install -yq ca-certificates curl gnupg lsb-release
  install -m0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -yq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
}

install_docker_dnf() {
  info "Installing Docker (dnf)..."
  dnf -y install dnf-plugins-core
  dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
  dnf -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
}

install_docker_pacman() {
  info "Installing Docker (pacman)..."
  pacman -Sy --noconfirm docker docker-compose
  systemctl enable --now docker
}

generate_secret() {
  openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

info "=== dir Self-Hosted Installer ==="
info "Install directory: $INSTALL_DIR"

OS=$(detect_os)
if ! command -v docker &>/dev/null; then
  case $OS in
    apt)    install_docker_apt    ;;
    dnf)    install_docker_dnf    ;;
    pacman) install_docker_pacman ;;
  esac
  ok "Docker installed"
else
  ok "Docker already present: $(docker --version)"
fi

systemctl enable --now docker

info "Preparing $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

if [[ -d "$SCRIPT_DIR" && "$SCRIPT_DIR" != "$INSTALL_DIR/deploy/self-hosted" ]]; then
  cp -r "$SCRIPT_DIR" "$INSTALL_DIR/deploy/"
  ok "Files copied to $INSTALL_DIR"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  info "Generating .env..."
  DB_PASS=$(generate_secret)
  JWT_SECRET=$(generate_secret)
  ENCRYPTION_KEY=$(generate_secret)
  sed \
    -e "s|__DB_PASSWORD__|$DB_PASS|g" \
    -e "s|__JWT_SECRET__|$JWT_SECRET|g" \
    -e "s|__ENCRYPTION_KEY__|$ENCRYPTION_KEY|g" \
    -e "s|__DOMAIN__|${DOMAIN:-localhost}|g" \
    "$INSTALL_DIR/deploy/self-hosted/.env.example" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok ".env generated with random secrets"
else
  warn ".env already exists — skipping generation"
fi

info "Starting dir stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
ok "dir stack started"

if command -v nginx &>/dev/null || apt-get install -yq nginx 2>/dev/null || dnf -y install nginx 2>/dev/null; then
  info "Configuring Nginx..."
  NGINX_CONF="/etc/nginx/sites-available/dir"
  EFFECTIVE_DOMAIN="${DOMAIN:-localhost}"
  cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name $EFFECTIVE_DOMAIN;
    client_max_body_size 100M;
    location / {
        proxy_pass         http://127.0.0.1:13000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINXEOF
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/dir 2>/dev/null || true
  nginx -t && systemctl reload nginx
  ok "Nginx configured for $EFFECTIVE_DOMAIN"
fi

if [[ -f "$INSTALL_DIR/deploy/self-hosted/services/dir-backup.service" ]]; then
  cp "$INSTALL_DIR/deploy/self-hosted/services/dir-backup.service" /etc/systemd/system/
  cp "$INSTALL_DIR/deploy/self-hosted/services/dir-backup.timer"   /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable --now dir-backup.timer
  ok "Daily backup timer enabled"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       dir Self-Hosted — ONLINE           ║"
echo "╠══════════════════════════════════════════╣"
EFFECTIVE_URL="http://${DOMAIN:-localhost}:13000"
printf "║  URL:     %-31s║\n" "$EFFECTIVE_URL"
printf "║  API:     %-31s║\n" "$EFFECTIVE_URL/api"
printf "║  Logs:    %-31s║\n" "docker compose logs -f"
printf "║  Backup:  %-31s║\n" "./backup.sh"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  First login: create admin at $EFFECTIVE_URL/admin"
echo ""

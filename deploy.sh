#!/usr/bin/env bash
# IFSUV deploy script — VPS OVH Ubuntu, Docker Compose.
#
# Usage:
#   ./deploy.sh init <vps-host> <domain> [vps-user]   # première installation
#   ./deploy.sh update <vps-host>                      # git pull + rebuild + up
#   ./deploy.sh logs <vps-host> [service]              # follow logs
#   ./deploy.sh restart <vps-host>                     # restart all services
#   ./deploy.sh shell <vps-host>                       # open ssh shell in /opt/ifsuv
#   ./deploy.sh status <vps-host>                      # docker compose ps + health
#
# vps-user défaut: deploy
# Variables d'env supportées (peuvent venir de .env.deploy local) :
#   IFSUV_VPS_HOST, IFSUV_VPS_USER, IFSUV_DOMAIN, IFSUV_GIT_REPO

set -euo pipefail

# ----- Constantes -----
REMOTE_DIR="/opt/ifsuv"
COMPOSE_FILE="docker/compose.prod.yml"
ENV_FILE=".env.production"
LOCAL_SECRETS="${HOME}/.ifsuv-vps-config"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ----- Charger .env.deploy local s'il existe -----
if [ -f "$(dirname "$0")/.env.deploy" ]; then
    # shellcheck disable=SC1091
    source "$(dirname "$0")/.env.deploy"
fi

log() { echo -e "${BLUE}[deploy]${NC} $*"; }
ok() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err() { echo -e "${RED}[deploy]${NC} $*" >&2; }

usage() {
    head -n 20 "$0" | grep -E '^# (Usage|  )' | sed 's/^# //'
    exit 1
}

# ----- Parse args -----
CMD="${1:-}"
[ -z "$CMD" ] && usage

VPS_HOST="${2:-${IFSUV_VPS_HOST:-}}"
VPS_USER="${IFSUV_VPS_USER:-deploy}"
DOMAIN="${3:-${IFSUV_DOMAIN:-}}"

if [ -z "$VPS_HOST" ]; then
    err "VPS host requis (arg ou IFSUV_VPS_HOST)"
    exit 1
fi

SSH="ssh -o StrictHostKeyChecking=accept-new ${VPS_USER}@${VPS_HOST}"

# ----- Helpers SSH -----
remote() {
    # shellcheck disable=SC2029
    $SSH "$@"
}

remote_compose() {
    remote "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} $*"
}

# ----- Commandes -----

cmd_init() {
    [ -z "$DOMAIN" ] && { err "DOMAIN requis pour init (arg 3 ou IFSUV_DOMAIN)"; exit 1; }
    GIT_REPO="${IFSUV_GIT_REPO:-https://github.com/CHANGE_ME/ifsuv.git}"

    log "Init IFSUV sur ${VPS_USER}@${VPS_HOST} (domaine: ${DOMAIN})"

    # 1. Install Docker + git si absents
    log "Vérification Docker / git côté VPS…"
    remote bash -s <<'EOF'
set -e
if ! command -v docker >/dev/null 2>&1; then
    echo "[remote] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$USER" || true
fi
if ! command -v git >/dev/null 2>&1; then
    echo "[remote] Installing git..."
    apt-get update -qq && apt-get install -y -qq git
fi
EOF

    # 2. Clone le repo si absent
    log "Clone du repo dans ${REMOTE_DIR}…"
    remote bash -s "$GIT_REPO" "$REMOTE_DIR" <<'EOF'
set -e
GIT_REPO="$1"
REMOTE_DIR="$2"
if [ ! -d "$REMOTE_DIR/.git" ]; then
    sudo mkdir -p "$REMOTE_DIR"
    sudo chown "$USER:$USER" "$REMOTE_DIR"
    git clone "$GIT_REPO" "$REMOTE_DIR"
fi
EOF

    # 3. Génère .env.production depuis le template
    log "Génération du .env.production…"
    MONGO_USER="ifsuv$(openssl rand -hex 4)"
    MONGO_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

    remote bash -s "$REMOTE_DIR" "$DOMAIN" "$MONGO_USER" "$MONGO_PASS" <<'EOF'
set -e
REMOTE_DIR="$1"
DOMAIN="$2"
MONGO_USER="$3"
MONGO_PASS="$4"
cd "$REMOTE_DIR"
if [ ! -f .env.production ]; then
    cp .env.production.template .env.production
    sed -i "s|ifsuv\.example\.com|${DOMAIN}|g" .env.production
    sed -i "s|MONGO_INITDB_ROOT_USERNAME=CHANGE_ME_USER|MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}|" .env.production
    sed -i "s|MONGO_INITDB_ROOT_PASSWORD=CHANGE_ME_PASS|MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASS}|" .env.production
    sed -i "s|CHANGE_ME_USER:CHANGE_ME_PASS|${MONGO_USER}:${MONGO_PASS}|" .env.production
    chmod 600 .env.production
    echo "[remote] .env.production créé. ÉDITER À LA MAIN pour MAILER_USER/PASS."
else
    echo "[remote] .env.production existe déjà — laissé inchangé."
fi
EOF

    # 4. Sauvegarde des secrets locaux
    log "Sauvegarde secrets dans ${LOCAL_SECRETS}…"
    cat > "${LOCAL_SECRETS}" <<EOF
# IFSUV deploy secrets — généré $(date)
IFSUV_VPS_HOST=${VPS_HOST}
IFSUV_VPS_USER=${VPS_USER}
IFSUV_DOMAIN=${DOMAIN}
MONGO_USER=${MONGO_USER}
MONGO_PASS=${MONGO_PASS}
EOF
    chmod 600 "${LOCAL_SECRETS}"

    # 5. Build + up
    log "docker compose build + up…"
    remote_compose build
    remote_compose up -d

    # 6. Vérification
    sleep 5
    remote_compose ps

    ok "Init terminé. Édite ${REMOTE_DIR}/.env.production sur le VPS pour MAILER_USER/PASS,"
    ok "puis lance : ./deploy.sh restart ${VPS_HOST}"
    ok "URL: https://${DOMAIN}"
    ok "Healthcheck: curl https://${DOMAIN}/api/v1/health"
}

cmd_update() {
    log "Update IFSUV sur ${VPS_USER}@${VPS_HOST}…"
    remote "cd ${REMOTE_DIR} && git pull"
    log "docker compose build…"
    remote_compose build
    log "docker compose up -d…"
    remote_compose up -d
    log "Healthcheck…"
    sleep 3
    if remote "curl -fsS http://localhost/api/v1/health" >/dev/null 2>&1; then
        ok "Update OK — API healthy."
    else
        warn "Healthcheck échoué (peut prendre quelques secondes de plus)."
    fi
}

cmd_logs() {
    SERVICE="${3:-}"
    if [ -n "$SERVICE" ]; then
        remote_compose logs -f "$SERVICE"
    else
        remote_compose logs -f
    fi
}

cmd_restart() {
    log "Restart tous services…"
    remote_compose down
    remote_compose up -d
    ok "Restart OK."
}

cmd_shell() {
    log "SSH dans ${REMOTE_DIR}…"
    # shellcheck disable=SC2029
    ssh -t "${VPS_USER}@${VPS_HOST}" "cd ${REMOTE_DIR} && bash"
}

cmd_status() {
    remote_compose ps
}

# ----- Dispatch -----
case "$CMD" in
    init) cmd_init ;;
    update) cmd_update ;;
    logs) cmd_logs "$@" ;;
    restart) cmd_restart ;;
    shell) cmd_shell ;;
    status) cmd_status ;;
    *) usage ;;
esac

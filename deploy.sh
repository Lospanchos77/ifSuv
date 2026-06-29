#!/usr/bin/env bash
# IFSUV deploy script — VPS OVH Ubuntu, Docker Compose.
#
# Usage:
#   ./deploy.sh init <vps-host>        # première installation (interactif : hôte/IP/domaine/port/TLS)
#   ./deploy.sh config <vps-host>      # changer hôte/IP/domaine/port/TLS (interactif, réajustable)
#   ./deploy.sh update <vps-host>      # git pull + rebuild + up
#   ./deploy.sh logs <vps-host> [svc]  # follow logs
#   ./deploy.sh restart <vps-host>     # restart all services
#   ./deploy.sh shell <vps-host>       # open ssh shell in /opt/ifsuv
#   ./deploy.sh status <vps-host>      # docker compose ps
#
# vps-user défaut: deploy
# Variables d'env (optionnelles, pré-remplissent les prompts ; .env.deploy ou ~/.ifsuv-vps-config) :
#   IFSUV_VPS_HOST, IFSUV_VPS_USER, IFSUV_GIT_REPO
#   IFSUV_DOMAIN (hôte public IP ou domaine), IFSUV_BIND_IP, IFSUV_HTTPS_PORT, IFSUV_TLS_MODE
#   OVH_ENDPOINT, OVH_APPLICATION_KEY, OVH_APPLICATION_SECRET, OVH_CONSUMER_KEY

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
BOLD='\033[1m'
NC='\033[0m'

# ----- Charger config : valeurs sauvées à l'init (~/.ifsuv-vps-config) PUIS .env.deploy
#       (qui a priorité). Permet à config/update/status de réutiliser les valeurs. -----
# shellcheck disable=SC1090
[ -f "${LOCAL_SECRETS}" ] && source "${LOCAL_SECRETS}"
if [ -f "$(dirname "$0")/.env.deploy" ]; then
    # shellcheck disable=SC1091
    source "$(dirname "$0")/.env.deploy"
fi

log() { echo -e "${BLUE}[deploy]${NC} $*"; }
ok() { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err() { echo -e "${RED}[deploy]${NC} $*" >&2; }

usage() {
    grep -E '^#   \./deploy\.sh|^# Usage' "$0" | sed 's/^# \?//'
    exit 1
}

# ----- Parse args -----
CMD="${1:-}"
[ -z "$CMD" ] && usage

VPS_HOST="${2:-${IFSUV_VPS_HOST:-}}"
VPS_USER="${IFSUV_VPS_USER:-deploy}"

# Config déploiement (pré-remplie par env / .env.deploy / ~/.ifsuv-vps-config) :
DOMAIN="${IFSUV_DOMAIN:-}"
BIND_IP="${IFSUV_BIND_IP:-}"
HTTPS_PORT="${IFSUV_HTTPS_PORT:-8443}"
TLS_MODE="${IFSUV_TLS_MODE:-}"
TLS_CONF=""
OVH_ENDPOINT="${OVH_ENDPOINT:-}"
OVH_APPLICATION_KEY="${OVH_APPLICATION_KEY:-}"
OVH_APPLICATION_SECRET="${OVH_APPLICATION_SECRET:-}"
OVH_CONSUMER_KEY="${OVH_CONSUMER_KEY:-}"

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
    # --env-file : interpolation des ${...} du compose (DOMAIN, IFSUV_BIND_IP, mongo, OVH, CADDY_TLS_CONF...).
    remote "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} $*"
}

# ----- Helpers prompts interactifs -----
ask() { # prompt default  -> echoes value (default si vide)
    local prompt="$1" def="${2:-}" ans
    if [ -n "$def" ]; then
        read -r -p "$(echo -e "  ${YELLOW}${prompt}${NC} [${def}]: ")" ans
        echo "${ans:-$def}"
    else
        read -r -p "$(echo -e "  ${YELLOW}${prompt}${NC}: ")" ans
        echo "$ans"
    fi
}

ask_secret() { # prompt current -> echoes value (garde l'actuel si vide)
    local prompt="$1" cur="${2:-}" ans hint=""
    [ -n "$cur" ] && hint=" [garder l'actuel]"
    read -r -s -p "$(echo -e "  ${YELLOW}${prompt}${NC}${hint}: ")" ans
    echo "" >&2
    echo "${ans:-$cur}"
}

is_ip() { echo "$1" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; }

# Recharge les valeurs de config courantes depuis le .env.production distant (défauts des prompts).
load_remote_config() {
    local kv
    kv=$(remote "cd ${REMOTE_DIR} && grep -E '^(DOMAIN|IFSUV_BIND_IP|CADDY_HTTPS_PORT|CADDY_TLS_MODE|OVH_ENDPOINT|OVH_APPLICATION_KEY|OVH_APPLICATION_SECRET|OVH_CONSUMER_KEY)=' ${ENV_FILE}") \
        || { err "Impossible de lire ${REMOTE_DIR}/${ENV_FILE} (lance d'abord: ./deploy.sh init ${VPS_HOST})"; exit 1; }
    local k v
    while IFS='=' read -r k v; do
        case "$k" in
            DOMAIN) DOMAIN="${DOMAIN:-$v}" ;;
            IFSUV_BIND_IP) BIND_IP="${BIND_IP:-$v}" ;;
            CADDY_HTTPS_PORT) HTTPS_PORT="${HTTPS_PORT:-$v}" ;;
            CADDY_TLS_MODE) TLS_MODE="${TLS_MODE:-$v}" ;;
            OVH_ENDPOINT) OVH_ENDPOINT="${OVH_ENDPOINT:-$v}" ;;
            OVH_APPLICATION_KEY) OVH_APPLICATION_KEY="${OVH_APPLICATION_KEY:-$v}" ;;
            OVH_APPLICATION_SECRET) OVH_APPLICATION_SECRET="${OVH_APPLICATION_SECRET:-$v}" ;;
            OVH_CONSUMER_KEY) OVH_CONSUMER_KEY="${OVH_CONSUMER_KEY:-$v}" ;;
        esac
    done <<< "$kv"
}

# Prompts : hôte (IP/domaine), mode TLS, bind IP, port, creds OVH si Let's Encrypt.
prompt_config() {
    echo ""
    echo -e "  ${BOLD}Configuration de l'accès IFSUV${NC}  (Entrée = garder la valeur entre crochets)"
    echo ""

    DOMAIN=$(ask "Hôte public — IP ou domaine (ex. 51.83.12.34 ou ifsuv.if77.fr)" "$DOMAIN")
    [ -z "$DOMAIN" ] && { err "Hôte requis"; exit 1; }

    if is_ip "$DOMAIN"; then
        warn "IP détectée → Let's Encrypt impossible (pas de certificat pour une IP nue)."
        warn "TLS = certificat interne auto-signé Caddy (avertissement navigateur jusqu'à l'import de la racine)."
        TLS_MODE="internal"
        [ -z "$BIND_IP" ] && BIND_IP="$DOMAIN"
    else
        TLS_MODE=$(ask "Mode TLS [letsencrypt/internal]" "${TLS_MODE:-letsencrypt}")
    fi

    BIND_IP=$(ask "IP réseau du serveur sur laquelle écouter (bind Docker)" "${BIND_IP:-$DOMAIN}")
    is_ip "$BIND_IP" || { err "Le bind doit être une IP (reçu: $BIND_IP)"; exit 1; }

    HTTPS_PORT=$(ask "Port HTTPS" "${HTTPS_PORT:-8443}")

    if [ "$TLS_MODE" = "letsencrypt" ]; then
        TLS_CONF="tls.le.conf"
        echo ""
        log "Let's Encrypt DNS-01 OVH — token API (créer sur https://api.ovh.com/createToken/, droits zone DNS)"
        OVH_ENDPOINT=$(ask "OVH endpoint" "${OVH_ENDPOINT:-ovh-eu}")
        OVH_APPLICATION_KEY=$(ask_secret "OVH application key" "$OVH_APPLICATION_KEY")
        OVH_APPLICATION_SECRET=$(ask_secret "OVH application secret" "$OVH_APPLICATION_SECRET")
        OVH_CONSUMER_KEY=$(ask_secret "OVH consumer key" "$OVH_CONSUMER_KEY")
    else
        TLS_CONF="tls.internal.conf"
        TLS_MODE="internal"
    fi

    echo ""
    echo -e "  ${BOLD}Récapitulatif${NC}"
    echo -e "    Hôte public    : ${GREEN}${DOMAIN}${NC}"
    echo -e "    Bind / port    : ${GREEN}${BIND_IP}:${HTTPS_PORT}${NC}"
    echo -e "    Mode TLS       : ${GREEN}${TLS_MODE}${NC}"
    echo -e "    URL d'accès    : ${GREEN}https://${DOMAIN}:${HTTPS_PORT}${NC}"
    [ "$TLS_MODE" = "letsencrypt" ] && echo -e "    Pré-requis DNS : ${YELLOW}record A ${DOMAIN} → ${BIND_IP}${NC}"
    echo ""
    read -r -p "$(echo -e "  ${YELLOW}Confirmer ? (o/n): ${NC}")" c
    [ "$c" != "o" ] && [ "$c" != "O" ] && { echo "Annulé."; exit 0; }
}

# Quoting sûr pour transporter une valeur vers le shell distant (espaces, quotes, &, \, *).
qq() { printf '%q' "${1:-}"; }

# Écrit/MAJ les clés de config dans le .env.production distant (idempotent).
# Les valeurs passent en variables d'env quotées (%q) — pas en args positionnels
# reconcaténés par SSH — et setkv échappe la RHS sed (& | \).
apply_config_remote() {
    log "Mise à jour de ${REMOTE_DIR}/${ENV_FILE}…"
    local url="https://${DOMAIN}:${HTTPS_PORT}" envp
    envp="REMOTE_DIR=$(qq "$REMOTE_DIR") F=$(qq "$ENV_FILE")"
    envp="$envp DOMAIN=$(qq "$DOMAIN") BIND_IP=$(qq "$BIND_IP") PORT=$(qq "$HTTPS_PORT")"
    envp="$envp TLS_MODE=$(qq "$TLS_MODE") TLS_CONF=$(qq "$TLS_CONF") URL=$(qq "$url")"
    envp="$envp OVH_ENDPOINT=$(qq "$OVH_ENDPOINT") OVH_AK=$(qq "$OVH_APPLICATION_KEY")"
    envp="$envp OVH_AS=$(qq "$OVH_APPLICATION_SECRET") OVH_CK=$(qq "$OVH_CONSUMER_KEY")"
    remote "$envp bash -s" <<'EOF'
set -e
cd "$REMOTE_DIR"
setkv() {
    # Supprime l'ancienne ligne (seul le KEY contrôlé passe par sed) puis ré-ajoute
    # la valeur via printf : aucune valeur ne touche jamais la RHS de sed (& | \ sûrs).
    local key="$1" val="$2"
    sed -i "/^${key}=/d" "$F"
    printf '%s=%s\n' "$key" "$val" >> "$F"
}
setkv DOMAIN "$DOMAIN"
setkv IFSUV_BIND_IP "$BIND_IP"
setkv CADDY_HTTPS_PORT "$PORT"
setkv CADDY_TLS_MODE "$TLS_MODE"
setkv CADDY_TLS_CONF "$TLS_CONF"
setkv CORS_ORIGIN "$URL"
setkv APP_URL "$URL"
if [ "$TLS_MODE" = "letsencrypt" ]; then
    setkv OVH_ENDPOINT "$OVH_ENDPOINT"
    setkv OVH_APPLICATION_KEY "$OVH_AK"
    setkv OVH_APPLICATION_SECRET "$OVH_AS"
    setkv OVH_CONSUMER_KEY "$OVH_CK"
fi
chmod 600 "$F"
echo "[remote] ${F} : DOMAIN=$DOMAIN bind=$BIND_IP:$PORT tls=$TLS_MODE"
EOF
}

# Vérifie Docker accessible côté VPS (groupe docker actif).
check_docker() {
    if ! remote "docker info" >/dev/null 2>&1; then
        err "Docker non accessible pour ${VPS_USER}@${VPS_HOST}."
        err "Si Docker vient d'être installé, le groupe 'docker' n'est actif qu'à la prochaine session SSH."
        err "Reconnecte ${VPS_USER} (ou ajoute-le au groupe docker), puis relance."
        exit 1
    fi
}

healthcheck() {
    if [ -n "$DOMAIN" ] && [ -n "$BIND_IP" ]; then
        # -k : en mode internal le cert est auto-signé. --resolve : tape l'IP:port via le nom d'hôte.
        if remote "curl -fsSk --resolve ${DOMAIN}:${HTTPS_PORT}:${BIND_IP} https://${DOMAIN}:${HTTPS_PORT}/api/v1/health" >/dev/null 2>&1; then
            ok "API healthy — https://${DOMAIN}:${HTTPS_PORT}"
        else
            warn "Healthcheck KO (démarrage en cours, ou cert pas encore émis)."
        fi
    else
        warn "DOMAIN/BIND_IP inconnus — healthcheck sauté. Vérifie : ./deploy.sh status ${VPS_HOST}"
    fi
}

# ----- Commandes -----

cmd_init() {
    GIT_REPO="${IFSUV_GIT_REPO:-https://github.com/Lospanchos77/ifSuv.git}"

    prompt_config

    log "Init IFSUV sur ${VPS_USER}@${VPS_HOST}…"

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

    # 3. Génère le .env.production de base (creds Mongo) s'il n'existe pas
    log "Génération du .env.production (creds Mongo)…"
    MONGO_USER="ifsuv$(openssl rand -hex 4)"
    MONGO_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)
    remote bash -s "$REMOTE_DIR" "$MONGO_USER" "$MONGO_PASS" <<'EOF'
set -e
REMOTE_DIR="$1"; MONGO_USER="$2"; MONGO_PASS="$3"
cd "$REMOTE_DIR"
if [ ! -f .env.production ]; then
    cp .env.production.template .env.production
    sed -i "s|MONGO_INITDB_ROOT_USERNAME=CHANGE_ME_USER|MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}|" .env.production
    sed -i "s|MONGO_INITDB_ROOT_PASSWORD=CHANGE_ME_PASS|MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASS}|" .env.production
    sed -i "s|CHANGE_ME_USER:CHANGE_ME_PASS|${MONGO_USER}:${MONGO_PASS}|" .env.production
    chmod 600 .env.production
    echo "[remote] .env.production initial créé."
else
    echo "[remote] .env.production existe déjà — creds Mongo conservés."
fi
EOF

    # 4. Applique la config interactive (hôte/IP/port/TLS/OVH)
    apply_config_remote

    # 5. Sauvegarde des valeurs locales (réutilisées par config/update)
    log "Sauvegarde dans ${LOCAL_SECRETS}…"
    cat > "${LOCAL_SECRETS}" <<EOF
# IFSUV deploy — généré $(date)
IFSUV_VPS_HOST=${VPS_HOST}
IFSUV_VPS_USER=${VPS_USER}
IFSUV_DOMAIN=${DOMAIN}
IFSUV_BIND_IP=${BIND_IP}
IFSUV_HTTPS_PORT=${HTTPS_PORT}
IFSUV_TLS_MODE=${TLS_MODE}
MONGO_USER=${MONGO_USER}
MONGO_PASS=${MONGO_PASS}
EOF
    chmod 600 "${LOCAL_SECRETS}"

    # 6. Build + up
    check_docker
    log "docker compose build + up…"
    remote_compose build
    remote_compose up -d

    sleep 5
    remote_compose ps

    ok "Init terminé."
    ok "Édite ${REMOTE_DIR}/.env.production pour MAILER_USER/MAILER_PASS (SMTP IONOS), puis : ./deploy.sh restart ${VPS_HOST}"
    [ "$TLS_MODE" = "letsencrypt" ] && ok "Pré-requis DNS : record A ${DOMAIN} → ${BIND_IP}"
    ok "URL: https://${DOMAIN}:${HTTPS_PORT}"
    ok "Healthcheck: curl -k --resolve ${DOMAIN}:${HTTPS_PORT}:${BIND_IP} https://${DOMAIN}:${HTTPS_PORT}/api/v1/health"
}

cmd_config() {
    # Repartir de l'état LIVE du VPS (et non du cache local ~/.ifsuv-vps-config
    # éventuellement périmé) : on vide ces clés pour que load_remote_config les
    # remplisse depuis le .env.production distant.
    DOMAIN=""; BIND_IP=""; HTTPS_PORT=""; TLS_MODE=""
    OVH_ENDPOINT=""; OVH_APPLICATION_KEY=""; OVH_APPLICATION_SECRET=""; OVH_CONSUMER_KEY=""
    load_remote_config
    prompt_config
    apply_config_remote
    check_docker
    log "Recréation des containers avec la nouvelle config…"
    remote_compose up -d
    sleep 3
    healthcheck
    ok "Config mise à jour — URL: https://${DOMAIN}:${HTTPS_PORT}"
    if [ "$TLS_MODE" = "letsencrypt" ]; then
        ok "Vérifie le record A ${DOMAIN} → ${BIND_IP} et l'émission du cert : ./deploy.sh logs ${VPS_HOST} caddy"
    fi
}

cmd_update() {
    log "Update IFSUV sur ${VPS_USER}@${VPS_HOST}…"
    remote "cd ${REMOTE_DIR} && git pull"
    check_docker
    log "docker compose build…"
    remote_compose build
    log "docker compose up -d…"
    remote_compose up -d
    log "Healthcheck…"
    sleep 3
    healthcheck
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
    config) cmd_config ;;
    update) cmd_update ;;
    logs) cmd_logs "$@" ;;
    restart) cmd_restart ;;
    shell) cmd_shell ;;
    status) cmd_status ;;
    *) usage ;;
esac

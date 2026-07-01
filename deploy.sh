#!/usr/bin/env bash
# IFSUV — installeur self-contained, à lancer SUR LE SERVEUR (Ubuntu 22.04+).
#
# Première installation :
#   git clone https://github.com/Lospanchos77/ifSuv.git /opt/ifsuv
#   cd /opt/ifsuv
#   sudo bash deploy.sh
#
# Le script pose les questions PENDANT le déploiement (hôte IP/domaine, port, mode
# TLS, creds OVH si Let's Encrypt, SMTP), installe Docker si besoin (avec
# confirmation), génère .env.production, build et démarre. Cohabite avec un Nginx
# natif déjà en place (n'occupe que IFSUV_BIND_IP:8443, jamais 80/443).
#
# Autres commandes :
#   sudo bash deploy.sh config     # re-poser les questions et réappliquer
#   sudo bash deploy.sh update     # git pull + rebuild + redémarrage
#   sudo bash deploy.sh logs [svc] # logs (suivi)
#   sudo bash deploy.sh restart    # redémarrage
#   sudo bash deploy.sh status     # état des containers

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${REPO_DIR}/docker/compose.prod.yml"
ENV_FILE="${REPO_DIR}/.env.production"
TEMPLATE="${REPO_DIR}/.env.production.template"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()    { echo -e "${BLUE}[ifsuv]${NC} $*"; }
ok()     { echo -e "${GREEN}[ifsuv]${NC} $*"; }
warn()   { echo -e "${YELLOW}[ifsuv]${NC} $*"; }
err()    { echo -e "${RED}[ifsuv]${NC} $*" >&2; }
header() { echo ""; echo -e "${BOLD}${BLUE}═══ $* ═══${NC}"; }
step()   { echo -e "  ${GREEN}✓${NC} $*"; }

usage() {
    cat >&2 <<'USAGE'
IFSUV — à lancer sur le serveur, en root :
  sudo bash deploy.sh            Install / reconfiguration interactive
  sudo bash deploy.sh config     Re-poser les questions et réappliquer
  sudo bash deploy.sh cert       Renouveler le cert (mode TLS manuel) — affiche le TXT à coller
  sudo bash deploy.sh update     git pull + rebuild + redémarrage
  sudo bash deploy.sh logs [svc] Logs (suivi live)
  sudo bash deploy.sh restart    Redémarrage
  sudo bash deploy.sh status     État des containers
USAGE
    exit 1
}

require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        err "À lancer en root : sudo bash deploy.sh ${CMD}"
        exit 1
    fi
}

# docker compose wrapper — exécuté depuis le repo (résolution non ambiguë des
# chemins relatifs du compose : ./Caddyfile.prod, context: .., env_file: ../...).
dc() { ( cd "$REPO_DIR" && docker compose -f docker/compose.prod.yml --env-file .env.production "$@" ); }

# ----- Config (globals, pré-remplis par env puis par le .env.production existant) -----
DOMAIN="${IFSUV_DOMAIN:-}"
BIND_IP="${IFSUV_BIND_IP:-}"
HTTPS_PORT="${IFSUV_HTTPS_PORT:-8443}"
TLS_MODE="${IFSUV_TLS_MODE:-}"
TLS_CONF=""
OVH_ENDPOINT="${OVH_ENDPOINT:-}"
OVH_APPLICATION_KEY="${OVH_APPLICATION_KEY:-}"
OVH_APPLICATION_SECRET="${OVH_APPLICATION_SECRET:-}"
OVH_CONSUMER_KEY="${OVH_CONSUMER_KEY:-}"
ACME_EMAIL="${ACME_EMAIL:-}"

# ----- Helpers -----
ask() { # prompt [default] -> echoes value (default si vide)
    local prompt="$1" def="${2:-}" ans
    if [ -n "$def" ]; then
        read -r -p "$(echo -e "  ${YELLOW}${prompt}${NC} [${def}]: ")" ans
        echo "${ans:-$def}"
    else
        read -r -p "$(echo -e "  ${YELLOW}${prompt}${NC}: ")" ans
        echo "$ans"
    fi
}
ask_secret() { # prompt [current] -> echoes value (garde l'actuel si vide)
    local prompt="$1" cur="${2:-}" ans hint=""
    [ -n "$cur" ] && hint=" [garder l'actuel]"
    read -r -s -p "$(echo -e "  ${YELLOW}${prompt}${NC}${hint}: ")" ans
    echo "" >&2
    echo "${ans:-$cur}"
}
is_ip() { echo "$1" | grep -qE '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; }

# IP primaire du serveur (proposée par défaut pour l'hôte et le bind).
detect_ip() {
    local ip
    ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')
    [ -z "$ip" ] && ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    echo "$ip"
}

# Lit une clé du .env.production (vide si absent/placeholder).
get_env() {
    [ -f "$ENV_FILE" ] || { echo ""; return 0; }
    local v
    v=$(grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true)
    # Vide uniquement les placeholders EXACTS du template (pas de glob sous-chaîne,
    # qui effacerait un hôte légitime contenant la chaîne).
    case "$v" in CHANGE_ME|CHANGE_ME_IP|CHANGE_ME_USER|CHANGE_ME_PASS|ifsuv.example.com) v="" ;; esac
    echo "$v"
}
# Écrit/MAJ une clé (delete+append : aucune valeur ne passe par la RHS sed).
setkv() {
    sed -i "/^$1=/d" "$ENV_FILE"
    printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"
}

# ----- Prompts -----
prompt_config() {
    # Défauts : valeur déjà fournie (env) sinon .env.production existant sinon IP du serveur.
    [ -z "$DOMAIN" ] && DOMAIN="$(get_env DOMAIN)"
    [ -z "$DOMAIN" ] && DOMAIN="$(detect_ip)"
    [ -z "$BIND_IP" ] && BIND_IP="$(get_env IFSUV_BIND_IP)"
    [ -z "$BIND_IP" ] && BIND_IP="$(detect_ip)"
    [ -z "$TLS_MODE" ] && TLS_MODE="$(get_env CADDY_TLS_MODE)"
    local ep; ep="$(get_env CADDY_HTTPS_PORT)"; [ -n "$ep" ] && HTTPS_PORT="$ep"
    [ -z "$OVH_ENDPOINT" ] && OVH_ENDPOINT="$(get_env OVH_ENDPOINT)"
    [ -z "$OVH_APPLICATION_KEY" ] && OVH_APPLICATION_KEY="$(get_env OVH_APPLICATION_KEY)"
    [ -z "$OVH_APPLICATION_SECRET" ] && OVH_APPLICATION_SECRET="$(get_env OVH_APPLICATION_SECRET)"
    [ -z "$OVH_CONSUMER_KEY" ] && OVH_CONSUMER_KEY="$(get_env OVH_CONSUMER_KEY)"
    [ -z "$ACME_EMAIL" ] && ACME_EMAIL="$(get_env ACME_EMAIL)"

    echo ""
    echo -e "  ${BOLD}Configuration de l'accès IFSUV${NC}  (Entrée = garder la valeur entre crochets)"
    echo ""

    DOMAIN=$(ask "Hôte public — IP ou domaine (ex. 51.83.12.34 ou ifsuv.if77.fr)" "$DOMAIN")
    [ -z "$DOMAIN" ] && { err "Hôte requis"; exit 1; }

    if is_ip "$DOMAIN"; then
        warn "IP détectée → Let's Encrypt impossible (pas de cert pour une IP nue)."
        warn "TLS = certificat interne auto-signé Caddy (avertissement navigateur jusqu'à import de la racine)."
        TLS_MODE="internal"
        [ -z "$BIND_IP" ] && BIND_IP="$DOMAIN"
    else
        TLS_MODE=$(ask "Mode TLS [letsencrypt/manual/internal]" "${TLS_MODE:-letsencrypt}")
    fi

    BIND_IP=$(ask "IP du serveur sur laquelle écouter (bind)" "${BIND_IP:-$DOMAIN}")
    is_ip "$BIND_IP" || { err "Le bind doit être une IP (reçu: $BIND_IP)"; exit 1; }

    HTTPS_PORT=$(ask "Port HTTPS" "${HTTPS_PORT:-8443}")

    case "$TLS_MODE" in
        letsencrypt)
            TLS_CONF="tls.le.conf"
            echo ""
            log "Let's Encrypt DNS-01 OVH (AUTO) — token API (https://api.ovh.com/createToken/, droits zone DNS)"
            OVH_ENDPOINT=$(ask "OVH endpoint" "${OVH_ENDPOINT:-ovh-eu}")
            OVH_APPLICATION_KEY=$(ask_secret "OVH application key" "$OVH_APPLICATION_KEY")
            OVH_APPLICATION_SECRET=$(ask_secret "OVH application secret" "$OVH_APPLICATION_SECRET")
            OVH_CONSUMER_KEY=$(ask_secret "OVH consumer key" "$OVH_CONSUMER_KEY")
            ;;
        manual)
            TLS_CONF="tls.manual.conf"
            echo ""
            log "Let's Encrypt DNS-01 MANUEL : certbot affichera un TXT à coller dans ta zone OVH."
            log "Renouvellement à la main (~60-90 j) : sudo bash deploy.sh cert"
            ACME_EMAIL=$(ask "Email Let's Encrypt (reçoit les rappels d'expiration)" "${ACME_EMAIL:-admin@${DOMAIN}}")
            ;;
        *)
            TLS_MODE="internal"
            TLS_CONF="tls.internal.conf"
            ;;
    esac

    echo ""
    echo -e "  ${BOLD}Récapitulatif${NC}"
    echo -e "    Hôte public  : ${GREEN}${DOMAIN}${NC}"
    echo -e "    Bind / port  : ${GREEN}${BIND_IP}:${HTTPS_PORT}${NC}"
    echo -e "    Mode TLS     : ${GREEN}${TLS_MODE}${NC}"
    echo -e "    URL d'accès  : ${GREEN}https://${DOMAIN}:${HTTPS_PORT}${NC}"
    [ "$TLS_MODE" != "internal" ] && echo -e "    DNS requis   : ${YELLOW}record A ${DOMAIN} → ${BIND_IP}${NC}"
    echo ""
    local c; read -r -p "$(echo -e "  ${YELLOW}Confirmer ? (o/n): ${NC}")" c
    if [ "$c" != "o" ] && [ "$c" != "O" ]; then echo "Annulé."; exit 0; fi
}

prompt_mailer() {
    echo ""
    log "SMTP IONOS (emails de rapport / reset mot de passe). Entrée pour configurer plus tard."
    local cur_u mu mp
    cur_u="$(get_env MAILER_USER)"
    mu="$(ask "MAILER_USER" "$cur_u")"
    if [ -n "$mu" ]; then
        setkv MAILER_USER "$mu"
        mp="$(ask_secret "MAILER_PASS" "")"
        if [ -n "$mp" ]; then setkv MAILER_PASS "$mp"; fi
    fi
}

# ----- Pré-vol + installation Docker -----
preflight_and_docker() {
    log "Pré-vol serveur (lecture seule)…"
    local d_port d_ram d_disk d_net
    if ss -ltnH 2>/dev/null | grep -qE "[:.]${HTTPS_PORT}[[:space:]]"; then d_port=busy; else d_port=free; fi
    d_ram=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}')
    d_disk=$(df -m --output=avail / 2>/dev/null | tail -1 | tr -d ' ')
    if ip route 2>/dev/null | grep -qE '172\.1[78]\.'; then d_net=collision; else d_net=clear; fi

    echo -e "    Port ${HTTPS_PORT} : ${d_port}   RAM dispo : ${d_ram:-?} MB   Disque / : ${d_disk:-?} MB   172.17/18 : ${d_net}"
    if [ "$d_port" = "busy" ]; then warn "Port ${HTTPS_PORT} déjà utilisé → risque de conflit avec un service existant."; fi
    if [ -n "$d_ram" ] && [ "$d_ram" -lt 700 ] 2>/dev/null; then warn "RAM faible (${d_ram} MB) : IFSUV ajoute un 2ᵉ MongoDB + build d'images, surveille l'OOM."; fi
    if [ -n "$d_disk" ] && [ "$d_disk" -lt 4000 ] 2>/dev/null; then warn "Disque faible (${d_disk} MB) : le build Docker peut être serré."; fi
    if [ "$d_net" = "collision" ]; then warn "Le réseau utilise 172.17/172.18 → collision possible avec le bridge docker0."; fi

    if ! command -v docker >/dev/null 2>&1; then
        echo ""
        warn "Docker n'est PAS installé. L'installation modifie iptables (chaînes DOCKER/FORWARD)"
        warn "et active l'IP forwarding au niveau hôte. Tes services natifs (Nginx/Mongo/PM2) ne"
        warn "sont PAS touchés. Snapshot VPS recommandé avant de continuer."
        local c; read -r -p "$(echo -e "  ${YELLOW}Installer Docker maintenant ? (o/n): ${NC}")" c
        if [ "$c" != "o" ] && [ "$c" != "O" ]; then echo "Annulé."; exit 0; fi
        log "Installation de Docker…"
        curl -fsSL https://get.docker.com | sh
    fi
    command -v git >/dev/null 2>&1 || { log "Installation de git…"; apt-get update -qq && apt-get install -y -qq git; }

    if [ "$d_port" = "busy" ]; then
        local c2; read -r -p "$(echo -e "  ${YELLOW}Port ${HTTPS_PORT} occupé — continuer quand même ? (o/n): ${NC}")" c2
        if [ "$c2" != "o" ] && [ "$c2" != "O" ]; then echo "Annulé."; exit 0; fi
    fi
}

# Crée .env.production à partir du template + creds Mongo aléatoires (1ère fois).
ensure_env() {
    [ -f "$ENV_FILE" ] && return 0
    log "Création de ${ENV_FILE} (creds Mongo générés)…"
    cp "$TEMPLATE" "$ENV_FILE"
    local mu mp
    mu="ifsuv$(openssl rand -hex 4)"
    mp="$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"
    setkv MONGO_INITDB_ROOT_USERNAME "$mu"
    setkv MONGO_INITDB_ROOT_PASSWORD "$mp"
    setkv MONGO_URI "mongodb://${mu}:${mp}@mongo:27017/ifsuv_prod?authSource=admin"
    chmod 600 "$ENV_FILE"
    step "Identifiants MongoDB générés"
}

apply_config() {
    # URL publique : on OMET le port quand c'est 443 (défaut HTTPS) → Origin navigateur
    # et liens QR (APP_URL) propres (https://domaine, pas https://domaine:443).
    local url
    if [ "$HTTPS_PORT" = "443" ]; then
        url="https://${DOMAIN}"
    else
        url="https://${DOMAIN}:${HTTPS_PORT}"
    fi
    # QR_TOKEN_SECRET requis par l'API (>= 32 car) — généré s'il manque ou est un placeholder.
    local qr; qr="$(get_env QR_TOKEN_SECRET)"
    if [ "${#qr}" -lt 32 ]; then setkv QR_TOKEN_SECRET "$(openssl rand -hex 32)"; fi
    setkv DOMAIN "$DOMAIN"
    setkv IFSUV_BIND_IP "$BIND_IP"
    setkv CADDY_HTTPS_PORT "$HTTPS_PORT"
    setkv CADDY_TLS_MODE "$TLS_MODE"
    setkv CADDY_TLS_CONF "$TLS_CONF"
    setkv CORS_ORIGIN "$url"
    setkv APP_URL "$url"
    case "$TLS_MODE" in
        letsencrypt)
            setkv OVH_ENDPOINT "$OVH_ENDPOINT"
            setkv OVH_APPLICATION_KEY "$OVH_APPLICATION_KEY"
            setkv OVH_APPLICATION_SECRET "$OVH_APPLICATION_SECRET"
            setkv OVH_CONSUMER_KEY "$OVH_CONSUMER_KEY"
            ;;
        manual)
            setkv ACME_EMAIL "$ACME_EMAIL"
            # purge les secrets OVH (inutiles en manuel, sans warning compose)
            setkv OVH_APPLICATION_KEY ""
            setkv OVH_APPLICATION_SECRET ""
            setkv OVH_CONSUMER_KEY ""
            ;;
        *)
            # Mode internal : purge les éventuels secrets OVH périmés (sans warning compose).
            setkv OVH_APPLICATION_KEY ""
            setkv OVH_APPLICATION_SECRET ""
            setkv OVH_CONSUMER_KEY ""
            ;;
    esac
    chmod 600 "$ENV_FILE"
    step "Configuration écrite dans .env.production"
}

healthcheck() {
    [ -n "$DOMAIN" ] && [ -n "$BIND_IP" ] || return 0
    if curl -fsSk --resolve "${DOMAIN}:${HTTPS_PORT}:${BIND_IP}" "https://${DOMAIN}:${HTTPS_PORT}/api/v1/health" >/dev/null 2>&1; then
        ok "API healthy — https://${DOMAIN}:${HTTPS_PORT}"
    else
        warn "Healthcheck KO (démarrage en cours, ou cert pas encore émis). Voir : sudo bash deploy.sh logs caddy"
    fi
}

summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          DÉPLOIEMENT TERMINÉ AVEC SUCCÈS        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Accès${NC}      : ${GREEN}https://${DOMAIN}:${HTTPS_PORT}${NC}"
    echo -e "  ${BOLD}Bind${NC}       : ${BIND_IP}:${HTTPS_PORT}"
    echo -e "  ${BOLD}Mode TLS${NC}   : ${TLS_MODE}"
    case "$TLS_MODE" in
        letsencrypt) echo -e "  ${BOLD}DNS requis${NC} : ${YELLOW}record A ${DOMAIN} → ${BIND_IP}${NC} (Caddy émet/renouvelle le cert seul)" ;;
        manual)      echo -e "  ${BOLD}Cert${NC}       : Let's Encrypt manuel — renouveler ~tous les 60 j : ${BLUE}sudo bash deploy.sh cert${NC}" ;;
        *)           echo -e "  ${BOLD}Note${NC}       : certificat auto-signé (mode IP) → avertissement navigateur normal" ;;
    esac
    echo -e "  ${BOLD}Config${NC}     : ${ENV_FILE}"
    echo ""
    echo -e "  ${BOLD}Commandes utiles${NC}"
    echo -e "    ${BLUE}sudo bash deploy.sh status${NC}       état des containers"
    echo -e "    ${BLUE}sudo bash deploy.sh logs caddy${NC}   logs (émission du cert TLS)"
    echo -e "    ${BLUE}sudo bash deploy.sh config${NC}       changer hôte / port / TLS"
    echo -e "    ${BLUE}sudo bash deploy.sh update${NC}       git pull + rebuild + redémarrage"
    echo ""
}

# Obtient/renouvelle un cert Let's Encrypt via certbot en challenge DNS-01 MANUEL
# (certbot affiche le TXT à coller dans la zone DNS). $1="force" pour renouveler.
obtain_cert_manual() {
    local force="${1:-}" le_dir="${REPO_DIR}/letsencrypt" email
    email="$(get_env ACME_EMAIL)"; [ -z "$email" ] && email="${ACME_EMAIL:-admin@${DOMAIN}}"
    mkdir -p "$le_dir"
    if [ -f "${le_dir}/live/${DOMAIN}/fullchain.pem" ] && [ "$force" != "force" ]; then
        step "Certificat déjà présent — réutilisé (renouveler : sudo bash deploy.sh cert)."
        return 0
    fi
    command -v certbot >/dev/null 2>&1 || { log "Installation de certbot…"; apt-get update -qq && apt-get install -y -qq certbot; }
    echo ""
    warn "certbot va afficher un enregistrement TXT à créer dans ta zone DNS OVH :"
    warn "   nom : _acme-challenge.${DOMAIN}"
    warn "→ crée-le dans l'espace OVH, attends ~1-2 min de propagation, PUIS appuie sur Entrée dans certbot."
    echo ""
    if ! certbot certonly --manual --preferred-challenges dns -d "$DOMAIN" \
            --config-dir "$le_dir" --work-dir "${le_dir}/work" --logs-dir "${le_dir}/logs" \
            --agree-tos -m "$email" --no-eff-email ${force:+--force-renewal}; then
        err "Échec de l'obtention du certificat (TXT absent/incorrect, pas encore propagé, ou validation KO)."
        err "Vérifie : dig +short TXT _acme-challenge.${DOMAIN}   puis relance : sudo bash deploy.sh cert"
        exit 1
    fi
    step "Certificat obtenu : ${le_dir}/live/${DOMAIN}/"
}

# ----- Commandes -----
cmd_install() {
    require_root
    [ -f "$TEMPLATE" ] || { err "Template introuvable (${TEMPLATE}). Lance ce script depuis le repo cloné (/opt/ifsuv)."; exit 1; }

    echo ""
    echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║          IFSUV — Déploiement (Docker)           ║${NC}"
    echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════╝${NC}"

    header "1/6 — Configuration"
    prompt_config

    header "2/6 — Pré-vol serveur & Docker"
    preflight_and_docker

    header "3/6 — Fichier d'environnement"
    ensure_env
    apply_config
    prompt_mailer

    header "4/6 — Build des images Docker"
    dc build

    header "5/6 — Démarrage des containers"
    if [ "$TLS_MODE" = "manual" ]; then obtain_cert_manual; fi
    dc up -d
    sleep 5
    dc ps

    header "6/6 — Vérification"
    healthcheck
    summary
}

cmd_config() {
    require_root
    [ -f "$ENV_FILE" ] || { err "Pas encore installé (.env.production absent). Lance : sudo bash deploy.sh"; exit 1; }
    prompt_config
    apply_config
    prompt_mailer
    if [ "$TLS_MODE" = "manual" ]; then obtain_cert_manual; fi
    log "Recréation des containers avec la nouvelle config…"
    dc up -d
    sleep 3
    healthcheck
    summary
}

cmd_cert() {
    require_root
    [ -f "$ENV_FILE" ] || { err "Pas encore installé. Lance : sudo bash deploy.sh"; exit 1; }
    DOMAIN="$(get_env DOMAIN)"; BIND_IP="$(get_env IFSUV_BIND_IP)"; HTTPS_PORT="$(get_env CADDY_HTTPS_PORT)"
    if [ "$(get_env CADDY_TLS_MODE)" != "manual" ]; then
        err "Le mode TLS n'est pas 'manual' (renouvellement auto en letsencrypt, inutile en internal)."
        err "Pour basculer en TLS manuel : sudo bash deploy.sh config"
        exit 1
    fi
    obtain_cert_manual force
    log "Redémarrage de Caddy avec le nouveau certificat…"
    dc restart caddy
    sleep 2
    healthcheck
    ok "Certificat renouvelé. À refaire avant la prochaine expiration (~60-90 j)."
}

cmd_update() {
    require_root
    [ -f "$ENV_FILE" ] || { err "Pas encore installé. Lance : sudo bash deploy.sh"; exit 1; }
    log "git pull…"
    git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
    ( cd "$REPO_DIR" && git pull )
    log "Build + redémarrage…"
    dc build
    # --force-recreate : compose/buildx ne recrée pas toujours le container quand
    # SEULE l'image change (même tag) → on force la reprise des images fraîches
    # pour api/web, sinon un `up -d` peut laisser tourner l'ancien code.
    dc up -d --force-recreate --no-deps api web
    dc up -d
    sleep 3
    DOMAIN="$(get_env DOMAIN)"; BIND_IP="$(get_env IFSUV_BIND_IP)"; HTTPS_PORT="$(get_env CADDY_HTTPS_PORT)"
    healthcheck
}

cmd_logs()    { require_root; if [ -n "${1:-}" ]; then dc logs -f "$1"; else dc logs -f; fi; }
cmd_restart() { require_root; dc down; dc up -d; ok "Redémarré."; }
cmd_status()  { require_root; dc ps; }

# ----- Dispatch -----
CMD="${1:-install}"
shift || true
case "$CMD" in
    install|"") cmd_install ;;
    config)     cmd_config ;;
    cert)       cmd_cert ;;
    update)     cmd_update ;;
    logs)       cmd_logs "${1:-}" ;;
    restart)    cmd_restart ;;
    status)     cmd_status ;;
    *)          usage ;;
esac

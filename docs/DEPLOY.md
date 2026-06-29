# IFSUV — Déploiement prod (VPS OVH Ubuntu)

## Architecture prod

```
                  Internet (HTTPS 443)
                         │
                         ▼
            ┌────────────────────────┐
            │  Caddy 2.8 (container) │  ← TLS auto via Let's Encrypt
            └──────────┬─────────────┘
                       │   network bridge "ifsuv-prod"
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │ web     │   │ api      │   │ mongo    │
   │ Caddy   │   │ NestJS   │◄──┤ 7.0      │
   │ :8080   │   │ :3001    │   │ (interne)│
   └─────────┘   └──────────┘   └──────────┘
```

- **Volumes persistants** : `ifsuv-mongo-data`, `caddy-data` (certs), `caddy-config`
- **Port exposés** : 80/443 uniquement (Caddy). API et Mongo ne sont accessibles que via le network interne Docker.
- **Le `.env.production`** sur le VPS dans `/opt/ifsuv/.env.production` (mode 600, jamais commité).

## Prérequis VPS

- **Ubuntu 22.04 LTS** (ou 24.04, fonctionne)
- **SSH key** déposée sur l'utilisateur `deploy` (recommandé, pas root)
- **Domaine** pointant vers l'IP du VPS (record A)
- Ports **80** et **443** ouverts dans le firewall (UFW : `ufw allow 80/tcp && ufw allow 443/tcp`)
- L'utilisateur `deploy` doit pouvoir lancer `docker` (sera ajouté au groupe par `deploy.sh init`)

Note : Docker et Docker Compose sont installés automatiquement par `deploy.sh init` s'ils sont absents.

## Première installation

Depuis ton poste de dev (Windows ou Linux) :

```bash
# 1. Configurer .env.deploy (gitignored) à la racine du repo local
cat > .env.deploy <<EOF
IFSUV_VPS_HOST=monvps.example.com
IFSUV_VPS_USER=deploy
IFSUV_DOMAIN=ifsuv.example.com
IFSUV_GIT_REPO=https://github.com/<toi>/ifsuv.git
EOF

# 2. Lancer l'init
./deploy.sh init monvps.example.com ifsuv.example.com
```

Le script va :

1. SSH sur le VPS, installer Docker + git si absents
2. Cloner le repo dans `/opt/ifsuv`
3. Générer un `.env.production` à partir de `.env.production.template` :
   - Mots de passe Mongo générés aléatoirement (`openssl rand`)
   - Domaine substitué partout
4. Sauvegarder les secrets côté local dans `~/.ifsuv-vps-config` (chmod 600)
5. Lancer `docker compose build && up -d`
6. Afficher l'état des containers

**Action manuelle ensuite** : éditer `/opt/ifsuv/.env.production` sur le VPS pour remplir `MAILER_USER` et `MAILER_PASS` (compte SMTP IONOS), puis :

```bash
./deploy.sh restart monvps.example.com
```

Vérification finale :

```bash
curl https://ifsuv.example.com/api/v1/health
# → {"status":"ok","mongoState":"connected",...}
```

Caddy obtient automatiquement un certificat Let's Encrypt au premier hit HTTPS.

## Mise à jour

Après un push sur `main` :

```bash
./deploy.sh update monvps.example.com
```

Le script :
1. SSH sur le VPS, `git pull` dans `/opt/ifsuv`
2. `docker compose build` (rebuild des images modifiées uniquement)
3. `docker compose up -d` (recreate les containers modifiés)
4. Healthcheck `curl /api/v1/health`

Downtime typique : **< 5 secondes** (le temps que le nouveau container api démarre).

## Commandes courantes

```bash
./deploy.sh logs monvps.example.com               # tous les services, suivi live
./deploy.sh logs monvps.example.com api           # uniquement l'API
./deploy.sh logs monvps.example.com caddy         # uniquement Caddy (debug TLS)
./deploy.sh status monvps.example.com             # docker compose ps
./deploy.sh restart monvps.example.com            # restart tous les containers
./deploy.sh shell monvps.example.com              # ssh interactif dans /opt/ifsuv
```

## Backup MongoDB

À configurer sur le VPS via cron (un script à ajouter dans `/opt/ifsuv/scripts/backup.sh` plus tard, pour Phase 6+) :

```bash
# /etc/cron.daily/ifsuv-mongo-backup
#!/bin/bash
BACKUP_DIR=/var/backups/ifsuv-mongo
mkdir -p $BACKUP_DIR
docker exec ifsuv-mongo mongodump \
    --username "$(grep MONGO_INITDB_ROOT_USERNAME /opt/ifsuv/.env.production | cut -d= -f2)" \
    --password "$(grep MONGO_INITDB_ROOT_PASSWORD /opt/ifsuv/.env.production | cut -d= -f2)" \
    --authenticationDatabase admin \
    --archive=- --gzip > "$BACKUP_DIR/ifsuv-$(date +%Y%m%d).gz"
# rotation : garder 14 jours
find "$BACKUP_DIR" -name "ifsuv-*.gz" -mtime +14 -delete
```

Restore :
```bash
docker exec -i ifsuv-mongo mongorestore --archive --gzip < ifsuv-20260601.gz
```

## Rollback rapide

Si un déploiement casse la prod :

```bash
./deploy.sh shell monvps.example.com
# Sur le VPS:
cd /opt/ifsuv
git log --oneline -5                     # voir les derniers commits
git reset --hard <commit-sha-précédent>
docker compose -f docker/compose.prod.yml up -d --build
```

## Variables d'env critiques (.env.production)

| Variable | Description | Sensible |
|---|---|---|
| `DOMAIN` | Domaine public (ex `ifsuv.example.com`) | non |
| `MONGO_URI` | URI mongo interne `mongo:27017` | OUI (mdp) |
| `MONGO_INITDB_ROOT_PASSWORD` | Mot de passe Mongo root | OUI |
| `MAILER_USER` / `MAILER_PASS` | SMTP IONOS | OUI |
| `COOKIE_SECURE` | doit être `true` en prod (HTTPS) | non |
| `CORS_ORIGIN` | Doit matcher `https://${DOMAIN}` | non |

## Sécurité de base

- Pas de port exposé hors 80/443 sur l'hôte
- API et Mongo accessibles uniquement via le network Docker interne
- Cookies session : `httpOnly`, `Secure`, `SameSite=Lax`
- Argon2id pour les mots de passe (params OWASP 2024)
- Pas de stack trace exposée en prod (filter global `AllExceptionsFilter`)
- HTTPS obligatoire (Caddy redirige 80 → 443 automatiquement)

À ajouter en Phase 5+ :
- Rate limiting sur `/auth/login`
- Helmet headers
- 2FA admins
- Audit log monitoring (Grafana Loki ou similaire)

## CI/CD (à venir, Phase 6+)

Pour l'instant, déploiement manuel via `deploy.sh`. GitHub Actions sera ajouté Phase 6+ avec :
- Build images Docker → push GHCR
- SSH deploy auto sur push `main`
- Notification Discord/Slack
- Smoke test post-deploy

Voir `.github/workflows/deploy.yml` (skeleton désactivé).

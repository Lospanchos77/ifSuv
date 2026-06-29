# IFSUV — Déploiement prod (VPS OVH Ubuntu)

## Architecture prod

IFSUV est une **stack Docker 100 % autonome** qui **cohabite** sur un serveur où un
**Nginx natif** (déploiement WEBX-CMS, voir `deployWEBXF.sh`) occupe déjà 80/443.
Pour éviter tout conflit, IFSUV écoute **sur une IP dédiée, port 8443** (configurable).
Le Nginx natif n'est jamais touché.

**Hôte public + mode TLS, choisis au déploiement** (`deploy.sh init`/`config`, réajustables) :

| Hôte public | Mode TLS | Accès |
|---|---|---|
| **IP** (ex. `51.83.12.34`) | `internal` — cert auto-signé Caddy (CA locale) | `https://51.83.12.34:8443` (avertissement nav. jusqu'à import de la racine) |
| **Domaine** (ex. `ifsuv.if77.fr`) | `letsencrypt` — Let's Encrypt **DNS-01 OVH** (champ TXT) | `https://ifsuv.if77.fr:8443` (cert reconnu) |

> Let's Encrypt **n'émet pas** de cert pour une IP nue → l'IP impose le mode `internal`.
> On peut démarrer en IP puis basculer vers un domaine plus tard via `deploy.sh config`.

```
   IP_principale:443  ──►  Nginx natif (WEBX-CMS)        │  inchangé
   IP_dédiée:8443     ──►  Caddy (container ifsuv-caddy) │  stack IFSUV
                              │  TLS internal OU Let's Encrypt DNS-01 OVH
                              │  network bridge "ifsuv-prod"
            ┌──────────────┬──┴───────────┐
            ▼              ▼              ▼
       ┌─────────┐   ┌──────────┐   ┌──────────┐
       │ web     │   │ api      │   │ mongo    │
       │ Caddy   │   │ NestJS   │◄──┤ 7.0      │
       │ :8080   │   │ :3001    │   │ (interne)│
       └─────────┘   └──────────┘   └──────────┘
```

- **Volumes persistants** : `ifsuv-mongo-data`, `ifsuv-storage` (photos), `caddy-data` (certs), `caddy-config`
- **Port exposé** : `IFSUV_BIND_IP:8443` uniquement (Caddy). API, web et Mongo ne sont accessibles que via le network interne Docker.
- **Cert** : Let's Encrypt **DNS-01 OVH** — Caddy crée/supprime le TXT `_acme-challenge` automatiquement. Image Caddy custom avec le plugin DNS (`docker/Dockerfile.caddy`).
- **Le `.env.production`** sur le VPS dans `/opt/ifsuv/.env.production` (mode 600, jamais commité).

> ⚠️ **Docker contourne UFW** pour les ports publiés : `IFSUV_BIND_IP:8443` est joignable
> depuis Internet quelles que soient les règles UFW (l'app est protégée par le login).
> Pour restreindre par IP source, utiliser le bloc `remote_ip` du `Caddyfile.prod`.

## Prérequis VPS

- **Ubuntu 22.04 LTS** (ou 24.04, fonctionne)
- **Accès root** au serveur (le script se lance en `sudo bash deploy.sh` **directement sur le serveur**)
- **Une IP dédiée** à IFSUV (libre, non utilisée par une instance WEBX/Nginx) → proposée par défaut (IP du serveur auto-détectée), modifiable
- **Selon le mode TLS choisi** :
  - mode `internal` (hôte = IP) : rien de plus, le cert est auto-signé localement
  - mode `letsencrypt` (hôte = domaine) : un **record A** `<domaine> → IP de bind` + un **token API OVH** (zone DNS) — voir la section *Certificat*

Notes :
- **Pas besoin d'ouvrir 80/443** : IFSUV écoute sur `8443`, et le challenge Let's Encrypt est en DNS-01 (pas HTTP). Docker publie ce port en **contournant UFW** (joignable même sans règle UFW).
- Docker et Docker Compose sont installés automatiquement par `deploy.sh` s'ils sont absents (avec **confirmation** au pré-vol) — ils cohabitent avec la stack native (Node/PM2/Nginx/Mongo) de WEBX-CMS sans interférence.

## Première installation

Tout se passe **sur le serveur**, en root. Le script est interactif (façon `deployWEBXF.sh`) :
défauts partout (Entrée suffit), l'IP du serveur étant proposée comme hôte.

```bash
# 1. Récupérer le repo sur le serveur (repo public, ou clé/token de déploiement si privé)
git clone https://github.com/Lospanchos77/ifSuv.git /opt/ifsuv
cd /opt/ifsuv

# 2. Lancer l'installeur interactif
sudo bash deploy.sh
```

Le script enchaîne **6 étapes** :

1. **Configuration** — hôte (IP/domaine, défaut = IP du serveur), mode TLS (auto : IP→`internal`, domaine→`letsencrypt`), bind, port, creds OVH si Let's Encrypt ; récap + confirmation
2. **Pré-vol & Docker** — vérifie port/RAM/disque, et **demande confirmation avant d'installer Docker** s'il est absent
3. **Environnement** — génère `.env.production` (creds Mongo aléatoires) + écrit la config ; SMTP optionnel (Entrée pour plus tard)
4. **Build** des images Docker
5. **Démarrage** des containers
6. **Vérification** (healthcheck) + récap encadré

Vérification manuelle (`--resolve` mappe l'hôte sur l'IP ; `-k` car le cert peut être interne) :

```bash
curl -k --resolve 51.83.12.34:8443:51.83.12.34 https://51.83.12.34:8443/api/v1/health
# → {"status":"ok","mongoState":"connected",...}
```

## Changer hôte / IP / domaine / port / TLS (réajustable)

Sur le serveur, sans réinstaller (valeurs courantes pré-remplies) :

```bash
cd /opt/ifsuv && sudo bash deploy.sh config
```

Exemple — passer d'une IP (cert interne) à un domaine (Let's Encrypt) :

1. Créer le record DNS A `ifsuv.if77.fr → <IP de bind>` + un token API OVH
2. `sudo bash deploy.sh config` → saisir `ifsuv.if77.fr`, choisir `letsencrypt`, coller les creds OVH
3. Le script met à jour `.env.production` et recrée les containers ; Caddy émet le cert Let's Encrypt

`config` met aussi à jour `CORS_ORIGIN`/`APP_URL` automatiquement selon le nouvel hôte:port.

## Mise à jour (nouveau code)

Après un push sur `main`, sur le serveur :

```bash
cd /opt/ifsuv && sudo bash deploy.sh update
```

Le script : `git pull` → `docker compose build` (images modifiées) → `up -d` → healthcheck.
Downtime typique : **< 5 secondes**.

## Commandes courantes

Toutes sur le serveur, dans `/opt/ifsuv`, en root :

```bash
sudo bash deploy.sh config        # changer hôte/IP/domaine/port/TLS
sudo bash deploy.sh update        # git pull + rebuild + redémarrage
sudo bash deploy.sh logs          # tous les services, suivi live
sudo bash deploy.sh logs caddy    # uniquement Caddy (debug TLS)
sudo bash deploy.sh status        # docker compose ps
sudo bash deploy.sh restart       # restart tous les containers
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
docker compose -f docker/compose.prod.yml --env-file .env.production up -d --build
```

## Variables d'env critiques (.env.production)

Ces clés sont gérées par `deploy.sh init`/`config` — édition manuelle rarement nécessaire.

| Variable | Description | Sensible |
|---|---|---|
| `DOMAIN` | Hôte public : IP ou domaine | non |
| `IFSUV_BIND_IP` | IP du serveur sur laquelle Caddy écoute | non |
| `CADDY_HTTPS_PORT` | Port d'écoute (défaut `8443`) | non |
| `CADDY_TLS_MODE` / `CADDY_TLS_CONF` | `internal`/`tls.internal.conf` ou `letsencrypt`/`tls.le.conf` | non |
| `MONGO_URI` | URI mongo interne `mongo:27017` | OUI (mdp) |
| `MONGO_INITDB_ROOT_PASSWORD` | Mot de passe Mongo root | OUI |
| `OVH_APPLICATION_KEY/SECRET`, `OVH_CONSUMER_KEY` | Creds API OVH (mode `letsencrypt` uniquement) | OUI |
| `MAILER_USER` / `MAILER_PASS` | SMTP IONOS | OUI |
| `COOKIE_SECURE` | doit être `true` en prod (HTTPS) | non |
| `CORS_ORIGIN` / `APP_URL` | `https://${DOMAIN}:${CADDY_HTTPS_PORT}` (auto par `config`) | non |

## Certificat

Le mode TLS dépend de l'hôte public (choisi par `deploy.sh init`/`config`) :

- **Mode `internal` (hôte = IP)** : Caddy émet un certificat auto-signé via sa CA locale
  (`tls internal`, fichier `docker/tls.internal.conf`). Immédiat, aucun domaine ni port public.
  Le navigateur avertit tant que la racine Caddy n'est pas installée sur le poste (récupérable
  dans le volume `caddy-data` : `/data/caddy/pki/...`, ou via `caddy trust`).
- **Mode `letsencrypt` (hôte = domaine)** : certificat reconnu via le **challenge DNS-01 OVH**
  (`docker/tls.le.conf`). Caddy crée/supprime le TXT `_acme-challenge.<domaine>` dans la zone OVH
  via l'API — **aucun port 80/443 public requis** → cohabitation propre avec le Nginx natif.

**Créer le token OVH** (mode `letsencrypt`) sur <https://api.ovh.com/createToken/> (compte qui gère la zone DNS) :

- **Rights** (remplacer `{zone}` par ta zone, ex. `if77.fr`) :
  - `GET    /domain/zone/{zone}/*`
  - `POST   /domain/zone/{zone}/*`
  - `DELETE /domain/zone/{zone}/*`
- Récupérer **Application Key**, **Application Secret**, **Consumer Key** → les mettre dans
  `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY` de `.env.production`.
- `OVH_ENDPOINT=ovh-eu` (zone Europe).

> Pour un autre fournisseur DNS : changer `CADDY_DNS_MODULE` (build-arg, `Dockerfile.caddy`),
> le bloc `acme_dns` du `Caddyfile.prod`, et les variables de creds correspondantes.

## Coexistence avec WEBX-CMS (Nginx natif)

| | WEBX-CMS (en place) | IFSUV |
|---|---|---|
| Reverse proxy | Nginx natif (host) | Caddy (container) |
| Écoute | 80/443 (toutes/par-IP) | `IFSUV_BIND_IP:8443` uniquement |
| Process | Node + PM2 | Docker Compose |
| Mongo | natif `:27017` | container interne (non exposé) |
| TLS | certbot (HTTP-01) | `internal` (IP) **ou** Let's Encrypt **DNS-01** (domaine) |

Aucune ressource partagée → les deux stacks tournent côte à côte. Ne **jamais** publier 80/443
côté IFSUV (cela écraserait Nginx). Le seul point de vigilance est le **bypass UFW de Docker**
(voir l'avertissement en tête de doc).

## Sécurité de base

- Un seul port exposé sur l'hôte : `IFSUV_BIND_IP:8443` (Caddy). API, web et Mongo restent sur le network Docker interne.
- ⚠️ Docker contourne UFW pour ce port → restreindre par IP source via le bloc `remote_ip` du `Caddyfile.prod` si nécessaire.
- Cookies session : `httpOnly`, `Secure`, `SameSite=Lax`
- Argon2id pour les mots de passe (params OWASP 2024)
- Pas de stack trace exposée en prod (filter global `AllExceptionsFilter`)
- HTTPS obligatoire (cert Let's Encrypt DNS-01, accès via `:8443`)

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

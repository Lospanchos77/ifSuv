# IFSUV — Application de gestion de tickets de réparation PC

## Vue d'ensemble
Refonte d'une webapp PHP legacy (`../ifsuv-old/`) en stack JS moderne. Gestion de tickets de réparation PC pour clients particuliers : dépôt → diagnostic → suivi via QR code → restitution avec rapport.

Workflow métier inchangé par rapport au legacy. Architecture, sécurité, scalabilité, maintenabilité repensées.

## Stack
- **Backend** : Node.js 22 LTS · NestJS 10 (Fastify) · Mongoose 8 · MongoDB 7 (Atlas)
- **Frontend** : React 18 · Vite 5 · React Router v6 · Mantine v7 · TanStack Query v5 · Zustand · react-hook-form + Zod
- **Rich text** : TipTap v2 · **QR** : qrcode + qrcode.react · **PDF** : @react-pdf/renderer
- **Auth** : sessions opaques en Mongo + Argon2id, cookie httpOnly. JWT court signé HS256 pour tokens publics QR uniquement
- **Storage** : fichiers sur disque local (`STORAGE_DIR`, défaut `apps/api/var/storage` ; volume persistant en prod)
- **Email** : Nodemailer + SMTP IONOS + react-email
- **Tests** : Vitest + mongodb-memory-server + Playwright
- **Monorepo** : pnpm workspaces + Turborepo
- **Deploy** : VPS OVH Ubuntu 22.04 · Docker Compose · Caddy · GitHub Actions

## Structure
```
apps/api    NestJS — modules métier : auth, users, companies, tickets, reports, tasks, todos, contacts, public
apps/web    React + Vite — routes admin/, tech/, public/, auth/
apps/etl    Script one-shot migration legacy MySQL → MongoDB
packages/shared    Zod schemas, enums, DTOs partagés front/back
packages/ui        Composants Mantine custom partagés
packages/config    Tsconfigs partagés (base/node/react)
```

## Conventions
- **TypeScript strict** activé partout. `any` interdit (préférer `unknown` + narrowing).
- **Validation** : tous les inputs HTTP via Zod (`nestjs-zod` côté API, `react-hook-form` + resolver côté web). Schémas définis une seule fois dans `packages/shared`.
- **Sanitization HTML** : tout contenu TipTap stocké passe par `sanitize-html` côté API avant insert. Affiché via `dangerouslySetInnerHTML` uniquement après resanitization client.
- **Erreurs** : exceptions NestJS typées (`BadRequestException`, `NotFoundException`...). Filter global qui masque la stack en prod.
- **Logs** : Pino structuré JSON. Pas de `console.log` en code applicatif.
- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`...). Vérifié par commitlint.
- **Branches** : `main` protégée, PR obligatoire, CI verte requise.
- **Mongoose** : pas de `Model.find()` brut dans les controllers. Toujours via le service du module. Indexes déclarés dans le schéma, vérifiés au boot via `syncIndexes()`.
- **Auth** : aucun endpoint sans guard explicite (`@UseGuards(SessionGuard)` ou `@Public()`). Lint custom à ajouter.
- **Tests** : 1 test E2E Playwright minimum par parcours métier critique (login, dépôt ticket, scan QR, génération rapport). Couverture unit non imposée.

## Workflow métier de référence
1. Admin/technicien crée un client (entreprise ou particulier)
2. Dépôt PC → ticket créé (état `NEW`), 2 QR générés (`publicToken`, `techToken`)
3. Technicien renseigne diagnostic (TipTap), change l'état (`NEW → IN_PROGRESS → RESOLVED → CLOSED`)
4. Client scanne son QR → page `/p/t/:publicToken` read-only avec SSE pour MAJ live
5. Génération rapport d'intervention (PDF + email)
6. Restitution : impression ou envoi email

## États ticket (state machine)
`NEW → IN_PROGRESS → RESOLVED → CLOSED`. Transitions validées server-side, gardées par rôle (seul `TECHNICIAN`/`ADMIN` peut transitionner). Chaque transition crée un event embarqué dans `ticket.events[]`.

## Migration depuis le legacy
Script `apps/etl` lit l'ancien MySQL et écrit dans MongoDB. Mapping IDs persisté dans collection `legacyIdMap`. Tous les users migrés ont `mustResetPassword=true` (mots de passe legacy en clair non récupérables). Routes `/et.php` et `/etp.php` redirigent 301 vers les nouvelles URLs via `legacyId`.

## Commandes
```bash
pnpm install                  # bootstrap monorepo
pnpm dev                      # api + web + shared (watch) en parallèle
pnpm --filter @ifsuv/api dev  # api seule
pnpm --filter @ifsuv/web dev  # web seule
pnpm test                     # vitest tous packages
pnpm test:e2e                 # playwright (Phase 5+)
pnpm lint                     # eslint flat
pnpm typecheck
pnpm build
pnpm compose:dev              # mailhog (mail de test) — Mongo natif, stockage sur disque
pnpm compose:dev:down
pnpm --filter @ifsuv/etl migrate  # ETL legacy → mongo (jamais sur prod sans dry-run)
```

## Environnements de dev
- **API** : http://localhost:3001 — préfixe `/api/v1`. Swagger : http://localhost:3001/api/docs
- **Web** : http://localhost:5173 — proxy `/api → :3001`
- **Mongo** : mongodb://localhost:27017/ifsuv_dev
- **Stockage** : fichiers sur disque (`apps/api/var/storage` en dev)
- **Mailhog** : SMTP localhost:1025 · UI http://localhost:8025

## Décisions architecturales actées
- **Mono-organisation** : pas de couche Organization. Refactoring possible plus tard si besoin de multi-tenant.
- **REST plutôt que tRPC** : page publique QR + futur app mobile/desktop bénéficient d'une API standard documentée OpenAPI.
- **Sessions opaques Mongo plutôt que JWT** pour l'auth utilisateur : révocation immédiate, rotation triviale.
- **Stockage fichiers sur disque local** plutôt qu'un stockage objet (S3/MinIO) : app mono-serveur, un service externe n'apporte pas de valeur réelle. `STORAGE_DIR` configurable, volume persistant en prod. Encapsulé dans `StorageService` (bascule vers S3 possible plus tard sans toucher aux modules métier).
- **PWA reportée en Phase 7** : MVP web responsive d'abord.
- **`tsconfig.base.json` racine en `module: ESNext` + `moduleResolution: Bundler`** : OK pour Vite/web. `apps/api` et `apps/etl` overridem via `packages/config/tsconfig/node.json`.

## Hors scope MVP
- Multi-tenant
- Notifications temps réel (sauf SSE page publique)
- Signature électronique
- Inventaire pièces détachées
- Facturation / multi-devise
- 2FA / SSO
- Knowledge base intégrée

## Planning
Plan global : `C:\Users\NicolasMariotti\.claude\plans\il-y-pas-mla-wiggly-haven.md`
Phase 0 (en cours) : `C:\Users\NicolasMariotti\.claude\plans\tu-a-perdu-le-joyful-cake.md`

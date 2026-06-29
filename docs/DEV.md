# IFSUV — Développement local

## Prérequis

- **Node 22 LTS** (vérif : `node -v`)
- **pnpm 9** (`npm install -g pnpm@9.15.9` ou via corepack : `corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- **MongoDB 7** localement :
  - Windows : MongoDB Community Server installé en service Windows (port 27017)
  - macOS : `brew install mongodb-community` + `brew services start mongodb-community`
  - Linux : `sudo apt install mongodb` + `sudo systemctl start mongod`

## Setup en 4 commandes

```bash
git clone <repo> ifsuv && cd ifsuv
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm --filter @ifsuv/shared build       # build initial du package shared
pnpm --filter @ifsuv/api seed:dev       # seed Mongo : 3 companies + 5 users + 5 tickets
pnpm dev                                # ou `start-dev.bat` (Windows) / `./start-dev.sh` (Linux/Mac)
```

## URLs locales

| Service | URL |
|---|---|
| Web (Vite) | http://localhost:5173 |
| API (NestJS+Fastify) | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| MongoDB | mongodb://localhost:27017/ifsuv_dev |

## Comptes seedés

Tous les comptes ont le mot de passe **`Admin!Pass2026`** :

| Rôle | Email |
|---|---|
| ADMIN | admin@ifsuv.local |
| TECHNICIAN | tech1@ifsuv.local |
| TECHNICIAN | tech2@ifsuv.local |
| CLIENT_USER | client1@acme.test |
| CLIENT_USER | client2@acme.test |

## Scripts courants

```bash
pnpm dev                                # api + web + shared (watch) en parallèle (concurrently)
pnpm dev:api                            # api seule
pnpm dev:web                            # web seule
pnpm dev:shared                         # shared en watch (utile si on modifie packages/shared)

pnpm --filter @ifsuv/api seed:dev       # seed Mongo (idempotent)
pnpm --filter @ifsuv/api test           # tests Vitest unit api
pnpm --filter @ifsuv/web test           # tests RTL web
pnpm --filter @ifsuv/shared test        # tests Zod shared

pnpm typecheck                          # tsc --noEmit sur tous les workspaces (turbo cache)
pnpm lint                               # eslint flat sur tous les workspaces
pnpm test                               # vitest sur tous les workspaces
pnpm build                              # build prod tous les workspaces
```

## Scripts de démarrage rapide

- **Windows** : double-clic sur `start-dev.bat` ou `.\start-dev.bat` dans PowerShell
  - Vérifie que le service MongoDB Windows tourne
  - Tue les processus écoutant sur :3001 et :5173
  - Lance `pnpm dev`
- **Linux / Mac** : `./start-dev.sh`
  - Idem mais via `systemctl` / `pgrep` / `lsof`

## Ajouter un module API

Calque le pattern `modules/health/` ou `modules/users/` :

1. Crée `apps/api/src/modules/<feature>/` avec :
   - `<feature>.module.ts` (déclare schemas Mongoose + service + controller)
   - `<feature>.controller.ts` (routes HTTP, decorators `@Roles`, `@Public`, `@CurrentUser`)
   - `<feature>.service.ts` (logique applicative, injecté via DI)
   - `schemas/<entity>.schema.ts` (Mongoose `@Schema/@Prop` — pour les union types string, **toujours** mettre `type: String` explicite)
   - `dto/<feature>.dto.ts` (`createZodDto(SchemaShared)`)
2. Crée le schéma Zod dans `packages/shared/src/schemas/<feature>.ts`
3. **Re-exporte explicitement** dans `packages/shared/src/index.ts` (pas `export *`, pour cjs-module-lexer Vite)
4. Ajoute le module dans `apps/api/src/app.module.ts`

## Ajouter une page web

1. Crée `apps/web/src/routes/<feature>/<Page>Page.tsx`
2. Crée `apps/web/src/features/<feature>/` pour les hooks + api client (calque `features/auth/`)
3. Ajoute la route dans `apps/web/src/router.tsx` (sous `<RequireAuth>` si authentifié, sinon `<RedirectIfAuthenticated>`)

## Pièges connus (déjà résolus, ne pas reproduire)

Cf. mémoire projet `C:\Users\NicolasMariotti\.claude\projects\d--NewIfSV\memory\project_ifsuv_refonte.md` pour le détail. Résumé :

- `packages/shared` doit être en **CJS** (pas ESM) — NestJS CJS ne peut pas `require` du ESM-only.
- Re-exports dans `packages/shared/src/index.ts` doivent être **nommés explicites** (`export { X } from './foo'`), pas `export * from './foo'` — cjs-module-lexer Vite ne voit pas le `__exportStar`.
- Vite a besoin de `optimizeDeps.include: ['@ifsuv/shared']` dans `vite.config.ts` pour pre-bundler le shared CJS.
- `incremental: true` + `tsBuildInfoFile` HORS de dist/ = bombe à retardement (cache désynchronisé). Solution : retirer `incremental` ou mettre le tsbuildinfo dans dist/.
- Mongoose schemas avec union types string (`'NEW' | 'IN_PROGRESS' | ...`) : toujours `@Prop({ type: String, enum: [...] })` explicite, sinon `CannotDetermineTypeError`.
- Mongoose schemas avec `string | null` : toujours `@Prop({ type: String, default: null })` explicite.
- `@node-rs/argon2` exporte `Algorithm` comme `const enum` → KO avec `isolatedModules: true`. Ne pas l'importer (Argon2id par défaut).
- Seeds `ts-node` : utiliser `tsconfig.scripts.json` autonome (n'étend PAS `@ifsuv/config` car ts-node ne suit pas les symlinks pnpm pour les chaînes `extends`).

## Troubleshooting

| Symptôme | Cause | Fix |
|---|---|---|
| `pnpm dev` plante avec `MODULE_NOT_FOUND dist/main` | Cache `.tsbuildinfo` désynchronisé | `pnpm --filter @ifsuv/api clean && pnpm --filter @ifsuv/api build` |
| Page blanche, console : `does not provide an export named 'X'` | Vite n'a pas pre-bundlé le shared | `Remove-Item -Recurse -Force apps\web\node_modules\.vite` puis `pnpm --filter @ifsuv/shared build` puis `pnpm dev` |
| `mongoState: disconnected` sur `/health` | Service MongoDB pas démarré | Windows : `net start MongoDB`. Linux : `sudo systemctl start mongod` |
| Login 401 | Mauvais mot de passe | Re-seed : `pnpm --filter @ifsuv/api seed:dev` |
| Cookie pas envoyé en dev | CORS / proxy mal configuré | Vérifier `apps/web/vite.config.ts` proxy `/api → :3001` actif |

## Ressources

- Plan global IFSUV : `C:\Users\NicolasMariotti\.claude\plans\il-y-pas-mla-wiggly-haven.md`
- Plan Phase 0+1 : `C:\Users\NicolasMariotti\.claude\plans\tu-a-perdu-le-joyful-cake.md`
- Conventions : `CLAUDE.md` à la racine

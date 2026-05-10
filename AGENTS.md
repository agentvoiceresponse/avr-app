# AGENTS.md

Admin panel for Agent Voice Response. Two independent npm projects: `backend/` (NestJS 11) and `frontend/` (Next.js 16, React 19). Root `package.json` only carries metadata — there is no workspace setup. Run all commands inside `backend/` or `frontend/`.

## Commands

Backend (`cd backend`):
- `npm run start:dev` — Nest watch mode on `:3001`
- `npm run lint` — ESLint with `--fix`
- `npm test` — Jest (unit specs `*.spec.ts` under `src/`)
- `npm run test:e2e` — uses `test/jest-e2e.json`
- Single test: `npx jest path/to/file.spec.ts -t "name"`

Frontend (`cd frontend`):
- `npm run start:dev` — Next dev on `:3000` (script is `start:dev`, not `dev`)
- `npm run lint`, `npm run build`, `npm run clean`
- Despite what `frontend/README.md` says, the project uses **npm** (`package-lock.json`); ignore the pnpm references.

There is no root-level lint/test/build aggregator. CI (`.github/workflows/main.yml`) only builds and pushes Docker images on push to `main`; it does **not** run lint or tests, so verify locally.

## Architecture quirks an agent will miss

- **TypeORM `synchronize: true`** in `backend/src/app.module.ts` — schema auto-syncs from entities. There are no migrations; renaming a column = data loss. SQLite file is `/app/data/data.db` in container, `../data/data.db` locally (path relative to backend cwd).
- **Admin user is seeded** at boot from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (`backend/src/users/users.seeder.ts`). Default password fallback is `agentvoiceresponse`.
- **CORS is locked to `FRONTEND_URL`** (`backend/src/main.ts`); set it or login from a different origin will silently break.
- **Global `ValidationPipe` with `forbidNonWhitelisted: true`** — DTOs must declare every accepted field with `class-validator` decorators or requests 400.
- **Agents = Docker containers.** `AgentsService.run` (`backend/src/agents/agents.service.ts`) launches one container per agent on the `avr` Docker network using image from provider config or `CORE_DEFAULT_IMAGE`. Backend talks to the host Docker daemon via `/var/run/docker.sock` (configurable with `DOCKER_SOCKET_PATH`). Local dev requires Docker Engine running.
- **Asterisk integration is real.** `AsteriskService` connects to ARI at `ARI_URL` (default `http://avr-asterisk:8088/ari`) and **rewrites `extensions.conf`, `pjsip.conf`, `manager.conf`** under `ASTERISK_CONFIG_PATH` (default `/app/asterisk`). Editing those files by hand will be overwritten by trunk/phone/number CRUD operations. `TENANT` env (default `demo`) is used as the dialplan context.
- **Tool mounts**: if `TOOLS_DIR` / `AVR_TOOLS_DIR` are set, they are bind-mounted into spawned agent containers at `/usr/src/app/tools` and `/usr/src/app/avr_tools`. Must be **absolute host paths** (the `.env.example` placeholder `/Users/[name]/...` must be edited).
- **Frontend env loading** uses `next-runtime-env` — read `NEXT_PUBLIC_*` via `env('NAME')` from `next-runtime-env`, not `process.env`, so values are picked up at runtime in the Docker image. Restart the dev server after `.env` edits.
- **Frontend ports**: standalone dev = `:3000`; in the production Docker compose layout the frontend is exposed on `:3001` per `frontend/README.md`. `NEXT_PUBLIC_API_URL` must point at the backend (default `http://localhost:3001`).
- **Optional sidebar groups** depend on env: telephony group only renders if `NEXT_PUBLIC_TELEPHONY_STATUS_URL` returns 200; embedded WebRTC phone only when `NEXT_PUBLIC_WEBRTC_CLIENT_URL` is set.
- **i18n**: dictionaries in `frontend/lib/i18n/{en,it}.ts`. Add keys to **both** when introducing UI copy.
- **shadcn/ui** with style `new-york`, base color `neutral`, aliases `@/components`, `@/lib`, `@/components/ui` (see `frontend/components.json`).

## Repo layout that isn't obvious

- `asterisk/` — seed Asterisk configs mounted into the `avr-asterisk` container (`docker-compose-asterisk.yml`). Backend mutates copies of these at runtime, not these files directly.
- `data/` — shared SQLite volume (mounted into backend at `/app/data`).
- `recordings/` — Asterisk monitor output, mounted into both Asterisk and backend recordings module.
- `tools/`, `avr_tools/` — empty placeholder dirs intended to be bind-mounted into agent containers (see `TOOLS_DIR`).
- Root `docker-compose-asterisk.yml` only spins up Asterisk + AMI + softphone. The full backend/frontend `docker-compose.yml` referenced in the root README is **not in this repo**; production runs from the published images.
- Frontend route groups: `app/(auth)/login` is public; everything under `app/(protected)/*` is gated by `components/auth-guard.tsx` (JWT in localStorage).

## Auth & roles

JWT with roles `admin`, `manager`, `viewer` (`backend/src/auth/roles.decorator.ts` + `roles.guard.ts`). User CRUD is admin-only. `GET /health` and `POST /auth/login` are the only unauthenticated endpoints.

## Style

Backend: Prettier + ESLint (`@typescript-eslint`). Run `npm run lint` before committing — there is no pre-commit hook.
Frontend: `next/core-web-vitals` + `next/typescript` flat config. No Prettier in frontend.

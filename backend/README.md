# AVR Admin Backend

NestJS backend that powers the AVR admin panel with user management, provider configuration, agent orchestration, and Docker-based lifecycle controls.

## Features

- JWT authentication with role-based guards (`admin`, `manager`, `viewer`) and bcrypt password hashing
- SQLite persistence via TypeORM for users, providers, and agents (auto-synced schema)
- CRUD APIs for users (admin only), providers, and agents, plus run/stop actions backed by Dockerode
- Agent runtime coordination that launches one container per configured provider and tracks status
- Ready-to-run Docker setup with volume-backed database and access to the host Docker engine

## Prerequisites

- Node.js 18+
- npm 9+
- Local Docker Engine (for agent Docker operations)
- Docker socket access (`/var/run/docker.sock` by default)

## Configuration

Environment variables are loaded via `@nestjs/config`. Copy `.env.example` and adjust as needed:

```
cp .env.example .env
```

Key variables:

- `PORT` (default `3001`)
- `DB_TYPE` (default `sqlite`)
- `DB_DATABASE` (default `../data/data.db`)
- `FRONTEND_URL` (required for CORS in local dev, usually `http://localhost:3000`)
- `JWT_SECRET`
- `CORE_DEFAULT_IMAGE` (fallback image when provider config does not define one)
- `DOCKER_SOCKET_PATH` (default `/var/run/docker.sock`)
- `TOOLS_DIR` / `AVR_TOOLS_DIR` (optional absolute host paths mounted into agent containers)
- `ARI_URL`, `ASTERISK_CONFIG_PATH`, `TENANT` (Asterisk integration settings)

## Local Development

```
npm install
npm run start:dev
```

The API listens on `http://localhost:3001`. All endpoints require a valid JWT except `GET /health` and `POST /auth/login`.

Important runtime notes:

- TypeORM uses `synchronize: true`. Entity schema changes can mutate/drop columns automatically; there are no migrations.
- Admin user is seeded at boot from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (fallback password: `agentvoiceresponse`).
- Global validation uses `forbidNonWhitelisted: true`; DTOs must explicitly define accepted fields.

## Docker Compose

```
docker compose up --build
```

The compose stack exposes port `3001`, mounts `./data` at `/app/data`, and binds `/var/run/docker.sock` so the service can manage Docker containers.

## Testing & Linting

```
npm run test
npm run lint
```

## API Overview

- `POST /auth/login`
- `POST /users`, `GET /users` (admin only)
- `POST /providers`, `GET /providers`
- `POST /agents`, `PUT /agents/:id`, `GET /agents`
- `POST /agents/:id/run`, `POST /agents/:id/stop`
- `GET /health`

All protected routes expect a `Bearer` token produced by the login endpoint.

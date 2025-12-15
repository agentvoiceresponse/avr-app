# Agent Voice Response - Admin panel

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-app?style=social)](https://github.com/agentvoiceresponse/avr-app)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)


Repository for the AVR administration panel composed of:

- `backend/`: NestJS API (TypeORM + SQLite, JWT, Docker management)
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-app-backend?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-app-backend)

- `frontend/`: Next.js 14 interface with Tailwind CSS, shadcn/ui and light/dark mode
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-app-frontend?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-app-frontend)

- `docker-compose.yml`: orchestrates backend and frontend services

## Requirements

- Node.js 18+
- npm 9+
- Docker Engine (required to run agent containers)
- Asterisk PBX (required onfly for telephony sections)

## Quick Start

```bash
docker compose up --build
```

The backend will be available at `http://localhost:3000`, the frontend at `http://localhost:3001`.

## Local Development

Backend:

```bash
cd backend
npm install
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Data structure

- SQLite database mounted in `./data` (volume shared by the containers)
- JWT signed with `JWT_SECRET`, configurable in `docker-compose.yml`

See `backend/README.md` and `frontend/README.md` for more details on each project.

## Usage

Enjoy the Agent Voice Response App experience! After installation, you can access the application through your browser.

<div align="center">
  <img src="https://github.com/agentvoiceresponse/.github/blob/main/profile/images/avr-dashboard-new.png" alt="Dashboard" width="600">
  <br>
  <em>The intuitive dashboard for managing your voice response agents</em>
</div>

## Environment Variables Setup

Before running `docker compose up`, you need to configure the required environment variables.

### Quick Setup (Recommended)

Create your `.env` file with automatically generated secure secrets:
```bash
cat > .env << EOF
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
ARI_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
EOF
```
**Important:** Save your generated credentials to a secure location:

```bash
cat .env
```

Copy the output, especially the `ADMIN_PASSWORD` which you'll need for login.

## docker-compose setup

Before running `docker compose up`, you need to configure the required environment variables and update the `docker-compose.yml` file.

### Step 1: Update docker-compose.yml

The default `docker-compose.yml` has empty environment variables and an incorrect API URL. Update it with the following changes:

#### Backend service - Replace empty environment variables:
```yaml
backend:
environment:
- PORT=3001
- JWT_SECRET=${JWT_SECRET} # ← CHANGED: was empty
- CORE_DEFAULT_IMAGE=agentvoiceresponse/avr-core
- DB_TYPE=sqlite
- DB_DATABASE=/app/data/data.db
- FRONTEND_URL=http://localhost:3000
- ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
- ADMIN_PASSWORD=${ADMIN_PASSWORD} # ← CHANGED: was empty
- WEBHOOK_URL=http://avr-app-backend:3001/webhooks
- WEBHOOK_SECRET=${WEBHOOK_SECRET} # ← CHANGED: was empty
- ASTERISK_CONFIG_PATH=/app/asterisk
- ARI_URL=http://avr-asterisk:8088/ari
- ARI_USERNAME=avr
- ARI_PASSWORD=${ARI_PASSWORD} # ← CHANGED: was empty
- TENANT=demo
- TOOLS_DIR=/home/[user]/avr-infra/tools
- AMI_URL=http://avr-ami:6006
```

**Frontend service - Fix API URL for browser access:**
```yaml
frontend:
environment:
- NEXT_PUBLIC_API_URL=http://localhost:3001 # ← CHANGED: was http://avr-app-backend:3001
- NEXT_PUBLIC_WEBRTC_CLIENT_URL=http://avr-phone:8080
```

## Support & Community

*   **GitHub:** [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse) - Report issues, contribute code.
*   **Discord:** [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74) - Join the community discussion.
*   **Docker Hub:** [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse) - Find Docker images.
*   **Wiki:** [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home) - Project documentation and guides.

## Support AVR

AVR is free and open-source. If you find it valuable, consider supporting its development:

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see the [LICENSE](LICENSE.md) file for details.

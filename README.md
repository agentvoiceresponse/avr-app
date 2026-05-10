# Agent Voice Response - Admin panel

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-app?style=social)](https://github.com/agentvoiceresponse/avr-app)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)


Repository for the AVR administration panel composed of:

- `backend/`: NestJS API (TypeORM + SQLite, JWT, Docker management)
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-app-backend?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-app-backend)

- `frontend/`: Next.js 16 + React 19 interface with Tailwind CSS and shadcn/ui
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-app-frontend?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-app-frontend)

- `docker-compose-asterisk.yml`: optional local Asterisk stack (PBX + AMI + softphone)

## Requirements

- Node.js 18+
- npm 9+
- Docker Engine (required to run agent containers)
- Asterisk PBX (required onfly for telephony sections)

## Local Development

This repository contains two independent npm projects. There is no npm workspace at root.

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
npm run start:dev
```

Backend runs on `http://localhost:3001` and frontend runs on `http://localhost:3000` in standalone dev mode.

## Data structure

- SQLite database mounted in `./data` (volume shared by the containers)
- JWT signed with `JWT_SECRET`, configurable via backend environment variables

## Local Verification

Run checks from each project directory:

```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm run build
```

CI for this repository currently builds and pushes Docker images on `main`, but does not run lint/tests for both projects. Validate locally before pushing.

See `backend/README.md` and `frontend/README.md` for full details.

## Usage

Enjoy the Agent Voice Response App experience! After installation, you can access the application through your browser.

<div align="center">
  <img src="https://github.com/agentvoiceresponse/.github/blob/main/profile/images/avr-dashboard-new.png" alt="Dashboard" width="600">
  <br>
  <em>The intuitive dashboard for managing your voice response agents</em>
</div>

## Support & Community

*   **GitHub:** [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse) - Report issues, contribute code.
*   **Discord:** [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74) - Join the community discussion.
*   **Docker Hub:** [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse) - Find Docker images.
*   **Wiki:** [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home) - Project documentation and guides.

## Support AVR

AVR is free and open-source.
Any support is entirely voluntary and intended as a personal gesture of appreciation.
Donations do not provide access to features, services, or special benefits, and the project remains fully available regardless of donations.

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see the [LICENSE](LICENSE.md) file for details.

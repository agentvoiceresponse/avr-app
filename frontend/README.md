# AVR Admin Frontend

Next.js 14 application that powers the AVR administration panel UI. The project uses Tailwind CSS, shadcn/ui, Framer Motion animations and the shared OpenSaaS AVR design system.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm 9+

## Getting started

Install dependencies and run the local dev server:

```bash
pnpm install
pnpm dev
```

The app will be available at [http://localhost:3001](http://localhost:3001) when launched through the root `docker-compose.yml`, or at [http://localhost:3000](http://localhost:3000) when running standalone.

## Environment configuration

Copy `.env.example` to `.env` and adjust as needed. Two environment variables control telephony integrations:

- `NEXT_PUBLIC_TELEPHONY_STATUS_URL`: URL that exposes the telephony service health endpoint. The sidebar group for telephony features is rendered only when this endpoint responds with HTTP 200. Default: `https://localhost:8089/httpstatus`.
- `NEXT_PUBLIC_WEBRTC_CLIENT_URL`: When set, toggles the embedded WebRTC phone inside the layout header.

Restart the dev server after editing environment variables.

## Project structure

- `app/`: Next.js App Router pages
- `components/`: Shared UI components using shadcn/ui primitives
- `lib/`: Utilities such as authentication and i18n helpers

## Available scripts

```bash
pnpm dev       # Start Next.js dev server
pnpm build     # Create production build
pnpm start     # Run production server
pnpm lint      # Run lint checks
```

## Internationalization

Translations live under `lib/i18n`. Update the English and Italian dictionaries whenever adding new navigation items or UI copy.

## Additional resources

- [Next.js documentation](https://nextjs.org/docs)
- [shadcn/ui documentation](https://ui.shadcn.com/)
- [Framer Motion documentation](https://www.framer.com/motion/)

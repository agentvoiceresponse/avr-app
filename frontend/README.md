# AVR Admin Frontend

Next.js 16 + React 19 application that powers the AVR administration panel UI. The project uses Tailwind CSS, shadcn/ui, Framer Motion animations and `next-runtime-env`.

## Prerequisites

- Node.js 18+
- npm 9+

## Getting started

Install dependencies and run the local dev server:

```bash
npm install
npm run start:dev
```

The app runs at [http://localhost:3000](http://localhost:3000) in standalone dev mode.

## Environment configuration

Copy `.env.example` to `.env` and adjust as needed. Two environment variables control telephony integrations:

- `NEXT_PUBLIC_API_URL`: backend URL (usually `http://localhost:3001` in local development)

- `NEXT_PUBLIC_TELEPHONY_STATUS_URL`: URL that exposes the telephony service health endpoint. The sidebar group for telephony features is rendered only when this endpoint responds with HTTP 200. Default: `https://localhost:8089/httpstatus`.
- `NEXT_PUBLIC_WEBRTC_CLIENT_URL`: When set, toggles the embedded WebRTC phone inside the layout header.

Important: runtime env values are read via `env('NAME')` from `next-runtime-env` (not `process.env` in browser code). Restart the dev server after editing `.env`.

## Project structure

- `app/`: Next.js App Router pages
- `components/`: Shared UI components using shadcn/ui primitives
- `lib/`: Utilities such as authentication and i18n helpers

## Available scripts

```bash
npm run start:dev  # Start Next.js dev server
npm run build      # Create production build
npm run start      # Run production server
npm run lint       # Run lint checks
npm run clean      # Remove .next artifacts
```

## Internationalization

Translations live under `lib/i18n`. Update the English and Italian dictionaries whenever adding new navigation items or UI copy.

## Additional resources

- [Next.js documentation](https://nextjs.org/docs)
- [shadcn/ui documentation](https://ui.shadcn.com/)
- [Framer Motion documentation](https://www.framer.com/motion/)

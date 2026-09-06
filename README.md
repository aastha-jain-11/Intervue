# Intervue Backend

Smart Interview Scheduler backend built with Express, TypeScript, Prisma, and PostgreSQL.

## Requirements

- Node.js 18+
- PostgreSQL 14+

## Setup

```powershell
npm install
Copy-Item .env.example .env
```

Update `.env` with a PostgreSQL connection string, a random JWT secret of at least 32 characters, and distinct internal-service tokens.

Generate the Prisma client:

```powershell
npx prisma generate
```

Create the first local database migration after PostgreSQL is running:

```powershell
npx prisma migrate dev --name init
```

## Development

```powershell
npm run dev
```

The server listens on `http://localhost:3000` by default. Check it with:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

## Validation

```powershell
npm run typecheck
npm run build
npx prisma validate
```

The backend stores scheduling timestamps in UTC. User and candidate timezones are stored separately for conversion and display. External calendar and notification providers will be added behind service interfaces as their modules are implemented.

## Internal services

The Node/Express application is the only public API. The resume-screening and notification FastAPI applications are internal services: browser clients must never call them directly, and they do not receive browser JWTs. Node authenticates internal requests with the corresponding service token using `Authorization: Bearer <token>`.

PostgreSQL is owned by Node/Prisma. Python services return computed results or provider-delivery results; they do not own recruitment-domain records. Configure these variables in `.env` for local development:

- `RESUME_SERVICE_URL`, `RESUME_SERVICE_TOKEN`
- `NOTIFICATION_SERVICE_URL`, `NOTIFICATION_SERVICE_TOKEN`
- `RESUME_SERVICE_SCREENING_TIMEOUT_MS` (default: 30000)
- `RESUME_SERVICE_COMPUTE_TIMEOUT_MS` (default: 10000)
- `NOTIFICATION_SERVICE_TIMEOUT_MS` (default: 10000)

The Python Dockerfiles do not currently publish a port, so set the two URLs to match the ports used when starting the services. Service tokens must remain server-side only.

Set each Python service's `INTERNAL_SERVICE_TOKEN` to its matching Node token (`RESUME_SERVICE_TOKEN` or `NOTIFICATION_SERVICE_TOKEN`).

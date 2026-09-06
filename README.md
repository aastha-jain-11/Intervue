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

Update `.env` with a PostgreSQL connection string and a random JWT secret of at least 32 characters.

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

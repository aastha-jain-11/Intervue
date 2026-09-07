# Intervue — Smart Interview Scheduler

Intervue is a smart interview scheduling platform that automates candidate screening, interviewer matching, availability checking, conflict detection, and interview scheduling.

## Architecture

```text
React + TypeScript + Vite
          |
          v
Node.js + Express + TypeScript
          |
          v
PostgreSQL / Prisma
          |
          +----------------------+
          |                      |
          v                      v
Resume Screening          Notification Service
FastAPI                   FastAPI

The Node/Express API is the only public API. Browser clients never communicate directly with the Python services.

Tech Stack
Frontend
React
TypeScript
Vite
React Router
Oxlint
Backend
Node.js
Express
TypeScript
Prisma
PostgreSQL / Neon
JWT authentication
Google OAuth
bcrypt
Internal Services
Python
FastAPI
Resume screening
Interviewer matching
Notification delivery
Features
Candidate and interviewer authentication
Google OAuth
Role-based access control
Job creation and management
Candidate applications
Resume screening
Interviewer matching
Candidate and interviewer availability management
Automatic interview scheduling
Availability intersection
Conflict detection
Slot recommendations
Calendar event creation
Interview notifications
Audit logging
Model-run tracking
Project Structure
Intervue/
├── src/                         # Node.js backend
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── applications/
│   │   ├── auth/
│   │   ├── candidates/
│   │   ├── interviews/
│   │   ├── jobs/
│   │   └── users/
│   ├── services/
│   ├── routes/
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── resume-screening/            # Internal FastAPI service
│
├── notification-service/        # Internal FastAPI service
│
├── tests/
│
├── docs/
│
├── package.json
├── tsconfig.json
├── tsconfig.server.json
└── vite.config.ts
Setup

Install dependencies:

npm install

Create the environment file:

Copy-Item .env.example .env

Configure .env with the PostgreSQL/Neon connection string, JWT configuration, OAuth configuration, and internal service configuration.

Generate Prisma Client:

npx prisma generate

Check the Prisma schema:

npx prisma validate

Controlled demo seed (use only with a local/development database):

```powershell
$env:DEMO_PASSWORD = '<local-only-password>'
npm run seed:demo
```

The seed is idempotent and creates one TA/admin, candidate, interviewer, open job, shortlisted application, compatible future availability, and an unscheduled technical interview. It does not reset the database or create a public seed endpoint. Existing records with the configured demo emails are preserved.
Development
Frontend
npm run dev

The frontend runs on:

http://localhost:5173
Backend

In another terminal:

npm run dev:backend

The Node API runs on:

http://localhost:3000

Health check:

Invoke-RestMethod http://localhost:3000/health
Internal Services
Resume Screening

From the resume-screening directory:

$env:INTERNAL_SERVICE_TOKEN = '<matching service token>'
uvicorn app.main:app --host 127.0.0.1 --port 8001
Notification Service

From the notification-service directory:

$env:INTERNAL_SERVICE_TOKEN = '<matching service token>'
uvicorn app.main:app --host 127.0.0.1 --port 8002

Node communicates with these services using server-side bearer tokens.

The browser must never call these services directly.

Validation

Frontend build:

npm run build

Backend typecheck:

npm run typecheck

Backend build:

npm run build:backend

Prisma validation:

npx prisma validate

Check for whitespace errors:

git diff --check
Scheduling Flow
Candidate applies
       |
       v
Resume screening
       |
       v
Interview requested
       |
       v
Find suitable interviewers
       |
       v
Match candidate + interviewer availability
       |
       v
Generate feasible slots
       |
       v
Check conflicts
       |
       v
Book interview
       |
       +---------> Calendar Event
       |
       +---------> Notification Service
       |
       v
Audit Log

Automatic scheduling performs a final conflict check immediately before booking to prevent double-booking.

API Documentation

Detailed API documentation is available in:

docs/api.md
Database

PostgreSQL is the source of truth for recruitment-domain data.

Scheduling timestamps are stored in UTC. User and candidate timezone information is stored separately for conversion and display.

Python services perform computation and provider-related work but do not own recruitment-domain records.

Security
JWT-based authentication
HTTP-only authentication cookies
Password hashing with bcrypt
Role-based authorization
Server-side ownership checks
Internal service bearer-token authentication
No browser access to internal Python services
Audit logging for important business actions
Secrets stored through environment variables
# Intervue API Plan

This document defines the API surface. Phase 1 authentication and the current-user endpoint are implemented.

## Authentication and users

| # | Method | Endpoint | Purpose | Authentication | Roles |
|---:|---|---|---|---|---|
| 1 | POST | `/auth/register` | Create an account | Public | None |
| 2 | POST | `/auth/login` | Authenticate a user | Public | None |
| 3 | GET | `/users/me` | Return the authenticated user | JWT | Any authenticated user |
| 4 | POST | `/auth/refresh` | Refresh an access token | Refresh token | Any authenticated user |
| 5 | GET | `/users` | List users | JWT | Recruiter, TA admin |
| 6 | GET | `/users/:id` | Get a user | JWT | Recruiter, interviewer, TA admin |
| 7 | PATCH | `/users/:id` | Update user details | JWT | Owner, TA admin |

## Candidates and jobs

| # | Method | Endpoint | Purpose | Authentication | Roles |
|---:|---|---|---|---|---|
| 8 | POST | `/candidates` | Create a candidate | JWT | Recruiter, TA admin |
| 9 | GET | `/candidates` | List candidates | JWT | Recruiter, interviewer, TA admin |
| 10 | GET | `/candidates/:id` | Get candidate details | JWT | Recruiter, interviewer, TA admin |
| 11 | PATCH | `/candidates/:id` | Update candidate details | JWT | Recruiter, TA admin |
| 12 | POST | `/jobs` | Create a job | JWT | Recruiter, TA admin |
| 13 | GET | `/jobs` | List jobs | JWT | Recruiter, interviewer, TA admin |
| 14 | GET | `/jobs/:id` | Get job details | JWT | Recruiter, interviewer, TA admin |
| 15 | PATCH | `/jobs/:id` | Update a job | JWT | Recruiter, TA admin |

## Applications and pipeline

| # | Method | Endpoint | Purpose | Authentication | Roles |
|---:|---|---|---|---|---|
| 16 | POST | `/applications` | Create an application | JWT | Recruiter, TA admin |
| 17 | GET | `/applications/:id` | Get an application | JWT | Recruiter, interviewer, TA admin |
| 18 | GET | `/candidates/:candidateId/applications` | List candidate applications | JWT | Recruiter, interviewer, TA admin |
| 19 | GET | `/jobs/:jobId/applications` | List job applications | JWT | Recruiter, interviewer, TA admin |
| 20 | POST | `/applications/:applicationId/stages` | Add a pipeline stage | JWT | Recruiter, TA admin |
| 21 | PATCH | `/stages/:stageId` | Update a pipeline stage | JWT | Recruiter, TA admin |
| 22 | POST | `/stages/:stageId/decision` | Record a stage decision | JWT | Recruiter, interviewer, TA admin |

## Interviews and scheduling

| # | Method | Endpoint | Purpose | Authentication | Roles |
|---:|---|---|---|---|---|
| 23 | POST | `/interviews` | Create an interview request | JWT | Recruiter, TA admin |
| 24 | GET | `/interviews/:id` | Get interview details | JWT | Recruiter, interviewer, TA admin |
| 25 | PATCH | `/interviews/:id` | Update interview details | JWT | Recruiter, TA admin |
| 26 | POST | `/interviews/:id/cancel` | Cancel an interview | JWT | Recruiter, TA admin |
| 27 | POST | `/interviews/:id/availability` | Submit availability slots | JWT | Candidate-facing auth, interviewer |
| 28 | GET | `/interviews/:id/availability` | View submitted availability | JWT | Recruiter, interviewer, TA admin |
| 29 | POST | `/interviews/:id/book` | Book a slot and create a calendar event | JWT | Recruiter, TA admin |
| 30 | POST | `/interviews/:id/notifications` | Queue interview notifications | JWT | Recruiter, TA admin |

## Architecture mapping

Each endpoint will follow this path:

```text
Route -> Middleware -> Controller -> Service -> Prisma repository/provider
```

Calendar integrations and notification delivery will be implemented behind provider interfaces. Audit records will be written by the relevant services rather than exposed as a feature API in this initial list.

## Data and security notes

- Scheduling timestamps are stored as UTC `DateTime` values.
- `User.timezone` and `Candidate.timezone` store display/conversion preferences.
- Conversion to local time occurs in the service or API presentation layer.
- Availability ownership is constrained by `ownerType`: candidate slots use `candidateId` only; interviewer slots use `userId` only.
- Public registration permits only `recruiter` and `interviewer` roles. A `ta_admin` account must be created later through a controlled seed or one-time administrative provisioning process, never through public registration.
- TODO: redact sensitive query parameters from request logs during security hardening.
- TODO: redact sensitive error messages before they are written to logs.
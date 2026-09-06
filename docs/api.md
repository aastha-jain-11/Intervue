# Intervue API

The backend currently exposes the authentication and current-user endpoints below. Future domain APIs will be documented when implemented.

## Authentication roles

The canonical roles are `candidate`, `interviewer`, and `ta_admin`. There is no `recruiter` role.

- `candidate`: owns candidate profile, applications, interview information, and availability.
- `interviewer`: owns interviewer profile, availability, and assigned interviews.
- `ta_admin`: manages recruitment and interview orchestration.

Public registration permits only `candidate` and `interviewer`. `ta_admin` accounts must be provisioned through a controlled administrative process.

## Authentication endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| POST | `/auth/register` | Create a candidate or interviewer account and profile | Public |
| POST | `/auth/login` | Authenticate with email and password and issue an application JWT | Public |
| POST | `/auth/logout` | Clear the OAuth application-JWT cookie and confirm logout | Public |
| GET | `/auth/google` | Start Google OAuth authorization-code flow | Public |
| GET | `/auth/google/callback` | Verify Google identity, link/create a local account, and issue an application JWT cookie | Google OAuth |
| GET | `/users/me` | Return the authenticated user without `passwordHash` | JWT or OAuth cookie |

## Authentication flow

Email/password login and Google OAuth both issue the backend's application JWT. Protected requests may send it as `Authorization: Bearer <token>`. Google OAuth stores the application JWT in an HTTP-only cookie and never stores Google access or refresh tokens.

`POST /auth/logout` returns `{ "success": true, "data": { "message": "Logged out successfully" } }`. For OAuth cookie authentication, the backend clears the `intervue_auth` HTTP-only cookie. Bearer JWTs are stateless and are not invalidated by this endpoint; the frontend must discard its stored bearer token.

Authentication middleware verifies the JWT and attaches the user ID and canonical role to the request. Reusable RBAC middleware enforces role permissions before controllers run.

## MVP interview workflow

Browser clients call only this Node API; they must never call the Python services directly. All `/api` endpoints below use `Authorization: Bearer <application JWT>` and the standard `{ "success": true, "data": ... }` response envelope.

| Method | Endpoint | Role | Request | Purpose |
|---|---|---|---|---|
| POST | `/api/jobs/:jobId/applications` | candidate | `{ "resumeUrl"?: "https://..." }` | Apply once to an open job. |
| GET | `/api/applications` | candidate, ta_admin | None | Candidate sees own applications; TA sees all. |
| GET | `/api/applications/:applicationId` | owner, ta_admin | None | Read application and pipeline status. |
| POST | `/api/applications/:applicationId/screening` | owner, ta_admin | Raw `application/pdf` body; optional `x-resume-filename` header | Run resume screening and persist its result. |
| POST | `/api/applications/:applicationId/interviews` | ta_admin | `{ "roundType": "technical", "durationMins": 45, "pipelineStageId"?: "uuid" }` | Create an interview. |
| GET | `/api/interviews/:interviewId` | candidate owner, ta_admin | None | Read interview details. |
| PATCH | `/api/interviews/:interviewId` | ta_admin | `{ "durationMins"?: 45, "status"?: "cancelled" }` | Update basic interview fields. |
| POST | `/api/interviews/:interviewId/recommendations` | ta_admin | None | Rank PostgreSQL interviewer profiles. |
| POST | `/api/interviews/:interviewId/auto-schedule` | ta_admin | None | Select the best interviewer and a conflict-free slot, then schedule and notify. |

`POST /api/interviews/:interviewId/auto-schedule` returns the scheduled interview plus `matchScore`, `candidateAvailable`, `interviewerAvailable`, `calendarEventCreated`, and `notificationSent`. It returns `409 NO_FEASIBLE_SLOT` when no candidate/interviewer interval can fit the interview, or `409 SCHEDULING_CONFLICT` if final conflict checks prevent every recommended option. Notification failure does not reverse a successful booking; `notificationSent` is then `false`.

## Data representation

- Candidate and Interviewer are one-to-one profiles associated with User accounts.
- Availability is represented through normalized UTC `AvailabilitySlot` rows rather than JSON so scheduling can query, index, intersect, and transition slots safely.
- OAuth accounts are stored separately with a unique `(provider, providerAccountId)` pair.
- AuditLog remains separate from ModelRun and records business/security actions.

## Jobs endpoints

All Jobs endpoints require an application JWT. Job creation, updates, and status changes require the `ta_admin` role.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/jobs` | Create a draft job; `createdBy` is taken from the authenticated user |
| GET | `/api/jobs` | List jobs; supports `status`, `department`, and `search` filters |
| GET | `/api/jobs/:jobId` | Retrieve one job |
| PUT | `/api/jobs/:jobId` | Update supplied mutable job fields |
| PATCH | `/api/jobs/:jobId/status` | Change job status to `draft`, `open`, or `closed` |

Successful responses use `{ "success": true, "data": { ... } }`. List responses include `jobs` and `count`. Job mutations record `JOB_CREATED`, `JOB_UPDATED`, or `JOB_STATUS_CHANGED` audit events.

## Candidate profile and availability endpoints

These endpoints require an application JWT and the `candidate` role. Ownership is derived from the authenticated user; candidate IDs are never accepted from the client.

| Method | Endpoint | Request body | Purpose |
|---|---|---|---|
| GET | `/api/candidates/me` | None | Return the authenticated candidate profile |
| PUT | `/api/candidates/me` | Any of `name`, `email`, `phone`, `resumeUrl`, `timezone` | Update the authenticated candidate profile |
| GET | `/api/candidates/me/availability` | None | List the candidate's UTC availability slots in ascending start order |
| POST | `/api/candidates/me/availability` | `{ "startUtc": "...", "endUtc": "..." }` | Create a future, non-overlapping UTC availability slot |
| PUT | `/api/candidates/me/availability/:slotId` | `{ "startUtc": "...", "endUtc": "..." }` | Update an owned availability slot |
| DELETE | `/api/candidates/me/availability/:slotId` | None | Delete an owned availability slot |

Profile responses use `data.candidate`; availability responses use `data.availability`. Profile-not-found and missing-owned-slot requests return `404`, invalid input returns `400`, overlapping slots and duplicate emails return `409`, and authenticated non-candidates receive `403`. Availability mutations record `CANDIDATE_AVAILABILITY_CREATED`, `CANDIDATE_AVAILABILITY_UPDATED`, or `CANDIDATE_AVAILABILITY_DELETED` audit events; profile changes record `CANDIDATE_PROFILE_UPDATED`.

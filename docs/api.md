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

## Data representation

- Candidate and Interviewer are one-to-one profiles associated with User accounts.
- Availability is represented through normalized UTC `AvailabilitySlot` rows rather than JSON so scheduling can query, index, intersect, and transition slots safely.
- OAuth accounts are stored separately with a unique `(provider, providerAccountId)` pair.
- AuditLog remains separate from ModelRun and records business/security actions.

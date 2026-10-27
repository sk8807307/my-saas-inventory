# Frontend authentication integration

Authentication routes and request fields follow `backend/apps/authentication/`.
The browser talks to Django using its session cookie and does not persist session
IDs or passwords in local storage.

## API endpoint map

The backend mounts the authentication URL configuration at `/api/auth/`.

| Frontend use | Django endpoint | Method | Purpose |
| --- | --- | --- | --- |
| Login page | `/api/auth/csrf/`, then `/api/auth/login/` | GET, POST | Establish session; receive `user` and active `memberships` |
| ERP header | `/api/auth/me/` | GET | Load safe user and membership details for the header |
| Sign-out control | `/api/auth/csrf/`, then `/api/auth/logout/` | GET, POST | Invalidate the Django session |
| Forgot password | `/api/auth/csrf/`, then `/api/auth/password-reset/` | GET, POST | Request a reset email with a generic response |
| Reset password | `/api/auth/password-reset/confirm/` | POST | Submit `uid`, `token`, `new_password`, and `new_password_confirm` |
| Future tenant picker | `/api/auth/memberships/`, `/api/auth/tenant/select/` | GET, POST | List memberships and set the active tenant on the session |

All API calls are centralized in `src/features/auth/service.ts`. Set
`NEXT_PUBLIC_API_BASE_URL` to the Django origin if it differs from the local
fallback `http://localhost:8000`.

## Backend behavior and limits

- Login accepts an email and password and returns the safe user profile and active memberships. The password is not retained after submission.
- Login clears `active_tenant_id`. Tenant selection exists in Django but no picker is implemented in this UI change.
- There is no self-service registration endpoint. `/register` tells users to request account creation or an invite from their workspace administrator.
- Password reset email links point at `/reset-password?uid=…&token=…` using Django's `FRONTEND_BASE_URL` setting.
- Django must permit the frontend origin in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, with credentialed CORS enabled. The frontend fetches the CSRF token and includes it on POST requests.
- `src/app/(erp)/layout.tsx` wraps ERP routes in `ErpAuthGuard`. It checks `/api/auth/me/` before showing the shell and redirects Django 401/403 responses to `/login?next=…`. API/network failures show a retry message rather than being mistaken for a signed-out session.
- The route guard is a browser navigation check, not a security boundary. Django must enforce authentication, tenant scope, and permissions on every protected API endpoint. The root route redirects to `/login`. The login page checks for an existing session and sends authenticated users to their requested page or `/dashboard`; direct ERP URLs are covered by the ERP guard.
- In local development, Django's console email backend prints reset messages in its server terminal unless a mail backend is configured.
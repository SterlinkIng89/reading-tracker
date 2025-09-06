# Changelog

## [1.0.0] - 2025-09-04

- Initial backend and frontend structure; Docker Compose with backend, frontend and MongoDB.

## [2.0.0] - 2025-09-04

- Added JWT-based authentication (access + refresh tokens) and auth endpoints (`/auth/token`, `/auth/refresh`, `/auth/logout`) in the backend; protected previously public endpoints (e.g. `GET /users`).

## [3.0.0] - 2025-09-06

- Enhanced Astro middleware with server-side authentication and token expiration checks using `jose` library.
- Optimized token refresh logic: only refreshes access tokens when expired or missing, reducing unnecessary backend calls.
- Fixed Docker networking: middleware now uses `http://backend:8000` for internal container communication instead of `localhost`.
- Improved authentication flow: automatic redirects for logged-in users on public pages, and secure handling of HttpOnly cookies.
- Added JWT decoding for access token validation in middleware.
- Resolved middleware loading issues and dependency management in Docker containers.

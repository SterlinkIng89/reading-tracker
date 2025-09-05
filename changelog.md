# Changelog

## [1.0.0] - 2025-09-04

- Initial backend and frontend structure; Docker Compose with backend, frontend and MongoDB.

## [2.0.0] - 2025-09-04

- Added JWT-based authentication (access + refresh tokens) and auth endpoints (`/auth/token`, `/auth/refresh`, `/auth/logout`) in the backend; protected previously public endpoints (e.g. `GET /users`).

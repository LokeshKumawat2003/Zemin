# Zemin Backend Documentation

This folder is the canonical guide to the Zemin backend API and its runtime architecture.

## Documents

- [API Reference](./API_REFERENCE.md): complete HTTP endpoint inventory for users, creators, and admins.
- [Architecture](./ARCHITECTURE.md): services, databases, integrations, security boundaries, and deployment shape.
- [Request Flows](./REQUEST_FLOWS.md): Mermaid diagrams for authentication, content, payments, live streaming, and admin moderation.
- [User Guide](./USER_GUIDE.md): user, creator, and client integration workflows.
- [Admin Guide](./ADMIN_GUIDE.md): administrator setup, permissions, and operational workflows.
- [Data Model](./DATA_MODEL.md): database ownership and domain entity map.
- [Configuration and Deployment](./CONFIGURATION.md): environment variables, startup, and production checklist.
- [Testing and Troubleshooting](./OPERATIONS.md): test commands, smoke checks, and common failures.

## Runtime

- API base URL: `http://localhost:3000`
- API prefix: `/api/v1`
- Health: `/health`
- LiveKit health: `/health/livekit`
- Uploaded media: `/uploads/<filename>`
- Socket.IO: same host and port as the HTTP server

## Existing Tools

- [Admin Postman collection](../backend/Zemin-Admin-API.postman_collection.json)

## Quick Start

```powershell
cd backend
npm install
npm run seed
npm run dev
```

The backend requires Node.js 18 or newer. Configure `backend/.env` before using database, JWT, payment, push notification, or LiveKit features.

## Authentication

Send the access token on protected HTTP requests:

```http
Authorization: Bearer <access-token>
```

Socket.IO clients send the same token in `handshake.auth.token`. Admin endpoints require a token whose user has the `admin` role.

## Documentation Scope

The endpoint matrix is generated from the route declarations currently in `backend/routes`. Payload fields and response details can vary by controller state; use the linked admin guide and controller implementation for field-level examples.

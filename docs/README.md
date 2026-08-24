# Zemin Platform — Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Last Updated:** July 18, 2026  
**Project Codename:** Zemin  
**Classification:** Internal / Confidential  

---

## Executive Summary

Zemin is a creator monetization and live entertainment platform combining the best capabilities of Tango (live streaming), OnlyFans (exclusive content subscriptions), Patreon (tiered memberships), and Fanvue (creator economy tools). The platform enables creators to publish content, go live, receive gifts and tips, sell subscriptions, and build direct fan relationships — all from a single mobile-first experience backed by a scalable Node.js API and real-time infrastructure.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.86 (Native CLI), TypeScript, Redux Toolkit, React Navigation |
| Real-time | Socket.IO Client, WebRTC, LiveKit (self-hosted) |
| Media | React Native Vision Camera, React Native Video, Cloudinary / S3 |
| Storage (Client) | MMKV Storage |
| Backend | Node.js, Express.js, MongoDB, Redis, JWT |
| Admin | React, Vite, Material UI |
| Payments | Razorpay, Stripe |
| Streaming | WebRTC, STUN/TURN, mediasoup / LiveKit |
| Deployment | Docker, Nginx, PM2, MongoDB Atlas, CI/CD |

---

## Estimated Project Scale

| Metric | Count |
|--------|-------|
| React Native screens | 180–250 |
| Backend API endpoints | 200+ |
| MongoDB collections | 30+ |
| Socket.IO events | 80+ |
| Admin pages | 60+ |
| Database diagrams | 25+ |
| Architecture diagrams | 20+ |
| Total documentation pages | 300–500 |

---

## Documentation Index

### Core SRS Volumes

| Vol | Title | File | Est. Pages |
|-----|-------|------|-----------|
| 1 | Product Requirements | [Volume-01-Product-Requirements.md](./SRS/Volume-01-Product-Requirements.md) | 40–60 |
| 2 | UI/UX Design | [Volume-02-UI-UX-Design.md](./SRS/Volume-02-UI-UX-Design.md) | 80–120 |
| 3 | Backend API | [Volume-03-Backend-API.md](./SRS/Volume-03-Backend-API.md) | 100 |
| 4 | Database Design | [Volume-04-Database-Design.md](./SRS/Volume-04-Database-Design.md) | 40–60 |
| 5 | React Native Architecture | [Volume-05-React-Native-Architecture.md](./SRS/Volume-05-React-Native-Architecture.md) | 30–40 |
| 6 | Backend Architecture | [Volume-06-Backend-Architecture.md](./SRS/Volume-06-Backend-Architecture.md) | 30–40 |
| 7 | Live Streaming System | [Volume-07-Live-Streaming-System.md](./SRS/Volume-07-Live-Streaming-System.md) | 40–50 |
| 8 | Payment System | [Volume-08-Payment-System.md](./SRS/Volume-08-Payment-System.md) | 30–40 |
| 9 | Admin Panel | [Volume-09-Admin-Panel.md](./SRS/Volume-09-Admin-Panel.md) | 40–50 |
| 10 | Deployment | [Volume-10-Deployment.md](./SRS/Volume-10-Deployment.md) | 30–40 |
| 11 | Security | [Volume-11-Security.md](./SRS/Volume-11-Security.md) | 25–35 |
| 12 | Testing | [Volume-12-Testing.md](./SRS/Volume-12-Testing.md) | 25–35 |

### Supplementary Documentation

| Section | Location |
|---------|----------|
| API Endpoint Reference | [api/](./api/) |
| Database Collection Schemas | [database/](./database/) |
| Architecture Diagrams | [diagrams/](./diagrams/) |
| Folder Structure Reference | [architecture/](./architecture/) |

---

## User Roles

| Role | Description |
|------|-------------|
| **Fan** | Consumes content, sends gifts, subscribes, joins live rooms |
| **Creator** | Publishes content, goes live, earns revenue, manages subscribers |
| **Moderator** | Reviews reports, moderates live streams, handles flagged content |
| **Admin** | Full platform management, analytics, payments, CMS |

---

## Quick Navigation by Feature

- **Authentication** → Vol 1 §3, Vol 3 §2, Vol 11 §2
- **Feed & Posts** → Vol 1 §4.2, Vol 2 §5, Vol 3 §4
- **Live Streaming** → Vol 1 §4.8, Vol 2 §12, Vol 7 (full)
- **Payments & Wallet** → Vol 1 §5, Vol 8 (full)
- **Chat & Messaging** → Vol 2 §11, Vol 3 §8
- **Admin Dashboard** → Vol 9 (full)

---

## Document Conventions

- **SHALL** = mandatory requirement
- **SHOULD** = recommended requirement
- **MAY** = optional requirement
- All API paths are prefixed with `/api/v1`
- All timestamps are ISO 8601 UTC
- All monetary values stored in smallest currency unit (paise/cents)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-18 | Zemin Engineering | Initial SRS release |

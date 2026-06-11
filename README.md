# FlexiStay — Hourly Hotel Booking Platform

## Folder Structure (Guru / Person 4)

```
FlexiStay/
├── frontend/
│   ├── web/                  ← Next.js 15 (App Router, Tailwind, Radix UI)
│   └── mobile/               ← React Native (Phase 2)
└── backend/
    ├── auth-service/         ← Fastify + JWT RS256 + RBAC + Redis
    ├── hotel-service/        ← Room listing, availability, partner API
    └── notification-service/ ← BullMQ + SendGrid + Twilio
```

## Quick Start

### Frontend (web)
```bash
cd frontend/web
npm install
npm run dev        # http://localhost:3000
```

### Backend services
```bash
# Each service runs independently
cd backend/auth-service && npm install && npm run dev        # port 4001
cd backend/hotel-service && npm install && npm run dev       # port 4002
cd backend/notification-service && npm install && npm run dev # port 4003
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web frontend | Next.js 15, TypeScript, Tailwind CSS, Radix UI |
| Mobile | React Native (Expo) |
| Auth service | Fastify, JWT RS256, Redis, Prisma |
| Hotel service | Fastify, Prisma, PostgreSQL |
| Notifications | Fastify, BullMQ, SendGrid, Twilio, Firebase |

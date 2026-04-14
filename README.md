# MOMENT

Capture the moment. Share the story.

MOMENT is a production-oriented photo sharing platform built for COM769 Scalable Advanced Software Solutions. The project is split into two deployable services: a Next.js 14 frontend and an Express.js backend API.

## Tech Stack

- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS, Framer Motion, Zustand
- Backend: Node.js, Express.js, TypeScript, Mongoose
- Database: MongoDB Atlas
- File Storage: Cloudflare R2 (S3-compatible)
- Cache: Upstash Redis
- Auth: JWT access/refresh tokens + bcryptjs
- CI/CD: GitHub Actions
- Deployment Targets: Vercel (frontend), Render (backend)

## Repository Structure

```text
moment/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── store/
│   └── types/
└── package.json
```

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB Atlas connection string
- Cloudflare R2 credentials
- Upstash Redis credentials

## Setup

1. Install root dependencies:

```bash
npm install
```

2. Install backend dependencies:

```bash
npm install --workspace backend
```

3. Install frontend dependencies:

```bash
npm install --workspace frontend
```

4. Copy environment templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

5. Start both services in development:

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=moment-media
CLOUDFLARE_R2_PUBLIC_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FRONTEND_URL=http://localhost:3000
ADMIN_SETUP_SECRET=
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=MOMENT
```

## Available Scripts

- `npm run dev`: run frontend and backend together
- `npm run build`: build backend and frontend
- `npm run test`: run backend tests and frontend lint checks


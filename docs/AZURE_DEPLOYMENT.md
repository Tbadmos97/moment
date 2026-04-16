# Azure Deployment Guide (Frontend + Backend)

This project is a two-service deployment:
- frontend: Next.js 14
- backend: Express + MongoDB Atlas + Redis + Cloudflare R2

## 1. Azure Architecture

Use this production setup:
- Azure App Service (Linux) for backend API
- Azure Static Web Apps (or App Service) for frontend
- Azure Key Vault for secrets
- MongoDB Atlas (external)
- Upstash Redis (external)
- Cloudflare R2 (external)

## 2. Backend Deployment (App Service)

1. Create App Service Plan (Linux, Node 20).
2. Create Web App named e.g. `moment-api-prod`.
3. Configure startup command:

```bash
npm run start --workspace backend
```

4. Add backend environment variables in App Service Configuration:
- NODE_ENV=production
- PORT=8080
- MONGODB_URI=...
- JWT_ACCESS_SECRET=...
- JWT_REFRESH_SECRET=...
- JWT_ACCESS_EXPIRES=15m
- JWT_REFRESH_EXPIRES=7d
- CLOUDFLARE_R2_ACCOUNT_ID=...
- CLOUDFLARE_R2_ACCESS_KEY_ID=...
- CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
- CLOUDFLARE_R2_BUCKET_NAME=moment-media
- CLOUDFLARE_R2_PUBLIC_URL=...
- UPSTASH_REDIS_REST_URL=...
- UPSTASH_REDIS_REST_TOKEN=...
- FRONTEND_URL=https://<your-frontend-domain>
- CREATOR_SIGNUP_SECRET=...
- ADMIN_SETUP_SECRET=...
- CLARIFAI_API_KEY=... (optional)
- CLARIFAI_USER_ID=clarifai (optional)
- CLARIFAI_APP_ID=main (optional)
- CLARIFAI_MODEL_ID=general-image-recognition (optional)

5. Enable HTTPS only and Always On.
6. Set health check path to `/api/health`.

## 3. Frontend Deployment

Option A (recommended): Azure Static Web Apps
- Build command: `npm run build --workspace frontend`
- Output: `.next` using Next.js support in Static Web Apps workflow
- Environment variable:
  - NEXT_PUBLIC_API_URL=https://<backend-domain>/api

Option B: Azure App Service
- Startup command:

```bash
npm run start --workspace frontend
```

- Environment variable:
  - NEXT_PUBLIC_API_URL=https://<backend-domain>/api

## 4. GitHub Actions CI/CD

Current CI workflow file:
- `.github/workflows/ci.yml`

It runs:
- frontend lint
- backend tests with coverage
- backend build
- frontend build

For CD, add two extra jobs (optional next step):
- deploy-backend via `azure/webapps-deploy@v3`
- deploy-frontend via Static Web Apps deploy action

Required GitHub Secrets:
- AZURE_WEBAPP_PUBLISH_PROFILE
- AZURE_STATIC_WEB_APPS_API_TOKEN

## 5. Production Checklist

- CORS FRONTEND_URL must match Azure frontend URL exactly
- Verify `/api/health` returns 200
- Verify upload returns public R2 image URL with HTTP 200
- Verify login + refresh token rotation works
- Verify `/api/auth/sessions` and session revocation works
- Create initial admin once via `/api/auth/setup-admin`
- Disable or rotate admin setup secret after first admin creation

## 6. Troubleshooting

- Backend starts but DB fails:
  - check MONGODB_URI and Atlas IP/network access
- Frontend cannot call API:
  - check NEXT_PUBLIC_API_URL and CORS origin list
- Upload succeeds but image URL not public:
  - check CLOUDFLARE_R2_PUBLIC_URL uses public domain (e.g. `pub-...r2.dev`)
- Session refresh fails:
  - verify JWT refresh secret and token expiry settings

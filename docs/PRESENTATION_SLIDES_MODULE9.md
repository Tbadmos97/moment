# Module 9 Presentation Slides (Complete Content)

## Slide 1 - Title

- MOMENT: Scalable Photo Sharing Platform
- COM769 Scalable Advanced Software Solutions
- Module 9: Advanced Features, UI Polish, Deployment Readiness
- Team / Student name, date

## Slide 2 - Problem and Goal

- Problem: social photo products need speed, reliability, and creator-first workflows
- Goal: deliver a production-style full-stack platform with role-based access and cloud-ready architecture
- Scope: frontend, backend, data, storage, cache, identity, DevOps

## Slide 3 - Final Architecture

- Frontend: Next.js 14 + React Query + Tailwind + Framer Motion
- Backend: Express + TypeScript + Mongoose
- Data layer: MongoDB Atlas
- Media layer: Cloudflare R2
- Cache layer: Upstash Redis
- Auth layer: JWT access + rotating refresh sessions
- CI/CD: GitHub Actions
- Deployment: Azure

## Slide 4 - Advanced Feature 1 (Cognitive Service)

- Implemented AI-assisted auto-tagging during upload
- Primary mode: Clarifai API integration (configurable via env)
- Fallback mode: Sharp color-analysis based semantic tags
- Output filtering: confidence >= 0.75, max 8 tags
- UX: creators can click AI-detected tags before publishing

## Slide 5 - Advanced Feature 2 (Identity Framework)

- Centralized identity logic in backend service layer
- Refresh token rotation on each refresh call
- Active session inventory endpoint:
  - GET `/api/auth/sessions`
- Session-level revocation endpoint:
  - DELETE `/api/auth/sessions/:tokenId`
- Benefit: secure multi-device control and reduced replay risk

## Slide 6 - Advanced Feature 3 (Real-time Interaction Sync)

- Photo detail and comments use 30-second polling
- Keeps likes/comments/ratings fresh without full page reload
- Improves perceived real-time behavior with minimal infrastructure complexity
- Reliable alternative to SSE/WebSocket for module scope

## Slide 7 - CI/CD as Advanced Feature

- GitHub Actions workflow implemented
- Pipeline stages:
  - frontend lint
  - backend tests with coverage
  - backend build
  - frontend build
- Artifacts: backend coverage published from CI
- Badges included in README for visibility and governance

## Slide 8 - UI/UX Polish Summary

- New 404 page with branded motion background
- Client-side React Error Boundary with retry UX
- Loading skeletons (minimum 4 cards)
- Empty states across feed/search/creator views
- Toast system standardized (top-center, brand styles)
- Micro-interactions added (like bounce, particle burst, hover lift)
- Progressive disclosure:
  - long caption show more/less
  - comments shown in batches
  - people list condensed with +X

## Slide 9 - Security and Reliability

- Rate limiting for auth and upload routes
- Session management with selective revocation
- Token rotation and short-lived access tokens
- Cache invalidation strategy for consistency
- Graceful backend startup with retry behavior

## Slide 10 - Scalability and Performance

- Redis-based cached read paths for high-traffic endpoints
- Query limits and pagination controls
- Optimized image pipeline (main + thumbnail)
- SSR/ISR on photo detail for balanced freshness and speed
- Client query tuning (stale/gc intervals)

## Slide 11 - Azure Deployment Plan

- Backend hosted on Azure App Service (Linux, Node 20)
- Frontend hosted on Azure Static Web Apps or App Service
- Secrets in Azure Key Vault/App Settings
- External managed services retained:
  - MongoDB Atlas
  - Upstash Redis
  - Cloudflare R2
- Health checks and HTTPS enforcement in production

## Slide 12 - Demo Flow (Suggested)

- Register creator account
- Upload photo and show AI tag suggestions
- Logout, register consumer
- Add comment + rating on creator photo
- View active sessions and revoke one session
- Show admin setup and admin dashboard routes

## Slide 13 - Evaluation Against Distinction Criteria

- 3+ advanced features delivered
- Enterprise-style identity/session control delivered
- CI/CD integrated and documented
- UI polish complete and coherent
- Deployment strategy production-ready on Azure

## Slide 14 - Risks and Mitigations

- Third-party API outages (Clarifai): fallback to Sharp tagger
- Token theft risk: rotation + per-session revocation
- Service downtime risk: health checks + restart strategy
- Data inconsistency risk: centralized cache invalidation

## Slide 15 - Conclusion

- MOMENT now meets Module 9 advanced implementation goals
- Distinction-ready architecture, UX, and engineering process
- Clear pathway to production deployment on Azure

## Appendix - Live Endpoints to Mention

- GET `/api/health`
- POST `/api/photos/analyze-tags`
- POST `/api/photos`
- POST `/api/photos/:photoId/comments`
- GET `/api/photos/:photoId/rating`
- GET `/api/auth/sessions`
- DELETE `/api/auth/sessions/:tokenId`

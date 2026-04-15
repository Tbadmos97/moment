# MOMENT Scalability Notes

## Implemented Features

### Stateless Backend
- Authentication is JWT-based (access + refresh tokens).
- No server-side session storage is required for user auth state.
- API instances can scale horizontally without sticky sessions.

### Redis Caching Layer
- Upstash Redis is integrated for read-heavy endpoints.
- Cache keys and TTLs are standardized in backend utilities.
- Write operations trigger centralized invalidation through cache service helpers.
- This reduces MongoDB load and improves API latency under concurrency.

### CDN + Object Storage
- Media assets are served from Cloudflare R2 URLs.
- Next.js image optimization is configured for R2 domains.
- CDN edge delivery supports geographic distribution and lower image latency.

### MongoDB Atlas Scaling
- Data persists in MongoDB Atlas.
- Architecture is compatible with Atlas vertical scaling from free tier (M0) to production tiers (M10+).

### Next.js ISR
- Photo detail pages use ISR with revalidate window.
- Popular pages can be pre-generated and refreshed incrementally.
- This lowers runtime server pressure for frequently visited content.

### Rate Limiting
- Express rate limiting is active.
- Auth and general request limits protect APIs from abuse and noisy traffic.

### Image Optimization
- Image upload pipeline uses Sharp.
- Outputs WebP main asset and WebP thumbnail.
- Auto-orientation and metadata stripping reduce payload and improve rendering speed.

### Connection Pooling
- Mongoose connection pooling is configured by environment.
- Development defaults: maxPoolSize 10.
- Production defaults: maxPoolSize 100.

## Operational Impact
- Lower average API response times for repeated reads.
- Better resilience under burst traffic.
- Reduced DB round-trips for feed/detail/comment-heavy interactions.
- Cleaner scale-out path for both backend APIs and frontend page delivery.

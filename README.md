⚡ Alphora API — Helius‑Powered Solana Market Data API

Ultra‑fast, developer‑friendly REST API for Solana token data, prices, search, wallets, and trades — built with Express, undici, AJV, and an aggressive caching layer. Designed for low latency, clean contracts, and easy scaling.

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#api-surface">API</a> •
  <a href="#performance">Performance</a> •
  <a href="#configuration">Config</a> •
  <a href="#project-structure">Structure</a> •
  <a href="#roadmap">Roadmap</a>
</p>



⸻

✨ Features
	•	Fast: undici + LRU cache (SWR + in‑flight dedupe) + minimal middleware
	•	Safe: global x-api-key, rate limiting, strict validation (AJV), error contracts
	•	Portable: stable response shapes; versioned routes (/api/v1)
	•	Observable: structured logs (pino), /metrics (Prometheus), health checks
	•	Ready to grow: Redis optional for shared cache/limits; WS streaming in Phase 2

⸻

🧠 Architecture

Client
  │
  ├─▶ Edge (Cloudflare/Nginx: TLS, HTTP/2/3, gzip/brotli, short cache)
  │
  └─▶ Express (rateLimit → apiKey → validation → controller)
               │
               └─▶ Service (cache.getOrSet → Adapter)
                          │
                          └─▶ Helius Adapter (undici; timeouts + retry)

Key ideas
	•	Controllers are thin; business logic lives in services.
	•	Services normalize upstream responses to stable DTOs.
	•	Cache layer prevents stampedes and supports stale‑while‑revalidate.

⸻

🧰 Tech Stack
	•	Runtime: Node.js LTS, Express (CommonJS)
	•	HTTP client: undici (keep‑alive pooled agent)
	•	Validation: ajv (compiled JSON Schema; type coercion, strip unknown)
	•	Caching: lru-cache (+ SWR + in‑flight request coalescing)
	•	Rate limiting: rate-limiter-flexible (memory → Redis later)
	•	Logging: pino (fast JSON logs with request IDs)
	•	Docs: swagger-jsdoc, swagger-ui-express (dev/staging)
	•	Testing: jest, supertest (+ k6/Artillery for load)

⸻

📦 Requirements
	•	Node.js ≥ 18
	•	Helius API key

⸻

⚙️ Configuration

Create a .env in the project root:

NODE_ENV=development
PORT=8080
API_KEY=dev-123

# Helius
HELIUS_API_KEY=your-helius-key
HELIUS_BASE=https://api.helius.xyz

# HTTP outbound
HTTP_TIMEOUT_MS=8000

# Caching
CACHE_TTL_SECONDS=10

# Rate limiting
RATE_LIMIT_POINTS=60
RATE_LIMIT_DURATION=60

# Optional (later)
REDIS_URL=


⸻

🚀 Quickstart

# 1) Install
npm install

# 2) Run dev
npm run dev  # (uses nodemon) or: node server.js

# 3) Health check
curl http://localhost:8080/health
# → { "ok": true }

Base URLs
	•	REST: http://localhost:8080/api/v1
	•	Docs (dev): http://localhost:8080/docs
	•	Metrics: http://localhost:8080/metrics

Required header

All API routes require an API key:

x-api-key: <your API_KEY from .env>


⸻

🔌 API Surface

All responses are JSON. Unless specified, the contract is:

{ "data": { /* payload */ }, "meta": { /* optional */ } }

Note: Examples below show typical shapes. Exact fields may evolve; breaking changes ship under a new version path (e.g., /api/v2).

GET /tokens/:mint

Fetch a normalized token snapshot.

Params
	•	mint (string, 32–44 chars)

curl

curl -H "x-api-key: $API_KEY" \
  http://localhost:8080/api/v1/tokens/So11111111111111111111111111111111111111112

200

{
  "data": {
    "mint": "So111...",
    "symbol": "SOL",
    "name": "Solana",
    "decimals": 9,
    "updatedAt": "2025-10-04T12:34:56Z"
  }
}


⸻

GET /price/:mint

Short‑TTL price snapshot.

curl

curl -H "x-api-key: $API_KEY" \
  http://localhost:8080/api/v1/price/So11111111111111111111111111111111111111112

200

{
  "data": {
    "mint": "So111...",
    "priceUsd": 1.23,
    "change24h": 0.04,
    "volume24h": 100000,
    "ath": 5.67,
    "updatedAt": "2025-10-04T12:34:56Z"
  }
}


⸻

GET /search?q=...&limit=...

Search tokens by symbol/name.

curl

curl -G -H "x-api-key: $API_KEY" \
  --data-urlencode "q=sol" --data-urlencode "limit=5" \
  http://localhost:8080/api/v1/search

200

{ "q": "sol", "limit": 5, "results": [ { "mint": "So111...", "symbol": "SOL", "name": "Solana" } ] }


⸻

GET /wallets/:address

Return normalized balances (phase 1: basic view).

200

{
  "data": {
    "address": "8xS...",
    "balances": [ { "mint": "...", "amount": "123.45", "decimals": 9 } ],
    "updatedAt": "2025-10-04T12:34:56Z"
  }
}


⸻

GET /trades/:mint?limit=&cursor=

Recent trades/swaps (parsed), paginated.

200

{
  "data": [
    { "ts": 1710000000, "side": "buy", "amount": 100, "price": 1.21, "tx": "..." }
  ],
  "meta": { "nextCursor": null }
}


⸻

🛡️ Auth & Headers
	•	API key: send x-api-key: <API_KEY>
	•	Cache: cacheable GETs return Cache-Control: public, max-age=5, stale-while-revalidate=30
	•	Errors: consistent JSON (examples)

{ "error": "unauthorized", "message": "Invalid or missing API key" }
{ "error": "bad_request", "details": [ /* validation errors */ ] }
{ "error": "too_many_requests" }
{ "error": "server_error" }


⸻

🏎️ Performance
	•	undici with pooled keep‑alive agent
	•	Validation via AJV (compiled; coerces types; strips unknown)
	•	LRU cache per endpoint (3–10s TTL) with SWR + in‑flight dedupe
	•	Per‑route rate limits (e.g., /price stricter)
	•	Edge handles TLS and compression (save CPU in app)

SLO targets
	•	p95 < 300–400ms (cache hit); p95 < 1.2s (miss)
	•	Error rate < 1%

⸻

🧪 Testing
	•	Integration: Jest + Supertest (200, 400, 401, 429, cache hit)
	•	Unit: services (mock adapters), adapters (mock HTTP)
	•	Load: k6/Artillery (warm vs cold cache; spike; soak)

⸻

🧭 Project Structure

better-api/
├─ server.js
├─ app.js
├─ .env
├─ src/
│  ├─ config/
│  │  ├─ env.js
│  │  └─ logger.js
│  ├─ routes/
│  │  └─ v1/
│  │     ├─ index.js
│  │     ├─ tokens.js
│  │     ├─ price.js
│  │     ├─ search.js
│  │     ├─ wallets.js
│  │     └─ trades.js
│  ├─ controllers/
│  ├─ services/
│  ├─ adapters/
│  ├─ middleware/
│  ├─ utils/
│  ├─ ws/             # streaming (phase 2)
│  └─ docs/
└─ tests/


⸻

🛠️ Scripts

{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "NODE_ENV=production node server.js",
    "test": "jest --runInBand",
    "lint": "eslint .",
    "format": "prettier -w ."
  }
}


⸻

🗺️ Roadmap
	•	REST v1 skeleton, guards, health/metrics
	•	/tokens/:mint with validation + cache
	•	/price/:mint (short TTL, stricter limit)
	•	/search, /wallets/:address, /trades/:mint
	•	Swagger docs + examples
	•	Redis for shared cache & distributed rate limiting
	•	WebSocket streaming (simulate → Helius events)
	•	CI/CD, edge deploy, runbooks

⸻

🤝 Contributing

PRs welcome! Please:
	1.	Open an issue to discuss significant changes.
	2.	Add tests for new behavior.
	3.	Keep controllers thin; put logic in services.

⸻

📜 License

MIT

⸻

🙌 Acknowledgements

Built with ❤️ by developers who care about fast APIs and clean contracts. Powered by Helius for reliable Solana data.
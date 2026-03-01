# ⚡ Micropay Bazaar

**A micropayment gateway for AI agents on Solana.** Register APIs, discover services, and settle payments on-chain — all through one REST API.

**Live API:** [https://micropay.up.railway.app](https://micropay.up.railway.app)
**Documentation:** [https://micropay.up.railway.app/docs](https://micropay.up.railway.app/docs)

---

## Try It Now

```bash
# Discover all 26 available services
curl https://micropay.up.railway.app/api/v1/registry/discover

# Check Solana Devnet network status
curl https://micropay.up.railway.app/api/v1/network/status

# Create a charge (generates a real unsigned Solana transaction)
curl -X POST https://micropay.up.railway.app/api/v1/charges \
  -H "Authorization: Bearer mp_live_demo_key" \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "finance_stocks",
    "source_wallet": "DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm"
  }'

# Ask the AI Gateway a question (fires a real on-chain Devnet tx)
curl -X POST https://micropay.up.railway.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the price of Bitcoin?"}'
```

No setup required. The demo API key (`mp_live_demo_key`) is included for testing.

---

## What It Does

Micropay Bazaar solves a simple problem: **how do AI agents pay for data?**

Today, if an AI agent needs live stock prices, weather data, or news, it needs API keys, subscriptions, and billing accounts for each provider. Micropay replaces all of that with a single payment flow:

1. **Discover** — Browse 26 prebuilt data services across weather, stocks, crypto, NLP, news, sports, and more
2. **Charge** — Create a payment for any service. The API fetches live SOL/USD prices, calculates the cost, and returns an unsigned Solana transaction
3. **Sign & Settle** — Sign with Phantom wallet and broadcast to Solana Devnet. Payment settles in under 1 second
4. **AI Gateway** — Or skip the manual flow entirely: send a natural language message, and the AI decides which paid tool to invoke using OpenAI function calling

Every payment creates a **real on-chain Solana transaction** on Devnet — verifiable on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Runtime** | Node.js + Express.js | Lightweight, fast JSON API server with middleware ecosystem |
| **Blockchain** | Solana web3.js (Devnet) | Build unsigned transactions, query balances, parse on-chain data |
| **Price Oracle** | CoinGecko API | Live SOL/USD conversion with 60-second cache and hardcoded fallback |
| **AI Gateway** | OpenAI GPT-4o-mini | Function calling for tool selection, conversation context for multi-turn |
| **Data Store** | In-memory (Map) | Charges, registry, conversations, and idempotency — resets on restart |
| **Deployment** | Railway | Auto-deploy from GitHub, HTTPS, environment variable management |
| **Logging** | Morgan | HTTP request logging in dev format |
| **Wallet** | Phantom (client-side) | Transaction signing and broadcasting via browser extension |
| **Frontend** | Next.js + Tailwind CSS | User dashboard with wallet connect, service discovery, and payment flows |

---

## Architecture

```
  Developer / AI Agent
         │
         ▼
  ┌─────────────────────────────────┐
  │     Micropay API (Express.js)   │
  │                                 │
  │  ┌───────────┐ ┌─────────────┐  │     ┌──────────────┐
  │  │ Registry  │ │  Charges    │  │────▶│ Solana       │
  │  │ Store     │ │  Store      │  │     │ Devnet RPC   │
  │  └───────────┘ └─────────────┘  │     └──────────────┘
  │  ┌───────────┐ ┌─────────────┐  │
  │  │ Chat      │ │ Idempotency │  │     ┌──────────────┐
  │  │ History   │ │ Cache (24h) │  │────▶│ CoinGecko    │
  │  └───────────┘ └─────────────┘  │     │ Price Oracle  │
  │                                 │     └──────────────┘
  └────────────┬────────────────────┘
               │                          ┌──────────────┐
               └─────────────────────────▶│ OpenAI       │
                                          │ GPT-4o-mini  │
                                          └──────────────┘

  ┌─────────────────────────────────┐
  │  User Dashboard (Next.js)       │
  │  Wallet Connect · Service       │
  │  Discovery · Payment History    │
  └─────────────────────────────────┘
```

---

## API Endpoints (15)

### Public (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/network/status` | Solana Devnet status + live SOL price |
| `GET` | `/api/v1/balance/:wallet` | SOL balance for any wallet |
| `GET` | `/api/v1/transactions/:wallet` | Last 20 on-chain transactions |
| `GET` | `/api/v1/registry/discover` | Browse and search services (`?query=`) |
| `GET` | `/api/v1/registry/services/:id` | Get a single service by ID |
| `GET` | `/api/v1/charges/count` | Total on-chain transaction count |
| `POST` | `/api/ai/chat` | One-shot AI + on-chain payment |

### Authenticated (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/registry/register` | Register a new paid service |
| `DELETE` | `/api/v1/registry/services/:id` | Delete a registered service |
| `POST` | `/api/v1/charges` | Create a charge (unsigned Solana tx) |
| `GET` | `/api/v1/charges` | List charges (paginated, filterable) |
| `GET` | `/api/v1/charges/:id` | Get a single charge |
| `POST` | `/api/v1/chat/completions` | AI chat with tool discovery |
| `POST` | `/api/v1/chat/tool-result` | Feed tool data back to AI |

---

## Key Features

**Idempotency** — Pass an `Idempotency-Key` header on `POST /charges` to safely retry without duplicate payments. Replayed responses return an `Idempotency-Replayed: true` header. Keys auto-expire after 24 hours.

**Pagination & Filtering** — List endpoints support `?limit=`, `?offset=`, `?status=`, `?source_wallet=`, and `?query=` query parameters. Responses include `has_more`, `total_count`, `limit`, and `offset` for easy cursor-based iteration.

**Structured Errors** — Every error returns a consistent shape with an appropriate HTTP status code:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "'service_id' is required and must be a non-empty string."
  }
}
```

Error types: `authentication_error` (401), `invalid_request_error` (400), `not_found_error` (404), `api_error` (500), `gateway_error` (502).

**Request Tracing** — Every response includes an `X-Request-Id` header for debugging.

**Live Price Oracle** — SOL/USD conversion via CoinGecko with 60-second cache and hardcoded fallback for resilience.

**Real On-Chain Transactions** — All payments create verifiable Solana Devnet transactions, viewable on Solana Explorer.

---

## Project Structure

```
micropay-bazaar/
├── backend-main/                # Express.js API server
│   ├── block_src/
│   │   ├── server.js            # App entry point, middleware, route mounting
│   │   ├── routes/
│   │   │   ├── charge.routes.js     # POST/GET charges with idempotency
│   │   │   ├── registry.routes.js   # Service CRUD + discover with filtering
│   │   │   ├── chat.routes.js       # AI chat completions + conversation history
│   │   │   ├── ai.routes.js         # One-shot AI gateway
│   │   │   └── network.routes.js    # Solana status, balance, transactions
│   │   ├── middleware/
│   │   │   └── auth.middleware.js    # Bearer token verification
│   │   └── utils/
│   │       └── store.js             # In-memory data stores + idempotency cache
│   └── micropay-docs.html       # Hosted interactive API documentation
│
├── user-dashboard-main/         # Next.js user-facing dashboard
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # UI components (wallet connect, service cards, etc.)
│   └── services/
│       └── api.ts               # API client for backend communication
│
└── dashboard/                   # Admin dashboard
```

---

## Local Development

### Backend

```bash
git clone <repo-url>
cd backend-main
npm install
cp .env.example .env   # Add your keys
npm start
# API runs at http://localhost:3000
# Docs at http://localhost:3000/docs
```

### User Dashboard

```bash
cd user-dashboard-main
npm install
npm run dev
# Dashboard at http://localhost:3000
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ALLOWED_API_KEYS` | Comma-separated valid API keys | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI Gateway | For chat endpoints |
| `AI_CONSUMER_WALLET_PRIVATE` | Base58 Solana keypair for auto-payments | For `/api/ai/chat` |
| `AI_DEVELOPER_WALLET` | Wallet receiving payments | Defaults to team wallet |

---

## Testing

```bash
# Health check
curl https://micropay.up.railway.app/api/v1/health

# Discover all services
curl https://micropay.up.railway.app/api/v1/registry/discover

# Text search across services
curl "https://micropay.up.railway.app/api/v1/registry/discover?query=weather"

# Discover with pagination
curl "https://micropay.up.railway.app/api/v1/registry/discover?limit=5&offset=0"

# Create a charge with idempotency
curl -X POST https://micropay.up.railway.app/api/v1/charges \
  -H "Authorization: Bearer mp_live_demo_key" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{"service_id":"finance_stocks","source_wallet":"DRtXHDgC312wNUSxNRnV2iarFh5Sk5VpTBGoAdnGmWbm"}'

# Retry same request — response header includes Idempotency-Replayed: true

# AI chat (creates a real Devnet transaction)
curl -X POST https://micropay.up.railway.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather in Chicago?"}'

# Delete a service
curl -X DELETE https://micropay.up.railway.app/api/v1/registry/services/SERVICE_ID \
  -H "Authorization: Bearer mp_live_demo_key"

# Test error handling — missing auth
curl https://micropay.up.railway.app/api/v1/charges
# → { "error": { "type": "authentication_error", "message": "Missing or invalid Authorization header..." } }

# Test 404
curl https://micropay.up.railway.app/api/v1/nonexistent
# → { "error": { "type": "not_found_error", "message": "Route 'GET /api/v1/nonexistent' not found." } }
```

---

## Team

Built at **HackIllinois 2026** for the Stripe "Best Web API" track.

---

## Full Documentation

For complete API reference with code examples in cURL, JavaScript, and Python, parameter details, error handling guides, and end-to-end integration walkthroughs:

**👉 [https://micropay.up.railway.app/docs](https://micropay.up.railway.app/docs)**

---

## License

MIT

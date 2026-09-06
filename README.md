# MyNaksh Personalized AI Context Engine

A dependency-free Node.js backend that sits between MyNaksh's structured astrology services and an LLM. It fetches user data concurrently, identifies the question's intent, selects only relevant chart/horoscope context, and produces a grounded personalized response.

> The included upstream services are local mocks. The default mock account is `user_101`.

## Requirements

- Node.js 18 or later (Node 24 was used to verify this project)
- No `npm install` is required; the implementation uses only Node's standard library

## Start the server

From the project directory:

```powershell
node src/server.js
```

The API listens at `http://localhost:3000` by default. Stop it with `Ctrl+C`.

To use another port in PowerShell:

```powershell
$env:PORT=4000
node src/server.js
```

## Configuration

The server automatically loads a `.env` file in the project root. Copy `.env.example` to `.env`, set the values you need, and never commit the real `.env` file. Shell environment variables take precedence over `.env` values.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server port. |
| `UPSTREAM_TIMEOUT_MS` | `800` | Per-attempt upstream request timeout. |
| `UPSTREAM_RETRIES` | `2` | Retries after an upstream failure (three total attempts by default). |
| `CACHE_TTL_MS` | `60000` | In-memory context cache lifetime per user, in milliseconds. |
| `OPENAI_API_KEY` | unset | Enables the OpenAI Responses API provider. Without it, a deterministic grounded mock provider is used. |
| `OPENAI_MODEL` | `gpt-4.1` | OpenAI model name when an API key is supplied. |

Example, enabling OpenAI for one PowerShell session:

```powershell
$env:OPENAI_API_KEY="your_api_key"
$env:OPENAI_MODEL="gpt-4.1"
node src/server.js
```

Or create a `.env` file:

```text
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1
PORT=3000
```

## API reference

All request and response bodies are JSON. Errors use this shape:

```json
{
  "error": {
    "message": "question is required",
    "requestId": "..."
  }
}
```

### `GET /health`

Lightweight liveness endpoint. It does not call an upstream service or the LLM.

**Response — `200 OK`**

```json
{ "status": "ok" }
```

### `POST /personalize`

Builds a personalized, context-selective response. This is the primary client endpoint.

**Request**

```json
{
  "userId": "user_101",
  "question": "Should I consider changing my job in the next few months?"
}
```

| Field | Required | Validation |
| --- | --- | --- |
| `userId` | Yes | Non-empty string. |
| `question` | Yes | Non-empty string, maximum 2,000 characters. |

**Response — `200 OK`**

```json
{
  "answer": "You have a useful foundation to move forward thoughtfully...",
  "confidence": "HIGH",
  "sourcesUsed": [
    "Career Horoscope",
    "10th House",
    "Current Dasha",
    "Today's Panchang"
  ]
}
```

`confidence` is `HIGH` when all primary sources for the detected intent were available, `MEDIUM` when at least some selected context remains, and `LOW` when no selected context is available.

### `POST /debug/personalization`

Runs data loading and personalization selection but never invokes the LLM. Use it to inspect and explain the engine's context decision.

**Request**

```json
{
  "userId": "user_101",
  "question": "Should I consider changing my job in the next few months?"
}
```

**Response — `200 OK`**

```json
{
  "intent": "career",
  "selectedContext": [
    "Career Horoscope",
    "10th House",
    "Current Dasha",
    "Today's Panchang"
  ],
  "excludedContext": [
    "Relationship Horoscope",
    "Health Horoscope",
    "Finance Horoscope",
    "6th House",
    "7th House"
  ],
  "language": "English",
  "tone": "Motivational",
  "maxWords": 250,
  "confidence": "HIGH",
  "unavailableSources": []
}
```

### Request examples

Use PowerShell's `Invoke-RestMethod`:

```powershell
$body = @{ userId = 'user_101'; question = 'How does this month look for my relationship?' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/personalize' -ContentType 'application/json' -Body $body
```

To inspect the same decision without an LLM call, change the URI to `http://localhost:3000/debug/personalization`.

## Personalization behavior

Intent matching is configuration-driven in `src/personalization/intent-rules.js`. The engine uses question keywords and each intent's source recipe; it is not a chain of request-routing conditionals.

| Intent | Primary context | Secondary context | Deliberately excluded examples |
| --- | --- | --- | --- |
| Career | Career Horoscope, 10th House | Current Dasha, Panchang | Relationship and health context |
| Relationship | Relationship Horoscope, 7th House | Moon Sign, Current Dasha | Career and health context |
| Health | Health Horoscope, 6th House | Moon Sign, Panchang | Career and finance context |
| Finance | Finance Horoscope | Current Dasha, Panchang | Relationship and health context |
| General | Horoscope categories, Lagna, Moon Sign | Dasha, houses, Panchang | None |

Language and tone come from the User Profile. Response length is 120 words for short daily/weekly/summary questions, otherwise 250 words for premium users and 160 words for other subscriptions.

## Upstream data and resilience

The `ContextLoader` starts User Profile, Kundli, Horoscope, and Panchang fetches at the same time using `Promise.allSettled`.

- Each call has an independent timeout and bounded exponential backoff retry.
- A failed non-user source becomes an `unavailableSources` entry; remaining verified context can still be used.
- A missing User Profile returns `404`, because language and tone cannot be personalized safely.
- Successful results are held in an in-memory TTL cache keyed by user ID.
- Logs capture request/source status but intentionally omit questions, birth details, prompts, answers, and API keys.

The mock data lives in `src/services/mock-upstreams.js`. In production, replace those methods with HTTP clients for the User, Kundli, Horoscope, and Panchang services—the `ContextLoader` contract stays the same.

## Data storage and caching

This assignment implementation does **not** use SQL, an ORM, Redis, or any persistent database client.

| Data | Current location | Persistence |
| --- | --- | --- |
| Mock user, Kundli, horoscope, and Panchang records | JavaScript constants in `src/services/mock-upstreams.js` | Exists only while the server process is running; source-controlled mock fixtures are reloaded on restart. |
| Fetched combined user context | `Map` in `src/services/cache.js` (`TtlCache`) | In-memory only; expires after `CACHE_TTL_MS` (60 seconds by default) and is lost on restart. |
| Personalized answers | Nowhere | Answers are returned directly to the caller and are not stored. |
| Logs | Standard output | Handled by the runtime/process manager; the application does not write log files. |

The cache key is `context:<userId>`. It caches source data, not the final LLM answer, so each request still receives a newly generated response using the latest personalization decision. The cache contains no special persistence, encryption, or cross-process synchronization.

### Production recommendation

In a production deployment, the upstream User, Kundli, Horoscope, and Panchang services should remain the systems of record. Replace the mock adapter with authenticated HTTP clients and use Redis (or another distributed TTL cache) for context caching across API instances. If conversation history, audit trails, or feedback must be retained, add a dedicated persistent datastore with explicit retention, access-control, and encryption policies; do not add it implicitly to the context engine.

## LLM behavior

`src/llm/prompt-builder.js` creates an optimized prompt from only the selected context. It explicitly instructs the model to avoid fabricated chart details and to present astrology as reflective guidance rather than certainty. It also blocks medical, legal, and financial instructions.

- With `OPENAI_API_KEY`, `src/llm/providers.js` calls the OpenAI Responses API.
- Without a key, the local deterministic provider makes examples and tests work offline.
- If a configured LLM call fails, the service returns a graceful fallback message while preserving the successful API response contract.

## Project layout

```text
src/
  app.js                         HTTP routing and orchestration
  config.js                      Environment-based configuration
  logger.js                      Safe structured logging
  services/                      Mock upstreams, cache, retry/timeout, loader
  personalization/               Declarative rules and decision engine
  llm/                           Prompt builder and provider adapters
test/personalization.test.js     Unit and route-level tests
```

## Run tests

```powershell
node --test
```

The test suite covers career context selection, degraded confidence after partial failure, caching, and the guarantee that the debug endpoint does not call the LLM.

## Troubleshooting startup

If startup reports `EADDRINUSE`, another application is already listening on the configured port. Either stop the existing MyNaksh server with `Ctrl+C` in the terminal where it is running, or choose a free port:

```powershell
$env:PORT=3001
node src/server.js
```

When the server starts successfully, it logs `server_started` and the port number. If it logs `llm_mock_enabled`, the API key was not found; confirm `.env` is in the project root, uses the exact name `OPENAI_API_KEY`, and restart the server. A `.env` change is read only when the process starts.

## Extension ideas

- Add an intent by declaring its keywords and context recipe in `intent-rules.js`.
- Replace the in-memory cache with Redis for multi-instance deployment.
- Add an HTTP circuit breaker and per-source health metrics.
- Move keyword intent detection to a small classifier while retaining the same context-rule interface.
- Add authenticated user identity rather than accepting a raw `userId` from the client.

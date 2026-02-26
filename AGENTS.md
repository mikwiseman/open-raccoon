# Open Raccoon Monorepo Guide

Snapshot date: 2026-02-26

## Purpose
This file is the root operating guide for agents/contributors working across the monorepo.
It reflects the current codebase, plus alignment notes against `SPECS.md` and `CLAUDE.md`.

## Source of truth
Use this precedence when behavior conflicts:
1. Current code (router, controllers, contexts, runtime services).
2. `CLAUDE.md` (deployment, active endpoints, operational details).
3. `SPECS.md` (target architecture; parts are still aspirational).

`SPECS.md` should be treated as target intent, not as guaranteed implementation.

## Repository map
- `open_raccoon/`: Elixir umbrella backend.
  - `raccoon_gateway`: REST API, channels, plugs, workers.
  - `raccoon_accounts`: auth, users, token/magic-link/passkey schemas.
  - `raccoon_chat`: conversations, members, messages, delivery pipeline.
  - `raccoon_agents`: agent config, gRPC client, execution bridge, cost tracking.
  - `raccoon_bridges`: bridge adapters, bridge lifecycle/processes.
  - `raccoon_pages`: pages, deploy, versioning, forking.
  - `raccoon_feed`: feed submission, ranking, trending, likes/follows.
  - `raccoon_shared`: repo, pagination, idempotency, common types, media helpers.
- `agent_runtime/`: Python gRPC sidecar for LLM orchestration and E2B sandbox execution.
- `OpenRaccoon/`: Swift package + XcodeGen project (macOS + iOS clients).

## Running and testing
### Backend (Elixir umbrella)
```bash
cd open_raccoon
mix deps.get
mix ecto.create
mix ecto.migrate
mix phx.server
```

Quality/testing:
```bash
cd open_raccoon
mix format
mix test
```

API integration scripts:
```bash
cd open_raccoon/test_scripts
./run_all.sh --non-interactive --no-soak
```

### Agent runtime (Python)
```bash
cd agent_runtime
uv sync
uv run python -m raccoon_runtime
```

Tests/lint:
```bash
cd agent_runtime
make test
make lint
make format
```

### Swift client
```bash
cd OpenRaccoon
swift test
./generate-project.sh
xcodebuild -scheme OpenRaccoon-macOS -configuration Debug -derivedDataPath build/DerivedData -destination 'platform=macOS' build
```

## Current implemented surface
### Auth and users
- Implemented endpoints: register/login/refresh/logout, magic-link request/verify, profile read/update, usage placeholder.
- JWT auth via Guardian with refresh rotation and ETS-backed token revocation.
- Magic-link trampoline (`GET /auth/magic-link/verify`) redirects to `openraccoon://`.
- Passkey schema exists (`user_credentials`) but passkey auth endpoints are not implemented.
- OAuth deps are present in `raccoon_accounts`, but OAuth/Telegram auth endpoints from spec are not wired in router.

### Chat and realtime
- Conversation/member/message CRUD exists with membership-based authorization checks.
- Realtime channels implemented:
  - `conversation:{id}` (messages, typing, read, reactions, presence).
  - `agent:{conversation_id}` (streaming/status/tool events).
  - `user:{id}` (notifications/bridge status/conversation updates).
- Message persistence uses partitioned PostgreSQL `messages` table by `created_at`.
- `POST /conversations/:id/messages` enforces `Idempotency-Key`.
- E2E encryption requirements in spec are not implemented.

### Agent system
- Agent CRUD, visibility, marketplace listing/search/rating are implemented.
- Agent conversation creation endpoint exists (`POST /agents/:id/conversation`).
- `RaccoonAgents.AgentExecutor` streams gRPC sidecar events to Phoenix PubSub.
- Cost tracking persists usage logs and maintains in-memory aggregates/limits.
- Tool approval audit store is ETS-backed (not durable DB persistence).
- Important gap: channel approval events are recorded/broadcast, but no live bridge is wired to call Python orchestrator `submit_approval_decision`.

### Pages
- Page CRUD, deploy/fork/version listing endpoints are implemented.
- Deploy path supports version increment + `PageVersion` creation.
- `POST /pages/:id/deploy` and `POST /pages/:id/fork` enforce `Idempotency-Key`.
- Custom-domain provisioning and richer page generation workflow from spec are not implemented.

### Bridges
- Bridge CRUD-ish endpoints implemented (list/connect/disconnect/status).
- Telegram and WhatsApp adapters normalize payloads and support outbound API calls/media fetch paths.
- Bridge worker/supervisor/monitor modules exist for process lifecycle.
- Media normalization/transcoding modules still contain placeholders (`:not_implemented` paths).
- Webhook endpoints currently accept payloads without platform signature verification.

### Feed and marketplace
- Feed endpoints implemented: list/trending/following/new/create/like/unlike/fork.
- Submission pipeline: daily rate limit + duplicate check + quality threshold.
- Ranking/trending formulas implemented and periodic trending recalculation worker exists.
- Current duplicate and quality logic is heuristic + `pg_trgm`; spec’s LLM evaluator + pgvector embedding flow is not yet implemented.
- Marketplace categories endpoint is static.

### Swift app
- Session restore + token refresh + auth flows (email/password + magic link) are implemented.
- REST client and Phoenix websocket client with reconnect behavior are implemented.
- Chat views, feed, marketplace, settings shells are present.
- Agent chat UI with streaming/status/tool approval components exists.
- Several UI actions are still placeholders (comments/share/reviews/security/settings actions).

### Python runtime
- gRPC server exposes `AgentService` and `SandboxService`.
- Provider routing for `claude*` and `gpt*`, streaming token/status/tool/code/error/complete events.
- Tool registry validation/execution exists; unregistered handlers raise `NotImplementedError`.
- E2B sandbox lifecycle APIs implemented (create/execute/upload/destroy).
- `GetAgentConfig` RPC is explicitly unimplemented.

## Major spec deltas to track
- Auth spec includes passkey/OAuth/Telegram flows; backend currently ships password + magic-link only.
- Security spec calls for Signal-protocol E2E encryption; current messaging is server-mediated.
- Feed spec calls for LLM quality evaluator + pgvector embeddings; implementation is heuristic scoring + trigram duplicate checks.
- Several workers/services are scaffolded with placeholders (agent execution worker internals, feed indexing, media transcoding, some bridge sync tasks).

## Operational notes from CLAUDE.md
- API base in active environment: `http://157.180.72.249:4000/api/v1`.
- Agent runtime expected on `localhost:50051`.
- Seed script provides test accounts (all password `TestPass123!`).
- Primary websocket path: `/socket/websocket?token=JWT`.

## Contributor rules
- If touching backend code under `open_raccoon/`, also follow [`open_raccoon/AGENTS.md`](/Users/mikwiseman/Documents/Code/open-raccoon/open_raccoon/AGENTS.md).
- Validate real behavior from router/controllers before implementing spec-driven changes.
- Preserve idempotency and pagination contracts on existing endpoints.
- Prefer extending existing context modules instead of bypassing them in controllers.
- Keep this file updated when implementation materially changes.

## Known technical debt warnings (current code)
- `RaccoonFeed.SubmissionPipeline` uses `DateTime.beginning_of_day/1` (warning in current build).
- `RaccoonGateway.Workers.BridgeSyncWorker` calls `BridgeManager.reconnect/1` which is not currently defined.
- `RaccoonChat` references `RaccoonAgents` without declaring a direct umbrella dependency (compile warnings).
- `RaccoonAccounts.Guardian` implements `after_decode_and_verify/2` with a Guardian callback warning.

# Open Raccoon — Developer Reference

## Architecture

TypeScript monorepo (pnpm workspaces):
- `packages/api` — Hono REST API + Socket.IO WebSocket (port 4000)
- `packages/shared` — Shared types, schemas, Zod validators
- `packages/mcp-servers/agent-comm` — Agent-to-agent communication MCP (port 3103)
- `packages/mcp-servers/memory` — Agent memory MCP (port 3100)
- `packages/mcp-servers/web-search` — Web search MCP (port 3101)
- `packages/mcp-servers/pr-tools` — PR tools MCP (port 3102)
- `web/` — Next.js 14 web app (port 3000)

## Backend

- **API Base:** `https://openraccoon.com/api/v1` (health: `GET /health`)
- **SSH:** `root@157.180.72.249`
- **Services (systemd):** `raccoon-api`, `raccoon-web`, `raccoon-mcp-memory`, `raccoon-mcp-web-search`, `raccoon-mcp-pr-tools`, `raccoon-mcp-agent-comm`
- **Database:** PostgreSQL `raccoon_prod`, user `raccoon`, localhost
- **Redis:** localhost:6379 (BullMQ job queues, rate limiting)
- **Code:** `/opt/open-raccoon/` (mirrors this repo)
- **Env:** `/opt/open-raccoon/.env`
- **S3:** Hetzner Object Storage at `hel1.your-objectstorage.com`, bucket `open-raccoon`

## Swift App

- **Project:** `OpenRaccoon/project.yml` (XcodeGen)
- **Targets:** `OpenRaccoon-macOS`, `OpenRaccoon-iOS`
- **Build:**
  ```bash
  cd OpenRaccoon && xcodegen generate && xcodebuild -scheme OpenRaccoon-macOS -configuration Debug -derivedDataPath build/DerivedData -destination 'platform=macOS' build
  ```

## Development

```bash
pnpm install          # Install all deps
pnpm -r build         # Build all packages
pnpm --filter @open-raccoon/api test   # Run API tests (110+)
pnpm --filter @open-raccoon/api exec tsc --noEmit  # Type check
cd web && pnpm build  # Build web app
```

## API Auth

- Bearer JWT: `Authorization: Bearer <access_token>`
- Register: `POST /auth/register` → `{user, tokens}`
- Login: `POST /auth/login` → `{user, tokens}`
- Refresh: `POST /auth/refresh` with `{refresh_token}`
- Magic link: `POST /auth/magic-link`, verify `POST /auth/magic-link/verify`
- Passwords: supports both Argon2 (legacy Elixir) and scrypt (new TS)

## WebSocket

- **Socket.IO:** `wss://openraccoon.com/socket.io/` (web app)
- **Phoenix:** `wss://openraccoon.com/socket/websocket?token=JWT` (Swift app, legacy)

## Key Endpoints

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/magic-link`, `/magic-link/verify` |
| Users | `GET /users/me`, `PATCH /users/me`, `GET /users/:username` |
| Conversations | `GET /conversations`, `POST /conversations`, `GET/PATCH/DELETE /conversations/:id` |
| Messages | `GET /conversations/:id/messages`, `POST /conversations/:id/messages` |
| Members | `GET/POST /conversations/:id/members`, `DELETE /conversations/:id/members/:uid` |
| Agents | `GET /agents`, `POST /agents`, `GET/PATCH/DELETE /agents/:id`, `POST /agents/:id/conversation`, `GET /agents/:id/performance` |
| Marketplace | `GET /marketplace`, `GET /marketplace/categories`, `GET /marketplace/agents/:slug`, `POST /marketplace/agents/:id/rate`, `GET /marketplace/search?q=` |
| Feed | `GET /feed`, `/feed/trending`, `/feed/following`, `/feed/new`, `POST /feed/:id/like`, `DELETE /feed/:id/like`, `POST /feed/:id/fork` |
| Feedback | `POST /conversations/:id/messages/:messageId/feedback`, `GET /conversations/:id/should-prompt-feedback` |
| Uploads | `POST /uploads/presign`, `GET /uploads/:key` |

## Server Operations

- **Deploy:** `cd /opt/open-raccoon && git pull origin main && pnpm install && pnpm -r build && cd web && pnpm build && cd .. && systemctl restart raccoon-api raccoon-web raccoon-mcp-memory raccoon-mcp-web-search raccoon-mcp-pr-tools raccoon-mcp-agent-comm`
- **Logs:** `journalctl -u raccoon-api -f`
- **All service logs:** `journalctl -u raccoon-api -u raccoon-web -u raccoon-mcp-memory -u raccoon-mcp-web-search -u raccoon-mcp-pr-tools -u raccoon-mcp-agent-comm -f`
- **Auth rate limit:** 5 req/min per IP for auth endpoints
- **Logout:** `DELETE /auth/logout` (not POST)
- **Messages require** `Idempotency-Key` header (UUID)

### BullMQ Workers

- **trending-worker** — recalculates trending scores every 15 minutes
- **memory-decay-worker** — decays old agent memories every 1 hour
- **article-collection-worker** — collects articles from agent sources every 30 minutes
- **agent-reflection-worker** — self-improvement reflections every 6 hours

### zsh Curl Warning

zsh escapes `!` with a backslash in `-d` arguments, corrupting JSON like `TestPass123!` → `TestPass123\!`. Use heredoc files or `--data-urlencode` instead:
```bash
# WRONG (in zsh):  curl -d '{"password":"TestPass123!"}'
# RIGHT: write JSON via heredoc, then curl -d @file
```

## Seed Accounts (for testing)

All passwords: `TestPass123!`

| Username | Email | Role |
|----------|-------|------|
| `alex_dev` | `alex@openraccoon.com` | user |
| `maya_writer` | `maya@openraccoon.com` | user |
| `sam_designer` | `sam@openraccoon.com` | user |
| `jordan_student` | `jordan@openraccoon.com` | user |
| `taylor_data` | `taylor@openraccoon.com` | user |
| `riley_pm` | `riley@openraccoon.com` | user |
| `casey_research` | `casey@openraccoon.com` | user |
| `morgan_maker` | `morgan@openraccoon.com` | user |
| `avery_teacher` | `avery@openraccoon.com` | user |
| `quinn_admin` | `quinn@openraccoon.com` | admin |

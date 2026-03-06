# WaiAgents — TS/Web Deployment Guide

Snapshot date: 2026-03-06

## Scope

This file covers the root pnpm workspace and the public `waiagents.com` deployment:
- `packages/api`
- `packages/shared`
- `packages/mcp-servers/*`
- `web/`

This repo also contains a separate Elixir/Python/Swift stack in `wai_agents/`, `agent_runtime/`, and `WaiAgents/`. For that stack, use `AGENTS.md` and `wai_agents/AGENTS.md`.

## Monorepo Map

- `packages/api` — Hono REST API + Socket.IO realtime server
- `packages/shared` — shared TypeScript types and schemas
- `packages/mcp-servers/memory` — memory MCP server
- `packages/mcp-servers/web-search` — web search MCP server
- `packages/mcp-servers/pr-tools` — PR tools MCP server
- `packages/mcp-servers/agent-comm` — agent-to-agent MCP server
- `web/` — Next.js 14 web client

## Local Development

```bash
pnpm install
pnpm -r build
pnpm --filter @wai-agents/api test
pnpm --filter @wai-agents/api exec tsc --noEmit
pnpm lint
pnpm dev:api
pnpm dev:web
```

## Public Deployment

Verified from this machine on March 6, 2026:
- Web origin: `https://waiagents.com`
- API base: `https://waiagents.com/api/v1`
- Health: `GET /health` returns `200` with `{"status":"ok","service":"wai-agents-api",...}`
- Realtime: Socket.IO is live at `https://waiagents.com/socket.io/`
- `waiagents.com` resolves to `157.180.72.249`
- Seeded login `alex@waiagents.com / TestPass123!` still returns `200`
- Public profile `GET /users/alex_dev` still returns `200`

Current public gaps and failures:
- `GET /pages` returns `404`
- `GET /bridges` returns `404`
- `GET /users/me/usage` returns `404`
- `POST /auth/magic-link` returns `500`
- Invalid `POST /auth/magic-link/verify` returns `500`

Direct-host note:
- TCP `22` and `4000` on `157.180.72.249` were reachable from this machine on March 6, 2026.
- Direct `http://157.180.72.249:4000/api/v1/health` still timed out from this machine. Prefer the domain unless you are on-host.

## Auth

- Bearer JWT: `Authorization: Bearer <access_token>`
- Auth routes are rate-limited to `5` requests per minute per IP
- Supported routes in the TypeScript API:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `DELETE /auth/logout`
  - `POST /auth/magic-link`
  - `POST /auth/magic-link/verify`
- Public deployment reality as of March 6, 2026:
  - password login works
  - logout works with `DELETE`
  - `POST /auth/logout` returns `404`
  - magic-link routes are broken in production

### zsh Curl Warning

zsh escapes `!` inside inline JSON, so `TestPass123!` can become `TestPass123\\!`. Use a heredoc or `-d @file` for auth payloads.

## Current Public TS API Surface

Users:
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:username`

Conversations:
- `GET /conversations`
- `POST /conversations`
- `GET /conversations/:id`
- `PATCH /conversations/:id`
- `DELETE /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages` with `Idempotency-Key`
- `GET /conversations/:id/members`
- `POST /conversations/:id/members`
- `DELETE /conversations/:id/members/:userId`
- `POST /conversations/:id/messages/:messageId/feedback`
- `GET /conversations/:id/should-prompt-feedback`

Agents:
- `GET /agents/templates`
- `GET /agents`
- `POST /agents`
- `GET /agents/:id`
- `PATCH /agents/:id`
- `DELETE /agents/:id`
- `GET /agents/:id/performance`
- `POST /agents/:id/conversation`

Feed and marketplace:
- `GET /feed`
- `GET /feed/trending`
- `GET /feed/following`
- `GET /feed/new`
- `POST /feed/:id/like`
- `DELETE /feed/:id/like`
- `POST /feed/:id/fork`
- `GET /marketplace`
- `GET /marketplace/search?q=...`
- `GET /marketplace/categories`
- `GET /marketplace/agents/:slug`
- `POST /marketplace/agents/:id/rate`
- `POST /users/:id/follow`
- `DELETE /users/:id/follow`

Uploads:
- `POST /uploads/presign`
- `GET /uploads/:key`

Internal-only:
- `POST /internal/agent/execute` with `X-Internal-Key`

Not on the current public deployment:
- `/pages`
- `/bridges`
- `/users/me/usage`

## Realtime Contract

- Transport: Socket.IO at `/socket.io`
- Client auth: `handshake.auth.token`
- User room auto-join: `user:{userId}`
- Conversation events:
  - client: `join:conversation`, `leave:conversation`, `typing:start`, `typing:stop`, `read`
  - server: `message:new`, `message:updated`, `message:deleted`, `typing:start`, `typing:stop`, `conversation:updated`
- Agent events:
  - client: `join:agent`, `leave:agent`
  - server: `agent:event`, `a2a:event`

## Deployment Notes

Existing deployment docs still point to:
- SSH: `root@157.180.72.249`
- code dir: `/opt/wai-agents`
- env file: `/opt/wai-agents/.env`
- PostgreSQL: `wai_agents_prod` on localhost
- Redis: `localhost:6379`
- systemd services: `waiagents-api`, `waiagents-web`, `waiagents-mcp-memory`, `waiagents-mcp-web-search`, `waiagents-mcp-pr-tools`, `waiagents-mcp-agent-comm`
- object storage: Hetzner Object Storage bucket `wai-agents`

Validate those on-host before relying on them; they were not re-verified over SSH in this pass.

## Verified Test Account

- `alex@waiagents.com / TestPass123!`

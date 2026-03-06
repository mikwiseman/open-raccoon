# WaiAgents v2: The Messenger of the Future

## Context

WaiAgents = a messenger where AI agents and humans are equal citizens. Every human can have hundreds of agents. Every agent can spawn hundreds of sub-agents. All interaction modes: H↔H, H↔A, A↔H, A↔A.

**Stack decision**: Full TypeScript now. One language across backend, agent runtime, MCP tools, and web frontend. When scale demands it, rewrite hot paths in **Rust** via napi-rs native addons (the Discord/Dust.tt pattern).

**Architecture philosophy**: TypeScript for maximum AI coding velocity now. Optimize later. Telegram built custom C++ for 1B users with 30 engineers — we build TypeScript for our current scale with AI power, and rewrite performance-critical paths when we need to.

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         CLIENTS                                │
│   [Next.js 15 Web]     [SwiftUI iOS/macOS]     [SDK (future)] │
└────────┬──────────────────────────────────────────────┬───────┘
         └──────────────────────┼───────────────────────┘
                                │ REST + WebSocket
                                │
┌───────────────────────────────▼──────────────────────────────┐
│              TYPESCRIPT BACKEND  (Hono)                        │
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Auth        │  │ Conversations │  │ Agent Engine          │ │
│  │ JWT+Magic   │  │ Messages     │  │ Custom Agentic Loop   │ │
│  │ Rate Limit  │  │ Members      │  │ MCP Server Manager    │ │
│  │ Sessions    │  │ Rich Content │  │ Multi-Provider LLM    │ │
│  └────────────┘  │ A2A Routing  │  │ SOUL + Memory         │ │
│                   │ Delivery     │  │ Agent Spawning        │ │
│  ┌────────────┐  └──────────────┘  │ Budget/Cost Tracking  │ │
│  │ Social      │                    └───────────────────────┘ │
│  │ Feed        │  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Marketplace │  │ Real-Time    │  │ Background Jobs       │ │
│  │ Ratings     │  │ Socket.IO    │  │ BullMQ (Redis)        │ │
│  │ Search      │  │ + Redis      │  │ Article collection    │ │
│  │ Fork        │  │ Conversation │  │ Daily cycles          │ │
│  │ Categories  │  │ Agent stream │  │ Memory decay          │ │
│  └────────────┘  │ Presence     │  │ Embedding gen         │ │
│                   └──────────────┘  └───────────────────────┘ │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Agent Builder (itself an agent)                           │ │
│  │ Creates other agents through conversation                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────┘
                                │ Streamable HTTP (shared servers)
┌───────────────────────────────▼──────────────────────────────┐
│                MCP TOOL SERVERS (TypeScript)                   │
│          Shared HTTP services, NOT per-agent processes         │
│                                                               │
│  waiagents-memory      save, search, forget (pgvector)          │
│  waiagents-web-search  Anthropic native web_search              │
│  waiagents-pr-tools    articles, proposals, sources (16 tools)  │
│  waiagents-agent-comm  A2A: send, create, read conversations    │
│  waiagents-code-exec   sandboxed execution (E2B, future)        │
└───────────────────────────────┬──────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────┐
│                        DATA LAYER                             │
│                                                               │
│  [PostgreSQL + pgvector]   Existing DB, all persistent data   │
│  [Redis]                   Socket.IO adapter + BullMQ         │
│  [Hetzner Object Storage]  Agent-generated files, media       │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Backend** | Hono | Ultra-fast, Web Standards API, Zod OpenAPI, ~17KB |
| **ORM** | Drizzle | Type-safe, SQL-like, pgvector, fast migrations |
| **Real-time** | Socket.IO + Redis adapter | Auto-reconnect, rooms, horizontal scaling |
| **Jobs** | BullMQ (Redis) | Cron, retries, concurrency, dashboard |
| **LLM** | Anthropic SDK + OpenAI SDK (direct) | Custom loop, full control |
| **MCP** | `@modelcontextprotocol/typescript-sdk` | Streamable HTTP transport, shared servers |
| **Validation** | Zod | Shared schemas frontend↔backend↔agent runtime |
| **Auth** | jose (JWT) | Lightweight, Web Crypto API |
| **Database** | PostgreSQL + pgvector (existing) | Reuse data, proven to 10M vectors |
| **Cache** | Redis | Socket.IO + BullMQ + sessions |
| **Testing** | Vitest | Fast, TypeScript-native |
| **Monorepo** | pnpm workspaces | Fast, strict |
| **Linting** | Biome | Rust-based, fast (replaces ESLint + Prettier) |
| **Runtime** | Node.js 22 LTS | Stable |
| **Web search** | Anthropic native web_search | No extra API key |

---

## Core Designs

### 1. Universal Participant Model

Humans and agents = both "participants." Same conversations, messages, presence.

```sql
-- conversation_participants (enhanced from members)
  conversation_id, participant_type (user|agent), participant_id,
  role (owner|admin|member|observer)

-- messages (enhanced: content is JSONB array of blocks)
  id, conversation_id, sender_type (user|agent|system),
  sender_id, content_type, content (JSONB), metadata
```

### 2. Rich Message Content Blocks

```typescript
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: unknown; status: 'running'|'done'|'error' }
  | { type: 'tool_result'; name: string; result: string; duration_ms: number }
  | { type: 'code_block'; language: string; code: string; output?: string }
  | { type: 'proposal'; id: string; title: string; status: string; actions: Action[] }
  | { type: 'progress'; steps: Step[]; current: number }
  | { type: 'thinking'; summary: string; detail?: string }
  | { type: 'image'; url: string }
  | { type: 'file'; url: string; name: string; size: number }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'action_card'; title: string; actions: Action[] }
```

### 3. AG-UI Streaming (Socket.IO events)

```typescript
type AgentEvent =
  | { type: 'run_started'; runId: string; agentId: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; name: string; callId: string }
  | { type: 'tool_call_end'; result: string; duration_ms: number }
  | { type: 'step_started'; step: string; index: number }
  | { type: 'thinking'; summary: string }
  | { type: 'run_finished'; usage: { input_tokens: number; output_tokens: number } }
  | { type: 'run_error'; error: string }
```

### 4. SOUL System

```sql
agent_core_memories:
  agent_id, block_label (identity|rules|priorities|preferences),
  content (text), updated_at
```

### 5. Custom Agentic Loop

```
Load agent config + SOUL blocks
→ Assemble system prompt
→ Connect MCP servers (discover tools)
→ LOOP (max 25 turns):
    → Call LLM (streaming, Anthropic or OpenAI)
    → Stream text_delta events to Socket.IO
    → If tool_use: execute via MCP, feed result back
    → If no tool_use: break
→ Save response as message
→ Track cost (tokens, model)
```

### 6. Agent-to-Agent Communication

Max A2A depth = 3. Cascading token budget.

### 7. Marketplace: Fork & Customize

`agents.forked_from_id` (nullable FK) tracks lineage.

### 8. Autonomy Dial

Per-agent: `ask_always` → `ask_first_time` → `ask_if_unsure` → `autonomous`

---

## Project Structure

```
wai-agents/
├── packages/
│   ├── api/                          # TypeScript backend (Hono)
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── conversations/
│   │   │   │   ├── agents/
│   │   │   │   │   ├── loop.ts
│   │   │   │   │   ├── llm/
│   │   │   │   │   ├── mcp-manager.ts
│   │   │   │   │   ├── soul.ts
│   │   │   │   │   └── templates.ts
│   │   │   │   ├── social/
│   │   │   │   └── pr/
│   │   │   ├── ws/
│   │   │   ├── jobs/
│   │   │   └── db/
│   │   ├── drizzle.config.ts
│   │   └── vitest.config.ts
│   │
│   ├── mcp-servers/
│   │   ├── memory/
│   │   ├── web-search/
│   │   ├── pr-tools/
│   │   └── agent-comm/
│   │
│   └── shared/
│       └── src/
│           ├── types/
│           └── schemas/
│
├── web/                              # Next.js (existing, enhanced)
├── WaiAgents/                      # SwiftUI
├── pnpm-workspace.yaml
└── SPECS.md
```

---

## Implementation Phases

### Phase 1: Foundation (6 parallel agents, ~1-2 hours)
1. `project-setup` — pnpm monorepo, Hono server, Drizzle config, Biome, Vitest, shared types
2. `db-schemas` — Drizzle schemas for all existing + new tables
3. `auth-system` — JWT access+refresh, magic link, rate limiting, middleware
4. `websocket-system` — Socket.IO + Redis, channels, AG-UI events, presence
5. `mcp-memory` — Memory MCP server with pgvector
6. `mcp-web-search` — Web search MCP server

### Phase 2: Agent Runtime + PR Tools (4 parallel agents, ~1-2 hours)
7. `core-api` — REST endpoints (blocked by 2, 3)
8. `agent-runtime` — Custom agentic loop (blocked by 2, 4)
9. `mcp-pr-tools` — PR Tools MCP 16 tools (blocked by 2)
10. `mcp-agent-comm` — A2A MCP (blocked by 2)

### Phase 3: Social + Jobs + UX (2 parallel agents, ~1-2 hours)
11. `social-and-jobs` — Feed, marketplace, BullMQ workers (blocked by 7, 8, 9)
12. `rich-ux` — Rich content renderers, proposal cards (blocked by 7, 8)

---

## Edge Cases

| # | Edge Case | Mitigation |
|---|-----------|-----------|
| 1 | Agent spawns hundreds of sub-agents | Cascading budget, max depth = 3 |
| 2 | A2A infinite recursion | `x-waiagents-a2a-depth` context, error at depth 3 |
| 3 | MCP process management | Streamable HTTP, shared servers, health checks |
| 4 | Cost explosion | Per-user daily token limit, per-agent limit, circuit breaker |
| 5 | SOUL poisoning | Agent modifies own SOUL only, marketplace = read-only |
| 6 | Client disconnect mid-stream | AbortController, save partial response |
| 7 | Existing PostgreSQL data | Drizzle schemas match existing tables, migrations for new |

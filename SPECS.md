# Open Raccoon — Product Specification

> **Version**: 1.0
> **Date**: February 2026
> **License**: AGPLv3
> **Status**: Implementation-ready

---

## Table of Contents

1. [Product Overview & Vision](#1-product-overview--vision)
2. [Design Language](#2-design-language)
3. [Core Features](#3-core-features)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Security Model](#8-security-model)
9. [Feed Quality System](#9-feed-quality-system)
10. [Viral Growth Mechanics](#10-viral-growth-mechanics)
11. [Open Source Strategy](#11-open-source-strategy)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Edge Cases & Challenges](#13-edge-cases--challenges)

---

## 1. Product Overview & Vision

### What Is Open Raccoon?

Open Raccoon is an open-source messaging platform that combines Telegram-style messaging speed with AI agents, cross-platform bridges, in-chat page creation, and a social feed for agent discovery. It is a single platform where humans and AI agents coexist in the same conversation list, where messages flow between external platforms, and where users can build and deploy web pages through conversation.

### Why It Exists

Messaging is fragmented. AI tools live in separate apps. Building web pages requires leaving the conversation. Cross-platform communication requires juggling multiple apps. Open Raccoon unifies all of these into one minimalist, fast experience.

### Six Pillars

| Pillar | Description |
|--------|-------------|
| **Messaging** | Fast, encrypted 1:1 and group messaging with rich media |
| **AI Agents** | Chat with AI agents in the same list as humans. Build, configure, and deploy agents. |
| **Pages** | Create and deploy web pages through conversation. "Build me a landing page" → live URL |
| **Bridges** | Mirrored conversations with Telegram, WhatsApp, and future platforms |
| **Feed** | Agent-first social discovery. See what agents create. Like, fork, share. |
| **Marketplace** | Browse, rate, and install community-built agents |

### Target Users

- **Developers** who want AI agents integrated into their messaging workflow
- **Creators** who want to build pages and tools without leaving chat
- **Power users** who juggle multiple messaging platforms
- **Teams** who want self-hosted, privacy-respecting communication with AI

### Competitive Positioning

| Competitor | What They Do | What Open Raccoon Does Better |
|------------|-------------|-------------------------------|
| Telegram | Fast messaging, bots | AI agents are first-class citizens, not bolted-on bots. Page creation. Social feed. |
| Beeper/Texts | Unified messaging inbox | Open source. AI agents. Page creation. Social feed. Self-hostable. |
| Claude Code / ChatGPT | AI conversation + code | Messages persist. Agents live alongside human chats. Pages deploy to URLs. |
| v0.dev | AI page generation | Embedded in messaging. Conversational iteration. Social discovery of creations. |
| Discord | Community + bots | Minimalist. Not gaming-focused. AI-native. Cross-platform bridges. |

---

## 2. Design Language

> **Deep dive**: See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for the complete design system specification including CSS custom properties, accessibility requirements, iconography, and detailed component anatomy.

### Philosophy

Minimalistic. Calm. Focused. White mode by default. Typography-driven with generous whitespace and muted colors. Telegram-style speed and simplicity meets Linear/Notion aesthetics.

**Not**: cluttered, colorful, playful, corporate, or dark-by-default.

### Color Palette

#### Light Mode (Primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#FFFFFF` | Main background |
| `bg-secondary` | `#F8F9FA` | Sidebar, panels |
| `bg-tertiary` | `#F1F3F5` | Hover states, input fields |
| `border-subtle` | `#E9ECEF` | Dividers, borders |
| `border-default` | `#DEE2E6` | Input borders |
| `text-primary` | `#212529` | Headings, primary text |
| `text-secondary` | `#495057` | Body text |
| `text-tertiary` | `#868E96` | Timestamps, captions |
| `text-muted` | `#ADB5BD` | Placeholders |
| `accent` | `#228BE6` | Links, active states, primary actions |
| `accent-subtle` | `#E7F5FF` | Selected conversation, accent backgrounds |
| `sent-bubble` | `#228BE6` | Sent message bubble |
| `sent-text` | `#FFFFFF` | Sent message text |
| `received-bubble` | `#F1F3F5` | Received message bubble |
| `received-text` | `#212529` | Received message text |

#### Dark Mode (Secondary)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#1A1B1E` | Main background |
| `bg-secondary` | `#25262B` | Sidebar, panels |
| `bg-tertiary` | `#2C2E33` | Hover states |
| `border-subtle` | `#373A40` | Dividers |
| `text-primary` | `#C1C2C5` | Primary text |
| `text-secondary` | `#909296` | Body text |
| `accent` | `#339AF0` | Links, active states |

#### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#40C057` | Online status, sent confirmations |
| `warning` | `#FAB005` | Connection issues |
| `error` | `#FA5252` | Failures, errors |
| `info` | `#228BE6` | Information badges |

#### Platform Badge Colors

| Platform | Color | Hex |
|----------|-------|-----|
| Telegram | Blue | `#2AABEE` |
| WhatsApp | Green | `#25D366` |
| Signal | Blue-Grey | `#3A76F0` |
| Discord | Blurple | `#5865F2` |
| Slack | Purple | `#4A154B` |

### Typography

#### Apple Platforms (macOS/iOS)

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| H1 | SF Pro Display | 28px | Semibold (600) | 1.2 |
| H2 | SF Pro Display | 22px | Semibold (600) | 1.25 |
| H3 | SF Pro Text | 18px | Medium (500) | 1.3 |
| Body | SF Pro Text | 15px | Regular (400) | 1.5 |
| Body Small | SF Pro Text | 13px | Regular (400) | 1.4 |
| Caption | SF Pro Text | 11px | Regular (400) | 1.4 |
| Code | SF Mono | 13px | Regular (400) | 1.5 |
| Agent Status | SF Pro Text | 13px | Medium (500) | 1.4 |

#### Web (Future)

Primary: Inter. Monospace: JetBrains Mono. Same scale.

### Spacing System

Base unit: **4px**. All spacing uses multiples of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Icon-to-text gaps |
| `space-3` | 12px | Small padding |
| `space-4` | 16px | Standard padding, list item gaps |
| `space-5` | 20px | Section gaps |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Large section gaps |
| `space-10` | 40px | Panel padding |
| `space-12` | 48px | Major section dividers |
| `space-16` | 64px | Page-level spacing |

### Layout

#### macOS — Three-Column Layout

```
┌──────────┬─────────────────┬────────────────────────┐
│ Sidebar  │  Conversation   │  Workspace (optional)  │
│  240px   │    List 320px   │       Flex             │
│          │                 │                        │
│ Chats    │  Chat messages  │  Code / Preview /      │
│ Feed     │                 │  Terminal / Files      │
│ Settings │                 │                        │
└──────────┴─────────────────┴────────────────────────┘
```

- Sidebar: Navigation between Chats, Feed, Marketplace, Settings
- Conversation list: All conversations (human + agent + bridged)
- Main panel: Active conversation
- Workspace: Slide-over panel for coding/building (toggleable)

#### iOS — Navigation Stack

```
Conversation List → Conversation → Workspace (sheet)
```

- `NavigationSplitView` for iPad (2-column)
- `NavigationStack` for iPhone
- Shared code via multiplatform SwiftUI

### Agent Status Messages

When an AI agent is working, display fun/cool minimalistic status messages instead of generic "typing...". Developer humor style. Rotate randomly within category.

#### Categories and Examples

| Category | Examples |
|----------|----------|
| **Thinking** | "contemplating the void...", "asking the rubber duck...", "consulting the raccoon council..." |
| **Reading Code** | "reading your spaghetti code...", "parsing the chaos...", "judging your variable names..." |
| **Generating** | "brewing your landing page...", "assembling pixels...", "summoning components..." |
| **Searching** | "digging through the internet...", "raiding the knowledge base...", "foraging for answers..." |
| **Deploying** | "shipping it...", "releasing into the wild...", "launching to the moon..." |
| **Coding** | "writing code at 3am energy...", "refactoring reality...", "debugging the matrix..." |

Implementation: 13px medium weight, `text-tertiary` color, with a subtle pulsing animation (opacity 0.5 → 1.0, 1.5s ease).

### Branding

- **Logo**: Abstract/geometric raccoon mark. Clean lines, not cutesy. Single-weight stroke or filled geometric shapes forming a raccoon silhouette.
- **Icon**: Simplified raccoon face for app icon. Geometric, recognizable at 16px.
- **Name treatment**: "Open Raccoon" in medium weight, tracked slightly wide.
- **Wordmark**: "raccoon" can appear solo in contexts where "Open" is implied (e.g., `raccoon.page`).

### Animation & Motion

- **Message send**: Bubble slides up from input, subtle scale (0.95 → 1.0), 200ms ease-out
- **Typing indicator**: Three dots with staggered bounce, 800ms loop
- **Agent status**: Text crossfade with opacity transition, 300ms
- **Panel transitions**: Slide-in from right, 250ms ease-out
- **List items**: Fade in with 50ms stagger per item
- **All motion**: Respect `prefers-reduced-motion`

---

## 3. Core Features

### 3.1 Messaging (People)

#### Conversations

- **1:1 DMs**: Direct messages between two users
- **Group chats**: Multi-user conversations, up to 200K members (matches Telegram)
- **Conversation list**: Unified list showing all conversations (human, agent, bridged), sorted by last activity with deterministic precedence:
  1. New persisted message
  2. Finalized agent output (`complete`)
  3. Agent status update (`status`)
  4. Bridge health/status ping
- **Rich media**: Images, videos, files, voice messages, GIFs, stickers
- **Message types**: Text, media, code blocks, embeds, system messages

#### Real-Time Features

- **Typing indicators**: Per-conversation, debounced (2s after last keystroke)
- **Presence**: Online, Away (5min idle), Offline. Configurable visibility.
- **Read receipts**: Double-check marks. Configurable per conversation.
- **Delivery receipts**: Single check mark on server receipt

#### Message Interactions

- **Reactions**: Emoji reactions on any message
- **Replies**: Quote-reply to specific messages (threaded inline)
- **Threads**: Optional thread view for group conversations
- **Forward**: Forward messages to other conversations
- **Edit**: Edit own messages within 48 hours. Show "edited" indicator.
- **Delete**: Delete own messages. "Message deleted" placeholder for others.
- **Pin**: Pin important messages in conversations

#### Encryption

- **E2E encryption**: Signal Protocol (Double Ratchet + X3DH) for human-to-human conversations
- **Group encryption**: Sender Keys for group conversations
- **Visual indicator**: Lock icon on E2E encrypted conversations
- **Agent conversations**: Server-side encrypted (TLS), NOT E2E (agent needs to read messages)
- **Bridge conversations**: Server-side encrypted (external platform already sees content)

### 3.2 Agent Chat

#### Unified Experience

Agents appear in the same conversation list as humans. Each agent conversation has:

- **Agent badge**: Small icon/badge distinguishing agent from human
- **Agent avatar**: Custom avatar (set by creator) or generated geometric pattern
- **Model indicator**: Small label showing which LLM (e.g., "Claude", "GPT-5.2")

#### AI Responses

- **Streaming**: Token-by-token streaming of AI responses via WebSocket
- **Status messages**: Fun developer-humor status messages while working (see Design Language section)
- **Code blocks**: Syntax-highlighted code with copy button and "Run" button (if sandbox available)
- **Inline results**: Code execution output rendered inline (stdout, charts, images)
- **Markdown rendering**: Full markdown support in agent responses
- **Artifact detection**: When agent generates a page/component, offer to open in workspace

#### Workspace Panel

The workspace is a slide-over panel that appears to the right of the conversation when working with an agent on code or pages.

```
┌────────────────────┬────────────────────────┐
│                    │  ┌──────────────────┐  │
│   Conversation     │  │  Preview (live)   │  │
│                    │  │                   │  │
│   User: Build me   │  │   [Live page]     │  │
│   a landing page   │  │                   │  │
│                    │  ├──────────────────┤  │
│   Agent: Sure!     │  │  Files  Terminal  │  │
│   *coding...*      │  │                   │  │
│                    │  │  index.html       │  │
│   [code block]     │  │  style.css        │  │
│                    │  │  app.js           │  │
│                    │  └──────────────────┘  │
└────────────────────┴────────────────────────┘
```

Components:
- **Preview**: Live preview of generated page/app, refreshes on code changes
- **File browser**: Tree view of sandbox files
- **Terminal**: PTY session into sandbox
- **Code editor**: Read-only view of generated files with syntax highlighting

#### MCP Tool Integration

Agents can use MCP (Model Context Protocol) tools:

- **Built-in tools**: Web search, code execution, file operations, image generation
- **Custom MCP servers**: Users can connect their own MCP servers (databases, APIs, etc.)
- **Tool approval**: Inline approval card in chat/workspace. Default is deny for first sensitive call.
- **Tool execution log**: Expandable log showing which tools were called and results

**Normative approval semantics**:

- The system **MUST** emit an `approval_requested` event before executing any sensitive tool action.
- The approval card **MUST** offer exactly:
  - `allow_once`
  - `allow_for_session`
  - `always_for_agent_tool`
- `allow_for_session` **MUST** expire when the authenticated session ends or refresh token is revoked.
- `always_for_agent_tool` **MUST** be scoped to `(user_id, agent_id, tool_name)` and **MUST NOT** grant access to other agents.
- Users **MUST** be able to revoke remembered approvals at any time from agent settings.
- Revocation **MUST** affect future calls immediately and **MUST** emit `approval_revoked`.
- On denial/revocation, the runtime **MUST** return a stable error code (`tool_permission_denied`) and continue the conversation gracefully.

**Audit requirements**:

- Every approval decision **MUST** be persisted with:
  - `actor_user_id`
  - `agent_id`
  - `conversation_id`
  - `tool_name`
  - `scope` (`allow_once | allow_for_session | always_for_agent_tool`)
  - `arguments_hash` (sha256 canonicalized args)
  - `decision` (`approved | denied | revoked`)
  - `decided_at`

#### Agent Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| System prompt | Custom instructions for the agent | Template-provided |
| Model | LLM model selection | Claude Sonnet |
| Temperature | Response randomness (0-1) | 0.7 |
| Max tokens | Maximum response length | 4096 |
| Tools | Which MCP tools the agent can use | All built-in |
| Visibility | Public / Private / Unlisted | Private |
| BYOK | User's own API key | Platform credits |

#### Cost Management

- **Platform credits**: Default payment method. Purchased in-app.
- **BYOK (Bring Your Own Key)**: Users enter their own Anthropic/OpenAI API key. Keys stored locally on device, never on server.
- **Token counter**: Live token count displayed during conversation
- **Spending limits**: Per-agent and per-account monthly limits
- **Usage dashboard**: Token usage, cost breakdown by agent, historical trends

### 3.3 Page Creation

#### Chat-Driven Generation

Users create pages by chatting with an agent:

```
User: Build me a minimalist portfolio page with my projects
Agent: I'll create that for you...
[Status: "assembling pixels..."]
[Code block: index.html]
[Inline preview appears]
```

#### Workflow

1. **Request**: User describes desired page in natural language
2. **Generation**: Agent generates HTML/CSS/JS in E2B sandbox
3. **Inline preview**: Thumbnail preview appears in chat
4. **Workspace**: Click preview to open slide-over workspace with full preview
5. **Iteration**: Continue chatting to refine ("Make the header bigger", "Add a dark mode toggle")
6. **Deploy**: One-click deploy to `raccoon.page/{username}/{slug}`

#### Page Features

- **Tech**: Generated as static HTML/CSS/JS or React components
- **Custom domains**: Premium feature — point your own domain to a page
- **Version history**: Every deploy creates a version. Roll back anytime.
- **Forking**: Any public page can be forked and customized
- **Analytics**: View count, visitor geography (basic, privacy-respecting)
- **SEO**: Auto-generated meta tags, Open Graph images

#### Page URLs

```
raccoon.page/{username}/{slug}
```

Examples:
- `raccoon.page/alice/portfolio`
- `raccoon.page/bob/startup-landing`
- `raccoon.page/agent-coder/react-dashboard`

### 3.4 Cross-Platform Bridges

#### Architecture: Mirrored Conversations

Each external chat becomes a separate conversation in Open Raccoon with a platform icon badge.

```
┌──────────────────────────┐
│ Conversations             │
│                          │
│ 👤 Alice                 │
│ 🤖 Code Agent            │
│ Ⓣ Family Group          │  ← Telegram bridge
│ Ⓦ Work Chat             │  ← WhatsApp bridge
│ 👤 Bob                   │
│ Ⓣ Dev Community         │  ← Telegram bridge
└──────────────────────────┘
```

#### Telegram Bridge

| Method | Library | Use Case |
|--------|---------|----------|
| User-level (MTProto) | Telethon (Python) | Full access to user's chats, groups, channels. Mirrors all conversations. |
| Bot API | Telegram Bot API | Bot-specific interactions. Webhooks. Inline keyboards. |

**Capabilities**:
- Mirror all conversations (DMs, groups, channels)
- Send/receive text, media, stickers, voice messages
- Typing indicators (bidirectional)
- Read receipts (where supported)
- Session management with `.session` files

**Rate Limits**:
- Bot API: Adaptive/dynamic throttling in practice; treat 30 msg/s and 1 msg/3s per group/channel as planning baseline only
- MTProto: Flood wait handling, exponential backoff

#### WhatsApp Bridge

| Method | Library | Use Case |
|--------|---------|----------|
| Personal | Baileys (TypeScript) | Full access to personal WhatsApp chats via Web protocol |
| Business | WhatsApp Cloud API | Official business API. Template messages. Higher rate limits. |

**Capabilities**:
- Mirror all conversations
- Send/receive text, media, documents, voice messages, locations
- Reactions (bidirectional)
- Status/stories viewing

**Important Notes**:
- On-Premises API deprecated October 2025 — Cloud API is the only official option
- Baileys is unofficial — risk of account restrictions
- Cloud API requires Meta business verification

#### Media Normalization

| Feature | Telegram | WhatsApp | Open Raccoon |
|---------|----------|----------|--------------|
| Max file size | 2GB (MTProto), 50MB (Bot API) | 16MB media, 100MB documents | Store in R2, serve via CDN |
| Image formats | JPEG, PNG, WebP | JPEG, PNG | Convert to WebP for storage |
| Video formats | MP4, MKV, etc. | MP4 only | Transcode to MP4 if needed |
| Voice messages | OGG Opus | OGG Opus | OGG Opus (native match) |
| Stickers | WebP / TGS (animated) | WebP | WebP (convert TGS to animated WebP) |

#### Connection Status

Each bridge connection shows:
- **Connected**: Green dot. Real-time sync active.
- **Reconnecting**: Yellow dot. Attempting to re-establish connection.
- **Disconnected**: Red dot. User action required (re-authenticate).

Normative UI behavior:
- Bridge status badge appears both in conversation list row and conversation header.
- Reconnecting state **MUST** include last retry timestamp and next retry ETA.
- Users **MUST** be able to cancel reconnect attempts and trigger manual reconnect.

#### Future Platforms

| Platform | Library | Priority |
|----------|---------|----------|
| Signal | libsignal (Rust) | High |
| Discord | discord.py | Medium |
| Slack | Bolt SDK | Medium |
| Matrix | matrix-nio | Low (native federation potential) |

### 3.5 Social Feed

#### Agent-First Discovery

The feed is a discovery surface for AI agents and their creations. It is NOT a traditional social media feed — it's agent-centric.

#### Content Types

| Type | Description |
|------|-------------|
| **Agent showcase** | Agent profile card with description, sample conversation, and featured creation |
| **Page showcase** | Deployed page with live preview thumbnail, title, description |
| **Tool showcase** | MCP tool/server with description, usage examples |
| **Remix** | Forked/modified version of an existing creation with attribution |
| **Creation** | Any notable output from an agent (chart, analysis, design) |

#### Feed Layout

Content-centric grid/cards layout. Visually cool but minimalistic.

```
┌──────────────────────────────────────────┐
│  For You   Trending   Following   New    │
├──────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐        │
│ │  [Preview]   │  │  [Preview]   │       │
│ │             │  │             │        │
│ │ Agent Name  │  │ Page Title  │        │
│ │ Description │  │ by @user    │        │
│ │ ❤ 42  🔀 8  │  │ ❤ 156  🔀 23│       │
│ └─────────────┘  └─────────────┘        │
│ ┌─────────────┐  ┌─────────────┐        │
│ │  [Preview]   │  │  [Preview]   │       │
│ │             │  │             │        │
│ │ Tool Name   │  │ Agent Name  │        │
│ │ MCP Server  │  │ Remix of... │        │
│ │ ❤ 89  🔀 12 │  │ ❤ 34  🔀 5  │       │
│ └─────────────┘  └─────────────┘        │
└──────────────────────────────────────────┘
```

#### Interactions

- **Like**: Heart/star a creation
- **Fork/Remix**: Copy and modify a page or agent configuration
- **Share**: Generate shareable URL for external platforms
- **Follow**: Follow a creator to see their new creations in "Following" tab
- **Try**: Start a conversation with a showcased agent
- **Comment**: Leave feedback on a creation (kept minimal — not a comment section)

### 3.6 Agent Marketplace

#### Browse & Discover

- **Categories**: Coding, Writing, Research, Creative, Data Analysis, Education, Productivity, Fun
- **Search**: Full-text search with filters (category, model, rating, price)
- **Featured**: Editorially curated featured agents
- **Trending**: Algorithmically ranked by recent usage/rating velocity

#### Agent Profiles

Each marketplace agent has:
- Name, avatar, description
- Sample conversations (curated by creator)
- Capabilities list (what tools/MCP servers it uses)
- Ratings (1-5 stars) and review count
- Usage count (total conversations started)
- Creator profile link
- "Try" button → starts new conversation with agent
- "Fork" button → copy agent config to customize

#### Visibility Levels

| Level | Description |
|-------|-------------|
| **Public** | Listed in marketplace, appears in feed, anyone can use |
| **Unlisted** | Not in marketplace/feed, accessible via direct link |
| **Private** | Only the creator can use |

#### Creator Monetization (Future)

- **Free agents**: Default. Creator gets exposure.
- **Premium agents**: Per-message or per-conversation pricing
- **Tips**: Users can tip creators
- **Revenue share**: Platform takes 15%, creator gets 85%

### 3.7 Agent-First Lifecycle (Normative)

This section is normative. Implementations **MUST** follow these flows and state transitions.

#### Canonical Discovery -> Conversation Flow

1. User taps `Try` from Feed or Marketplace.
2. System checks if user has an active conversation with this agent.
3. If active exists and user chooses resume:
   - Open existing conversation.
4. Else:
   - Create new conversation (`type='agent'`, `agent_id` set).
   - Add user as conversation member (`role='owner'` for self-created personal thread).
5. System evaluates required tool approvals for the first planned agent action.
6. If approval needed:
   - Conversation state becomes `awaiting_approval`.
   - Inline approval card is shown.
7. After approval:
   - State becomes `active`.
   - Agent execution starts and streams events.

#### Conversation Reuse Rules

- Reuse default is **resume existing** for same `(user_id, agent_id)` when previous state is `active` or `paused`.
- User **MAY** force new thread from UI ("Start new thread"), which creates a new conversation row.
- Visibility change (`public/unlisted/private`) **MUST NOT** delete existing conversations.
- If an agent becomes private, existing non-creator user conversations become read-only until re-authorized by creator policy.

#### Lifecycle State Machine

```
new -> awaiting_approval -> active -> paused -> archived
                      \-> failed -----^
```

Definitions:
- `new`: Conversation created, no agent execution yet.
- `awaiting_approval`: Execution blocked pending user decision.
- `active`: Normal bi-directional user/agent interaction.
- `paused`: User or system paused execution (e.g., temporary policy block).
- `failed`: Execution stopped due to non-recoverable error.
- `archived`: Inactive, hidden from default list but recoverable.

#### Blocking and Recovery Behavior

- In `awaiting_approval`, message composer remains enabled for user messages, but tool-dependent agent actions are blocked.
- In `failed`, UI **MUST** show retry action and last stable error code.
- Retry from `failed` **MUST** create a new execution attempt id without mutating historical messages.
- State transitions **MUST** be emitted to `user:{id}` as `conversation_updated`.

#### Status Precedence Rules

- If both bridge and agent statuses exist in the same visual frame:
  - Error states override non-error states.
  - Agent execution error takes precedence over reconnecting bridge warning when agent output is blocked.
  - Reconnecting bridge warning takes precedence when user outbound bridge send is blocked.

#### Accessibility for Dynamic State

- Status updates (`thinking`, `deploying`, `retrying`, bridge reconnecting) **MUST** be exposed via screen-reader live regions.
- Shimmer/pulse-only indicators **MUST** have text equivalents.

---

## 4. System Architecture

### High-Level Architecture

```
                            ┌─────────────────┐
                            │   CDN / R2      │
                            │  (Static Assets) │
                            └────────┬────────┘
                                     │
┌──────────┐    WebSocket    ┌───────┴────────┐     gRPC      ┌──────────────┐
│  Swift   │◄──────────────►│                │◄──────────────►│   Python     │
│  Client  │    + REST       │    Elixir      │               │   Agent      │
│ (macOS/  │                │    Phoenix     │               │   Runtime    │
│  iOS)    │                │    Gateway     │               │   (Sidecar)  │
└──────────┘                │                │               └──────┬───────┘
                            └───────┬────────┘                     │
                                    │                              │
                    ┌───────────────┼───────────────┐              │
                    │               │               │              │
              ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐  ┌────┴─────┐
              │ PostgreSQL │  │   Redis   │  │    R2     │  │   E2B    │
              │  (Primary) │  │  (Cache/  │  │  (Object  │  │ Sandbox  │
              │            │  │   PubSub) │  │  Storage) │  │          │
              └────────────┘  └───────────┘  └───────────┘  └──────────┘
                                    │
                            ┌───────┴────────┐
                            │   Bridge       │
                            │   Workers      │
                            │  (Telegram,    │
                            │   WhatsApp)    │
                            └────────────────┘
```

### Service Breakdown

#### Elixir Umbrella Project Structure

```
open_raccoon/
├── apps/
│   ├── raccoon_gateway/      # Phoenix web app, WebSocket, REST API
│   ├── raccoon_chat/         # Chat logic, message storage, conversations
│   ├── raccoon_agents/       # Agent configuration, LLM coordination
│   ├── raccoon_bridges/      # Bridge connections, message normalization
│   ├── raccoon_pages/        # Page storage, deployment, version history
│   ├── raccoon_feed/         # Feed ranking, quality scoring, discovery
│   ├── raccoon_accounts/     # Auth, user profiles, billing
│   └── raccoon_shared/       # Common types, message envelope, utilities
├── config/
├── rel/
└── mix.exs
```

#### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| `raccoon_gateway` | HTTP endpoints, WebSocket channels, authentication middleware, rate limiting |
| `raccoon_chat` | Message CRUD, conversation management, E2E encryption key exchange, presence |
| `raccoon_agents` | Agent config CRUD, LLM request routing, gRPC client to Python sidecar, token counting |
| `raccoon_bridges` | Bridge lifecycle, message normalization, Telegram/WhatsApp adapter GenServers |
| `raccoon_pages` | Page storage, R2 deployment, version history, custom domains |
| `raccoon_feed` | Feed item indexing, ranking algorithm, quality scoring, trending calculation |
| `raccoon_accounts` | User registration, auth (email/OAuth/passkey/Telegram Login), billing, BYOK key storage |
| `raccoon_shared` | Common message envelope, Ecto schemas, utility functions |

#### Service Ownership Contracts (Normative)

- `raccoon_chat` owns canonical message persistence and conversation ordering fields.
- `raccoon_agents` owns agent execution state and tool approval enforcement.
- `raccoon_bridges` owns external platform delivery/retry state and bridge status transitions.
- `raccoon_feed` consumes normalized events; it does not mutate chat state.
- Cross-service communication **MUST** use stable internal events with versioned payload schemas.

#### Runtime Isolation Guidance

- Bridge adapters should run on dedicated worker nodes/process pools separate from latency-sensitive gateway channels.
- Agent gRPC pools should be capacity-limited independently from bridge worker pools.
- Queue saturation in one subsystem (bridges/agents/feed) **MUST NOT** block base message persistence.

### Message Flow Pipeline

```
1. Client sends message via WebSocket
   │
2. Gateway Channel receives, validates auth
   │
3. Message envelope created (common format)
   │
4. raccoon_chat validates idempotency key (if present) and persists to PostgreSQL
   │
5. Phoenix.PubSub broadcasts to conversation topic
   │
6. If agent conversation:
   │   └── raccoon_agents sends to Python sidecar via gRPC
   │       └── Python orchestrates LLM call + tool use
   │       └── Streams response tokens back via gRPC stream
   │       └── Gateway streams tokens to client via WebSocket
   │
7. If bridge conversation:
   │   └── raccoon_bridges routes to appropriate adapter
   │       └── Adapter sends via Telethon/Baileys/Cloud API
   │
8. All recipients receive via WebSocket push
```

### Common Message Envelope

Every message in Open Raccoon uses a unified envelope format:

```json
{
  "id": "msg_01abc123",
  "conversation_id": "conv_01xyz789",
  "sender": {
    "id": "user_01def456",
    "type": "human | agent | bridge | system",
    "display_name": "Alice",
    "avatar_url": "https://..."
  },
  "type": "text | media | code | embed | system | agent_status",
  "content": {
    "text": "Hello!",
    "media": null,
    "code": null,
    "embed": null
  },
  "metadata": {
    "bridge_source": null,
    "agent_model": null,
    "agent_tools_used": [],
    "encryption": "e2e | server | none",
    "edit_history": [],
    "reply_to": null,
    "thread_id": null
  },
  "reactions": [],
  "created_at": "2026-02-25T08:00:00Z",
  "updated_at": "2026-02-25T08:00:00Z"
}
```

---

## 5. Technology Stack

### Backend: Elixir/Phoenix

**Why Elixir?**
- BEAM VM handles millions of concurrent WebSocket connections (Discord: 5M+ concurrent users with Elixir, ~5-person team)
- Lightweight processes (~2KB each) — one process per WebSocket, per conversation, per bridge connection
- Built-in fault tolerance (supervision trees, "let it crash" philosophy)
- Phoenix Channels provide first-class WebSocket abstraction with PubSub
- Phoenix.Presence for distributed presence tracking
- Hot code upgrades for zero-downtime deployments
- Clustering via libcluster for multi-node deployments on Fly.io

**Key Libraries**:

| Library | Version | Purpose |
|---------|---------|---------|
| Phoenix | ~> 1.8 | Web framework, Channels, REST |
| Ecto SQL + Postgrex | ~> 3.11 / ~> 0.17 | Database ORM (PostgreSQL) |
| Oban | ~> 2.20 | Background job processing (uses PostgreSQL, no Redis needed for jobs) |
| Guardian | ~> 2.3 | JWT authentication |
| Ueberauth | ~> 0.10 | OAuth (Google, Apple, GitHub) |
| wax_ | ~> 0.6 | WebAuthn/Passkey support |
| Hammer | ~> 7.0 | Rate limiting (ETS, Redis, or Mnesia backends) |
| dns_cluster | ~> 0.1 | Node clustering on Fly.io via DNS discovery |
| elixir-grpc | ~> 0.7 | gRPC client for Python sidecar |
| ConnGRPC | ~> 0.1 | Persistent gRPC channel pools |
| Jason | ~> 1.4 | JSON encoding/decoding |

**Oban Queue Configuration** (background jobs):

| Queue | Workers | Purpose |
|-------|---------|---------|
| `default` | 10 | General tasks |
| `mailers` | 20 | Email notifications |
| `media` | 5 | Thumbnail generation, transcoding |
| `bridges` | 10 | External bridge syncing |
| `agents` | 5 | Agent execution tasks |
| `feed` | 10 | Feed indexing, quality scoring |
| `maintenance` | 2 | Partition creation, cleanup |

Oban uses PostgreSQL as its job store — full ACID guarantees, no additional infrastructure needed. Cron scheduling ensures only the leader node inserts periodic jobs (no duplicates across cluster).

### Agent Runtime: Python Sidecar (gRPC)

**Why Python sidecar?**
- AI/ML ecosystem is Python-first (Anthropic SDK, OpenAI SDK, LangChain, etc.)
- MCP SDK is Python-native
- E2B SDK is Python-native
- gRPC provides efficient, typed, streaming communication with Elixir

**Architecture**:
```
Elixir (raccoon_agents) ◄──gRPC──► Python Agent Runtime
                                      ├── LLM orchestration (anthropic, openai SDKs)
                                      ├── MCP client (mcp SDK)
                                      ├── E2B sandbox management (e2b SDK)
                                      └── Tool execution
```

**Alternative: Snakepit** (`~> 0.13.0`) — Production-ready Elixir library for Python process pooling with gRPC streaming, bidirectional tool bridging, session affinity, circuit breakers, and OpenTelemetry integration. Consider as a higher-level alternative to raw elixir-grpc if the @tool decorator pattern fits the agent architecture.

**gRPC Service Definition**:
```protobuf
syntax = "proto3";
package raccoon.agent;

service AgentService {
  rpc ExecuteAgent (AgentRequest) returns (stream AgentResponse);
  rpc GetAgentConfig (AgentConfigRequest) returns (AgentConfig);
  rpc ValidateTools (ValidateToolsRequest) returns (ValidateToolsResponse);
}

service SandboxService {
  rpc CreateSandbox (CreateSandboxRequest) returns (SandboxInfo);
  rpc ExecuteCode (ExecuteCodeRequest) returns (stream ExecutionOutput);
  rpc UploadFile (UploadFileRequest) returns (UploadFileResponse);
  rpc DestroySandbox (DestroySandboxRequest) returns (Empty);
}

message AgentRequest {
  string conversation_id = 1;
  string agent_id = 2;
  repeated Message messages = 3;
  AgentConfig config = 4;
  string user_api_key = 5; // BYOK, empty = use platform credits
}

message AgentResponse {
  oneof response {
    string token = 1;           // Streaming text token
    string status_message = 2;  // Fun status message
    ToolCall tool_call = 3;     // Tool being invoked
    ToolResult tool_result = 4; // Tool result
    CodeBlock code_block = 5;   // Generated code
    string error = 6;           // Error message
  }
}
```

### Runtime Reliability Policy (Normative)

All agent-runtime and bridge-runtime paths **MUST** follow the same deadline, retry, and backpressure policy.

#### Deadlines and Cancellation

- `ExecuteAgent` default deadline: **60s** per turn (configurable by deployment).
- Tool call deadline: **20s** default, **120s** max for explicitly long-running tools.
- `ExecuteCode` default deadline: **45s** per execution chunk.
- Client disconnect or explicit cancel **MUST** propagate cancellation to:
  - Elixir channel process
  - gRPC stream
  - MCP tool subprocess/request
  - E2B execution request (if active)

#### Retry Matrix

| Error Class | Retry? | Attempts | Backoff |
|-------------|--------|----------|---------|
| Network transient (`UNAVAILABLE`, timeout) | Yes | 3 | Exponential + jitter (250ms, 1s, 2s) |
| Provider 429/rate-limit | Yes | 3 | Respect provider `retry_after` when present |
| Tool permission denied | No | 0 | N/A |
| Validation errors | No | 0 | N/A |
| Internal runtime crash | Yes | 1 | Immediate restart with new attempt id |

#### Backpressure and Stream Safety

- Token stream **MUST** be bounded in memory per conversation.
- When client is slow, server **MUST** apply bounded buffering and then shed lowest-priority events first:
  1. Status updates
  2. Tool progress updates
  3. Never drop final `complete` or terminal `error`
- Bridge outbound queues **MUST** be per-platform and per-conversation rate limited.

#### Degraded Mode

- On queue saturation, system **MUST**:
  - Keep message persistence available.
  - Temporarily pause new agent executions.
  - Surface user-visible degraded status in conversation UI.

#### Observability (Normative)

Required metrics:
- `agent_turn_latency_ms` (p50/p95/p99)
- `tool_approval_requests_total`, `tool_approval_denied_total`
- `grpc_deadline_exceeded_total`
- `bridge_reconnect_attempts_total`
- `bridge_delivery_failures_total`
- Queue depth metrics for `agents`, `bridges`, `feed`

Required tracing:
- End-to-end span from incoming message -> agent runtime -> tool call -> final response.

Required alerts:
- Approval denial spike anomaly
- Sustained queue saturation
- Elevated deadline/timeouts
- Bridge reconnect storm per tenant

### Frontend: Swift/SwiftUI

**Platform Order**: macOS → iOS → Web → Windows → Android

| Platform | Technology | Timeline |
|----------|-----------|----------|
| macOS | SwiftUI + NavigationSplitView | Primary (first) |
| iOS | SwiftUI + NavigationStack | Primary (parallel) |
| Web | Next.js + React | Future |
| Windows | Tauri or Electron | Future |
| Android | Kotlin Multiplatform | Future |

**Key Swift Libraries**:

| Library | Purpose |
|---------|---------|
| SwiftUI | UI framework |
| SwiftPhoenix | Phoenix Channels WebSocket client |
| SwiftData / @Observable | State management |
| Kingfisher | Image loading/caching |
| KeychainAccess | Secure credential storage |
| CryptoKit | E2E encryption primitives |

**Code Sharing Strategy**:
- Shared multiplatform package for: models, networking, state management, crypto
- Platform-specific UI layers for macOS (3-column) and iOS (navigation stack)
- `#if os(macOS)` / `#if os(iOS)` for platform-specific adaptations

### Database: PostgreSQL + Redis + R2

| Store | Purpose |
|-------|---------|
| PostgreSQL | Primary data store (users, conversations, messages, agents, pages) |
| Redis | Caching, Phoenix PubSub adapter, session storage, rate limit counters |
| Cloudflare R2 | Object storage for media, page assets, avatars (S3-compatible, no egress fees) |

### Sandboxing: E2B

- **What**: Firecracker microVMs for secure code execution
- **Why**: Sub-second sandbox creation (~150ms), hardware-level isolation, Python/JS/TS/Bash support, 200M+ sandboxes served
- **Usage**: Agent code execution, page generation, tool sandboxing
- **Limits**: 24hr max session, configurable CPU/memory/network
- **SDK**: `e2b-code-interpreter` Python package

### Deployment: Fly.io

- **Why**: Native Elixir/BEAM support, multi-region deployment, built-in clustering via DNS, PostgreSQL and Redis managed services
- **Architecture**:
  - Elixir app: 2+ machines, clustered via `libcluster` + Fly.io DNS
  - Python sidecar: Co-located or separate machine, connected via internal network
  - PostgreSQL: Fly.io managed Postgres
  - Redis: Fly.io managed Redis (Upstash)
  - R2: Cloudflare R2 (external)

### Authentication

| Method | Library/Approach |
|--------|-----------------|
| Email + password | Argon2 hashing, Guardian JWT |
| OAuth | Google, Apple, GitHub via Ueberauth |
| Passkeys (WebAuthn) | `webauthn_components` for Phoenix |
| Telegram Login | Telegram Login Widget verification |

### LLM Providers

| Provider | Role | Models |
|----------|------|--------|
| Anthropic (Claude) | Primary | Claude Sonnet (default), Claude Opus (premium) |
| OpenAI | Secondary | GPT-5.2, GPT-5.2-chat-latest |

AI Gateway: Route through Bifrost or LiteLLM for unified API, failover, and cost tracking.

---

## 6. Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR(32) UNIQUE NOT NULL,
  display_name    VARCHAR(128),
  email           VARCHAR(255) UNIQUE,
  password_hash   VARCHAR(255),
  avatar_url      TEXT,
  bio             TEXT,
  status          VARCHAR(16) DEFAULT 'active', -- active, suspended, deleted
  role            VARCHAR(16) DEFAULT 'user',   -- user, admin, moderator
  settings        JSONB DEFAULT '{}',
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('active', 'suspended', 'deleted')),
  CHECK (role IN ('user', 'admin', 'moderator'))
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
```

#### `conversations`
```sql
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(16) NOT NULL, -- dm, group, agent, bridge
  title           VARCHAR(255),
  avatar_url      TEXT,
  creator_id      UUID REFERENCES users(id),
  agent_id        UUID REFERENCES agents(id),
  bridge_id       UUID REFERENCES bridge_connections(id),
  metadata        JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (type IN ('dm', 'group', 'agent', 'bridge')),
  CHECK (
    (type = 'agent' AND agent_id IS NOT NULL AND bridge_id IS NULL) OR
    (type = 'bridge' AND bridge_id IS NOT NULL AND agent_id IS NULL) OR
    (type IN ('dm', 'group') AND agent_id IS NULL AND bridge_id IS NULL)
  )
);

CREATE INDEX idx_conversations_type ON conversations (type);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);
```

#### `conversation_members`
```sql
CREATE TABLE conversation_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  role            VARCHAR(16) DEFAULT 'member', -- owner, admin, member
  muted           BOOLEAN DEFAULT FALSE,
  last_read_at    TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role IN ('owner', 'admin', 'member')),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members (user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members (conversation_id);
```

#### `messages`
```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id       UUID REFERENCES users(id),
  sender_type     VARCHAR(16) NOT NULL, -- human, agent, bridge, system
  type            VARCHAR(16) NOT NULL, -- text, media, code, embed, system, agent_status
  content         JSONB NOT NULL,       -- {text, media_url, code, language, etc.}
  metadata        JSONB DEFAULT '{}',   -- {bridge_source, agent_model, tools_used, reply_to, etc.}
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_type IN ('human', 'agent', 'bridge', 'system')),
  CHECK (type IN ('text', 'media', 'code', 'embed', 'system', 'agent_status'))
) PARTITION BY RANGE (created_at);

-- Partition by month for scalability
CREATE TABLE messages_2026_01 PARTITION OF messages
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE messages_2026_02 PARTITION OF messages
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... auto-create partitions via pg_partman

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);
```

#### `message_reactions`
```sql
CREATE TABLE message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  emoji       VARCHAR(32) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);
```

#### `agents`
```sql
CREATE TABLE agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES users(id),
  name            VARCHAR(64) NOT NULL,
  slug            VARCHAR(64) UNIQUE NOT NULL,
  description     TEXT,
  avatar_url      TEXT,
  system_prompt   TEXT NOT NULL,
  model           VARCHAR(64) NOT NULL DEFAULT 'claude-sonnet-4-6',
  temperature     FLOAT DEFAULT 0.7,
  max_tokens      INTEGER DEFAULT 4096,
  tools           JSONB DEFAULT '[]',    -- list of enabled MCP tools
  mcp_servers     JSONB DEFAULT '[]',    -- connected MCP server configs
  visibility      VARCHAR(16) DEFAULT 'private', -- public, unlisted, private
  category        VARCHAR(32),
  usage_count     BIGINT DEFAULT 0,
  rating_sum      INTEGER DEFAULT 0,
  rating_count    INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (visibility IN ('public', 'unlisted', 'private')),
  CHECK (temperature >= 0 AND temperature <= 1),
  CHECK (max_tokens > 0)
);

CREATE INDEX idx_agents_creator ON agents (creator_id);
CREATE INDEX idx_agents_visibility ON agents (visibility);
CREATE INDEX idx_agents_category ON agents (category);
CREATE INDEX idx_agents_slug ON agents (slug);
```

#### `pages`
```sql
CREATE TABLE pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES users(id),
  agent_id        UUID REFERENCES agents(id),
  conversation_id UUID REFERENCES conversations(id),
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(128) NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  r2_path         TEXT NOT NULL,        -- path in R2 bucket
  deploy_url      TEXT,                 -- raccoon.page/{user}/{slug}
  custom_domain   TEXT,
  version         INTEGER DEFAULT 1,
  forked_from     UUID REFERENCES pages(id),
  visibility      VARCHAR(16) DEFAULT 'public',
  view_count      BIGINT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (visibility IN ('public', 'unlisted', 'private')),
  CHECK (version > 0),
  UNIQUE (creator_id, slug)
);

CREATE INDEX idx_pages_creator ON pages (creator_id);
CREATE INDEX idx_pages_deploy_url ON pages (deploy_url);
```

#### `page_versions`
```sql
CREATE TABLE page_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  r2_path     TEXT NOT NULL,
  changes     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (page_id, version)
);
```

#### `bridge_connections`
```sql
CREATE TABLE bridge_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  platform          VARCHAR(16) NOT NULL, -- telegram, whatsapp, signal, discord
  method            VARCHAR(16) NOT NULL, -- user_level, bot, cloud_api
  status            VARCHAR(16) DEFAULT 'disconnected', -- connected, reconnecting, disconnected, error
  encrypted_credentials BYTEA,            -- AES-256-GCM encrypted session/token
  metadata          JSONB DEFAULT '{}',   -- platform-specific config
  last_sync_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (platform IN ('telegram', 'whatsapp', 'signal', 'discord')),
  CHECK (method IN ('user_level', 'bot', 'cloud_api')),
  CHECK (status IN ('connected', 'reconnecting', 'disconnected', 'error')),
  UNIQUE (user_id, platform, method)
);

CREATE INDEX idx_bridges_user ON bridge_connections (user_id);
CREATE INDEX idx_bridges_platform ON bridge_connections (platform);
```

#### `feed_items`
```sql
CREATE TABLE feed_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(16) NOT NULL, -- agent_showcase, page_showcase, tool_showcase, remix, creation
  reference_id    UUID NOT NULL,        -- ID of the agent/page/tool
  reference_type  VARCHAR(16) NOT NULL, -- agent, page, tool
  title           VARCHAR(255),
  description     TEXT,
  thumbnail_url   TEXT,
  quality_score   FLOAT DEFAULT 0,
  trending_score  FLOAT DEFAULT 0,
  like_count      INTEGER DEFAULT 0,
  fork_count      INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  embedding       vector(1536),         -- pgvector for similarity/dedup
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (type IN ('agent_showcase', 'page_showcase', 'tool_showcase', 'remix', 'creation')),
  CHECK (reference_type IN ('agent', 'page', 'tool'))
);

CREATE INDEX idx_feed_creator ON feed_items (creator_id);
CREATE INDEX idx_feed_trending ON feed_items (trending_score DESC);
CREATE INDEX idx_feed_quality ON feed_items (quality_score DESC);
CREATE INDEX idx_feed_created ON feed_items (created_at DESC);
CREATE INDEX idx_feed_embedding ON feed_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

#### `feed_item_references` (Polymorphic Integrity Registry)
```sql
CREATE TABLE feed_item_references (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id    UUID NOT NULL,
  reference_type  VARCHAR(16) NOT NULL, -- agent, page, tool
  exists_flag     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reference_type IN ('agent', 'page', 'tool')),
  UNIQUE (reference_id, reference_type)
);

ALTER TABLE feed_items
  ADD CONSTRAINT fk_feed_reference_registry
  FOREIGN KEY (reference_id, reference_type)
  REFERENCES feed_item_references (reference_id, reference_type);
```

#### `feed_likes`
```sql
CREATE TABLE feed_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (feed_item_id, user_id)
);
```

#### `user_follows`
```sql
CREATE TABLE user_follows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);
```

#### `agent_ratings`
```sql
CREATE TABLE agent_ratings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id, user_id)
);
```

#### `user_credentials` (Passkeys)
```sql
CREATE TABLE user_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id   BYTEA UNIQUE NOT NULL,
  public_key      BYTEA NOT NULL,
  sign_count      BIGINT DEFAULT 0,
  name            VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Index Strategy

- **Conversation messages**: B-tree on `(conversation_id, created_at DESC)` — primary query pattern
- **Message partitioning**: Range partition by `created_at` (monthly) — essential for scaling
- **Feed embeddings**: IVFFlat index on `embedding` column — similarity search for deduplication
- **Full-text search**: GIN index on `messages.content->>'text'` for message search (within non-E2E conversations)

### Mutation Guarantees (Normative)

- Counter fields (`like_count`, `fork_count`, `view_count`, `usage_count`, `rating_sum`, `rating_count`) **MUST** be updated via atomic SQL (`SET value = value + 1`) in a single transaction.
- `POST /pages/:id/deploy` **MUST** lock page row (`SELECT ... FOR UPDATE`) before incrementing version and inserting `page_versions`.
- Any counter recalculation job **MUST** be idempotent and safe to re-run.

### Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram similarity for search
```

---

## 7. API Design

### REST Endpoints (CRUD Operations)

All endpoints prefixed with `/api/v1`. Authentication via `Authorization: Bearer <jwt>` header.

#### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account (email + password) |
| POST | `/auth/login` | Login, returns JWT pair |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/passkey/register` | Register a passkey |
| POST | `/auth/passkey/authenticate` | Authenticate with passkey |
| POST | `/auth/oauth/:provider` | OAuth callback (google, apple, github) |
| POST | `/auth/telegram` | Telegram Login verification |
| DELETE | `/auth/logout` | Invalidate refresh token |

#### Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current user profile |
| PATCH | `/users/me` | Update profile |
| GET | `/users/:username` | Public user profile |
| GET | `/users/me/usage` | Token usage and billing |

#### Conversations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/conversations` | List user's conversations (cursor-paginated) |
| POST | `/conversations` | Create conversation (dm, group, agent) |
| GET | `/conversations/:id` | Conversation details |
| PATCH | `/conversations/:id` | Update conversation (title, settings) |
| DELETE | `/conversations/:id` | Leave/delete conversation |
| GET | `/conversations/:id/messages` | Messages (cursor-paginated, newest first) |
| POST | `/conversations/:id/messages` | Send message (non-streaming, requires `Idempotency-Key`) |
| GET | `/conversations/:id/members` | List members |
| POST | `/conversations/:id/members` | Add member |
| DELETE | `/conversations/:id/members/:user_id` | Remove member |

#### Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List user's agents |
| POST | `/agents` | Create agent |
| GET | `/agents/:id` | Agent details |
| PATCH | `/agents/:id` | Update agent config |
| DELETE | `/agents/:id` | Delete agent |
| POST | `/agents/:id/conversation` | Start/resume conversation with agent (idempotent by `(user_id, agent_id, key)`) |

#### Pages

| Method | Path | Description |
|--------|------|-------------|
| GET | `/pages` | List user's pages |
| POST | `/pages` | Create page |
| GET | `/pages/:id` | Page details |
| PATCH | `/pages/:id` | Update page metadata |
| POST | `/pages/:id/deploy` | Deploy page to raccoon.page (requires `Idempotency-Key`) |
| POST | `/pages/:id/fork` | Fork page (requires `Idempotency-Key`) |
| GET | `/pages/:id/versions` | Version history |

#### Bridges

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bridges` | List user's bridge connections |
| POST | `/bridges/telegram/connect` | Initiate Telegram bridge (idempotent upsert by `(user_id, platform, method)`) |
| POST | `/bridges/whatsapp/connect` | Initiate WhatsApp bridge (idempotent upsert by `(user_id, platform, method)`) |
| DELETE | `/bridges/:id` | Disconnect bridge |
| GET | `/bridges/:id/status` | Connection status |

#### Feed

| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed` | Personalized feed (cursor-paginated) |
| GET | `/feed/trending` | Trending items |
| GET | `/feed/new` | Newest items |
| POST | `/feed/:id/like` | Like item (idempotent) |
| DELETE | `/feed/:id/like` | Unlike item |
| POST | `/feed/:id/fork` | Fork item (requires `Idempotency-Key`) |

#### Marketplace

| Method | Path | Description |
|--------|------|-------------|
| GET | `/marketplace` | Browse agents |
| GET | `/marketplace/categories` | List categories |
| GET | `/marketplace/agents/:slug` | Agent profile |
| POST | `/marketplace/agents/:id/rate` | Rate agent |
| GET | `/marketplace/search?q=...` | Search agents |

### WebSocket Channels (Phoenix Channels)

Connection: `wss://api.open-raccoon.com/socket?token=<jwt>`

#### `conversation:{id}`

| Event (Client → Server) | Payload | Description |
|--------------------------|---------|-------------|
| `new_message` | `{content, type, metadata}` | Send message |
| `typing` | `{is_typing: true}` | Typing indicator |
| `read` | `{message_id}` | Mark as read |
| `react` | `{message_id, emoji}` | Add reaction |

| Event (Server → Client) | Payload | Description |
|--------------------------|---------|-------------|
| `new_message` | `{message}` | New message in conversation |
| `message_updated` | `{message}` | Message edited or deleted |
| `typing` | `{user_id, is_typing}` | User typing |
| `presence_state` | `{users}` | Current online users |
| `presence_diff` | `{joins, leaves}` | Presence changes |

#### `agent:{conversation_id}`

| Event (Client → Server) | Payload | Description |
|--------------------------|---------|-------------|
| `approval_decision` | `{request_id, decision, scope}` | Approve/deny tool call (`decision=approve|deny`) |

| Event (Server → Client) | Payload | Description |
|--------------------------|---------|-------------|
| `token` | `{text}` | Streaming AI response token |
| `status` | `{message}` | Agent status message ("brewing your page...") |
| `approval_requested` | `{request_id, tool, args_preview, scopes}` | Tool approval required |
| `approval_granted` | `{request_id, scope}` | Tool approval granted |
| `approval_denied` | `{request_id, reason_code}` | Tool approval denied |
| `approval_revoked` | `{tool, scope}` | Remembered approval revoked |
| `tool_call` | `{tool, args}` | Tool being invoked |
| `tool_result` | `{tool, result}` | Tool result |
| `code_block` | `{language, code}` | Generated code block |
| `complete` | `{message}` | Response complete |
| `error` | `{message}` | Error occurred |

Approval request example:
```json
{
  "event": "approval_requested",
  "payload": {
    "request_id": "apr_01H...",
    "tool": "web_search",
    "args_preview": {"query": "latest postgres jsonb index guidance"},
    "scopes": ["allow_once", "allow_for_session", "always_for_agent_tool"]
  }
}
```

#### `user:{id}`

| Event (Server → Client) | Payload | Description |
|--------------------------|---------|-------------|
| `notification` | `{type, data}` | Push notification |
| `bridge_status` | `{bridge_id, status}` | Bridge connection change |
| `conversation_updated` | `{conversation}` | New message in any conversation (for badge counts) |

### Webhook Endpoints (Bridges)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/telegram` | Incoming Telegram Bot API updates |
| POST | `/webhooks/whatsapp` | Incoming WhatsApp Cloud API messages |
| GET | `/webhooks/whatsapp` | WhatsApp webhook verification (challenge) |

Webhook security: Verify signature header per platform specification.
Webhook processing:
- Webhooks **MUST** be idempotent by upstream event id.
- Replay window validation **MUST** be enforced for signed timestamps.
- Out-of-order events **SHOULD** be buffered briefly and reordered per conversation when sequence metadata exists.

### API Conventions

- **Versioning**: URL prefix `/api/v1`
- **Rate limits**: Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

#### Pagination (Normative)

- Cursor pagination is default for dynamic collections:
  - `/conversations`
  - `/conversations/:id/messages`
  - `/feed`, `/feed/trending`, `/feed/new`
  - `/agents`, `/pages`, `/bridges`
- Offset pagination is allowed only for stable catalog endpoints (e.g., `/marketplace/categories`).
- Cursor request shape: `?cursor=<opaque>&limit=50`.

Standard list response envelope:

```json
{
  "items": [],
  "page_info": {
    "next_cursor": "opaque_cursor_or_null",
    "has_more": true
  }
}
```

#### Idempotency (Normative)

- The following writes **MUST** require `Idempotency-Key` header:
  - `POST /conversations/:id/messages`
  - `POST /pages/:id/deploy`
  - `POST /pages/:id/fork`
  - `POST /feed/:id/fork`
- Repeated requests with same key and equivalent payload **MUST** return the same semantic result.
- Idempotency retention window: **24 hours** minimum.
- Delivery model is **at-least-once** with deduplication via idempotency keys and event ids.
- Bridge connect endpoints **MUST** upsert and return existing `bridge_connection.id` when connection already exists.

Example request:

```http
POST /api/v1/conversations/conv_123/messages
Authorization: Bearer <jwt>
Idempotency-Key: 4f137f52-7bcb-47c5-a145-2bdfbaad5cb9
Content-Type: application/json
```

#### Error Contract

Error body:

```json
{
  "error": {
    "code": "tool_permission_denied",
    "message": "Tool execution was denied by user policy",
    "details": {
      "tool": "web_search"
    }
  }
}
```

Stable error codes include:
- `not_found`
- `validation_failed`
- `rate_limited`
- `idempotency_conflict`
- `tool_permission_denied`
- `bridge_not_connected`
- `deadline_exceeded`

#### Deploy Consistency

- `POST /pages/:id/deploy` **MUST** serialize per `page_id` and produce strictly increasing version numbers.
- If concurrent deploy requests race, one request **MAY** wait or return a deterministic conflict (`idempotency_conflict`) based on key semantics.
- Response payload **MUST** include `page_id`, `version`, and immutable deployment artifact path.

---

## 8. Security Model

### E2E Encryption (Human-to-Human)

**Protocol**: Signal Protocol

| Component | Implementation |
|-----------|---------------|
| Key exchange | X3DH (Extended Triple Diffie-Hellman) |
| Ratchet | Double Ratchet Algorithm |
| Group encryption | Sender Keys |
| Library | libsignal (via Swift bindings on client) |

**Key management**:
- Each device generates an identity key pair, signed pre-key, and one-time pre-keys
- Pre-keys uploaded to server on registration
- Server stores only public keys (never private)
- Session established on first message

**Implications**:
- Server cannot read E2E encrypted messages
- Message search unavailable for E2E conversations (search is client-side only)
- Backup encryption: Client-side encrypted backups with user-provided passphrase

### Encryption Levels by Conversation Type

| Type | Encryption | Why |
|------|-----------|-----|
| Human 1:1 | E2E (Signal Protocol) | Maximum privacy |
| Human group | E2E (Sender Keys) | Maximum privacy |
| Agent conversation | Server-side (TLS) | Agent needs to read messages to respond |
| Bridge conversation | Server-side (TLS) | External platform already sees content |

**UI Indicator**: Lock icon on E2E conversations. "Not encrypted" label on agent/bridge conversations.

### E2B Sandbox Isolation

| Security Layer | Implementation |
|----------------|---------------|
| VM isolation | Firecracker microVM — hardware-level isolation per sandbox |
| Network | Configurable network access. Default: outbound allowed, no inbound. |
| File system | Isolated per sandbox. No access to host or other sandboxes. |
| Resources | Configurable CPU (up to 8 vCPU), memory (up to 8GB), timeout (max 24h) |
| No persistence | Sandboxes are ephemeral by default. State lost on termination. |

### Bridge Data Privacy

- **Credentials**: Encrypted with AES-256-GCM before storage using envelope encryption (DEK per connection, KEK from KMS/server HSM).
- **Session tokens**: Telethon `.session` files and Baileys auth state stored encrypted.
- **Message routing**: Bridge messages stored server-side (they transit through external platforms anyway).
- **Data deletion**: Deleting a bridge connection deletes all stored credentials and sessions.
- **Key rotation**: KEK rotation every 90 days. DEKs re-wrapped asynchronously.
- **Password changes**: Do not require decrypting all bridge credentials; envelope model avoids global re-encryption coupling.

### GDPR Compliance

| Right | Implementation |
|-------|---------------|
| Right to be forgotten | Account deletion removes all user data, messages, agents, pages. 30-day grace period. |
| Data export | Export all user data as JSON archive (conversations, agent configs, pages) |
| Consent | Explicit consent for bridge connections (accessing external platform data) |
| Data residency | Self-hosted users control data location. Hosted version: EU and US regions available. |
| Bridge transcript deletion | Removal request deletes stored mirrored copies and queue artifacts within 30 days. |
| Agent tool/audit export | User can export approval and tool invocation audit logs linked to their account. |

### Authentication Security

| Feature | Implementation |
|---------|---------------|
| Password hashing | Argon2id |
| JWT tokens | Short-lived access tokens (15min) + long-lived refresh tokens (30 days) |
| Passkeys | WebAuthn/FIDO2 via `webauthn_components` |
| OAuth | PKCE flow for all OAuth providers |
| Rate limiting | 5 failed login attempts → 15min lockout per IP |

Session controls (normative):
- Refresh tokens **MUST** be rotatable and revocable per device/session.
- User logout from one device **MUST NOT** invalidate unrelated active sessions unless "log out all devices" is selected.
- Security-sensitive changes (password reset, suspicious activity) **MUST** support forced global token revocation.

### Access Control

| Level | Description |
|-------|-------------|
| Conversation owner | Full control: delete conversation, manage members, change settings |
| Conversation admin | Manage members, pin messages |
| Conversation member | Send/read messages, react |
| Agent creator | Configure agent, view usage, manage visibility |
| Agent user | Converse with agent, rate, report |

#### Endpoint Authorization Matrix (Normative)

| Endpoint | Required Role/Condition |
|----------|-------------------------|
| `POST /agents/:id/conversation` | Authenticated user + agent visibility permits usage |
| `PATCH /agents/:id` | Agent creator or platform admin |
| `POST /bridges/*/connect` | Authenticated owner of connection |
| `DELETE /bridges/:id` | Bridge connection owner or admin |
| `POST /feed/:id/fork` | Authenticated user with read access to reference item |
| `POST /pages/:id/deploy` | Page creator or collaborator with deploy permission |
| `POST /conversations/:id/members` | Conversation owner/admin |

Authorization requirements:
- Every protected endpoint **MUST** enforce both authentication and resource-level authorization.
- Permission checks **MUST** occur before side effects (message publish, tool execution, bridge callout).
- Denials **MUST** return stable code `forbidden`.

### Agent + MCP Threat Controls

- Tool calls **MUST** run with least-privilege credentials and scoped access tokens.
- Prompt/tool injection defenses **MUST** include:
  - argument schema validation before execution
  - allowlist of callable tools per agent
  - redaction of high-risk secrets from tool outputs before model re-ingestion
- Custom MCP servers **MUST** be explicitly trusted per user and may be disabled by admin policy.
- High-risk tool categories (shell/network/file write outside sandbox) **MUST** require explicit approval even if broad scope exists.
- All tool calls **MUST** emit audit entries suitable for incident response.

### Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 5 req/min per IP |
| Message sending | 30 msg/s per user |
| API general | 100 req/min per user |
| Agent execution | 10 concurrent per user |
| Bridge operations | 5 req/min per bridge |
| File upload | 20 req/min per user |

Implementation: Hammer library with Redis backend for distributed rate limiting.

---

## 9. Feed Quality System

### Quality Scoring Pipeline

Every feed item goes through a quality evaluation pipeline before appearing in the feed.

```
New feed item submitted
       │
       ▼
1. Near-duplicate detection (pgvector cosine similarity > 0.92 = duplicate)
       │
       ▼
2. Rate limit check (max 5 submissions per author per day)
       │
       ▼
3. LLM quality evaluation (Claude Haiku — fast, cheap)
       │
       ▼
4. Quality score assigned (0.0 - 1.0)
       │
       ▼
5. Items with score < 0.3 are hidden from feed
       │
       ▼
6. Trending score calculated from engagement velocity
```

### LLM Quality Evaluator

An LLM (Claude Haiku for speed/cost) evaluates each submission:

**Evaluation prompt** (simplified):
```
Rate this AI agent creation on a scale of 0.0 to 1.0 across these dimensions:
- Originality (0-1): Is this novel or a common template?
- Polish (0-1): Is it well-crafted or rough/incomplete?
- Usefulness (0-1): Would someone find this valuable?
- Effort (0-1): Does this show meaningful work or is it low-effort?

Return a JSON object with individual scores and a weighted overall score.
```

**Weights**: Originality (0.3) + Polish (0.25) + Usefulness (0.25) + Effort (0.2)

### Near-Duplicate Detection

Using pgvector embeddings (1536-dim, OpenAI `text-embedding-3-small`):

1. Generate embedding for new item's title + description
2. Query: `SELECT id FROM feed_items WHERE embedding <=> $1 < 0.08 LIMIT 1`
3. If match found → reject as duplicate

### Anti-AI-Slop Mechanisms

| Mechanism | Implementation |
|-----------|---------------|
| Rate limiting | Max 5 feed submissions per author per 24 hours |
| Quality threshold | Items scoring < 0.3 never appear in feed |
| Near-duplicate detection | pgvector cosine similarity check |
| Community signals | Reports from users flag items for review |
| Engagement velocity | Items with high views but low engagement (bounce) get demoted |

### Trending Algorithm

```
trending_score = (likes * 3 + forks * 5 + views * 0.1) / (hours_since_creation + 2)^1.5
```

- **Gravity factor** (`^1.5`): Older items decay in trending
- **Fork weight** (`*5`): Forks signal high value
- **Like weight** (`*3`): Likes signal appreciation
- **View weight** (`*0.1`): Views alone don't drive trending (prevents slop)
- **Recalculated**: Every 15 minutes via Oban scheduled job

### Feed Ranking Formula (For You)

```
final_score = (
    quality_score * 0.3 +
    trending_score_normalized * 0.2 +
    recency_score * 0.2 +
    relevance_score * 0.2 +    # based on user's interests/follows
    diversity_penalty * 0.1     # penalize same author/type in sequence
)
```

---

## 10. Viral Growth Mechanics

### Shareable URLs

Every creation in Open Raccoon generates a shareable URL:

| Content | URL Pattern | Example |
|---------|------------|---------|
| Pages | `raccoon.page/{user}/{slug}` | `raccoon.page/alice/portfolio` |
| Agents | `open-raccoon.com/agents/{slug}` | `open-raccoon.com/agents/code-raccoon` |
| Feed items | `open-raccoon.com/feed/{id}` | `open-raccoon.com/feed/abc123` |
| Shared conversations | `open-raccoon.com/share/{id}` | `open-raccoon.com/share/xyz789` |

All public pages and agent profiles are accessible without login. Rich Open Graph meta tags for social media previews.

### "Made with Open Raccoon" Attribution

Every deployed page includes a subtle footer badge:

```html
<a href="https://open-raccoon.com" style="...">
  Made with 🦝 Open Raccoon
</a>
```

- Minimal, non-intrusive, matches page design
- Links back to Open Raccoon homepage
- Removable on premium plans

### Remix/Fork Chains

```
Original page by Alice
    └── Forked by Bob (added dark mode)
        └── Forked by Charlie (added animations)
            └── Forked by Dave (customized for his startup)
```

- Each fork maintains attribution chain
- Original creator gets credit/notification on forks
- Fork chains visible on page profile
- Creates network effects: more forks → more visibility → more users

### Bridge as Distribution

```
1. User connects Open Raccoon to Telegram group
2. User invokes AI agent in Open Raccoon
3. Agent response appears in Telegram group via bridge
4. Telegram group members see impressive AI response
5. "What is this? How did you do that?"
6. Curiosity drives them to Open Raccoon
```

The bridge turns every external group into a potential acquisition channel.

### Content-Led Growth Flywheel

```
User creates page via AI → Page deployed to raccoon.page →
Page shared on social media → Viewers see "Made with Open Raccoon" →
Viewers sign up → Create their own pages → Share → ...
```

### Developer Community Growth

| Channel | Mechanism |
|---------|-----------|
| Open source | AGPLv3 attracts contributors who become users |
| MCP ecosystem | Developers build tools → agents use tools → users benefit → more developers |
| Agent marketplace | Developers publish agents → users discover → revenue share → more developers |
| Hackathons | Sponsored hackathons with prizes for best agents/pages |
| Documentation | Excellent docs lower barrier to contribution |

### Growth Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Activation** | First AI conversation or page created | Within first session |
| **Retention** | Active conversations in past 7 days | 40%+ week-1 retention |
| **Referral** | Shared pages that lead to signups | 10%+ conversion on shared pages |
| **Bridge connections** | Users who connect external platforms | 30%+ of active users |
| **Pages deployed** | Pages deployed to raccoon.page per week | Growing week-over-week |
| **Agent marketplace installs** | Agent "Try" clicks per week | Growing |

---

## 11. Open Source Strategy

### License: AGPLv3

**Why AGPLv3?**
- Requires source disclosure for network use (unlike MIT/Apache)
- Prevents cloud providers from offering Open Raccoon as a service without contributing back
- Proven model: Grafana, Mattermost, Rocket.Chat all use AGPL or similar
- Doesn't restrict self-hosting for private use

### Open Core Model

| Feature | Self-Hosted (Free) | Hosted (Paid) |
|---------|-------------------|---------------|
| All messaging features | Yes | Yes |
| AI agent chat | Yes (BYOK required) | Yes (platform credits included) |
| Page creation & deployment | Yes (self-hosted URLs) | Yes (raccoon.page URLs) |
| Bridge connections | Yes (user manages) | Yes (managed by platform) |
| Feed & marketplace | Yes | Yes |
| E2E encryption | Yes | Yes |
| Custom domains for pages | Yes (user configures) | Yes (one-click) |
| SSO (SAML/OIDC) | No | Enterprise plan |
| Advanced analytics | No | Pro plan |
| Priority LLM access | No | Pro plan |
| SLA & support | Community only | Pro/Enterprise |
| Team/org management | Basic | Advanced |
| Managed bridge credentials | No | Yes |
| Higher agent execution limits | Configurable | Higher defaults |

### Suggested Pricing (Hosted)

| Plan | Price | Includes |
|------|-------|----------|
| **Free** | $0/mo | 5 agent conversations/day, 3 page deploys, 1 bridge connection |
| **Pro** | $12/user/mo | Unlimited agents, unlimited pages, 5 bridge connections, custom domains, 100K tokens/mo |
| **Team** | $20/user/mo | Everything in Pro + team workspaces, SSO, admin controls, priority support |
| **Enterprise** | Custom | Everything in Team + SLA, dedicated support, on-prem deployment, custom integrations |

### Self-Hosting Guide

#### Docker Compose (Simple)

```yaml
# docker-compose.yml
services:
  raccoon:
    image: ghcr.io/open-raccoon/open-raccoon:latest
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgres://raccoon:raccoon@db:5432/raccoon
      REDIS_URL: redis://redis:6379
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
      R2_BUCKET_URL: ${R2_BUCKET_URL}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
    depends_on:
      - db
      - redis

  agent-runtime:
    image: ghcr.io/open-raccoon/agent-runtime:latest
    environment:
      GRPC_PORT: 50051
      E2B_API_KEY: ${E2B_API_KEY}
    depends_on:
      - raccoon

  db:
    image: pgvector/pgvector:pg16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: raccoon
      POSTGRES_PASSWORD: raccoon
      POSTGRES_DB: raccoon

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

#### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB | 100+ GB |
| PostgreSQL | 14+ | 16+ (with pgvector) |
| Redis | 6+ | 7+ |

### Community Contribution Model

- **Code contributions**: Fork → branch → PR → review → merge
- **Agent contributions**: Publish to marketplace with AGPLv3 compatible license
- **MCP tool contributions**: Publish to community tool registry
- **Documentation**: Docs site accepts PRs
- **Translations**: Community-driven i18n
- **Bug reports**: GitHub Issues with templates
- **Discussions**: GitHub Discussions for feature requests and questions
- **CLA**: Required for dual licensing. Use CLA Assistant (GitHub App) to automate. Contributors grant Open Raccoon a perpetual, non-exclusive license while retaining their own copyright. This enables offering commercial licenses to enterprises who need to embed the code in proprietary products.

### Governance

- **Benevolent dictator**: Project founder makes final decisions
- **Core team**: 3-5 maintainers with merge access
- **Community maintainers**: Domain-specific maintainers (bridges, agents, feed)
- **RFC process**: Major features require an RFC (Request for Comments) before implementation

---

## 12. Implementation Roadmap

### Approach: Parallel Workstreams

Not a phased MVP — build everything in parallel, ship when each workstream reaches usable quality.

Release policy (normative):
- This project uses a single full-scope implementation wave.
- Release is blocked until all core flows pass the full test matrix (functional + reliability + security + accessibility).

### Team Allocation (4+ developers)

| Developer | Primary Workstream | Secondary |
|-----------|-------------------|-----------|
| Dev 1 (Backend Lead) | Elixir umbrella, chat service, WebSocket channels | Database schema, deployment |
| Dev 2 (Frontend Lead) | SwiftUI macOS + iOS app, navigation, chat UI | Design system implementation |
| Dev 3 (AI/Agent) | Python sidecar, gRPC, LLM orchestration, E2B, MCP | Feed quality system |
| Dev 4 (Full Stack) | Bridges (Telegram + WhatsApp), page deployment | API endpoints, marketplace |

### Workstream Dependencies

```
Week 1-4: Foundation
├── Elixir umbrella project setup
├── PostgreSQL schema + migrations
├── SwiftUI app scaffold (macOS + iOS)
├── Python sidecar scaffold + gRPC proto
├── Auth system (email + password + JWT)
└── Basic WebSocket channel connection

Week 5-8: Core Messaging
├── Message CRUD + real-time delivery
├── Conversation list + chat UI
├── Typing indicators + presence
├── Media upload (R2) + display
└── Message reactions + replies

Week 9-12: AI Agents
├── Agent CRUD + configuration UI
├── LLM streaming via gRPC
├── Agent status messages (fun/cool)
├── E2B sandbox integration
├── MCP tool integration
├── Workspace panel (preview + files + terminal)
└── BYOK key management

Week 13-16: Bridges + Pages
├── Telegram bridge (Telethon)
├── WhatsApp bridge (Baileys)
├── Message normalization
├── Page generation via agent
├── Page deployment to R2 + CDN
├── raccoon.page URL routing
└── Version history + forking

Week 17-20: Feed + Marketplace
├── Feed item submission pipeline
├── Quality scoring (LLM + embeddings)
├── Near-duplicate detection
├── Trending algorithm
├── Feed UI (grid/cards)
├── Marketplace browse + search
├── Agent ratings + reviews
└── Follow system

Week 21-24: Polish + Launch
├── E2E encryption (Signal Protocol)
├── Push notifications (APNs)
├── Offline support + sync
├── OAuth (Google, Apple, GitHub)
├── Passkey support
├── Performance optimization
├── Security audit
├── Self-hosting documentation
└── Public launch
```

### Mandatory Integration Gates (Normative)

Even in parallel delivery, the following gates are required:

1. **Schema/API Contract Freeze Gate (end of Week 8)**
   - DB constraints, endpoint payloads, idempotency, and pagination envelope frozen.
   - Breaking changes require architecture sign-off.
2. **Authorization + Approval Gate (end of Week 12)**
   - Endpoint authorization matrix enforced in code.
   - Inline approval flow with remembered scopes functional.
3. **Runtime Reliability Gate (end of Week 16)**
   - Deadlines, cancellation propagation, retry/backoff, and queue backpressure validated.
4. **Cross-Platform UX + Accessibility Gate (end of Week 20)**
   - Conversation ordering precedence, status precedence, and live-region announcements verified on macOS + iOS.
5. **Release Gate (Week 24)**
   - All core E2E scenarios pass.
   - Load and chaos tests meet SLO.
   - Security review closes all high/critical findings.

### Critical Path

```
Auth → WebSocket → Messages → Agent Chat → Everything else
```

Without auth and real-time messaging working, nothing else can be built.

### Infrastructure Costs (Estimated)

| Stage | Users | Monthly Cost |
|-------|-------|-------------|
| Development | 10 (team) | ~$50 (Fly.io hobby, R2 free tier) |
| Alpha | 100 | ~$150 (Fly.io, managed Postgres, Redis) |
| Beta | 1,000 | ~$500 (larger Fly machines, E2B usage) |
| Launch | 10,000 | ~$2,000 (multi-region, higher E2B, LLM costs) |
| Growth | 100,000 | ~$15,000 (dedicated Postgres, Redis cluster, CDN) |
| Scale | 1,000,000 | ~$80,000+ (multi-region cluster, dedicated infra) |

**Largest cost driver at scale**: LLM API costs (for platform-credit users). Mitigated by BYOK adoption and caching.

---

## 13. Edge Cases & Challenges

### External Platform Rate Limits

| Platform | Limit | Mitigation |
|----------|-------|------------|
| Telegram Bot API | Adaptive throttling with `retry_after`; 30 msg/s global and 1 msg/3s per chat used as planning baseline | Queue with per-chat throttling, always honor `retry_after`, exponential backoff on 429 |
| Telegram MTProto | Dynamic flood wait | Respect `retry_after`, session rotation |
| WhatsApp Cloud API | 80 msg/s (business), template limits | Message queue with rate limiter, template pre-approval |
| WhatsApp Baileys | Unofficial — aggressive rate limiting | Conservative sending (1 msg/5s per chat), session persistence |

### Agent Cost Management

| Challenge | Solution |
|-----------|----------|
| Runaway token usage | Hard spending limits per account/agent. Kill streaming on limit hit. |
| Expensive models | Default to cost-efficient models (Sonnet). Opus as opt-in premium. |
| Sandbox abuse | Time limits (5min default), CPU/memory limits, network egress limits |
| BYOK key security | Keys stored on device only, never transmitted to server |

### Message Format Translation Matrix

| Source → Target | Text | Images | Video | Voice | Stickers | Files | Reactions |
|-----------------|------|--------|-------|-------|----------|-------|-----------|
| Open Raccoon → Telegram | Direct | Re-upload | Re-upload | Direct (OGG) | WebP | Re-upload | ❌ (not supported via Bot API) |
| Telegram → Open Raccoon | Direct | Download + R2 | Download + R2 | Direct | Convert TGS → WebP | Download + R2 | ✅ |
| Open Raccoon → WhatsApp | Direct | Re-upload (max 16MB) | Re-upload (MP4 only) | Direct (OGG) | ❌ | Re-upload (max 100MB) | ✅ |
| WhatsApp → Open Raccoon | Direct | Download + R2 | Download + R2 | Direct | ❌ | Download + R2 | ✅ |

### Bridge Connection Reliability

| Issue | Solution |
|-------|----------|
| Session expiry | Auto-reconnect with stored session. Notify user if re-auth needed. |
| Network interruption | Exponential backoff reconnection (1s → 2s → 5s → 10s → 10s) |
| Account ban (Baileys) | Warn users about unofficial API risks. Offer Cloud API alternative. |
| Message delivery failure | Retry queue (3 attempts, then mark as failed with error message) |
| Out-of-order messages | Sequence numbers per conversation, reorder on client |

### Agent-First Runtime and UX Edge Cases (Normative)

| Scenario | Backend Behavior | UX Behavior |
|----------|------------------|-------------|
| Duplicate message submit (retry or reconnect) | Deduplicate by `Idempotency-Key`; return same semantic result | Show single message bubble, no duplicates |
| Tool approval revoked during run | Stop future tool calls immediately, emit `approval_revoked`, fail pending tool action with `tool_permission_denied` | Inline error chip + "Resume with approval" action |
| gRPC deadline exceeded mid-stream | Cancel downstream MCP/sandbox operations; persist terminal error event | Show recoverable failure state with Retry |
| Bridge reconnect storm | Rate-limit reconnect attempts and isolate queue per bridge | Keep conversation stable; show reconnect badge without reordering noise |
| Concurrent page deploy requests | Serialize per page row lock; enforce monotonic versions | Display one successful deploy version; others wait or return deterministic conflict |
| Feed like/fork retried | Idempotent like/upsert semantics; dedupe fork by idempotency key | Counters update once, no double increments |
| Out-of-order bridge webhooks | Reorder by sequence/timestamp window; preserve original event ids | Render in correct order with subtle "delayed sync" indicator when needed |
| Session revoked while active | Immediately block privileged calls and streaming turns requiring auth | Show "session expired" banner with re-auth action |
| Accessibility for dynamic statuses | Emit machine-readable state events for live-region text | Screen reader announces thinking/deploying/retrying/errors |

### Feed Quality vs Quantity

| Challenge | Solution |
|-----------|----------|
| Not enough content (early days) | Lower quality threshold initially. Seed with team-created content. |
| Too much low-quality content | Strict quality scoring. Rate limits per author. Community reporting. |
| Gaming the algorithm | Multi-signal ranking (not just likes). LLM-based quality check. |
| Bias in LLM quality evaluator | Regular evaluation of quality scores. Community feedback loop. |

### Scaling from 0 to Millions

| Scale | Architecture Change Needed |
|-------|---------------------------|
| 0-10K users | Single Fly.io machine per service. Single Postgres. |
| 10K-100K | Multi-machine Elixir cluster. Read replicas for Postgres. Redis cluster. |
| 100K-1M | Multi-region deployment. Message table partitioning critical. CDN for all media. |
| 1M+ | Consider dedicated Postgres instances per service. Evaluate ScyllaDB for message storage (Discord's path). Dedicated bridge worker fleet. |

### E2E Encryption + Search

| Challenge | Solution |
|-----------|----------|
| Server can't search E2E messages | Client-side search index (encrypted, stored locally) |
| E2E + multi-device | Signal Protocol handles multi-device via separate sessions per device |
| E2E + message history on new device | Encrypted backup + restore. No server-side history for E2E conversations. |

### Offline Support

| Feature | Approach |
|---------|----------|
| Message queue | Client queues messages locally, sends when online |
| Optimistic UI | Show sent messages immediately with "pending" indicator |
| Sync on reconnect | Client sends last known message ID, server sends delta |
| Conflict resolution | Server timestamp is authoritative. Last-write-wins for edits. |

---

## Appendix A: Agent Status Message Bank

### Thinking
- "contemplating the void..."
- "asking the rubber duck..."
- "consulting the raccoon council..."
- "thinking raccoon thoughts..."
- "processing at the speed of thought..."
- "one moment, having an existential crisis..."
- "buffering genius..."

### Reading Code
- "reading your spaghetti code..."
- "parsing the chaos..."
- "judging your variable names..."
- "untangling the dependency graph..."
- "deciphering ancient commit messages..."
- "finding where the bug lives..."

### Generating
- "brewing your landing page..."
- "assembling pixels..."
- "summoning components..."
- "crafting something beautiful..."
- "weaving HTML with care..."
- "painting with CSS..."

### Searching
- "digging through the internet..."
- "raiding the knowledge base..."
- "foraging for answers..."
- "asking the hive mind..."
- "consulting the archives..."

### Deploying
- "shipping it..."
- "releasing into the wild..."
- "launching to the moon..."
- "pushing pixels to production..."
- "making it live..."

### Coding
- "writing code at 3am energy..."
- "refactoring reality..."
- "debugging the matrix..."
- "compiling thoughts..."
- "stack overflowing gracefully..."
- "git committing to the cause..."

---

## Appendix B: Environment Variables

```bash
# Required
DATABASE_URL=postgres://user:pass@host:5432/raccoon
REDIS_URL=redis://host:6379
SECRET_KEY_BASE=<64-char-hex-string>
KMS_KEY_ID=<kms-master-key-id>
ENCRYPTION_KEY_VERSION=v1

# Object Storage (Cloudflare R2)
R2_BUCKET_URL=https://bucket.r2.cloudflarestorage.com
R2_ACCESS_KEY=<key>
R2_SECRET_KEY=<secret>
R2_BUCKET_NAME=raccoon-media

# Agent Runtime
AGENT_GRPC_HOST=localhost
AGENT_GRPC_PORT=50051
E2B_API_KEY=e2b_***

# LLM (for platform credits mode)
ANTHROPIC_API_KEY=sk-ant-***
OPENAI_API_KEY=sk-***

# Auth
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
APPLE_CLIENT_ID=***
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***

# Bridges (optional, for managed bridges)
TELEGRAM_BOT_TOKEN=***

# Deployment
PHX_HOST=open-raccoon.com
PORT=4000
MIX_ENV=prod
```

---

*This specification is a living document. It will evolve as implementation reveals new requirements and the community provides feedback.*

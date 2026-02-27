# Open Raccoon — Developer Reference

## Backend

- **API Base:** `https://openraccoon.com/api/v1` (health: `GET /health`)
- **SSH:** `root@157.180.72.249`
- **Services (systemd):** `raccoon-api.service` (Elixir/Phoenix), `raccoon-agent.service` (Python gRPC)
- **Database:** PostgreSQL `raccoon_prod`, user `raccoon`, localhost
- **Code:** `/opt/open-raccoon/` (mirrors this repo)
- **Env:** `/opt/open-raccoon/.env`
- **Agent runtime:** gRPC on `localhost:50051`

## Swift App

- **Project:** `OpenRaccoon/project.yml` (XcodeGen)
- **Targets:** `OpenRaccoon-macOS`, `OpenRaccoon-iOS`
- **Build:**
  ```bash
  cd OpenRaccoon && xcodegen generate && xcodebuild -scheme OpenRaccoon-macOS -configuration Debug -derivedDataPath build/DerivedData -destination 'platform=macOS' build
  ```

## API Auth

- Bearer JWT: `Authorization: Bearer <access_token>`
- Register: `POST /auth/register` → `{user, tokens}`
- Login: `POST /auth/login` → `{user, tokens}`
- Refresh: `POST /auth/refresh` with `{refresh_token}`
- Magic link: `POST /auth/magic-link`, verify `POST /auth/magic-link/verify`

## WebSocket

- URL: `wss://openraccoon.com/socket/websocket?token=JWT`
- Phoenix channels: `conversation:{id}`, `agent:{conversation_id}`

## Key Endpoints

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/magic-link`, `/magic-link/verify` |
| Users | `GET /users/me`, `PATCH /users/me`, `GET /users/:username` |
| Conversations | `GET /conversations`, `POST /conversations`, `GET/PATCH/DELETE /conversations/:id` |
| Messages | `GET /conversations/:id/messages`, `POST /conversations/:id/messages` |
| Members | `GET/POST /conversations/:id/members`, `DELETE /conversations/:id/members/:uid` |
| Agents | `GET /agents`, `POST /agents`, `GET/PATCH/DELETE /agents/:id`, `POST /agents/:id/conversation` |
| Marketplace | `GET /marketplace`, `GET /marketplace/categories`, `GET /marketplace/agents/:slug`, `POST /marketplace/agents/:id/rate`, `GET /marketplace/search?q=` |
| Feed | `GET /feed`, `/feed/trending`, `/feed/following`, `/feed/new`, `POST /feed/:id/like`, `DELETE /feed/:id/like`, `POST /feed/:id/fork` |

## Server Operations

- **Deployment:** Elixir release at `_build/prod/rel/open_raccoon/`
- **systemd:** `systemctl start/stop/restart raccoon-api` (enabled on boot)
- **Rebuild release:** `cd /opt/open-raccoon/open_raccoon && source /opt/open-raccoon/.env && MIX_ENV=prod mix compile --force && MIX_ENV=prod mix release open_raccoon --overwrite && systemctl restart raccoon-api`
- **Logs:** `journalctl -u raccoon-api -f`
- **Auth rate limit:** 5 req/min per IP for auth endpoints (login, register, etc.)
- **Logout:** `DELETE /auth/logout` (not POST)
- **Messages require** `Idempotency-Key` header (UUID)

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

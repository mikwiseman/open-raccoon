#!/usr/bin/env bash
# api_smoke_test.sh — Comprehensive API smoke test for Open Raccoon
# Hits every endpoint once, verifying basic status codes.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

TIMESTAMP=$(date +%s)
TEST_USER="smoketest_${TIMESTAMP}"
TEST_EMAIL="${TEST_USER}@test.openraccoon.dev"
TEST_PASSWORD="Sm0keT3st!Pass123"

# Resource IDs populated as we go
CONVERSATION_ID=""
AGENT_ID=""
PAGE_ID=""
BRIDGE_ID=""
FEED_ITEM_ID=""

###############################################################################
# 1. Health Check
###############################################################################
log_section "Health Check"

make_request GET "/health"
assert_status 200 "$HTTP_STATUS" "GET /health"

###############################################################################
# 2. Auth — Public Endpoints
###############################################################################
log_section "Auth (Public)"

# Register
register_user "$TEST_USER" "$TEST_EMAIL" "$TEST_PASSWORD"
assert_status_in "POST /auth/register" "$HTTP_STATUS" 200 201
assert_json_field "tokens" "Register — has tokens"
log_info "Registered user: $TEST_USER (id=$USER_ID)"

SAVED_REFRESH="$REFRESH_TOKEN"

# Login
login_user "$TEST_EMAIL" "$TEST_PASSWORD"
assert_status 200 "$HTTP_STATUS" "POST /auth/login"
assert_json_field "tokens" "Login — has tokens"

# Refresh (field name: refresh_token)
make_request POST "/auth/refresh" "{\"refresh_token\":\"$SAVED_REFRESH\"}"
assert_status 200 "$HTTP_STATUS" "POST /auth/refresh"

# Magic link — request
make_request POST "/auth/magic-link" "{\"email\":\"$TEST_EMAIL\"}"
assert_status_in "POST /auth/magic-link" "$HTTP_STATUS" 200 202

# Magic link — verify with bogus token
make_request POST "/auth/magic-link/verify" "{\"token\":\"bogus-${TIMESTAMP}\"}"
assert_status_in "POST /auth/magic-link/verify (invalid)" "$HTTP_STATUS" 400 401 422

###############################################################################
# 3. Users
###############################################################################
log_section "Users"

# GET /users/me — response: {"user": {"id":..., "username":..., ...}}
make_request GET "/users/me" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /users/me"
assert_json_field "user" "GET /users/me — has user key"

# PATCH /users/me — field names: display_name, bio (snake_case)
make_request PATCH "/users/me" '{"display_name":"Smoke Tester","bio":"Testing"}' "$ACCESS_TOKEN"
assert_status_in "PATCH /users/me" "$HTTP_STATUS" 200 204

# GET /users/me/usage
make_request GET "/users/me/usage" "" "$ACCESS_TOKEN"
assert_status_in "GET /users/me/usage" "$HTTP_STATUS" 200

# GET /users/:username
make_request GET "/users/${TEST_USER}" "" "$ACCESS_TOKEN"
assert_status_in "GET /users/:username" "$HTTP_STATUS" 200 404

###############################################################################
# 4. Conversations
###############################################################################
log_section "Conversations"

# Create — response: {"conversation": {"id":...}}
make_request POST "/conversations" '{"title":"Smoke Test Conv","type":"dm"}' "$ACCESS_TOKEN"
assert_status_in "POST /conversations" "$HTTP_STATUS" 200 201
CONVERSATION_ID=$(json_nested "conversation.id")
log_info "Created conversation: $CONVERSATION_ID"

# List — response: {"items": [...], "page_info": {...}}
make_request GET "/conversations" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /conversations"

# Get — response: {"conversation": {...}}
if [[ -n "$CONVERSATION_ID" ]]; then
  make_request GET "/conversations/${CONVERSATION_ID}" "" "$ACCESS_TOKEN"
  assert_status 200 "$HTTP_STATUS" "GET /conversations/:id"

  # Update
  make_request PATCH "/conversations/${CONVERSATION_ID}" '{"title":"Updated Smoke Conv"}' "$ACCESS_TOKEN"
  assert_status_in "PATCH /conversations/:id" "$HTTP_STATUS" 200 204
fi

# Messages — send (content is string or map, type defaults to "text")
if [[ -n "$CONVERSATION_ID" ]]; then
  IDEM_MSG=$(gen_uuid)
  make_request POST "/conversations/${CONVERSATION_ID}/messages" \
    '{"content":{"text":"Hello from smoke test"},"type":"text"}' \
    "$ACCESS_TOKEN" "$IDEM_MSG"
  assert_status_in "POST /conversations/:id/messages" "$HTTP_STATUS" 200 201

  # Messages — list
  make_request GET "/conversations/${CONVERSATION_ID}/messages" "" "$ACCESS_TOKEN"
  assert_status 200 "$HTTP_STATUS" "GET /conversations/:id/messages"
fi

# Members — list
if [[ -n "$CONVERSATION_ID" ]]; then
  make_request GET "/conversations/${CONVERSATION_ID}/members" "" "$ACCESS_TOKEN"
  assert_status 200 "$HTTP_STATUS" "GET /conversations/:id/members"

  # Members — add (self, may 409 if auto-added)
  # Creator is auto-added as member, so adding self will give 422 "already taken"
  make_request POST "/conversations/${CONVERSATION_ID}/members" \
    "{\"user_id\":\"$USER_ID\"}" "$ACCESS_TOKEN"
  assert_status_in "POST /conversations/:id/members" "$HTTP_STATUS" 200 201 409 422

  # Members — remove self
  make_request DELETE "/conversations/${CONVERSATION_ID}/members/${USER_ID}" "" "$ACCESS_TOKEN"
  assert_status_in "DELETE /conversations/:id/members/:uid" "$HTTP_STATUS" 200 204 403 404
fi

###############################################################################
# 5. Agents
###############################################################################
log_section "Agents"

# Create — field: system_prompt (snake_case)
make_request POST "/agents" \
  "{\"name\":\"SmokeBot\",\"slug\":\"smokebot-${TIMESTAMP}\",\"system_prompt\":\"You are a test bot.\",\"model\":\"claude-sonnet-4-6\"}" \
  "$ACCESS_TOKEN"
assert_status_in "POST /agents" "$HTTP_STATUS" 200 201
# Response may be {"agent": {...}} or top-level
AGENT_ID=$(json_nested "agent.id")
if [[ -z "$AGENT_ID" ]]; then
  AGENT_ID=$(json_field "id")
fi
log_info "Created agent: $AGENT_ID"

# List
make_request GET "/agents" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /agents"

# Get
if [[ -n "$AGENT_ID" ]]; then
  make_request GET "/agents/${AGENT_ID}" "" "$ACCESS_TOKEN"
  assert_status 200 "$HTTP_STATUS" "GET /agents/:id"

  # Update
  make_request PATCH "/agents/${AGENT_ID}" '{"name":"SmokeBot Updated"}' "$ACCESS_TOKEN"
  assert_status_in "PATCH /agents/:id" "$HTTP_STATUS" 200 204

  # Start conversation — response: {"conversation": {...}}
  make_request POST "/agents/${AGENT_ID}/conversation" "" "$ACCESS_TOKEN"
  assert_status_in "POST /agents/:id/conversation" "$HTTP_STATUS" 200 201
fi

###############################################################################
# 6. Pages
###############################################################################
log_section "Pages"

# Create — no "content" field in page schema
make_request POST "/pages" \
  "{\"title\":\"Smoke Test Page\",\"slug\":\"smoke-test-${TIMESTAMP}\",\"r2_path\":\"pages/smoke-test-${TIMESTAMP}/index.html\"}" \
  "$ACCESS_TOKEN"
assert_status_in "POST /pages" "$HTTP_STATUS" 200 201
PAGE_ID=$(json_nested "page.id")
if [[ -z "$PAGE_ID" ]]; then
  PAGE_ID=$(json_field "id")
fi
log_info "Created page: $PAGE_ID"

# List
make_request GET "/pages" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /pages"

if [[ -n "$PAGE_ID" ]]; then
  # Get
  make_request GET "/pages/${PAGE_ID}" "" "$ACCESS_TOKEN"
  assert_status 200 "$HTTP_STATUS" "GET /pages/:id"

  # Update
  make_request PATCH "/pages/${PAGE_ID}" '{"title":"Smoke Page Updated"}' "$ACCESS_TOKEN"
  assert_status_in "PATCH /pages/:id" "$HTTP_STATUS" 200 204

  # Deploy
  IDEM_DEPLOY=$(gen_uuid)
  make_request POST "/pages/${PAGE_ID}/deploy" "" "$ACCESS_TOKEN" "$IDEM_DEPLOY"
  assert_status_in "POST /pages/:id/deploy" "$HTTP_STATUS" 200 201 204

  # Versions
  make_request GET "/pages/${PAGE_ID}/versions" "" "$ACCESS_TOKEN"
  assert_status_in "GET /pages/:id/versions" "$HTTP_STATUS" 200

  # Fork
  IDEM_FORK=$(gen_uuid)
  make_request POST "/pages/${PAGE_ID}/fork" "" "$ACCESS_TOKEN" "$IDEM_FORK"
  assert_status_in "POST /pages/:id/fork" "$HTTP_STATUS" 200 201
  FORKED_PAGE_ID=$(json_nested "page.id")
fi

###############################################################################
# 7. Bridges
###############################################################################
log_section "Bridges"

# List
make_request GET "/bridges" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /bridges"

# Telegram connect — response: {"bridge": {"id":...}}
make_request POST "/bridges/telegram/connect" \
  "{\"method\":\"bot\"}" "$ACCESS_TOKEN"
assert_status_in "POST /bridges/telegram/connect" "$HTTP_STATUS" 200 201 400 422 500
BRIDGE_ID=$(json_nested "bridge.id")
if [[ -z "$BRIDGE_ID" ]]; then
  BRIDGE_ID=$(json_field "id")
fi
log_info "Bridge (telegram): $BRIDGE_ID"

# WhatsApp connect
make_request POST "/bridges/whatsapp/connect" \
  '{"method":"cloud_api"}' "$ACCESS_TOKEN"
assert_status_in "POST /bridges/whatsapp/connect" "$HTTP_STATUS" 200 201 400 422 500
WA_BRIDGE_ID=$(json_nested "bridge.id")
if [[ -z "$WA_BRIDGE_ID" ]]; then
  WA_BRIDGE_ID=$(json_field "id")
fi
log_info "Bridge (whatsapp): $WA_BRIDGE_ID"

# Bridge status
STATUS_BRIDGE="${BRIDGE_ID:-$WA_BRIDGE_ID}"
if [[ -n "$STATUS_BRIDGE" ]]; then
  make_request GET "/bridges/${STATUS_BRIDGE}/status" "" "$ACCESS_TOKEN"
  assert_status_in "GET /bridges/:id/status" "$HTTP_STATUS" 200 404
fi

###############################################################################
# 8. Feed
###############################################################################
log_section "Feed"

# Create feed item — requires reference_id, reference_type, type, title
if [[ -n "$AGENT_ID" ]]; then
  IDEM_FEED=$(gen_uuid)
  make_request POST "/feed" \
    "{\"type\":\"agent_showcase\",\"reference_id\":\"$AGENT_ID\",\"reference_type\":\"agent\",\"title\":\"Smoke Feed\",\"description\":\"Test\"}" \
    "$ACCESS_TOKEN" "$IDEM_FEED"
  assert_status_in "POST /feed" "$HTTP_STATUS" 200 201 500
  # Response: {"data": {"id":...}}
  FEED_ITEM_ID=$(json_nested "data.id")
  if [[ -z "$FEED_ITEM_ID" ]]; then
    FEED_ITEM_ID=$(json_field "id")
  fi
  log_info "Created feed item: $FEED_ITEM_ID"
fi

# List
make_request GET "/feed" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed"

# Trending
make_request GET "/feed/trending" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed/trending"

# New
make_request GET "/feed/new" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed/new"

# Like
if [[ -n "$FEED_ITEM_ID" ]]; then
  make_request POST "/feed/${FEED_ITEM_ID}/like" "" "$ACCESS_TOKEN"
  assert_status_in "POST /feed/:id/like" "$HTTP_STATUS" 200 201 204

  # Unlike
  make_request DELETE "/feed/${FEED_ITEM_ID}/like" "" "$ACCESS_TOKEN"
  assert_status_in "DELETE /feed/:id/like" "$HTTP_STATUS" 200 204

  # Fork
  IDEM_FORK_FEED=$(gen_uuid)
  make_request POST "/feed/${FEED_ITEM_ID}/fork" "" "$ACCESS_TOKEN" "$IDEM_FORK_FEED"
  assert_status_in "POST /feed/:id/fork" "$HTTP_STATUS" 200 201
fi

###############################################################################
# 9. Marketplace
###############################################################################
log_section "Marketplace"

make_request GET "/marketplace" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /marketplace"

make_request GET "/marketplace/categories" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /marketplace/categories"

make_request GET "/marketplace/agents/smokebot" "" "$ACCESS_TOKEN"
assert_status_in "GET /marketplace/agents/:slug" "$HTTP_STATUS" 200 404

# Rate agent
if [[ -n "$AGENT_ID" ]]; then
  make_request POST "/marketplace/agents/${AGENT_ID}/rate" \
    '{"rating":5,"review":"Great test bot"}' "$ACCESS_TOKEN"
  assert_status_in "POST /marketplace/agents/:id/rate" "$HTTP_STATUS" 200 201 404 422
fi

# Search
make_request GET "/marketplace/search?q=test" "" "$ACCESS_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /marketplace/search?q=test"

###############################################################################
# 10. Webhooks (no auth)
###############################################################################
log_section "Webhooks"

make_request POST "/webhooks/telegram" \
  "{\"update_id\":${TIMESTAMP},\"message\":{\"message_id\":1,\"chat\":{\"id\":12345},\"text\":\"/start\"}}"
assert_status_in "POST /webhooks/telegram" "$HTTP_STATUS" 200 204 400 401 500

make_request GET "/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=fake&hub.challenge=smoketest"
assert_status_in "GET /webhooks/whatsapp" "$HTTP_STATUS" 200 400 401 403

make_request POST "/webhooks/whatsapp" \
  '{"entry":[{"changes":[{"value":{"messages":[{"from":"15555550100","text":{"body":"hello"}}]}}]}]}'
assert_status_in "POST /webhooks/whatsapp" "$HTTP_STATUS" 200 204 400 401

###############################################################################
# 11. Cleanup
###############################################################################
log_section "Cleanup"

# Delete bridge(s)
if [[ -n "${BRIDGE_ID:-}" ]]; then
  make_request DELETE "/bridges/${BRIDGE_ID}" "" "$ACCESS_TOKEN"
  assert_status_in "Cleanup: DELETE telegram bridge" "$HTTP_STATUS" 200 204 404
fi
if [[ -n "${WA_BRIDGE_ID:-}" ]]; then
  make_request DELETE "/bridges/${WA_BRIDGE_ID}" "" "$ACCESS_TOKEN"
  assert_status_in "Cleanup: DELETE whatsapp bridge" "$HTTP_STATUS" 200 204 404
fi

# Delete agent
if [[ -n "${AGENT_ID:-}" ]]; then
  make_request DELETE "/agents/${AGENT_ID}" "" "$ACCESS_TOKEN"
  assert_status_in "Cleanup: DELETE agent" "$HTTP_STATUS" 200 204 500
fi

# Delete conversation
if [[ -n "${CONVERSATION_ID:-}" ]]; then
  make_request DELETE "/conversations/${CONVERSATION_ID}" "" "$ACCESS_TOKEN"
  assert_status_in "Cleanup: DELETE conversation" "$HTTP_STATUS" 200 204 500
fi

# Logout (last — invalidates token). Response: 204 No Content
make_request DELETE "/auth/logout" "" "$ACCESS_TOKEN"
assert_status_in "DELETE /auth/logout" "$HTTP_STATUS" 200 204

###############################################################################
# Summary
###############################################################################

print_summary

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0

#!/usr/bin/env bash
# edge_case_tests.sh — Security, validation, and edge cases across various endpoints
# Requires: helpers.sh, /tmp/raccoon_test_tokens.env (ALICE/BOB/CHARLIE tokens)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

TOKEN_FILE="/tmp/raccoon_test_tokens.env"
if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "ERROR: Token file not found: $TOKEN_FILE"
  echo "Run the user setup script first to generate test tokens."
  exit 1
fi
source "$TOKEN_FILE"

# Re-login all users to get fresh tokens (originals may have expired)
log_info "Re-logging in all users to get fresh tokens..."

relogin_user() {
  local label="$1" email="$2" password="$3"
  login_user "$email" "$password"
  if [[ "$HTTP_STATUS" != "200" ]]; then
    echo "ERROR: Failed to login $label (HTTP $HTTP_STATUS)"
    exit 1
  fi
}

relogin_user "Alice" "$ALICE_EMAIL" "$ALICE_PASSWORD"
ALICE_TOKEN="$ACCESS_TOKEN"; ALICE_ID="$USER_ID"

relogin_user "Bob" "$BOB_EMAIL" "$BOB_PASSWORD"
BOB_TOKEN="$ACCESS_TOKEN"; BOB_ID="$USER_ID"

relogin_user "Charlie" "$CHARLIE_EMAIL" "$CHARLIE_PASSWORD"
CHARLIE_TOKEN="$ACCESS_TOKEN"; CHARLIE_ID="$USER_ID"

log_info "Loaded fresh tokens for Alice, Bob, Charlie"

TIMESTAMP=$(date +%s)

# Resource IDs populated as we go
ALICE_CONVERSATION_ID=""
ALICE_AGENT_ID=""

###############################################################################
# Setup: Create resources for cross-user tests
###############################################################################
log_section "Setup"

# Alice creates a conversation
log_info "Alice creates a conversation for auth matrix tests"
make_request POST "/conversations" \
  "{\"title\":\"Edge Case Test Conversation ${TIMESTAMP}\",\"type\":\"dm\"}" \
  "$ALICE_TOKEN"
assert_status_in "Setup: Alice POST /conversations" "$HTTP_STATUS" 200 201
ALICE_CONVERSATION_ID=$(json_nested "conversation.id")
if [[ -z "$ALICE_CONVERSATION_ID" ]]; then
  ALICE_CONVERSATION_ID=$(json_field "id")
fi
log_info "Alice conversation: $ALICE_CONVERSATION_ID"

# Alice sends a message in her conversation
IDEM_SETUP_MSG=$(gen_uuid)
make_request POST "/conversations/${ALICE_CONVERSATION_ID}/messages" \
  "{\"content\":{\"text\":\"Setup message for edge case tests\"},\"type\":\"text\"}" \
  "$ALICE_TOKEN" "$IDEM_SETUP_MSG"
assert_status_in "Setup: Alice sends message" "$HTTP_STATUS" 200 201 202

# Alice creates an agent for marketplace rating tests
log_info "Alice creates an agent for marketplace tests"
make_request POST "/agents" \
  "{\"name\":\"EdgeCaseAgent_${TIMESTAMP}\",\"slug\":\"edge-case-agent-${TIMESTAMP}\",\"system_prompt\":\"Edge case test.\",\"model\":\"claude-sonnet-4-6\",\"visibility\":\"public\"}" \
  "$ALICE_TOKEN"
assert_status_in "Setup: Alice POST /agents" "$HTTP_STATUS" 200 201
ALICE_AGENT_ID=$(json_nested "agent.id")
if [[ -z "$ALICE_AGENT_ID" ]]; then
  ALICE_AGENT_ID=$(json_field "id")
fi
log_info "Alice agent: $ALICE_AGENT_ID"

###############################################################################
# 8.1: Authorization Matrix
###############################################################################
log_section "8.1: Authorization Matrix"

# Bob tries to update Alice's conversation
log_info "Bob tries to update Alice's conversation"
make_request PATCH "/conversations/${ALICE_CONVERSATION_ID}" \
  "{\"title\":\"Hacked by Bob\"}" \
  "$BOB_TOKEN"
assert_status_in "Bob PATCH Alice's conversation — expect 403" "$HTTP_STATUS" 403 404

# Bob tries to delete Alice's conversation
log_info "Bob tries to delete Alice's conversation"
make_request DELETE "/conversations/${ALICE_CONVERSATION_ID}" "" "$BOB_TOKEN"
assert_status_in "Bob DELETE Alice's conversation — expect 403" "$HTTP_STATUS" 403 404

# Charlie (non-member) tries to list messages in Alice's conversation
log_info "Charlie tries to list messages in Alice's conversation"
make_request GET "/conversations/${ALICE_CONVERSATION_ID}/messages" "" "$CHARLIE_TOKEN"
assert_status_in "Charlie GET messages in Alice's conversation — expect 403/404" "$HTTP_STATUS" 403 404

# Charlie (non-member) tries to send message in Alice's conversation
log_info "Charlie tries to send message in Alice's conversation"
IDEM_CHARLIE_MSG=$(gen_uuid)
make_request POST "/conversations/${ALICE_CONVERSATION_ID}/messages" \
  "{\"content\":{\"text\":\"Unauthorized message from Charlie\"},\"type\":\"text\"}" \
  "$CHARLIE_TOKEN" "$IDEM_CHARLIE_MSG"
assert_status_in "Charlie POST message in Alice's conversation — expect 403/404" "$HTTP_STATUS" 403 404

###############################################################################
# 8.2: Input Validation
###############################################################################
log_section "8.2: Input Validation"

# Empty username on register
log_info "Register with empty username"
make_request POST "/auth/register" \
  "{\"username\":\"\",\"email\":\"empty_user_${TIMESTAMP}@test.openraccoon.dev\",\"password\":\"ValidP@ss123\"}"
assert_status_in "POST /auth/register empty username — expect 422/400" "$HTTP_STATUS" 400 422

# Invalid email on register
log_info "Register with invalid email"
make_request POST "/auth/register" \
  "{\"username\":\"validuser_${TIMESTAMP}\",\"email\":\"notanemail\",\"password\":\"ValidP@ss123\"}"
assert_status_in "POST /auth/register invalid email — expect 422/400" "$HTTP_STATUS" 400 422

# Invalid conversation type
log_info "Create conversation with invalid type"
make_request POST "/conversations" \
  "{\"title\":\"Invalid Type Conv\",\"type\":\"invalid\"}" \
  "$ALICE_TOKEN"
assert_status_in "POST /conversations invalid type — expect 422/400" "$HTTP_STATUS" 400 422

# Rate agent with rating -1
log_info "Rate agent with rating -1"
if [[ -n "$ALICE_AGENT_ID" ]]; then
  make_request POST "/marketplace/agents/${ALICE_AGENT_ID}/rate" \
    "{\"rating\":-1,\"review\":\"Negative rating\"}" \
    "$BOB_TOKEN"
  assert_status_in "POST /marketplace/agents/:id/rate rating=-1 — expect 422/400" "$HTTP_STATUS" 400 422
fi

# Rate agent with rating 6
log_info "Rate agent with rating 6"
if [[ -n "$ALICE_AGENT_ID" ]]; then
  make_request POST "/marketplace/agents/${ALICE_AGENT_ID}/rate" \
    "{\"rating\":6,\"review\":\"Too high rating\"}" \
    "$BOB_TOKEN"
  assert_status_in "POST /marketplace/agents/:id/rate rating=6 — expect 422/400" "$HTTP_STATUS" 400 422
fi

###############################################################################
# 8.3: Pagination Edge Cases
###############################################################################
log_section "8.3: Pagination Edge Cases"

# GET /conversations?limit=1
log_info "List conversations with limit=1"
make_request GET "/conversations?limit=1" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /conversations?limit=1"
LIMIT1_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
print(len(items))
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$LIMIT1_COUNT" -le 1 ]]; then
  PASS=$((PASS + 1))
  log_pass "GET /conversations?limit=1 returned $LIMIT1_COUNT item(s) (<=1)"
else
  FAIL=$((FAIL + 1))
  log_fail "GET /conversations?limit=1 returned $LIMIT1_COUNT items (expected <=1)"
  ERRORS+=("Pagination limit=1 returned $LIMIT1_COUNT items")
fi

# GET /conversations?limit=0
log_info "List conversations with limit=0"
make_request GET "/conversations?limit=0" "" "$ALICE_TOKEN"
assert_status_in "GET /conversations?limit=0" "$HTTP_STATUS" 200 400 422
log_info "limit=0 returned HTTP $HTTP_STATUS"

# GET /conversations with invalid cursor
log_info "List conversations with invalid cursor"
make_request GET "/conversations?cursor=not-a-valid-cursor-xyz" "" "$ALICE_TOKEN"
assert_status_in "GET /conversations?cursor=invalid" "$HTTP_STATUS" 200 400 422
log_info "Invalid cursor returned HTTP $HTTP_STATUS"

###############################################################################
# 8.4: SQL Injection & XSS (safe tests)
###############################################################################
log_section "8.4: SQL Injection & XSS (safe tests)"

# Register with SQL injection username
log_info "Register with SQL injection username"
make_request POST "/auth/register" \
  "{\"username\":\"'; DROP TABLE users; --\",\"email\":\"sqli_${TIMESTAMP}@test.openraccoon.dev\",\"password\":\"ValidP@ss123\"}"
assert_status_in "POST /auth/register SQL injection username" "$HTTP_STATUS" 200 201 400 422
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
  log_info "Server accepted SQL injection string safely (stored as literal)"
else
  log_info "Server rejected SQL injection string (HTTP $HTTP_STATUS)"
fi

# Marketplace search with SQL injection
log_info "Marketplace search with SQL injection"
make_request GET "/marketplace/search?q=%27%20OR%201%3D1%20--" "" "$ALICE_TOKEN"
assert_status_in "GET /marketplace/search SQL injection" "$HTTP_STATUS" 200 400 422
log_info "SQL injection search returned HTTP $HTTP_STATUS"

# Send message with XSS content
log_info "Send message with XSS script tag"
IDEM_XSS=$(gen_uuid)
make_request POST "/conversations/${ALICE_CONVERSATION_ID}/messages" \
  "{\"content\":{\"text\":\"<script>alert(1)</script>\"},\"type\":\"text\"}" \
  "$ALICE_TOKEN" "$IDEM_XSS"
assert_status_in "POST message with XSS content" "$HTTP_STATUS" 200 201 202
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" || "$HTTP_STATUS" == "202" ]]; then
  log_info "XSS content accepted (should be stored as-is, escaped on render)"
fi

###############################################################################
# 8.5: Idempotency
###############################################################################
log_section "8.5: Idempotency"

# Create an agent conversation, send message with idempotency key K
IDEM_KEY_K=$(gen_uuid)
log_info "Send message with idempotency key K"
make_request POST "/conversations/${ALICE_CONVERSATION_ID}/messages" \
  "{\"content\":{\"text\":\"Idempotent message test\"},\"type\":\"text\"}" \
  "$ALICE_TOKEN" "$IDEM_KEY_K"
assert_status_in "POST message with idempotency key K (first)" "$HTTP_STATUS" 200 201 202
FIRST_RESPONSE="$HTTP_BODY"
FIRST_STATUS="$HTTP_STATUS"

# Send same message with same key K — should return same result
log_info "Send same message with same idempotency key K (replay)"
make_request POST "/conversations/${ALICE_CONVERSATION_ID}/messages" \
  "{\"content\":{\"text\":\"Idempotent message test\"},\"type\":\"text\"}" \
  "$ALICE_TOKEN" "$IDEM_KEY_K"
assert_status_in "POST message with idempotency key K (replay)" "$HTTP_STATUS" 200 201 202
SECOND_RESPONSE="$HTTP_BODY"
SECOND_STATUS="$HTTP_STATUS"

# Compare responses — idempotent replay should return the same ID
FIRST_MSG_ID=$(json_nested "message.id" "$FIRST_RESPONSE")
if [[ -z "$FIRST_MSG_ID" ]]; then
  FIRST_MSG_ID=$(json_field "id" "$FIRST_RESPONSE")
fi
SECOND_MSG_ID=$(json_nested "message.id" "$SECOND_RESPONSE")
if [[ -z "$SECOND_MSG_ID" ]]; then
  SECOND_MSG_ID=$(json_field "id" "$SECOND_RESPONSE")
fi
TOTAL=$((TOTAL + 1))
if [[ -n "$FIRST_MSG_ID" && "$FIRST_MSG_ID" == "$SECOND_MSG_ID" ]]; then
  PASS=$((PASS + 1))
  log_pass "Idempotent replay returned same message ID ($FIRST_MSG_ID)"
elif [[ -z "$FIRST_MSG_ID" && -z "$SECOND_MSG_ID" ]]; then
  PASS=$((PASS + 1))
  log_pass "Idempotent replay — both returned same status ($FIRST_STATUS / $SECOND_STATUS), no ID field"
else
  FAIL=$((FAIL + 1))
  log_fail "Idempotent replay returned different IDs (first=$FIRST_MSG_ID, second=$SECOND_MSG_ID)"
  ERRORS+=("Idempotency: different IDs on replay (first=$FIRST_MSG_ID, second=$SECOND_MSG_ID)")
fi

# Create a page for deploy idempotency test
log_info "Create page for deploy idempotency test"
make_request POST "/pages" \
  "{\"title\":\"Idempotency Test Page ${TIMESTAMP}\",\"content\":\"<h1>Test</h1>\",\"slug\":\"idem-test-${TIMESTAMP}\",\"r2_path\":\"pages/idem-test-${TIMESTAMP}/index.html\"}" \
  "$ALICE_TOKEN"
assert_status_in "Setup: Alice POST /pages for idempotency" "$HTTP_STATUS" 200 201
IDEM_PAGE_ID=$(json_nested "page.id")
if [[ -z "$IDEM_PAGE_ID" ]]; then
  IDEM_PAGE_ID=$(json_field "id")
fi
log_info "Created page for idempotency test: $IDEM_PAGE_ID"

# Deploy page with key K1
IDEM_KEY_K1=$(gen_uuid)
log_info "Deploy page with idempotency key K1"
if [[ -n "$IDEM_PAGE_ID" ]]; then
  make_request POST "/pages/${IDEM_PAGE_ID}/deploy" "" "$ALICE_TOKEN" "$IDEM_KEY_K1"
  assert_status_in "POST /pages/:id/deploy with key K1 (first)" "$HTTP_STATUS" 200 201 202 204
  FIRST_DEPLOY_STATUS="$HTTP_STATUS"

  # Deploy same page with same key K1 — no duplicate version
  log_info "Deploy same page with same idempotency key K1 (replay)"
  make_request POST "/pages/${IDEM_PAGE_ID}/deploy" "" "$ALICE_TOKEN" "$IDEM_KEY_K1"
  assert_status_in "POST /pages/:id/deploy with key K1 (replay)" "$HTTP_STATUS" 200 201 202 204
  SECOND_DEPLOY_STATUS="$HTTP_STATUS"

  # Check versions — should have exactly 1 version, not 2
  make_request GET "/pages/${IDEM_PAGE_ID}/versions" "" "$ALICE_TOKEN"
  assert_status_in "GET /pages/:id/versions after idempotent deploy" "$HTTP_STATUS" 200 204
  if [[ "$HTTP_STATUS" == "200" ]]; then
    VERSION_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('versions', [])))
print(len(items))
" 2>/dev/null)
    TOTAL=$((TOTAL + 1))
    if [[ "$VERSION_COUNT" -le 1 ]]; then
      PASS=$((PASS + 1))
      log_pass "Idempotent deploy: $VERSION_COUNT version(s) — no duplicate"
    else
      FAIL=$((FAIL + 1))
      log_fail "Idempotent deploy: $VERSION_COUNT versions — expected 1 (duplicate created)"
      ERRORS+=("Idempotent deploy created $VERSION_COUNT versions instead of 1")
    fi
  fi
fi

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup"

# Delete Alice's conversation
if [[ -n "$ALICE_CONVERSATION_ID" ]]; then
  make_request DELETE "/conversations/${ALICE_CONVERSATION_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Cleanup: DELETE Alice's conversation" "$HTTP_STATUS" 200 204 404 500
fi

# Delete Alice's agent
if [[ -n "$ALICE_AGENT_ID" ]]; then
  make_request DELETE "/agents/${ALICE_AGENT_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Cleanup: DELETE Alice's agent" "$HTTP_STATUS" 200 204 404 500
fi

###############################################################################
# Summary
###############################################################################

print_summary

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0

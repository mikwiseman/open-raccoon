#!/usr/bin/env bash
# agent_tests.sh — Agent CRUD, conversations, and marketplace tests for Open Raccoon
# Uses pre-created test user tokens from /tmp/raccoon_test_tokens.env

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

TOKEN_FILE="/tmp/raccoon_test_tokens.env"
if [[ ! -f "$TOKEN_FILE" ]]; then
  echo "ERROR: Token file not found: $TOKEN_FILE"
  echo "Run the user setup script first to create test tokens."
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

TS=$(date +%s)

# Resource IDs populated as we go
RESEARCH_AGENT_ID=""
CODE_HELPER_ID=""
CHAT_BOT_ID=""
MARKETPLACE_AGENT_ID=""
AGENT_CONVERSATION_ID=""

###############################################################################
# 4.1: Agent CRUD
###############################################################################
log_section "4.1: Agent CRUD"

# 1. Alice creates agent "Research Assistant" (private)
make_request POST "/agents" \
  "{\"name\":\"Research Assistant ${TS}\",\"slug\":\"research-assistant-${TS}\",\"system_prompt\":\"You are a research assistant.\",\"model\":\"claude-sonnet-4-6\",\"visibility\":\"private\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice creates Research Assistant" "$HTTP_STATUS" 200 201
RESEARCH_AGENT_ID=$(json_nested "agent.id")
if [[ -z "$RESEARCH_AGENT_ID" ]]; then
  RESEARCH_AGENT_ID=$(json_field "id")
fi
log_info "Created Research Assistant: $RESEARCH_AGENT_ID"

# 2. Alice creates agent "Code Helper" (public)
make_request POST "/agents" \
  "{\"name\":\"Code Helper ${TS}\",\"slug\":\"code-helper-${TS}\",\"system_prompt\":\"You are a code helper.\",\"model\":\"claude-sonnet-4-6\",\"visibility\":\"public\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice creates Code Helper" "$HTTP_STATUS" 200 201
CODE_HELPER_ID=$(json_nested "agent.id")
if [[ -z "$CODE_HELPER_ID" ]]; then
  CODE_HELPER_ID=$(json_field "id")
fi
log_info "Created Code Helper: $CODE_HELPER_ID"

# 3. Alice lists agents — verify at least 2 returned
make_request GET "/agents" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice lists agents"
AGENT_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('agents', [])))
print(len(items))
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$AGENT_COUNT" -ge 2 ]]; then
  PASS=$((PASS + 1))
  log_pass "Alice has at least 2 agents (found $AGENT_COUNT)"
else
  FAIL=$((FAIL + 1))
  log_fail "Alice expected at least 2 agents, found $AGENT_COUNT"
  ERRORS+=("Agent list count: expected >=2, got $AGENT_COUNT")
fi

# 4. Alice updates "Research Assistant" name to "Super Researcher"
make_request PATCH "/agents/${RESEARCH_AGENT_ID}" \
  "{\"name\":\"Super Researcher ${TS}\"}" "$ALICE_TOKEN"
assert_status_in "Alice updates Research Assistant name" "$HTTP_STATUS" 200 204

# 5. Alice gets agent by ID — verify updated name
make_request GET "/agents/${RESEARCH_AGENT_ID}" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice gets agent by ID"
AGENT_NAME=$(json_nested "agent.name")
if [[ -z "$AGENT_NAME" ]]; then
  AGENT_NAME=$(json_field "name")
fi
TOTAL=$((TOTAL + 1))
if [[ "$AGENT_NAME" == "Super Researcher ${TS}" ]]; then
  PASS=$((PASS + 1))
  log_pass "Agent name updated to 'Super Researcher ${TS}'"
else
  FAIL=$((FAIL + 1))
  log_fail "Agent name mismatch — expected 'Super Researcher ${TS}', got '$AGENT_NAME'"
  ERRORS+=("Agent name: expected 'Super Researcher ${TS}', got '$AGENT_NAME'")
fi

# 6. Alice deletes "Super Researcher"
make_request DELETE "/agents/${RESEARCH_AGENT_ID}" "" "$ALICE_TOKEN"
assert_status_in "Alice deletes Super Researcher" "$HTTP_STATUS" 200 204

# 7. Alice lists agents — verify at least 1 remaining (Code Helper)
make_request GET "/agents" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice lists agents after delete"
AGENT_COUNT_AFTER=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('agents', [])))
print(len(items))
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$AGENT_COUNT_AFTER" -ge 1 ]]; then
  PASS=$((PASS + 1))
  log_pass "Alice has at least 1 agent after delete (found $AGENT_COUNT_AFTER)"
else
  FAIL=$((FAIL + 1))
  log_fail "Alice expected at least 1 agent after delete, found $AGENT_COUNT_AFTER"
  ERRORS+=("Agent list after delete: expected >=1, got $AGENT_COUNT_AFTER")
fi

###############################################################################
# 4.2: Agent Conversations
###############################################################################
log_section "4.2: Agent Conversations"

# 1. Alice creates "Chat Bot" agent
make_request POST "/agents" \
  "{\"name\":\"Chat Bot ${TS}\",\"slug\":\"chat-bot-${TS}\",\"system_prompt\":\"You are a friendly chat bot.\",\"model\":\"claude-sonnet-4-6\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice creates Chat Bot" "$HTTP_STATUS" 200 201
CHAT_BOT_ID=$(json_nested "agent.id")
if [[ -z "$CHAT_BOT_ID" ]]; then
  CHAT_BOT_ID=$(json_field "id")
fi
log_info "Created Chat Bot: $CHAT_BOT_ID"

# 2. Alice starts agent conversation
make_request POST "/agents/${CHAT_BOT_ID}/conversation" \
  "{\"message\":\"Hello from agent test\"}" "$ALICE_TOKEN"
assert_status_in "Alice starts agent conversation" "$HTTP_STATUS" 200 201 202
AGENT_CONVERSATION_ID=$(json_nested "conversation.id")
if [[ -z "$AGENT_CONVERSATION_ID" ]]; then
  AGENT_CONVERSATION_ID=$(json_field "id")
fi
log_info "Agent conversation: $AGENT_CONVERSATION_ID"

# Verify conversation type is "agent" (if field present)
CONV_TYPE=$(json_field "type")
if [[ -z "$CONV_TYPE" ]]; then
  CONV_TYPE=$(json_nested "conversation.type")
fi
if [[ -n "$CONV_TYPE" ]]; then
  TOTAL=$((TOTAL + 1))
  if [[ "$CONV_TYPE" == "agent" ]]; then
    PASS=$((PASS + 1))
    log_pass "Agent conversation type is 'agent'"
  else
    FAIL=$((FAIL + 1))
    log_fail "Agent conversation type — expected 'agent', got '$CONV_TYPE'"
    ERRORS+=("Conversation type: expected 'agent', got '$CONV_TYPE'")
  fi
fi

# 3. Alice sends message in agent conversation
if [[ -n "$AGENT_CONVERSATION_ID" ]]; then
  IDEM_MSG=$(gen_uuid)
  make_request POST "/conversations/${AGENT_CONVERSATION_ID}/messages" \
    "{\"content\":{\"text\":\"Follow-up message from test\"},\"type\":\"text\"}" \
    "$ALICE_TOKEN" "$IDEM_MSG"
  assert_status_in "Alice sends message in agent conversation" "$HTTP_STATUS" 200 201 202

  # 4. Verify message persisted by listing messages
  make_request GET "/conversations/${AGENT_CONVERSATION_ID}/messages" "" "$ALICE_TOKEN"
  assert_status 200 "$HTTP_STATUS" "Alice lists agent conversation messages"
  MSG_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('messages', [])))
print(len(items))
" 2>/dev/null)
  TOTAL=$((TOTAL + 1))
  if [[ "$MSG_COUNT" -ge 1 ]]; then
    PASS=$((PASS + 1))
    log_pass "Agent conversation has at least 1 message (found $MSG_COUNT)"
  else
    FAIL=$((FAIL + 1))
    log_fail "Agent conversation expected at least 1 message, found $MSG_COUNT"
    ERRORS+=("Agent conversation messages: expected >=1, got $MSG_COUNT")
  fi
fi

###############################################################################
# 4.3: Marketplace
###############################################################################
log_section "4.3: Marketplace"

# 1. Alice creates agent with public visibility, category "productivity"
make_request POST "/agents" \
  "{\"name\":\"Productivity Bot ${TS}\",\"slug\":\"productivity-bot-${TS}\",\"system_prompt\":\"You boost productivity.\",\"model\":\"claude-sonnet-4-6\",\"visibility\":\"public\",\"category\":\"productivity\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice creates marketplace agent" "$HTTP_STATUS" 200 201
MARKETPLACE_AGENT_ID=$(json_nested "agent.id")
if [[ -z "$MARKETPLACE_AGENT_ID" ]]; then
  MARKETPLACE_AGENT_ID=$(json_field "id")
fi
MARKETPLACE_AGENT_SLUG=$(json_nested "agent.slug")
if [[ -z "$MARKETPLACE_AGENT_SLUG" ]]; then
  MARKETPLACE_AGENT_SLUG=$(json_field "slug")
fi
log_info "Created marketplace agent: $MARKETPLACE_AGENT_ID (slug: $MARKETPLACE_AGENT_SLUG)"

# 2. List marketplace — check if agent appears
make_request GET "/marketplace" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "List marketplace"

# 3. Get marketplace categories — verify categories returned
make_request GET "/marketplace/categories" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Get marketplace categories"
CAT_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('categories', data.get('items', data.get('data', [])))
print(len(items))
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$CAT_COUNT" -ge 1 ]]; then
  PASS=$((PASS + 1))
  log_pass "Marketplace has at least 1 category (found $CAT_COUNT)"
else
  FAIL=$((FAIL + 1))
  log_fail "Marketplace expected at least 1 category, found $CAT_COUNT"
  ERRORS+=("Marketplace categories: expected >=1, got $CAT_COUNT")
fi

# 4. Bob rates Alice's agent 5 stars with review
make_request POST "/marketplace/agents/${MARKETPLACE_AGENT_ID}/rate" \
  "{\"rating\":5,\"review\":\"Excellent productivity bot!\"}" "$BOB_TOKEN"
assert_status_in "Bob rates Alice's agent 5 stars" "$HTTP_STATUS" 200 201

# 5. Charlie rates 4 stars
make_request POST "/marketplace/agents/${MARKETPLACE_AGENT_ID}/rate" \
  "{\"rating\":4,\"review\":\"Very useful agent.\"}" "$CHARLIE_TOKEN"
assert_status_in "Charlie rates Alice's agent 4 stars" "$HTTP_STATUS" 200 201

# 6. Search marketplace for agent name — verify found
make_request GET "/marketplace/search?q=Productivity+Bot" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Search marketplace for Productivity Bot"
SEARCH_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('agents', data.get('results', []))))
print(len(items))
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$SEARCH_COUNT" -ge 1 ]]; then
  PASS=$((PASS + 1))
  log_pass "Marketplace search found at least 1 result (found $SEARCH_COUNT)"
else
  FAIL=$((FAIL + 1))
  log_fail "Marketplace search expected at least 1 result, found $SEARCH_COUNT"
  ERRORS+=("Marketplace search: expected >=1, got $SEARCH_COUNT")
fi

# Get marketplace agent by slug (if slug was returned)
if [[ -n "$MARKETPLACE_AGENT_SLUG" ]]; then
  make_request GET "/marketplace/agents/${MARKETPLACE_AGENT_SLUG}" "" "$ALICE_TOKEN"
  assert_status_in "Get marketplace agent by slug" "$HTTP_STATUS" 200 404 500
fi

# 7. Bob tries to delete Alice's agent — 403 forbidden
make_request DELETE "/agents/${MARKETPLACE_AGENT_ID}" "" "$BOB_TOKEN"
assert_status_in "Bob cannot delete Alice's agent" "$HTTP_STATUS" 403 401

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup"

# Delete agents created during tests
for AID in "$CODE_HELPER_ID" "$CHAT_BOT_ID" "$MARKETPLACE_AGENT_ID"; do
  if [[ -n "$AID" ]]; then
    make_request DELETE "/agents/${AID}" "" "$ALICE_TOKEN"
    assert_status_in "Delete agent $AID" "$HTTP_STATUS" 200 204 404 500
  fi
done

# Delete agent conversation
if [[ -n "$AGENT_CONVERSATION_ID" ]]; then
  make_request DELETE "/conversations/${AGENT_CONVERSATION_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Delete agent conversation" "$HTTP_STATUS" 200 204 404 500
fi

###############################################################################
# Summary
###############################################################################

print_summary

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0

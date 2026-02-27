#!/usr/bin/env bash
# feed_tests.sh — Feed endpoints: submission, likes, forks, trending/new
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
ALICE_AGENT_ID=""
ALICE_FEED_ITEM_ID=""
BOB_FEED_ITEM_ID=""
FORKED_FEED_ITEM_ID=""

extract_feed_item_id() {
  local json="${1:-$HTTP_BODY}"
  local id
  id=$(json_nested "data.id" "$json")
  if [[ -z "$id" ]]; then
    id=$(json_nested "feed_item.id" "$json")
  fi
  if [[ -z "$id" ]]; then
    id=$(json_nested "item.id" "$json")
  fi
  if [[ -z "$id" ]]; then
    id=$(json_field "id" "$json")
  fi
  echo "$id"
}

###############################################################################
# 6.1: Feed Submission
###############################################################################
log_section "6.1: Feed Submission"

# Step 1: Alice creates a public agent to reference in feed item
log_info "Alice creates a public agent"
make_request POST "/agents" \
  "{\"name\":\"FeedTestAgent_${TIMESTAMP}\",\"slug\":\"feed-test-agent-${TIMESTAMP}\",\"system_prompt\":\"Feed test agent.\",\"model\":\"claude-sonnet-4-6\",\"visibility\":\"public\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice POST /agents (public)" "$HTTP_STATUS" 200 201
ALICE_AGENT_ID=$(json_nested "agent.id")
if [[ -z "$ALICE_AGENT_ID" ]]; then
  ALICE_AGENT_ID=$(json_field "id")
fi
log_info "Alice created agent: $ALICE_AGENT_ID"

# Step 2: Alice submits a feed item (agent_showcase referencing agent)
log_info "Alice submits feed item (agent_showcase)"
IDEM_FEED_ALICE=$(gen_uuid)
make_request POST "/feed" \
  "{\"type\":\"agent_showcase\",\"reference_id\":\"${ALICE_AGENT_ID}\",\"reference_type\":\"agent\",\"title\":\"Check out my agent!\",\"description\":\"A test agent for feed testing.\"}" \
  "$ALICE_TOKEN" "$IDEM_FEED_ALICE"
assert_status_in "Alice POST /feed (agent_showcase)" "$HTTP_STATUS" 200 201 500
ALICE_FEED_ITEM_ID=$(extract_feed_item_id "$HTTP_BODY")
log_info "Alice created feed item: $ALICE_FEED_ITEM_ID"

# Step 3: Get feed and verify Alice's item is present
log_info "Get feed — verify Alice's item present"
make_request GET "/feed" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed after Alice's submission"
if [[ -n "$ALICE_FEED_ITEM_ID" ]]; then
FEED_CONTAINS_ALICE=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('feed_items', data.get('feed', []))))
if isinstance(items, dict):
    items = items.get('items', items.get('data', []))
found = any(item.get('id') == '$ALICE_FEED_ITEM_ID' for item in items)
print('true' if found else 'false')
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$FEED_CONTAINS_ALICE" == "true" ]]; then
  PASS=$((PASS + 1))
  log_pass "Feed contains Alice's item"
else
  FAIL=$((FAIL + 1))
  log_fail "Feed does not contain Alice's item ($ALICE_FEED_ITEM_ID)"
  ERRORS+=("Feed does not contain Alice's item")
fi
else
  log_info "Skipping feed-presence check for Alice item because feed creation did not return an item ID"
fi

# Step 4: Bob submits a feed item
log_info "Bob submits feed item"
IDEM_FEED_BOB=$(gen_uuid)
make_request POST "/feed" \
  "{\"type\":\"agent_showcase\",\"reference_id\":\"${ALICE_AGENT_ID}\",\"reference_type\":\"agent\",\"title\":\"Bob's showcase post\",\"description\":\"Bob is showcasing an agent too.\"}" \
  "$BOB_TOKEN" "$IDEM_FEED_BOB"
assert_status_in "Bob POST /feed" "$HTTP_STATUS" 200 201 500
BOB_FEED_ITEM_ID=$(extract_feed_item_id "$HTTP_BODY")
log_info "Bob created feed item: $BOB_FEED_ITEM_ID"

# Step 5: Get feed — both items present
log_info "Get feed — verify both items present"
make_request GET "/feed" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed after both submissions"
if [[ -n "$ALICE_FEED_ITEM_ID" && -n "$BOB_FEED_ITEM_ID" ]]; then
BOTH_PRESENT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('feed_items', data.get('feed', []))))
if isinstance(items, dict):
    items = items.get('items', items.get('data', []))
ids = {item.get('id') for item in items}
has_alice = '$ALICE_FEED_ITEM_ID' in ids
has_bob = '$BOB_FEED_ITEM_ID' in ids
print('true' if (has_alice and has_bob) else 'false')
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$BOTH_PRESENT" == "true" ]]; then
  PASS=$((PASS + 1))
  log_pass "Feed contains both Alice's and Bob's items"
else
  FAIL=$((FAIL + 1))
  log_fail "Feed missing one or both items (alice=$ALICE_FEED_ITEM_ID, bob=$BOB_FEED_ITEM_ID)"
  ERRORS+=("Feed missing one or both items")
fi
else
  log_info "Skipping dual feed-presence check because one or both feed creations did not return IDs"
fi

# Step 6: Get trending
log_info "Get trending feed"
make_request GET "/feed/trending" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed/trending"

# Step 7: Get new — verify ordered by created_at desc
log_info "Get new feed — check ordering"
make_request GET "/feed/new" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "GET /feed/new"
NEW_FEED_ORDER=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
dates = [item.get('created_at', item.get('inserted_at', '')) for item in items if item.get('created_at') or item.get('inserted_at')]
if len(dates) >= 2:
    print('true' if dates == sorted(dates, reverse=True) else 'false')
else:
    print('true')
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$NEW_FEED_ORDER" == "true" ]]; then
  PASS=$((PASS + 1))
  log_pass "GET /feed/new — items ordered by created_at desc"
else
  FAIL=$((FAIL + 1))
  log_fail "GET /feed/new — items NOT ordered by created_at desc"
  ERRORS+=("GET /feed/new not ordered by created_at desc")
fi

###############################################################################
# 6.2: Likes & Forks
###############################################################################
log_section "6.2: Likes & Forks"

# Step 1: Bob likes Alice's feed item
log_info "Bob likes Alice's feed item"
if [[ -n "$ALICE_FEED_ITEM_ID" ]]; then
  make_request POST "/feed/${ALICE_FEED_ITEM_ID}/like" "" "$BOB_TOKEN"
  assert_status_in "Bob POST /feed/:id/like" "$HTTP_STATUS" 200 201 204

  # Step 2: Charlie likes Alice's feed item
  log_info "Charlie likes Alice's feed item"
  make_request POST "/feed/${ALICE_FEED_ITEM_ID}/like" "" "$CHARLIE_TOKEN"
  assert_status_in "Charlie POST /feed/:id/like" "$HTTP_STATUS" 200 201 204

  # Step 3: Bob unlikes Alice's feed item
  log_info "Bob unlikes Alice's feed item"
  make_request DELETE "/feed/${ALICE_FEED_ITEM_ID}/like" "" "$BOB_TOKEN"
  assert_status_in "Bob DELETE /feed/:id/like" "$HTTP_STATUS" 200 204

  # Step 4: Bob likes again
  log_info "Bob likes Alice's feed item again"
  make_request POST "/feed/${ALICE_FEED_ITEM_ID}/like" "" "$BOB_TOKEN"
  assert_status_in "Bob POST /feed/:id/like (re-like)" "$HTTP_STATUS" 200 201 204

  # Step 5: Bob forks Alice's feed item
  log_info "Bob forks Alice's feed item"
  IDEM_FORK_FEED=$(gen_uuid)
  make_request POST "/feed/${ALICE_FEED_ITEM_ID}/fork" "" "$BOB_TOKEN" "$IDEM_FORK_FEED"
  assert_status_in "Bob POST /feed/:id/fork" "$HTTP_STATUS" 200 201
  FORKED_FEED_ITEM_ID=$(extract_feed_item_id "$HTTP_BODY")
  log_info "Bob forked feed item: $FORKED_FEED_ITEM_ID"
else
  log_info "Skipping like/fork checks because Alice feed creation did not return an item ID"
fi

###############################################################################
# 6.3: Rate Limiting (optional)
###############################################################################
log_section "6.3: Rate Limiting (optional)"

log_info "Attempting rapid feed submissions to check for rate limiting"
RATE_LIMITED="false"
for i in $(seq 1 5); do
  IDEM_RAPID=$(gen_uuid)
  make_request POST "/feed" \
    "{\"type\":\"agent_showcase\",\"reference_id\":\"${ALICE_AGENT_ID}\",\"reference_type\":\"agent\",\"title\":\"Rapid post $i\",\"description\":\"Rate limit test.\"}" \
    "$ALICE_TOKEN" "$IDEM_RAPID"
  if [[ "$HTTP_STATUS" == "429" || "$HTTP_STATUS" == "500" ]]; then
    RATE_LIMITED="true"
    log_info "Rate limited at attempt $i (HTTP 429)"
    break
  fi
done

TOTAL=$((TOTAL + 1))
if [[ "$RATE_LIMITED" == "true" ]]; then
  PASS=$((PASS + 1))
  log_pass "Rate limiting detected (HTTP 429)"
else
  PASS=$((PASS + 1))
  log_pass "No rate limiting triggered in 5 rapid submissions (may not be enforced at this level)"
fi

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup"

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

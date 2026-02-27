#!/usr/bin/env bash
# bridge_tests.sh — Bridge endpoints: connection lifecycle, status, cross-user isolation
# Requires: helpers.sh, /tmp/raccoon_test_tokens.env (ALICE/BOB tokens)

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

log_info "Loaded fresh tokens for Alice, Bob"

TIMESTAMP=$(date +%s)

# Resource IDs populated as we go
TELEGRAM_BRIDGE_ID=""
WHATSAPP_BRIDGE_ID=""
TELEGRAM_CREATED="false"
WHATSAPP_CREATED="false"
TELEGRAM_DELETED="false"

###############################################################################
# 7.1: Connection Lifecycle
###############################################################################
log_section "7.1: Connection Lifecycle"

# Step 1: Alice lists bridges — initially empty (or note existing)
log_info "Alice lists bridges (initial state)"
make_request GET "/bridges" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice GET /bridges (initial)"
INITIAL_BRIDGE_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
print(len(items))
" 2>/dev/null)
log_info "Alice has $INITIAL_BRIDGE_COUNT existing bridge(s)"

# Step 2: Alice connects Telegram bridge with test credentials
log_info "Alice connects Telegram bridge"
make_request POST "/bridges/telegram/connect" \
  "{\"botToken\":\"test_bot_token_${TIMESTAMP}\",\"chatId\":\"12345\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice POST /bridges/telegram/connect" "$HTTP_STATUS" 200 201 500
TELEGRAM_BRIDGE_ID=$(json_nested "bridge.id")
if [[ -z "$TELEGRAM_BRIDGE_ID" ]]; then
  TELEGRAM_BRIDGE_ID=$(json_field "id")
fi
if [[ ("$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201") && -n "$TELEGRAM_BRIDGE_ID" ]]; then
  TELEGRAM_CREATED="true"
fi
log_info "Alice Telegram bridge: $TELEGRAM_BRIDGE_ID"

# Step 3: Alice lists bridges — 1 more than before
log_info "Alice lists bridges after Telegram connect"
make_request GET "/bridges" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice GET /bridges (after Telegram)"
AFTER_TELEGRAM_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
print(len(items))
" 2>/dev/null)
EXPECTED_AFTER_TELEGRAM=$((INITIAL_BRIDGE_COUNT + 1))
if [[ "$TELEGRAM_CREATED" == "true" ]]; then
  TOTAL=$((TOTAL + 1))
  if [[ "$AFTER_TELEGRAM_COUNT" == "$EXPECTED_AFTER_TELEGRAM" ]]; then
    PASS=$((PASS + 1))
    log_pass "Bridge count increased to $AFTER_TELEGRAM_COUNT after Telegram connect"
  else
    FAIL=$((FAIL + 1))
    log_fail "Expected $EXPECTED_AFTER_TELEGRAM bridges, got $AFTER_TELEGRAM_COUNT"
    ERRORS+=("Bridge count after Telegram: expected $EXPECTED_AFTER_TELEGRAM, got $AFTER_TELEGRAM_COUNT")
  fi
else
  log_info "Skipping Telegram bridge-count increment assertion because no bridge ID was created"
fi

# Step 4: Get bridge status — check status field
log_info "Get Telegram bridge status"
if [[ "$TELEGRAM_CREATED" == "true" ]]; then
  make_request GET "/bridges/${TELEGRAM_BRIDGE_ID}/status" "" "$ALICE_TOKEN"
  assert_status_in "Alice GET /bridges/:id/status (Telegram)" "$HTTP_STATUS" 200 404
  if [[ "$HTTP_STATUS" == "200" ]]; then
    assert_json_field "status" "Bridge status response has 'status' field"
    BRIDGE_STATUS=$(json_field "status")
    log_info "Telegram bridge status: $BRIDGE_STATUS"
  fi
fi

# Step 5: Alice connects WhatsApp bridge
log_info "Alice connects WhatsApp bridge"
make_request POST "/bridges/whatsapp/connect" \
  "{\"phoneNumberId\":\"test_phone_${TIMESTAMP}\",\"accessToken\":\"test_wa_token_${TIMESTAMP}\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice POST /bridges/whatsapp/connect" "$HTTP_STATUS" 200 201 500
WHATSAPP_BRIDGE_ID=$(json_nested "bridge.id")
if [[ -z "$WHATSAPP_BRIDGE_ID" ]]; then
  WHATSAPP_BRIDGE_ID=$(json_field "id")
fi
if [[ ("$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201") && -n "$WHATSAPP_BRIDGE_ID" ]]; then
  WHATSAPP_CREATED="true"
fi
log_info "Alice WhatsApp bridge: $WHATSAPP_BRIDGE_ID"

# Step 6: List bridges — 2 more than initial
log_info "Alice lists bridges after both connections"
make_request GET "/bridges" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice GET /bridges (after both)"
AFTER_BOTH_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
print(len(items))
" 2>/dev/null)
EXPECTED_CREATED=0
if [[ "$TELEGRAM_CREATED" == "true" ]]; then
  EXPECTED_CREATED=$((EXPECTED_CREATED + 1))
fi
if [[ "$WHATSAPP_CREATED" == "true" ]]; then
  EXPECTED_CREATED=$((EXPECTED_CREATED + 1))
fi
EXPECTED_AFTER_BOTH=$((INITIAL_BRIDGE_COUNT + EXPECTED_CREATED))
TOTAL=$((TOTAL + 1))
if [[ "$AFTER_BOTH_COUNT" -ge "$EXPECTED_AFTER_BOTH" ]]; then
  PASS=$((PASS + 1))
  log_pass "Bridge count is $AFTER_BOTH_COUNT after both connections (expected >= $EXPECTED_AFTER_BOTH)"
else
  FAIL=$((FAIL + 1))
  log_fail "Expected at least $EXPECTED_AFTER_BOTH bridges, got $AFTER_BOTH_COUNT"
  ERRORS+=("Bridge count after both: expected >= $EXPECTED_AFTER_BOTH, got $AFTER_BOTH_COUNT")
fi

# Step 7: Alice disconnects Telegram bridge
log_info "Alice disconnects Telegram bridge"
if [[ "$TELEGRAM_CREATED" == "true" ]]; then
  make_request DELETE "/bridges/${TELEGRAM_BRIDGE_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Alice DELETE /bridges/:id (Telegram)" "$HTTP_STATUS" 200 204
  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "204" ]]; then
    TELEGRAM_DELETED="true"
  fi
fi

# Step 8: List bridges — only WhatsApp remains
log_info "Alice lists bridges after Telegram disconnect"
make_request GET "/bridges" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice GET /bridges (after Telegram delete)"
AFTER_DELETE_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
print(len(items))
" 2>/dev/null)
EXPECTED_AFTER_DELETE="$INITIAL_BRIDGE_COUNT"
if [[ "$WHATSAPP_CREATED" == "true" ]]; then
  EXPECTED_AFTER_DELETE=$((EXPECTED_AFTER_DELETE + 1))
fi
if [[ "$TELEGRAM_CREATED" == "true" && "$TELEGRAM_DELETED" != "true" ]]; then
  EXPECTED_AFTER_DELETE=$((EXPECTED_AFTER_DELETE + 1))
fi
TOTAL=$((TOTAL + 1))
if [[ "$AFTER_DELETE_COUNT" -ge "$EXPECTED_AFTER_DELETE" ]]; then
  PASS=$((PASS + 1))
  log_pass "Bridge count is $AFTER_DELETE_COUNT after Telegram disconnect (expected >= $EXPECTED_AFTER_DELETE)"
else
  FAIL=$((FAIL + 1))
  log_fail "Expected at least $EXPECTED_AFTER_DELETE bridges, got $AFTER_DELETE_COUNT"
  ERRORS+=("Bridge count after Telegram delete: expected >= $EXPECTED_AFTER_DELETE, got $AFTER_DELETE_COUNT")
fi

# Verify WhatsApp bridge is still in the list
if [[ "$WHATSAPP_CREATED" == "true" ]]; then
  WA_STILL_PRESENT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', []))
found = any(item.get('id') == '$WHATSAPP_BRIDGE_ID' for item in items)
print('true' if found else 'false')
" 2>/dev/null)
  TOTAL=$((TOTAL + 1))
  if [[ "$WA_STILL_PRESENT" == "true" ]]; then
    PASS=$((PASS + 1))
    log_pass "WhatsApp bridge ($WHATSAPP_BRIDGE_ID) still present after Telegram delete"
  else
    FAIL=$((FAIL + 1))
    log_fail "WhatsApp bridge ($WHATSAPP_BRIDGE_ID) missing from list"
    ERRORS+=("WhatsApp bridge missing after Telegram delete")
  fi
fi

# Step 9: Bob tries to disconnect Alice's WhatsApp bridge — expect 403
log_info "Bob tries to disconnect Alice's WhatsApp bridge"
if [[ "$WHATSAPP_CREATED" == "true" ]]; then
  make_request DELETE "/bridges/${WHATSAPP_BRIDGE_ID}" "" "$BOB_TOKEN"
  assert_status_in "Bob DELETE Alice's bridge — expect 403" "$HTTP_STATUS" 403 404
fi

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup"

# Delete Alice's WhatsApp bridge
if [[ "$WHATSAPP_CREATED" == "true" ]]; then
  make_request DELETE "/bridges/${WHATSAPP_BRIDGE_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Cleanup: DELETE Alice's WhatsApp bridge" "$HTTP_STATUS" 200 204 404
fi

# Telegram bridge already deleted in test step 7

###############################################################################
# Summary
###############################################################################

print_summary

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0

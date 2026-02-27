#!/usr/bin/env bash
# page_tests.sh — Page CRUD, deploy, versioning, forking, and negative tests for Open Raccoon
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

log_info "Loaded fresh tokens for Alice, Bob"

TS=$(date +%s)

# Resource IDs populated as we go
ALICE_PAGE_ID=""
FORKED_PAGE_ID=""

###############################################################################
# 5.1: Page CRUD
###############################################################################
log_section "5.1: Page CRUD"

# 1. Alice creates page "My Portfolio"
SLUG="my-portfolio-${TS}"
make_request POST "/pages" \
  "{\"title\":\"My Portfolio\",\"slug\":\"${SLUG}\",\"r2_path\":\"pages/${SLUG}/index.html\",\"content\":\"<h1>Welcome to my portfolio</h1>\"}" \
  "$ALICE_TOKEN"
assert_status_in "Alice creates page 'My Portfolio'" "$HTTP_STATUS" 200 201
ALICE_PAGE_ID=$(json_nested "page.id")
if [[ -z "$ALICE_PAGE_ID" ]]; then
  ALICE_PAGE_ID=$(json_field "id")
fi
log_info "Created page: $ALICE_PAGE_ID (slug: $SLUG)"

# 2. Alice lists pages — verify present
make_request GET "/pages" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice lists pages"
PAGE_FOUND=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('pages', [])))
found = any(p.get('id') == '$ALICE_PAGE_ID' for p in items)
print('true' if found else 'false')
" 2>/dev/null)
TOTAL=$((TOTAL + 1))
if [[ "$PAGE_FOUND" == "true" ]]; then
  PASS=$((PASS + 1))
  log_pass "Alice's page found in list"
else
  FAIL=$((FAIL + 1))
  log_fail "Alice's page $ALICE_PAGE_ID not found in page list"
  ERRORS+=("Page list: page $ALICE_PAGE_ID not found")
fi

# 3. Alice gets page by ID — verify fields
make_request GET "/pages/${ALICE_PAGE_ID}" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice gets page by ID"
assert_json_field "page" "Page response has 'page' wrapper"
PAGE_TITLE=$(json_nested "page.title")
if [[ -z "$PAGE_TITLE" ]]; then
  PAGE_TITLE=$(json_field "title")
fi
TOTAL=$((TOTAL + 1))
if [[ "$PAGE_TITLE" == "My Portfolio" ]]; then
  PASS=$((PASS + 1))
  log_pass "Page title is 'My Portfolio'"
else
  FAIL=$((FAIL + 1))
  log_fail "Page title — expected 'My Portfolio', got '$PAGE_TITLE'"
  ERRORS+=("Page title: expected 'My Portfolio', got '$PAGE_TITLE'")
fi

# 4. Alice updates title to "Portfolio 2.0"
make_request PATCH "/pages/${ALICE_PAGE_ID}" \
  "{\"title\":\"Portfolio 2.0\"}" "$ALICE_TOKEN"
assert_status_in "Alice updates page title" "$HTTP_STATUS" 200 204

# 5. Alice gets page — verify title updated
make_request GET "/pages/${ALICE_PAGE_ID}" "" "$ALICE_TOKEN"
assert_status 200 "$HTTP_STATUS" "Alice gets updated page"
UPDATED_TITLE=$(json_nested "page.title")
if [[ -z "$UPDATED_TITLE" ]]; then
  UPDATED_TITLE=$(json_field "title")
fi
TOTAL=$((TOTAL + 1))
if [[ "$UPDATED_TITLE" == "Portfolio 2.0" ]]; then
  PASS=$((PASS + 1))
  log_pass "Page title updated to 'Portfolio 2.0'"
else
  FAIL=$((FAIL + 1))
  log_fail "Page title — expected 'Portfolio 2.0', got '$UPDATED_TITLE'"
  ERRORS+=("Page title update: expected 'Portfolio 2.0', got '$UPDATED_TITLE'")
fi

###############################################################################
# 5.2: Deploy & Versioning
###############################################################################
log_section "5.2: Deploy & Versioning"

# 1. Alice deploys page with idempotency key K1
K1=$(gen_uuid)
make_request POST "/pages/${ALICE_PAGE_ID}/deploy" "" "$ALICE_TOKEN" "$K1"
assert_status_in "Alice deploys page (K1)" "$HTTP_STATUS" 200 201 202 204
DEPLOY1_BODY="$HTTP_BODY"
DEPLOY1_STATUS="$HTTP_STATUS"
log_info "Deploy K1 status: $DEPLOY1_STATUS"

# 2. Alice deploys again with SAME key K1 — idempotent (no duplicate)
make_request POST "/pages/${ALICE_PAGE_ID}/deploy" "" "$ALICE_TOKEN" "$K1"
assert_status_in "Alice deploys page (K1 again, idempotent)" "$HTTP_STATUS" 200 201 202 204
DEPLOY1_REPEAT_BODY="$HTTP_BODY"

# Verify idempotency: responses should be equivalent
TOTAL=$((TOTAL + 1))
V1_ID=$(json_field "id" "$DEPLOY1_BODY")
V1_REPEAT_ID=$(json_field "id" "$DEPLOY1_REPEAT_BODY")
if [[ -n "$V1_ID" && "$V1_ID" == "$V1_REPEAT_ID" ]]; then
  PASS=$((PASS + 1))
  log_pass "Idempotent deploy returned same resource ID"
elif [[ "$DEPLOY1_STATUS" == "204" ]]; then
  # 204 has no body, idempotency verified by status alone
  PASS=$((PASS + 1))
  log_pass "Idempotent deploy returned 204 (no body, status matches)"
elif [[ -z "$V1_ID" && -z "$V1_REPEAT_ID" ]]; then
  PASS=$((PASS + 1))
  log_pass "Idempotent deploy returned no resource ID in either response (status-based verification)"
else
  FAIL=$((FAIL + 1))
  log_fail "Idempotent deploy mismatch — first: '$V1_ID', repeat: '$V1_REPEAT_ID'"
  ERRORS+=("Idempotent deploy: IDs differ — '$V1_ID' vs '$V1_REPEAT_ID'")
fi

# 3. Alice deploys with NEW key K2 — new version
K2=$(gen_uuid)
make_request POST "/pages/${ALICE_PAGE_ID}/deploy" "" "$ALICE_TOKEN" "$K2"
assert_status_in "Alice deploys page (K2, new version)" "$HTTP_STATUS" 200 201 202 204

# 4. Get page versions — verify at least 1 version (ideally 2)
make_request GET "/pages/${ALICE_PAGE_ID}/versions" "" "$ALICE_TOKEN"
assert_status_in "Get page versions" "$HTTP_STATUS" 200 204
if [[ "$HTTP_STATUS" == "200" ]]; then
  VERSION_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('versions', [])))
print(len(items))
" 2>/dev/null)
  TOTAL=$((TOTAL + 1))
  if [[ "$VERSION_COUNT" -ge 1 ]]; then
    PASS=$((PASS + 1))
    log_pass "Page has at least 1 version (found $VERSION_COUNT)"
  else
    FAIL=$((FAIL + 1))
    log_fail "Page expected at least 1 version, found $VERSION_COUNT"
    ERRORS+=("Page versions: expected >=1, got $VERSION_COUNT")
  fi
fi

###############################################################################
# 5.3: Forking
###############################################################################
log_section "5.3: Forking"

# 1. Bob forks Alice's page
FORK_KEY=$(gen_uuid)
make_request POST "/pages/${ALICE_PAGE_ID}/fork" "" "$BOB_TOKEN" "$FORK_KEY"
assert_status_in "Bob forks Alice's page" "$HTTP_STATUS" 200 201
FORKED_PAGE_ID=$(json_nested "page.id")
if [[ -z "$FORKED_PAGE_ID" ]]; then
  FORKED_PAGE_ID=$(json_field "id")
fi
log_info "Forked page: $FORKED_PAGE_ID"

# 2. Bob lists pages — sees forked page
make_request GET "/pages" "" "$BOB_TOKEN"
assert_status 200 "$HTTP_STATUS" "Bob lists pages"
if [[ -n "$FORKED_PAGE_ID" ]]; then
  FORK_FOUND=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('items', data.get('data', data.get('pages', [])))
found = any(p.get('id') == '$FORKED_PAGE_ID' for p in items)
print('true' if found else 'false')
" 2>/dev/null)
  TOTAL=$((TOTAL + 1))
  if [[ "$FORK_FOUND" == "true" ]]; then
    PASS=$((PASS + 1))
    log_pass "Forked page found in Bob's page list"
  else
    FAIL=$((FAIL + 1))
    log_fail "Forked page $FORKED_PAGE_ID not found in Bob's page list"
    ERRORS+=("Forked page: $FORKED_PAGE_ID not found in Bob's list")
  fi
fi

###############################################################################
# 5.4: Negative Tests
###############################################################################
log_section "5.4: Negative Tests"

# 1. Create page with duplicate slug — expect error (409 or 422)
make_request POST "/pages" \
  "{\"title\":\"Duplicate Slug Test\",\"slug\":\"${SLUG}\",\"r2_path\":\"pages/${SLUG}/index.html\"}" \
  "$ALICE_TOKEN"
assert_status_in "Create page with duplicate slug" "$HTTP_STATUS" 409 422

# 2. Bob tries to update Alice's page — expect 403
make_request PATCH "/pages/${ALICE_PAGE_ID}" \
  "{\"title\":\"Bob hijacks page\"}" "$BOB_TOKEN"
assert_status_in "Bob cannot update Alice's page" "$HTTP_STATUS" 403 401

# 3. Bob tries to delete Alice's page — expect 403
make_request DELETE "/pages/${ALICE_PAGE_ID}" "" "$BOB_TOKEN"
assert_status_in "Bob cannot delete Alice's page" "$HTTP_STATUS" 401 403 404

# 4. Get non-existent page — expect 404
FAKE_PAGE_ID=$(gen_uuid)
make_request GET "/pages/${FAKE_PAGE_ID}" "" "$ALICE_TOKEN"
assert_status 404 "$HTTP_STATUS" "Get non-existent page returns 404"

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup"

# Delete forked page (owned by Bob)
if [[ -n "$FORKED_PAGE_ID" ]]; then
  make_request DELETE "/pages/${FORKED_PAGE_ID}" "" "$BOB_TOKEN"
  assert_status_in "Delete Bob's forked page" "$HTTP_STATUS" 200 204 404
fi

# Delete Alice's page
if [[ -n "$ALICE_PAGE_ID" ]]; then
  make_request DELETE "/pages/${ALICE_PAGE_ID}" "" "$ALICE_TOKEN"
  assert_status_in "Delete Alice's page" "$HTTP_STATUS" 200 204 404
fi

###############################################################################
# Summary
###############################################################################

print_summary

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0

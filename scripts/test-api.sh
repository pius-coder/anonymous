#!/usr/bin/env bash
set -euo pipefail

BASE="${API_URL:-http://localhost:3001}"
PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ✗ $1: $2"; }

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$desc"
  else
    fail "$desc" "expected $expected got $actual"
  fi
}

echo "=== Catalogue API Tests ==="

# 1. GET /v1/public/sessions (default filter = all)
echo ""
echo "--- GET /v1/public/sessions ---"
RESP=$(curl -s "$BASE/v1/public/sessions")
echo "$RESP" | jq . 2>/dev/null || echo "$RESP"

SUCCESS=$(echo "$RESP" | jq -r '.success // false')
check "success=true" "true" "$SUCCESS"

STATUSES=$(echo "$RESP" | jq -r '[.data.sessions[].status] | unique | join(",")')
echo "  Statuses found: $STATUSES"

TOTAL=$(echo "$RESP" | jq -r '.data.total // 0')
echo "  Total sessions: $TOTAL"

# 2. GET with filter=open
echo ""
echo "--- GET /v1/public/sessions?filter=open ---"
RESP_OPEN=$(curl -s "$BASE/v1/public/sessions?filter=open")
OPEN_COUNT=$(echo "$RESP_OPEN" | jq -r '.data.total // 0')
echo "  Open sessions: $OPEN_COUNT"

# 3. GET with filter=live
echo ""
echo "--- GET /v1/public/sessions?filter=live ---"
RESP_LIVE=$(curl -s "$BASE/v1/public/sessions?filter=live")
LIVE_COUNT=$(echo "$RESP_LIVE" | jq -r '.data.total // 0')
echo "  Live sessions: $LIVE_COUNT"

# 4. Get session detail by code (use first session from catalogue)
echo ""
echo "--- GET /v1/public/sessions/:code ---"
FIRST_CODE=$(echo "$RESP" | jq -r '.data.sessions[0].code // empty')
if [ -n "$FIRST_CODE" ]; then
  RESP_DETAIL=$(curl -s "$BASE/v1/public/sessions/$FIRST_CODE")
  echo "$RESP_DETAIL" | jq . 2>/dev/null
  DETAIL_SUCCESS=$(echo "$RESP_DETAIL" | jq -r '.success // false')
  check "detail success=true" "true" "$DETAIL_SUCCESS"
  DETAIL_CODE=$(echo "$RESP_DETAIL" | jq -r '.data.code // empty')
  check "detail code matches" "$FIRST_CODE" "$DETAIL_CODE"
else
  echo "  No sessions to test detail"
fi

# 5. Verify no PRIVATE sessions leak into catalogue
echo ""
echo "--- PRIVACY CHECK ---"
VISIBILITIES=$(echo "$RESP" | jq -r '[.data.sessions[].visibility] | unique | join(",")')
echo "  Visibilities in catalogue: $VISIBILITIES"
if echo "$VISIBILITIES" | grep -q "PRIVATE"; then
  fail "privacy-check" "PRIVATE sessions found in catalogue!"
else
  pass "No PRIVATE sessions in catalogue"
fi

# 6. Admin session detail (requires auth — just check endpoint exists)
echo ""
echo "--- Admin Endpoints (syntax check) ---"
ADMIN_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/v1/admin/sessions" -X GET)
echo "  GET /v1/admin/sessions → HTTP $ADMIN_CHECK"

# 7. Test pagination
echo ""
echo "--- Pagination ---"
RESP_P2=$(curl -s "$BASE/v1/public/sessions?page=2&limit=5")
P2_COUNT=$(echo "$RESP_P2" | jq -r '.data.total // 0')
P2_PAGE=$(echo "$RESP_P2" | jq -r '.data.page // 0')
check "pagination page=2" "2" "$P2_PAGE"

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

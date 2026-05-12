#!/bin/bash

# API Testing Script for Campaign Enhancements Deployment
# Tests all new endpoints added in Phases 1, 4, and 5

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc3Njg4NzA1MiwianRpIjoiYzUwMTY5MzUtZWNkMS00NDExLTgxM2UtZmZmMDYzMmQwZTMwIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6MjYsIm5iZiI6MTc3Njg4NzA1MiwiY3NyZiI6IjE4NTQzNDdiLWNlNWUtNDQwOS1hZjFhLTZkOWZkZjkxMTFlNCIsImV4cCI6MTc3Njg5MDY1Mn0.NhiY81V9e9rzd1JriG95HuGgKFR762DY-6rWGIiCs1o"
BASE_URL="https://bantubuzz.com/api"

echo "=========================================="
echo "API DEPLOYMENT TEST - Campaign Enhancements"
echo "=========================================="
echo ""

# Test 1: Get Campaign Chats
echo "[TEST 1] GET /campaign-chats/campaign/1"
curl -s -X GET "$BASE_URL/campaign-chats/campaign/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool || echo "FAILED"
echo ""
echo "---"
echo ""

# Test 2: Create Broadcast Chat
echo "[TEST 2] POST /campaign-chats/create-broadcast"
curl -s -X POST "$BASE_URL/campaign-chats/create-broadcast" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":1,"title":"Test Broadcast Chat"}' | python3 -m json.tool || echo "FAILED"
echo ""
echo "---"
echo ""

# Test 3: Get Campaign Performance Analytics
echo "[TEST 3] GET /campaigns/1/performance"
curl -s -X GET "$BASE_URL/campaigns/1/performance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool || echo "FAILED"
echo ""
echo "---"
echo ""

# Test 4: Calculate Campaign Payment
echo "[TEST 4] POST /campaign-payments/calculate"
curl -s -X POST "$BASE_URL/campaign-payments/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":1,"collaboration_ids":[1],"payment_type":"individual"}' | python3 -m json.tool || echo "FAILED"
echo ""
echo "---"
echo ""

echo "=========================================="
echo "ALL TESTS COMPLETE"
echo "=========================================="

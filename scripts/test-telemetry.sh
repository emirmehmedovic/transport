#!/bin/bash

echo "🧪 Testing Telemetry API"
echo "========================"
echo ""

# Test 1: Valid position with current time
echo "1️⃣ Test: Valid position (no timestamp - should use current time)"
curl -s -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "kamion0001",
    "lat": 43.8563,
    "lon": 18.4131,
    "speed": 65,
    "bearing": 90
  }' | head -1
echo ""

# Test 2: Valid timestamp
echo "2️⃣ Test: Valid timestamp (should accept)"
VALID_TS=$(date -u +%s)
curl -s -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"kamion0001\",
    \"lat\": 43.8600,
    \"lon\": 18.4200,
    \"speed\": 70,
    \"timestamp\": $VALID_TS
  }" | head -1
echo ""

# Test 3: Invalid timestamp (0 - should reject and use current time)
echo "3️⃣ Test: Invalid timestamp = 0 (should reject, use current time)"
curl -s -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "kamion0001",
    "lat": 43.8650,
    "lon": 18.4300,
    "speed": 75,
    "timestamp": 0
  }' | head -1
echo ""

# Test 4: Invalid timestamp (old date - should reject)
echo "4️⃣ Test: Invalid timestamp = 946684800 (2000-01-01, should reject)"
curl -s -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "kamion0001",
    "lat": 43.8700,
    "lon": 18.4400,
    "speed": 80,
    "timestamp": 946684800
  }' | head -1
echo ""

echo "✅ Tests completed. Check server logs for validation warnings."
echo "💡 Run: 'npx prisma studio' to verify data in database"

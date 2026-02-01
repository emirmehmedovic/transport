#!/bin/bash

echo "🛰️  GPS Position Simulator"
echo "========================"
echo ""
echo "Simulating GPS updates for kamion0001 (Mike Driver)"
echo "Sending positions every 5 seconds..."
echo ""

# Starting position: Sarajevo
LAT=43.8563
LON=18.4131
SPEED=60

# Counter
COUNT=0

while true; do
  COUNT=$((COUNT + 1))

  # Simulate movement (small increments)
  # Moving north-west
  LAT=$(awk "BEGIN {print $LAT + 0.001}")
  LON=$(awk "BEGIN {print $LON - 0.002}")

  # Vary speed slightly
  SPEED=$(awk "BEGIN {print 50 + (RANDOM % 40)}")

  echo "📍 Update #$COUNT: Sending position ($LAT, $LON) @ ${SPEED} km/h"

  curl -s -X POST "http://localhost:3000/api/telemetry" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"kamion0001\",
      \"lat\": $LAT,
      \"lon\": $LON,
      \"speed\": $SPEED,
      \"bearing\": 315,
      \"altitude\": 500,
      \"battery\": 85
    }" | head -1

  echo "   ✓ Sent"
  echo ""

  # Wait 5 seconds
  sleep 5
done

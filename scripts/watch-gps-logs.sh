#!/bin/bash

echo "🔍 Monitoring GPS Telemetry Logs"
echo "=================================="
echo ""
echo "Waiting for next GPS update..."
echo "GPS sends data every 300 seconds (5 minutes) when moving"
echo "or every 1800 seconds (30 minutes) in stationary mode"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Follow the dev server logs and filter for Telemetry lines
tail -f /tmp/next-dev.log | grep --line-buffered "\[Telemetry\]"

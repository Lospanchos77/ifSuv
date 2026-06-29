#!/usr/bin/env bash
set -e

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo
echo "========================================"
echo "  IFSUV - DEV SERVERS"
echo "========================================"
echo

# Check MongoDB
echo "Checking MongoDB..."
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet mongod; then
    echo -e "${GREEN}[OK]${NC} mongod is running (systemd)"
elif pgrep -x mongod >/dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} mongod is running"
elif command -v brew >/dev/null 2>&1 && brew services list 2>/dev/null | grep -q "mongodb-community.*started"; then
    echo -e "${GREEN}[OK]${NC} MongoDB is running (brew services)"
else
    echo -e "${YELLOW}[!]${NC} mongod not detected — make sure MongoDB is running on :27017"
fi

# Kill processes listening on dev ports
echo
echo "Cleaning up ports 3001, 5173..."
for port in 3001 5173; do
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti:"$port" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs -r kill -9 2>/dev/null || true
        fi
    fi
done
echo -e "${GREEN}[OK]${NC} Ports cleared"

echo
echo "========================================"
echo "  Starting all servers..."
echo "  API:      http://localhost:3001/api/v1"
echo "  Swagger:  http://localhost:3001/api/docs"
echo "  Web:      http://localhost:5173"
echo "========================================"
echo
echo "  Press Ctrl+C to stop all servers"
echo

cd "$(dirname "$0")"
pnpm dev

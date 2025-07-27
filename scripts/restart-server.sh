#!/bin/bash

echo "Stopping existing server processes..."
# Kill the server processes
pkill -f "tsx server/index.ts" || true
pkill -f "npm run dev:server" || true

echo "Waiting for processes to stop..."
sleep 2

echo "Starting server with latest changes..."
cd /Users/joshcopp/Desktop/onekeel_swarm
npm run dev:server &

echo "Server restart initiated. Check logs for startup messages."
echo "The API fixes should now be active!"
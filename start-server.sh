#!/bin/bash
# Auto-restart wrapper for Next.js server
while true; do
  echo "[$(date)] Starting server..."
  cd /home/z/my-project
  NODE_OPTIONS="--max-old-space-size=2048" node node_modules/.bin/next start -p 3000 >> dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done

#!/bin/bash
# Keep server alive - restart immediately if it dies
cd /home/z/my-project
while true; do
  npx next start -p 3000 >> dev.log 2>&1
  echo "[$(date)] Server exited, restarting in 1s..." >> dev.log
  sleep 1
done

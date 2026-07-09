#!/bin/bash
while true; do
  if ! ss -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "[$(date)] Server down, restarting..."
    cd /home/z/my-project
    nohup npx next start -p 3000 >> dev.log 2>&1 &
    disown 2>/dev/null
    sleep 3
  fi
  sleep 5
done

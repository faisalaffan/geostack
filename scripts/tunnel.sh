#!/bin/bash
# SSH tunnel — forward VPS services to local ports
# Run: ./scripts/tunnel.sh

VPS_HOST="157.15.40.6"
VPS_PORT="10150"
VPS_USER="ubuntu"

PORTS=(
  "5432:localhost:5432"   # PostgreSQL
  "8081:localhost:8081"   # Keycloak
  "9000:localhost:9000"   # MinIO API
  "9001:localhost:9001"   # MinIO Console
  "3001:localhost:3001"   # Martin
  "3002:localhost:3002"   # TiTiler
  "8080:localhost:8080"   # GeoServer
  "3009:localhost:3000"   # VPS API (for ETL)
)

echo "🔗 Forwarding VPS services to local..."
echo "   PostgreSQL  → localhost:5432"
echo "   Keycloak    → localhost:8081"
echo "   MinIO       → localhost:9000, :9001"
echo "   Martin      → localhost:3001"
echo "   TiTiler     → localhost:3002"
echo "   GeoServer   → localhost:8080"
echo "   VPS API     → localhost:3009 (ETL)"
echo ""
echo " Keep this terminal open. Ctrl+C to stop."

ssh -N ${PORTS[@]/#/-L } "$VPS_USER@$VPS_HOST" -p "$VPS_PORT"

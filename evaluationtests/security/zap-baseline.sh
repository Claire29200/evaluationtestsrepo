#!/usr/bin/env bash
# Lance un scan ZAP "baseline" (passif, non intrusif) contre le frontend et
# l'API réellement démarrés (via docker-compose.prod.yml ou npm run dev).
# Nécessite Docker. Adapter TARGET_FRONTEND / TARGET_BACKEND si besoin.
set -euo pipefail

REPORT_DIR="$(dirname "$0")/../zap-reports"
mkdir -p "$REPORT_DIR"

TARGET_FRONTEND="${TARGET_FRONTEND:-http://host.docker.internal:3000}"
TARGET_BACKEND="${TARGET_BACKEND:-http://host.docker.internal:5005/api/cds}"

echo "=== Scan ZAP baseline : frontend ($TARGET_FRONTEND) ==="
docker run --rm -v "$(realpath "$REPORT_DIR")":/zap/wrk/:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t "$TARGET_FRONTEND" \
  -r zap-report-frontend.html \
  -I

echo "=== Scan ZAP baseline : API backend ($TARGET_BACKEND) ==="
docker run --rm -v "$(realpath "$REPORT_DIR")":/zap/wrk/:rw \
  -t zaproxy/zap-stable zap-baseline.py \
  -t "$TARGET_BACKEND" \
  -r zap-report-backend.html \
  -I

echo "Rapports générés dans $REPORT_DIR"

#!/bin/bash
set -euo pipefail

# ==============================================================================
# FormFlow Production Deployment & SSM Parameter Store Injection Script
# ==============================================================================
# Injects runtime configuration & secrets from AWS SSM Parameter Store directly
# into /opt/formflow/.env (chmod 600) and restarts Docker Compose services.
# ==============================================================================

WORK_DIR="/opt/formflow"
cd "$WORK_DIR"

echo "=== 1. Injecting Secrets & Configuration from AWS SSM Parameter Store ==="
python3 "$WORK_DIR/scripts/ssm-env-inject.py" --output "$WORK_DIR/.env" --region ap-south-1

echo "=== 2. Verifying File Permissions ==="
chmod 600 "$WORK_DIR/.env"
ls -la "$WORK_DIR/.env"

echo "=== 3. Restarting Production Containers via Docker Compose ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" restart

echo "=== 4. Waiting for Services to Initialize ==="
sleep 5

echo "=== 5. Container Status ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" ps

echo "=== 6. Health & Readiness Verification ==="
echo "Testing Web Liveness (:3000/api/health/live)..."
curl -sSf http://localhost:3000/api/health/live || { echo "Web liveness check failed!"; exit 1; }
echo ""

echo "Testing Web Readiness (:3000/api/health/ready)..."
curl -sSf http://localhost:3000/api/health/ready || { echo "Web readiness check failed!"; exit 1; }
echo ""

echo "Testing Worker Liveness (:8081/health/live)..."
curl -sSf http://127.0.0.1:8081/health/live || { echo "Worker liveness check failed!"; exit 1; }
echo ""

echo "Testing Worker Readiness (:8081/health/ready)..."
curl -sSf http://127.0.0.1:8081/health/ready || { echo "Worker readiness check failed!"; exit 1; }
echo ""

echo "=== Deployment & SSM Injection Complete Successfully ==="

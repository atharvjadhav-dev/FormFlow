#!/bin/bash
set -euo pipefail

# ==============================================================================
# FormFlow Production Deployment & SSM Parameter Store Injection Script
# ==============================================================================
# Automates:
# 1. Safe Git fetch and checkout of target commit/version
# 2. SSM Parameter Store runtime configuration & secret injection (.env chmod 600)
# 3. Native ARM64 Docker image builds on Graviton2 EC2 host
# 4. Database schema migration runner (formflow-migrate)
# 5. Production Docker Compose deployment (formflow-web, formflow-worker)
# 6. Automated health & readiness verification
# 7. Version tracking for safe deployment identification and rollback
# ==============================================================================

WORK_DIR="/opt/formflow"
cd "$WORK_DIR"

git config --global --add safe.directory "$WORK_DIR" || true

TARGET_VERSION="${1:-HEAD}"
PREVIOUS_VERSION="unknown"
if [ -f "$WORK_DIR/.current_version" ]; then
  PREVIOUS_VERSION=$(head -n 1 "$WORK_DIR/.current_version" 2>/dev/null || echo "unknown")
fi

echo "=== FormFlow Deployment Starting ==="
echo "Target version requested: $TARGET_VERSION"
echo "Previous running version: $PREVIOUS_VERSION"

# 1. Update Git repository
echo "=== 1. Syncing Code from Origin ==="
git fetch origin main
if [ "$TARGET_VERSION" != "HEAD" ] && [ -n "$TARGET_VERSION" ]; then
  echo "Checking out commit $TARGET_VERSION..."
  git checkout "$TARGET_VERSION"
else
  git checkout main
  git pull origin main
fi

CURRENT_SHA=$(git rev-parse HEAD)
echo "Active deployed commit: $CURRENT_SHA"

# 2. Inject secrets & runtime configuration
echo "=== 2. Injecting Secrets from AWS SSM Parameter Store ==="
python3 "$WORK_DIR/scripts/ssm-env-inject.py" --output "$WORK_DIR/.env" --region ap-south-1
chmod 600 "$WORK_DIR/.env"

# 3. Build Docker images locally on EC2 (ARM64)
echo "=== 3. Building Production Docker Images (ARM64) ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" build

# 4. Run database migrations
echo "=== 4. Executing Database Migrations ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" run --rm formflow-migrate

# 5. Start/restart services
echo "=== 5. Launching Production Containers ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" up -d --remove-orphans

# 6. Wait for services to initialize
echo "=== 6. Waiting for Services to Initialize ==="
sleep 8

# 7. Container status
echo "=== 7. Container Status ==="
docker compose -f "$WORK_DIR/docker-compose.prod.yml" ps

# 8. Health checks
echo "=== 8. Health & Readiness Verification ==="
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

# Record new version only after successful health checks
cat <<EOF > "$WORK_DIR/.current_version"
$CURRENT_SHA
deployed_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
previous_version: $PREVIOUS_VERSION
EOF

echo "=== Deployment Succeeded! Running version: $CURRENT_SHA ==="


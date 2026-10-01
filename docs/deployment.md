# FormFlow Container & ECR Deployment Guide

This document outlines the container architecture, tagging strategy, and Amazon ECR publishing workflow for the FormFlow production images.

---

## 1. Container Images

FormFlow runs three production container workloads:

| Image | Dockerfile | Runtime Command | Base Image | Non-Root User | Ports / Probes |
|---|---|---|---|---|---|
| **formflow-web** | `Dockerfile` | `node server.js` | `node:20-alpine` | `nextjs` (UID 1001) | `3000` (`/api/health/live`, `/api/health/ready`) |
| **formflow-worker** | `Dockerfile.worker` | `node dist/worker/index.js` | `node:20-alpine` | `worker` (UID 1001) | `8081` (`/health/live`, `/health/ready`) |
| **formflow-migrate** | `Dockerfile.migrate` | `node dist/db/migrate.js` | `node:20-alpine` | `migrate` (UID 1001) | Run-to-completion (exits on finish) |

---

## 2. Amazon ECR Registry Architecture

- **AWS Region**: `ap-south-1` (Mumbai)
- **Account ID**: `081897152686`
- **Registry URI**: `081897152686.dkr.ecr.ap-south-1.amazonaws.com`
- **Repositories**:
  - `formflow-web`
  - `formflow-worker`
  - `formflow-migrate`
- **Image Scanning**: Enabled on push (`scanOnPush=true`)
- **Tag Immutability**: Enabled for release tags

---

## 3. Tagging Strategy

Every image pushed to Amazon ECR receives three tags:
1. `latest` — Floating tag for latest stable production build
2. `<short-sha>` (e.g. `aa07123`) — 7-character Git commit SHA for deployment tracking
3. `<full-sha>` (e.g. `aa07123aaa90ca5544bc55aa3bc740f0f40278ab`) — Full 40-character Git SHA for immutable auditability

---

## 4. ECR Push Workflow

### Prerequisites
- AWS CLI configured with ECR permissions (`AmazonEC2ContainerRegistryPowerUser` or Administrator)
- Docker Desktop or Docker Engine installed and running

### Step 1: Authenticate Docker to Amazon ECR
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 081897152686.dkr.ecr.ap-south-1.amazonaws.com
```

### Step 2: Build & Push Images
```bash
# Set Git SHA
GIT_SHA=$(git rev-parse --short HEAD)
GIT_FULL_SHA=$(git rev-parse HEAD)
REGISTRY="081897152686.dkr.ecr.ap-south-1.amazonaws.com"

# 1. Build and Push formflow-web
docker buildx build --provenance=false --push \
  -f Dockerfile \
  -t ${REGISTRY}/formflow-web:latest \
  -t ${REGISTRY}/formflow-web:${GIT_SHA} \
  -t ${REGISTRY}/formflow-web:${GIT_FULL_SHA} .

# 2. Build and Push formflow-worker
docker buildx build --provenance=false --push \
  -f Dockerfile.worker \
  -t ${REGISTRY}/formflow-worker:latest \
  -t ${REGISTRY}/formflow-worker:${GIT_SHA} \
  -t ${REGISTRY}/formflow-worker:${GIT_FULL_SHA} .

# 3. Build and Push formflow-migrate
docker buildx build --provenance=false --push \
  -f Dockerfile.migrate \
  -t ${REGISTRY}/formflow-migrate:latest \
  -t ${REGISTRY}/formflow-migrate:${GIT_SHA} \
  -t ${REGISTRY}/formflow-migrate:${GIT_FULL_SHA} .
```

### Step 3: Verify Images in ECR
```bash
aws ecr describe-images --repository-name formflow-web --region ap-south-1 --output json
aws ecr describe-images --repository-name formflow-worker --region ap-south-1 --output json
aws ecr describe-images --repository-name formflow-migrate --region ap-south-1 --output json
```

---

## 5. Security & Isolation Standards
- **Zero Secrets**: No `.env` or credentials baked into any image layer (`.dockerignore` strictly excludes `.env*`, `.git`, `node_modules`).
- **Least Privilege**: All containers drop root privileges and execute as dedicated non-root service accounts.
- **Minimal Surface**: Multi-stage builds strip devDependencies, build tools (`tsc`, `tsx`), and source TypeScript from final runner stages.

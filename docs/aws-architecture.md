# FormFlow — AWS Production Architecture Design

> **Document Version**: 1.0.0  
> **Status**: APPROVED ARCHITECTURE DESIGN (Pre-Provisioning)  
> **Target Region**: `ap-south-1` (Mumbai)  
> **AWS Account ID**: `081897152686`  
> **Constraint**: Design Only — Zero AWS Resources Provisioned  

---

## 1. Architecture Overview

FormFlow is a multi-tenant form builder and high-concurrency submission platform. The architecture is engineered for a **lean, small-budget initial production deployment** that avoids costly managed services while guaranteeing security, tenant isolation via PostgreSQL Row-Level Security (RLS), and a smooth upgrade path to Kubernetes (EKS).

```
                      INTERNET
                         │
                         ▼
             Amazon Route 53 (DNS)
                         │
                         ▼
        AWS Certificate Manager (ACM Free SSL)
                         │
                         ▼
       Application Load Balancer (ALB)
            [Public Subnets across AZ-a & AZ-b]
            (HTTPS:443 ──> HTTP:3000)
                         │
                         ▼
     ┌───────────────────────────────────────────────┐
     │  Amazon EC2 Compute Host (t4g.small)          │
     │  [Public Subnet 1a - Shielded by Security Grp]│
     │                                               │
     │   ┌──────────────────────────────────────┐    │
     │   │ Docker Engine                        │    │
     │   │                                      │    │
     │   │ ├── formflow-web (Next.js :3000)     │    │
     │   │ ├── formflow-worker (SQS Consumer)   │    │
     │   │ ├── formflow-migrate (Ephemeral Job) │    │
     │   │ └── Redis 7 (Local Container :6379)  │    │
     │   └──────────────────────────────────────┘    │
     └───────┬──────────────────────────┬────────────┘
             │                          │
             ▼                          ▼
  Amazon RDS PostgreSQL 16      Amazon S3 & SQS
  (db.t4g.micro / gp3)         ├── S3: Form Attachments
  [Private Isolated Subnet]    └── SQS: Submissions Queue + DLQ
  (Port 5432 - sg-ec2 only)        (Serverless Pay-As-You-Go)
```

---

## 2. AWS Service Choices & Workload Placement

| Component | Proposed Service | Resource Sizing | State Type | Why Selected | Scaling & Cost Strategy |
|---|---|---|---|---|---|
| **FormFlow Web** | Docker on EC2 (`t4g.small`) | ~0.5 vCPU, 768MB RAM | Stateless | Low-cost, predictable pricing, handles Next.js SSR and API routes. | Scale vertically to `t4g.medium`, then horizontally behind ALB. Cost: ~$12/mo. |
| **FormFlow Worker** | Docker on EC2 (`t4g.small`) | ~0.25 vCPU, 384MB RAM | Stateless | Co-located on the same EC2 host to maximize resource utilization at initial scale. | Scale horizontally by increasing container replicas or moving to separate worker pool. Cost: $0 extra. |
| **Migration Job** | Docker on EC2 (Run-to-completion) | ~0.25 vCPU, 256MB RAM | Stateless | Runs sequentially during deployments (`docker run --rm formflow-migrate`) and exits. | Ephemeral execution (5–15 seconds per release). Cost: $0. |
| **PostgreSQL 16** | **Amazon RDS PostgreSQL** (`db.t4g.micro`) | 2 vCPU (burst), 1GB RAM, 20GB gp3 | Stateful | **Crucial**: Automated snapshots, Point-In-Time-Recovery (PITR), managed patching. | Storage auto-scaling up to 64TB; upgrade instance size with zero data loss. Cost: ~$13/mo (Free Tier eligible). |
| **Redis 7** | **Docker Container on EC2** | ~128MB RAM, minimal CPU | Semi-Stateful | Used strictly for public form schema caching and rate limiting. No business truth is stored here. | Backed by EBS volume (AOF/RDB). Seamlessly migrate to Amazon ElastiCache when multi-instance fleet requires shared cache. Cost: $0 extra. |
| **Object Storage** | **Amazon S3 Standard** | Serverless / On-demand | Stateful | 99.999999999% durability, presigned URLs bypass compute server for uploads/downloads. | Unlimited auto-scaling. S3 Lifecycle rules move old submissions to Glacier. Cost: ~$0.023/GB/mo (<$1/mo initially). |
| **Message Queue** | **Amazon SQS + DLQ** | Serverless / On-demand | Stateful Queue | Decouples public submissions from background indexing, email, and AI evaluation. | Unlimited auto-scaling. 1M free requests/mo. Cost: ~$0.40/mo. |

---

## 3. VPC & Subnet Design

The Virtual Private Cloud (VPC) uses standard CIDR allocation allowing substantial future growth for secondary microservices, multi-node Kubernetes pod networking, or database read-replicas.

### 3.1 CIDR Specifications
- **VPC CIDR**: `10.0.0.0/16` (65,536 private IPv4 addresses)
- **Region**: `ap-south-1` (Mumbai)
- **Availability Zones**: 2 AZs (`ap-south-1a`, `ap-south-1b`)

### 3.2 Subnet Layout

```
VPC: 10.0.0.0/16
├── Public Subnets (Internet Gateway attached)
│   ├── public-1a: 10.0.1.0/24  (ALB Primary + EC2 Host)
│   └── public-1b: 10.0.2.0/24  (ALB Secondary AZ requirement)
│
├── Private Application Subnets (Reserved for Future Private Compute / EKS)
│   ├── private-app-1a: 10.0.10.0/24
│   └── private-app-1b: 10.0.20.0/24
│
├── Private Database Subnets (Completely Isolated - No Internet Gateway)
│   ├── private-db-1a:  10.0.100.0/24 (RDS PostgreSQL Primary)
│   └── private-db-1b:  10.0.200.0/24 (RDS PostgreSQL Subnet Group)
│
└── Spare CIDR Space for Future Expansion (EKS Pod Network, Secondary AZs)
    └── 10.0.32.0/19, 10.0.64.0/18
```

### 3.3 Routing Architecture
1. **Public Route Table** (`rt-public`):
   - `10.0.0.0/16` → `local`
   - `0.0.0.0/0` → `igw-xxxx` (Internet Gateway)
   - Associated Subnets: `10.0.1.0/24`, `10.0.2.0/24`
2. **Private Database Route Table** (`rt-private-db`):
   - `10.0.0.0/16` → `local`
   - NO route to `0.0.0.0/0` (isolated database layer cannot be routed to or from the internet).
   - Associated Subnets: `10.0.100.0/24`, `10.0.200.0/24`

### 3.4 NAT Gateway Cost Avoidance Decision
- **AWS Managed NAT Gateway Cost**: ~$32.40/month per gateway + $0.045/GB data processing.
- **Decision for Small Initial Budget**:
  - Placing the EC2 instance in `public-1a` with an Elastic IP allows the host to pull Docker images from ECR, poll SQS, and access Clerk/Gemini APIs directly via the Internet Gateway for **$0 extra monthly cost**.
  - **Security Guarantee**: The EC2 instance is shielded by `sg-ec2`, which denies all inbound traffic from the internet except from `sg-alb` on port 3000. SSH is restricted to admin IP or managed via AWS Systems Manager Session Manager (SSM) with **zero inbound ports open**.
  - The PostgreSQL database remains **100% private** in `private-db-1a`/`private-db-1b` with no public IP and no internet route.
  - **Savings**: **~$33 to $65 / month**.

---

## 4. Security Boundaries & Security Groups

Zero-trust, least-privilege network security boundaries between tiers:

```
    [ Internet ]
         │ HTTPS : 443
         ▼
 ┌───────────────┐
 │    sg-alb     │ Ingress: 443 from 0.0.0.0/0, 80 from 0.0.0.0/0 (redirects to 443)
 └───────┬───────┘ Egress:  3000 to sg-ec2
         │
         │ HTTP : 3000 (Private VPC Traffic)
         ▼
 ┌───────────────┐
 │    sg-ec2     │ Ingress: 3000 from sg-alb ONLY
 └───────┬───────┘ Egress:  5432 to sg-rds, 443 to 0.0.0.0/0 (AWS APIs, Clerk, Gemini)
         │         (SSH port 22: None / SSM Session Manager only)
         │
         │ PostgreSQL : 5432 (Internal VPC Traffic)
         ▼
 ┌───────────────┐
 │    sg-rds     │ Ingress: 5432 from sg-ec2 ONLY
 └───────────────┘ Egress:  None
```

### Port Matrix

| Security Group | Inbound Rule | Protocol / Port | Source | Justification |
|---|---|---|---|---|
| **`sg-alb`** | Allow | TCP 443 (HTTPS) | `0.0.0.0/0` | Public application traffic from web browsers. |
| **`sg-alb`** | Allow | TCP 80 (HTTP) | `0.0.0.0/0` | Permanent redirect (HTTP 301) to HTTPS. |
| **`sg-ec2`** | Allow | TCP 3000 | `sg-alb` ID | Only the load balancer can forward web requests. |
| **`sg-ec2`** | Allow | TCP 22 (SSH) | Admin IP / Disabled | Optional jump host rule; preferred via AWS SSM Session Manager (no open port). |
| **`sg-rds`** | Allow | TCP 5432 | `sg-ec2` ID | Strictly allows PostgreSQL connections originating from the application EC2 host. |

*Note*: Redis binds to `127.0.0.1:6379` inside the EC2 Docker bridge. It is **never exposed** on the host's public interface or permitted in security group rules.

---

## 5. Storage and Messaging Architecture

### 5.1 Amazon S3 (Submissions & Attachments)
- **Bucket**: `formflow-submissions-081897152686`
- **S3 Block Public Access**: All 4 settings `ENABLED` (No public access under any circumstances).
- **Server-Side Encryption**: `SSE-S3` (AES-256) enabled by default at zero additional cost.
- **Direct-to-S3 Upload Flow**:
  1. Applicant browser requests presigned URL from FormFlow web (`/api/forms/[slug]/presign`).
  2. Next.js validates file size, MIME type, and tenant quotas, generating a signed `PUT` URL with a 5-minute expiry.
  3. Browser uploads the binary payload directly to S3.
  4. FormFlow web and database only ever touch metadata (`fileKey`, `fileName`, `fileSize`, `mimeType`).
- **Download Flow**: Admin dashboard generates signed `GET` URLs with 15-minute expiry.

### 5.2 Amazon SQS (Async Submission Queue & DLQ)
- **Primary Queue**: `formflow-submissions-queue` (Standard SQS Queue)
  - Purpose: Buffers burst submissions during high-traffic form window openings (e.g. 1,000 students submitting simultaneously).
  - Message Retention: 4 days.
  - Delivery Delay: 0 seconds.
  - Visibility Timeout: **120 seconds** (sufficient for worker download, virus check, AI evaluation, and DB commit).
- **Dead-Letter Queue (DLQ)**: `formflow-submissions-dlq`
  - Max Receive Count: **5** (messages that fail 5 consecutive processing attempts are automatically diverted to DLQ).
  - Message Retention: **14 days** (provides operators 2 weeks to debug poisoned payloads and trigger redrive).
  - CloudWatch Alarm: Alert when `ApproximateNumberOfMessagesVisible > 0` on DLQ.

---

## 6. Database Architecture: RDS vs EC2

| Criterion | Option A: Amazon RDS PostgreSQL 16 | Option B: PostgreSQL on EC2 |
|---|---|---|
| **Estimated Monthly Cost** | ~$13.00 – $15.00/mo (Free Tier eligible) | ~$10.00 – $14.00/mo (EBS + compute slice) |
| **Automated Backups** | Built-in continuous WAL streaming + 7-day point-in-time recovery (PITR) to any second. | Manual bash scripts + cron + `pg_dump` to S3 (untested failure modes). |
| **High Availability & Recovery** | Automated hardware failover, multi-AZ option available at one click. | Manual recovery if host crashes or disk corrupts. |
| **Maintenance & Patching** | Managed OS security patching and minor version upgrades. | Full operator burden to maintain Linux host and Postgres binaries. |
| **Scaling Capability** | One-click storage auto-scaling up to 64TB; instant compute upgrades. | Risky manual filesystem volume resizing and EBS re-striping. |
| **Operational Complexity** | **Very Low** | **High** |

### Database Decision
**Selected: Option A (Amazon RDS PostgreSQL 16)**  
*Rationale*: In a multi-tenant platform with Row-Level Security, the database is the primary store of business truth. Saving ~$3–$5/month by hosting Postgres on EC2 introduces an unacceptable risk of catastrophic data loss, manual backup rot, and disk corruption. RDS `db.t4g.micro` provides managed reliability and PITR at negligible cost.

---

## 7. Redis Architecture: Container on EC2 vs ElastiCache

| Criterion | Option A: Redis Container on EC2 | Option B: Amazon ElastiCache Redis |
|---|---|---|
| **Estimated Monthly Cost** | **$0.00** (Shares EC2 host compute/memory) | ~$13.00 – $17.00/mo (`cache.t4g.micro`) |
| **Reliability** | Docker restart policy (`always`), local memory speed (<0.2ms latency). | High (Managed cluster/node monitoring). |
| **Persistence** | EBS-backed Docker named volume with AOF / RDB snapshots enabled. | Optional automated snapshots. |
| **Maintenance** | Minimal (Standard `redis:7-alpine` image). | Fully managed by AWS. |
| **Scaling** | Easily handles 50,000+ ops/sec on single instance; sufficient for initial scale. | Horizontal cluster scaling across AZs. |

### Redis Decision
**Selected: Option A (Redis Container on EC2)**  
*Rationale*: FormFlow uses Redis exclusively for thundering-herd public form schema caching and rate-limiting. It stores **no permanent business records**. If Redis restarts or is flushed, FormFlow gracefully queries PostgreSQL and re-populates the cache. Paying ~$15/month for ElastiCache on a lean budget is unnecessary. When FormFlow scales to multiple EC2 instances, migrating to ElastiCache is a simple one-line environment variable change (`REDIS_URL`).

---

## 8. Kubernetes Consideration (EKS / K3s Roadmap)

FormFlow's three container images (`formflow-web`, `formflow-worker`, `formflow-migrate`) are already structured as cloud-native microservices.

### Phase 4 (Current): Docker Engine on EC2
- Managed via `docker-compose` or standalone container run commands on the EC2 host.
- Single-host simplicity, minimal resource overhead.

### Phase 5 (Intermediate): Self-Managed K3s on EC2
- K3s can be installed on a single `t4g.medium` instance (<500MB RAM footprint).
- Enables native Kubernetes primitives:
  - `Deployment`: `formflow-web` (replicas: 2)
  - `Deployment`: `formflow-worker` (replicas: 2)
  - `Job`: `formflow-migrate` (runs before deployment rollout)
  - `HorizontalPodAutoscaler` (HPA) based on CPU/memory.

### Phase 6 (Enterprise Scale): Amazon EKS
- **What changes when transitioning to EKS**:
  1. **Control Plane Fee**: Adds ~$73.00/month ($0.10/hour).
  2. **VPC Subnet Tagging**: Subnets receive `kubernetes.io/role/elb = 1` and `kubernetes.io/role/internal-elb = 1`.
  3. **Ingress Controller**: AWS Load Balancer Controller provisions ALB dynamically from Kubernetes Ingress manifests.
  4. **IAM Authentication**: Replace EC2 instance profiles with EKS Pod Identity or IAM Roles for Service Accounts (IRSA).
  5. **Shared Redis**: Transition from local Redis container to Amazon ElastiCache so all multi-node pods share one cluster cache.

---

## 9. Traffic Architecture & CloudFront vs ALB

### Request Path
```
Client Web Browser
       │
       ▼
Amazon Route 53 (DNS Alias `A` Record)
       │
       ▼
AWS Certificate Manager (ACM - Wildcard SSL `*.yourdomain.com`)
       │
       ▼
Application Load Balancer (ALB)
  ├── Port 80  ──> HTTP 301 Redirect to HTTPS 443
  └── Port 443 ──> Target Group: EC2 Host on Port 3000
                         │
                         ▼
             formflow-web Container (:3000)
```

### Initial Deployment: ALB Alone vs CloudFront + ALB
- **ALB Alone Initially**:
  - Handles SSL/TLS termination, HTTP-to-HTTPS redirects, health-check monitoring (`/api/health/live`), and reverse proxying to Next.js.
  - FormFlow's core value is dynamic: multi-tenant dashboards, draft builders, live window validation (`/api/forms/[slug]`), and authenticated Clerk sessions.
  - ALB alone is simpler to deploy, avoids edge-cache invalidation issues when forms are edited/published, and costs less.
- **When to Add CloudFront (Phase 4.2 / Spike Scale)**:
  - Add CloudFront as a CDN distribution in front of the ALB when public form views spike (e.g. 10,000+ simultaneous applicants).
  - Cache static assets (`/_next/static/*`) and public form schemas at AWS edge locations to offload 90% of read traffic from the ALB and EC2 instance.
- **Decision**: **Launch initial production with ALB + ACM**. Introduce CloudFront when public submission volume warrants edge caching.

---

## 10. Cost Architecture

> [!NOTE]  
> All pricing figures are approximate estimates based on AWS `ap-south-1` (Mumbai) on-demand rates and are subject to AWS pricing updates and usage volume.

### Estimate 1: Minimum-Cost Dev / Staging Environment

| Service | Configuration | Estimated Monthly Cost |
|---|---|---|
| **EC2 Compute** | 1x `t4g.small` (2 vCPU, 2GB RAM, ARM) | ~$12.26 |
| **EBS Storage** | 30 GB gp3 (Host OS + Docker images + Redis volume) | ~$2.40 |
| **RDS PostgreSQL** | `db.t4g.micro` (Single-AZ, 20GB gp3) | $0.00 (Free Tier yr 1) or ~$13.00 |
| **Amazon S3** | Standard storage (<5GB) + API calls | ~$0.20 |
| **Amazon SQS** | Standard queue (<1M requests/mo) | $0.00 (Free Tier) |
| **NAT Gateway** | None (EC2 in public subnet with strict SG) | **$0.00** |
| **Load Balancer** | None (Direct EIP with Caddy/Nginx reverse proxy) | $0.00 |
| **Total Dev/Staging** | | **~$15 – $28 / month** |

---

### Estimate 2: Small Production Deployment (High Security & SSL)

| Service | Configuration | Estimated Monthly Cost |
|---|---|---|
| **Application Load Balancer** | 1x ALB (Dual AZ, ~1–2 LCUs) | ~$16.00 – $20.00 |
| **AWS ACM** | SSL/TLS Certificate for custom domain | **$0.00** (Free) |
| **Route 53** | 1x Hosted Zone + basic DNS queries | ~$0.55 |
| **EC2 Compute** | 1x `t4g.small` (Web + Worker + Redis) | ~$12.26 |
| **EBS Storage** | 40 GB gp3 (Docker images, logs, Redis persistence) | ~$3.20 |
| **RDS PostgreSQL** | `db.t4g.micro` (Single-AZ, 20GB gp3 storage) | ~$13.00 – $15.00 |
| **Amazon S3** | Standard Storage (~10GB) + Data Transfer Out | ~$1.00 – $2.50 |
| **Amazon SQS** | Form submissions + DLQ processing | ~$0.40 |
| **AWS ECR** | Container image storage (3 repositories, ~600MB) | ~$0.06 |
| **NAT Gateway** | None (Cost avoidance strategy) | **$0.00** |
| **Total Small Production** | | **~$46 – $55 / month** |

---

### Cost Dominators & Optimization Levers

1. **Managed NAT Gateway** (~$32.40/month each): **Eliminated** in this design by placing the EC2 instance in a public subnet with a tight security group.
2. **EKS Control Plane** (~$73.00/month): **Eliminated** initially; container orchestration runs directly via Docker Engine.
3. **ElastiCache Redis** (~$15.00/month): **Eliminated**; Redis runs as a lightweight container on the EC2 host.
4. **Primary Remaining Costs**:
   - **ALB** (~$16–$20/mo): Necessary for seamless SSL termination, zero-downtime rolling deploys, and health checks.
   - **RDS PostgreSQL** (~$13–$15/mo): Essential insurance against data loss, providing automated backups and PITR.

---

## 11. Future Scaling Path

```
Stage 1 (Current Design): Single EC2 Host + Local Redis + RDS + S3/SQS
  │ Capacity: ~500 req/sec (~1,000–5,000 daily submissions)
  │ Cost: ~$48/month
  ▼
Stage 2: Add CloudFront CDN + Compute Auto Scaling Group (ASG)
  │ Action: Separate web and worker across 2x t4g.small instances behind ALB.
  │ Move Redis to Amazon ElastiCache Serverless or t4g.micro cluster.
  │ Capacity: ~2,500 req/sec
  │ Cost: ~$95/month
  ▼
Stage 3: Full Kubernetes Migration (Amazon EKS)
  │ Action: Provision EKS cluster, deploy Karpenter or Managed Node Groups.
  │ Deploy HPA scaling workers dynamically based on SQS queue depth.
  │ Capacity: 10,000+ req/sec (Enterprise High Concurrency)
  │ Cost: ~$200+/month
```

---

## 12. Security Considerations & Checklist

- [x] **Zero Hardcoded Secrets**: Runtime configuration injected exclusively via environment variables or AWS Systems Manager Parameter Store.
- [x] **Non-Root Containers**: `formflow-web` runs as `nextjs` (UID 1001), `formflow-worker` runs as `worker` (UID 1001), `formflow-migrate` runs as `migrate` (UID 1001).
- [x] **Database Isolation**: PostgreSQL has no public IP, lives in a dedicated private subnet group, and rejects connections from any source other than `sg-ec2`.
- [x] **Row-Level Security (RLS)**: Enforced at the database engine level via `withOrg()` session transactions (`SET LOCAL app.current_org_id`).
- [x] **Zero Inbound SSH**: EC2 administration managed via AWS Systems Manager Session Manager (`ssm:StartSession`), eliminating the need to expose port 22 to the public internet.
- [x] **S3 Bucket Lockdown**: Block Public Access 100% enabled; presigned URLs with short TTLs (5–15 min) are the sole access gateway.
- [x] **SQS Poison Message Quarantine**: DLQ configured with 5-retry cutoff and 14-day retention.

---

## 13. Actual Provisioned Network Resources (Phase 4.2)

The following resources were provisioned in `ap-south-1` (Mumbai) during **Phase 4.2: Provision AWS VPC & Networking**:

### 13.1 VPC
- **VPC ID**: `vpc-07ccd486e95bcf90b`
- **Name**: `formflow-vpc`
- **CIDR Block**: `10.0.0.0/16`
- **DNS Support**: Enabled (`EnableDnsSupport: true`)
- **DNS Hostnames**: Enabled (`EnableDnsHostnames: true`)
- **Tags**: `Project=FormFlow`, `Environment=production`, `ManagedBy=manual`, `Owner=FormFlow`, `Name=formflow-vpc`

### 13.2 Subnets (Single-AZ: `ap-south-1a`)
> [!NOTE]  
> FormFlow initially provisions within a **Single Availability Zone (`ap-south-1a`)** with **zero NAT Gateways** to optimize for a lean, low-traffic portfolio deployment. Multi-AZ is documented as a future high-availability scaling enhancement.

| Subnet Name | Subnet ID | CIDR Block | Availability Zone | Type | Auto-Assign Public IP | Route Table |
|---|---|---|---|---|---|---|
| **`formflow-public-1a`** | `subnet-0af80484dc390e5f7` | `10.0.1.0/24` | `ap-south-1a` | Public | **Yes** (`true`) | `rtb-05fba685c4b17e516` |
| **`formflow-db-1a`** | `subnet-014db5ad21530af11` | `10.0.100.0/24` | `ap-south-1a` | Private DB | **No** (`false`) | `rtb-0959b6e178487a0f7` |

### 13.3 Internet Gateway
- **Internet Gateway ID**: `igw-0d0997aa15ae2a0e6`
- **Name**: `formflow-igw`
- **Attachment**: Attached to `vpc-07ccd486e95bcf90b` (`formflow-vpc`)

### 13.4 Route Tables

1. **`formflow-public-rt` (`rtb-05fba685c4b17e516`)**:
   - Routes:
     - `10.0.0.0/16` → `local` (VPC Local)
     - `0.0.0.0/0` → `igw-0d0997aa15ae2a0e6` (Internet Gateway)
   - Association: `subnet-0af80484dc390e5f7` (`formflow-public-1a`)

2. **`formflow-db-rt` (`rtb-0959b6e178487a0f7`)**:
   - Routes:
     - `10.0.0.0/16` → `local` (VPC Local)
     - **NO `0.0.0.0/0` ROUTE** (Completely isolated from the public internet)
   - Association: `subnet-014db5ad21530af11` (`formflow-db-1a`)

### 13.5 Security Groups & Traffic Rules

```
[ Internet ]
     │ (80 / 443)
     ▼
┌────────────────────────┐
│ formflow-alb-sg        │ ID: sg-08b5329b7ac3489f6
│ Ingress: 80, 443       │ Source: 0.0.0.0/0
└───────────┬────────────┘
            │ Port 3000
            ▼
┌────────────────────────┐
│ formflow-ec2-sg        │ ID: sg-0cc81da3744c9bd0e
│ Ingress: 3000          │ Source: sg-08b5329b7ac3489f6 ONLY (No 0.0.0.0/0, No port 22)
└───────────┬────────────┘
            │ Port 5432
            ▼
┌────────────────────────┐
│ formflow-rds-sg        │ ID: sg-0acc9f39ff6f0b6d5
│ Ingress: 5432          │ Source: sg-0cc81da3744c9bd0e ONLY (No 0.0.0.0/0)
└────────────────────────┘
```

| Security Group Name | Security Group ID | Inbound Rule | Protocol / Port | Allowed Source | Outbound Policy |
|---|---|---|---|---|---|
| **`formflow-alb-sg`** | `sg-08b5329b7ac3489f6` | Allow | TCP 80, 443 | `0.0.0.0/0` | Default all-outbound |
| **`formflow-ec2-sg`** | `sg-0cc81da3744c9bd0e` | Allow | TCP 3000 | `sg-08b5329b7ac3489f6` | Default all-outbound (HTTPS 443 to internet, 5432 to RDS) |
| **`formflow-rds-sg`** | `sg-0acc9f39ff6f0b6d5` | Allow | TCP 5432 | `sg-0cc81da3744c9bd0e` | Default all-outbound |

### 13.6 Cost Avoidance & Resource Boundary Verification
- **NAT Gateways**: **0** (Verified `NatGateways: []`, saving ~$32.40/month)
- **RDS Databases**: **0** (Reserved for Phase 4.4)
- **Application Load Balancers**: **0** (Reserved for future ALB phase)
- **ElastiCache Clusters**: **0**
- **SQS Queues / S3 Buckets / CloudFront Distributions**: **0** (Scope restricted strictly to VPC & networking)

---

## 14. Actual Provisioned EC2 & ASG Foundation (Phase 4.3)

The compute foundation for FormFlow was provisioned and verified in **Phase 4.3: Provision EC2 + Auto Scaling Group Foundation**:

> [!IMPORTANT]  
> **CURRENT REAL DEPLOYMENT**:  
> **Single-AZ (`ap-south-1a`)**, **1 desired EC2 (`t4g.small` ARM64)**, **max 2**.  
> Multi-AZ and multi-node compute are documented as a future scaling path, but intentionally NOT provisioned to keep costs near zero for this portfolio deployment.

### 14.1 IAM Instance Role & Profile
- **Role Name**: `formflow-ec2-role`
- **Role ARN**: `arn:aws:iam::081897152686:role/formflow-ec2-role`
- **Trust Relationship**: `ec2.amazonaws.com`
- **Attached Policies** (Strict Least Privilege — Zero AdministratorAccess):
  1. `arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly` (Allows pulling images from Amazon ECR)
  2. `arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore` (Allows secure SSM Session Manager shell access with zero open inbound ports)
- **Instance Profile Name**: `formflow-ec2-profile`
- **Instance Profile ARN**: `arn:aws:iam::081897152686:instance-profile/formflow-ec2-profile`

### 14.2 Operating System & AMI
- **AMI ID**: `ami-0cf36b0c962e50fd7`
- **AMI Name**: `al2023-ami-2023.12.20260930.0-kernel-6.18-arm64`
- **Platform**: Amazon Linux 2023 (AL2023)
- **Architecture**: `arm64` (AWS Graviton)

### 14.3 Launch Template
- **Launch Template Name**: `formflow-launch-template`
- **Launch Template ID**: `lt-07d9bf39007ea21b7`
- **Default / Latest Version**: `1` (`$Latest`)
- **Instance Type**: `t4g.small` (ARM64, 2 vCPU, 2 GiB RAM)
- **Storage Configuration**: 20 GiB `gp3` root EBS volume (`/dev/xvda`), **Encrypted**, `DeleteOnTermination: true`
- **Network Interface**:
  - Security Group: `sg-0cc81da3744c9bd0e` (`formflow-ec2-sg`)
  - Auto-assign Public IP: `true`
- **User Data / Bootstrap Script**:
  - Automatically installs Docker via `dnf install -y docker`
  - Starts and enables Docker engine (`systemctl enable --now docker`)
  - Adds `ec2-user` to `docker` group
  - Starts and enables `amazon-ssm-agent`
  - Validates and logs bootstrap completion to `/var/log/formflow-bootstrap.log`
  - **Zero Hardcoded Secrets**: Does NOT contain access keys, DB passwords, Clerk keys, or Gemini keys.

### 14.4 Auto Scaling Group (ASG)
- **ASG Name**: `formflow-asg`
- **ASG ARN**: `arn:aws:autoscaling:ap-south-1:081897152686:autoScalingGroup:89715e0b-8ce9-4aac-af0a-21e878971522:autoScalingGroupName/formflow-asg`
- **Launch Template**: `formflow-launch-template` (Version: `$Latest`)
- **VPC Subnet**: `subnet-0af80484dc390e5f7` (`formflow-public-1a`) ONLY
- **Availability Zone**: `ap-south-1a` ONLY
- **Capacity**:
  - **Minimum**: `1`
  - **Desired**: `1`
  - **Maximum**: `2`
- **Health Check Type**: `EC2`
- **Health Check Grace Period**: `300 seconds`
- **Termination Policy**: `Default`

### 14.5 Active EC2 Instance
- **Instance ID**: `i-0dc760f5cb3864cdd`
- **State**: `running` (Health Status: `Healthy`, Lifecycle: `InService`)
- **Private IPv4**: `10.0.1.90`
- **Public IPv4**: `15.206.153.85`
- **SSM Agent Status**: **`Online`** (Agent Version: `3.3.5226.0`)
- **Verified via AWS Systems Manager**:
  ```
  Docker version: Docker version 25.0.14, build 0bab007
  Docker status: active
  SSM Agent status: active
  Instance Profile: arn:aws:iam::081897152686:instance-profile/formflow-ec2-profile
  Local AWS Credentials: None (/root/.aws and /home/ec2-user/.aws do not exist)
  ```

### 14.6 Security & Cost Rationale
1. **Zero Open SSH**: Port 22 is completely omitted from security group rules. System administration is conducted via AWS Systems Manager Session Manager, preventing brute-force SSH attacks from the internet.
2. **Port 3000 Isolated**: Inbound port 3000 is allowed strictly from `formflow-alb-sg` (`sg-08b5329b7ac3489f6`).
3. **No NAT Gateway**: Because the EC2 instance resides in the public subnet with an auto-assigned public IP, outbound HTTPS requests to ECR, SQS, S3, Clerk, and Gemini route directly through the free Internet Gateway, saving ~$32.40/month.

---

## 15. Terraform / IaC Infrastructure Adoption (Phase 4.4)

In **Phase 4.4: Terraform / IaC Adoption of Existing AWS Infrastructure**, all pre-existing networking, compute, security, and IAM resources provisioned in Phases 4.2 and 4.3 were officially transitioned under HashiCorp Terraform management. Terraform is now the single source of truth for the FormFlow infrastructure.

### 15.1 Tooling & Versions
- **Terraform CLI**: `v1.15.8` on `windows_amd64`
- **AWS Provider**: `hashicorp/aws v5.100.0`
- **Minimum Constraint**: `>= 1.6.0`, AWS provider `~> 5.0`
- **State Backend**: Local state (`infra/terraform.tfstate`), excluded from git via `.gitignore`

### 15.2 Adopted Resources in Terraform State

A total of **17 resources** are managed in state without recreation or replacement:

| Terraform Resource Type | Resource Identifier | Physical AWS Resource | Status |
|---|---|---|---|
| `aws_vpc.main` | `main` | `vpc-07ccd486e95bcf90b` (`formflow-vpc`) | Imported & Reconciled |
| `aws_subnet.public` | `public` | `subnet-0af80484dc390e5f7` (`formflow-public-1a`) | Imported & Reconciled |
| `aws_subnet.db` | `db` | `subnet-014db5ad21530af11` (`formflow-db-1a`) | Imported & Reconciled |
| `aws_internet_gateway.main` | `main` | `igw-0d0997aa15ae2a0e6` (`formflow-igw`) | Imported & Reconciled |
| `aws_route_table.public` | `public` | `rtb-05fba685c4b17e516` (`formflow-public-rt`) | Imported & Reconciled |
| `aws_route_table_association.public` | `public` | `subnet-0af80484dc390e5f7 / rtb-05fba685c4b17e516` | Imported & Reconciled |
| `aws_route_table.db` | `db` | `rtb-0959b6e178487a0f7` (`formflow-db-rt`) | Imported & Reconciled |
| `aws_route_table_association.db` | `db` | `subnet-014db5ad21530af11 / rtb-0959b6e178487a0f7` | Imported & Reconciled |
| `aws_security_group.alb` | `alb` | `sg-08b5329b7ac3489f6` (`formflow-alb-sg`) | Imported & Reconciled |
| `aws_security_group.ec2` | `ec2` | `sg-0cc81da3744c9bd0e` (`formflow-ec2-sg`) | Imported & Reconciled |
| `aws_security_group.rds` | `rds` | `sg-0acc9f39ff6f0b6d5` (`formflow-rds-sg`) | Imported & Reconciled |
| `aws_iam_role.ec2` | `ec2` | `formflow-ec2-role` | Imported & Reconciled |
| `aws_iam_role_policy_attachment.ecr_read_only` | `ecr_read_only` | `AmazonEC2ContainerRegistryReadOnly` | Imported & Reconciled |
| `aws_iam_role_policy_attachment.ssm_core` | `ssm_core` | `AmazonSSMManagedInstanceCore` | Imported & Reconciled |
| `aws_iam_instance_profile.ec2` | `ec2` | `formflow-ec2-profile` | Imported & Reconciled |
| `aws_launch_template.app` | `app` | `lt-07d9bf39007ea21b7` (`formflow-launch-template`) | Imported & Reconciled |
| `aws_autoscaling_group.app` | `app` | `formflow-asg` | Imported & Reconciled |

### 15.3 Resource Ownership Transition & Tagging
Following import, the `ManagedBy` tag across all FormFlow resources was safely transitioned:
- **Previous Value**: `ManagedBy = "manual"`
- **Current Value**: `ManagedBy = "terraform"`
- **Transition Result**: Applied via zero-downtime, non-destructive in-place updates. Zero instances terminated, zero subnets or VPCs replaced.

### 15.4 Plan & Validation Results
- `terraform fmt -check`: **Clean (Exit 0)**
- `terraform validate`: **Success! The configuration is valid.**
- `terraform plan`: **No changes. Your infrastructure matches the configuration.**
- **AWS CLI Verification**:
  - VPC `vpc-07ccd486e95bcf90b`: `available`
  - ASG `formflow-asg`: `desired=1`, `min=1`, `max=2`, status `Healthy`
  - EC2 instance `i-0dc760f5cb3864cdd`: `running`, `InService`, zero disruption
  - SSM agent: `Online`
  - Docker daemon: `active` (version `25.0.14`)

---

## 16. Actual Provisioned Amazon RDS PostgreSQL (Phase 4.5)

In **Phase 4.5: Provision Amazon RDS PostgreSQL**, the primary database tier for FormFlow was provisioned via Terraform and verified live in `ap-south-1` (Mumbai).

> [!IMPORTANT]  
> **ACTUAL DEPLOYMENT ARCHITECTURE: SINGLE-AZ RDS**  
> - **The live database runs strictly as a Single-AZ instance (`ap-south-1a`)** on `db.t4g.micro`.  
> - **Zero Multi-AZ standby, zero read replicas, zero Aurora clusters** are provisioned to maintain minimal portfolio operational costs (~$16.17/month).  
> - **The secondary private DB subnet (`formflow-db-1b`) exists ONLY because AWS hard-enforces that an RDS DB Subnet Group must cover at least two Availability Zones.** No database instance, application, EC2, or NAT Gateway runs in `ap-south-1b`.

### 16.1 RDS Instance Details
- **DB Identifier**: `formflow-postgres`
- **Engine**: PostgreSQL (`16.11`)
- **Instance Class**: `db.t4g.micro` (AWS Graviton ARM64, 2 vCPUs, 1 GiB RAM)
- **Deployment Type**: **Single-AZ** (`MultiAZ: false`)
- **Assigned Availability Zone**: `ap-south-1a`
- **Allocated Storage**: `20 GiB` (`gp3`), autoscaling ceiling up to `50 GiB`
- **Storage Encryption**: **Enabled** (`StorageEncrypted: true`, AWS KMS `aws/rds`)
- **Public Accessibility**: **Disabled** (`PubliclyAccessible: false`, completely private)
- **Database Name**: `formflow`
- **Master Username**: `formflow_owner`
- **Database Port**: `5432`
- **Endpoint**: `formflow-postgres.c5syaiy4ox3a.ap-south-1.rds.amazonaws.com:5432`
- **Private IP (ap-south-1a)**: `10.0.100.180`
- **Auto Minor Version Upgrade**: Enabled (`true`)
- **Backup Retention**: `7 days` (automated daily window `03:00-04:00` UTC)
- **Maintenance Window**: `Mon:04:00-Mon:05:00` UTC

### 16.2 DB Subnet Group & Dual-AZ Subnet Layout
- **DB Subnet Group Name**: `formflow-rds-subnet-group`
- **Subnets Included**:
  1. **Primary Private DB Subnet (`ap-south-1a`)**: `subnet-014db5ad21530af11` (`10.0.100.0/24`) — **Hosts the active RDS instance (`10.0.100.180`)**.
  2. **Secondary Private DB Subnet (`ap-south-1b`)**: `subnet-0da942ef3dd28f16f` (`10.0.101.0/24`) — **Subnet group compliance only**.
- **Route Table**: Both subnets are associated to `formflow-db-rt` (`rtb-0959b6e178487a0f7`), containing **strictly `10.0.0.0/16 -> local`**. No routes to Internet Gateway and no NAT Gateway.

### 16.3 Database Network Security
- **Security Group**: `formflow-rds-sg` (`sg-0acc9f39ff6f0b6d5`)
- **Inbound Rule**: TCP Port `5432` strictly authorized from `formflow-ec2-sg` (`sg-0cc81da3744c9bd0e`).
- **Zero Internet Access**: Port 5432 is not exposed to `0.0.0.0/0`, and the instance is unreachable from outside the VPC.

### 16.4 Secret Handling & Credentials
- Master password generated securely via `random_password` provider (24 characters, high entropy).
- **Zero Credential Leakage**: Never committed to source code, `*.tf`, `terraform.tfvars`, Git, user-data, or terminal output.
- State attribute marked `sensitive`. Full external secrets-management integration (AWS Secrets Manager / SSM) is scheduled for the upcoming dedicated Secrets phase.

### 16.5 Live EC2 → RDS Connectivity Test Results
Connectivity was verified directly from the running EC2 instance (`i-0dc760f5cb3864cdd`) via AWS Systems Manager Session Manager (SSM Command `d725d5ec-af1a-498f-b14a-c4c4f4c19d8b`):
```
=== 1. DNS RESOLUTION ===
10.0.100.180    formflow-postgres.c5syaiy4ox3a.ap-south-1.rds.amazonaws.com

=== 2. TCP PORT 5432 CONNECTIVITY (BASH SOCKET) ===
TCP Connection to RDS 5432: SUCCESS

=== 3. TCP PORT 5432 CONNECTIVITY (PYTHON SOCKET) ===
SUCCESS: Connected to peer ('10.0.100.180', 5432)
```

### 16.6 Cost & Resource Summary
- **Compute (`db.t4g.micro`)**: ~$13.87 / month
- **Storage (`20 GiB gp3`)**: ~$2.30 / month
- **Automated Backups**: $0.00 (within 100% free backup tier)
- **Secondary Subnet**: $0.00 (No instances, no NAT Gateway)
- **Total DB Tier Cost**: **~$16.17 / month**
- **Resources NOT created**: No Multi-AZ, no read replicas, no Aurora, no NAT Gateway, no ALB, no ElastiCache, no S3, no SQS.

---

## 17. Actual Provisioned Shared In-Memory Cache (Phase 4.6)

In **Phase 4.6: Provision Shared Redis Cache**, an Amazon ElastiCache Valkey (Redis-compatible) cluster was provisioned via Terraform to provide a centralized, shared cache tier across all current and future EC2 instances in the Auto Scaling Group.

> [!IMPORTANT]  
> **WHY MANAGED CACHE INSTEAD OF LOCAL DOCKER REDIS?**  
> Running Redis as a local container on the EC2 instance works only for a single host. When the Auto Scaling Group scales up from 1 to 2 instances during high load or failover, a local Redis architecture breaks down:
> 1. **Cache Fragmentation**: Each EC2 host maintains its own isolated cache, causing stale data and cache misses.
> 2. **Session / Rate Limit Desynchronization**: Rate limit counters and user session tokens are split across separate hosts.
> 3. **Worker Race Conditions**: Background worker containers on separate EC2 nodes cannot coordinate or deduplicate tasks without a centralized, shared broker.
> 
> Replacing local Redis with **Amazon ElastiCache** enables a stateless EC2 tier where any ASG instance can safely scale out, terminate, or reboot without losing cache consistency.

### 17.1 Cache Engine & Node Details
- **Engine**: **Valkey** (`7.2.6`) — AWS open-source drop-in Redis replacement offering higher throughput and ~33% lower pricing than ElastiCache for Redis.
- **Node Type**: `cache.t4g.micro` (AWS Graviton ARM64, 2 vCPUs, 0.5 GiB memory)
- **Topology**: **Single Node** (`num_cache_clusters = 1`, no replicas, no cluster sharding)
- **Deployment Mode**: **Single-AZ** (`MultiAZ: false`, `automatic_failover_enabled = false`)
- **Assigned Availability Zone**: `ap-south-1a` (co-located in the same AZ as EC2 and RDS for near-zero network latency and $0.00 inter-AZ data transfer charges).
- **Cluster Identifier**: `formflow-cache` (Member node: `formflow-cache-001`)
- **Primary Endpoint**: `master.formflow-cache.disulj.aps1.cache.amazonaws.com:6379`
- **Private IP (ap-south-1a)**: `10.0.100.54`
- **Parameter Group**: `default.valkey7` (Standalone mode, `cluster-enabled: no`)
- **Auto Minor Version Upgrade**: Enabled (`true`)
- **Maintenance Window**: `sun:03:00-sun:04:00` UTC
- **Snapshot Retention**: `0` (Snapshots disabled to prevent unnecessary storage costs)

### 17.2 Subnet Group & Network Security
- **Subnet Group**: `formflow-cache-subnet-group`
  - Spans private DB subnets: `subnet-014db5ad21530af11` (`ap-south-1a`) and `subnet-0da942ef3dd28f16f` (`ap-south-1b`).
  - No internet route (`10.0.0.0/16 -> local` only). No NAT Gateway.
- **Security Group**: `formflow-cache-sg` (`sg-0a345171db29424e8`)
  - **Inbound Rule**: TCP Port `6379` strictly allowed from `formflow-ec2-sg` (`sg-0cc81da3744c9bd0e`).
  - **Zero Public Access**: Port 6379 is completely unreachable from the public internet.

### 17.3 Encryption & Authentication
- **At-Rest Encryption**: **Enabled** (`at_rest_encryption_enabled = true`, default ElastiCache managed encryption).
- **In-Transit Encryption (TLS)**: **Enabled** (`transit_encryption_enabled = true`). All TCP connections require TLS encryption.
- **Authentication**: **Enabled** via AUTH token (`auth_token`), securely generated by Terraform (`random_password.cache_auth_token`, 32 alphanumeric characters, marked `sensitive`, zero plaintext commits in code or git).

### 17.4 Live EC2 → ElastiCache Connectivity Test Results
Tested from the active EC2 host (`i-0dc760f5cb3864cdd`) via AWS Systems Manager Session Manager (SSM Command `b3a67f87-8db8-4ab3-b403-ef5db925c0de`):
```
=== 1. DNS RESOLUTION ===
10.0.100.54     formflow-cache-001.formflow-cache.disulj.aps1.cache.amazonaws.com master.formflow-cache.disulj.aps1.cache.amazonaws.com

=== 2. TCP PORT 6379 CONNECTIVITY ===
SUCCESS: Connected to peer ('10.0.100.54', 6379)

=== 3. TLS HANDSHAKE & PROTOCOL VERIFICATION ===
TLS CIPHER: TLS_AES_128_GCM_SHA256
VALKEY RESPONSE TO PING (expecting NOAUTH): -NOAUTH Authentication required.
```
- Proves end-to-end network route, TLS handshake, and Redis-compatible AUTH enforcement.

### 17.5 Cost & Resource Boundary Summary
- **Compute (`cache.t4g.micro` Valkey)**: ~$0.011/hour × 730 hours ≈ **$8.03 / month**
- **Backups / Snapshots**: $0.00
- **Total Cache Tier Cost**: **~$8.03 / month**
- **Resources NOT created**: No Multi-AZ cache, no replicas, no NAT Gateway, no ALB, no S3, no SQS, no CloudFront, no Route53, no ACM, no Kubernetes.

---

## 18. Actual Provisioned Object Storage & Asynchronous Messaging (Phase 4.7)

In **Phase 4.7: Provision S3 Storage + SQS Queue**, the persistent object storage and asynchronous background job queuing infrastructure were provisioned via Terraform and verified live in `ap-south-1` (Mumbai).

### 18.1 Amazon S3 Submissions Storage
- **Bucket Name**: `formflow-submissions-production-081897152686`
- **Bucket ARN**: `arn:aws:s3:::formflow-submissions-production-081897152686`
- **Region**: `ap-south-1`
- **Purpose**: Secure storage for user file uploads attached to form submissions. In production, browsers upload directly via presigned `PUT` URLs, and administrators view files via short-lived presigned `GET` URLs generated by the web tier (`src/lib/s3.ts`).
- **Security & Access Controls**:
  - **Public Access Block**: 100% blocked (`BlockPublicAcls = true`, `IgnorePublicAcls = true`, `BlockPublicPolicy = true`, `RestrictPublicBuckets = true`).
  - **Bucket Ownership**: `BucketOwnerEnforced` (ACLs disabled).
  - **Server-Side Encryption**: `AES256` (`SSE-S3`) enabled by default at $0.00 extra cost.
  - **Object Versioning**: `Enabled` (guards against accidental overwrite or deletion).
- **Lifecycle Configuration**:
  - `abort_incomplete_multipart_upload`: 7 days (prevents stalled upload charges).
  - `noncurrent_version_expiration`: 90 days (automatically cleans up previous versions).

### 18.2 Amazon SQS Job Queue & Dead-Letter Queue (DLQ)
- **Primary Queue**: `formflow-submissions`
  - **Queue URL**: `https://sqs.ap-south-1.amazonaws.com/081897152686/formflow-submissions`
  - **Queue ARN**: `arn:aws:sqs:ap-south-1:081897152686:formflow-submissions`
  - **Queue Type**: Standard SQS Queue (high throughput, at-least-once delivery)
  - **Visibility Timeout**: `60 seconds` (aligned with worker processing duration in `src/worker/index.ts`)
  - **Message Retention**: `345,600 seconds` (4 days)
  - **Receive Wait Time**: `20 seconds` (Long polling enabled to minimize empty receive API calls and costs)
  - **Encryption**: `SQS-managed SSE` enabled (`sqs_managed_sse_enabled = true`)
- **Dead-Letter Queue (DLQ)**: `formflow-submissions-dlq`
  - **Queue URL**: `https://sqs.ap-south-1.amazonaws.com/081897152686/formflow-submissions-dlq`
  - **Queue ARN**: `arn:aws:sqs:ap-south-1:081897152686:formflow-submissions-dlq`
  - **Message Retention**: `1,209,600 seconds` (14 days)
  - **Redrive Policy**: Configured on main queue with `maxReceiveCount = 3`. Unprocessable or crashing submission messages are automatically quarantined in the DLQ for diagnostic review after 3 failed processing attempts.
  - **Redrive Allow Policy**: Configured on DLQ allowing only `formflow-submissions` as the source queue.

### 18.3 Least-Privilege IAM Access for EC2 Host
- **Role Name**: `formflow-ec2-role`
- **New Attached Policy**: `formflow-ec2-app-access` (`arn:aws:iam::081897152686:policy/formflow-ec2-app-access`)
- **Zero Access Keys**: Applications on EC2 retrieve temporary credentials transparently through the attached instance profile (`formflow-ec2-profile`).
- **Scoped Permissions**:
  - `s3:ListBucket` on `arn:aws:s3:::formflow-submissions-production-081897152686`
  - `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::formflow-submissions-production-081897152686/*`
  - `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:ChangeMessageVisibility`, `sqs:GetQueueAttributes` on `formflow-submissions` and `formflow-submissions-dlq` ARNs only.
  - Zero wildcard (`*`) access to other S3 buckets or SQS queues.

### 18.4 Live Verification via SSM from Active EC2 Host
Verified from `i-0dc760f5cb3864cdd` via AWS Systems Manager Session Manager (Command ID `da9280ae-1ad3-4248-b890-02f0776163d6`):
```
=== 1. SQS SEND / RECEIVE / DELETE TEST ===
Sending test message...
Sent Message ID: b57b662a-3166-4758-b667-4353ac7030bf
Receiving test message...
Received Body: {"test":"phase4.7-verification"}
Deleting test message...
Approximate visible messages remaining: 0

=== 2. S3 UPLOAD / CONFIRM / DELETE TEST ===
Uploading test object to S3...
Completed 22 Bytes/22 Bytes (343 Bytes/s) with 1 file(s) remaining
upload: ../../tmp/s3-test.txt to s3://formflow-submissions-production-081897152686/test-verification/s3-test.txt
Confirming object exists in S3...
2026-10-01 07:47:27         22 s3-test.txt
Deleting test object from S3...
delete: s3://formflow-submissions-production-081897152686/test-verification/s3-test.txt
Confirming object is deleted...
Object clean - no files remaining in test prefix
=== ALL SQS AND S3 TESTS COMPLETED SUCCESSFULLY ===
```
- Proves end-to-end IAM role authorization, SQS message lifecycle, S3 object storage lifecycle, and zero residue left behind.

### 18.5 Cost & Resource Summary
- **Amazon S3**: ~$0.02 / month (Free tier covers 5 GB standard storage and 20,000 GET / 2,000 PUT requests).
- **Amazon SQS + DLQ**: $0.00 / month (Free tier includes 1,000,000 requests every month indefinitely).
- **Total Storage & Queue Tier Cost**: **~$0.02 / month**
- **Resources NOT created**: No ALB, no CloudFront, no Route53, no ACM, no NAT Gateway, no additional EC2/ASG instances, no Kubernetes.

---

## 19. Phase 4.8: Application Load Balancer (ALB) Infrastructure

### 19.1 Architecture Overview
Phase 4.8 establishes the external entry point for FormFlow application traffic using an AWS Application Load Balancer (ALB) while strictly adhering to lean, single-compute operational costs.

```
                    Internet Traffic (:80)
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │       ALB: formflow-alb (Public)         │
        │  Subnets: public-1a + public-1b (2 AZs)   │
        │  Security Group: formflow-alb-sg (:80)    │
        └─────────────────────┬─────────────────────┘
                              │
                    HTTP :80 Forwarding Rule
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │   Target Group: formflow-web-tg (:3000)   │
        │   Target Type: instance                   │
        │   Health Check: GET /api/health/live      │
        └─────────────────────┬─────────────────────┘
                              │
                 Target Registration via ASG
                              │
                              ▼
        ┌───────────────────────────────────────────┐
        │         Auto Scaling Group (ASG)          │
        │  Single-AZ Compute: ap-south-1a ONLY     │
        │  Instance: formflow-app-instance (t4g)    │
        │  Port: 3000 (Next.js Application)        │
        └───────────────────────────────────────────┘
```

### 19.2 Multi-AZ Requirement Fulfillment
- **ALB 2-AZ Requirement**: AWS Application Load Balancers require at least two Availability Zones with public subnets.
- **Secondary Public Subnet**: Added `formflow-public-1b` (`10.0.2.0/24`) in `ap-south-1b`, associated with `formflow-public-rt` (routing `0.0.0.0/0` to `formflow-igw`).
- **Single-AZ Compute Invariant**: EC2 compute remains **100% single-AZ in `ap-south-1a`** (`vpc_zone_identifier = [aws_subnet.public.id]`). Zero EC2 instances or compute resources reside in `ap-south-1b`.

### 19.3 Target Group & Health Checking
- **Target Group Name**: `formflow-web-tg`
- **Protocol / Port**: HTTP : 3000
- **Target Type**: `instance`
- **Health Check Path**: `/api/health/live`
- **Health Check Matcher**: HTTP `200`
- **Health Check Intervals**: Interval = 30s, Timeout = 5s, Healthy Threshold = 2, Unhealthy Threshold = 3.
- **ASG Association**: Attached via `target_group_arns = [aws_lb_target_group.web.arn]` on `formflow-asg`.
- **Health Check Type**: Kept as `EC2` on the ASG to prevent premature instance termination prior to container deployment.

---

## 20. Phase 4.9: SSM-Based Application Deployment & Production Verification

### 20.1 Architecture & Workflow Overview
Phase 4.9 deployed FormFlow production containers directly onto the existing EC2/ASG host (`i-0dc760f5cb3864cdd`) via AWS Systems Manager (SSM) without SSH keys, public bastion hosts, or external registry dependencies.

```
 [ Local / CI Operator ]
          │ (AWS SSM Run-Command / TLS Encrypted)
          ▼
   [ AWS Systems Manager ]
          │ (SSM Agent on EC2: i-0dc760f5cb3864cdd)
          ▼
   [ EC2 ARM64 Host /opt/formflow ]
          ├── 1. Git Clone (github.com/atharvjadhav-dev/FormFlow.git)
          ├── 2. Native Graviton ARM64 Image Compilation
          ├── 3. Explicit DDL Migration Runner (formflow-migrate)
          └── 4. Production Service Stack (Docker Compose)
                 ├── formflow-web (0.0.0.0:3000 -> ALB Target Group)
                 └── formflow-worker (127.0.0.1:8081 -> Internal SQS Consumer)
```

### 20.2 Key Architectural Decisions & Safeguards
1. **ECR Dependency Elimination**:
   - Detached obsolete `AmazonEC2ContainerRegistryReadOnly` policy from `formflow-ec2-role` via Terraform.
   - Built native ARM64 images directly on the Graviton2 `t4g.small` instance in AWS, avoiding home internet upload bottlenecks and QEMU emulation overhead.
2. **Swapfile Memory Buffer**:
   - Configured a 2 GiB swapfile on the EBS root volume to ensure Next.js standalone and TypeScript builds execute reliably within `t4g.small`'s 2 GiB physical RAM without invoking Linux OOM killer.
3. **Database Migration Isolation**:
   - Database migrations executed strictly once as a standalone run-to-completion container (`formflow-migrate`).
   - Idempotent schema verification (`0000_silent_unicorn.sql`), Postgres role creation (`formflow_app`, `formflow_service`), and RLS policies applied with 100% success.
4. **VPC Network & Secret Security**:
   - Zero hardcoded credentials committed to git.
   - `/opt/formflow/.env` permissioned strictly at `600` (root-only).
   - PostgreSQL connections configured with SSL (`?sslmode=no-verify` / `PGSSLMODE=no-verify`).
   - ElastiCache Valkey connected with in-transit encryption (`rediss://`) and AUTH token.
   - S3 direct presigned uploads and SQS queue URLs bound via IAM instance profile permissions.
5. **ALB End-to-End Routing**:
   - ALB Target Group `formflow-web-tg` transitioned to **Healthy** on port 3000.
   - Public traffic verified via ALB DNS: `http://formflow-alb-326647237.ap-south-1.elb.amazonaws.com/api/health/live` returns HTTP 200 `{ status: "ok" }`.

### 20.3 Verification Summary
| Check | Target / Endpoint | Result |
|---|---|---|
| EC2 SSM Management | `i-0dc760f5cb3864cdd` | **Online** (Amazon Linux 2023 ARM64) |
| Docker Daemon & Compose | Docker `25.0.6`, Compose `v2.29.7` | **Running** |
| Image Architecture | `formflow-web`, `worker`, `migrate` | **aarch64 / arm64 native** |
| Migration Runner | `dist/db/migrate.js` | **Exit Code 0** (RLS policies applied) |
| Web Liveness | `localhost:3000/api/health/live` | **HTTP 200 OK** |
| Web Readiness | `localhost:3000/api/health/ready` | **HTTP 200 OK** (RDS: 23ms, Valkey: 1ms) |
| Worker Liveness | `127.0.0.1:8081/health/live` | **HTTP 200 OK** |
| Worker Readiness | `127.0.0.1:8081/health/ready` | **HTTP 200 OK** (`queueConfigured: true`) |
| ALB Target Health | `formflow-web-tg` (:3000) | **Healthy** |
| Public ALB DNS | `formflow-alb-326647237.ap-south-1.elb.amazonaws.com` | **HTTP 200 OK** |

---

## 21. Phase 4.10: Production Secrets & Configuration (SSM Parameter Store)

### 21.1 Architecture & Security Strategy
In **Phase 4.10**, production secrets and runtime configuration were migrated from static, manually maintained files to **AWS Systems Manager Parameter Store** under the `/formflow/` namespace. Configuration is dynamically retrieved by deployment tooling and injected into the container environment at runtime.

```
       ┌────────────────────────────────────────────────────────┐
       │         AWS Systems Manager Parameter Store            │
       │                   Namespace: /formflow/*               │
       ├──────────────────────────┬─────────────────────────────┤
       │ String (Non-Sensitive)   │ SecureString (Encrypted)    │
       │ - NODE_ENV, PORT, HOST   │ - DATABASE_URL              │
       │ - STORAGE_DRIVER, BUCKET │ - APP_DATABASE_URL          │
       │ - AWS_REGION, SQS_URL    │ - SERVICE_DATABASE_URL      │
       │ - CLERK_PUBLISHABLE_KEY  │ - APP_DB_PASSWORD           │
       │ - GEMINI_MODEL, PGSSLMODE│ - SERVICE_DB_PASSWORD       │
       │ - WORKER_HEALTH_PORT     │ - REDIS_URL (AUTH Token)    │
       │                          │ - CLERK_SECRET_KEY          │
       │                          │ - CLERK_WEBHOOK_SECRET      │
       │                          │ - GEMINI_API_KEY            │
       └──────────────────────────┴─────────────────────────────┘
                                  │
                                  ▼
      IAM Instance Profile Role: formflow-ec2-app-access
      Scoped to: arn:aws:ssm:ap-south-1:081897152686:parameter/formflow/*
      KMS Decrypt via service: ssm.ap-south-1.amazonaws.com
                                  │
                                  ▼
               EC2 Host Deployment (/opt/formflow)
                 ├── scripts/ssm-env-inject.py
                 ├── Generates /opt/formflow/.env (chmod 600)
                 └── docker compose -f docker-compose.prod.yml restart
```

### 21.2 IAM Least-Privilege Policy Updates
The existing `formflow-ec2-app-access` policy was updated via Terraform to include strict, least-privilege permissions for SSM Parameter Store parameter retrieval and KMS decryption:
- **SSM Read Access**:
  - `ssm:GetParameter`, `ssm:GetParameters`, `ssm:GetParametersByPath`
  - Scoped exclusively to `arn:aws:ssm:ap-south-1:081897152686:parameter/formflow/*`
- **KMS Decryption**:
  - `kms:Decrypt`
  - Condition: `kms:ViaService = "ssm.ap-south-1.amazonaws.com"` (ensures KMS decrypt is only permitted through the SSM service in Mumbai).
- **Terraform Status**: `terraform fmt`, `terraform validate`, and `terraform plan` clean (0 differences).

### 21.3 Dynamic Deployment Injection Mechanism
- **Injection Utility**: `scripts/ssm-env-inject.py`
  - Retrieves all configuration and secrets dynamically at deployment time via the attached EC2 instance profile (`formflow-ec2-role`).
  - Writes `/opt/formflow/.env` and enforces POSIX permissions `600` (`rw-------`).
  - Zero hardcoded credentials in source control or Git.
  - Zero sensitive values printed to console, logs, or reports (parameters logged by name and type only).
- **Deployment Orchestrator**: `scripts/deploy-production.sh`
  - Executes SSM parameter injection, validates file mode, restarts `docker compose -f docker-compose.prod.yml`, and executes automated health probes.

### 21.4 Verification Summary
| Verification Check | Target / Endpoint | Result |
|---|---|---|
| Environment File Permissions | `/opt/formflow/.env` | **Mode 600 (`rw-------`), Root-owned** |
| Web Readiness Probe | `http://localhost:3000/api/health/ready` | **HTTP 200 OK** (RDS: 23ms, Valkey: 1ms) |
| Worker Readiness Probe | `http://127.0.0.1:8081/health/ready` | **HTTP 200 OK** (`queueConfigured: true`) |
| Amazon RDS Connectivity | PostgreSQL 16 on `formflow-postgres` | **Connected (23ms)** |
| Amazon ElastiCache Connectivity | Valkey 7.2 on `formflow-cache` | **Connected (1ms)** |
| Amazon S3 Storage | `formflow-submissions-production-081897152686` | **Upload, List, Delete: Verified** |
| Amazon SQS Queue | `formflow-submissions` | **Send, Receive, Delete: Verified** |
| ALB Target Health | `formflow-web-tg` (:3000) | **Healthy** |
| Public ALB DNS | `formflow-alb-326647237.ap-south-1.elb.amazonaws.com` | **HTTP 200 OK** |
| Git & Secret Hygiene | Working tree & commits | **Zero secrets in Git, Terraform, or Docker** |

---

## 22. Phase 4.11: ACM + HTTPS with Hostinger DNS

### 22.1 Architecture & SSL/TLS Routing Strategy
In **Phase 4.11**, FormFlow was secured with end-to-end SSL/TLS encryption using **AWS Certificate Manager (ACM)** and the existing **Application Load Balancer (ALB)**, with DNS managed entirely in **Hostinger** (zero Route 53 dependencies or monthly zone fees).

```
                     Client Web Browser
                             │
                             ▼ (HTTPS :443 / TLS 1.3)
                  Hostinger DNS CNAME Record
           form-flow.atharvjadhav.xyz  ──>  formflow-alb-326647237.ap-south-1.elb.amazonaws.com
                             │
                             ▼
              Application Load Balancer (ALB)
       ├── Port 80 Listener  ──> HTTP 301 Permanent Redirect to HTTPS :443
       └── Port 443 Listener ──> ACM SSL Certificate (*.atharvjadhav.xyz)
                                 Security Policy: ELBSecurityPolicy-TLS13-1-2-2021-06
                                 │
                                 ▼ (HTTP :3000)
                     Target Group: formflow-web-tg
                                 │
                                 ▼
                     formflow-web Container (:3000)
```

### 22.2 ACM Certificate Details & DNS Validation
- **Domain Name**: `form-flow.atharvjadhav.xyz`
- **Certificate ARN**: `arn:aws:acm:ap-south-1:081897152686:certificate/0ad6b6e7-32c7-49f6-af5c-dde1a19361b5`
- **Region**: `ap-south-1` (Mumbai)
- **Status**: **`ISSUED`**
- **Issuer**: Amazon Trust Services
- **Validation Method**: DNS Validation
- **Validation CNAME Record**:
  - Name: `_cf3e419a9fd558ee2d1ec620349ba0f4.form-flow.atharvjadhav.xyz.`
  - Value: `_c936b78463b01159dbfe7c4a5bd3910d.wzccmgtwzk.acm-validations.aws.`

### 22.3 Load Balancer Listeners Configuration
1. **HTTPS Listener (`aws_lb_listener.https`)**:
   - Port: `443`
   - Protocol: `HTTPS`
   - Certificate: `aws_acm_certificate.cert.arn`
   - SSL Policy: `ELBSecurityPolicy-TLS13-1-2-2021-06` (modern TLS 1.3 and 1.2 support)
   - Default Action: Forward to `formflow-web-tg` (`arn:aws:elasticloadbalancing:ap-south-1:081897152686:targetgroup/formflow-web-tg/0d2b4b65611a3379`)
2. **HTTP Listener (`aws_lb_listener.http`)**:
   - Port: `80`
   - Protocol: `HTTP`
   - Default Action: `redirect` to Port `443`, Protocol `HTTPS`, Status Code `HTTP_301` (Permanent Redirect).

### 22.4 Health & End-to-End Verification Summary
| Verification Check | Target / Endpoint | Result |
|---|---|---|
| ACM Certificate Status | `form-flow.atharvjadhav.xyz` | **ISSUED** (Amazon Trust Services) |
| Hostinger DNS Resolution | `form-flow.atharvjadhav.xyz` | **CNAME -> formflow-alb-326647237.ap-south-1.elb.amazonaws.com** |
| HTTP to HTTPS Redirect | `http://form-flow.atharvjadhav.xyz/api/health/live` | **HTTP 301 Moved Permanently** -> `https://form-flow.atharvjadhav.xyz:443/api/health/live` |
| HTTPS Web Liveness Probe | `https://form-flow.atharvjadhav.xyz/api/health/live` | **HTTP 200 OK** (`{"status":"ok",...}`) |
| HTTPS Web Readiness Probe | `https://form-flow.atharvjadhav.xyz/api/health/ready` | **HTTP 200 OK** (`dependencies.database: connected`, `dependencies.redis: connected`) |
| ALB Target Health | `formflow-web-tg` (:3000) | **Healthy** (`i-0dc760f5cb3864cdd`) |
| Public Website Access | `https://form-flow.atharvjadhav.xyz/` | **HTTP 200 OK**, SSL Verification Result: `0` (Valid Trust Chain) |

---

## 23. Phase 4.12: CloudFront Edge Caching & Global CDN Distribution

### 23.1 Architecture Overview
In **Phase 4.12**, AWS CloudFront was deployed in front of the existing Application Load Balancer (ALB) to deliver high-performance global edge caching for Next.js static assets while safely proxying all dynamic routes, authentication, and API endpoints directly to the ALB origin over TLS.

```
                     Client Web Browser
                             │
                             ▼ (HTTPS :443 / TLS 1.3)
                  Hostinger DNS CNAME Record
          form-flow.atharvjadhav.xyz  ──>  d115dpxl54ig1o.cloudfront.net
                             │
                             ▼
              AWS CloudFront Distribution (Global Edge)
               Distribution ID: E3LD8O6P071SXA
               Viewer Protocol: redirect-to-https
               Viewer Certificate: us-east-1 ACM (TLS 1.2/1.3)
                             │
       ┌─────────────────────┴─────────────────────────┐
       │                                               │
 (Static Cache Hit)                            (Dynamic / Miss / API)
       │                                               │
       ▼                                               ▼ (HTTPS :443 / TLS 1.2)
 Next.js Assets:                             Origin: formflow-alb-326647237.ap-south-1.elb.amazonaws.com
 - /_next/static/*                           ALB HTTPS Listener (:443)
 - /_next/image*                             ap-south-1 ACM Certificate (*.atharvjadhav.xyz)
 (Cache: HIT, Age: > 0)                                │
                                                       ▼
                                             Target Group: formflow-web-tg (:3000)
                                                       │
                                                       ▼
                                             EC2 Instance (Docker Compose Stack)
```

### 23.2 Multi-Region ACM Certificate Strategy
- **CloudFront Viewer Certificate Requirement**: CloudFront distributions with custom domains require an SSL/TLS certificate provisioned strictly in the `us-east-1` (N. Virginia) region.
- **ALB Origin Certificate Preservation**: The existing `ap-south-1` (Mumbai) ACM certificate remains attached to the ALB's HTTPS listener (:443), ensuring strict end-to-end encryption between CloudFront edge nodes and the ALB origin.
- **Deterministic Validation**: Because both certificates cover `form-flow.atharvjadhav.xyz`, they shared the identical DNS validation CNAME record (`_cf3e419a9fd558ee2d1ec620349ba0f4.form-flow.atharvjadhav.xyz.`), allowing the `us-east-1` certificate to reach **`ISSUED`** status without creating any additional DNS records in Hostinger.

### 23.3 Caching & Routing Policy Matrix

| Path Pattern | Target Origin | Cache Policy | Origin Request Policy | Viewer Protocol | Description |
|---|---|---|---|---|---|
| `/_next/static/*` | `formflow-alb-origin` | `Managed-CachingOptimized` (`658327...`) | `Managed-AllViewer` (`216ade...`) | `redirect-to-https` | Immutable compiled JavaScript/CSS bundles cached globally at edge. |
| `/_next/image*` | `formflow-alb-origin` | `Managed-CachingOptimized` (`658327...`) | `Managed-AllViewer` (`216ade...`) | `redirect-to-https` | Next.js optimized images cached with query parameters forwarded. |
| `/api/*` | `formflow-alb-origin` | `Managed-CachingDisabled` (`4135ea...`) | `Managed-AllViewer` (`216ade...`) | `redirect-to-https` | Health, submissions, analytics, webhooks: zero caching, all headers & cookies passed. |
| Default (`*`) | `formflow-alb-origin` | `Managed-CachingDisabled` (`4135ea...`) | `Managed-AllViewer` (`216ade...`) | `redirect-to-https` | Dynamic SSR pages, Clerk authentication callbacks, session headers preserved. |

### 23.4 CloudFront Infrastructure Specifications
- **Distribution ID**: `E3LD8O6P071SXA`
- **CloudFront Domain**: `d115dpxl54ig1o.cloudfront.net`
- **Custom Domain Alias**: `form-flow.atharvjadhav.xyz`
- **Origin Domain**: `formflow-alb-326647237.ap-south-1.elb.amazonaws.com`
- **Origin Protocol**: `https-only` (Port 443, TLSv1.2)
- **Origin Read Timeout**: 30 seconds
- **Price Class**: `PriceClass_100` (North America & Europe edge locations for minimal cost)
- **HTTP/3 & IPv6**: Enabled
- **us-east-1 ACM Certificate**: `arn:aws:acm:us-east-1:081897152686:certificate/44304a00-d0a7-461c-99bc-aff2ff8568b2` (`ISSUED`)
- **ap-south-1 ACM Certificate**: `arn:aws:acm:ap-south-1:081897152686:certificate/0ad6b6e7-32c7-49f6-af5c-dde1a19361b5` (`ISSUED`, unchanged on ALB)

### 23.5 Verification & Validation Summary
| Verification Check | Endpoint / Target | Result | Detail |
|---|---|---|---|
| CloudFront Deployment Status | `aws_cloudfront_distribution.main` | **Deployed** | State: `Deployed`, Enabled: `true` |
| CloudFront HTTP -> HTTPS | `http://form-flow.atharvjadhav.xyz/` | **HTTP 301** | `Location: https://form-flow.atharvjadhav.xyz/`, Server: `CloudFront` |
| CloudFront Origin HTTPS | `formflow-alb-origin:443` | **Verified** | TLS 1.2 handshake and upstream certificate match |
| FormFlow Homepage | `https://form-flow.atharvjadhav.xyz/` | **HTTP 200 OK** | Full HTML rendered with valid SSR metadata |
| Liveness Probe | `https://.../api/health/live` | **HTTP 200 OK** | `X-Cache: Miss from cloudfront`, `status: ok` |
| Readiness Probe | `https://.../api/health/ready` | **HTTP 200 OK** | `X-Cache: Miss from cloudfront`, DB: `27ms`, Redis: `1ms` |
| Static Bundle Caching | `https://.../_next/static/...` | **HTTP 200 OK** | Request 1: `Miss from cloudfront`, Request 2: `Hit from cloudfront` (`Age: 2`) |
| ALB Target Health | `formflow-web-tg` (:3000) | **Healthy** | Target `i-0dc760f5cb3864cdd` in service |
| Compute & Data Services | EC2, Docker, RDS, Valkey, S3, SQS | **100% Healthy** | RDS: `available`, Valkey: `available`, S3: OK, SQS: 0 msgs |

### 23.6 Hostinger DNS Cutover Instructions
To route public production traffic through CloudFront edge caching, execute the following single record change in the Hostinger DNS zone editor:

| Record Type | Host / Name | Target / Points To | Current Value | New Value | TTL |
|---|---|---|---|---|---|
| **CNAME** | `form-flow` | `d115dpxl54ig1o.cloudfront.net` | `formflow-alb-326647237.ap-south-1.elb.amazonaws.com` | **`d115dpxl54ig1o.cloudfront.net`** | `300` (or Default) |












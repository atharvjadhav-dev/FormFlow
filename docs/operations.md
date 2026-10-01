# FormFlow — Production Operations & Verification Runbook

> [!NOTE]
> This runbook provides practical verification, operational management, and troubleshooting commands for the FormFlow production deployment. All commands use the **AWS CLI** and **AWS Systems Manager (SSM)**. Zero SSH keys or bastion hosts are required.

---

## 1. Quick Health & Status Verification

### 1.1 Public Endpoint Probes
Verify production edge routing, SSL termination, and API responses:

```bash
# 1. Test CloudFront HTTP -> HTTPS 301 Redirect
curl -I http://form-flow.atharvjadhav.xyz/

# 2. Test Liveness Probe (Expects HTTP 200 {"status":"ok"})
curl -i https://form-flow.atharvjadhav.xyz/api/health/live

# 3. Test Readiness Probe (Expects HTTP 200 with DB & Redis latencies)
curl -i https://form-flow.atharvjadhav.xyz/api/health/ready

# 4. Test CloudFront Static Asset Caching (Expects "X-Cache: Hit from cloudfront")
curl -i https://form-flow.atharvjadhav.xyz/_next/static/chunks/24h7e-3ek46_c.js
```

### 1.2 ALB Target Group Health
Check if the active EC2 host is marked `healthy` on port 3000:

```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:081897152686:targetgroup/formflow-web-tg/0d2b4b65611a3379 \
  --region ap-south-1 \
  --output table
```

### 1.3 Active Running Commit Version on EC2
Check which Git commit SHA is currently deployed on the EC2 host:

```bash
aws ssm send-command \
  --instance-ids "i-0dc760f5cb3864cdd" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cat /opt/formflow/.current_version"]' \
  --region ap-south-1 \
  --output json
```

---

## 2. Infrastructure Health Checks

### 2.1 EC2 & Auto Scaling Group
```bash
# Check running EC2 instance state
aws ec2 describe-instances \
  --instance-ids "i-0dc760f5cb3864cdd" \
  --region ap-south-1 \
  --query "Reservations[0].Instances[0].[InstanceId, State.Name, InstanceType, PublicIpAddress]" \
  --output table

# Check Auto Scaling Group capacity (Desired: 1, Min: 1, Max: 2)
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "formflow-asg" \
  --region ap-south-1 \
  --query "AutoScalingGroups[0].[AutoScalingGroupName, DesiredCapacity, Instances[0].HealthStatus]" \
  --output table
```

### 2.2 Amazon RDS PostgreSQL
```bash
aws rds describe-db-instances \
  --db-instance-identifier "formflow-postgres" \
  --region ap-south-1 \
  --query "DBInstances[0].[DBInstanceIdentifier, DBInstanceStatus, EngineVersion, Endpoint.Address]" \
  --output table
```

### 2.3 Amazon ElastiCache Valkey
```bash
aws elasticache describe-replication-groups \
  --replication-group-id "formflow-cache" \
  --region ap-south-1 \
  --query "ReplicationGroups[0].[ReplicationGroupId, Status, PrimaryEndpoint.Address]" \
  --output table
```

### 2.4 Amazon S3 Bucket & Amazon SQS Queue
```bash
# Verify S3 submissions bucket access
aws s3api head-bucket \
  --bucket "formflow-submissions-production-081897152686" \
  --region ap-south-1

# Check pending messages in SQS primary and dead-letter queues
aws sqs get-queue-attributes \
  --queue-url "https://sqs.ap-south-1.amazonaws.com/081897152686/formflow-submissions" \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region ap-south-1 \
  --output json

aws sqs get-queue-attributes \
  --queue-url "https://sqs.ap-south-1.amazonaws.com/081897152686/formflow-submissions-dlq" \
  --attribute-names ApproximateNumberOfMessages \
  --region ap-south-1 \
  --output json
```

---

## 3. Remote Host Management (Zero SSH)

### 3.1 Start Interactive SSM Shell Session
Open an interactive root shell on the EC2 host through AWS Systems Manager Session Manager:

```bash
aws ssm start-session \
  --target "i-0dc760f5cb3864cdd" \
  --region ap-south-1
```

Once inside:
```bash
# Switch to root directory of FormFlow
cd /opt/formflow

# Inspect running containers
docker compose -f docker-compose.prod.yml ps

# View live web container logs
docker compose -f docker-compose.prod.yml logs -f --tail=100 formflow-web

# View background worker logs
docker compose -f docker-compose.prod.yml logs -f --tail=100 formflow-worker
```

### 3.2 Inspect Container Logs Remotely
Stream logs without starting an interactive session:

```bash
aws ssm send-command \
  --instance-ids "i-0dc760f5cb3864cdd" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["docker compose -f /opt/formflow/docker-compose.prod.yml logs --tail=50 formflow-web"]' \
  --region ap-south-1
```

---

## 4. Operational Runbooks

### 4.1 Updating Secrets in AWS SSM Parameter Store
When rotating an API key (e.g. Gemini, Clerk) or database password:

1. Update the parameter in SSM Parameter Store:
   ```bash
   aws ssm put-parameter \
     --name "/formflow/production/GEMINI_API_KEY" \
     --value "new_api_key_value" \
     --type "SecureString" \
     --overwrite \
     --region ap-south-1
   ```
2. Trigger the SSM secret injection and container restart:
   ```bash
   aws ssm send-command \
     --instance-ids "i-0dc760f5cb3864cdd" \
     --document-name "AWS-RunShellScript" \
     --comment "Rotate configuration from SSM" \
     --parameters 'commands=["python3 /opt/formflow/scripts/ssm-env-inject.py --output /opt/formflow/.env --region ap-south-1 && chmod 600 /opt/formflow/.env && docker compose -f /opt/formflow/docker-compose.prod.yml restart"]' \
     --region ap-south-1
   ```

### 4.2 Manual Rollback to a Previous Version
If a newly pushed commit introduces an application regression:

1. Look up the desired previous commit SHA from Git history or `/opt/formflow/.current_version`.
2. Dispatch the rollback command:
   ```bash
   aws ssm send-command \
     --instance-ids "i-0dc760f5cb3864cdd" \
     --document-name "AWS-RunShellScript" \
     --comment "Rollback to commit <PREVIOUS_SHA>" \
     --parameters 'commands=["cd /opt/formflow && git fetch origin main && git checkout <PREVIOUS_SHA> && bash /opt/formflow/scripts/deploy-production.sh <PREVIOUS_SHA>"]' \
     --region ap-south-1
   ```

### 4.3 Flushing the Distributed Cache
If cached form definitions or session counters need to be cleared:

```bash
aws ssm send-command \
  --instance-ids "i-0dc760f5cb3864cdd" \
  --document-name "AWS-RunShellScript" \
  --comment "Flush Valkey Cache" \
  --parameters 'commands=["python3 -c \"import redis, os; r = redis.Redis.from_url(os.environ.get(\'REDIS_URL\')); r.flushdb()\""]' \
  --region ap-south-1
```

---

## 5. Troubleshooting & FAQ

### Issue: Next.js build runs out of memory (OOM Killer) on `t4g.small`
- **Root Cause**: `t4g.small` instances have 2 GiB of physical RAM. Parallel TypeScript compilation and Next.js page generation can momentarily spike to ~2.2 GiB.
- **Solution**: A 2 GiB swapfile is provisioned on the EBS root volume (`/swapfile`). Verify swap is active:
  ```bash
  aws ssm send-command \
    --instance-ids "i-0dc760f5cb3864cdd" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["free -h"]' \
    --region ap-south-1
  ```

### Issue: CloudFront returns HTTP 502 Bad Gateway
- **Root Cause**: Upstream ALB or EC2 web container is unhealthy, or origin protocol policy mismatch.
- **Resolution**:
  1. Check target group health: `aws elbv2 describe-target-health ...`
  2. Verify local web container is listening: `curl http://localhost:3000/api/health/live`
  3. Ensure ALB listener certificate covers `form-flow.atharvjadhav.xyz`.

### Issue: Clerk Webhook returns HTTP 400 Invalid Signature
- **Root Cause**: `CLERK_WEBHOOK_SECRET` in SSM Parameter Store does not match the secret in the Clerk Dashboard.
- **Resolution**: Re-copy the `whsec_...` secret from Clerk Dashboard -> Webhooks -> Signing Secret, update the SSM parameter, and re-run secret injection.

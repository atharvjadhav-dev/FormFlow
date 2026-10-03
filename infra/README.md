# FormFlow Infrastructure as Code (IaC)

This directory contains the production Infrastructure-as-Code (IaC) definitions for **FormFlow**, written in HashiCorp Terraform and targeting Amazon Web Services (AWS) in `ap-south-1` (Mumbai).

As of **Phase 4.4**, Terraform is the authoritative **source of truth** for all FormFlow AWS infrastructure. Manual modifications via the AWS Management Console or ad-hoc AWS CLI commands are strictly prohibited.

---

## 1. Directory Structure

```
infra/
├── versions.tf              # Terraform CLI (>= 1.6.0), AWS (~> 5.0), and Random (~> 3.6) providers
├── provider.tf              # AWS provider setup with default resource tagging (ap-south-1)
├── variables.tf             # Input variables with sensible production defaults
├── locals.tf                # Reusable local values and common tags
├── vpc.tf                   # VPC, Subnets (Public + Primary DB + Secondary DB), IGW, Route Tables
├── security-groups.tf       # ALB, EC2, and RDS Security Groups & zero-trust ingress rules
├── iam.tf                   # EC2 IAM Role, Instance Profile, and ECR/SSM/S3/SQS policy attachments
├── launch-template.tf       # Graviton ARM64 launch template (t4g.small, 20 GiB gp3, Docker bootstrap)
├── autoscaling.tf           # Auto Scaling Group (min=1, desired=1, max=2) in ap-south-1a
├── rds.tf                   # RDS Subnet Group, random password generator, and PostgreSQL single-AZ instance
├── s3.tf                    # S3 bucket, encryption, versioning, ownership, and lifecycle policies
├── sqs.tf                   # SQS submissions queue, dead-letter queue, and redrive policy
├── alb.tf                   # Application Load Balancer, target group (:3000), and HTTP listener (:80)
├── outputs.tf               # Exported resource IDs, ARNs, and connection endpoints
├── terraform.tfvars.example # Example variable definitions for environment overrides
├── scripts/
│   └── user-data.sh         # EC2 bootstrap script (Docker & SSM setup, 0 secrets)
└── README.md                # Infrastructure documentation and operational runbook
```

---

## 2. Authentication

Terraform uses the standard AWS credential chain. No credentials or secret keys are stored in Terraform files.

To authenticate locally:
1. Ensure your AWS CLI is configured with the target identity (e.g. `nikhil-dev` in account `081897152686`):
   ```bash
   aws sts get-caller-identity
   ```
2. Terraform automatically discovers credentials from `~/.aws/credentials` or standard environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

---

## 3. Terraform State Management

- **Current Backend**: Local state (`terraform.tfstate`).
- **State Security**: The state file contains resource metadata and must never be committed to source control. `.gitignore` explicitly excludes `.terraform/`, `terraform.tfstate`, `terraform.tfstate.*`, and `*.tfvars`.
- **Future Migration**: In a future phase, state will be migrated to an Amazon S3 remote backend with DynamoDB state locking.

---

## 4. Operational Workflow

### 4.1 Initialization
Initialize Terraform to download the AWS provider and configure plugins:
```bash
terraform -chdir=infra init
```

### 4.2 Formatting & Validation
Verify syntax and code standards:
```bash
terraform -chdir=infra fmt -check
terraform -chdir=infra validate
```

### 4.3 Execution Plan
Always generate and inspect the execution plan before making any infrastructure changes:
```bash
terraform -chdir=infra plan
```

### 4.4 Applying Changes
Apply changes only after reviewing the plan:
```bash
terraform -chdir=infra apply
```

---

## 5. How Infrastructure Adoption Was Executed (Phase 4.4)

In Phase 4.4, pre-existing AWS infrastructure provisioned manually during Phases 4.2 and 4.3 was adopted without recreation or disruption:

```bash
# Networking
terraform -chdir=infra import aws_vpc.main vpc-07ccd486e95bcf90b
terraform -chdir=infra import aws_subnet.public subnet-0af80484dc390e5f7
terraform -chdir=infra import aws_subnet.db subnet-014db5ad21530af11
terraform -chdir=infra import aws_internet_gateway.main igw-0d0997aa15ae2a0e6
terraform -chdir=infra import aws_route_table.public rtb-05fba685c4b17e516
terraform -chdir=infra import aws_route_table_association.public subnet-0af80484dc390e5f7/rtb-05fba685c4b17e516
terraform -chdir=infra import aws_route_table.db rtb-0959b6e178487a0f7
terraform -chdir=infra import aws_route_table_association.db subnet-014db5ad21530af11/rtb-0959b6e178487a0f7

# Security Groups
terraform -chdir=infra import aws_security_group.alb sg-08b5329b7ac3489f6
terraform -chdir=infra import aws_security_group.ec2 sg-0cc81da3744c9bd0e
terraform -chdir=infra import aws_security_group.rds sg-0acc9f39ff6f0b6d5

# IAM
terraform -chdir=infra import aws_iam_role.ec2 formflow-ec2-role
terraform -chdir=infra import aws_iam_role_policy_attachment.ecr_read_only formflow-ec2-role/arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
terraform -chdir=infra import aws_iam_role_policy_attachment.ssm_core formflow-ec2-role/arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
terraform -chdir=infra import aws_iam_instance_profile.ec2 formflow-ec2-profile

# Compute
terraform -chdir=infra import aws_launch_template.app lt-07d9bf39007ea21b7
terraform -chdir=infra import aws_autoscaling_group.app formflow-asg
```

---

## 6. Safety Rules & Guardrails

1. **NO UNINTENDED DESTRUCTION**: Never run `terraform destroy` in this environment.
2. **ZERO EC2 / ASG CONFLICT**: The EC2 instance (`i-0dc760f5cb3864cdd`) is lifecycle-managed by the Auto Scaling Group (`formflow-asg`). Never declare an independent `aws_instance` resource in Terraform that overlaps with the ASG.
3. **LEAST PRIVILEGE IAM**: Never attach `AdministratorAccess`, `PowerUserAccess`, or wildcards to `formflow-ec2-role`. The EC2 host only requires read-only ECR access and SSM core agent capabilities.
4. **NO OPEN PORT 22**: Never add inbound port 22 (SSH) to `formflow-ec2-sg`. All remote management is handled via AWS SSM Session Manager.
5. **TAGGING CONSISTENCY**: All resources must maintain standard tags via `locals.common_tags`:
   - `Project = "FormFlow"`
   - `Environment = "production"`
   - `ManagedBy = "terraform"`
   - `Owner = "FormFlow"`

---

## 7. Future Infrastructure Modifications

When adding or updating infrastructure:
1. Create or edit `.tf` files in `infra/`.
2. Run `terraform fmt` to keep code consistent.
3. Run `terraform validate` to detect syntax/type errors.
4. Run `terraform plan` and verify that no existing resources will be accidentally replaced or destroyed.
5. Apply changes with `terraform apply`.

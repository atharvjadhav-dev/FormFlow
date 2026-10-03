variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name tag"
  type        = string
  default     = "FormFlow"
}

variable "environment" {
  description = "Environment name tag"
  type        = string
  default     = "production"
}

variable "owner" {
  description = "Owner name tag"
  type        = string
  default     = "FormFlow"
}

variable "managed_by" {
  description = "ManagedBy tag value"
  type        = string
  default     = "terraform"
}

variable "vpc_cidr" {
  description = "CIDR block for FormFlow VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for FormFlow Public Subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "db_subnet_cidr" {
  description = "CIDR block for FormFlow Private DB Subnet"
  type        = string
  default     = "10.0.100.0/24"
}

variable "availability_zone" {
  description = "Primary Availability Zone for FormFlow deployment"
  type        = string
  default     = "ap-south-1a"
}

variable "instance_type" {
  description = "EC2 instance type for FormFlow application host"
  type        = string
  default     = "t4g.small"
}

variable "ami_id" {
  description = "AMI ID for Amazon Linux 2023 ARM64"
  type        = string
  default     = "ami-0cf36b0c962e50fd7"
}

variable "asg_min_size" {
  description = "Minimum number of EC2 instances in Auto Scaling Group"
  type        = number
  default     = 1
}

variable "asg_desired_capacity" {
  description = "Desired number of EC2 instances in Auto Scaling Group"
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of EC2 instances in Auto Scaling Group"
  type        = number
  default     = 2
}

variable "db_secondary_subnet_cidr" {
  description = "CIDR block for FormFlow Secondary Private DB Subnet (ap-south-1b)"
  type        = string
  default     = "10.0.101.0/24"
}

variable "public_secondary_subnet_cidr" {
  description = "CIDR block for FormFlow Secondary Public Subnet (ap-south-1b) for ALB multi-AZ requirement"
  type        = string
  default     = "10.0.2.0/24"
}

variable "secondary_availability_zone" {
  description = "Secondary Availability Zone to satisfy RDS DB Subnet Group and ALB multi-AZ requirement"
  type        = string
  default     = "ap-south-1b"
}

variable "alb_name" {
  description = "Name for FormFlow Application Load Balancer"
  type        = string
  default     = "formflow-alb"
}

variable "target_group_name" {
  description = "Name for FormFlow Web Target Group"
  type        = string
  default     = "formflow-web-tg"
}

variable "db_instance_class" {
  description = "RDS database instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16.11"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GiB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage autoscaling ceiling in GiB"
  type        = number
  default     = 50
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "formflow"
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "formflow_owner"
}

variable "db_port" {
  description = "Database listening port"
  type        = number
  default     = 5432
}

variable "db_backup_retention_period" {
  description = "Automated backup retention period in days"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Daily backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Weekly maintenance window (UTC)"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "sqs_visibility_timeout" {
  description = "SQS queue visibility timeout in seconds"
  type        = number
  default     = 60
}

variable "sqs_message_retention_seconds" {
  description = "SQS queue message retention period in seconds (4 days)"
  type        = number
  default     = 345600
}

variable "sqs_receive_wait_time_seconds" {
  description = "SQS queue receive wait time in seconds for long polling"
  type        = number
  default     = 20
}

variable "domain_name" {
  description = "The fully-qualified domain name for the FormFlow application"
  type        = string
  default     = "form-flow.atharvjadhav.xyz"
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format for OIDC federation"
  type        = string
  default     = "atharvjadhav-dev/FormFlow"
}

variable "github_branch" {
  description = "GitHub branch authorized to assume deployment IAM role"
  type        = string
  default     = "main"
}

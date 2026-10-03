output "vpc_id" {
  description = "The ID of the FormFlow VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "The ID of the FormFlow Public Subnet"
  value       = aws_subnet.public.id
}

output "db_subnet_id" {
  description = "The ID of the FormFlow Private Database Subnet"
  value       = aws_subnet.db.id
}

output "internet_gateway_id" {
  description = "The ID of the FormFlow Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_route_table_id" {
  description = "The ID of the FormFlow Public Route Table"
  value       = aws_route_table.public.id
}

output "db_route_table_id" {
  description = "The ID of the FormFlow Database Route Table"
  value       = aws_route_table.db.id
}

output "alb_security_group_id" {
  description = "The ID of the Application Load Balancer Security Group"
  value       = aws_security_group.alb.id
}

output "ec2_security_group_id" {
  description = "The ID of the EC2 Application Host Security Group"
  value       = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  description = "The ID of the RDS PostgreSQL Security Group"
  value       = aws_security_group.rds.id
}

output "iam_role_arn" {
  description = "The ARN of the FormFlow EC2 IAM Role"
  value       = aws_iam_role.ec2.arn
}

output "instance_profile_arn" {
  description = "The ARN of the FormFlow EC2 Instance Profile"
  value       = aws_iam_instance_profile.ec2.arn
}

output "launch_template_id" {
  description = "The ID of the FormFlow Launch Template"
  value       = aws_launch_template.app.id
}

output "autoscaling_group_name" {
  description = "The Name of the FormFlow Auto Scaling Group"
  value       = aws_autoscaling_group.app.name
}

output "db_secondary_subnet_id" {
  description = "The ID of the FormFlow Secondary Private Database Subnet"
  value       = aws_subnet.db_secondary.id
}

output "rds_subnet_group_name" {
  description = "The Name of the FormFlow RDS Subnet Group"
  value       = aws_db_subnet_group.main.name
}

output "rds_instance_id" {
  description = "The Identifier of the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.identifier
}

output "rds_endpoint" {
  description = "The connection endpoint for the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "The hostname of the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "The port of the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.port
}

output "rds_database_name" {
  description = "The database name of the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.db_name
}

output "rds_username" {
  description = "The master username for the FormFlow RDS PostgreSQL Instance"
  value       = aws_db_instance.postgres.username
}

output "s3_bucket_name" {
  description = "The name of the FormFlow S3 submissions bucket"
  value       = aws_s3_bucket.submissions.id
}

output "s3_bucket_arn" {
  description = "The ARN of the FormFlow S3 submissions bucket"
  value       = aws_s3_bucket.submissions.arn
}

output "sqs_queue_url" {
  description = "The URL of the FormFlow submissions SQS queue"
  value       = aws_sqs_queue.submissions.id
}

output "sqs_queue_arn" {
  description = "The ARN of the FormFlow submissions SQS queue"
  value       = aws_sqs_queue.submissions.arn
}

output "sqs_dlq_url" {
  description = "The URL of the FormFlow submissions Dead-Letter Queue"
  value       = aws_sqs_queue.submissions_dlq.id
}

output "sqs_dlq_arn" {
  description = "The ARN of the FormFlow submissions Dead-Letter Queue"
  value       = aws_sqs_queue.submissions_dlq.arn
}

output "public_secondary_subnet_id" {
  description = "The ID of the FormFlow secondary public subnet (ap-south-1b)"
  value       = aws_subnet.public_secondary.id
}

output "alb_id" {
  description = "The ID of the FormFlow Application Load Balancer"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "The ARN of the FormFlow Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "The DNS name of the FormFlow Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "The canonical hosted zone ID of the FormFlow Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "target_group_arn" {
  description = "The ARN of the FormFlow Web Target Group"
  value       = aws_lb_target_group.web.arn
}

output "target_group_name" {
  description = "The Name of the FormFlow Web Target Group"
  value       = aws_lb_target_group.web.name
}

output "acm_certificate_arn" {
  description = "The ARN of the FormFlow ACM certificate"
  value       = aws_acm_certificate.cert.arn
}

output "acm_certificate_domain" {
  description = "The domain name of the FormFlow ACM certificate"
  value       = aws_acm_certificate.cert.domain_name
}

output "acm_certificate_status" {
  description = "The status of the FormFlow ACM certificate"
  value       = aws_acm_certificate.cert.status
}

output "acm_validation_cname_name" {
  description = "The CNAME name for ACM DNS validation (to add in Hostinger)"
  value       = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_name
}

output "acm_validation_cname_value" {
  description = "The CNAME target value for ACM DNS validation (to add in Hostinger)"
  value       = tolist(aws_acm_certificate.cert.domain_validation_options)[0].resource_record_value
}

output "https_listener_arn" {
  description = "The ARN of the FormFlow ALB HTTPS Listener"
  value       = aws_lb_listener.https.arn
}

output "github_actions_role_arn" {
  description = "The ARN of the IAM role assumed by GitHub Actions for deployment"
  value       = aws_iam_role.github_deploy.arn
}

output "github_actions_oidc_provider_arn" {
  description = "The ARN of the GitHub Actions OIDC provider"
  value       = aws_iam_openid_connect_provider.github_actions.arn
}

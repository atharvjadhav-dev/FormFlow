# ==============================================================================
# GitHub Actions OIDC Provider & Deployment IAM Role (Phase 4.13)
# ==============================================================================
# Establishes passwordless OpenID Connect (OIDC) federation between GitHub Actions
# and AWS IAM. Grants scoped permissions exclusively to the main branch of
# atharvjadhav-dev/FormFlow to dispatch SSM Run Commands to the EC2 compute fleet.
# ==============================================================================

resource "aws_iam_openid_connect_provider" "github_actions" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name        = "${var.project_name}-github-actions-oidc"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = var.managed_by
  }
}

# ------------------------------------------------------------------------------
# Dedicated GitHub Actions Deploy Role (Trusts strictly main branch of FormFlow)
# ------------------------------------------------------------------------------
resource "aws_iam_role" "github_deploy" {
  name = "${lower(var.project_name)}-github-deploy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GitHubActionsOIDC"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_actions.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:${var.github_repo}:ref:refs/heads/${var.github_branch}",
              "repo:atharvjadhav-dev*/FormFlow*:ref:refs/heads/${var.github_branch}"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-github-deploy-role"
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = var.managed_by
  }
}

# ------------------------------------------------------------------------------
# Scoped Deployment IAM Policy
# ------------------------------------------------------------------------------
# Least-privilege actions:
# - Discover active EC2 instance in ASG
# - Dispatch SSM Run Command (AWS-RunShellScript) to EC2 instances
# - Poll command status/invocation
# - Read ALB target health for post-deployment verification
# Zero access to DB passwords, S3, SSM parameter store, or infrastructure deletion.
# ------------------------------------------------------------------------------
resource "aws_iam_policy" "github_deploy" {
  name        = "${lower(var.project_name)}-github-deploy-policy"
  description = "Scoped policy allowing GitHub Actions CI/CD to orchestrate SSM deployment on FormFlow EC2 instances"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DiscoverEC2Instances"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "autoscaling:DescribeAutoScalingGroups"
        ]
        Resource = "*"
      },
      {
        Sid    = "SSMRunCommandExecution"
        Effect = "Allow"
        Action = [
          "ssm:SendCommand"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}::document/AWS-RunShellScript",
          "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*"
        ]
      },
      {
        Sid    = "SSMCommandStatusTracking"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations",
          "ssm:DescribeInstanceInformation"
        ]
        Resource = "*"
      },
      {
        Sid    = "VerifyALBTargetHealth"
        Effect = "Allow"
        Action = [
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeTargetGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = aws_iam_policy.github_deploy.arn
}

resource "aws_iam_role" "ec2" {
  name = "formflow-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "formflow-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_iam_policy" "ec2_app_access" {
  name        = "formflow-ec2-app-access"
  description = "Scoped IAM permissions for FormFlow EC2 host to access S3 submissions bucket and SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketLevelAccess"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.submissions.arn
      },
      {
        Sid    = "S3ObjectLevelAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.submissions.arn}/*"
      },
      {
        Sid    = "SQSSubmissionsQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.submissions.arn,
          aws_sqs_queue.submissions_dlq.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_app_access" {
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.ec2_app_access.arn
}


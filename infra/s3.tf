data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "submissions" {
  bucket = lower("${var.project_name}-submissions-${var.environment}-${data.aws_caller_identity.current.account_id}")

  tags = {
    Name = lower("${var.project_name}-submissions-${var.environment}")
  }
}

resource "aws_s3_bucket_ownership_controls" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "submissions" {
  bucket = aws_s3_bucket.submissions.id

  rule {
    id     = "cleanup-old-versions-and-aborted-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

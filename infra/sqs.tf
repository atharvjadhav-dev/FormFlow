resource "aws_sqs_queue" "submissions_dlq" {
  name                      = "formflow-submissions-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "formflow-submissions-dlq"
  }
}

resource "aws_sqs_queue" "submissions" {
  name                       = "formflow-submissions"
  visibility_timeout_seconds = var.sqs_visibility_timeout
  message_retention_seconds  = var.sqs_message_retention_seconds
  receive_wait_time_seconds  = var.sqs_receive_wait_time_seconds
  sqs_managed_sse_enabled    = true

  tags = {
    Name = "formflow-submissions"
  }
}

resource "aws_sqs_queue_redrive_policy" "submissions" {
  queue_url = aws_sqs_queue.submissions.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.submissions_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "submissions_dlq" {
  queue_url = aws_sqs_queue.submissions_dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.submissions.arn]
  })
}

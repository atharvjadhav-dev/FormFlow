import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const QUEUE_URL = process.env.SUBMISSIONS_QUEUE_URL;

export interface SubmissionCreatedMessage {
  type: 'submission.created';
  orgId: string;
  formId: string;
  submissionId: string;
}

/**
 * Fire-and-forget from the caller's perspective, but never actually
 * swallowed: if SQS is unreachable we log loudly rather than pretend the
 * follow-up work (confirmation email, virus scan, analytics rollup) will
 * happen. The submission itself is already committed by the time this runs,
 * so a queue outage degrades to "no confirmation email yet", not "lost data".
 */
export async function enqueueSubmissionCreated(message: SubmissionCreatedMessage) {
  if (!QUEUE_URL) {
    console.warn('SUBMISSIONS_QUEUE_URL not configured — skipping enqueue for', message.submissionId);
    return;
  }
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: message.type },
        },
      }),
    );
  } catch (err) {
    console.error('Failed to enqueue submission event', message.submissionId, err);
  }
}

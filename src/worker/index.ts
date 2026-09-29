import 'dotenv/config';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import type { SubmissionCreatedMessage } from '../lib/sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const QUEUE_URL = process.env.SUBMISSIONS_QUEUE_URL;

let shuttingDown = false;

async function processMessage(message: SubmissionCreatedMessage) {
  switch (message.type) {
    case 'submission.created':
      // Placeholder for the actual side effects: confirmation email,
      // malware scan kickoff, analytics rollup. Each of these should be its
      // own small, idempotent function — SQS's at-least-once delivery means
      // this handler WILL occasionally run twice for the same message.
      console.log(`[worker] processing submission ${message.submissionId} for form ${message.formId}`);
      break;
    default:
      console.warn('[worker] unknown message type', message);
  }
}

async function pollOnce() {
  if (!QUEUE_URL) {
    console.error('[worker] SUBMISSIONS_QUEUE_URL not configured');
    return;
  }

  const { Messages } = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // long polling — cheaper than a tight loop
      VisibilityTimeout: 60,
    }),
  );

  for (const msg of Messages ?? []) {
    try {
      const body = JSON.parse(msg.Body ?? '{}') as SubmissionCreatedMessage;
      await processMessage(body);
      if (msg.ReceiptHandle) {
        await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }));
      }
    } catch (err) {
      // Deliberately don't delete the message — it becomes visible again
      // after VisibilityTimeout and SQS's redrive policy sends it to a DLQ
      // after enough failed attempts (configured in Terraform, Phase 7).
      console.error('[worker] failed to process message, leaving for redrive', err);
    }
  }
}

async function main() {
  if (!QUEUE_URL) {
    console.error('[worker] SUBMISSIONS_QUEUE_URL not configured — exiting');
    process.exit(1);
  }
  console.log('[worker] started, long-polling SQS');
  while (!shuttingDown) {
    await pollOnce();
  }
  console.log('[worker] stopped');
}

// Graceful shutdown: finish the in-flight poll, then exit, so a pod
// terminated during a deploy doesn't drop a message mid-processing.
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, finishing current batch then exiting');
  shuttingDown = true;
});

main();

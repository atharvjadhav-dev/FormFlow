import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import type { SubmissionCreatedMessage } from '../lib/sqs';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-south-1' });
const QUEUE_URL = process.env.SUBMISSIONS_QUEUE_URL;

let shuttingDown = false;
let lastHeartbeat: Date | null = null;
let healthServer: http.Server | null = null;

const HEARTBEAT_FILE = process.env.WORKER_HEARTBEAT_PATH || path.join(process.cwd(), '.worker-heartbeat');
const HEALTH_PORT = process.env.WORKER_HEALTH_PORT
  ? parseInt(process.env.WORKER_HEALTH_PORT, 10)
  : 8081;

/**
 * Updates the worker's heartbeat state and file timestamp.
 */
function recordHeartbeat() {
  lastHeartbeat = new Date();
  try {
    fs.writeFileSync(HEARTBEAT_FILE, lastHeartbeat.toISOString());
  } catch {
    // Non-fatal if filesystem is read-only
  }
}

/**
 * Cleans up the heartbeat file on shutdown.
 */
function cleanupHeartbeatFile() {
  try {
    if (fs.existsSync(HEARTBEAT_FILE)) {
      fs.unlinkSync(HEARTBEAT_FILE);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Lightweight HTTP health server for liveness & readiness checks in container runtimes.
 * Does not depend on external frameworks.
 */
function startHealthServer(): http.Server | null {
  if (process.env.WORKER_HEALTH_PORT === '0' || process.env.WORKER_HEALTH_PORT === 'disabled') {
    return null;
  }

  const server = http.createServer((req, res) => {
    const url = req.url?.split('?')[0] || '/';

    if (url === '/health/live' || url === '/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          worker: 'alive',
          uptimeSeconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    if (url === '/health/ready' || url === '/ready') {
      if (shuttingDown) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'shutting_down' }));
        return;
      }

      if (!QUEUE_URL) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'unconfigured', message: 'SUBMISSIONS_QUEUE_URL not configured' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          lastHeartbeat: lastHeartbeat?.toISOString() ?? null,
          queueConfigured: true,
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(HEALTH_PORT, () => {
    console.log(`[worker] Health probe server listening on port ${HEALTH_PORT}`);
  });

  server.on('error', (err) => {
    console.warn('[worker] Health server error (non-fatal):', err.message);
  });

  return server;
}

async function processMessage(message: SubmissionCreatedMessage) {
  switch (message.type) {
    case 'submission.created':
      // Placeholder for side effects: confirmation email, malware scan, analytics rollup.
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

  recordHeartbeat();

  const { Messages } = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20, // long polling — cheaper than a tight loop
      VisibilityTimeout: 60,
    }),
  );

  recordHeartbeat();

  for (const msg of Messages ?? []) {
    try {
      const body = JSON.parse(msg.Body ?? '{}') as SubmissionCreatedMessage;
      await processMessage(body);
      if (msg.ReceiptHandle) {
        await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE_URL, ReceiptHandle: msg.ReceiptHandle }));
      }
    } catch (err) {
      // Deliberately don't delete the message — SQS redrive policy handles failed attempts
      console.error('[worker] failed to process message, leaving for redrive', err);
    }
  }
}

async function main() {
  if (!QUEUE_URL) {
    console.error('[worker] SUBMISSIONS_QUEUE_URL not configured — exiting');
    process.exit(1);
  }

  healthServer = startHealthServer();
  recordHeartbeat();

  console.log('[worker] started, long-polling SQS');
  while (!shuttingDown) {
    await pollOnce();
  }

  if (healthServer) {
    healthServer.close();
  }
  cleanupHeartbeatFile();
  console.log('[worker] stopped');
}

// Graceful shutdown: finish the in-flight poll, then exit
function handleShutdown(signal: string) {
  console.log(`[worker] ${signal} received, finishing current batch then exiting`);
  shuttingDown = true;
  if (healthServer) {
    healthServer.close();
  }
  cleanupHeartbeatFile();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

main();

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Run against a real deployed environment, never production during business
// hours:
//   k6 run -e BASE_URL=https://dev.forms.example.com -e FORM_SLUG=scholarship-2026-abc123 loadtest/submission-spike.js
//
// This is the scenario from the brief, almost verbatim: a form opens at a
// specific instant and ~1,000 people hit it in the same few seconds. The
// `scenarios` block below models that as a near-vertical ramp rather than a
// gradual load test — gradual ramps hide the exact failure mode this
// architecture was built to survive (the thundering-herd read on open, not
// steady-state throughput).

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const FORM_SLUG = __ENV.FORM_SLUG;

const submitErrors = new Counter('submit_errors');
const submitDuration = new Trend('submit_duration', true);
const formLoadDuration = new Trend('form_load_duration', true);

export const options = {
  scenarios: {
    thundering_herd: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1200 }, // the spike: 0 -> 1,200 concurrent in 10s
        { duration: '30s', target: 1200 }, // hold — this is the part that actually tests sustained capacity
        { duration: '20s', target: 0 },    // taper off
      ],
    },
  },
  thresholds: {
    // If either of these fail, the HPA/connection-pool sizing needs
    // revisiting before this goes anywhere near a real applicant deadline.
    http_req_failed: ['rate<0.01'], // under 1% errors even at peak
    submit_duration: ['p(95)<2000'], // 95% of submissions ack within 2s
  },
};

export default function () {
  if (!FORM_SLUG) {
    throw new Error('Set -e FORM_SLUG=<published-form-slug> before running this');
  }

  // 1. Load the form — this is what the Redis schema cache (Phase 5) exists for.
  const loadStart = Date.now();
  const formRes = http.get(`${BASE_URL}/f/${FORM_SLUG}`);
  formLoadDuration.add(Date.now() - loadStart);
  check(formRes, { 'form page loads': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1); // a real person spends a few seconds reading before filling anything in

  // 2. Submit. idempotencyKey is unique per VU-iteration, same as a real
  // browser tab would generate exactly once per fill-out session.
  const idempotencyKey = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    formVersionId: __ENV.FORM_VERSION_ID || 'replace-with-a-real-published-version-id',
    idempotencyKey,
    answers: {
      name: `Load Test Student ${__VU}`,
      email: `loadtest-${__VU}-${__ITER}@example.com`,
    },
    files: [],
  });

  const submitStart = Date.now();
  const submitRes = http.post(`${BASE_URL}/api/forms/${FORM_SLUG}/submit`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  submitDuration.add(Date.now() - submitStart);

  const ok = check(submitRes, {
    'submit succeeded or was correctly rate-limited': (r) => [200, 201, 429].includes(r.status),
  });
  if (!ok) submitErrors.add(1);

  sleep(1);
}

# FormFlow

Multi-tenant form builder and submissions platform — organizations create
forms with a drag-and-drop builder, publish them with an open/close window,
and manage submissions from a dashboard. Built for the brief's exact
scenario: a school opening "Scholarship Application 2026" to ~1,000
students at a specific instant.

## Status

All 9 phases from the original plan are done. Read **"Honest limitations"**
before assuming that means "deployed and battle-tested" — it means
something more specific than that, laid out below.

- [x] Phase 1 — Architecture & data model
- [x] Phase 2 — Foundations (Next.js, Clerk, local dev)
- [x] Phase 3 — Form builder
- [x] Phase 4 — Public form + submissions
- [x] Phase 5 — Scale layer (Redis, SQS)
- [x] Phase 6 — Admin dashboard
- [x] Phase 7 — Infrastructure as code (Terraform)
- [x] Phase 8 — Containers, K8s & CI/CD
- [x] Phase 9 — Observability, load test & docs

## What's here

```
src/
  db/
    schema.ts               7 tables, all org-scoped; FormField/FormSchema types
    client.ts                withOrg() — the only way tenant data should be touched
    public.ts                the narrow public-data gateway for /f/[slug] (BYPASSRLS, intentionally)
    queries.ts, audit          small service-role helpers
    migrations/
      0000_*.sql              generated from schema.ts
      0001_rls_policies.sql    hand-written: roles + row-level security
  middleware.ts               public vs. authenticated routes, org-required redirect
  lib/
    field-types.ts, form-schema.ts   shared field metadata + conditional-visibility logic
    datetime.ts               timezone-aware datetime-local <-> UTC conversion
    availability.ts           the one function deciding if a form is open right now
    s3.ts, sqs.ts, redis.ts, rate-limit.ts
  components/
    ui/                       Button/Input/Label/Textarea primitives
    forms/field-renderer.tsx  renders any field type — shared by the builder AND the public runtime
    builder/                  dnd-kit palette, canvas, properties panel, reducer
    dashboard/                submissions table
  app/
    (marketing) page.tsx, sign-in/, sign-up/, onboarding/
    f/[slug]/                 public form: page.tsx (server-side window check) + form-client.tsx
    api/forms/[slug]/         submit + presign routes (rate-limited, publicly reachable)
    api/webhooks/clerk/       org/member sync — the only writer of organizations/members
    api/health/               what K8s probes and the ALB health check hit
    api/submissions/export/   CSV export
    dashboard/                layout+nav, forms (builder), submissions (+ detail), analytics, team, settings
  worker/index.ts             standalone SQS consumer — own Dockerfile, own K8s Deployment
scripts/test-rls.ts           proves tenant isolation holds — actually run, three ways (see below)
infra/terraform/               VPC, EKS, RDS, Redis, S3, SQS, KMS, IAM/IRSA, WAF, DNS/CloudFront, observability
k8s/                           namespace, deployments (app+worker), service, ingress, HPA, PDB
.github/workflows/             ci.yml, deploy.yml, terraform.yml
loadtest/submission-spike.js   k6 — the 1,000-concurrent-submission scenario, almost verbatim from the brief
Dockerfile, Dockerfile.worker
docker-compose.yml             Postgres + Redis for local dev
```

## The multi-tenancy model

Every tenant-owned table (`forms`, `form_versions`, `submissions`,
`submission_files`, `audit_logs`, `members`) has Postgres row-level security
enabled and **forced** — even the table owner is subject to it. Each policy
restricts rows to `org_id = current_setting('app.current_org_id')`.

Three Postgres roles, three jobs:

| Role | Used by | Bypasses RLS? |
|---|---|---|
| `formflow_owner` | Migrations only | irrelevant — never serves a request |
| `formflow_service` | Clerk webhook (org/member sync), the public `/f/[slug]` read path, admin scripts | Yes — trusted, non-tenant-facing paths only |
| `formflow_app` | Every authenticated dashboard request, via `withOrg()` | No |

`formflow_app` was never granted `INSERT` on `organizations`/`members` at
the privilege level — creating an org isn't a per-tenant operation, so it
only happens through the service role.

`withOrg(orgId, fn)` opens a transaction, sets `app.current_org_id` with
`SET LOCAL` semantics (`set_config(..., true)`), runs your query, commits.
That setting only lives for the transaction, which is what makes it safe
under connection pooling (including PgBouncer in transaction mode) — the
context can never leak into a different request reusing the same physical
connection.

**This was verified three separate times, not just written:**
`npm run test:rls` creates two orgs and confirms a plain `SELECT * FROM forms`
with no `WHERE` clause still can't cross tenants; a connection with no org
context set sees nothing at all (fails closed); and `formflow_app` gets a
hard `permission denied` — not just an empty result — when it tries to
insert an organization directly.

## Running it locally

```bash
cp .env.example .env
docker compose up -d          # postgres:5432, redis:6379

psql "$DATABASE_URL" -f src/db/migrations/0000_*.sql
psql "$DATABASE_URL" -v app_password=formflow_app_dev -v service_password=formflow_service_dev \
  -f src/db/migrations/0001_rls_policies.sql

npm run test:rls              # should print PASS
npm install
npm run dev                   # http://localhost:3000
```

You'll need a Clerk application (clerk.com) with **Organizations** enabled,
and — for file uploads to actually work — a real S3 bucket and SQS queue
(`.env.example` has the full list of variables). Without those, everything
except file upload/download and the async-job path still works.

For the webhook (`/api/webhooks/clerk`) to fire locally, point ngrok or
`clerk listen` at your dev server and subscribe to the events listed in
`.env.example`.

## Deploying for real

1. **`infra/terraform/`** — provisions everything except the ALB itself
   (created by the AWS Load Balancer Controller from the k8s Ingress — a
   genuine two-phase process, explained in `infra/terraform/README.md`).
2. **`k8s/`** — apply order and prerequisites in `k8s/README.md`.
3. **`.github/workflows/`** — `ci.yml` runs on every PR (lint, typecheck,
   the real RLS test against a Postgres service container, build).
   `terraform.yml` plans on PRs touching `infra/`, applies on merge behind a
   required-reviewers environment gate. `deploy.yml` builds both images,
   pushes to ECR, and rolls them out to EKS.
4. **`loadtest/submission-spike.js`** — the 1,000-concurrent scenario,
   against a real deployed environment.

## Honest limitations — read this before trusting any of the above blindly

This was built in a sandboxed environment with **no network path to AWS,
Clerk, or the Terraform CLI's own distribution** — only to Postgres/Redis
(installed locally and used for real testing) and npm/GitHub/PyPI. That
split matters for what "done" means here:

**Actually run and verified:**
- The entire Next.js app — `next build` passes cleanly across all 18
  routes, `eslint`/`tsc --noEmit` are clean.
- Postgres schema, migrations, and RLS — against a real local Postgres 16,
  three separate tests (see above).
- The Redis rate limiter — against a real local Redis, confirmed it allows
  exactly N requests and blocks the rest.
- Along the way, this caught and fixed several real bugs before they'd
  have shipped: a membership-removal webhook that deleted every member of
  an org instead of just the one who left; middleware that didn't actually
  cover the public submit/presign routes (would have 403'd every
  applicant); a rate limiter that threw instead of failing open on a Redis
  outage; a health-check route that was itself blocked by auth middleware
  (would have made every pod look permanently unhealthy); and a completely
  broken RLS migration after a refactor (`psql` doesn't interpolate
  `:'variables'` inside `DO $$ $$` blocks — fixed with the `\gexec` idiom,
  re-verified from a fresh database).

**Written carefully, reviewed, but not executed:**
- All of `infra/terraform/` — no Terraform CLI available to `validate` or
  `plan`. Brace-balanced across ~1,540 lines, reviewed resource-by-resource
  against how these AWS services actually behave, but that is not the same
  as a real plan. **Run `terraform validate` yourself as the first step.**
- The S3 presigned upload/download flow and SQS producer/consumer — no AWS
  account reachable from this sandbox. The code follows the AWS SDK v3's
  documented patterns, but has never round-tripped an actual file.
- The Clerk webhook payload shapes (`organizationMembership.*` especially)
  — written from memory since clerk.com isn't reachable here either. Verify
  against the dashboard's payload preview before depending on it.
- The Kubernetes manifests and GitHub Actions workflows — internally
  consistent (namespace/service-account names, secret keys, and image
  references all match up across files), but never applied to a real
  cluster.
- `loadtest/submission-spike.js` — k6 isn't installed here. Written against
  k6's real API, not run.

None of this means "probably broken." It means the confidence level is
genuinely different between "I watched this pass" and "I read this
carefully and it should work" — and it seemed more useful to say which is
which than to blur the line.

## Why a few things are shaped the way they are

- **`form_versions` is append-only.** Publishing snapshots a new row and
  repoints `forms.currentPublishedVersionId` rather than editing in place.
  A submission stores which version it was filled against, so editing a
  form later can never invalidate an existing submission.
- **`submission_files` stores S3 keys, never bytes.** The browser uploads
  directly to S3 via a presigned URL; Postgres and the app server only ever
  see metadata.
- **`idempotencyKey` + a unique index on `(form_id, idempotency_key)`.** A
  retried submit from a flaky connection is rejected as a duplicate at the
  database level, not just deduped client-side.
- **Timestamps are `timestamptz`, stored in UTC.** Each form version
  carries its own `timezone` for display/comparison — the school in the
  brief configures "1 Sept 2026 09:00 IST", but the row holds an
  unambiguous UTC instant, converted with `src/lib/datetime.ts` (pure
  `Intl`, no date library dependency).
- **The published-form lookup is cached in Redis (30s TTL, invalidated on
  publish).** This is the direct answer to "1,000 students refreshing at
  9:00:00 IST" — that read hits Redis, not Postgres, for everyone after the
  first request.
- **Three IAM identities in Terraform (app, worker, migrator), not one.**
  The app pods can `PutObject`/`GetObject` on the submissions bucket and
  `SendMessage` to the queue; the worker can `ReceiveMessage`/`DeleteMessage`
  and `GetObject` but never `SendMessage` or write to Postgres directly.
  Neither can reach any other bucket or queue in the account.

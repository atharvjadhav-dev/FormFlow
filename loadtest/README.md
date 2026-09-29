# Load testing

Not run here — this sandbox has no path to install k6 or reach a deployed
FormFlow environment. Written carefully against k6's actual API, but treat
it as a strong starting point to run yourself, not a verified result.

## Install k6

```bash
# macOS
brew install k6
# Debian/Ubuntu
sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
```

## Get a form version ID to test against

Publish a form in the dashboard, then either check the Network tab when
loading `/f/<slug>` (the page passes `formVersionId` to the client) or
query it directly:

```sql
SELECT id FROM form_versions WHERE form_id = '<form-id>' AND status = 'published';
```

## Run it

```bash
k6 run \
  -e BASE_URL=https://dev.forms.example.com \
  -e FORM_SLUG=scholarship-2026-abc123 \
  -e FORM_VERSION_ID=<uuid-from-above> \
  submission-spike.js
```

## Reading the results

- `http_req_failed` and `submit_duration` thresholds (in the script) are
  what actually pass/fail the run — everything else is informational.
- Watch the CloudWatch dashboard (`infra/terraform/modules/observability`)
  in another tab while this runs: RDS connections and CPU, Redis CPU, HPA
  replica count. If RDS connections climb close to `max_connections`
  before VUs hit 1,200, the pool size in `src/db/client.ts` (or the number
  of app pods) needs a second look.
- A form that isn't open yet (before `startAt`) or already closed will
  fail every submit with 403 by design — make sure the test form's window
  actually covers the run.

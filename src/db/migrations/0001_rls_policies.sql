-- Row-level security for multi-tenant isolation.
--
-- Roles:
--   formflow_owner   — runs migrations (DDL). Not used at request time.
--   formflow_service — BYPASSRLS. Only for trusted, non-tenant-facing paths:
--                      Clerk webhook handlers (org/member sync), admin scripts.
--   formflow_app     — what every normal request runs as, via withOrg().
--                      No BYPASSRLS: every query it issues is subject to the
--                      policies below.
--
-- Every policy fails closed: if a connection never called
--   SELECT set_config('app.current_org_id', <uuid>, true)
-- inside its current transaction, current_setting(...) returns NULL and no
-- rows match. There is no "forgot to filter" failure mode here — the
-- database, not application code, is the last line of defense.

SELECT format('CREATE ROLE formflow_service LOGIN PASSWORD %L BYPASSRLS', :'service_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'formflow_service') \gexec

SELECT format('CREATE ROLE formflow_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'formflow_app') \gexec

GRANT USAGE ON SCHEMA public TO formflow_service, formflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO formflow_service, formflow_app;

-- Platform tables: only the service role (webhook handlers) creates orgs and
-- members — there is no tenant context yet at the moment an org is first
-- created, so this can never be a per-tenant operation. The app role can
-- read and update (e.g. an org editing its own settings, changing a
-- member's role) but was never granted INSERT here.
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations, members TO formflow_service;
GRANT SELECT, UPDATE, DELETE ON organizations, members TO formflow_app;

-- Tenant-operational tables: the app role gets full CRUD, restricted per-row
-- by the policies below. The service role stays BYPASSRLS for cross-tenant
-- admin/maintenance tasks and never serves a request directly.
GRANT SELECT, INSERT, UPDATE, DELETE ON forms, form_versions, submissions, submission_files, audit_logs
  TO formflow_service, formflow_app;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organizations_isolation ON organizations
  USING (id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE members FORCE ROW LEVEL SECURITY;
CREATE POLICY members_isolation ON members
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms FORCE ROW LEVEL SECURITY;
CREATE POLICY forms_isolation ON forms
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY form_versions_isolation ON form_versions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions FORCE ROW LEVEL SECURITY;
CREATE POLICY submissions_isolation ON submissions
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files FORCE ROW LEVEL SECURITY;
CREATE POLICY submission_files_isolation ON submission_files
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_isolation ON audit_logs
  USING (org_id = current_setting('app.current_org_id', true)::uuid);

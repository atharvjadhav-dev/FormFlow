import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in environment variables.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('🔄 Connecting to database for migration...');

    // 1. Run 0000_silent_unicorn.sql (Schema tables & enums)
    const migration0Path = path.join(process.cwd(), 'src/db/migrations/0000_silent_unicorn.sql');
    if (fs.existsSync(migration0Path)) {
      console.log('📦 Applying table definitions (0000_silent_unicorn.sql)...');
      const schemaSql = fs.readFileSync(migration0Path, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Base tables and enums ready.');
    }

    // 2. Set up Postgres roles
    const appPassword = process.env.APP_DB_PASSWORD || 'formflow_app_dev';
    const servicePassword = process.env.SERVICE_DB_PASSWORD || 'formflow_service_dev';

    console.log('🛡️ Configuring security roles and Row-Level Security (RLS)...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'formflow_service') THEN
          EXECUTE format('CREATE ROLE formflow_service LOGIN PASSWORD %L BYPASSRLS', '${servicePassword}');
        END IF;

        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'formflow_app') THEN
          EXECUTE format('CREATE ROLE formflow_app LOGIN PASSWORD %L', '${appPassword}');
        END IF;
      END
      $$;
    `);

    // 3. Grants
    await client.query(`
      GRANT USAGE ON SCHEMA public TO formflow_service, formflow_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO formflow_service, formflow_app;

      GRANT SELECT, INSERT, UPDATE, DELETE ON organizations, members TO formflow_service;
      GRANT SELECT, UPDATE, DELETE ON organizations, members TO formflow_app;

      GRANT SELECT, INSERT, UPDATE, DELETE ON forms, form_versions, submissions, submission_files, audit_logs
        TO formflow_service, formflow_app;
    `);

    // 4. Row Level Security policies (idempotent setup)
    const tables = [
      { table: 'organizations', col: 'id' },
      { table: 'members', col: 'org_id' },
      { table: 'forms', col: 'org_id' },
      { table: 'form_versions', col: 'org_id' },
      { table: 'submissions', col: 'org_id' },
      { table: 'submission_files', col: 'org_id' },
      { table: 'audit_logs', col: 'org_id' },
    ];

    for (const { table, col } of tables) {
      const policyName = `${table}_isolation`;
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await client.query(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      await client.query(`DROP POLICY IF EXISTS "${policyName}" ON "${table}";`);
      await client.query(`
        CREATE POLICY "${policyName}" ON "${table}"
          USING ("${col}" = current_setting('app.current_org_id', true)::uuid);
      `);
    }

    console.log('✅ Row-Level Security policies applied successfully.');
    console.log('🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();

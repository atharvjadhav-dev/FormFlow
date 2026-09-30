import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export function getMigrationsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'dist/db/migrations'),
    path.join(process.cwd(), 'src/db/migrations'),
    path.join(process.cwd(), 'migrations'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return path.join(process.cwd(), 'src/db/migrations');
}

export function validateMigrationPasswords(env: {
  NODE_ENV?: string;
  APP_DB_PASSWORD?: string;
  SERVICE_DB_PASSWORD?: string;
}) {
  const isProduction = env.NODE_ENV === 'production';
  const appPassword = env.APP_DB_PASSWORD;
  const servicePassword = env.SERVICE_DB_PASSWORD;

  if (isProduction && (!appPassword || !servicePassword)) {
    throw new Error(
      'Production Migration Error: APP_DB_PASSWORD and SERVICE_DB_PASSWORD must be explicitly provided in production. Default development passwords are not permitted.',
    );
  }

  return {
    appPassword: appPassword || 'formflow_app_dev',
    servicePassword: servicePassword || 'formflow_service_dev',
  };
}

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
  }

  const { appPassword, servicePassword } = validateMigrationPasswords({
    NODE_ENV: process.env.NODE_ENV,
    APP_DB_PASSWORD: process.env.APP_DB_PASSWORD,
    SERVICE_DB_PASSWORD: process.env.SERVICE_DB_PASSWORD,
  });

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('🔄 Connecting to database for migration...');

    // 1. Run 0000_silent_unicorn.sql (Schema tables & enums)
    const migrationsDir = getMigrationsDir();
    const migration0Path = path.join(migrationsDir, '0000_silent_unicorn.sql');
    if (fs.existsSync(migration0Path)) {
      console.log(`📦 Applying table definitions from ${migration0Path}...`);
      const schemaSql = fs.readFileSync(migration0Path, 'utf8');
      const statements = schemaSql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (err: any) {
          // Idempotent: Ignore 42710 (duplicate_object) and 42P07 (duplicate_table)
          if (err.code === '42710' || err.code === '42P07') {
            continue;
          }
          throw err;
        }
      }
      console.log('✅ Base tables and enums ready.');
    } else {
      console.warn(`⚠️ Migration file not found at ${migration0Path}`);
    }

    // 2. Set up Postgres roles
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
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute directly if run via CLI
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isDirectRun) {
  runMigrations().catch((err) => {
    console.error('❌ Migration failed:', err.message || err);
    process.exit(1);
  });
}

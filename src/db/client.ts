import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export type Tx = NodePgDatabase<typeof schema>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const appPool = new Pool({
  connectionString: process.env.APP_DATABASE_URL,
  // Sized for HPA scale-out: with N pods x this max, stay under RDS's
  // max_connections. Revisit alongside RDS Proxy / PgBouncer in Phase 7.
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Service-role connection: BYPASSRLS. Only for Clerk webhook handlers
// (organization.created, organizationMembership.created, ...) and
// admin/maintenance scripts. Never use this to serve a tenant-facing
// request — there is no isolation on this connection at all.
const servicePool = new Pool({ connectionString: process.env.SERVICE_DATABASE_URL });
export const dbService = drizzle(servicePool, { schema });

const orgUuidCache = new Map<string, string>();

export async function resolveOrgUuid(orgId: string): Promise<string> {
  if (UUID_REGEX.test(orgId)) return orgId;

  const cached = orgUuidCache.get(orgId);
  if (cached) return cached;

  const [existing] = await dbService
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.clerkOrgId, orgId))
    .limit(1);

  if (existing) {
    orgUuidCache.set(orgId, existing.id);
    return existing.id;
  }

  const [created] = await dbService
    .insert(schema.organizations)
    .values({
      clerkOrgId: orgId,
      name: 'Organization',
      slug: `org-${orgId.slice(-8)}-${crypto.randomUUID().slice(0, 4)}`,
    })
    .onConflictDoUpdate({
      target: schema.organizations.clerkOrgId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: schema.organizations.id });

  orgUuidCache.set(orgId, created.id);
  return created.id;
}

/**
 * Runs `fn` inside a transaction scoped to a single organization.
 *
 * `SET LOCAL` (via set_config's third argument) only applies for the
 * lifetime of the current transaction — it is automatically unset on
 * COMMIT/ROLLBACK. That's what makes this safe to use with a pooled
 * connection (including PgBouncer in transaction mode): the org context can
 * never leak into the next request that happens to reuse this connection,
 * because there is no "next request" until this transaction has already
 * ended.
 *
 * Every table this can touch has RLS + FORCE ROW LEVEL SECURITY enabled, so
 * even a handler that forgets a WHERE org_id = ... clause cannot read or
 * write another tenant's rows.
 */
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const resolvedOrgId = await resolveOrgUuid(orgId);
  const client = await appPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.current_org_id', resolvedOrgId]);
    const result = await fn(drizzle(client, { schema }));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeAllPools() {
  await appPool.end();
  await servicePool.end();
}

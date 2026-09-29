import 'dotenv/config';
import { withOrg, dbService, closeAllPools } from '../src/db/client';
import { organizations, forms } from '../src/db/schema';

async function main() {
  const stamp = Date.now();

  // Seeding orgs simulates the Clerk `organization.created` webhook path —
  // it goes through dbService (BYPASSRLS), never through withOrg().
  const [orgA] = await dbService
    .insert(organizations)
    .values({ clerkOrgId: `clerk_org_a_${stamp}`, name: 'School A', slug: `school-a-${stamp}` })
    .returning();
  const [orgB] = await dbService
    .insert(organizations)
    .values({ clerkOrgId: `clerk_org_b_${stamp}`, name: 'School B', slug: `school-b-${stamp}` })
    .returning();

  // Each form is created through withOrg(), the same path a real request takes.
  await withOrg(orgA.id, (tx) =>
    tx.insert(forms).values({
      orgId: orgA.id,
      name: 'Scholarship 2026',
      slug: `scholarship-a-${stamp}`,
      createdBy: 'user_a',
    }),
  );
  await withOrg(orgB.id, (tx) =>
    tx.insert(forms).values({
      orgId: orgB.id,
      name: 'Admissions 2026',
      slug: `admissions-b-${stamp}`,
      createdBy: 'user_b',
    }),
  );

  // The actual test: a bare `select().from(forms)` with NO where clause at
  // all. If RLS is doing its job, org A still only ever sees its own row.
  const seenByOrgA = await withOrg(orgA.id, (tx) => tx.select().from(forms));
  const seenByOrgB = await withOrg(orgB.id, (tx) => tx.select().from(forms));

  console.log(`Org A (no WHERE clause) sees ${seenByOrgA.length} form(s):`, seenByOrgA.map((f) => f.name));
  console.log(`Org B (no WHERE clause) sees ${seenByOrgB.length} form(s):`, seenByOrgB.map((f) => f.name));

  const pass =
    seenByOrgA.length === 1 &&
    seenByOrgA[0].name === 'Scholarship 2026' &&
    seenByOrgB.length === 1 &&
    seenByOrgB[0].name === 'Admissions 2026';

  console.log(
    pass
      ? '\nPASS — a query with no org filter still cannot cross tenants.'
      : '\nFAIL — isolation is broken, stop and fix this before building anything on top of it.',
  );

  await closeAllPools();
  process.exit(pass ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeAllPools();
  process.exit(1);
});

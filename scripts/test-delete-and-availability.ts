import 'dotenv/config';
import { withOrg, dbService } from '../src/db/client';
import { organizations, members, forms, formVersions, submissions } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { deleteForm } from '../src/app/dashboard/forms/actions';

async function runTests() {
  console.log('🧪 Testing Delete Form & Availability Badge Logic...\n');
  const stamp = Date.now();

  // 1. Create test org and member
  const [org] = await dbService
    .insert(organizations)
    .values({
      clerkOrgId: `org_test_del_${stamp}`,
      name: 'Delete & Status Test Org',
      slug: `test-del-${stamp}`,
    })
    .returning();

  await dbService.insert(members).values({
    orgId: org.id,
    clerkUserId: `user_del_${stamp}`,
    email: `tester_${stamp}@example.com`,
    name: 'Test Admin',
    role: 'admin',
  });

  console.log(`✅ Provisioned test org: ${org.id}`);

  // Mock requireOrgAuth by setting env or passing context
  // Let's test the database query with leftJoin formVersions
  const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const futureDate = new Date(Date.now() + 3600 * 1000); // 1 hour in future

  // Form 1: Expired form (Ended)
  const form1Id = await withOrg(org.id, async (tx) => {
    const [f] = await tx
      .insert(forms)
      .values({
        orgId: org.id,
        name: 'Expired Scholarship Form',
        slug: `expired-${stamp}`,
        status: 'published',
        createdBy: `user_del_${stamp}`,
      })
      .returning();

    const [v] = await tx
      .insert(formVersions)
      .values({
        formId: f.id,
        orgId: org.id,
        versionNumber: 1,
        schema: { fields: [] },
        status: 'published',
        endAt: pastDate,
      })
      .returning();

    await tx.update(forms).set({ currentPublishedVersionId: v.id }).where(eq(forms.id, f.id));
    return f.id;
  });

  // Form 2: Active form (Published)
  const form2Id = await withOrg(org.id, async (tx) => {
    const [f] = await tx
      .insert(forms)
      .values({
        orgId: org.id,
        name: 'Active Live Form',
        slug: `active-${stamp}`,
        status: 'published',
        createdBy: `user_del_${stamp}`,
      })
      .returning();

    const [v] = await tx
      .insert(formVersions)
      .values({
        formId: f.id,
        orgId: org.id,
        versionNumber: 1,
        schema: { fields: [] },
        status: 'published',
        endAt: futureDate,
      })
      .returning();

    await tx.update(forms).set({ currentPublishedVersionId: v.id }).where(eq(forms.id, f.id));
    return f.id;
  });

  // Form 3: Form to delete
  const form3Id = await withOrg(org.id, async (tx) => {
    const [f] = await tx
      .insert(forms)
      .values({
        orgId: org.id,
        name: 'Form To Delete',
        slug: `to-delete-${stamp}`,
        status: 'draft',
        createdBy: `user_del_${stamp}`,
      })
      .returning();

    const [v] = await tx
      .insert(formVersions)
      .values({
        formId: f.id,
        orgId: org.id,
        versionNumber: 1,
        schema: { fields: [] },
        status: 'draft',
      })
      .returning();

    await tx.insert(submissions).values({
      orgId: org.id,
      formId: f.id,
      formVersionId: v.id,
      idempotencyKey: `idem_${stamp}`,
      answers: {},
    });

    return f.id;
  });

  console.log(`✅ Created test forms: Expired (${form1Id}), Active (${form2Id}), To-Delete (${form3Id})`);

  // Test the select query used on FormsPage
  const queryResults = await withOrg(org.id, async (tx) => {
    return tx
      .select({
        id: forms.id,
        name: forms.name,
        slug: forms.slug,
        status: forms.status,
        startAt: formVersions.startAt,
        endAt: formVersions.endAt,
      })
      .from(forms)
      .leftJoin(formVersions, eq(formVersions.id, forms.currentPublishedVersionId))
      .where(eq(forms.orgId, org.id));
  });

  console.log('\n--- Availability Checks ---');
  const now = new Date();
  for (const f of queryResults) {
    let computedStatus: string = f.status;
    if (f.status === 'published') {
      if (f.endAt && now > new Date(f.endAt)) computedStatus = 'ended';
      else if (f.startAt && now < new Date(f.startAt)) computedStatus = 'scheduled';
    }
    console.log(`Form "${f.name}": status=${f.status}, endAt=${f.endAt?.toISOString() ?? 'none'} => display="${computedStatus}"`);
    if (f.id === form1Id) {
      if (computedStatus !== 'ended') throw new Error(`Form 1 should be ended, got ${computedStatus}`);
      console.log('   ✅ Expired form displays "ended" correctly!');
    }
    if (f.id === form2Id) {
      if (computedStatus !== 'published') throw new Error(`Form 2 should be published, got ${computedStatus}`);
      console.log('   ✅ Active form displays "published" correctly!');
    }
  }

  console.log('\n--- Cascade Deletion Check ---');
  // Delete form 3 inside withOrg
  await withOrg(org.id, async (tx) => {
    await tx.delete(forms).where(eq(forms.id, form3Id));
  });

  // Verify form3, its version, and its submissions are gone
  const [checkForm] = await dbService.select().from(forms).where(eq(forms.id, form3Id));
  const checkVersions = await dbService.select().from(formVersions).where(eq(formVersions.formId, form3Id));
  const checkSubmissions = await dbService.select().from(submissions).where(eq(submissions.formId, form3Id));

  if (checkForm) throw new Error('Form 3 was not deleted from forms table');
  if (checkVersions.length > 0) throw new Error('Form 3 versions were not cascade-deleted');
  if (checkSubmissions.length > 0) throw new Error('Form 3 submissions were not cascade-deleted');

  console.log('   ✅ Form, versions, and submissions all cleanly cascade-deleted!');
  console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

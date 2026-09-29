'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withOrg } from '@/db/client';
import { organizations } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';

export async function updateOrgTimezone(timezone: string) {
  const { orgId } = await requireOrgAuth();

  await withOrg(orgId, (tx) =>
    tx.update(organizations).set({ timezone, updatedAt: new Date() }).where(eq(organizations.id, orgId)),
  );

  revalidatePath('/dashboard/settings');
}

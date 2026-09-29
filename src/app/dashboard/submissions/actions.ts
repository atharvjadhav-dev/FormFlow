'use server';

import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withOrg } from '@/db/client';
import { submissions, auditLogs, submissionStatusEnum } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';

type Status = (typeof submissionStatusEnum.enumValues)[number];

export async function updateSubmissionStatus(submissionId: string, status: Status, reviewNotes?: string) {
  const { userId, orgId } = await requireOrgAuth();

  await withOrg(orgId, async (tx) => {
    await tx
      .update(submissions)
      .set({ status, reviewedBy: userId, reviewedAt: new Date(), reviewNotes })
      .where(eq(submissions.id, submissionId));

    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'submission.status_changed',
      targetType: 'submission',
      targetId: submissionId,
      metadata: { status },
    });
  });

  revalidatePath('/dashboard/submissions');
  revalidatePath(`/dashboard/submissions/${submissionId}`);
}

export async function bulkUpdateStatus(submissionIds: string[], status: Status) {
  if (submissionIds.length === 0) return;
  const { userId, orgId } = await requireOrgAuth();

  await withOrg(orgId, async (tx) => {
    await tx.update(submissions).set({ status, reviewedBy: userId, reviewedAt: new Date() }).where(inArray(submissions.id, submissionIds));

    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'submission.bulk_status_changed',
      targetType: 'submission',
      metadata: { status, submissionIds },
    });
  });

  revalidatePath('/dashboard/submissions');
}

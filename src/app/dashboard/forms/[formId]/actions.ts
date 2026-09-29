'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { withOrg } from '@/db/client';
import { forms, formVersions, auditLogs, type FormSchema } from '@/db/schema';
import { fromDatetimeLocalInTimezone } from '@/lib/datetime';
import { invalidatePublicFormCache } from '@/db/public';
import { requireOrgAuth } from '@/lib/auth';
import { areSchemasEqual } from '@/lib/form-schema';

export interface FormVersionItem {
  id: string;
  formId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  isCurrentPublished: boolean;
  isCurrentDraft: boolean;
  createdAt: string;
  publishedAt: string | null;
  fieldCount: number;
  conditionalCount: number;
  description?: string;
  isSafetySnapshot?: boolean;
  restoredFromVersion?: number;
  schema: FormSchema;
}

/**
 * Saves a draft schema. Avoids creating duplicate versions when nothing
 * meaningful changed. When fields or configurations change, creates a new
 * version row so history is cleanly preserved.
 */
export async function saveDraft(formId: string, schema: FormSchema) {
  const { orgId } = await requireOrgAuth();

  const result = await withOrg(orgId, async (tx) => {
    // Verify form belongs to current org
    const [form] = await tx.select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) {
      throw new Error('Form not found or unauthorized');
    }

    const [latest] = await tx
      .select()
      .from(formVersions)
      .where(eq(formVersions.formId, formId))
      .orderBy(desc(formVersions.versionNumber))
      .limit(1);

    // If identical to latest version, avoid duplicate entry
    if (latest && areSchemasEqual(latest.schema as FormSchema, schema)) {
      return { success: true, created: false, versionNumber: latest.versionNumber };
    }

    const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;
    await tx.insert(formVersions).values({
      formId,
      orgId,
      versionNumber: nextVersionNumber,
      schema,
      status: 'draft',
    });

    await tx
      .update(forms)
      .set({ updatedAt: new Date() })
      .where(eq(forms.id, formId));

    return { success: true, created: true, versionNumber: nextVersionNumber };
  });

  revalidatePath(`/dashboard/forms/${formId}/builder`);
  return result;
}

/**
 * Lists up to 50 historical versions of the form, ordered descending by version number.
 */
export async function listFormVersions(formId: string): Promise<FormVersionItem[]> {
  const { orgId } = await requireOrgAuth();

  return withOrg(orgId, async (tx) => {
    const [form] = await tx.select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) {
      throw new Error('Form not found or unauthorized');
    }

    const rows = await tx
      .select()
      .from(formVersions)
      .where(eq(formVersions.formId, formId))
      .orderBy(desc(formVersions.versionNumber))
      .limit(50);

    const latestDraftRow = rows.find((r) => r.status === 'draft');

    return rows.map((r) => {
      const schema = (r.schema as FormSchema) ?? { fields: [] };
      const fields = Array.isArray(schema.fields) ? schema.fields : [];
      const conditionalCount = fields.filter((f) => Boolean(f.visibleIf)).length;

      return {
        id: r.id,
        formId: r.formId,
        versionNumber: r.versionNumber,
        status: r.status,
        isCurrentPublished: form.currentPublishedVersionId === r.id,
        isCurrentDraft: latestDraftRow?.id === r.id,
        createdAt: r.createdAt.toISOString(),
        publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
        fieldCount: fields.length,
        conditionalCount,
        description: schema.metadata?.description,
        isSafetySnapshot: schema.metadata?.isSafetySnapshot === true,
        restoredFromVersion: schema.metadata?.restoredFromVersion,
        schema,
      };
    });
  });
}

/**
 * Restores a historical version. Creates a safety snapshot of the current draft
 * if there are unsaved/different changes, then restores the target version as a new
 * working draft without modifying the live published form.
 */
export async function restoreVersion(formId: string, versionId: string, currentDraftSchema: FormSchema) {
  const { userId, orgId } = await requireOrgAuth();

  const result = await withOrg(orgId, async (tx) => {
    const [form] = await tx.select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) {
      throw new Error('Form not found or unauthorized');
    }

    const [targetVersion] = await tx
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.id, versionId), eq(formVersions.formId, formId)))
      .limit(1);

    if (!targetVersion) {
      throw new Error('Target version not found');
    }

    const [latest] = await tx
      .select()
      .from(formVersions)
      .where(eq(formVersions.formId, formId))
      .orderBy(desc(formVersions.versionNumber))
      .limit(1);

    let nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

    // Safety snapshot: if current draft differs from the latest version, save it first
    if (!latest || !areSchemasEqual(latest.schema as FormSchema, currentDraftSchema)) {
      if (currentDraftSchema.fields && currentDraftSchema.fields.length > 0) {
        await tx.insert(formVersions).values({
          formId,
          orgId,
          versionNumber: nextVersionNumber,
          schema: {
            fields: currentDraftSchema.fields,
            metadata: {
              isSafetySnapshot: true,
              description: 'Backup before version restoration',
            },
          },
          status: 'draft',
        });
        nextVersionNumber += 1;
      }
    }

    // Now restore the target schema as a new working draft
    const targetSchema = targetVersion.schema as FormSchema;
    const restoredSchema: FormSchema = {
      fields: targetSchema.fields,
      metadata: {
        restoredFromVersion: targetVersion.versionNumber,
        description: `Restored from Version ${targetVersion.versionNumber}`,
      },
    };

    const [created] = await tx
      .insert(formVersions)
      .values({
        formId,
        orgId,
        versionNumber: nextVersionNumber,
        schema: restoredSchema,
        status: 'draft',
      })
      .returning();

    await tx
      .update(forms)
      .set({ updatedAt: new Date() })
      .where(eq(forms.id, formId));

    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.version_restored',
      targetType: 'form',
      targetId: formId,
      metadata: {
        restoredFromVersionId: targetVersion.id,
        restoredFromVersionNumber: targetVersion.versionNumber,
        newVersionNumber: created.versionNumber,
      },
    });

    return {
      restoredSchema,
      restoredVersionNumber: created.versionNumber,
      targetVersionNumber: targetVersion.versionNumber,
    };
  });

  revalidatePath(`/dashboard/forms/${formId}/builder`);
  return result;
}

export async function publishForm(
  formId: string,
  input: { schema: FormSchema; startAt: string | null; endAt: string | null; timezone: string },
) {
  const { userId, orgId } = await requireOrgAuth();

  await withOrg(orgId, async (tx) => {
    const [latestDraft] = await tx
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.formId, formId), eq(formVersions.status, 'draft')))
      .orderBy(desc(formVersions.versionNumber))
      .limit(1);

    const publishValues = {
      schema: input.schema,
      status: 'published' as const,
      startAt: input.startAt ? fromDatetimeLocalInTimezone(input.startAt, input.timezone) : null,
      endAt: input.endAt ? fromDatetimeLocalInTimezone(input.endAt, input.timezone) : null,
      timezone: input.timezone,
      publishedAt: new Date(),
      publishedBy: userId,
    };

    let versionId: string;
    if (latestDraft && areSchemasEqual(latestDraft.schema as FormSchema, input.schema)) {
      await tx.update(formVersions).set(publishValues).where(eq(formVersions.id, latestDraft.id));
      versionId = latestDraft.id;
    } else {
      const [latest] = await tx
        .select()
        .from(formVersions)
        .where(eq(formVersions.formId, formId))
        .orderBy(desc(formVersions.versionNumber))
        .limit(1);
      const [created] = await tx
        .insert(formVersions)
        .values({ formId, orgId, versionNumber: (latest?.versionNumber ?? 0) + 1, ...publishValues })
        .returning();
      versionId = created.id;
    }

    await tx
      .update(forms)
      .set({ status: 'published', currentPublishedVersionId: versionId, updatedAt: new Date() })
      .where(eq(forms.id, formId));

    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.published',
      targetType: 'form',
      targetId: formId,
      metadata: { versionId },
    });

    const [{ slug }] = await tx.select({ slug: forms.slug }).from(forms).where(eq(forms.id, formId)).limit(1);
    await invalidatePublicFormCache(slug);
  });

  revalidatePath(`/dashboard/forms/${formId}/builder`);
  revalidatePath('/dashboard/forms');
}

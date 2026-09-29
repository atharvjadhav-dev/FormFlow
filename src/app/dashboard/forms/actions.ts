'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { withOrg } from '@/db/client';
import { forms, formVersions, submissions, submissionFiles, auditLogs } from '@/db/schema';
import { slugify } from '@/lib/slugify';
import { requireOrgAuth } from '@/lib/auth';
import { getTemplateById, instantiateTemplateSchema } from '@/lib/templates';
import { instantiateAiGeneratedSchema } from '@/lib/ai/validator';
import { invalidatePublicFormCache } from '@/db/public';
import type { FormField } from '@/db/schema';

/**
 * Creates a blank form or a form from a template and redirects to the builder.
 */
export async function createForm(formData: FormData) {
  const templateId = formData.get('templateId') ? String(formData.get('templateId')) : undefined;
  const name = String(formData.get('name') ?? '').trim();

  if (templateId) {
    return createFormFromTemplate(templateId, name || undefined);
  }

  const { userId, orgId } = await requireOrgAuth();
  const formName = name || 'Untitled form';
  const slug = `${slugify(formName)}-${crypto.randomUUID().slice(0, 8)}`;

  const formId = await withOrg(orgId, async (tx) => {
    const [form] = await tx.insert(forms).values({ orgId, name: formName, slug, createdBy: userId }).returning();
    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.created',
      targetType: 'form',
      targetId: form.id,
    });
    return form.id;
  });

  redirect(`/dashboard/forms/${formId}/builder`);
}

/**
 * Creates a new form initialized with a ready-made template's fields and remapped conditional rules.
 */
export async function createFormFromTemplate(templateId: string, customName?: string) {
  const { userId, orgId } = await requireOrgAuth();

  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const formName = customName?.trim() || template.name;
  const slug = `${slugify(formName)}-${crypto.randomUUID().slice(0, 8)}`;
  const freshFields = instantiateTemplateSchema(template.fields);

  const formId = await withOrg(orgId, async (tx) => {
    // 1. Create form container
    const [form] = await tx
      .insert(forms)
      .values({
        orgId,
        name: formName,
        slug,
        description: template.description,
        createdBy: userId,
      })
      .returning();

    // 2. Initialize Version 1 with template schema and metadata
    await tx.insert(formVersions).values({
      formId: form.id,
      orgId,
      versionNumber: 1,
      schema: {
        fields: freshFields,
        metadata: {
          description: `Created from ${template.name} template`,
        },
      },
      status: 'draft',
    });

    // 3. Audit trail
    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.created_from_template',
      targetType: 'form',
      targetId: form.id,
      metadata: {
        templateId: template.id,
        templateName: template.name,
      },
    });

    return form.id;
  });

  redirect(`/dashboard/forms/${formId}/builder`);
}

/**
 * Creates a new form initialized with an AI-generated schema.
 * Re-runs UUID & condition instantiation to guarantee fresh server-side IDs and validated references.
 * Creates forms row + Version 1 draft + audit log, then redirects to the builder.
 */
export async function createFormFromAiSchema(input: {
  title: string;
  description?: string;
  fields: FormField[];
}): Promise<never> {
  const { userId, orgId } = await requireOrgAuth();

  const formName = input.title.trim() || 'Untitled AI Form';
  const slug = `${slugify(formName)}-${crypto.randomUUID().slice(0, 8)}`;

  // Re-verify and ensure fresh UUIDs and remapped conditions before DB persistence
  const freshSchema = instantiateAiGeneratedSchema({
    title: formName,
    description: input.description,
    fields: input.fields,
  });

  const formId = await withOrg(orgId, async (tx) => {
    // 1. Create form container
    const [form] = await tx
      .insert(forms)
      .values({
        orgId,
        name: formName,
        slug,
        description: freshSchema.description || null,
        createdBy: userId,
      })
      .returning();

    // 2. Initialize Version 1 with AI schema and metadata
    await tx.insert(formVersions).values({
      formId: form.id,
      orgId,
      versionNumber: 1,
      schema: {
        fields: freshSchema.fields,
        metadata: {
          description: 'Created with AI',
        },
      },
      status: 'draft',
    });

    // 3. Audit trail (minimal metadata, no sensitive prompt)
    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.created_with_ai',
      targetType: 'form',
      targetId: form.id,
      metadata: {
        fieldCount: freshSchema.fields.length,
      },
    });

    return form.id;
  });

  redirect(`/dashboard/forms/${formId}/builder`);
}

/**
 * Permanently deletes a form and all associated versions/submissions within tenant boundary.
 */
export async function deleteForm(formId: string) {
  const { userId, orgId } = await requireOrgAuth();

  await withOrg(orgId, async (tx) => {
    // 1. Verify form exists and belongs to current tenant
    const [form] = await tx
      .select({ id: forms.id, slug: forms.slug, name: forms.name })
      .from(forms)
      .where(and(eq(forms.id, formId), eq(forms.orgId, orgId)))
      .limit(1);

    if (!form) {
      throw new Error('Form not found or unauthorized');
    }

    // 2. Explicitly remove any submission files and submissions to avoid FK cascade order issues
    const formSubs = await tx
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.formId, formId));

    if (formSubs.length > 0) {
      const subIds = formSubs.map((s) => s.id);
      await tx.delete(submissionFiles).where(inArray(submissionFiles.submissionId, subIds));
      await tx.delete(submissions).where(eq(submissions.formId, formId));
    }

    // 3. Delete form versions
    await tx.delete(formVersions).where(eq(formVersions.formId, formId));

    // 4. Delete form record
    await tx
      .delete(forms)
      .where(and(eq(forms.id, formId), eq(forms.orgId, orgId)));

    // 5. Record audit log
    await tx.insert(auditLogs).values({
      orgId,
      actorId: userId,
      action: 'form.deleted',
      targetType: 'form',
      targetId: formId,
      metadata: {
        formName: form.name,
        slug: form.slug,
      },
    });

    // 6. Invalidate public cache if previously published
    if (form.slug) {
      await invalidatePublicFormCache(form.slug);
    }
  });

  revalidatePath('/dashboard/forms');
  revalidatePath('/dashboard');
}


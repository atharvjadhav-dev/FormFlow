import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { withOrg } from '@/db/client';
import { forms, formVersions, organizations, type FormSchema } from '@/db/schema';
import { toDatetimeLocalInTimezone } from '@/lib/datetime';
import { BuilderClient } from './builder-client';
import { requireOrgAuth } from '@/lib/auth';

export default async function BuilderPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const { orgId } = await requireOrgAuth();

  const data = await withOrg(orgId, async (tx) => {
    const [form] = await tx.select().from(forms).where(eq(forms.id, formId)).limit(1);
    if (!form) return null;

    const [org] = await tx.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);

    const [draft] = await tx
      .select()
      .from(formVersions)
      .where(and(eq(formVersions.formId, formId), eq(formVersions.status, 'draft')))
      .orderBy(desc(formVersions.versionNumber))
      .limit(1);

    const editingVersion =
      draft ??
      (
        await tx
          .select()
          .from(formVersions)
          .where(and(eq(formVersions.formId, formId), eq(formVersions.status, 'published')))
          .orderBy(desc(formVersions.versionNumber))
          .limit(1)
      )[0] ??
      null;

    return { form, editingVersion, orgTimezone: org?.timezone ?? 'Asia/Kolkata' };
  });

  if (!data) notFound();
  const { form, editingVersion, orgTimezone } = data;
  const schema = (editingVersion?.schema as FormSchema | undefined) ?? { fields: [] };
  const timezone = editingVersion?.timezone ?? orgTimezone;

  return (
    <BuilderClient
      formId={form.id}
      formName={form.name}
      initialFields={schema.fields}
      initialStartAt={editingVersion?.startAt ? toDatetimeLocalInTimezone(editingVersion.startAt, timezone) : null}
      initialEndAt={editingVersion?.endAt ? toDatetimeLocalInTimezone(editingVersion.endAt, timezone) : null}
      initialTimezone={timezone}
      publicUrl={`/f/${form.slug}`}
    />
  );
}

import { notFound } from 'next/navigation';
import { getPublicForm } from '@/db/public';
import { getFormAvailability } from '@/lib/availability';
import { toDatetimeLocalInTimezone } from '@/lib/datetime';
import type { FormSchema } from '@/db/schema';
import { PublicFormClient } from './form-client';

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicForm(slug);
  if (!data) notFound();

  const { form, org, publishedVersion } = data;
  const availability = getFormAvailability(publishedVersion);

  if (availability === 'not-found') notFound();

  if (availability === 'not-yet-open') {
    return (
      <StatusScreen
        title="Applications haven't opened yet"
        detail={
          publishedVersion?.startAt
            ? `Opens ${toDatetimeLocalInTimezone(publishedVersion.startAt, publishedVersion.timezone).replace('T', ' ')} (${publishedVersion.timezone})`
            : undefined
        }
      />
    );
  }

  if (availability === 'closed') {
    return <StatusScreen title="Applications are closed" detail="This form is no longer accepting submissions." />;
  }

  return (
    <PublicFormClient
      slug={slug}
      formName={form.name}
      orgName={org?.name ?? ''}
      formVersionId={publishedVersion!.id}
      schema={publishedVersion!.schema as FormSchema}
    />
  );
}

function StatusScreen({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] px-4 text-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-apple-lg border border-black/[0.04]">
        <div className="mx-auto h-12 w-12 rounded-full bg-black/[0.04] flex items-center justify-center text-[#86868B] mb-4">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1D1D1F]">{title}</h1>
        {detail && <p className="mt-2 text-sm text-[#86868B] leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}

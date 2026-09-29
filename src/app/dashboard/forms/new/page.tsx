import React from 'react';
import { getAllTemplates } from '@/lib/templates';
import { requireOrgAuth } from '@/lib/auth';
import { NewFormClient } from '@/components/forms/new-form-client';

interface NewFormPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function NewFormPage({ searchParams }: NewFormPageProps) {
  await requireOrgAuth();
  const templates = getAllTemplates();
  const resolvedParams = await searchParams;
  const initialMode = resolvedParams.mode === 'ai' ? 'ai' : 'overview';

  return <NewFormClient templates={templates} initialMode={initialMode} />;
}

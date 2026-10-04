import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './onboarding-client';

export const metadata = {
  title: 'Set up your workspace — FormFlow',
};

export default async function OnboardingPage() {
  const { userId, orgId } = await auth({ treatPendingAsSignedOut: false });
  if (!userId) redirect('/sign-in');

  // Already has an active organization → never show the setup screen again.
  if (orgId) redirect('/dashboard');

  // Signed in with no *active* org: if they already belong to one (e.g. after a
  // refresh or a new device), activate it instead of showing the org picker.
  let existingOrgId: string | null = null;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getOrganizationMembershipList({ userId, limit: 1 });
    existingOrgId = data[0]?.organization.id ?? null;
  } catch {
    // Fall through to the create screen; the client will still try to recover.
  }

  return <OnboardingClient existingOrgId={existingOrgId} />;
}

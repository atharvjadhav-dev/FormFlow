'use client';

import { CreateOrganization, useAuth, useClerk, useOrganizationList } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

function goToDashboard() {
  // Hard navigation so the server sees the freshly-activated org cookie.
  window.location.replace('/dashboard');
}

export function OnboardingClient({ existingOrgId }: { existingOrgId: string | null }) {
  const { setActive } = useClerk();
  const { orgId, isLoaded: authLoaded } = useAuth({ treatPendingAsSignedOut: false });
  const { userMemberships, isLoaded: listLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [activating, setActivating] = useState(Boolean(existingOrgId));
  const triedRef = useRef(false);

  // Session already has an org (e.g. activated in another tab) → leave.
  useEffect(() => {
    if (authLoaded && orgId) goToDashboard();
  }, [authLoaded, orgId]);

  // Activate the user's existing organization instead of showing a picker.
  useEffect(() => {
    if (triedRef.current) return;
    const target = existingOrgId ?? (listLoaded ? userMemberships?.data?.[0]?.organization.id : undefined);
    if (!target) {
      if (listLoaded && !existingOrgId) setActivating(false);
      return;
    }
    triedRef.current = true;
    setActivating(true);
    setActive({ organization: target })
      .then(goToDashboard)
      .catch(() => setActivating(false));
  }, [existingOrgId, listLoaded, userMemberships?.data, setActive]);

  if (activating) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#F5F5F7] px-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
        <p className="text-sm font-medium text-[#1D1D1F]">Opening your workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-start sm:justify-center gap-6 bg-[#F5F5F7] px-4 py-10">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Set up your workspace</h1>
        <p className="mt-1.5 text-sm text-[#86868B] leading-relaxed">
          Name your team or organization to start building forms.
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <CreateOrganization
          routing="hash"
          skipInvitationScreen
          afterCreateOrganizationUrl="/dashboard"
          appearance={{
            variables: { colorPrimary: '#007AFF', borderRadius: '0.75rem' },
            elements: { rootBox: 'w-full', cardBox: 'w-full shadow-apple max-w-full' },
          }}
        />
      </div>
    </div>
  );
}

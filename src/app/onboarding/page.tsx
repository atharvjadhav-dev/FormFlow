import { OrganizationList } from '@clerk/nextjs';

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Set up your workspace</h1>
        <p className="mt-1 text-muted-foreground">
          Create a workspace for your organization, or join one you&apos;ve been invited to.
        </p>
      </div>
      <OrganizationList
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
        hidePersonal
        appearance={{
          variables: { colorPrimary: '#1b3a4b', borderRadius: '0.5rem' },
        }}
      />
    </div>
  );
}

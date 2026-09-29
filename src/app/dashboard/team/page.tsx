import { OrganizationProfile } from '@clerk/nextjs';

export default function TeamPage() {
  return (
    <div className="flex justify-center px-6 py-10">
      <OrganizationProfile
        routing="hash"
        appearance={{ variables: { colorPrimary: '#1b3a4b', borderRadius: '0.5rem' } }}
      />
    </div>
  );
}

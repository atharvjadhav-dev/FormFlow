import { OrganizationProfile } from '@clerk/nextjs';

export default function TeamPage() {
  return (
    <div className="flex justify-center w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl">
        <OrganizationProfile
          routing="hash"
          appearance={{
            variables: { colorPrimary: '#007AFF', borderRadius: '0.75rem' },
            elements: {
              rootBox: 'w-full',
              cardBox: 'w-full shadow-apple max-w-full',
              navbar: 'max-w-full',
            },
          }}
        />
      </div>
    </div>
  );
}

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
        appearance={{
          variables: {
            colorPrimary: '#1b3a4b',
            colorBackground: '#ffffff',
            borderRadius: '0.5rem',
          },
        }}
      />
    </div>
  );
}

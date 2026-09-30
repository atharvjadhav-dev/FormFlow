import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Anything an applicant (not a logged-in admin) needs to hit must be listed
// here. Getting this wrong in either direction is a real bug: too narrow and
// a school's applicants get bounced to a sign-in page; too broad and a
// tenant-scoped route ships without auth.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/f/(.*)', // public form pages
  '/api/forms/(.*)', // their submit/presign endpoints — anonymous by design
  '/api/uploads/(.*)', // direct file uploads / downloads fallback
  '/api/webhooks/(.*)', // Clerk webhooks verify their own signature, not a session
  '/api/health(.*)', // K8s probes, ALB target group, and liveness/readiness checks
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, orgId, redirectToSignIn } = await auth();

  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  // A signed-in user with no active organization can't reach the dashboard —
  // every tenant-scoped query needs an orgId to set as the RLS context.
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};

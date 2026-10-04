import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

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

/**
 * Behind the ALB the container binds to 0.0.0.0:3000, so `req.url` carries that
 * internal origin. Rebuild the public origin from the forwarded headers so the
 * sign-in `redirect_url` and our own redirects point at the real domain.
 */
function publicUrl(req: NextRequest, pathAndSearch: string): URL {
  const rawHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
  
  let host = rawHost;
  if (!host || host.startsWith('0.0.0.0')) {
    host = process.env.NODE_ENV === 'production' ? 'form-flow.atharvjadhav.xyz' : 'localhost:3000';
  }
  const cleanProto = host.includes('localhost') ? 'http' : proto;
  return new URL(pathAndSearch, `${cleanProto}://${host}`);
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // Pending sessions (signed in but no organization chosen yet) must still be
  // treated as signed in here, otherwise they bounce between sign-in and
  // onboarding forever.
  const { userId, orgId, redirectToSignIn } = await auth({ treatPendingAsSignedOut: false });

  if (!userId) {
    return redirectToSignIn({
      returnBackUrl: publicUrl(req, req.nextUrl.pathname + req.nextUrl.search).toString(),
    });
  }

  // A signed-in user with no active organization can't reach the dashboard —
  // every tenant-scoped query needs an orgId to set as the RLS context.
  if (!orgId && !isOnboardingRoute(req)) {
    return NextResponse.redirect(publicUrl(req, '/onboarding'));
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};

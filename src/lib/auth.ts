import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { dbService } from '@/db/client';
import { organizations, members } from '@/db/schema';
import { slugify } from '@/lib/slugify';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OrgAuthResult {
  userId: string;
  orgId: string; // The PostgreSQL UUID
  clerkOrgId: string; // The Clerk org_... ID
}

/**
 * Resolves a Clerk organization ID (org_...) to its internal PostgreSQL UUID.
 * If the organization does not exist in the database yet (e.g. in local development
 * where webhooks are not forwarding, or right after signup), this automatically
 * provisions the organization and membership records on-the-fly.
 */
export async function resolveOrgId(clerkOrgId: string, userId?: string): Promise<string> {
  if (UUID_REGEX.test(clerkOrgId)) {
    return clerkOrgId;
  }

  // 1. Check if organization already exists in database
  const [existing] = await dbService
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  // 2. Auto-provision organization in database
  let orgName = 'My Organization';
  try {
    const { orgSlug } = await auth();
    if (orgSlug) orgName = orgSlug;
  } catch {
    // Ignore if outside request context
  }

  const slug = `${slugify(orgName)}-${crypto.randomUUID().slice(0, 6)}`;

  const [created] = await dbService
    .insert(organizations)
    .values({
      clerkOrgId,
      name: orgName,
      slug,
    })
    .onConflictDoUpdate({
      target: organizations.clerkOrgId,
      set: { updatedAt: new Date() },
    })
    .returning({ id: organizations.id });

  // 3. Auto-provision membership if user info is available
  if (userId) {
    try {
      const user = await currentUser();
      if (user) {
        const userEmail = user.emailAddresses[0]?.emailAddress ?? `${userId}@placeholder.com`;
        const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
        await dbService
          .insert(members)
          .values({
            orgId: created.id,
            clerkUserId: userId,
            email: userEmail,
            name: userName,
            role: 'admin',
          })
          .onConflictDoNothing();
      }
    } catch {
      // Ignore membership provisioning errors
    }
  }

  return created.id;
}

/**
 * Server-side authentication check for organization routes and actions.
 * Guarantees that the returned `orgId` is the database UUID, perfectly compatible
 * with PostgreSQL Row-Level Security (RLS) and foreign keys.
 */
export async function requireOrgAuth(): Promise<OrgAuthResult> {
  const { userId, orgId: clerkOrgId } = await auth();
  if (!userId || !clerkOrgId) {
    throw new Error('Not authenticated');
  }

  const orgId = await resolveOrgId(clerkOrgId, userId);
  return { userId, orgId, clerkOrgId };
}

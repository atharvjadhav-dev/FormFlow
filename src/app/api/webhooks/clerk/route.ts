import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { and, eq } from 'drizzle-orm';
import { dbService } from '@/db/client';
import { organizations, members, memberRoleEnum } from '@/db/schema';
import { findOrgByClerkId } from '@/db/queries';

export const runtime = 'nodejs';

// NOTE: payload shapes below match Clerk's documented webhook events as of
// this writing. This sandbox can't reach clerk.com to re-verify against the
// current reference, so double-check field names (particularly on
// organizationMembership.*) against the Clerk dashboard's webhook payload
// preview once a real endpoint is wired up, before relying on this in prod.

interface ClerkOrgData {
  id: string;
  name: string;
  slug: string | null;
  image_url?: string | null;
}

interface ClerkMembershipData {
  organization: { id: string };
  public_user_data: {
    user_id: string;
    identifier: string; // email
    first_name?: string | null;
    last_name?: string | null;
  };
  role: string; // e.g. "org:admin", "org:member"
}

type ClerkEvent =
  | { type: 'organization.created' | 'organization.updated'; data: ClerkOrgData }
  | { type: 'organization.deleted'; data: { id: string } }
  | {
      type: 'organizationMembership.created' | 'organizationMembership.updated';
      data: ClerkMembershipData;
    }
  | {
      type: 'organizationMembership.deleted';
      data: { organization: { id: string }; public_user_data: { user_id: string } };
    }
  | { type: string; data: unknown };

function mapClerkRole(clerkRole: string): (typeof memberRoleEnum.enumValues)[number] {
  if (clerkRole.endsWith(':admin')) return 'admin';
  if (clerkRole.endsWith(':viewer')) return 'viewer';
  return 'editor';
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: never process an unverifiable webhook.
    console.error('CLERK_WEBHOOK_SECRET is not set — rejecting webhook.');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();

  let event: ClerkEvent;
  try {
    event = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as unknown as ClerkEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'organization.created':
    case 'organization.updated': {
      const org = event.data as ClerkOrgData;
      await dbService
        .insert(organizations)
        .values({
          clerkOrgId: org.id,
          name: org.name,
          slug: org.slug ?? org.id,
          logoUrl: org.image_url ?? null,
        })
        .onConflictDoUpdate({
          target: organizations.clerkOrgId,
          set: {
            name: org.name,
            slug: org.slug ?? org.id,
            logoUrl: org.image_url ?? null,
            updatedAt: new Date(),
          },
        });
      break;
    }

    case 'organization.deleted': {
      const { id } = event.data as { id: string };
      // FK cascades take care of forms/submissions/members under this org.
      await dbService.delete(organizations).where(eq(organizations.clerkOrgId, id));
      break;
    }

    case 'organizationMembership.created':
    case 'organizationMembership.updated': {
      const data = event.data as ClerkMembershipData;
      const org = await findOrgByClerkId(data.organization.id);
      if (!org) {
        // Membership events can race organization.created under retries/backfills.
        console.error(`No local org for Clerk org ${data.organization.id} yet — skipping, will retry on next event.`);
        break;
      }
      const name = [data.public_user_data.first_name, data.public_user_data.last_name]
        .filter(Boolean)
        .join(' ') || null;

      await dbService
        .insert(members)
        .values({
          orgId: org.id,
          clerkUserId: data.public_user_data.user_id,
          email: data.public_user_data.identifier,
          name,
          role: mapClerkRole(data.role),
        })
        .onConflictDoUpdate({
          target: [members.orgId, members.clerkUserId],
          set: { email: data.public_user_data.identifier, name, role: mapClerkRole(data.role) },
        });
      break;
    }

    case 'organizationMembership.deleted': {
      const data = event.data as {
        organization: { id: string };
        public_user_data: { user_id: string };
      };
      const org = await findOrgByClerkId(data.organization.id);
      if (org) {
        await dbService
          .delete(members)
          .where(
            and(
              eq(members.orgId, org.id),
              eq(members.clerkUserId, data.public_user_data.user_id),
            ),
          );
      }
      break;
    }

    default:
      // Ignore event types we don't act on yet.
      break;
  }

  return new Response('', { status: 200 });
}

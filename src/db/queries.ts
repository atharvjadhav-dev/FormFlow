import { eq } from 'drizzle-orm';
import { dbService } from './client';
import { organizations } from './schema';

export async function findOrgByClerkId(clerkOrgId: string) {
  const [org] = await dbService
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);
  return org ?? null;
}

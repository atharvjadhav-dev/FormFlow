import type { formVersions } from '@/db/schema';

type FormVersionRow = typeof formVersions.$inferSelect;

export type FormAvailability = 'not-found' | 'not-yet-open' | 'closed' | 'open';

/** The single source of truth for whether a form accepts submissions right now. Called both when rendering /f/[slug] and again inside the submit handler — never trust the client's clock or the fact that it rendered the form earlier in the same session. */
export function getFormAvailability(version: FormVersionRow | null, now: Date = new Date()): FormAvailability {
  if (!version || version.status !== 'published') return 'not-found';
  if (version.startAt && now < version.startAt) return 'not-yet-open';
  if (version.endAt && now > version.endAt) return 'closed';
  return 'open';
}

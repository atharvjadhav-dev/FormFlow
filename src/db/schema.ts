import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const formStatusEnum = pgEnum('form_status', [
  'draft',
  'published',
  'archived',
]);

export const versionStatusEnum = pgEnum('version_status', [
  'draft',
  'published',
  'archived',
]);

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
]);

export const memberRoleEnum = pgEnum('member_role', [
  'admin',
  'editor',
  'viewer',
]);

// ---------------------------------------------------------------------------
// organizations — the tenant boundary. One row per Clerk organization.
// ---------------------------------------------------------------------------

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: varchar('clerk_org_id', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Kolkata'),
  logoUrl: text('logo_url'),
  plan: varchar('plan', { length: 50 }).notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// members — cache of Clerk org memberships, kept in sync via webhook.
// Lets us join a display name/role onto submissions and audit_logs without
// calling out to Clerk on every read.
// ---------------------------------------------------------------------------

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    role: memberRoleEnum('role').notNull().default('editor'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgUserUnique: uniqueIndex('members_org_user_unique').on(table.orgId, table.clerkUserId),
    orgIdIdx: index('members_org_id_idx').on(table.orgId),
  }),
);

// ---------------------------------------------------------------------------
// forms — the container. currentPublishedVersionId points at whichever
// form_versions row is currently live at the public link.
// ---------------------------------------------------------------------------

export const forms = pgTable(
  'forms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    status: formStatusEnum('status').notNull().default('draft'),
    currentPublishedVersionId: uuid('current_published_version_id'),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index('forms_org_id_idx').on(table.orgId),
  }),
);

// ---------------------------------------------------------------------------
// form_versions — the actual JSON schema. Publishing never mutates a version;
// it snapshots a new one and repoints forms.currentPublishedVersionId. This
// is what makes "existing submissions stay valid after the form is edited"
// true by construction rather than by convention.
// ---------------------------------------------------------------------------

export const formVersions = pgTable(
  'form_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }), // denormalized for RLS
    versionNumber: integer('version_number').notNull(),
    schema: jsonb('schema').notNull(), // field definitions — see FormSchema type below
    status: versionStatusEnum('status').notNull().default('draft'),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    timezone: varchar('timezone', { length: 100 }).notNull().default('Asia/Kolkata'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedBy: varchar('published_by', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formIdIdx: index('form_versions_form_id_idx').on(table.formId),
    orgIdIdx: index('form_versions_org_id_idx').on(table.orgId),
    formVersionUnique: uniqueIndex('form_versions_form_version_unique').on(
      table.formId,
      table.versionNumber,
    ),
  }),
);

// ---------------------------------------------------------------------------
// submissions — one row per applicant response. Pinned to the exact version
// it was filled against. idempotencyKey + the unique index below is what
// makes a retried POST from a flaky connection safe to replay.
// ---------------------------------------------------------------------------

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    formVersionId: uuid('form_version_id')
      .notNull()
      .references(() => formVersions.id),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    status: submissionStatusEnum('status').notNull().default('pending'),
    answers: jsonb('answers').notNull(), // { [fieldId]: value }
    submitterEmail: varchar('submitter_email', { length: 255 }),
    submitterIp: varchar('submitter_ip', { length: 64 }),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index('submissions_org_id_idx').on(table.orgId),
    formIdIdx: index('submissions_form_id_idx').on(table.formId),
    idempotencyUnique: uniqueIndex('submissions_idempotency_unique').on(
      table.formId,
      table.idempotencyKey,
    ),
    statusIdx: index('submissions_status_idx').on(table.status),
  }),
);

// ---------------------------------------------------------------------------
// submission_files — S3 key + metadata only. Never the file bytes.
// ---------------------------------------------------------------------------

export const submissionFiles = pgTable(
  'submission_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    fieldId: varchar('field_id', { length: 100 }).notNull(),
    s3Key: text('s3_key').notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('uploaded'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index('submission_files_org_id_idx').on(table.orgId),
    submissionIdIdx: index('submission_files_submission_id_idx').on(table.submissionId),
  }),
);

// ---------------------------------------------------------------------------
// audit_logs — who did what, when, on which record.
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(), // e.g. 'form.published'
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx: index('audit_logs_org_id_idx').on(table.orgId),
    targetIdx: index('audit_logs_target_idx').on(table.targetType, table.targetId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// Shape of form_versions.schema — not enforced by Postgres (it's jsonb), but
// this is the contract the builder writes and the public runtime reads.
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text' | 'email' | 'phone' | 'number' | 'date' | 'dropdown'
  | 'radio' | 'checkbox' | 'textarea' | 'file' | 'image'
  | 'heading' | 'paragraph' | 'divider';

export type FieldWidth = 12 | 6 | 4 | 8 | 3 | 9;

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty';

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface VisibleIfRule {
  fieldId?: string; // backwards compatibility
  equals?: string | number | boolean; // backwards compatibility
  operator?: ConditionOperator;
  value?: string | number | boolean;
  conditions?: FieldCondition[];
  combinator?: 'and' | 'or';
}

export interface FormField {
  id: string;
  name?: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // dropdown / radio / checkbox
  validation?: { minLength?: number; maxLength?: number; pattern?: string };
  file?: { maxSizeMb: number; acceptedMimeTypes: string[] };
  visibleIf?: VisibleIfRule;
  width?: FieldWidth;
}

export interface FormSchemaMetadata {
  description?: string;
  restoredFromVersion?: number;
  isSafetySnapshot?: boolean;
}

export interface FormSchema {
  fields: FormField[];
  metadata?: FormSchemaMetadata;
}


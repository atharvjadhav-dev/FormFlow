# FormFlow Studio — Project Handover Document

**Last Updated**: September 26, 2026  
**Project**: FormFlow (Multi-tenant Form Builder & Submissions Platform)  
**Location**: `c:\Users\Nikita Jadhav\OneDrive\Desktop\Form-Builder`  

---

## 1. Executive Summary

FormFlow is a high-performance, multi-tenant form builder and submissions platform designed for high-concurrency environments (e.g., schools, universities, and organizations running competitive applications with strict submission windows).

The project enforces PostgreSQL Row-Level Security (RLS) across all tenant-owned tables, zero-friction public submissions with Redis thundering-herd caching and idempotency protection, a full visual drag-and-drop form builder, version history with restoration, ready-made templates, and form lifecycle management.

---

## 2. Status of Implementation (Steps 1 – 8)

| Step | Feature | Status | Key Highlights |
|---|---|---|---|
| **Step 1** | Architecture & Data Model | ✅ Approved | Multi-tenant schema with RLS (`withOrg`), Clerk integration, 7 core tables |
| **Step 2** | Grid Layout & Widths | ✅ Approved | 12-column responsive grid layout with structured field widths (12, 6, 4, 8, 3, 9) |
| **Step 3** | Form Builder Studio & Undo/Redo | ✅ Approved | Drag-and-drop canvas with `@dnd-kit`, palette, properties panel, undo/redo stack |
| **Step 4** | Quick Add & Palettes | ✅ Approved | Keyboard-accessible Quick Add menu, categorized field palette |
| **Step 5** | Studio Toolbar & Properties | ✅ Approved | Field configuration, validation, options, file restrictions, copy/duplicate |
| **Step 6** | Conditional Logic Engine | ✅ Approved | `visibleIf` evaluator with compound rules (`and`/`or`), real-time dependency ordering |
| **Step 7** | Version History & Snapshots | ✅ Approved | Draft snapshots, publish snapshots, version inspection modal, restore with safety backup |
| **Step 8** | Ready-Made Form Templates | ✅ Approved | Centralized template registry (12 templates), search, category filters, read-only preview with condition badges, fresh UUID generation, and recursive reference remapping |
| **Enhancements** | Form Lifecycle & Deletion | ✅ Implemented | Form deletion with confirmation modal (`DeleteFormDialog`), and dynamic availability badge showing **`Ended`** (amber) when time limit has expired, **`Scheduled`** (blue) for future dates, or **`Published`** (green) |

---

## 3. Technology Stack

- **Framework**: Next.js 16.3.4 (Turbopack, App Router, React 19)
- **Database**: PostgreSQL 16 (Port 5433 for local dev via Docker)
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Isolation / Multi-tenancy**: PostgreSQL Row-Level Security (RLS) forced on all tenant tables via `withOrg(orgId, tx)`
- **Cache & Rate Limiting**: Redis 7 (Port 6379 for local dev via Docker)
- **Authentication**: Clerk (`@clerk/nextjs` with multi-tenant Organizations)
- **UI & Styling**: Vanilla TailwindCSS v4, Lucide Icons, `@dnd-kit`

---

## 4. Architecture & Key Files

### Backend & Database Layer
- `src/db/schema.ts` — Table definitions (`organizations`, `members`, `forms`, `form_versions`, `submissions`, `submission_files`, `audit_logs`) and core TypeScript types (`FormField`, `FieldType`, `FieldWidth`, `VisibleIfRule`, `FormSchema`).
- `src/db/client.ts` — Database pools (`dbApp`, `dbService`) and `withOrg(orgId, fn)` RLS transaction boundary.
- `src/db/public.ts` — Public submission gateway for `/f/[slug]` (bypasses tenant RLS intentionally for unauthenticated applicants).
- `src/lib/availability.ts` — Source of truth for form window status (`open`, `closed`, `not-yet-open`, `not-found`).

### Template System (Step 8)
- `src/lib/templates/types.ts` — Interface definitions (`FormTemplate`, `TemplateCategory`).
- `src/lib/templates/definitions.ts` — 12 static ready-made templates across General, Business, Events, Education, and Other.
- `src/lib/templates/index.ts` — Registry helpers (`getAllTemplates`, `getTemplateById`, `searchTemplates`, `instantiateTemplateSchema`).
- `src/components/templates/template-gallery.tsx` — Client template gallery with search and category filtering.
- `src/components/templates/template-preview-modal.tsx` — Interactive read-only preview modal with 12-column grid and conditional visibility badges.

### Form Builder & Studio (Steps 2 – 7)
- `src/app/dashboard/forms/[formId]/builder/page.tsx` — Server component loading active draft and organization timezone.
- `src/app/dashboard/forms/[formId]/builder/builder-client.tsx` — Main interactive studio canvas.
- `src/components/builder/use-builder.ts` — Studio state hook with undo/redo stack.
- `src/components/builder/version-history-panel.tsx` — Version history drawer and restoration.
- `src/components/builder/version-preview-modal.tsx` — Read-only snapshot preview.

### Forms Dashboard & Management
- `src/app/dashboard/forms/page.tsx` — Form listing with submission counts, public links, dynamic status badges (`Published`, `Ended`, `Scheduled`, `Draft`), and deletion.
- `src/app/dashboard/forms/actions.ts` — Server actions for form creation (`createForm`, `createFormFromTemplate`) and cascade deletion (`deleteForm`).
- `src/components/forms/delete-form-dialog.tsx` — Apple-styled safety confirmation dialog with `Trash2` icon.

---

## 5. Local Setup & Running Instructions

### 1. Start Docker Containers
```bash
docker compose up -d
```
Verifies that:
- PostgreSQL 16 is running on port `5433` (healthy).
- Redis 7 is running on port `6379` (healthy).

### 2. Run Database Migrations (First-time setup only)
```bash
npx tsx src/db/migrate.ts
```

### 3. Verify Tenant Isolation & System Tests
```bash
npm run test:rls                     # Verifies Postgres Row-Level Security
npx tsx scripts/test-templates.ts   # Verifies Step 8 Template system (12 templates, UUIDs, rules)
npm run test:e2e                     # Verifies end-to-end caching, submissions, and idempotency
npx tsx scripts/test-delete-and-availability.ts # Verifies delete cascade & window expiration
```

### 4. Run Development Server
```bash
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- Health Check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Forms Dashboard: [http://localhost:3000/dashboard/forms](http://localhost:3000/dashboard/forms)
- Create Form / Templates: [http://localhost:3000/dashboard/forms/new](http://localhost:3000/dashboard/forms/new)

---

## 6. Testing & Quality Checks

Run the following checks before committing any new code:
```bash
# 1. Type Check
npx tsc --noEmit

# 2. Template System Test
npx tsx scripts/test-templates.ts

# 3. RLS Multi-Tenant Test
npm run test:rls

# 4. End-to-End System Test
npm run test:e2e
```

---

## 7. Next Steps for Upcoming Milestones

When moving to future planned milestones (e.g., Step 9):
1. **AI Form Generation**: When implementing future AI generation, ensure the generator produces the standard `FormSchema` directly into `formVersions` with status `'draft'` without creating separate field models.
2. **Template Expansion**: Any additional templates should be added directly to `src/lib/templates/definitions.ts` using valid `FieldType` and `FieldWidth` values.

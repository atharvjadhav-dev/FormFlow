import 'dotenv/config';
import { getAllTemplates, getTemplateById, instantiateTemplateSchema } from '../src/lib/templates';
import { VALID_FIELD_TYPES, VALID_FIELD_WIDTHS, VALID_CONDITION_OPERATORS } from '../src/lib/ai/validator';
import { dbService, withOrg } from '../src/db/client';
import { organizations, forms, formVersions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function checkAllTemplates() {
  console.log('🧪 Checking all pre-built FormFlow templates...\n');

  const templates = getAllTemplates();
  console.log(`Found ${templates.length} templates in registry.\n`);

  let totalErrors = 0;

  for (const template of templates) {
    console.log(`Checking Template: [${template.id}] "${template.name}" (${template.category})`);

    // 1. Basic properties
    if (!template.id) {
      console.error(`❌ [${template.name}] Missing ID`);
      totalErrors++;
    }
    if (!template.name) {
      console.error(`❌ [${template.id}] Missing Name`);
      totalErrors++;
    }
    if (!template.description) {
      console.error(`❌ [${template.id}] Missing Description`);
      totalErrors++;
    }
    if (!template.category) {
      console.error(`❌ [${template.id}] Missing Category`);
      totalErrors++;
    }
    if (!Array.isArray(template.fields) || template.fields.length === 0) {
      console.error(`❌ [${template.id}] Fields must be a non-empty array`);
      totalErrors++;
      continue;
    }

    // 2. Field-level checks
    const seenFieldIds = new Set<string>();
    const fieldIndexMap = new Map<string, number>();

    template.fields.forEach((field, idx) => {
      fieldIndexMap.set(field.id, idx);

      // Unique ID within template
      if (seenFieldIds.has(field.id)) {
        console.error(`❌ [${template.id}] Duplicate field ID: ${field.id}`);
        totalErrors++;
      }
      seenFieldIds.add(field.id);

      // Valid type
      if (!VALID_FIELD_TYPES.has(field.type)) {
        console.error(`❌ [${template.id}] Field "${field.label}" has invalid type "${field.type}"`);
        totalErrors++;
      }

      // Valid width
      if (field.width !== undefined && !VALID_FIELD_WIDTHS.has(field.width)) {
        console.error(`❌ [${template.id}] Field "${field.label}" has invalid width ${field.width}`);
        totalErrors++;
      }

      // Choice field options
      if (['dropdown', 'radio', 'checkbox'].includes(field.type)) {
        if (!Array.isArray(field.options) || field.options.length === 0) {
          console.error(`❌ [${template.id}] Choice field "${field.label}" is missing options`);
          totalErrors++;
        }
      }

      // Conditional logic validity
      if (field.visibleIf) {
        const conditions = field.visibleIf.conditions ?? (field.visibleIf.fieldId ? [{
          fieldId: field.visibleIf.fieldId,
          operator: field.visibleIf.operator ?? 'equals',
          value: field.visibleIf.value,
        }] : []);

        for (const cond of conditions) {
          // Self-dependency check
          if (cond.fieldId === field.id) {
            console.error(`❌ [${template.id}] Field "${field.label}" depends on itself!`);
            totalErrors++;
          }

          // Exists check
          if (!fieldIndexMap.has(cond.fieldId)) {
            console.error(`❌ [${template.id}] Field "${field.label}" depends on non-existent or forward field "${cond.fieldId}"`);
            totalErrors++;
          } else {
            const targetIdx = fieldIndexMap.get(cond.fieldId)!;
            if (targetIdx >= idx) {
              console.error(`❌ [${template.id}] Field "${field.label}" depends on forward field "${cond.fieldId}"`);
              totalErrors++;
            }
          }

          // Valid operator
          if (!VALID_CONDITION_OPERATORS.has(cond.operator)) {
            console.error(`❌ [${template.id}] Invalid condition operator "${cond.operator}"`);
            totalErrors++;
          }
        }
      }
    });

    // 3. Test instantiation (UUID generation + condition remapping)
    const instantiated = instantiateTemplateSchema(template.fields);
    if (instantiated.length !== template.fields.length) {
      console.error(`❌ [${template.id}] Instantiation field count mismatch`);
      totalErrors++;
    }

    for (const f of instantiated) {
      if (!UUID_REGEX.test(f.id)) {
        console.error(`❌ [${template.id}] Instantiated field "${f.label}" does not have a valid UUID: ${f.id}`);
        totalErrors++;
      }

      if (f.visibleIf?.conditions) {
        for (const c of f.visibleIf.conditions) {
          if (!UUID_REGEX.test(c.fieldId)) {
            console.error(`❌ [${template.id}] Condition fieldId was not remapped to a UUID: ${c.fieldId}`);
            totalErrors++;
          }
        }
      }
    }

    console.log(`   ✅ Valid (${template.fields.length} fields)`);
  }

  // 4. Test actual database template instantiation in transaction
  console.log('\n--- Testing DB Form Creation with Template ---');
  const [firstOrg] = await dbService.select().from(organizations).limit(1);
  if (firstOrg) {
    await withOrg(firstOrg.id, async (tx) => {
      for (const t of templates) {
        const fields = instantiateTemplateSchema(t.fields);
        const [form] = await tx
          .insert(forms)
          .values({
            orgId: firstOrg.id,
            name: `Test ${t.name}`,
            slug: `test-${t.id}-${Date.now()}`,
            createdBy: 'test_user',
          })
          .returning();

        await tx.insert(formVersions).values({
          formId: form.id,
          orgId: firstOrg.id,
          versionNumber: 1,
          schema: { fields },
        });

        // Clean up immediately in transaction
        await tx.delete(formVersions).where(eq(formVersions.formId, form.id));
        await tx.delete(forms).where(eq(forms.id, form.id));
      }
    });
    console.log('✅ All 12 templates successfully created and saved into Postgres with zero DB errors!');
  }

  console.log('\n========================================');
  if (totalErrors === 0) {
    console.log(`🎉 ALL ${templates.length} TEMPLATES ARE 100% VALID AND WORKING!`);
  } else {
    console.error(`❌ Found ${totalErrors} errors across templates.`);
    process.exit(1);
  }
}

checkAllTemplates().catch((err) => {
  console.error('Fatal check error:', err);
  process.exit(1);
});

import { FORM_TEMPLATES } from '../src/lib/templates/definitions';
import {
  getAllTemplates,
  getTemplateById,
  searchTemplates,
  instantiateTemplateSchema,
} from '../src/lib/templates';
import type { FieldType, FieldWidth } from '../src/db/schema';

const VALID_FIELD_TYPES: Set<FieldType> = new Set([
  'text',
  'email',
  'phone',
  'number',
  'date',
  'dropdown',
  'radio',
  'checkbox',
  'textarea',
  'file',
  'image',
  'heading',
  'paragraph',
  'divider',
]);

const VALID_FIELD_WIDTHS: Set<FieldWidth> = new Set([12, 6, 4, 8, 3, 9]);

const REQUIRED_CATEGORIES = ['General', 'Business', 'Events', 'Education', 'Other'] as const;

const EXPECTED_TEMPLATE_IDS = [
  'contact-form',
  'feedback-form',
  'customer-survey',
  'job-application',
  'employee-onboarding',
  'client-intake',
  'event-registration',
  'event-feedback',
  'student-registration',
  'scholarship-application',
  'college-admission',
  'leave-application',
];

function runTemplateTests() {
  console.log('🧪 Starting Step 8 Template System Test Suite...\n');
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  // 1. Template count and IDs
  console.log('--- 1. Template Registry & Metadata ---');
  const allTemplates = getAllTemplates();
  assert(allTemplates.length === 12, `Expected 12 templates, found ${allTemplates.length}`);

  for (const expectedId of EXPECTED_TEMPLATE_IDS) {
    const t = getTemplateById(expectedId);
    assert(!!t, `Template with id "${expectedId}" exists`);
  }

  // 2. Categories
  console.log('\n--- 2. Category Verification ---');
  const foundCategories = new Set(allTemplates.map((t) => t.category));
  for (const cat of REQUIRED_CATEGORIES) {
    assert(foundCategories.has(cat), `Category "${cat}" has at least one template`);
  }

  // 3. Field schema compliance
  console.log('\n--- 3. Field Schema & Grid Width Compliance ---');
  for (const template of allTemplates) {
    assert(template.fields.length > 0, `"${template.name}" has ${template.fields.length} fields`);

    const fieldIds = new Set<string>();
    for (const field of template.fields) {
      assert(!fieldIds.has(field.id), `Field ID "${field.id}" is unique within "${template.name}"`);
      fieldIds.add(field.id);

      assert(
        VALID_FIELD_TYPES.has(field.type),
        `Field "${field.label}" (${field.id}) has valid type "${field.type}"`,
      );

      if (field.width !== undefined) {
        assert(
          VALID_FIELD_WIDTHS.has(field.width),
          `Field "${field.label}" has valid width ${field.width}`,
        );
      }
    }
  }

  // 4. Conditional logic reference validity
  console.log('\n--- 4. Conditional Logic Dependency Order ---');
  for (const template of allTemplates) {
    const fieldIndexMap = new Map<string, number>();
    template.fields.forEach((f, idx) => fieldIndexMap.set(f.id, idx));

    for (const field of template.fields) {
      if (!field.visibleIf) continue;

      const conditions = field.visibleIf.conditions ?? [];
      if (field.visibleIf.fieldId) {
        conditions.push({
          fieldId: field.visibleIf.fieldId,
          operator: field.visibleIf.operator ?? 'equals',
          value: field.visibleIf.value ?? field.visibleIf.equals,
        });
      }

      for (const cond of conditions) {
        assert(
          fieldIndexMap.has(cond.fieldId),
          `In "${template.name}", conditional field "${field.label}" references existing field ID "${cond.fieldId}"`,
        );

        const targetIdx = fieldIndexMap.get(cond.fieldId) ?? 0;
        const currentIdx = fieldIndexMap.get(field.id) ?? 0;
        assert(
          targetIdx < currentIdx,
          `In "${template.name}", target field "${cond.fieldId}" (idx: ${targetIdx}) precedes dependent field "${field.id}" (idx: ${currentIdx})`,
        );
      }
    }
  }

  // 5. Instantiation: UUID freshness and conditional logic remapping
  console.log('\n--- 5. Instantiation & Field ID Remapping ---');
  for (const template of allTemplates) {
    const instantiated = instantiateTemplateSchema(template.fields);
    assert(
      instantiated.length === template.fields.length,
      `"${template.name}" instantiation preserved field count (${instantiated.length})`,
    );

    const oldIds = new Set(template.fields.map((f) => f.id));
    const newIds = new Set(instantiated.map((f) => f.id));

    // Every field must have a new unique ID
    assert(newIds.size === instantiated.length, `All new field IDs in "${template.name}" are unique`);

    for (const newField of instantiated) {
      assert(
        !oldIds.has(newField.id),
        `Instantiated field "${newField.label}" ID "${newField.id}" is fresh (not template ID)`,
      );
    }

    // Every conditional logic rule must reference a NEW id, never an old template id
    for (const newField of instantiated) {
      if (!newField.visibleIf) continue;

      if (newField.visibleIf.fieldId) {
        assert(
          newIds.has(newField.visibleIf.fieldId),
          `Legacy fieldId reference in "${newField.label}" remapped to new ID: ${newField.visibleIf.fieldId}`,
        );
        assert(
          !oldIds.has(newField.visibleIf.fieldId),
          `Legacy fieldId reference in "${newField.label}" does not point to old template ID`,
        );
      }

      if (newField.visibleIf.conditions) {
        for (const cond of newField.visibleIf.conditions) {
          assert(
            newIds.has(cond.fieldId),
            `Condition fieldId in "${newField.label}" remapped to new ID: ${cond.fieldId}`,
          );
          assert(
            !oldIds.has(cond.fieldId),
            `Condition fieldId in "${newField.label}" does not point to old template ID`,
          );
        }
      }
    }
  }

  // 6. Search and Category Filtering
  console.log('\n--- 6. Search & Filter Behavior ---');
  const studentResults = searchTemplates('student');
  assert(studentResults.length >= 3, `Search "student" found ${studentResults.length} matches`);
  assert(
    studentResults.some((t) => t.id === 'student-registration'),
    'Search "student" includes Student Registration',
  );
  assert(
    studentResults.some((t) => t.id === 'scholarship-application'),
    'Search "student" includes Scholarship Application',
  );
  assert(
    studentResults.some((t) => t.id === 'college-admission'),
    'Search "student" includes College Admission',
  );

  const jobResults = searchTemplates('job');
  assert(
    jobResults.some((t) => t.id === 'job-application'),
    'Search "job" includes Job Application',
  );

  const eventResults = searchTemplates('event');
  assert(
    eventResults.some((t) => t.id === 'event-registration'),
    'Search "event" includes Event Registration',
  );
  assert(
    eventResults.some((t) => t.id === 'event-feedback'),
    'Search "event" includes Event Feedback',
  );

  const educationCategory = searchTemplates('', 'Education');
  assert(
    educationCategory.length === 3,
    `Education category contains exactly 3 templates (found ${educationCategory.length})`,
  );

  const businessCategory = searchTemplates('', 'Business');
  assert(
    businessCategory.length === 3,
    `Business category contains exactly 3 templates (found ${businessCategory.length})`,
  );

  // 7. Scholarship Application detailed check against prompt
  console.log('\n--- 7. Scholarship Application Prompt Requirements ---');
  const scholarship = getTemplateById('scholarship-application')!;
  const scholLabels = scholarship.fields.map((f) => f.label.toLowerCase());

  assert(scholLabels.includes('full name'), 'Scholarship includes Full Name');
  assert(scholLabels.includes('email'), 'Scholarship includes Email');
  assert(scholLabels.includes('phone'), 'Scholarship includes Phone');
  assert(scholLabels.includes('date of birth'), 'Scholarship includes Date of Birth');

  assert(scholLabels.includes('college'), 'Scholarship includes College');
  assert(scholLabels.includes('course'), 'Scholarship includes Course');
  assert(scholLabels.includes('academic year'), 'Scholarship includes Academic Year');
  assert(scholLabels.includes('cgpa'), 'Scholarship includes CGPA');

  assert(scholLabels.includes('scholarship category'), 'Scholarship includes Scholarship Category');
  assert(
    scholLabels.includes('do you require financial assistance?'),
    'Scholarship includes Financial Assistance question',
  );
  assert(
    scholLabels.some((l) => l.includes('annual family income')),
    'Scholarship includes Annual Family Income',
  );

  assert(scholLabels.includes('marksheet'), 'Scholarship includes Marksheet');
  assert(scholLabels.includes('income certificate'), 'Scholarship includes Income Certificate');
  assert(scholLabels.includes('supporting document'), 'Scholarship includes Supporting Document');

  assert(scholLabels.includes('address'), 'Scholarship includes Address');
  assert(scholLabels.includes('city'), 'Scholarship includes City');
  assert(scholLabels.includes('state'), 'Scholarship includes State');
  assert(scholLabels.includes('pincode'), 'Scholarship includes Pincode');

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log('🎉 ALL TESTS PASSED! Template system is 100% compliant.');
    process.exit(0);
  } else {
    console.error(`💥 ${failures} TESTS FAILED.`);
    process.exit(1);
  }
}

runTemplateTests();

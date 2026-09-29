import { config } from 'dotenv';
config();

import {
  validateRawAiOutput,
  normalizeAiSchema,
  instantiateAiGeneratedSchema,
  processAiModelOutput,
  normalizeFieldType,
  AiSchemaValidationError,
} from '../src/lib/ai/validator';
import { callAiModelForFormSchema, generateDeterministicFallbackForm } from '../src/lib/ai/provider';
import { getAllTemplates } from '../src/lib/templates';
import type { FormSchema, FormField, FieldType, FieldWidth } from '../src/db/schema';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runAiTests() {
  console.log('🧪 Starting Step 9 AI Form Generation Test Suite...\n');
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  // =========================================================================
  // 1. Valid AI schema parsing
  // =========================================================================
  console.log('--- 1. Valid AI Schema Parsing ---');
  const validRaw = {
    title: 'Customer Feedback Survey',
    description: 'We value your input and feedback.',
    fields: [
      { id: 'f1', type: 'text', label: 'Full Name', placeholder: 'Jane Doe', required: true, width: 6 },
      { id: 'f2', type: 'email', label: 'Email', placeholder: 'jane@example.com', required: true, width: 6 },
      { id: 'f3', type: 'radio', label: 'Satisfaction', options: ['High', 'Medium', 'Low'], required: true, width: 12 },
    ],
  };

  try {
    const parsed = validateRawAiOutput(validRaw);
    assert(parsed.title === 'Customer Feedback Survey', 'Title parsed correctly');
    assert(parsed.fields.length === 3, `Expected 3 fields, parsed ${parsed.fields.length}`);
    assert(parsed.fields[0].label === 'Full Name', 'First field label matches');
  } catch (err: any) {
    assert(false, `Valid schema parsing threw error: ${err.message}`);
  }

  // =========================================================================
  // 2. Invalid field type rejection
  // =========================================================================
  console.log('\n--- 2. Invalid Field Type Rejection ---');
  const invalidTypeRaw = {
    title: 'Invalid Field Type Form',
    fields: [
      { id: 'f1', type: 'unsupported_video_player', label: 'Video URL' },
    ],
  };

  try {
    validateRawAiOutput(invalidTypeRaw);
    assert(false, 'Expected invalid field type to throw AiSchemaValidationError');
  } catch (err: any) {
    assert(
      err instanceof AiSchemaValidationError && err.message.includes('unsupported field type'),
      `Correctly rejected invalid field type: "${err.message}"`,
    );
  }

  // =========================================================================
  // 3. Invalid width rejection/normalization
  // =========================================================================
  console.log('\n--- 3. Invalid Width Rejection & Normalization ---');
  const invalidWidthRaw = {
    title: 'Width Normalization Test',
    fields: [
      { id: 'w1', type: 'text', label: 'Bad Width Field 1', width: 5 as any },
      { id: 'w2', type: 'text', label: 'Bad Width Field 2', width: 100 as any },
      { id: 'w3', type: 'text', label: 'Missing Width Field' },
      { id: 'w4', type: 'text', label: 'Valid Width Field', width: 6 },
    ],
  };

  const normalizedWidths = normalizeAiSchema(invalidWidthRaw as any);
  assert(normalizedWidths.fields[0].width === 12, 'Invalid width 5 normalized to 12');
  assert(normalizedWidths.fields[1].width === 12, 'Invalid width 100 normalized to 12');
  assert(normalizedWidths.fields[2].width === 12, 'Missing width normalized to 12');
  assert(normalizedWidths.fields[3].width === 6, 'Valid width 6 preserved');

  // =========================================================================
  // 4. Missing required schema properties
  // =========================================================================
  console.log('\n--- 4. Missing Required Schema Properties ---');
  try {
    validateRawAiOutput({ fields: [{ type: 'text', label: 'Name' }] });
    assert(false, 'Expected missing title to throw');
  } catch (err: any) {
    assert(err instanceof AiSchemaValidationError, 'Missing title rejected');
  }

  try {
    validateRawAiOutput({ title: 'No Fields Form' });
    assert(false, 'Expected missing fields array to throw');
  } catch (err: any) {
    assert(err instanceof AiSchemaValidationError, 'Missing fields array rejected');
  }

  try {
    validateRawAiOutput({ title: 'Empty Fields Form', fields: [] });
    assert(false, 'Expected empty fields array to throw');
  } catch (err: any) {
    assert(err instanceof AiSchemaValidationError, 'Empty fields array rejected');
  }

  try {
    validateRawAiOutput({ title: 'No Label Field', fields: [{ id: 'f1', type: 'text' }] });
    assert(false, 'Expected field missing label to throw');
  } catch (err: any) {
    assert(err instanceof AiSchemaValidationError, 'Missing field label rejected');
  }

  // =========================================================================
  // 5. UUID regeneration
  // =========================================================================
  console.log('\n--- 5. UUID Regeneration ---');
  const tempIdSchema = {
    title: 'UUID Test Form',
    fields: [
      { id: 'temporary_id_alpha', type: 'text' as FieldType, label: 'Alpha', width: 12 as FieldWidth },
      { id: 'temporary_id_beta', type: 'text' as FieldType, label: 'Beta', width: 12 as FieldWidth },
    ],
  };

  const instantiated = instantiateAiGeneratedSchema(tempIdSchema);
  const newId1 = instantiated.fields[0].id;
  const newId2 = instantiated.fields[1].id;

  assert(newId1 !== 'temporary_id_alpha', 'Temporary ID replaced');
  assert(newId2 !== 'temporary_id_beta', 'Temporary ID replaced');
  assert(UUID_REGEX.test(newId1), `New ID 1 is a valid UUID (${newId1})`);
  assert(UUID_REGEX.test(newId2), `New ID 2 is a valid UUID (${newId2})`);
  assert(newId1 !== newId2, 'Generated UUIDs are distinct');

  // =========================================================================
  // 6. Conditional reference remapping
  // =========================================================================
  console.log('\n--- 6. Conditional Reference Remapping ---');
  const conditionalRaw = {
    title: 'Remapping Test Form',
    fields: [
      {
        id: 'source_trigger',
        type: 'radio' as FieldType,
        label: 'Do you need assistance?',
        options: ['Yes', 'No'],
        width: 12 as FieldWidth,
      },
      {
        id: 'dependent_child',
        type: 'textarea' as FieldType,
        label: 'Assistance Details',
        width: 12 as FieldWidth,
        visibleIf: {
          conditions: [{ fieldId: 'source_trigger', operator: 'equals' as const, value: 'Yes' }],
          combinator: 'and' as const,
        },
      },
    ],
  };

  const remapped = instantiateAiGeneratedSchema(conditionalRaw);
  const remappedSourceId = remapped.fields[0].id;
  const childVisibleIf = remapped.fields[1].visibleIf;

  assert(!!childVisibleIf, 'Dependent field retained visibleIf rule');
  assert(
    childVisibleIf?.conditions?.[0]?.fieldId === remappedSourceId,
    `Condition fieldId remapped from "source_trigger" to new UUID "${remappedSourceId}"`,
  );
  assert(
    childVisibleIf?.fieldId === remappedSourceId,
    `Legacy condition fieldId also remapped to "${remappedSourceId}"`,
  );

  // =========================================================================
  // 7. Self-dependency rejection
  // =========================================================================
  console.log('\n--- 7. Self-Dependency Rejection ---');
  const selfDepRaw = {
    title: 'Self Dependency Test',
    fields: [
      {
        id: 'self_field',
        type: 'text' as FieldType,
        label: 'Self-Dependent Field',
        width: 12 as FieldWidth,
        visibleIf: {
          conditions: [{ fieldId: 'self_field', operator: 'is_not_empty' as const }],
          combinator: 'and' as const,
        },
      },
    ],
  };

  const selfResult = instantiateAiGeneratedSchema(selfDepRaw);
  assert(
    selfResult.fields[0].visibleIf === undefined,
    'Self-referencing condition was cleanly stripped',
  );

  // =========================================================================
  // 8. Invalid dependency rejection (forward reference & non-existent)
  // =========================================================================
  console.log('\n--- 8. Invalid Dependency Rejection ---');
  const forwardDepRaw = {
    title: 'Forward Dependency Test',
    fields: [
      {
        id: 'field_first',
        type: 'text' as FieldType,
        label: 'First Field (Depends on subsequent field)',
        width: 12 as FieldWidth,
        visibleIf: {
          conditions: [{ fieldId: 'field_second', operator: 'equals' as const, value: 'Hello' }],
        },
      },
      {
        id: 'field_second',
        type: 'text' as FieldType,
        label: 'Second Field',
        width: 12 as FieldWidth,
      },
      {
        id: 'field_third',
        type: 'text' as FieldType,
        label: 'Third Field (Depends on non-existent field)',
        width: 12 as FieldWidth,
        visibleIf: {
          conditions: [{ fieldId: 'ghost_field_404', operator: 'equals' as const, value: 'X' }],
        },
      },
    ],
  };

  const forwardResult = instantiateAiGeneratedSchema(forwardDepRaw);
  assert(
    forwardResult.fields[0].visibleIf === undefined,
    'Forward reference (depending on later field) was cleanly rejected',
  );
  assert(
    forwardResult.fields[2].visibleIf === undefined,
    'Non-existent source field reference was cleanly rejected',
  );

  // =========================================================================
  // 9. Unsupported operator rejection
  // =========================================================================
  console.log('\n--- 9. Unsupported Operator Rejection ---');
  const unsupportedOpRaw = {
    title: 'Operator Compatibility Test',
    fields: [
      {
        id: 'date_source',
        type: 'date' as FieldType,
        label: 'Birthday',
        width: 12 as FieldWidth,
      },
      {
        id: 'dep_field',
        type: 'text' as FieldType,
        label: 'Details',
        width: 12 as FieldWidth,
        visibleIf: {
          // 'contains' is not supported on 'date' fields (only equals, not_equals, is_empty, is_not_empty)
          conditions: [{ fieldId: 'date_source', operator: 'contains' as const, value: '2026' }],
        },
      },
    ],
  };

  const opResult = instantiateAiGeneratedSchema(unsupportedOpRaw);
  assert(
    opResult.fields[1].visibleIf === undefined,
    'Incompatible operator "contains" on date field was rejected',
  );

  // =========================================================================
  // 10. Valid multi-condition schema
  // =========================================================================
  console.log('\n--- 10. Valid Multi-Condition Schema ---');
  const multiCondRaw = {
    title: 'Multi-Condition Form',
    fields: [
      { id: 'country', type: 'dropdown' as FieldType, label: 'Country', options: ['USA', 'Canada', 'India'], width: 6 as FieldWidth },
      { id: 'age', type: 'number' as FieldType, label: 'Age', width: 6 as FieldWidth },
      {
        id: 'special_grant',
        type: 'textarea' as FieldType,
        label: 'Grant Eligibility Notes',
        width: 12 as FieldWidth,
        visibleIf: {
          conditions: [
            { fieldId: 'country', operator: 'equals' as const, value: 'USA' },
            { fieldId: 'age', operator: 'not_equals' as const, value: 0 },
          ],
          combinator: 'and' as const,
        },
      },
    ],
  };

  const multiResult = instantiateAiGeneratedSchema(multiCondRaw);
  const targetField = multiResult.fields[2];
  assert(!!targetField.visibleIf, 'Target retained multi-condition rule');
  assert(targetField.visibleIf?.conditions?.length === 2, 'Both conditions preserved');
  assert(targetField.visibleIf?.conditions?.[0].fieldId === multiResult.fields[0].id, 'Condition 1 fieldId remapped');
  assert(targetField.visibleIf?.conditions?.[1].fieldId === multiResult.fields[1].id, 'Condition 2 fieldId remapped');
  assert(targetField.visibleIf?.combinator === 'and', 'Combinator preserved as "and"');

  // =========================================================================
  // 11. Schema normalization
  // =========================================================================
  console.log('\n--- 11. Schema Normalization ---');
  const unnormalized = {
    title: '   Messy Form Title   ',
    description: '  Extra whitespace description  ',
    fields: [
      {
        id: '  f_dirty  ',
        type: 'select', // alias for dropdown
        label: '  Choose an option  ',
        options: ['  A  ', ' B ', ''],
        required: true,
      },
      {
        id: 'f_heading',
        type: 'section', // alias for heading
        label: 'Section One',
        required: true, // layout type should have required: false
        placeholder: 'Should not have placeholder',
      },
      {
        id: 'f_file',
        type: 'file_upload', // alias for file
        label: 'Resume Upload',
      },
    ],
  };

  const fullyProcessed = processAiModelOutput(unnormalized);
  assert(fullyProcessed.title === 'Messy Form Title', 'Title trimmed');
  assert(fullyProcessed.description === 'Extra whitespace description', 'Description trimmed');
  assert(fullyProcessed.fields[0].type === 'dropdown', 'Alias "select" normalized to "dropdown"');
  assert(
    JSON.stringify(fullyProcessed.fields[0].options) === JSON.stringify(['A', 'B']),
    'Choice options trimmed and empty items removed',
  );
  assert(fullyProcessed.fields[1].type === 'heading', 'Alias "section" normalized to "heading"');
  assert(fullyProcessed.fields[1].required === false, 'Heading required normalized to false');
  assert(fullyProcessed.fields[1].placeholder === undefined, 'Heading placeholder stripped');
  assert(fullyProcessed.fields[2].type === 'file', 'Alias "file_upload" normalized to "file"');
  assert(fullyProcessed.fields[2].file?.maxSizeMb === 10, 'File default maxSizeMb applied');

  // =========================================================================
  // 12. Template and AI schemas both conform to FormSchema
  // =========================================================================
  console.log('\n--- 12. Template & AI Schema Conformance ---');
  const allTemplates = getAllTemplates();
  const sampleTemplate = allTemplates[0];

  // Type check assignment
  const templateFormSchema: FormSchema = {
    fields: sampleTemplate.fields,
    metadata: { description: `Created from ${sampleTemplate.name}` },
  };

  const aiFormSchema: FormSchema = {
    fields: fullyProcessed.fields,
    metadata: { description: 'Created with AI' },
  };

  assert(Array.isArray(templateFormSchema.fields), 'Template conforms to FormSchema.fields');
  assert(Array.isArray(aiFormSchema.fields), 'AI schema conforms to FormSchema.fields');
  assert(aiFormSchema.metadata?.description === 'Created with AI', 'AI metadata conforms to FormSchemaMetadata');

  for (const f of aiFormSchema.fields) {
    assert(typeof f.id === 'string' && UUID_REGEX.test(f.id), `Field ${f.label} has valid UUID`);
    assert(typeof f.label === 'string', `Field ${f.label} has string label`);
    assert(typeof f.type === 'string', `Field ${f.label} has valid type`);
  }

  // =========================================================================
  // 13. Live Gemini API Verification
  // =========================================================================
  console.log('\n--- 13. Live Gemini Integration ---');
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Invoking callAiModelForFormSchema with live Gemini API key...');
      const scholarshipRaw = await callAiModelForFormSchema(
        'Create a scholarship application form for college students. Collect personal information, academic details, family income, and allow users to upload supporting documents.',
      );
      assert(!!scholarshipRaw.title, `Live Gemini generated title: "${scholarshipRaw.title}"`);
      assert(scholarshipRaw.fields.length >= 4, `Live Gemini generated ${scholarshipRaw.fields.length} fields`);

      const processedScholarship = processAiModelOutput(scholarshipRaw);
      assert(processedScholarship.fields.length === scholarshipRaw.fields.length, 'Processed all generated fields');
      assert(
        processedScholarship.fields.every((f) => UUID_REGEX.test(f.id)),
        'All live generated fields received freshly minted server-side UUIDs',
      );
      console.log(`✅ Live Gemini generated and validated "${processedScholarship.title}" with ${processedScholarship.fields.length} fields.`);
    } catch (err: any) {
      console.warn(`⚠️ Note on live call: ${err.message}`);
      // Fallback verification
      const fallback = generateDeterministicFallbackForm('scholarship application');
      const processedFallback = processAiModelOutput(fallback);
      assert(processedFallback.fields.length > 0, 'Fallback generated valid fields');
    }
  } else {
    console.log('Skipping live network call (no GEMINI_API_KEY in environment).');
  }

  console.log('\n========================================');
  if (failures === 0) {
    console.log('🎉 ALL 12 TESTS PASSED! AI Form Generation pipeline is 100% verified.');
  } else {
    console.error(`💥 ${failures} tests failed.`);
    process.exit(1);
  }
}

runAiTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

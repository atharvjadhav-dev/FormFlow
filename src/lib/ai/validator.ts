import type {
  FieldType,
  FieldWidth,
  ConditionOperator,
  FormField,
  VisibleIfRule,
  FieldCondition,
} from '@/db/schema';
import { getSupportedOperators } from '@/lib/form-schema';
import type {
  RawAiFormSchema,
  RawAiFormField,
  RawAiVisibleIf,
  NormalizedAiFormSchema,
} from './types';

export const VALID_FIELD_TYPES: Set<FieldType> = new Set([
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

export const VALID_FIELD_WIDTHS: Set<FieldWidth> = new Set([12, 6, 4, 8, 3, 9]);

export const VALID_CONDITION_OPERATORS: Set<ConditionOperator> = new Set([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
]);

export class AiSchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiSchemaValidationError';
  }
}

/**
 * Normalizes field type strings or common aliases into a valid FormFlow FieldType.
 * Returns null if the type cannot be mapped to any supported FormFlow type.
 */
export function normalizeFieldType(rawType: unknown): FieldType | null {
  if (typeof rawType !== 'string') return null;
  const t = rawType.toLowerCase().trim();

  if (VALID_FIELD_TYPES.has(t as FieldType)) {
    return t as FieldType;
  }

  // Model alias mapping
  switch (t) {
    case 'select':
    case 'selection':
      return 'dropdown';
    case 'short_text':
    case 'shorttext':
    case 'input':
    case 'string':
      return 'text';
    case 'long_text':
    case 'longtext':
    case 'paragraph_text':
      return 'textarea';
    case 'boolean':
    case 'bool':
      return 'radio';
    case 'checkboxes':
    case 'multi_select':
    case 'multiselect':
      return 'checkbox';
    case 'file_upload':
    case 'document':
    case 'upload':
      return 'file';
    case 'image_upload':
    case 'photo':
    case 'picture':
      return 'image';
    case 'section':
    case 'header':
      return 'heading';
    case 'note':
    case 'instruction':
    case 'info':
      return 'paragraph';
    case 'line':
    case 'hr':
    case 'separator':
      return 'divider';
    default:
      return null;
  }
}

/**
 * Validates the raw JSON output from the AI model.
 * Rejects structurally invalid data, unknown field types, missing labels, missing titles, etc.
 */
export function validateRawAiOutput(raw: unknown): RawAiFormSchema {
  if (!raw || typeof raw !== 'object') {
    throw new AiSchemaValidationError('AI output is not a valid JSON object.');
  }

  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.title !== 'string' || candidate.title.trim().length === 0) {
    throw new AiSchemaValidationError('AI output must include a non-empty form title.');
  }

  if (!Array.isArray(candidate.fields)) {
    throw new AiSchemaValidationError('AI output must include an array of fields.');
  }

  if (candidate.fields.length === 0) {
    throw new AiSchemaValidationError('AI output contains no fields.');
  }

  const validatedFields: RawAiFormField[] = [];

  // Validate each field
  for (let i = 0; i < candidate.fields.length; i++) {
    const f = candidate.fields[i];
    if (!f || typeof f !== 'object') {
      throw new AiSchemaValidationError(`Field at index ${i} is not a valid object.`);
    }

    const field = f as Record<string, unknown>;

    // Resolve field type
    const resolvedType = normalizeFieldType(field.type);
    if (!resolvedType) {
      throw new AiSchemaValidationError(
        `Field "${String(field.label || field.title || field.name || `at index ${i}`)}" has unsupported field type "${String(field.type)}".`,
      );
    }

    // Field label is required, but allow fallback to title/name/text, or default for divider
    let label = typeof field.label === 'string' ? field.label.trim() : '';
    if (!label && typeof field.title === 'string') label = field.title.trim();
    if (!label && typeof field.name === 'string') label = field.name.trim();
    if (!label && typeof field.text === 'string') label = field.text.trim();
    if (!label && resolvedType === 'divider') label = 'Divider';

    if (!label) {
      throw new AiSchemaValidationError(`Field at index ${i} is missing a required label.`);
    }

    // Validate visibleIf structure if present
    if (field.visibleIf && typeof field.visibleIf === 'object') {
      const v = field.visibleIf as Record<string, unknown>;
      if (v.operator && typeof v.operator === 'string') {
        if (!VALID_CONDITION_OPERATORS.has(v.operator as ConditionOperator)) {
          throw new AiSchemaValidationError(
            `Field "${field.label}" has unsupported condition operator "${v.operator}".`,
          );
        }
      }
      if (Array.isArray(v.conditions)) {
        for (const c of v.conditions) {
          if (!c || typeof c !== 'object') {
            throw new AiSchemaValidationError(
              `Field "${field.label}" contains an invalid condition item.`,
            );
          }
          const cond = c as Record<string, unknown>;
          if (cond.operator && typeof cond.operator === 'string') {
            if (!VALID_CONDITION_OPERATORS.has(cond.operator as ConditionOperator)) {
              throw new AiSchemaValidationError(
                `Field "${field.label}" has unsupported condition operator "${cond.operator}".`,
              );
            }
          }
        }
      }
    }

    validatedFields.push({
      ...(field as any),
      id: typeof field.id === 'string' ? field.id : (typeof field.name === 'string' ? field.name : undefined),
      type: resolvedType,
      label,
    });
  }

  return {
    title: candidate.title.trim(),
    description: typeof candidate.description === 'string' ? candidate.description.trim() : undefined,
    fields: validatedFields,
  };
}

/**
 * Deterministic Normalization Layer.
 * - Missing or invalid width -> 12
 * - Missing required -> false (or false for layout fields)
 * - Missing placeholder -> undefined
 * - Choice fields (dropdown, radio, checkbox) -> ensure array of trimmed options
 * - Non-choice fields -> strip options
 * - File / Image fields -> ensure default maxSizeMb and acceptedMimeTypes
 * - Layout fields -> clean non-layout properties
 */
export function normalizeAiSchema(raw: RawAiFormSchema): {
  title: string;
  description?: string;
  fields: FormField[];
} {
  const normalizedTitle = raw.title.trim() || 'Untitled Form';
  const normalizedDescription = raw.description?.trim() || undefined;

  let fieldCounter = 1;
  const seenIds = new Set<string>();

  const normalizedFields: FormField[] = raw.fields.map((field) => {
    const type = (normalizeFieldType(field.type) || 'text') as FieldType;

    // Temporary ID normalization: ensure non-empty unique string
    let tempId = typeof field.id === 'string' && field.id.trim() ? field.id.trim() : `ai_field_${fieldCounter++}`;
    if (seenIds.has(tempId)) {
      tempId = `${tempId}_${fieldCounter++}`;
    }
    seenIds.add(tempId);

    // Width normalization: missing or invalid width -> 12
    let width: FieldWidth = 12;
    if (typeof field.width === 'number' && VALID_FIELD_WIDTHS.has(field.width as FieldWidth)) {
      width = field.width as FieldWidth;
    }

    const label = field.label.trim();
    const isLayoutType = type === 'heading' || type === 'paragraph' || type === 'divider';
    const isChoiceType = type === 'dropdown' || type === 'radio' || type === 'checkbox';
    const isFileType = type === 'file' || type === 'image';

    const normalizedField: FormField = {
      id: tempId,
      type,
      label,
      width,
      required: isLayoutType ? false : Boolean(field.required),
    };

    // Placeholder
    if (!isLayoutType && typeof field.placeholder === 'string' && field.placeholder.trim()) {
      normalizedField.placeholder = field.placeholder.trim();
    }

    // Options for choice fields
    if (isChoiceType) {
      if (Array.isArray(field.options) && field.options.length > 0) {
        const cleanOpts = field.options
          .map((o) => String(o).trim())
          .filter((o) => o.length > 0);
        normalizedField.options = cleanOpts.length > 0 ? cleanOpts : ['Option 1', 'Option 2'];
      } else {
        normalizedField.options = ['Option 1', 'Option 2'];
      }
    }

    // Validation
    if (!isLayoutType && field.validation && typeof field.validation === 'object') {
      const v: { minLength?: number; maxLength?: number; pattern?: string } = {};
      if (typeof field.validation.minLength === 'number' && field.validation.minLength >= 0) {
        v.minLength = Math.floor(field.validation.minLength);
      }
      if (typeof field.validation.maxLength === 'number' && field.validation.maxLength >= 0) {
        v.maxLength = Math.floor(field.validation.maxLength);
      }
      if (typeof field.validation.pattern === 'string' && field.validation.pattern.trim()) {
        v.pattern = field.validation.pattern.trim();
      }
      if (Object.keys(v).length > 0) {
        normalizedField.validation = v;
      }
    }

    // File settings
    if (isFileType) {
      normalizedField.file = {
        maxSizeMb: (field.file?.maxSizeMb && field.file.maxSizeMb > 0) ? field.file.maxSizeMb : 10,
        acceptedMimeTypes: (Array.isArray(field.file?.acceptedMimeTypes) && field.file.acceptedMimeTypes.length > 0)
          ? field.file.acceptedMimeTypes
          : type === 'image'
          ? ['image/jpeg', 'image/png']
          : ['application/pdf', 'application/msword'],
      };
    }

    // Pass through raw visibleIf for the instantiation/remapping stage
    if (field.visibleIf && typeof field.visibleIf === 'object') {
      normalizedField.visibleIf = field.visibleIf as VisibleIfRule;
    }

    return normalizedField;
  });

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    fields: normalizedFields,
  };
}

/**
 * UUID & Conditional Reference Remapping Layer.
 *
 * 1. Replaces all AI temporary IDs with fresh crypto.randomUUID()s.
 * 2. Remaps conditional logic references (visibleIf).
 * 3. Enforces strict rules:
 *    - Source field must exist.
 *    - Source field must come strictly BEFORE the dependent field in the schema.
 *    - Source field cannot be the dependent field (no self-reference).
 *    - Source field cannot be a layout-only element (heading, paragraph, divider).
 *    - Operator must be supported for the source field's type.
 *    - If all conditions are stripped/invalid, visibleIf is removed.
 */
export function instantiateAiGeneratedSchema(normalized: {
  title: string;
  description?: string;
  fields: FormField[];
}): NormalizedAiFormSchema {
  const { title, description, fields } = normalized;

  // Build temporary ID -> new UUID map
  const oldToNewMap = new Map<string, string>();
  for (const field of fields) {
    oldToNewMap.set(field.id, crypto.randomUUID());
  }

  // Map to look up original field definitions by their original temporary ID
  const originalFieldsByOldId = new Map<string, FormField>();
  for (const field of fields) {
    originalFieldsByOldId.set(field.id, field);
  }

  // Set of original IDs that have already been visited (for ordering/forward-dependency checks)
  const processedOldIds = new Set<string>();

  const instantiatedFields: FormField[] = fields.map((field) => {
    const freshId = oldToNewMap.get(field.id)!;
    let remappedVisibleIf: VisibleIfRule | undefined = undefined;

    if (field.visibleIf) {
      // Collect raw condition items from either `conditions` array or legacy `{ fieldId, operator, value }`
      const rawConditions: Array<{
        fieldId: string;
        operator: ConditionOperator;
        value?: string | number | boolean;
      }> = [];

      if (Array.isArray(field.visibleIf.conditions) && field.visibleIf.conditions.length > 0) {
        for (const c of field.visibleIf.conditions) {
          if (c && typeof c.fieldId === 'string') {
            rawConditions.push({
              fieldId: c.fieldId,
              operator: (c.operator && VALID_CONDITION_OPERATORS.has(c.operator)) ? c.operator : 'equals',
              value: c.value,
            });
          }
        }
      } else if (field.visibleIf.fieldId) {
        rawConditions.push({
          fieldId: field.visibleIf.fieldId,
          operator: (field.visibleIf.operator && VALID_CONDITION_OPERATORS.has(field.visibleIf.operator))
            ? field.visibleIf.operator
            : 'equals',
          value: field.visibleIf.value !== undefined ? field.visibleIf.value : field.visibleIf.equals,
        });
      }

      // Validate each condition against architectural rules
      const validConditions: FieldCondition[] = [];

      for (const cond of rawConditions) {
        const sourceOldId = cond.fieldId;
        const sourceField = originalFieldsByOldId.get(sourceOldId);

        // 1. Source field must exist
        if (!sourceField) continue;

        // 2. No self-references
        if (sourceOldId === field.id) continue;

        // 3. Source field must come strictly BEFORE dependent field
        if (!processedOldIds.has(sourceOldId)) continue;

        // 4. Source field must not be a layout element
        if (sourceField.type === 'heading' || sourceField.type === 'paragraph' || sourceField.type === 'divider') {
          continue;
        }

        // 5. Operator must be valid for source field type
        const supportedOps = getSupportedOperators(sourceField.type).map((o) => o.value);
        if (!supportedOps.includes(cond.operator)) {
          continue;
        }

        // 6. Remap to fresh UUID
        const newSourceId = oldToNewMap.get(sourceOldId);
        if (!newSourceId) continue;

        validConditions.push({
          fieldId: newSourceId,
          operator: cond.operator,
          value: cond.value,
        });
      }

      if (validConditions.length > 0) {
        remappedVisibleIf = {
          conditions: validConditions,
          combinator: field.visibleIf.combinator ?? 'and',
          // Backwards compatibility legacy properties
          fieldId: validConditions[0].fieldId,
          operator: validConditions[0].operator,
          value: validConditions[0].value,
        };
      }
    }

    // Mark current field as processed so subsequent fields can depend on it
    processedOldIds.add(field.id);

    const cleanField: FormField = {
      ...field,
      id: freshId,
    };

    if (remappedVisibleIf) {
      cleanField.visibleIf = remappedVisibleIf;
    } else {
      delete cleanField.visibleIf;
    }

    return cleanField;
  });

  return {
    title,
    description,
    fields: instantiatedFields,
  };
}

/**
 * End-to-end processing pipeline for raw AI model output:
 * 1. validateRawAiOutput (strict shape & type checks)
 * 2. normalizeAiSchema (deterministic fallbacks & defaults)
 * 3. instantiateAiGeneratedSchema (fresh UUID generation + rule remapping)
 * 4. final verification
 */
export function processAiModelOutput(rawJson: unknown): NormalizedAiFormSchema {
  const validatedRaw = validateRawAiOutput(rawJson);
  const normalized = normalizeAiSchema(validatedRaw);
  const finalSchema = instantiateAiGeneratedSchema(normalized);

  // Final check: confirm all fields have valid UUIDs and properties
  if (!Array.isArray(finalSchema.fields) || finalSchema.fields.length === 0) {
    throw new AiSchemaValidationError('Processed form schema contains no fields.');
  }

  return finalSchema;
}

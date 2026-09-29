import type { FormField, FieldType, ConditionOperator, FieldCondition } from '@/db/schema';

export function evaluateCondition(
  condition: { fieldId: string; operator?: ConditionOperator; value?: unknown; equals?: unknown },
  answers: Record<string, unknown>,
): boolean {
  const answer = answers[condition.fieldId];
  const operator = condition.operator ?? 'equals';
  const targetValue = condition.value !== undefined ? condition.value : condition.equals;

  switch (operator) {
    case 'equals': {
      if (typeof targetValue === 'boolean') {
        return Boolean(answer) === targetValue;
      }
      if (answer === undefined || answer === null || answer === '') {
        return targetValue === '' || targetValue === undefined;
      }
      return String(answer).toLowerCase() === String(targetValue).toLowerCase();
    }
    case 'not_equals': {
      if (typeof targetValue === 'boolean') {
        return Boolean(answer) !== targetValue;
      }
      if (answer === undefined || answer === null || answer === '') {
        return targetValue !== '' && targetValue !== undefined;
      }
      return String(answer).toLowerCase() !== String(targetValue).toLowerCase();
    }
    case 'contains': {
      if (answer === undefined || answer === null) return false;
      const targetStr = String(targetValue).toLowerCase();
      if (Array.isArray(answer)) {
        return answer.some((item) => String(item).toLowerCase().includes(targetStr));
      }
      return String(answer).toLowerCase().includes(targetStr);
    }
    case 'not_contains': {
      if (answer === undefined || answer === null) return true;
      const targetStr = String(targetValue).toLowerCase();
      if (Array.isArray(answer)) {
        return !answer.some((item) => String(item).toLowerCase().includes(targetStr));
      }
      return !String(answer).toLowerCase().includes(targetStr);
    }
    case 'is_empty': {
      if (answer === undefined || answer === null) return true;
      if (typeof answer === 'string') return answer.trim() === '';
      if (Array.isArray(answer)) return answer.length === 0;
      if (typeof answer === 'boolean') return !answer;
      return false;
    }
    case 'is_not_empty': {
      if (answer === undefined || answer === null) return false;
      if (typeof answer === 'string') return answer.trim() !== '';
      if (Array.isArray(answer)) return answer.length > 0;
      if (typeof answer === 'boolean') return answer;
      return true;
    }
    default:
      return String(answer) === String(targetValue);
  }
}

export function isFieldVisible(field: FormField, answers: Record<string, unknown>): boolean {
  if (!field.visibleIf) return true;

  const { conditions, combinator = 'and', fieldId, equals, operator, value } = field.visibleIf;

  if (Array.isArray(conditions) && conditions.length > 0) {
    if (combinator === 'or') {
      return conditions.some((cond) => evaluateCondition(cond, answers));
    }
    return conditions.every((cond) => evaluateCondition(cond, answers));
  }

  if (fieldId) {
    return evaluateCondition({ fieldId, equals, operator, value }, answers);
  }

  return true;
}

export function visibleFields(fields: FormField[], answers: Record<string, unknown>): FormField[] {
  return fields.filter((f) => isFieldVisible(f, answers));
}

/** Fields a given field is allowed to depend on — anything earlier in the array, to rule out forward/circular references. */
export function eligibleDependencies(fields: FormField[], fieldId: string): FormField[] {
  const index = fields.findIndex((f) => f.id === fieldId);
  if (index === -1) return [];
  return fields.slice(0, index).filter((f) => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider');
}

export function getSupportedOperators(fieldType: FieldType): { value: ConditionOperator; label: string }[] {
  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      return [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'dropdown':
    case 'radio':
      return [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'checkbox':
      return [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'number':
    case 'date':
      return [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'file':
    case 'image':
      return [
        { value: 'is_not_empty', label: 'is not empty' },
        { value: 'is_empty', label: 'is empty' },
      ];
    default:
      return [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
  }
}

export function formatConditionText(
  condition: FieldCondition | { fieldId: string; equals?: unknown; operator?: ConditionOperator; value?: unknown },
  allFields: FormField[],
): string {
  const sourceField = allFields.find((f) => f.id === condition.fieldId);
  const fieldName = sourceField ? sourceField.label : 'Unknown field';
  const op = condition.operator ?? 'equals';
  const val = condition.value !== undefined ? condition.value : ('equals' in condition ? condition.equals : undefined);

  const opLabels: Record<ConditionOperator, string> = {
    equals: '=',
    not_equals: '≠',
    contains: 'contains',
    not_contains: 'does not contain',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
  };

  const opText = opLabels[op] ?? op;

  if (op === 'is_empty' || op === 'is_not_empty') {
    return `${fieldName} ${opText}`;
  }

  return `${fieldName} ${opText} "${val ?? ''}"`;
}

/**
 * Compares two form schemas to determine if there are meaningful field changes.
 * Avoids creating duplicate versions when fields and configurations are identical.
 */
export function areSchemasEqual(
  a?: { fields: FormField[] } | null,
  b?: { fields: FormField[] } | null,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (!Array.isArray(a.fields) || !Array.isArray(b.fields)) return false;
  if (a.fields.length !== b.fields.length) return false;

  return JSON.stringify(a.fields) === JSON.stringify(b.fields);
}

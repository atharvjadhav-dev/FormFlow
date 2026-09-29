import type { FormField, VisibleIfRule } from '@/db/schema';
import { FORM_TEMPLATES } from './definitions';
import type { FormTemplate } from './types';

export * from './types';
export * from './definitions';

export function getAllTemplates(): FormTemplate[] {
  return FORM_TEMPLATES;
}

export function getTemplateById(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}

export function searchTemplates(query: string, category: string = 'All'): FormTemplate[] {
  const cleanQuery = query.trim().toLowerCase();

  return FORM_TEMPLATES.filter((template) => {
    // 1. Category filter
    const matchesCategory =
      category === 'All' || template.category.toLowerCase() === category.toLowerCase();
    if (!matchesCategory) return false;

    // 2. Query filter (matches name, description, or category)
    if (!cleanQuery) return true;

    return (
      template.name.toLowerCase().includes(cleanQuery) ||
      template.description.toLowerCase().includes(cleanQuery) ||
      template.category.toLowerCase().includes(cleanQuery) ||
      template.fields.some((f) => f.label.toLowerCase().includes(cleanQuery))
    );
  });
}

/**
 * Instantiates template fields for a new form:
 * 1. Generates a fresh unique UUID for every field.
 * 2. Remaps all conditional logic references (`visibleIf.fieldId` and `visibleIf.conditions[].fieldId`)
 *    so rules point to the newly generated field IDs rather than the template IDs.
 */
export function instantiateTemplateSchema(templateFields: FormField[]): FormField[] {
  // Deep clone to ensure no shared object references with static definitions
  const cloned: FormField[] = structuredClone(templateFields);

  // Build mapping from old template ID to new UUID
  const idMap = new Map<string, string>();
  for (const field of cloned) {
    idMap.set(field.id, crypto.randomUUID());
  }

  // Clone each field and remap IDs and visibleIf references
  return cloned.map((field) => {
    const newId = idMap.get(field.id) ?? crypto.randomUUID();
    let remappedVisibleIf: VisibleIfRule | undefined = undefined;

    if (field.visibleIf) {
      // Remap conditions array
      const remappedConditions = field.visibleIf.conditions?.map((cond) => ({
        ...cond,
        fieldId: idMap.get(cond.fieldId) ?? cond.fieldId,
      }));

      // Remap legacy fieldId if present
      const remappedLegacyFieldId = field.visibleIf.fieldId
        ? (idMap.get(field.visibleIf.fieldId) ?? field.visibleIf.fieldId)
        : undefined;

      remappedVisibleIf = {
        ...field.visibleIf,
        ...(remappedLegacyFieldId ? { fieldId: remappedLegacyFieldId } : {}),
        ...(remappedConditions ? { conditions: remappedConditions } : {}),
      };
    }

    const fieldRest = { ...field };
    delete fieldRest.visibleIf;

    return {
      ...fieldRest,
      id: newId,
      ...(remappedVisibleIf ? { visibleIf: remappedVisibleIf } : {}),
    };
  });
}


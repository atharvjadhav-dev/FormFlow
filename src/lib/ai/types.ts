import type { FieldType, FieldWidth, ConditionOperator, VisibleIfRule, FormField } from '@/db/schema';

export interface AiGenerationOptions {
  fieldCountPreference?: 'auto' | 'compact' | 'standard' | 'detailed'; // compact: ~5-8, standard: ~9-15, detailed: 16+
  stylePreference?: 'standard' | 'minimalist' | 'detailed';
  requiredPreference?: 'smart' | 'all' | 'minimal';
}

export interface RawAiFieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string | number | boolean;
}

export interface RawAiVisibleIf {
  fieldId?: string;
  operator?: ConditionOperator;
  value?: string | number | boolean;
  conditions?: RawAiFieldCondition[];
  combinator?: 'and' | 'or';
}

export interface RawAiFormField {
  id?: string;
  type: FieldType | string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  file?: {
    maxSizeMb: number;
    acceptedMimeTypes: string[];
  };
  visibleIf?: RawAiVisibleIf;
  width?: FieldWidth | number;
}

export interface RawAiFormSchema {
  title: string;
  description?: string;
  fields: RawAiFormField[];
}

export interface NormalizedAiFormSchema {
  title: string;
  description?: string;
  fields: FormField[];
}

export interface AiGenerationResult {
  success: boolean;
  schema?: NormalizedAiFormSchema;
  error?: string;
}

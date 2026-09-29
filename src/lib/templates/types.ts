import type { FormField } from '@/db/schema';

export type TemplateCategory = 'General' | 'Business' | 'Events' | 'Education' | 'Other';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  fields: FormField[];
}

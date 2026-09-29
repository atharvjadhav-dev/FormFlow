import type { FieldType, FormField, FieldWidth } from '@/db/schema';

export interface FieldTypeMeta {
  type: FieldType;
  label: string;
  category: 'Input' | 'Choice' | 'File' | 'Layout';
  hasOptions: boolean;
  isFileType: boolean;
  isLayoutOnly: boolean; // heading/paragraph/divider carry no answer value
  displayLabel?: string;
  keywords?: string[];
}

export const FIELD_WIDTH_OPTIONS: { value: FieldWidth; label: string; fraction: string }[] = [
  { value: 12, label: 'Full width', fraction: '12/12' },
  { value: 6, label: 'Half', fraction: '1/2' },
  { value: 4, label: 'One third', fraction: '1/3' },
  { value: 8, label: 'Two thirds', fraction: '2/3' },
  { value: 3, label: 'Quarter', fraction: '1/4' },
  { value: 9, label: 'Three quarters', fraction: '3/4' },
];

export function getFieldWidthClass(width?: FieldWidth): string {
  switch (width) {
    case 6:
      return 'col-span-12 sm:col-span-6';
    case 4:
      return 'col-span-12 sm:col-span-4';
    case 8:
      return 'col-span-12 sm:col-span-8';
    case 3:
      return 'col-span-12 sm:col-span-3';
    case 9:
      return 'col-span-12 sm:col-span-9';
    case 12:
    default:
      return 'col-span-12';
  }
}

export function getFieldWidthFraction(width?: FieldWidth): string {
  switch (width) {
    case 6:
      return '1/2';
    case 4:
      return '1/3';
    case 8:
      return '2/3';
    case 3:
      return '1/4';
    case 9:
      return '3/4';
    case 12:
    default:
      return '12/12';
  }
}

export const FIELD_TYPES: FieldTypeMeta[] = [
  {
    type: 'text',
    label: 'Text',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['input', 'text', 'short', 'string', 'single line', 'name'],
  },
  {
    type: 'email',
    label: 'Email',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['mail', 'e-mail', 'email', 'address', 'contact'],
  },
  {
    type: 'phone',
    label: 'Phone',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['tel', 'telephone', 'mobile', 'cell', 'phone', 'call', 'sms'],
  },
  {
    type: 'number',
    label: 'Number',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['num', 'digit', 'numeric', 'integer', 'quantity', 'amount', 'count', 'age'],
  },
  {
    type: 'date',
    label: 'Date',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['calendar', 'day', 'time', 'picker', 'schedule', 'dob', 'birthday', 'date'],
  },
  {
    type: 'textarea',
    label: 'Long text',
    category: 'Input',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['long', 'text', 'textarea', 'paragraph', 'multiline', 'description', 'message', 'comment', 'notes', 'bio'],
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    category: 'Choice',
    hasOptions: true,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['drop', 'dropdown', 'select', 'options', 'menu', 'list', 'combobox', 'choice'],
  },
  {
    type: 'radio',
    label: 'Multiple choice',
    category: 'Choice',
    hasOptions: true,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['radio', 'choice', 'multiple choice', 'single choice', 'options', 'pick one', 'select'],
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    category: 'Choice',
    hasOptions: true,
    isFileType: false,
    isLayoutOnly: false,
    keywords: ['check', 'checkbox', 'checkboxes', 'multi select', 'box', 'tick', 'agree', 'toggle'],
  },
  {
    type: 'file',
    label: 'File upload',
    category: 'File',
    hasOptions: false,
    isFileType: true,
    isLayoutOnly: false,
    keywords: ['upload', 'file', 'file upload', 'document', 'pdf', 'attachment', 'doc'],
  },
  {
    type: 'image',
    label: 'Image upload',
    category: 'File',
    hasOptions: false,
    isFileType: true,
    isLayoutOnly: false,
    keywords: ['upload', 'image', 'picture', 'photo', 'img', 'media', 'avatar'],
  },
  {
    type: 'heading',
    label: 'Heading',
    displayLabel: 'Section',
    category: 'Layout',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: true,
    keywords: ['section', 'heading', 'title', 'header', 'h1', 'h2', 'group'],
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    category: 'Layout',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: true,
    keywords: ['paragraph', 'text', 'description', 'helper', 'copy', 'info', 'note', 'body', 'instructions'],
  },
  {
    type: 'divider',
    label: 'Divider',
    category: 'Layout',
    hasOptions: false,
    isFileType: false,
    isLayoutOnly: true,
    keywords: ['divider', 'divide', 'line', 'separator', 'rule', 'hr', 'break'],
  },
];

export function getFieldMeta(type: FieldType): FieldTypeMeta {
  const meta = FIELD_TYPES.find((f) => f.type === type);
  if (!meta) throw new Error(`Unknown field type: ${type}`);
  return meta;
}

export function createDefaultField(type: FieldType): FormField {
  const id = crypto.randomUUID();
  const meta = getFieldMeta(type);
  const base: FormField = { id, type, label: meta.label, required: false, width: 12 };

  if (meta.hasOptions) base.options = ['Option 1', 'Option 2'];
  if (meta.isFileType) base.file = { maxSizeMb: 10, acceptedMimeTypes: type === 'image' ? ['image/jpeg', 'image/png'] : ['application/pdf'] };
  if (type === 'heading') base.label = 'Section heading';
  if (type === 'paragraph') base.label = 'Add some helper text here.';

  return base;
}


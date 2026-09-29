import type { FormField } from '@/db/schema';
import { Input, Textarea, Label } from '@/components/ui/input';

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string;
  labelExtra?: React.ReactNode;
}

export function FieldRenderer({ field, value, onChange, disabled, error, labelExtra }: FieldRendererProps) {
  switch (field.type) {
    case 'heading':
      return (
        <div className="pt-2 pb-1 flex items-center gap-2">
          <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">{field.label}</h3>
          {labelExtra}
        </div>
      );

    case 'paragraph':
      return (
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#86868B] leading-relaxed">{field.label}</p>
          {labelExtra}
        </div>
      );

    case 'divider':
      return (
        <div className="relative py-2">
          <hr className="border-black/[0.06]" />
          {labelExtra && <div className="absolute right-0 -top-1">{labelExtra}</div>}
        </div>
      );

    case 'textarea':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <Textarea
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? 'Enter your response...'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
          />
        </FieldShell>
      );

    case 'dropdown':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <div className="relative">
            <select
              value={(value as string) ?? ''}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3.5 pr-8 text-sm text-[#1D1D1F] transition-all hover:border-black/[0.14] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {field.placeholder ?? 'Select an option'}
              </option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#86868B]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </FieldShell>
      );

    case 'radio':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {field.options?.map((opt) => {
              const isChecked = value === opt;
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-sm cursor-pointer transition-all select-none ${
                    isChecked
                      ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#1D1D1F] shadow-sm ring-1 ring-[#007AFF]'
                      : 'border-black/[0.08] bg-[#F5F5F7]/50 text-[#1D1D1F] hover:bg-[#F5F5F7] hover:border-black/[0.14]'
                  }`}
                >
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => onChange(opt)}
                    className="h-4 w-4 accent-[#007AFF]"
                  />
                  <span className="font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        </FieldShell>
      );

    case 'checkbox': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {field.options?.map((opt) => {
              const isChecked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-sm cursor-pointer transition-all select-none ${
                    isChecked
                      ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#1D1D1F] shadow-sm ring-1 ring-[#007AFF]'
                      : 'border-black/[0.08] bg-[#F5F5F7]/50 text-[#1D1D1F] hover:bg-[#F5F5F7] hover:border-black/[0.14]'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={opt}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(e.target.checked ? [...selected, opt] : selected.filter((o) => o !== opt))
                    }
                    className="h-4 w-4 rounded accent-[#007AFF]"
                  />
                  <span className="font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        </FieldShell>
      );
    }

    case 'file':
    case 'image':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <label className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/[0.12] bg-[#F5F5F7]/50 p-6 text-center cursor-pointer transition-all hover:border-[#007AFF] hover:bg-[#007AFF]/5">
            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#007AFF] mb-2 group-hover:scale-110 transition-transform">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
              Click to select or drag and drop
            </p>
            <p className="mt-1 text-xs text-[#86868B]">
              {field.type === 'image' ? 'Images only' : 'Documents or PDFs'} up to {field.file?.maxSizeMb ?? 10}MB
            </p>
            <input
              type="file"
              disabled={disabled}
              accept={field.file?.acceptedMimeTypes.join(',')}
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </FieldShell>
      );

    case 'date':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <Input type="date" value={(value as string) ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        </FieldShell>
      );

    case 'number':
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <Input
            type="number"
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? '0'}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldShell>
      );

    default: {
      // text, email, phone
      const inputType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text';
      return (
        <FieldShell field={field} error={error} labelExtra={labelExtra}>
          <Input
            type={inputType}
            value={(value as string) ?? ''}
            placeholder={field.placeholder ?? `Enter your ${field.label.toLowerCase()}`}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
          />
        </FieldShell>
      );
    }
  }
}

function FieldShell({
  field,
  error,
  labelExtra,
  children,
}: {
  field: FormField;
  error?: string;
  labelExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Label htmlFor={field.id} className="text-sm font-semibold text-[#1D1D1F]">
          {field.label}
          {field.required && <span className="ml-1 text-[#FF3B30]">*</span>}
        </Label>
        {labelExtra}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-[#FF3B30] flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

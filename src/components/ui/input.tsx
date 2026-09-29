import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3.5 text-sm text-[#1D1D1F] transition-all duration-200 ease-out placeholder:text-[#86868B] hover:border-black/[0.14] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3.5 py-2.5 text-sm text-[#1D1D1F] transition-all duration-200 ease-out placeholder:text-[#86868B] hover:border-black/[0.14] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('mb-1.5 block text-sm font-medium text-[#1D1D1F]', className)} {...props} />
  ),
);
Label.displayName = 'Label';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 ease-out cursor-pointer select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#007AFF] text-white hover:bg-[#0071E3] shadow-sm hover:shadow active:bg-[#0062C4]',
        secondary: 'bg-[#E5E5EA] text-[#1D1D1F] hover:bg-[#DCDCE2] active:bg-[#CECED6]',
        outline: 'border border-black/[0.08] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] hover:border-black/[0.14] shadow-sm',
        ghost: 'hover:bg-black/[0.05] text-[#1D1D1F] active:bg-black/[0.08]',
        destructive: 'bg-[#FF3B30] text-white hover:bg-[#E02D22] shadow-sm active:bg-[#C9251B]',
        accent: 'bg-[#007AFF] text-white hover:bg-[#0071E3]',
        pill: 'border border-black/[0.06] bg-white/80 hover:bg-white text-[#1D1D1F] shadow-sm backdrop-blur-md',
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base font-semibold',
        icon: 'h-9 w-9 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

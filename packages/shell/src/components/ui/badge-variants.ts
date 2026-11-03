import { cva, type VariantProps } from 'class-variance-authority'

// Copied from codeva's components/ui/badge.tsx.
export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-badge-bg-neutral text-badge-fg-neutral',
        neutral: 'bg-badge-bg-neutral text-badge-fg-neutral',
        outline: 'bg-transparent text-badge-fg-outline border-badge-border-outline [a&]:hover:bg-badge-bg-neutral',
        contrast: 'bg-badge-bg-contrast text-badge-fg-contrast',
        success: 'bg-badge-bg-success text-badge-fg-success',
        error: 'bg-badge-bg-error text-badge-fg-error',
        warning: 'bg-badge-bg-warning text-badge-fg-warning',
        info: 'bg-badge-bg-info text-badge-fg-info',
        indigo: 'bg-badge-bg-indigo text-badge-fg-indigo',
        teal: 'bg-badge-bg-teal text-badge-fg-teal',
        pink: 'bg-badge-bg-pink text-badge-fg-pink',
        lime: 'bg-badge-bg-lime text-badge-fg-lime',
        fuchsia: 'bg-badge-bg-fuchsia text-badge-fg-fuchsia',
        cyan: 'bg-badge-bg-cyan text-badge-fg-cyan',
        violet: 'bg-badge-bg-violet text-badge-fg-violet',
        rose: 'bg-badge-bg-rose text-badge-fg-rose',
        destructive: 'bg-badge-bg-error text-badge-fg-error',
        ghost: 'text-badge-fg-neutral [a&]:hover:bg-badge-bg-neutral',
        link: 'text-badge-fg-info underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

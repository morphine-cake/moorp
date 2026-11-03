import { cva, type VariantProps } from 'class-variance-authority'

// Class strings are copied from codeva's components/ui/button.tsx.
export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-btn-primary text-btn-primary-foreground shadow-effect-button-primary hover:bg-btn-primary-hover disabled:bg-btn-primary-disabled disabled:text-btn-primary-foreground-disabled disabled:shadow-none',
        destructive:
          'bg-btn-destructive text-btn-destructive-foreground border border-btn-destructive-border hover:bg-btn-destructive-hover disabled:bg-btn-destructive-disabled disabled:text-btn-destructive-foreground-disabled',
        outline:
          'bg-btn-outline text-btn-outline-foreground border border-btn-outline-border hover:bg-btn-outline-hover disabled:bg-btn-outline-disabled disabled:text-btn-outline-foreground-disabled disabled:border-btn-outline-border-disabled',
        secondary:
          'bg-btn-secondary text-btn-secondary-foreground border border-btn-secondary-border hover:bg-btn-secondary-hover disabled:bg-btn-secondary-disabled disabled:text-btn-secondary-foreground-disabled',
        ghost:
          'bg-btn-ghost text-btn-ghost-foreground border border-btn-ghost-border hover:bg-btn-ghost-hover disabled:bg-btn-ghost-disabled disabled:text-btn-ghost-foreground-disabled',
        link: 'text-btn-primary underline-offset-4 hover:underline border-transparent bg-transparent shadow-none',
      },
      size: {
        default: "h-8 px-2 gap-1 text-sm type-body-m-semibold [&_svg:not([class*='size-'])]:size-4",
        sm: "h-7 px-2 gap-0.5 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-9 px-2.5 gap-1 text-sm [&_svg:not([class*='size-'])]:size-4",
        xs: "h-6 px-1.5 gap-0.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        icon: "size-8 px-2 gap-1 [&_svg:not([class*='size-'])]:size-4",
        'icon-sm': "size-7 px-2 gap-0.5 [&_svg:not([class*='size-'])]:size-4",
        'icon-lg': "size-9 px-2.5 gap-1 [&_svg:not([class*='size-'])]:size-4",
        'icon-xs': "size-6 px-1.5 gap-0.5 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

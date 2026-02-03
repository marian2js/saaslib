import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        warning: 'bg-amber-100 text-amber-900 border-amber-200',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { Badge, badgeVariants }

import * as React from 'react'
import { VariantProps } from 'class-variance-authority'

// Button
declare const buttonVariants: (props?: {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}) => string

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export declare const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>

// Badge
declare const badgeVariants: (props?: {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}) => string

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export declare const Badge: React.FC<BadgeProps>

// Type declarations for shadcn/ui JSX components
// This allows TypeScript to accept them without explicit types

declare module '@/components/ui/select' {
  import * as React from 'react'
  
  export const Select: React.FC<any>
  export const SelectTrigger: React.ForwardRefExoticComponent<any>
  export const SelectValue: React.FC<any>
  export const SelectContent: React.ForwardRefExoticComponent<any>
  export const SelectItem: React.ForwardRefExoticComponent<any>
  export const SelectGroup: React.ForwardRefExoticComponent<any>
  export const SelectLabel: React.ForwardRefExoticComponent<any>
  export const SelectSeparator: React.ForwardRefExoticComponent<any>
  export const SelectScrollUpButton: React.ForwardRefExoticComponent<any>
  export const SelectScrollDownButton: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/input' {
  import * as React from 'react'
  export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
  export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>
}

declare module '@/components/ui/label' {
  import * as React from 'react'
  export const Label: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/textarea' {
  import * as React from 'react'
  export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
  export const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>
}

declare module '@/components/ui/tabs' {
  import * as React from 'react'
  export const Tabs: React.ForwardRefExoticComponent<any>
  export const TabsList: React.ForwardRefExoticComponent<any>
  export const TabsTrigger: React.ForwardRefExoticComponent<any>
  export const TabsContent: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/dialog' {
  import * as React from 'react'
  export const Dialog: React.FC<any>
  export const DialogTrigger: React.ForwardRefExoticComponent<any>
  export const DialogContent: React.ForwardRefExoticComponent<any>
  export const DialogHeader: React.FC<any>
  export const DialogFooter: React.FC<any>
  export const DialogTitle: React.ForwardRefExoticComponent<any>
  export const DialogDescription: React.ForwardRefExoticComponent<any>
  export const DialogClose: React.ForwardRefExoticComponent<any>
  export const DialogOverlay: React.ForwardRefExoticComponent<any>
  export const DialogPortal: React.FC<any>
}

declare module '@/components/ui/checkbox' {
  import * as React from 'react'
  export const Checkbox: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/radio-group' {
  import * as React from 'react'
  export const RadioGroup: React.ForwardRefExoticComponent<any>
  export const RadioGroupItem: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/avatar' {
  import * as React from 'react'
  export const Avatar: React.ForwardRefExoticComponent<any>
  export const AvatarImage: React.ForwardRefExoticComponent<any>
  export const AvatarFallback: React.ForwardRefExoticComponent<any>
}

declare module '@/components/ui/sonner' {
  export const Toaster: React.FC<any>
}

declare module '@/components/ui/scroll-area' {
  import * as React from 'react'
  export const ScrollArea: React.ForwardRefExoticComponent<any>
  export const ScrollBar: React.ForwardRefExoticComponent<any>
}

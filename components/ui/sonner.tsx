"use client";
"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

import * as React from "react"

const Toaster = ({ ...props }: ToasterProps) => {
  return <Sonner richColors {...props} />
}

export { Toaster }

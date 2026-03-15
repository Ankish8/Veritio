import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "../utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground border border-transparent shadow-sm",
        primary: "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 shadow-sm",
        outline: "border border-border bg-background hover:bg-accent active:bg-accent/80 text-foreground",
        secondary: "bg-muted text-foreground hover:bg-muted/80 active:bg-muted/60",
        ghost: "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
        link: "text-muted-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        xs: "h-8 gap-1 rounded-lg px-3 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-10 gap-1.5 rounded-lg px-4 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-lg px-8",
        icon: "h-10 w-10",
        "icon-xs": "h-8 w-8 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "h-9 w-9 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

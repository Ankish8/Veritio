"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "gap-2 group/tabs flex data-[orientation=horizontal]:flex-col min-w-0",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list text-muted-foreground inline-flex w-fit items-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg p-[3px] bg-muted h-8 justify-center",
        line: "gap-1 bg-transparent rounded-none",
        underline: "gap-0 bg-transparent border-b border-border h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

const tabsTriggerVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-all cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: [
          "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm h-[calc(100%-1px)] flex-1",
          "[&_svg:not([class*='size-'])]:size-4",
          "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
          "group-data-[variant=default]/tabs-list:data-active:shadow-sm data-active:bg-background dark:data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 data-active:text-foreground",
        ],
        line: [
          "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm h-[calc(100%-1px)] flex-1",
          "[&_svg:not([class*='size-'])]:size-4",
          "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
          "bg-transparent data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent",
          "after:bg-foreground after:absolute after:opacity-0 after:transition-opacity",
          "group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5",
          "group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5",
          "data-active:after:opacity-100",
        ],
        underline: [
          // Layout & sizing - increased horizontal padding for better spacing
          "gap-2 px-5 py-3 text-sm",
          "[&_svg:not([class*='size-'])]:size-4",
          // Colors
          "text-muted-foreground hover:text-foreground",
          "data-active:text-foreground data-active:font-medium",
          // Underline indicator - full width, thin (1.5px)
          "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px]",
          "after:bg-primary after:opacity-0 after:transition-opacity after:duration-200 after:ease-out",
          "data-active:after:opacity-100",
          // Hover state for non-active - subtle underline hint
          "hover:after:opacity-40 hover:after:bg-muted-foreground",
          "data-active:hover:after:opacity-100 data-active:hover:after:bg-primary",
          // Focus visible state for accessibility
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsTrigger({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsContent({
  className,
  keepMounted = false,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content> & {
  /** When true, keeps content mounted in DOM and uses CSS to hide inactive tabs.
   *  Useful for expensive content like iframes that shouldn't reload on tab switch. */
  keepMounted?: boolean
}) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      forceMount={keepMounted ? true : undefined}
      className={cn(
        "text-sm flex-1 outline-none min-w-0",
        // When keepMounted, hide inactive tabs with CSS instead of unmounting
        keepMounted && "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants }

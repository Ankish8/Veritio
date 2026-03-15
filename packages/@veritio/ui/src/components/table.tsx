"use client"

import * as React from "react"
import { ArrowUpDown } from "lucide-react"

import { cn } from "../utils/cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:bg-muted [&_tr]:rounded-lg", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr]:hover:bg-muted/50", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("bg-muted/50 border-t font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("data-[state=selected]:bg-muted transition-colors", className)}
      {...props}
    />
  )
}

function TableHead({
  className,
  sortable = true,
  children,
  ...props
}: React.ComponentProps<"th"> & { sortable?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground h-11 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wide whitespace-nowrap [&:has([role=checkbox])]:pr-0 first:rounded-l-lg last:rounded-r-lg group/head",
        sortable && "cursor-pointer",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {sortable && (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover/head:opacity-100 transition-opacity" />
        )}
      </span>
    </th>
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-4 align-middle whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

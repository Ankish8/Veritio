'use client'

/**
 * Toast System using react-hot-toast
 *
 * Custom-styled toasts with a polished, subtle design inspired by the
 * comment notification toast. Uses Lucide icons with colored backgrounds,
 * subtle borders and shadows, and clean typography.
 */

import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast'
import {
  Check,
  X,
  Info,
  AlertTriangle,
  Loader2,
  MessageSquare,
} from 'lucide-react'

/**
 * Toast options compatible with sonner API
 */
interface ToastOptions {
  id?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Icon wrapper component for consistent styling across all toast types.
 * Uses a subtle colored background with the icon in matching color.
 */
function ToastIcon({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <div
      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Custom toast component with polished design.
 * Matches the comment notification style with subtle borders, shadows, and typography.
 */
function CustomToast({
  t,
  icon,
  iconClassName,
  title,
  description,
  action,
}: {
  t: { visible: boolean; id: string }
  icon: React.ReactNode
  iconClassName: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-sm w-full bg-card shadow-md rounded-lg pointer-events-auto flex overflow-hidden border border-border`}
    >
      <div className="flex-1 px-3.5 py-3">
        <div className="flex items-start gap-3">
          <ToastIcon className={iconClassName}>{icon}</ToastIcon>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-medium text-card-foreground">{title}</p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {action && (
        <div className="flex border-l border-border">
          <button
            onClick={() => {
              action.onClick()
              hotToast.dismiss(t.id)
            }}
            className="px-3.5 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 hover:bg-muted focus:outline-none transition-colors"
          >
            {action.label}
          </button>
        </div>
      )}
      {!action && (
        <button
          onClick={() => hotToast.dismiss(t.id)}
          className="flex-shrink-0 px-2 flex items-center justify-center text-muted-foreground hover:text-card-foreground hover:bg-muted focus:outline-none transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Sonner-compatible toast API using custom-styled react-hot-toast
 */
export const toast = {
  /**
   * Success toast with green check icon
   */
  success: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={<Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          iconClassName="bg-emerald-500/10"
          title={message}
          description={options?.description}
          action={options?.action}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? 4000,
      }
    )
  },

  /**
   * Error toast with red X icon
   */
  error: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={<X className="h-4 w-4 text-red-600 dark:text-red-400" />}
          iconClassName="bg-red-500/10"
          title={message}
          description={options?.description}
          action={options?.action}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? 5000,
      }
    )
  },

  /**
   * Info toast with blue info icon
   */
  info: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={<Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          iconClassName="bg-blue-500/10"
          title={message}
          description={options?.description}
          action={options?.action}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? 4000,
      }
    )
  },

  /**
   * Warning toast with amber warning icon
   */
  warning: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          }
          iconClassName="bg-amber-500/10"
          title={message}
          description={options?.description}
          action={options?.action}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? 5000,
      }
    )
  },

  /**
   * Loading toast with animated spinner
   */
  loading: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          }
          iconClassName="bg-primary/10"
          title={message}
          description={options?.description}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? Infinity,
      }
    )
  },

  /**
   * Dismiss a specific toast by ID or all toasts
   */
  dismiss: (id?: string) => {
    if (id) {
      hotToast.dismiss(id)
    } else {
      hotToast.dismiss()
    }
  },

  /**
   * Promise-based toast (shows loading, then success/error)
   * Returns the original promise so you can await it
   */
  promise: <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((err: Error) => string)
    },
    options?: { id?: string }
  ): Promise<T> => {
    const toastId = options?.id || `promise-${Date.now()}`

    // Show loading toast
    toast.loading(msgs.loading, { id: toastId })

    // Handle promise resolution and return the original promise
    return promise
      .then((data) => {
        const successMessage =
          typeof msgs.success === 'function' ? msgs.success(data) : msgs.success
        toast.success(successMessage, { id: toastId })
        return data
      })
      .catch((err) => {
        const errorMessage =
          typeof msgs.error === 'function' ? msgs.error(err) : msgs.error
        toast.error(errorMessage, { id: toastId })
        throw err // Re-throw so caller can handle the error
      })
  },

  /**
   * Plain message toast (neutral styling with message icon)
   */
  message: (message: string, options?: ToastOptions) => {
    return hotToast.custom(
      (t) => (
        <CustomToast
          t={t}
          icon={
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          }
          iconClassName="bg-muted"
          title={message}
          description={options?.description}
          action={options?.action}
        />
      ),
      {
        id: options?.id,
        duration: options?.duration ?? 4000,
      }
    )
  },

  /**
   * Custom toast with full control over content
   * Use this for special cases like the comment notification toast
   */
  custom: hotToast.custom,
}

/**
 * Toaster component - renders toast notifications
 * Positioned at bottom-right with proper spacing
 */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      reverseOrder={false}
      gutter={10}
      containerClassName="!z-[9999]"
      toastOptions={{
        // Base duration - custom toasts override this
        duration: 4000,
      }}
    />
  )
}

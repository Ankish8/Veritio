import "./participant.css"
import { ForceLight } from "./force-light"

const SUPABASE_STORAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : null

export default function ParticipantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ForceLight />
      {SUPABASE_STORAGE_HOST && (
        <>
          <link rel="preconnect" href={SUPABASE_STORAGE_HOST} />
          <link rel="dns-prefetch" href={SUPABASE_STORAGE_HOST} />
        </>
      )}
      <div
        className="min-h-dvh overflow-x-hidden"
        style={{ backgroundColor: 'var(--style-page-bg, #f5f5f4)' }}
      >
        {children}
      </div>
    </>
  )
}

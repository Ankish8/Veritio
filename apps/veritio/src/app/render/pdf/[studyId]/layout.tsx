import { validateRenderToken, isStudyAllowed } from '@/services/pdf'
import '@/app/globals.css'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ studyId: string }>
}

export default async function PDFRenderLayout({
  children,
}: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            width: 800px;
            min-height: 600px;
            background: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
          }
        `}</style>
      </head>
      <body>
        <div
          id="pdf-render-container"
          style={{
            width: '800px',
            minHeight: '600px',
            padding: '20px',
            backgroundColor: '#ffffff',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  )
}

export async function validateAndRender(
  searchParams: Promise<{ token?: string }>,
  studyId: string,
  allowedSections: string[],
  renderContent: () => React.ReactNode
): Promise<React.ReactNode> {
  const { token } = await searchParams

  if (!token) {
    return <TokenError message="Missing access token" />
  }

  const tokenData = await validateRenderToken(token)

  if (!tokenData) {
    return <TokenError message="Invalid or expired token" />
  }

  if (!isStudyAllowed(tokenData, studyId)) {
    return <TokenError message="Token not valid for this study" />
  }

  // Check if any of the allowed sections match
  const hasAccess = allowedSections.some((section) =>
    tokenData.sections.includes(section)
  )

  if (!hasAccess) {
    return <TokenError message="Token not valid for this section" />
  }

  return renderContent()
}

function TokenError({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '600px',
        color: '#ef4444',
        fontSize: '18px',
      }}
    >
      Access Denied: {message}
    </div>
  )
}

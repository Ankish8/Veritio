'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getMetaPixelScript } from './meta-pixel-script'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    __veritioMetaQueue?: unknown[][]
  }
}

export function MetaPixel({
  pixelId,
  nonce,
}: {
  pixelId?: string
  nonce?: string
}) {
  const pathname = usePathname()
  const mounted = useRef(false)

  useEffect(() => {
    if (!pixelId || !mounted.current) {
      mounted.current = true
      return
    }
    window.fbq?.('track', 'PageView')
  }, [pathname, pixelId])

  if (!pixelId) return null

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: getMetaPixelScript(pixelId),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}

'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    __veritioMetaQueue?: unknown[][]
  }
}

export default function MetaPixel({ pixelId }: { pixelId?: string }) {
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
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
            if (window.location.pathname === '/ltd') {
              fbq('track', 'ViewContent', {
                content_name: 'Veritio Lifetime Deal',
                content_category: 'ltd',
                content_ids: ['veritio_ltd'],
                content_type: 'product',
                value: 49,
                currency: 'USD'
              });
            }
            var queuedEvents = window.__veritioMetaQueue || [];
            for (var i = 0; i < queuedEvents.length; i++) {
              fbq.apply(null, queuedEvents[i]);
            }
            window.__veritioMetaQueue = [];
          `,
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

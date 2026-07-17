export function getMetaPixelScript(pixelId: string) {
  return `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', '${pixelId}');
    if (!(window.location.pathname === '/ltd-checkout/pay' && new URLSearchParams(window.location.search).get('embed') === '1')) {
      window.fbq('track', 'PageView');
    }
    var queuedEvents = window.__veritioMetaQueue || [];
    for (var i = 0; i < queuedEvents.length; i++) {
      window.fbq.apply(null, queuedEvents[i]);
    }
    window.__veritioMetaQueue = [];
  `
}

/**
 * Shared DOM snapshot capture code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for captureSnapshot/captureModalSnapshot.
 * These rely on closure variables: capturedSnapshotUrls, SNIPPET_ID, and the
 * API URL function (apiUrl or API_BASE).
 *
 * @param opts.urlExpr - JS expression that returns the current page URL string.
 *   Proxy mode: `getRealUrl().split('#')[0]`
 *   Direct mode: `location.href.split('#')[0]`
 * @param opts.apiExpr - JS expression that builds the snapshot API endpoint URL.
 *   Proxy mode: `apiUrl('/api/snippet/' + SNIPPET_ID + '/snapshot')`
 *   Direct mode: `API_BASE + '/api/snippet/' + SNIPPET_ID + '/snapshot'`
 */

export interface SnapshotCaptureOpts {
  urlExpr: string
  apiExpr: string
}

export function getSnapshotCaptureCode(opts: SnapshotCaptureOpts): string {
  return `
  function captureSnapshot() {
    var realUrl = ${opts.urlExpr};
    if (capturedSnapshotUrls[realUrl]) return;
    capturedSnapshotUrls[realUrl] = true;
    setTimeout(function() {
      try {
        if (!window.__rrwebSnapshot) return;
        var forceVisible = document.createElement('style');
        forceVisible.id = '__veritio_snapshot_override';
        forceVisible.textContent = '*, *::before, *::after { opacity: 1 !important; visibility: visible !important; animation: none !important; transition: none !important; }';
        document.head.appendChild(forceVisible);
        var snap = window.__rrwebSnapshot.snapshot(document, {
          blockSelector: '#veritio-lwt-widget-host, #__veritio_lwt_widget, #__veritio_lwt_overlay, #__veritio_lwt_thinkaloud',
          inlineImages: true,
          inlineStylesheet: true
        });
        document.head.removeChild(forceVisible);
        if (!snap) return;
        fetch(${opts.apiExpr}, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageUrl: realUrl,
            snapshot: snap,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pageWidth: document.documentElement.scrollWidth,
            pageHeight: document.documentElement.scrollHeight
          })
        }).catch(function() {});
      } catch(e) {}
    }, 1500);
  }

  function captureModalSnapshot(modalUrl) {
    if (!window.__rrwebSnapshot) return;
    try {
      var forceVisible = document.createElement('style');
      forceVisible.id = '__veritio_snapshot_override';
      forceVisible.textContent = '*, *::before, *::after { opacity: 1 !important; visibility: visible !important; animation: none !important; transition: none !important; }';
      document.head.appendChild(forceVisible);
      var snap = window.__rrwebSnapshot.snapshot(document, {
        blockSelector: '#veritio-lwt-widget-host, #__veritio_lwt_widget, #__veritio_lwt_overlay, #__veritio_lwt_thinkaloud',
        inlineImages: true,
        inlineStylesheet: true
      });
      document.head.removeChild(forceVisible);
      if (!snap) return;
      fetch(${opts.apiExpr}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl: modalUrl,
          snapshot: snap,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          pageWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight
        })
      }).catch(function() {});
    } catch(e) {}
  }
`
}

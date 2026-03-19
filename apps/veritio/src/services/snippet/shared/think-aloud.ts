/**
 * Shared think-aloud prompt overlay code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS for getThinkAloudPosition, showThinkAloudOverlay, hideThinkAloudOverlay,
 * dismissThinkAloud, and the message event listener.
 *
 * These rely on closure variables: widgetHost, studySettings, escapeHtml, thinkAloudEl.
 *
 * @param opts.checkHorizontalPosition - proxy mode also checks horizontal widget position;
 *   direct mode only checks vertical. In practice both compute the same result but the
 *   proxy version has an extra `widgetOnRight` variable. We keep it simple and always
 *   compute vertically since the prompt always goes right-side.
 */

export interface ThinkAloudOpts {
  checkHorizontalPosition?: boolean
}

export function getThinkAloudCode(opts?: ThinkAloudOpts): string {
  // The proxy version has a widgetOnRight check that is computed but never used
  // to change the output (prompt always goes right side). We unify to the simpler version.
  const positionBody = opts?.checkHorizontalPosition
    ? `
    var widgetOnRight = true;
    var widgetOnTop = false;
    if (widgetHost) {
      var rect = widgetHost.getBoundingClientRect();
      var vw = window.innerWidth;
      var vh = window.innerHeight;
      widgetOnRight = rect.left + rect.width / 2 > vw / 2;
      widgetOnTop = rect.top + rect.height / 2 < vh / 2;
    } else {
      var pos = studySettings.widgetPosition || 'bottom-right';
      widgetOnTop = pos.indexOf('top') !== -1;
    }`
    : `
    var widgetOnTop = false;
    if (widgetHost) {
      var rect = widgetHost.getBoundingClientRect();
      var vh = window.innerHeight;
      widgetOnTop = rect.top + rect.height / 2 < vh / 2;
    } else {
      var pos = studySettings.widgetPosition || 'bottom-right';
      widgetOnTop = pos.indexOf('top') !== -1;
    }`

  return `
  var thinkAloudEl = null;

  function getThinkAloudPosition() {
${positionBody}
    if (widgetOnTop) {
      return 'bottom:20px;right:16px;';
    }
    return 'top:72px;right:16px;';
  }

  function showThinkAloudOverlay(promptText) {
    hideThinkAloudOverlay();
    thinkAloudEl = document.createElement('div');
    thinkAloudEl.id = '__veritio_lwt_thinkaloud';
    var taPos = getThinkAloudPosition();
    thinkAloudEl.style.cssText = 'position:fixed;' + taPos + 'z-index:2147483646;opacity:0;transform:scale(0.95) translateY(-10px);transition:opacity 0.2s ease-out,transform 0.2s ease-out;pointer-events:auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    thinkAloudEl.innerHTML = '<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;max-width:320px;background:#fff;border:1px solid #2563eb;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;">'
      + '<div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'
      + '</div>'
      + '<div style="flex:1;min-width:0;padding-right:24px;">'
      + '<p style="margin:0 0 2px;font-size:14px;font-weight:500;color:#1e293b;">Think aloud</p>'
      + '<p style="margin:0;font-size:14px;color:#64748b;">' + escapeHtml(promptText) + '</p>'
      + '</div>'
      + '<button id="__veritio_ta_dismiss" style="position:absolute;top:8px;right:8px;padding:4px;background:none;border:none;cursor:pointer;color:#94a3b8;line-height:0;" aria-label="Dismiss">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>'
      + '</button>'
      + '</div>';
    document.body.appendChild(thinkAloudEl);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        if (thinkAloudEl) {
          thinkAloudEl.style.opacity = '1';
          thinkAloudEl.style.transform = 'scale(1) translateY(0)';
        }
      });
    });
    var dismissBtn = document.getElementById('__veritio_ta_dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function() {
        dismissThinkAloud();
      });
    }
  }

  function hideThinkAloudOverlay() {
    if (thinkAloudEl && thinkAloudEl.parentNode) {
      thinkAloudEl.parentNode.removeChild(thinkAloudEl);
      thinkAloudEl = null;
    }
  }

  function dismissThinkAloud() {
    hideThinkAloudOverlay();
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'lwt-think-aloud-dismissed' }, '*');
      }
    } catch(e) {}
  }

  window.addEventListener('message', function(ev) {
    var d = ev.data;
    if (!d) return;
    if (d.type === 'lwt-think-aloud-show' && d.prompt) {
      showThinkAloudOverlay(d.prompt);
    } else if (d.type === 'lwt-think-aloud-hide') {
      hideThinkAloudOverlay();
    }
  });
`
}

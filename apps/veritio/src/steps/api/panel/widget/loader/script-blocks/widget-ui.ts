/**
 * Widget UI Script Block
 *
 * Generates JavaScript for the widget UI including CSS styles,
 * DOM structure, and view rendering functions.
 */

/**
 * Generate CSS styles for the widget.
 * @param borderRadius The border radius in pixels
 */
export function generateWidgetStyles(borderRadius: number): string {
  const _r = borderRadius

  return `// Styles - border radius is dynamic based on user's branding settings
  var r = config.borderRadius;
  var isDrawer = config.widgetStyle === 'drawer';

  // Base styles for all widget types
  var css = '.veritio-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999998;opacity:0;transition:opacity .2s}.veritio-overlay.visible{opacity:1}';

  // Popup styles (default)
  css += '.veritio-widget.veritio-popup{position:fixed;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:360px;width:calc(100vw - 32px);padding:20px;border-radius:' + (r + 4) + 'px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);opacity:0;transform:translateY(20px);transition:all .3s}.veritio-widget.veritio-popup.visible{opacity:1;transform:translateY(0)}.veritio-widget.veritio-popup.bottom-right{bottom:16px;right:16px}.veritio-widget.veritio-popup.bottom-left{bottom:16px;left:16px}.veritio-widget.veritio-popup.top-right{top:16px;right:16px}.veritio-widget.veritio-popup.top-left{top:16px;left:16px}';

  // Drawer styles
  css += '.veritio-widget.veritio-drawer{position:fixed;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:380px;max-width:100vw;height:100vh;top:0;padding:0;border-radius:0;box-shadow:-4px 0 20px rgba(0,0,0,0.15);display:flex;flex-direction:column;transition:transform .3s ease-out}.veritio-widget.veritio-drawer.slide-right{right:0;transform:translateX(100%)}.veritio-widget.veritio-drawer.slide-left{left:0;transform:translateX(-100%)}.veritio-widget.veritio-drawer.visible{transform:translateX(0)}';
  css += '.veritio-drawer-header{padding:16px 20px;border-bottom:1px solid rgba(128,128,128,0.2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}.veritio-drawer-content{flex:1;overflow-y:auto;padding:20px}.veritio-drawer-footer{padding:16px 20px;border-top:1px solid rgba(128,128,128,0.2);flex-shrink:0}';

  // Common styles - close button for popup needs absolute positioning
  css += '.veritio-popup .veritio-close{position:absolute;top:12px;right:12px;width:28px;height:28px;border:0;background:rgba(128,128,128,0.1);border-radius:50%;cursor:pointer;opacity:.6;display:flex;align-items:center;justify-content:center;padding:0;transition:all .2s}.veritio-popup .veritio-close:hover{opacity:1;background:rgba(128,128,128,0.2)}';
  css += '.veritio-drawer .veritio-close{width:32px;height:32px;border:0;background:rgba(128,128,128,0.1);border-radius:50%;cursor:pointer;opacity:.7;display:flex;align-items:center;justify-content:center;padding:0;transition:all .2s;flex-shrink:0}.veritio-drawer .veritio-close:hover{opacity:1;background:rgba(128,128,128,0.2)}.veritio-title{font-size:18px;font-weight:600;margin:0 0 8px;padding-right:24px}.veritio-desc{font-size:14px;margin:0 0 16px;opacity:.7;line-height:1.5}.veritio-btn{width:100%;padding:12px 20px;border:0;border-radius:' + r + 'px;font-size:14px;font-weight:500;cursor:pointer;transition:transform .1s,opacity .1s}.veritio-btn:hover{transform:translateY(-1px)}.veritio-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}.veritio-form{display:flex;flex-direction:column;gap:12px}.veritio-input,.veritio-select{width:100%;padding:10px 12px;border-radius:' + r + 'px;font-size:14px;font-family:inherit;box-sizing:border-box}.veritio-input:focus,.veritio-select:focus{outline:none;border-color:' + config.buttonColor + '}.veritio-label{font-size:13px;font-weight:500;margin-bottom:4px;display:block}.veritio-required{color:#dc2626;margin-left:2px}.veritio-field{display:flex;flex-direction:column}.veritio-error{color:#dc2626;font-size:12px;margin-top:4px}.veritio-back{background:transparent;color:inherit}';

  // Mobile responsive for popup only
  css += '@media(max-width:480px){.veritio-widget.veritio-popup{bottom:0!important;left:0!important;right:0!important;top:auto!important;max-width:none;width:auto;margin:16px;border-radius:' + (r + 4) + 'px}.veritio-widget.veritio-drawer{width:100vw}}';

  // Placement mode styles
  css += '.veritio-widget.veritio-inline{position:relative;margin:16px auto;max-width:400px}';
  css += '.veritio-widget.veritio-sticky{position:sticky;bottom:16px;z-index:999999;margin:16px;max-width:360px}';
  css += '.veritio-widget.veritio-after-element{position:relative;margin:16px 0;max-width:400px}';

  // Privacy link styles
  css += '.veritio-privacy-link{display:block;text-align:center;margin-top:12px;font-size:12px;opacity:0.6;text-decoration:none;color:inherit}.veritio-privacy-link:hover{opacity:1;text-decoration:underline}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);`
}

/**
 * Generate the showWidget function and view rendering functions.
 */
export function generateWidgetFunctions(): string {
  return `var overlay, widget, currentView = 'intro';
  var isDrawer = config.widgetStyle === 'drawer';
  var placementMode = config.placement && config.placement.mode ? config.placement.mode : 'fixed';
  var useOverlay = placementMode === 'fixed' || isDrawer;

  function showWidget() {
    // Create overlay only for fixed/drawer modes
    if (useOverlay) {
      overlay = document.createElement('div');
      overlay.className = 'veritio-overlay';
    }

    widget = document.createElement('div');

    // Apply widget style class based on placement mode
    if (isDrawer) {
      widget.className = 'veritio-widget veritio-drawer slide-' + config.slideDirection;
    } else if (placementMode === 'inline') {
      widget.className = 'veritio-widget veritio-popup veritio-inline';
    } else if (placementMode === 'sticky') {
      widget.className = 'veritio-widget veritio-popup veritio-sticky';
    } else if (placementMode === 'after_element') {
      widget.className = 'veritio-widget veritio-popup veritio-after-element';
    } else if (placementMode === 'custom' && config.placement.customCSS) {
      widget.className = 'veritio-widget veritio-popup';
      // Apply custom CSS
      if (config.placement.customCSS.top) widget.style.top = config.placement.customCSS.top;
      if (config.placement.customCSS.right) widget.style.right = config.placement.customCSS.right;
      if (config.placement.customCSS.bottom) widget.style.bottom = config.placement.customCSS.bottom;
      if (config.placement.customCSS.left) widget.style.left = config.placement.customCSS.left;
      if (config.placement.customCSS.transform) widget.style.transform = config.placement.customCSS.transform;
    } else {
      widget.className = 'veritio-widget veritio-popup ' + config.position;
    }

    widget.style.backgroundColor = theme.bgColor;
    widget.style.color = theme.textColor;
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-modal', useOverlay ? 'true' : 'false');
    widget.setAttribute('aria-labelledby', 'veritio-title');

    // For drawer, go straight to capture form if collecting data
    if (isDrawer && config.captureSettings && config.captureSettings.collectEmail) {
      renderDrawerCaptureForm();
    } else if (isDrawer) {
      renderDrawerIntroView();
    } else {
      renderIntroView();
    }

    // Handle different placement modes
    if (placementMode === 'inline' && config.placement.cssSelector) {
      var targetEl = document.querySelector(config.placement.cssSelector);
      if (targetEl) {
        targetEl.appendChild(widget);
      } else {
        document.body.appendChild(widget);
      }
    } else if (placementMode === 'after_element' && config.placement.cssSelector) {
      var targetEl = document.querySelector(config.placement.cssSelector);
      if (targetEl && targetEl.parentNode) {
        targetEl.parentNode.insertBefore(widget, targetEl.nextSibling);
      } else {
        document.body.appendChild(widget);
      }
    } else if (placementMode === 'sticky') {
      // For sticky, append to body or a container
      document.body.appendChild(widget);
    } else {
      // Fixed mode - use overlay
      if (useOverlay) {
        document.body.appendChild(overlay);
      }
      document.body.appendChild(widget);
      if (useOverlay) {
        document.body.style.overflow = 'hidden';
      }
    }

    // Track impression
    var stored = getStorage(storageKey);
    var data = stored ? JSON.parse(stored) : { firstSeen: Date.now(), count: 0 };
    data.count++;
    setStorage(storageKey, JSON.stringify(data));

    // Analytics
    fetch(config.apiBase + '/api/analytics/widget-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          studyId: config.studyUrl.split('/s/')[1],
          eventType: 'widget_impression',
          timestamp: Date.now(),
          metadata: { embedCodeId: config.embedCodeId, position: config.position, triggerType: config.trigger, placementMode: placementMode }
        }]
      })
    }).catch(function(){});

    requestAnimationFrame(function() {
      if (overlay) overlay.classList.add('visible');
      widget.classList.add('visible');
    });

    // Overlay click does NOT dismiss - user must click close button or CTA

    document.addEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      dismiss();
    }
  }

  function dismiss() {
    if (overlay) overlay.classList.remove('visible');
    widget.classList.remove('visible');
    if (useOverlay) document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
    setTimeout(function() {
      if (overlay) overlay.remove();
      widget.remove();
    }, 300);
  }

  // Helper to add privacy link if configured
  function getPrivacyLinkHtml() {
    if (config.privacy && config.privacy.showPrivacyLink && config.privacy.privacyLinkUrl) {
      var linkText = config.privacy.privacyLinkText || 'Privacy Policy';
      return '<a href="' + escapeHtml(config.privacy.privacyLinkUrl) + '" target="_blank" rel="noopener" class="veritio-privacy-link">' + escapeHtml(linkText) + '</a>';
    }
    return '';
  }

  function renderIntroView() {
    currentView = 'intro';
    widget.innerHTML = '<button class="veritio-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '<h2 id="veritio-title" class="veritio-title">' + escapeHtml(config.title) + '</h2>' +
      '<p class="veritio-desc">' + escapeHtml(config.description) + '</p>' +
      '<button class="veritio-btn" style="background:' + config.buttonColor + ';color:' + getContrastColor(config.buttonColor) + '">' + escapeHtml(config.buttonText) + '</button>' +
      getPrivacyLinkHtml();

    widget.querySelector('.veritio-close').onclick = dismiss;
    widget.querySelector('.veritio-btn').onclick = function() {
      // Track click
      fetch(config.apiBase + '/api/analytics/widget-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [{
            studyId: config.studyUrl.split('/s/')[1],
            eventType: 'widget_click',
            timestamp: Date.now(),
            metadata: { embedCodeId: config.embedCodeId }
          }]
        })
      }).catch(function(){});

      // Check if we need to collect data
      if (config.captureSettings && config.captureSettings.collectEmail) {
        renderCaptureForm();
      } else {
        redirectToStudy();
      }
    };
  }

  // Drawer intro view (without form)
  function renderDrawerIntroView() {
    currentView = 'intro';
    widget.innerHTML = '<div class="veritio-drawer-header">' +
      '<h2 id="veritio-title" class="veritio-title" style="margin:0;padding:0">' + escapeHtml(config.title) + '</h2>' +
      '<button class="veritio-close" aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
      '<div class="veritio-drawer-content">' +
      '<p class="veritio-desc">' + escapeHtml(config.description) + '</p>' +
      '</div>' +
      '<div class="veritio-drawer-footer">' +
      '<button class="veritio-btn" style="background:' + config.buttonColor + ';color:' + getContrastColor(config.buttonColor) + '">' + escapeHtml(config.buttonText) + '</button>' +
      '</div>';

    widget.querySelector('.veritio-close').onclick = dismiss;
    widget.querySelector('.veritio-btn').onclick = function() { redirectToStudy(); };
  }`
}

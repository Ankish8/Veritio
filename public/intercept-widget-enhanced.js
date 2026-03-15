/**
 * Study Intercept Widget v2.0 (Phase 1 Enhanced)
 *
 * Enhanced with:
 * - WCAG 2.1 AA accessibility (ARIA, keyboard navigation, focus management)
 * - Backend frequency capping (visitor tracking, impression limits)
 * - Comprehensive error handling (validation, graceful degradation)
 *
 * Usage:
 * <script
 *   src="https://yourdomain.com/intercept-widget-enhanced.js"
 *   data-study-url="https://yourdomain.com/s/abc123"
 *   data-api-base="https://yourdomain.com"
 *   data-position="bottom-right"
 *   data-trigger="time_delay"
 *   data-trigger-value="5"
 *   data-bg-color="#ffffff"
 *   data-text-color="#1a1a1a"
 *   data-button-color="#000000"
 *   data-title="Help us improve!"
 *   data-description="Share your feedback."
 *   data-button-text="Get Started"
 * ></script>
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var config = {
    studyUrl: script.getAttribute('data-study-url') || '',
    apiBase: script.getAttribute('data-api-base') || (typeof window !== 'undefined' ? window.location.origin : ''),
    position: script.getAttribute('data-position') || 'bottom-right',
    trigger: script.getAttribute('data-trigger') || 'time_delay',
    triggerValue: parseInt(script.getAttribute('data-trigger-value') || '5', 10),
    // Fixed colors for optimal accessibility - not user-configurable
    bgColor: '#ffffff',
    textColor: '#1a1a1a',
    buttonColor: script.getAttribute('data-button-color') || '#7c3aed',
    title: script.getAttribute('data-title') || 'Help us improve!',
    description: script.getAttribute('data-description') || 'Share your feedback.',
    buttonText: script.getAttribute('data-button-text') || 'Get Started',
    previewMode: script.getAttribute('data-preview-mode') === 'true'
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  function validateConfig() {
    var errors = [];

    if (!config.studyUrl) {
      errors.push('Missing data-study-url attribute');
    } else if (!isValidUrl(config.studyUrl)) {
      errors.push('Invalid study URL format');
    }

    // Only validate button color (bg and text are now fixed for accessibility)
    if (!isValidHexColor(config.buttonColor)) {
      console.warn('[InterceptWidget] Invalid button color, using default');
      config.buttonColor = '#7c3aed';
    }

    if (errors.length > 0) {
      console.error('[InterceptWidget] Configuration errors:', errors);
      return false;
    }

    return true;
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  function isValidHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  if (!validateConfig()) {
    return; // Don't initialize with invalid config
  }

  // ============================================================================
  // DEVICE FINGERPRINTING (Privacy-preserving)
  // ============================================================================

  function getDeviceFingerprint() {
    var cached = getFromStorage('__widget_fp');
    if (cached) return cached;

    var components = [
      navigator.userAgent,
      navigator.language || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth || 0,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage
    ];

    // Simple DJB2 hash
    var str = components.join('|');
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    var fingerprint = 'fp_' + Math.abs(hash).toString(36);

    setToStorage('__widget_fp', fingerprint);
    return fingerprint;
  }

  function getFromStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setToStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Silent fail - not critical
    }
  }

  // ============================================================================
  // API CALLS (Frequency Capping)
  // ============================================================================

  function extractStudyId(url) {
    // Extract study ID from URL like /s/abc123 or /s/abc123?params
    var match = url.match(/\/s\/([^/?]+)/);
    return match ? match[1] : null;
  }

  function checkEligibility(callback) {
    var studyId = extractStudyId(config.studyUrl);
    if (!studyId) {
      // Can't extract study ID, fail open
      callback(true, 'invalid_study_url_fail_open');
      return;
    }

    var visitorHash = getDeviceFingerprint();
    var apiUrl = config.apiBase + '/api/widget/check-eligibility';

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId = setTimeout(function() {
      if (controller) controller.abort();
    }, 1000); // 1 second timeout

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studyId: studyId,
        visitorHash: visitorHash,
        fingerprintHash: visitorHash
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function(response) {
        clearTimeout(timeoutId);
        return response.json();
      })
      .then(function(data) {
        callback(data.shouldShow, data.reason);
      })
      .catch(function(error) {
        clearTimeout(timeoutId);
        console.warn('[InterceptWidget] Eligibility check failed, showing widget anyway:', error);
        callback(true, 'api_error_fail_open'); // Fail open
      });
  }

  // ============================================================================
  // SESSION TRACKING (Phase 2)
  // ============================================================================

  function getSessionId() {
    var key = '__widget_sid_' + btoa(config.studyUrl).slice(0, 16);
    var sid = getFromStorage(key);
    if (!sid) {
      sid = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      try {
        sessionStorage.setItem(key, sid);
      } catch(e) {}
    }
    return sid;
  }

  // ============================================================================
  // BATCHED ANALYTICS (Phase 2)
  // ============================================================================

  var analyticsQueue = [];
  var queueTimer = null;
  var BATCH_INTERVAL = 2000; // Send batch every 2 seconds
  var MAX_QUEUE_SIZE = 20;
  var pageLoadTime = Date.now();
  var impressionTime = null;

  function trackEvent(eventType, extraMetadata) {
    var studyId = extractStudyId(config.studyUrl);
    if (!studyId) return;

    analyticsQueue.push({
      studyId: studyId,
      eventType: eventType,
      timestamp: Date.now(),
      metadata: {
        triggerType: config.trigger,
        triggerValue: config.triggerValue,
        position: config.position,
        timeOnPageMs: Date.now() - pageLoadTime,
        timeVisibleMs: impressionTime ? Date.now() - impressionTime : 0,
        deviceFingerprint: getDeviceFingerprint(),
        sessionId: getSessionId(),
        ...(extraMetadata || {})
      }
    });

    // Flush if queue is full
    if (analyticsQueue.length >= MAX_QUEUE_SIZE) {
      flushAnalytics();
    } else {
      scheduleFlush();
    }
  }

  function scheduleFlush() {
    if (queueTimer) return;
    queueTimer = setTimeout(flushAnalytics, BATCH_INTERVAL);
  }

  function flushAnalytics() {
    if (analyticsQueue.length === 0) return;

    var events = analyticsQueue.splice(0); // Clear queue
    clearTimeout(queueTimer);
    queueTimer = null;

    var payload = JSON.stringify({
      events: events,
      sessionId: getSessionId()
    });

    var apiUrl = config.apiBase + '/api/analytics/widget-events';

    // Try sendBeacon first (most reliable for page unload)
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      var sent = navigator.sendBeacon(apiUrl, blob);
      if (sent) return;
    }

    // Fallback to fetch with keepalive
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {
      // Silent fail - tracking is non-critical
    });
  }

  // Flush on page unload
  window.addEventListener('beforeunload', flushAnalytics);
  window.addEventListener('pagehide', flushAnalytics);

  // Legacy trackImpression for Phase 1 compatibility
  function trackImpression(action) {
    var eventTypeMap = {
      'view': 'widget_impression',
      'dismiss': 'widget_dismiss',
      'click': 'widget_click'
    };
    trackEvent(eventTypeMap[action] || 'widget_impression');
  }

  // ============================================================================
  // STYLES (Enhanced with accessibility)
  // ============================================================================

  var CSS = '\n    /* Screen reader only class */\n    .sr-only {\n      position: absolute;\n      width: 1px;\n      height: 1px;\n      padding: 0;\n      margin: -1px;\n      overflow: hidden;\n      clip: rect(0, 0, 0, 0);\n      white-space: nowrap;\n      border-width: 0;\n    }\n\n    .intercept-widget-overlay {\n      position: fixed;\n      inset: 0;\n      background: rgba(0, 0, 0, 0.3);\n      z-index: 999998;\n      opacity: 0;\n      transition: opacity 0.2s ease;\n    }\n    .intercept-widget-overlay.visible {\n      opacity: 1;\n    }\n    \n    .intercept-widget {\n      position: fixed;\n      z-index: 999999;\n      max-width: 320px;\n      width: calc(100vw - 32px);\n      padding: 20px;\n      border-radius: 12px;\n      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n      transform: translateY(20px);\n      opacity: 0;\n      transition: transform 0.3s ease, opacity 0.3s ease;\n    }\n    .intercept-widget.visible {\n      transform: translateY(0);\n      opacity: 1;\n    }\n    .intercept-widget.bottom-right {\n      bottom: 16px;\n      right: 16px;\n    }\n    .intercept-widget.bottom-left {\n      bottom: 16px;\n      left: 16px;\n    }\n    .intercept-widget.top-right {\n      top: 16px;\n      right: 16px;\n    }\n    .intercept-widget.top-left {\n      top: 16px;\n      left: 16px;\n    }\n    \n    .intercept-widget-close {\n      position: absolute;\n      top: 8px;\n      right: 8px;\n      width: 24px;\n      height: 24px;\n      border: none;\n      background: transparent;\n      cursor: pointer;\n      opacity: 0.5;\n      transition: opacity 0.2s ease;\n      padding: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n    }\n    .intercept-widget-close:hover {\n      opacity: 1;\n    }\n    .intercept-widget-close:focus-visible {\n      outline: 2px solid currentColor;\n      outline-offset: 2px;\n      opacity: 1;\n    }\n    .intercept-widget-close svg {\n      width: 16px;\n      height: 16px;\n    }\n    \n    .intercept-widget-title {\n      font-size: 18px;\n      font-weight: 600;\n      margin: 0 0 8px 0;\n      padding-right: 24px;\n    }\n    \n    .intercept-widget-description {\n      font-size: 14px;\n      margin: 0 0 16px 0;\n      opacity: 0.8;\n      line-height: 1.5;\n    }\n    \n    .intercept-widget-button {\n      width: 100%;\n      padding: 12px 20px;\n      border: none;\n      border-radius: 8px;\n      font-size: 14px;\n      font-weight: 500;\n      cursor: pointer;\n      transition: transform 0.1s ease, box-shadow 0.2s ease;\n    }\n    .intercept-widget-button:hover {\n      transform: translateY(-1px);\n      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n    }\n    .intercept-widget-button:active {\n      transform: translateY(0);\n    }\n    .intercept-widget-button:focus-visible {\n      outline: 2px solid currentColor;\n      outline-offset: 2px;\n    }\n    \n    @media (max-width: 480px) {\n      .intercept-widget {\n        bottom: 0 !important;\n        left: 0 !important;\n        right: 0 !important;\n        top: auto !important;\n        max-width: none;\n        width: auto;\n        margin: 16px;\n        border-radius: 12px;\n      }\n    }\n  ';

  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ============================================================================
  // DOM ELEMENTS (Enhanced with ARIA)
  // ============================================================================

  var overlay = document.createElement('div');
  overlay.className = 'intercept-widget-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  var widget = document.createElement('div');
  widget.className = 'intercept-widget ' + config.position;
  widget.style.backgroundColor = config.bgColor;
  widget.style.color = config.textColor;
  widget.setAttribute('role', 'dialog');
  widget.setAttribute('aria-modal', 'true');
  widget.setAttribute('aria-labelledby', 'intercept-widget-title');
  widget.setAttribute('aria-describedby', 'intercept-widget-description');

  var closeBtn = document.createElement('button');
  closeBtn.className = 'intercept-widget-close';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  closeBtn.style.color = config.textColor;

  var title = document.createElement('h2');
  title.id = 'intercept-widget-title';
  title.className = 'intercept-widget-title';
  title.textContent = config.title;

  var description = document.createElement('p');
  description.id = 'intercept-widget-description';
  description.className = 'intercept-widget-description';
  description.textContent = config.description;

  var button = document.createElement('button');
  button.className = 'intercept-widget-button';
  button.textContent = config.buttonText;
  button.style.backgroundColor = config.buttonColor;
  button.style.color = getContrastColor(config.buttonColor);

  widget.appendChild(closeBtn);
  widget.appendChild(title);
  widget.appendChild(description);
  widget.appendChild(button);

  // ============================================================================
  // ACCESSIBILITY: Focus Management
  // ============================================================================

  var previouslyFocused = null;
  var firstFocusable = closeBtn;
  var lastFocusable = button;

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      dismiss();
      return;
    }

    // Tab key focus trap
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }

  function announceToScreenReader(message) {
    var announcer = document.getElementById('intercept-sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'intercept-sr-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    announcer.textContent = message;
  }

  // ============================================================================
  // SHOW / DISMISS FUNCTIONS (Enhanced with accessibility)
  // ============================================================================

  var STORAGE_KEY = 'intercept_widget_shown_' + btoa(config.studyUrl).slice(0, 16);

  function show() {
    // Record when widget becomes visible (for time visible tracking)
    impressionTime = Date.now();

    // Save currently focused element
    previouslyFocused = document.activeElement;

    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(widget);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Trigger animations
    requestAnimationFrame(function() {
      overlay.classList.add('visible');
      widget.classList.add('visible');

      // Focus close button for accessibility
      setTimeout(function() {
        closeBtn.focus();
      }, 300);
    });

    // Announce to screen readers
    announceToScreenReader('Survey invitation dialog opened. ' + config.title);

    // Track impression
    trackImpression('view');
  }

  function dismiss() {
    // Remove visibility
    overlay.classList.remove('visible');
    widget.classList.remove('visible');

    // Remove keyboard listener
    document.removeEventListener('keydown', handleKeyDown);

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }

    // Mark as shown in session
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // Ignore storage errors
    }

    // Track dismissal
    trackImpression('dismiss');

    // Remove from DOM after animation
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (widget.parentNode) widget.parentNode.removeChild(widget);
    }, 300);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  closeBtn.onclick = dismiss;
  overlay.onclick = dismiss;

  button.onclick = function() {
    trackImpression('click');
    dismiss();

    // Add source tracking
    var url = config.studyUrl;
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=widget';

    // Open in new tab
    var newWindow = window.open(url, '_blank', 'noopener');

    // Handle blocked popup
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.warn('[InterceptWidget] Popup blocked, opening in same tab');
      if (confirm('Popup was blocked. Open survey in this tab?')) {
        window.location.href = url;
      }
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function getContrastColor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // ============================================================================
  // TRIGGER HANDLERS (Enhanced with eligibility check)
  // ============================================================================

  function initTimeTrigger() {
    setTimeout(function() {
      checkEligibilityAndShow();
    }, config.triggerValue * 1000);
  }

  function initScrollTrigger() {
    var triggered = false;
    function checkScroll() {
      if (triggered) return;
      var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= config.triggerValue) {
        triggered = true;
        window.removeEventListener('scroll', checkScroll);
        checkEligibilityAndShow();
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  }

  function initExitTrigger() {
    var triggered = false;
    document.addEventListener('mouseout', function(e) {
      if (triggered) return;
      if (e.clientY <= 0 && e.relatedTarget === null) {
        triggered = true;
        checkEligibilityAndShow();
      }
    });
  }

  function checkEligibilityAndShow() {
    // In preview mode, bypass all checks and show immediately
    if (config.previewMode) {
      console.info('[InterceptWidget] Preview mode - bypassing eligibility checks');
      show();
      return;
    }

    // Check session storage first (quick local check)
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        return; // Already shown this session
      }
    } catch (e) {
      // Ignore storage errors
    }

    // Check backend eligibility
    checkEligibility(function(shouldShow, reason) {
      if (shouldShow) {
        show();
      } else {
        console.info('[InterceptWidget] Not showing widget:', reason);
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  switch (config.trigger) {
    case 'time_delay':
      initTimeTrigger();
      break;
    case 'scroll_percentage':
      initScrollTrigger();
      break;
    case 'exit_intent':
      initExitTrigger();
      break;
    default:
      initTimeTrigger();
  }
})();

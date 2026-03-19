import { getPtqCss, getPtqRenderFunctions, getPtqLogic } from './shared-ptq-widget'
import {
  getCssSelectorCode,
  getSessionManagementCode,
  getPortalTrackingCode,
  getSnapshotCaptureCode,
  getEventPipelineCode,
  getUrlPathMatchingCode,
  getBlockingOverlayCode,
  getThinkAloudCode,
  getTaskWidgetCode,
  getTaskStateMachineCode,
} from './shared/index'

export function generateProxyCompanionJs(): string {
  return `(function() {
  'use strict';

  var cfg = window.__VT_PROXY;
  if (!cfg) return; // Not running inside proxy — bail out

  var SNIPPET_ID = cfg.snippetId;
  var STUDY_ID = cfg.studyId;
  var API_BASE = cfg.apiBase;
  var API_Q = cfg.apiQuery || '';
  var PROXY_BASE = cfg.proxyBase;
  var PROXY_PATH = cfg.proxyPath; // /p/{studyId}/{snippetId}/{b64Origin}
  var TARGET_ORIGIN = cfg.targetOrigin;
  var DIRECT_API = cfg.directApiBase || '';
  // Persist DIRECT_API across page navigations: __api param is only on the
  // first page URL (added by the player). When user clicks links inside the
  // proxy, subsequent pages lose __api → worker sets directApiBase to empty
  // → companion would route through the worker → worker forwards to production
  // instead of localhost. Fix: save to sessionStorage on first load, restore on subsequent loads.
  var _DIRECT_API_KEY = '__veritio_direct_api_' + SNIPPET_ID;
  try {
    if (DIRECT_API) {
      sessionStorage.setItem(_DIRECT_API_KEY, DIRECT_API);
    } else {
      DIRECT_API = sessionStorage.getItem(_DIRECT_API_KEY) || '';
    }
  } catch(e) {}
  // Persist variantId across page navigations: __variant param is only on the
  // first page URL. Subsequent proxy navigations don't carry it, so cfg.variantId
  // is empty on all pages after the first. Same fix as DIRECT_API above.
  var VARIANT_ID = cfg.variantId || '';
  var _VARIANT_ID_KEY = '__veritio_variant_' + SNIPPET_ID;
  try {
    if (VARIANT_ID) {
      sessionStorage.setItem(_VARIANT_ID_KEY, VARIANT_ID);
    } else {
      VARIANT_ID = sessionStorage.getItem(_VARIANT_ID_KEY) || '';
    }
  } catch(e) {}
  // Persist participantToken across page navigations (same pattern as VARIANT_ID).
  // On the first page, cfg.participantToken has the value from the player URL.
  // On subsequent navigations, cfg.participantToken is empty — restore from sessionStorage.
  var _PARTICIPANT_TOKEN_KEY = '__veritio_ptk_' + SNIPPET_ID;
  try {
    if (cfg.participantToken) {
      sessionStorage.setItem(_PARTICIPANT_TOKEN_KEY, cfg.participantToken);
    }
  } catch(e) {}
  // Persist shareCode across page navigations
  var _SHARE_CODE_KEY = '__veritio_sc_' + SNIPPET_ID;
  try {
    if (cfg.shareCode) {
      sessionStorage.setItem(_SHARE_CODE_KEY, cfg.shareCode);
    }
  } catch(e) {}
  var SESSION_KEY = '__veritio_lwt_' + SNIPPET_ID;
  var FLUSH_INTERVAL = 2000;
  var SCROLL_THROTTLE = 500;
  var RAGE_CLICK_THRESHOLD = 3;
  var RAGE_CLICK_WINDOW = 500;


  function apiUrl(path) {
    if (DIRECT_API) return DIRECT_API + path;
    return API_BASE + path + (API_Q ? (path.indexOf('?') !== -1 ? '&' : '?') + API_Q.slice(1) : '');
  }

  // State
  var eventQueue = [];
  var tasks = [];
  var currentTaskIndex = 0;
  var sessionId = cfg.sessionId || ('sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now());
  var lastScrollTime = 0;
  var clickTimes = [];
  var interactionHistory = [];
  var taskNavCount = 0;
  var capturedSnapshotUrls = {};

  // Enhanced state machine variables
  var widgetState = 'init'; // init|expanded|active|task_complete|post_task_questions|submitting|done
  var taskStartTime = 0;
  var taskTimeLimitTimer = null;
  var taskResponses = [];
  var studySettings = {};
  var studyBranding = {};
  var shareCode = '';
  var sessionContext = { sessionToken: null, studyId: null, shareCode: null };
  var blockingOverlay = null;
  var widgetHost = null;
  var taskMinimized = false;
  var frontendBase = '';
  var ptqResponses = {};

  // UX improvement state
  var pageClickCount = 0;          // clicks on actual page (not widget) since task start
  var confirmStep = 0;             // 0=normal, 1=complete confirm, 2=skip confirm
  var onboardingPulseTimer = null;  // timer for fading out onboarding hint
  var idleShakeTimer = null;        // timer for idle shake reminder
  var IDLE_SHAKE_SECONDS = 8;       // shake pill after this many seconds of no interaction
  var minimizedClickTimes = [];     // clicks while minimized (for shake detection)
  var SHAKE_CLICK_THRESHOLD = 3;    // clicks needed to trigger shake
  var SHAKE_CLICK_WINDOW = 2000;    // 2 second window (more forgiving than rage click)

  // ============================================================================
  // Real URL Helpers — strip proxy path prefix to get the actual pathname
  // ============================================================================

  function getRealPathname() {
    var p = location.pathname;
    if (p.indexOf(PROXY_PATH) === 0) p = p.slice(PROXY_PATH.length);
    return p || '/';
  }

  function getRealUrl() {
    // Strip tracking query params (__sess, __variant, __api, __veritio_*)
    // that are only present on the first page URL from the player.
    // These create unique URLs per participant, breaking click map aggregation.
    var search = location.search;
    if (search) {
      var params = new URLSearchParams(search);
      var toDelete = [];
      params.forEach(function(_, key) {
        if (key === '__sess' || key === '__variant' || key === '__api' || key.indexOf('__veritio') === 0) {
          toDelete.push(key);
        }
      });
      for (var i = 0; i < toDelete.length; i++) {
        params.delete(toDelete[i]);
      }
      search = params.toString();
      search = search ? '?' + search : '';
    }
    return TARGET_ORIGIN + getRealPathname() + search + location.hash;
  }

  // ============================================================================
  // URL Rewriting — keeps navigation inside the proxy
  // ============================================================================

  function rewriteUrl(url) {
    if (!url) return url;
    try {
      // Already pointing at proxy — leave alone
      if (url.indexOf(PROXY_BASE) === 0) return url;
      // Absolute URL on the target origin → proxy through
      if (url.indexOf(TARGET_ORIGIN) === 0) {
        return PROXY_BASE + PROXY_PATH + url.slice(TARGET_ORIGIN.length);
      }
      // Protocol-relative URL on target origin
      var noProto = TARGET_ORIGIN.replace(/^https?:/, '');
      if (url.indexOf('//' + noProto.replace(/^\\/\\//, '')) === 0) {
        return PROXY_BASE + PROXY_PATH + url.slice(('//' + noProto.replace(/^\\/\\//, '')).length);
      }
      // Root-relative path — belongs to target origin
      if (url.charAt(0) === '/' && url.charAt(1) !== '/') {
        return PROXY_BASE + PROXY_PATH + url;
      }
    } catch(e) {}
    return url; // Cross-origin or data: — leave alone
  }

  // ============================================================================
  // Navigation Interceptors
  // ============================================================================

  // NOTE: Permission blocking (getInstalledRelatedApps, Notification, etc.)
  // is handled by a separate early-injected script in proxy-worker.ts
  // that runs BEFORE any site scripts load.

  function interceptNavigation() {
    // Override fetch — rewrite same-origin requests to go through proxy
    var origFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = rewriteUrl(input);
      } else if (input && typeof input === 'object' && input.url) {
        input = new Request(rewriteUrl(input.url), input);
      }
      return origFetch.call(this, input, init);
    };

    // Override XHR
    var origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      var rewritten = rewriteUrl(String(url));
      var args = Array.prototype.slice.call(arguments);
      args[1] = rewritten;
      return origOpen.apply(this, args);
    };

    // Override history pushState / replaceState
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function(state, title, url) {
      if (url) {
        var _u = String(url);
        // Only rewrite absolute URLs on the target origin. Root-relative paths (e.g., '/about')
        // are SPA router navigations that don't cause page reloads — rewriting them to proxy
        // URLs breaks SPA routers (React Router, Vue Router, etc.) which read
        // window.location.pathname to determine the current route and render a 404.
        if (_u.indexOf(TARGET_ORIGIN) === 0) {
          url = PROXY_BASE + PROXY_PATH + _u.slice(TARGET_ORIGIN.length);
        }
        // Already a proxy URL or other absolute URL: leave alone.
        // Root-relative or relative paths: leave as-is for SPA router compatibility.
      }
      var r = origPushState.call(this, state, title, url);
      onNavigation();
      return r;
    };
    history.replaceState = function(state, title, url) {
      if (url) {
        var _u = String(url);
        if (_u.indexOf(TARGET_ORIGIN) === 0) {
          url = PROXY_BASE + PROXY_PATH + _u.slice(TARGET_ORIGIN.length);
        }
      }
      return origReplaceState.call(this, state, title, url);
    };
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);

    // Override window.open
    var origWindowOpen = window.open;
    window.open = function(url, target, features) {
      if (url) url = rewriteUrl(String(url));
      return origWindowOpen.call(this, url, target, features);
    };
  }

  // ============================================================================
  // DOM Rewriting — fix links & forms in static and dynamic content
  // ============================================================================

  function rewriteElement(el) {
    if (!el || !el.tagName) return;
    var tag = el.tagName.toUpperCase();
    if ((tag === 'A' || tag === 'LINK') && el.href) {
      el.href = rewriteUrl(el.href);
    }
    if (tag === 'FORM' && el.action) {
      el.action = rewriteUrl(el.action);
    }
    if ((tag === 'SCRIPT' || tag === 'IMG' || tag === 'SOURCE' || tag === 'VIDEO') && el.src) {
      el.src = rewriteUrl(el.src);
    }
  }

  function rewriteAllLinks() {
    var els = document.querySelectorAll('a[href], form[action], link[href], img[src], source[src], video[src]');
    for (var i = 0; i < els.length; i++) {
      rewriteElement(els[i]);
    }
  }

  function observeDomChanges() {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue; // element nodes only
          rewriteElement(node);
          var children = node.querySelectorAll ? node.querySelectorAll('a[href], form[action], link[href], img[src], source[src], video[src]') : [];
          for (var k = 0; k < children.length; k++) {
            rewriteElement(children[k]);
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ============================================================================
  // Shared code modules
  // ============================================================================

${getCssSelectorCode()}
${getPortalTrackingCode()}
${getSnapshotCaptureCode({
    urlExpr: "getRealUrl().split('#')[0]",
    apiExpr: "apiUrl('/api/snippet/' + SNIPPET_ID + '/snapshot')",
  })}
${getSessionManagementCode({ includeVariantId: true })}
${getEventPipelineCode({
    apiBaseExpr: "apiUrl(path)",
    pageUrlExpr: "getRealUrl().split('#')[0]",
    pathnameExpr: "getRealPathname() + location.search + location.hash",
    selectorFnName: "getCSSSelector",
    clickUrlExpr: "getRealUrl().split('#')[0] + '#modal'",
    urlMatchPathExpr: "getRealPathname()",
    urlMatchUrlExpr: "TARGET_ORIGIN + realPath + location.search + location.hash",
    urlMatchTargetOriginExpr: "TARGET_ORIGIN",
    includeGazeTracking: true,
    includeSpaNavSetup: false,
    useAdvancedClickTracking: true,
  })}
${getUrlPathMatchingCode()}
${getBlockingOverlayCode()}
${getThinkAloudCode({ checkHorizontalPosition: true })}

  // ===== Shared PTQ widget code (from shared-ptq-widget.ts) =====
  ${getPtqCss()}
  ${getPtqRenderFunctions()}
  ${getPtqLogic()}
  // ===== End shared PTQ widget code =====

${getTaskWidgetCode()}
${getTaskStateMachineCode({
    submitApiExpr: "apiUrl('/api/snippet/' + SNIPPET_ID + '/submit')",
    advanceToNextTaskNavigate: `
    // Determine target starting page — empty/null means homepage (TARGET_ORIGIN)
    var nextTask = tasks[currentTaskIndex];
    var targetUrl = nextTask.target_url || TARGET_ORIGIN;
    var targetPath = '/';
    try { targetPath = new URL(targetUrl).pathname; } catch(e) { targetPath = targetUrl; }
    var curPath = getRealPathname().replace(/\\\\/$/, '') || '/';
    targetPath = targetPath.replace(/\\\\/$/, '') || '/';

    if (curPath !== targetPath) {
      saveFullSession();
      window.location.href = rewriteUrl(targetUrl);
      return;
    }
`,
    includeVariantInSubmit: true,
  })}

  // ============================================================================
  // Test Mode Overlay
  // ============================================================================

  var isTest = location.search.indexOf('__test=true') !== -1;
  var overlay = null;
  if (isTest) {
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
    overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px 48px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);"><div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;margin:0 auto 20px;animation:spin 1s linear infinite;"></div><style>@keyframes spin{to{transform:rotate(360deg);}}</style><h2 style="font-size:20px;font-weight:600;color:#111;margin:0 0 8px;">Testing Compatibility...</h2><p style="font-size:14px;color:#666;margin:0;">Checking if tracking works on this site</p></div>';
    var addOverlay = function() {
      if (document.body) { document.body.appendChild(overlay); }
      else { setTimeout(addOverlay, 50); }
    };
    addOverlay();
  }

  // ============================================================================
  // Recording Mode Detection
  // ============================================================================

  var isRecordingMode = false;
  try {
    var urlParams = new URLSearchParams(location.search);
    if (urlParams.get('__veritio_record') === 'true' && !!window.opener) {
      // First page load with recording param — persist to sessionStorage + clear old data
      isRecordingMode = true;
      sessionStorage.setItem('__veritio_recording', 'true');
      sessionStorage.removeItem('__veritio_rec_confirmed');
      sessionStorage.removeItem('__veritio_rec_pending');
    } else if (sessionStorage.getItem('__veritio_recording') === 'true' && !!window.opener) {
      // Subsequent page loads — check sessionStorage (param lost on navigation)
      isRecordingMode = true;
    }
  } catch(e) {}

  // ============================================================================
  // Initialization
  // ============================================================================

  function init() {
    // Fix the initial URL for SPA routers. The browser URL is the proxy URL
    // (e.g., /p/{studyId}/{snippetId}/{b64Origin}/). SPA routers (React Router,
    // Vue Router, etc.) read window.location.pathname to determine the current
    // route and render a 404 because they don't recognize the proxy path.
    // We replace it with the real path BEFORE interceptNavigation() patches
    // history.replaceState, so the native API is still intact for this call.
    try {
      if (location.pathname.indexOf(PROXY_PATH) === 0) {
        var _fixPath = location.pathname.slice(PROXY_PATH.length) || '/';
        var _fixSearch = location.search
          .replace(/[?&]__veritio_record=true/g, '')
          .replace(/[?&]__test=true/g, '')
          .replace(/^&/, '?');
        history.replaceState(null, '', _fixPath + _fixSearch + location.hash);
      }
    } catch(e) {}

    // URL rewriting must work in both normal and recording mode
    interceptNavigation();
    rewriteAllLinks();
    observeDomChanges();
    initPortalTracking();

    if (isRecordingMode) {
      initRecording();
      return; // Skip task widget, events, flushing in recording mode
    }

    // Test mode: companion script loaded = site is proxy-compatible.
    // Signal opener and update overlay immediately — no need to wait for ping.
    // The ping may fail in local dev (worker forwards to production backend),
    // but the site IS compatible if this script is running.
    if (isTest) {
      try { if (window.opener) window.opener.postMessage({ type: 'veritio-lwt-compatible' }, '*'); } catch(e) {}
      if (overlay) {
        overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px 48px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);"><div style="width:48px;height:48px;background:#10b981;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;"><svg width="24" height="24" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div><h2 style="font-size:20px;font-weight:600;color:#111;margin:0 0 8px;">Compatible!</h2><p style="font-size:14px;color:#666;margin:0 0 16px;">Tracking is working. You can close this tab.</p><button onclick="window.close()" style="background:#2563eb;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;">Close Tab</button></div>';
        setTimeout(function() { try { window.close(); } catch(e) {} }, 2000);
      }
    }

    // Read session context from URL params (added by our platform).
    // Also check cfg (window.__VT_PROXY) which survives redirects — URL params
    // are stripped by the proxy worker on 3xx redirects, but cfg is injected fresh
    // on every proxied page from the original request's params.
    try {
      var params = new URLSearchParams(location.search);
      sessionContext.sessionToken = params.get('__veritio_session') || cfg.participantToken || '';
      if (!sessionContext.sessionToken) {
        try { sessionContext.sessionToken = sessionStorage.getItem(_PARTICIPANT_TOKEN_KEY) || ''; } catch(e) {}
      }
      sessionContext.studyId = params.get('__veritio_study') || '';
      sessionContext.shareCode = params.get('__veritio_share') || cfg.shareCode || '';
      if (!sessionContext.shareCode) {
        try { sessionContext.shareCode = sessionStorage.getItem(_SHARE_CODE_KEY) || ''; } catch(e) {}
      }
      // Strip params after reading
      if (sessionContext.sessionToken || sessionContext.studyId || sessionContext.shareCode) {
        var cleanUrl = location.pathname + location.search
          .replace(/[?&]__veritio_session=[^&]*/g, '')
          .replace(/[?&]__veritio_study=[^&]*/g, '')
          .replace(/[?&]__veritio_share=[^&]*/g, '')
          .replace(/^\\?$/, '');
        history.replaceState(null, '', cleanUrl || location.pathname);
      }
    } catch(e) {}

    // Normal mode: full tracking
    initSession();

    // When a variant is assigned, tasks are always refreshed from API via fetchTasksFromApi()
    // below — so onTasksLoaded() will overwrite any sessionStorage data with correct criteria.
    // We do NOT clear tasks here so that the initial page_view event gets a valid task_id.

    // Record initial page view + track initial pathname for url_path matching
    // Include search + hash to match what the path recorder stores
    interactionHistory.push({
      type: 'navigation',
      pathname: getRealPathname() + location.search + location.hash,
      selector: null,
      elementText: null,
    });
    queueEvent('page_view', {});
    captureSnapshot();
    // Persist after adding navigation entry so it survives full page loads.
    // Only save if tasks are already loaded (no variant) — with a variant we
    // clear tasks above, so this is skipped until onTasksLoaded writes correct data.
    if (tasks.length > 0) {
      saveFullSession();
    }

    // Load task data — prefer postMessage from opener (recording controller),
    // fall back to API fetch (for standalone snippet mode or if opener doesn't respond)
    function showWidgetForCurrentTask() {
      if (currentTaskIndex >= tasks.length) return;
      if (!isTest) {
        createWidget();
        // Only show blocking overlay for initial task view (expanded), not if task is active
        if (widgetState === 'expanded') {
          showBlockingOverlay();
        }
        // Delay auto-detection on page load so user sees the widget before it auto-completes
        // (otherwise task_complete feedback flashes too fast to notice)
        setTimeout(function() {
          checkUrlMatch();
          checkUrlPath();
        }, 400);
      }
    }

    function onTasksLoaded(data) {
      tasks = data.tasks || [];
      studySettings = data.settings || {};
      studyBranding = data.branding || {};
      shareCode = data.shareCode || '';
      frontendBase = data.frontendBase || '';

      var existing = getSession();
      if (existing && existing.currentTaskIndex) {
        currentTaskIndex = existing.currentTaskIndex;
      }

      saveFullSession();
      showWidgetForCurrentTask();
    }

    // Show widget immediately from sessionStorage tasks (even with variant —
    // initSession() already validates variantId matches before restoring tasks).
    // API fetch will update data if needed.
    if (tasks.length > 0) {
      showWidgetForCurrentTask();
    }

    var _gotData = tasks.length > 0;
    var _fallbackTimer = null;

    var _fetchRetryCount = 0;
    var _maxFetchRetries = 3;

    function fetchTasksFromApi() {
      var variantId = VARIANT_ID || '';
      var basePath = '/api/snippet/' + SNIPPET_ID + '/tasks';
      if (variantId) basePath += '?variantId=' + encodeURIComponent(variantId);
      var tasksUrl = apiUrl(basePath);
      fetch(tasksUrl)
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!data.tasks || !data.tasks.length) {
            throw new Error('No tasks in response');
          }
          if (!_gotData) {
            _gotData = true;
            _fetchRetryCount = 0;
            onTasksLoaded(data);
          }
        })
        .catch(function(err) {
          _fetchRetryCount++;
          if (_fetchRetryCount < _maxFetchRetries && !_gotData) {
            var delay = _fetchRetryCount * 2000; // 2s, 4s
            setTimeout(fetchTasksFromApi, delay);
          }
        });
    }

    function _onInitMsg(ev) {
      var d = ev.data;
      if (d && d.type === 'lwt-init' && !_gotData) {
        window.removeEventListener('message', _onInitMsg);
        if (_fallbackTimer) clearTimeout(_fallbackTimer);
        // No variant: use tasks sent directly by the player via postMessage
        _gotData = true;
        onTasksLoaded(d);
      }
    }

    var hasOpener = false;
    try { hasOpener = !!window.opener && !window.opener.closed; } catch(e) {}

    if (VARIANT_ID) {
      // Variant assigned: always fetch from API immediately on every page.
      // Also notify opener so the player knows we're ready (for any side effects).
      fetchTasksFromApi();
      if (hasOpener) {
        try { window.opener.postMessage({ type: 'lwt-companion-ready' }, '*'); } catch(e) {}
      }
    } else if (hasOpener && sessionContext.sessionToken) {
      // No variant, opened by player: wait for lwt-init with task data, fallback to API
      window.addEventListener('message', _onInitMsg);
      try {
        window.opener.postMessage({ type: 'lwt-companion-ready' }, '*');
      } catch(e) { /* opener access blocked */ }
      _fallbackTimer = setTimeout(function() {
        if (!_gotData) fetchTasksFromApi();
      }, 3000);
    } else {
      // Standalone snippet mode: fetch from API immediately
      fetchTasksFromApi();
    }

    // Ping for verification
    fetch(apiUrl('/api/snippet/' + SNIPPET_ID + '/ping'), { method: 'POST', keepalive: true })
      .catch(function() {});

    setupEventListeners();
    startFlushing();
    startRrwebRecording();
    startRrwebFlushing();

    // Start eye tracking gaze capture if enabled
    if (studySettings.eyeTrackingEnabled) {
      startGazeTracking();
    }
  }

  // ============================================================================
  // Recording Mode
  // ============================================================================

  function initRecording() {
    var REC_CONFIRMED_KEY = '__veritio_rec_confirmed';
    var REC_PENDING_KEY = '__veritio_rec_pending';
    var confirmedSteps = [];
    var pendingClicks = [];
    var pendingIdCounter = 0;
    var activeGroupId = null;
    var selectModeNavIdx = -1;
    var selectModeChecked = {};

    function saveRecState() {
      try {
        sessionStorage.setItem(REC_CONFIRMED_KEY, JSON.stringify(confirmedSteps));
        sessionStorage.setItem(REC_PENDING_KEY, JSON.stringify(pendingClicks));
      } catch(e) {}
    }

    function loadRecState() {
      try {
        var c = sessionStorage.getItem(REC_CONFIRMED_KEY);
        if (c) confirmedSteps = JSON.parse(c);
        var p = sessionStorage.getItem(REC_PENDING_KEY);
        if (p) {
          pendingClicks = JSON.parse(p);
          for (var i = 0; i < pendingClicks.length; i++) {
            if (pendingClicks[i]._id > pendingIdCounter) pendingIdCounter = pendingClicks[i]._id;
          }
        }
      } catch(e) {}
    }

    function getVisibleText(el) {
      var text = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        var node = el.childNodes[i];
        if (node.nodeType === 3) {
          text += node.textContent;
        } else if (node.nodeType === 1) {
          var childTag = node.tagName.toLowerCase();
          if (childTag !== 'script' && childTag !== 'style' && childTag !== 'noscript') {
            text += getVisibleText(node);
          }
        }
      }
      return text.trim().replace(/\\s+/g, ' ');
    }

    function getElementDescription(el) {
      var tag = el.tagName.toLowerCase();
      var role = el.getAttribute('role') || '';
      var type = el.getAttribute('type') || '';
      var ariaLabel = el.getAttribute('aria-label') || '';

      if (tag === 'script' || tag === 'style' || tag === 'noscript') return null;

      var kind = 'Click';
      if (tag === 'button' || role === 'button') kind = 'Button';
      else if (tag === 'a' || role === 'link') kind = 'Link';
      else if (tag === 'input' && (type === 'checkbox' || role === 'checkbox')) kind = 'Checkbox';
      else if (tag === 'input' && (type === 'radio' || role === 'radio')) kind = 'Radio';
      else if (tag === 'input' && type === 'submit') kind = 'Submit';
      else if (tag === 'input' || tag === 'textarea') kind = 'Input';
      else if (tag === 'select') kind = 'Dropdown';
      else if (role === 'tab') kind = 'Tab';
      else if (role === 'switch') kind = 'Toggle';
      else if (role === 'menuitem') kind = 'Menu item';
      else if (tag === 'label') kind = 'Label';
      else if (tag === 'img' || tag === 'svg') kind = 'Image';
      else if (tag === 'li') kind = 'List item';
      else if (tag === 'td' || tag === 'th') kind = 'Table cell';
      else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') kind = 'Heading';
      else if (tag === 'span' || tag === 'div' || tag === 'p') {
        try { if (getComputedStyle(el).cursor === 'pointer') kind = 'Button'; } catch(e3) {}
      }

      // Priority: aria-label > aria-labelledby > el.labels > title > placeholder > visible text
      if (ariaLabel) return { text: ariaLabel, hint: role || tag, kind: kind };

      // aria-labelledby: resolve referenced label elements by ID
      var labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        var refIds = labelledBy.split(/\\s+/);
        var refParts = [];
        for (var r = 0; r < refIds.length; r++) {
          var refEl = document.getElementById(refIds[r]);
          if (refEl) refParts.push(getVisibleText(refEl));
        }
        var refText = refParts.join(' ').trim();
        if (refText) return { text: refText.substring(0, 40), hint: role || tag, kind: kind };
      }

      // el.labels: built-in browser API for associated <label> elements
      try {
        if (el.labels && el.labels.length > 0) {
          var nativeLabel = getVisibleText(el.labels[0]).substring(0, 40);
          if (nativeLabel) return { text: nativeLabel, hint: role || tag, kind: kind };
        }
      } catch(e2) {}

      var title = el.getAttribute('title') || '';
      if (title) return { text: title, hint: role || tag, kind: kind };

      // For inputs, use placeholder or current value
      if (tag === 'input' || tag === 'textarea') {
        var placeholder = el.getAttribute('placeholder') || '';
        if (placeholder) return { text: placeholder, hint: type || tag, kind: kind };
        var val = (el.value || '').trim().substring(0, 50);
        if (val) return { text: val, hint: type || tag, kind: kind };
      }

      // For images, use alt text
      if (tag === 'img') {
        var alt = el.getAttribute('alt') || '';
        if (alt) return { text: alt, hint: 'image', kind: kind };
      }

      // Get visible text content (excluding script/style)
      var text = getVisibleText(el).substring(0, 60);

      // If text is too long or empty, try nearby context
      if (!text || text.length > 50) {
        var prev = el.previousElementSibling;
        var next = el.nextElementSibling;
        var sibText = '';
        if (prev) sibText = getVisibleText(prev).substring(0, 30);
        if (!sibText && next) sibText = getVisibleText(next).substring(0, 30);
        if (sibText) text = sibText;
      }

      // Filter out text that looks like code/scripts
      if (text && (/^['"\\{\\(\\[\\!]/.test(text) || /function|=>|var |const |import |require/.test(text))) {
        text = '';
      }

      // For buttons/links with only icons, check SVG title or nested img alt
      if (!text && (kind === 'Button' || kind === 'Link')) {
        try {
          var svgTitle = el.querySelector('svg title');
          if (svgTitle) text = (svgTitle.textContent || '').trim().substring(0, 50);
          if (!text) {
            var nestedImg = el.querySelector('img[alt]');
            if (nestedImg) text = (nestedImg.getAttribute('alt') || '').trim().substring(0, 50);
          }
        } catch(e4) {}
      }

      if (!text) {
        var cls = el.className && typeof el.className === 'string' ? el.className.trim().split(/\\s+/)[0] : '';
        text = cls ? '.' + cls : tag + (type ? '[' + type + ']' : '');
      }

      var hint = role || (tag === 'input' ? 'input' : tag === 'select' ? 'select' : '');
      return { text: text, hint: hint, kind: kind };
    }

    function sendToOpener(stepData, insertAt) {
      try {
        var msg = {
          type: 'veritio-lwt-nav',
          stepType: stepData.stepType || 'navigation',
          pathname: stepData.pathname,
          fullUrl: stepData.fullUrl,
          title: stepData.title,
          selector: stepData.selector || null,
          elementText: stepData.elementText || null,
          label: stepData.label || null,
          insertAt: typeof insertAt === 'number' ? insertAt : -1,
        };
        if (stepData.group) msg.group = stepData.group;
        window.opener.postMessage(msg, '*');
      } catch(e) {}
    }

    function sendGroupsToOpener() {
      try {
        var groups = [];
        for (var gi = 0; gi < confirmedSteps.length; gi++) {
          groups.push(confirmedSteps[gi].group || null);
        }
        window.opener.postMessage({ type: 'veritio-lwt-groups', groups: groups }, '*');
      } catch(e) {}
    }

    // Auto-add navigation steps — uses getRealPathname() for actual path (not proxy path)
    function addNavStep() {
      var pathname = getRealPathname() + location.search + location.hash;
      if (confirmedSteps.length > 0) {
        var last = confirmedSteps[confirmedSteps.length - 1];
        if (last.stepType === 'navigation' && last.pathname === pathname) return;
      }
      // Navigation always ends the current any-order group
      activeGroupId = null;
      var step = {
        stepType: 'navigation',
        pathname: pathname,
        fullUrl: getRealUrl(),
        title: document.title || pathname,
        label: document.title || pathname,
      };
      confirmedSteps.push(step);
      saveRecState();
      sendToOpener(step);
      updateRecordingWidget();
    }

    function addPendingClick(el) {
      var desc = getElementDescription(el);
      if (!desc) return;
      var selector = getCSSSelector(el);
      var pathname = getRealPathname() + location.search + location.hash;

      var now = Date.now();
      for (var i = 0; i < pendingClicks.length; i++) {
        if (pendingClicks[i].pathname !== pathname) continue;
        if (pendingClicks[i].selector === selector && (now - (pendingClicks[i]._ts || 0)) < 2000) return;
      }

      // Auto-collapse: dropdown trigger + option selection → single "Select X from Y" entry
      var role = '';
      try { role = (el.getAttribute('role') || '').toLowerCase(); } catch(e3) {}
      if (role === 'option' || role === 'menuitem' || role === 'treeitem') {
        for (var ci = pendingClicks.length - 1; ci >= 0; ci--) {
          var prev = pendingClicks[ci];
          if (prev.pathname !== pathname) break;
          if (prev._ts && (now - prev._ts) > 3000) break;
          if (prev._role === 'combobox' || prev._role === 'listbox' || prev._hasPopup) {
            var optionText = desc.text || '';
            var triggerText = prev._triggerLabel || prev.elementText || '';
            var mergedLabel = optionText;
            if (triggerText) {
              mergedLabel = 'Select \\x27' + optionText + '\\x27 from ' + triggerText;
            }
            prev.label = mergedLabel;
            prev.detail = mergedLabel;
            prev.elementText = mergedLabel;
            prev.kind = 'Select';
            prev._ts = now;
            saveRecState();
            updateRecordingWidget();
            return;
          }
        }
      }

      // Detect if this element is a dropdown trigger (for future option merge)
      var elRole = '';
      var hasPopup = false;
      var triggerLabel = '';
      try {
        elRole = (el.getAttribute('role') || '').toLowerCase();
        hasPopup = el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-expanded');
        var triggerLabelEl = el.closest ? el.closest('[class*="label"], label, fieldset') : null;
        if (triggerLabelEl) {
          var legendEl = triggerLabelEl.querySelector('legend');
          triggerLabel = legendEl ? (legendEl.textContent || '').trim().substring(0, 50) : (triggerLabelEl.textContent || '').trim().substring(0, 50);
        }
        if (!triggerLabel) {
          var ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) triggerLabel = ariaLabel.substring(0, 50);
        }
      } catch(e4) {}

      pendingClicks.push({
        _id: ++pendingIdCounter,
        _ts: now,
        stepType: 'click',
        pathname: pathname,
        fullUrl: getRealUrl(),
        title: document.title || pathname,
        selector: selector,
        elementText: desc.text,
        label: desc.text + (desc.hint ? ' (' + desc.hint + ')' : ''),
        detail: desc.text,
        kind: desc.kind || 'Click',
        _role: elRole,
        _hasPopup: hasPopup,
        _triggerLabel: triggerLabel,
      });
      saveRecState();
      updateRecordingWidget();
    }

    function setupInputTracking() {
      var trackedInputs = {};
      document.addEventListener('change', function(e) {
        var el = e.target;
        if (!el || !el.tagName) return;
        var tag = el.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;

        var type = el.getAttribute('type') || '';
        if (type === 'hidden' || type === 'password') return;

        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(el)) return;

        var selector = getCSSSelector(el);
        var pathname = getRealPathname() + location.search + location.hash;
        var inputKey = pathname + '::' + selector;

        if (trackedInputs[inputKey]) return;
        trackedInputs[inputKey] = true;

        var label = el.getAttribute('aria-label') || '';
        if (!label) {
          var lblBy = el.getAttribute('aria-labelledby');
          if (lblBy) {
            var rIds = lblBy.split(/\\s+/);
            var rParts = [];
            for (var r2 = 0; r2 < rIds.length; r2++) {
              var rEl = document.getElementById(rIds[r2]);
              if (rEl) rParts.push(getVisibleText(rEl));
            }
            label = rParts.join(' ').trim().substring(0, 50);
          }
        }
        if (!label) {
          // el.labels: built-in browser API for associated <label> elements
          try {
            if (el.labels && el.labels.length > 0) {
              label = getVisibleText(el.labels[0]).substring(0, 50);
            }
          } catch(e5) {}
        }
        if (!label) {
          label = el.getAttribute('placeholder') || '';
        }

        var value = '';
        var kind = 'Typed';
        if (tag === 'select') {
          var opt = el.options[el.selectedIndex];
          value = opt ? (opt.text || opt.value) : '';
          kind = 'Dropdown';
        } else if (type === 'checkbox') {
          value = el.checked ? 'checked' : 'unchecked';
          kind = 'Checkbox';
        } else if (type === 'radio') {
          value = el.value || 'selected';
          kind = 'Radio';
        } else {
          value = (el.value || '').trim().substring(0, 50);
        }

        if (!label && !value) return;

        var displayText = label ? label + (value ? ': ' + value : '') : value;

        // Auto-collapse: if a recent pending click targets the same input field, merge into it
        var now2 = Date.now();
        for (var i = pendingClicks.length - 1; i >= 0; i--) {
          var prev2 = pendingClicks[i];
          if (prev2.pathname !== pathname) break;
          if (prev2._ts && (now2 - prev2._ts) > 3000) break;
          if (prev2.selector === selector) {
            prev2.label = displayText;
            prev2.detail = displayText;
            prev2.elementText = displayText;
            prev2.kind = kind;
            prev2._ts = now2;
            saveRecState();
            updateRecordingWidget();
            return;
          }
        }

        // Deduplicate against existing pending
        for (var i2 = 0; i2 < pendingClicks.length; i2++) {
          if (pendingClicks[i2].selector === selector && pendingClicks[i2].pathname === pathname) return;
        }

        pendingClicks.push({
          _id: ++pendingIdCounter,
          _ts: now2,
          stepType: 'click',
          pathname: pathname,
          fullUrl: getRealUrl(),
          title: document.title || pathname,
          selector: selector,
          elementText: displayText,
          label: displayText,
          detail: displayText,
          kind: kind,
        });
        saveRecState();
        updateRecordingWidget();
      }, true);
    }

    // Find the correct insertion point for a click
    function findClickInsertIndex(click) {
      var insertIndex = confirmedSteps.length;
      for (var j = confirmedSteps.length - 1; j >= 0; j--) {
        if (confirmedSteps[j].stepType === 'navigation' && confirmedSteps[j].pathname === click.pathname) {
          insertIndex = j + 1;
          while (insertIndex < confirmedSteps.length &&
                 confirmedSteps[insertIndex].stepType === 'click' &&
                 confirmedSteps[insertIndex].pathname === click.pathname) {
            insertIndex++;
          }
          break;
        }
      }
      return insertIndex;
    }

    window.__veritioConfirmClick = function(pid) {
      for (var i = 0; i < pendingClicks.length; i++) {
        if (pendingClicks[i]._id === pid) {
          var click = pendingClicks.splice(i, 1)[0];
          var insertIndex = findClickInsertIndex(click);

          if (activeGroupId) {
            click.group = activeGroupId;
          }

          confirmedSteps.splice(insertIndex, 0, click);
          saveRecState();
          sendToOpener(click, insertIndex);
          break;
        }
      }
      updateRecordingWidget();
    };

    // Toggle "any order" — always enters selection mode. Pre-checks currently grouped steps.
    window.__veritioToggleAnyOrder = function(navIdx) {
      // If already in selection mode for this nav, cancel
      if (selectModeNavIdx === navIdx) {
        selectModeNavIdx = -1;
        selectModeChecked = {};
        updateRecordingWidget();
        return;
      }
      var subSteps = [];
      for (var j = navIdx + 1; j < confirmedSteps.length; j++) {
        if (confirmedSteps[j].stepType === 'navigation') break;
        subSteps.push(j);
      }
      if (subSteps.length < 2) return;

      // Enter selection mode — pre-check steps that are already grouped
      selectModeNavIdx = navIdx;
      selectModeChecked = {};
      for (var s = 0; s < subSteps.length; s++) {
        selectModeChecked[subSteps[s]] = !!confirmedSteps[subSteps[s]].group;
      }
      updateRecordingWidget();
    };

    window.__veritioToggleCheck = function(stepIdx) {
      selectModeChecked[stepIdx] = !selectModeChecked[stepIdx];
      updateRecordingWidget();
    };

    window.__veritioCancelSelect = function() {
      selectModeNavIdx = -1;
      selectModeChecked = {};
      updateRecordingWidget();
    };

    // Confirm selection — ungroup all sub-steps under this nav, then re-group checked ones
    window.__veritioConfirmGroup = function() {
      var checked = [];
      for (var key in selectModeChecked) {
        if (selectModeChecked[key]) checked.push(parseInt(key, 10));
      }
      // Ungroup all sub-steps under this nav first
      for (var uj = selectModeNavIdx + 1; uj < confirmedSteps.length; uj++) {
        if (confirmedSteps[uj].stepType === 'navigation') break;
        confirmedSteps[uj].group = undefined;
      }
      if (checked.length >= 2) {
        var newGroupId = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        for (var g = 0; g < checked.length; g++) {
          confirmedSteps[checked[g]].group = newGroupId;
        }
        activeGroupId = newGroupId;
      } else {
        activeGroupId = null;
      }
      saveRecState();
      sendGroupsToOpener();
      selectModeNavIdx = -1;
      selectModeChecked = {};
      updateRecordingWidget();
    };

    // Ungroup all sub-steps under a navigation step (called from group header)
    window.__veritioUngroupAll = function(navIdx) {
      for (var uj = navIdx + 1; uj < confirmedSteps.length; uj++) {
        if (confirmedSteps[uj].stepType === 'navigation') break;
        confirmedSteps[uj].group = undefined;
      }
      activeGroupId = null;
      selectModeNavIdx = -1;
      selectModeChecked = {};
      saveRecState();
      sendGroupsToOpener();
      updateRecordingWidget();
    };

    window.__veritioIgnoreClick = function(pid) {
      pendingClicks = pendingClicks.filter(function(c) { return c._id !== pid; });
      saveRecState();
      updateRecordingWidget();
    };

    // findClickableElement is now in shared scope (used by both recording and live tracking)

    var _pdEl = null;
    var _pdTarget = null;
    var _pdTime = 0;
    var _pdX = 0;
    var _pdY = 0;
    var _pdConsumed = false;
    var _pdClickFired = false;

    function setupRecordingClickTracking() {
      document.addEventListener('pointerdown', function(e) {
        var t = e.target;
        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(t)) {
          _pdEl = null;
          _pdTarget = null;
          return;
        }
        _pdTarget = t;
        _pdEl = findClickableElement(t);
        _pdTime = Date.now();
        _pdX = e.clientX;
        _pdY = e.clientY;
        _pdConsumed = false;
        _pdClickFired = false;
      }, true);

      document.addEventListener('pointerup', function(e) {
        if (!_pdEl || _pdConsumed) return;
        if ((Date.now() - _pdTime) > 1000) return;

        var dx = e.clientX - _pdX;
        var dy = e.clientY - _pdY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) return;

        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(e.target)) return;

        var savedEl = _pdEl;
        setTimeout(function() {
          if (_pdClickFired || _pdConsumed) return;
          _pdConsumed = true;
          _pdEl = null;
          _pdTarget = null;
          addPendingClick(savedEl);
        }, 100);
      }, true);

      document.addEventListener('click', function(e) {
        _pdClickFired = true;

        if (_pdConsumed) {
          _pdConsumed = false;
          _pdEl = null;
          _pdTarget = null;
          return;
        }

        var target = e.target;

        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(target)) return;

        var el = null;
        if (_pdEl && (Date.now() - _pdTime < 1000)) {
          el = _pdEl;
        }
        var checkTarget = target;
        if ((target === document.body || target === document.documentElement)
            && _pdTarget && (Date.now() - _pdTime < 1000)) {
          checkTarget = _pdTarget;
        }
        _pdEl = null;
        _pdTarget = null;

        var link = checkTarget;
        while (link && link !== document.body) {
          if (link.tagName === 'A') break;
          link = link.parentElement;
        }
        if (link && link.tagName === 'A') {
          var href = link.getAttribute('href') || '';
          if (href) {
            try {
              var linkUrl = new URL(href, location.href);
              if (linkUrl.pathname !== location.pathname || linkUrl.host !== location.host) return;
            } catch(e2) {}
          }
        }

        if (!el) {
          el = findClickableElement(checkTarget);
        }
        if (!el) return;

        addPendingClick(el);
      }, true);
    }

    // Recording widget UI state
    var widgetMinimized = false;
    var showConfirmDone = false;
    var PANEL_WIDTH = '380px';

    window.__veritioToggleMinimize = function() {
      widgetMinimized = !widgetMinimized;
      showConfirmDone = false;
      var host = document.getElementById('__veritio_rec_widget');
      if (host) {
        if (widgetMinimized) {
          host.style.width = '40px';
          document.documentElement.style.marginRight = '40px';
        } else {
          host.style.width = PANEL_WIDTH;
          document.documentElement.style.marginRight = PANEL_WIDTH;
        }
      }
      updateRecordingWidget();
    };

    window.__veritioShowDoneConfirm = function() {
      showConfirmDone = true;
      updateRecordingWidget();
    };

    window.__veritioCancelDone = function() {
      showConfirmDone = false;
      updateRecordingWidget();
    };

    window.__veritioDoneRecording = function() {
      try {
        document.documentElement.style.marginRight = '';
        window.opener.postMessage({ type: 'veritio-lwt-done' }, '*');
      } catch(e) {}
      setTimeout(function() { window.close(); }, 200);
    };

    window.__veritioRestartRecording = function() {
      // Build proxy URL for the starting page's real pathname
      var startProxyUrl = '';
      if (confirmedSteps.length > 0 && confirmedSteps[0].stepType === 'navigation') {
        // pathname is the real path (e.g., '/bot/settings'), need to wrap with proxy prefix
        var startPath = confirmedSteps[0].pathname || '/';
        startProxyUrl = location.origin + PROXY_PATH + startPath;
      }
      confirmedSteps = [];
      pendingClicks = [];
      pendingIdCounter = 0;
      activeGroupId = null;
      showConfirmDone = false;
      saveRecState();
      try {
        window.opener.postMessage({ type: 'veritio-lwt-restart' }, '*');
      } catch(e) {}
      if (startProxyUrl && startProxyUrl !== location.href) {
        location.href = startProxyUrl;
      } else {
        updateRecordingWidget();
      }
    };

    function createRecordingWidget() {
      var host = document.createElement('div');
      host.id = '__veritio_rec_widget';
      host.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:' + PANEL_WIDTH + ';z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
      document.body.appendChild(host);
      document.documentElement.style.marginRight = PANEL_WIDTH;
      window.__veritioRecShadow = host.attachShadow({ mode: 'open' });
      updateRecordingWidget();
    }

    function escapeHtml(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    // Performance fix: replace eval()-based onclick handlers with data-attribute delegated listeners
    function reattachButtons(shadow) {
      shadow.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el !== shadow) {
          var action = el.getAttribute ? el.getAttribute('data-rec-action') : null;
          if (action) {
            e.stopPropagation();
            var fn = _recActions[action];
            if (fn) fn(el);
            return;
          }
          el = el.parentElement || el.parentNode;
        }
      });
    }

    // Action map for recording widget — replaces eval(onclick)
    var _recActions = {
      'toggle-minimize': function() { window.__veritioToggleMinimize(); },
      'show-done-confirm': function() { window.__veritioShowDoneConfirm(); },
      'cancel-done': function() { window.__veritioCancelDone(); },
      'done-recording': function() { window.__veritioDoneRecording(); },
      'restart-recording': function() { window.__veritioRestartRecording(); },
    };

    // Dynamic actions need argument extraction from data-attributes
    function _addDynamicActions(shadow) {
      // Confirm click buttons
      var confirmBtns = shadow.querySelectorAll('[data-rec-confirm]');
      for (var i = 0; i < confirmBtns.length; i++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.__veritioConfirmClick(parseInt(btn.getAttribute('data-rec-confirm'), 10));
          });
        })(confirmBtns[i]);
      }
      // Ignore click buttons
      var ignoreBtns = shadow.querySelectorAll('[data-rec-ignore]');
      for (var j = 0; j < ignoreBtns.length; j++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.__veritioIgnoreClick(parseInt(btn.getAttribute('data-rec-ignore'), 10));
          });
        })(ignoreBtns[j]);
      }
      // Toggle any order
      var togBtns = shadow.querySelectorAll('[data-rec-toggle-order]');
      for (var k = 0; k < togBtns.length; k++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.__veritioToggleAnyOrder(parseInt(btn.getAttribute('data-rec-toggle-order'), 10));
          });
        })(togBtns[k]);
      }
      // Toggle checkbox
      var cbBtns = shadow.querySelectorAll('[data-rec-toggle-check]');
      for (var l = 0; l < cbBtns.length; l++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.__veritioToggleCheck(parseInt(btn.getAttribute('data-rec-toggle-check'), 10));
          });
        })(cbBtns[l]);
      }
      // Confirm group
      var confirmGroupBtns = shadow.querySelectorAll('[data-rec-action="confirm-group"]');
      for (var m = 0; m < confirmGroupBtns.length; m++) {
        confirmGroupBtns[m].addEventListener('click', function(e) {
          e.stopPropagation();
          window.__veritioConfirmGroup();
        });
      }
      // Cancel select
      var cancelSelectBtns = shadow.querySelectorAll('[data-rec-action="cancel-select"]');
      for (var n = 0; n < cancelSelectBtns.length; n++) {
        cancelSelectBtns[n].addEventListener('click', function(e) {
          e.stopPropagation();
          window.__veritioCancelSelect();
        });
      }
      // Ungroup all
      var ungroupBtns = shadow.querySelectorAll('[data-rec-ungroup]');
      for (var o = 0; o < ungroupBtns.length; o++) {
        (function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            window.__veritioUngroupAll(parseInt(btn.getAttribute('data-rec-ungroup'), 10));
          });
        })(ungroupBtns[o]);
      }
    }

    var _cachedRecStyles = null;
    function getRecWidgetStyles() {
      if (_cachedRecStyles) return _cachedRecStyles;
      _cachedRecStyles = '@keyframes __vt_pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }'
        + '@keyframes __vt_fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }'
        + '@keyframes __vt_slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }'
        + '*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }'
        + '.__vt_widget { position:relative;background:#fafafa;border-left:1px solid #e5e7eb;width:100%;height:100vh;display:flex;flex-direction:column;overflow:hidden;font-size:13px;line-height:1.5;color:#374151;-webkit-font-smoothing:antialiased; }'
        + '.__vt_strip { display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;background:#fff;border-left:1px solid #e5e7eb;width:100%;height:100vh;padding:14px 0;transition:background 150ms ease; }'
        + '.__vt_strip:hover { background:#f3f4f6; }'
        + '.__vt_strip_label { font-size:10px;font-weight:600;color:#6b7280;letter-spacing:0.02em;writing-mode:vertical-rl;text-orientation:mixed; }'
        + '.__vt_dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;animation:__vt_pulse 1.5s ease-in-out infinite;flex-shrink:0; }'
        + '.__vt_header { display:flex;align-items:center;gap:8px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb; }'
        + '.__vt_header_left { display:flex;align-items:center;gap:8px;flex:1;min-width:0; }'
        + '.__vt_header_title { font-size:14px;font-weight:600;color:#111827;letter-spacing:-0.01em; }'
        + '.__vt_badge { font-size:12px;color:#6b7280;background:#f3f4f6;border-radius:10px;padding:2px 10px;font-weight:500;flex-shrink:0; }'
        + '.__vt_btn_icon { border:none;background:transparent;color:#9ca3af;border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color 150ms ease,background 150ms ease;flex-shrink:0; }'
        + '.__vt_btn_icon:hover { color:#374151;background:#f3f4f6; }'
        + '.__vt_scroll_area { position:relative;flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#d1d5db transparent; }'
        + '.__vt_scroll_area::-webkit-scrollbar { width:4px; }'
        + '.__vt_scroll_area::-webkit-scrollbar-track { background:transparent; }'
        + '.__vt_scroll_area::-webkit-scrollbar-thumb { background:#d1d5db;border-radius:4px; }'
        + '.__vt_scroll_area::-webkit-scrollbar-thumb:hover { background:#9ca3af; }'
        + '.__vt_step_list { padding:12px 16px 16px; }'
        + '.__vt_fade { position:sticky;bottom:0;left:0;right:0;height:24px;background:linear-gradient(transparent,#fafafa);pointer-events:none; }'
        + '.__vt_empty { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;flex:1;text-align:center; }'
        + '.__vt_empty_icon { width:48px;height:48px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;margin-bottom:16px; }'
        + '.__vt_empty_title { font-size:14px;font-weight:600;color:#111827;margin:0 0 6px; }'
        + '.__vt_empty_desc { font-size:13px;color:#6b7280;margin:0;line-height:1.5;max-width:260px; }'
        + '.__vt_step_row { display:flex;align-items:center;gap:8px;padding:6px 0;min-height:32px; }'
        + '.__vt_step_num { font-size:11px;color:#9ca3af;min-width:18px;text-align:right;font-variant-numeric:tabular-nums;flex-shrink:0;font-weight:500; }'
        + '.__vt_step_path { font-size:12px;color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#f3f4f6;padding:2px 6px;border-radius:4px; }'
        + '.__vt_step_text { font-size:13px;color:#374151;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }'
        + '.__vt_tag_start { font-size:12px;font-weight:600;color:#111827;flex-shrink:0; }'
        + '.__vt_tag_nav { font-size:12px;font-weight:500;color:#6b7280;flex-shrink:0; }'
        + '.__vt_group_box { margin:4px 0 4px 18px;padding:6px 10px;border-left:2px solid #9ca3af;background:#f3f4f6;border-radius:0 6px 6px 0; }'
        + '.__vt_group_header { font-size:11px;font-weight:500;color:#6b7280;padding:0 0 4px;display:flex;align-items:center;gap:4px; }'
        + '.__vt_group_ungroup { margin-left:auto;font-size:10px;color:#9ca3af;cursor:pointer;padding:1px 4px;border-radius:3px; }'
        + '.__vt_group_ungroup:hover { color:#ef4444;background:#fef2f2; }'
        + '.__vt_tog_wrap { margin-left:auto;display:inline-flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;padding:6px 4px;position:relative;z-index:1; }'
        + '.__vt_tog_wrap:hover .__vt_tog_track { background:#b0b5bd; }'
        + '.__vt_tog_wrap:hover .__vt_tog_on { background:#000; }'
        + '.__vt_tog_off { cursor:default;opacity:0.45; }'
        + '.__vt_tog_off:hover { opacity:0.7; }'
        + '.__vt_tog_off:hover .__vt_tog_track { background:#d1d5db; }'
        + '.__vt_tog_label { font-size:11px;font-weight:500;color:#374151;white-space:nowrap; }'
        + '.__vt_tog_off .__vt_tog_label { color:#9ca3af; }'
        + '.__vt_tog_track { width:32px;height:18px;border-radius:9px;background:#d1d5db;position:relative;transition:background 200ms ease;flex-shrink:0; }'
        + '.__vt_tog_knob { position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:left 200ms ease; }'
        + '.__vt_tog_on { background:#111827; }'
        + '.__vt_tog_on .__vt_tog_knob { left:17px; }'
        + '.__vt_tog_tip { display:none;position:absolute;bottom:calc(100% + 6px);right:0;background:#1f2937;color:#fff;font-size:11px;font-weight:400;padding:5px 10px;border-radius:6px;white-space:nowrap;pointer-events:none;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.2); }'
        + '.__vt_tog_tip::after { content:"";position:absolute;top:100%;right:12px;border:5px solid transparent;border-top-color:#1f2937; }'
        + '.__vt_tog_wrap:hover .__vt_tog_tip { display:block; }'
        + '.__vt_sel_cb { width:16px;height:16px;min-width:16px;border-radius:4px;border:1.5px solid #d1d5db;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 100ms ease;flex-shrink:0; }'
        + '.__vt_sel_cb:hover { border-color:#9ca3af; }'
        + '.__vt_sel_on { background:#111827;border-color:#111827; }'
        + '.__vt_sel_on:hover { background:#000;border-color:#000; }'
        + '.__vt_sel_bar { display:flex;gap:6px;padding:8px 0 4px 18px; }'
        + '.__vt_sel_confirm { border:none;background:#111827;color:#fff;border-radius:6px;height:28px;padding:0 12px;font-size:12px;font-weight:500;cursor:pointer; }'
        + '.__vt_sel_confirm:hover { background:#000; }'
        + '.__vt_sel_confirm:disabled { background:#d1d5db;color:#9ca3af;cursor:default; }'
        + '.__vt_sel_cancel { border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:6px;height:28px;padding:0 12px;font-size:12px;font-weight:500;cursor:pointer; }'
        + '.__vt_sel_cancel:hover { background:#f9fafb;color:#374151; }'
        + '.__vt_step_bullet { font-size:16px;color:#9ca3af;min-width:18px;text-align:right;flex-shrink:0;line-height:1; }'
        + '.__vt_pending_row { display:flex;align-items:center;gap:10px;margin:6px 0 6px 26px;padding:10px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04); }'
        + '.__vt_pending_label { font-size:11px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px; }'
        + '.__vt_pending_text { font-size:13px;color:#111827;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }'
        + '.__vt_pending_actions { display:flex;gap:6px;align-items:center;flex-shrink:0; }'
        + '.__vt_btn_add { border:none;background:#111827;color:#fff;border-radius:6px;height:32px;padding:0 14px;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;transition:background 150ms ease;white-space:nowrap; }'
        + '.__vt_btn_add:hover { background:#1f2937; }'
        + '.__vt_btn_restart { border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:8px;height:40px;width:40px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 150ms ease; }'
        + '.__vt_btn_restart:hover { background:#f9fafb;color:#374151;border-color:#d1d5db; }'
        + '.__vt_btn_dismiss { border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:6px;height:32px;padding:0 12px;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;transition:all 150ms ease;white-space:nowrap; }'
        + '.__vt_btn_dismiss:hover { background:#f9fafb;color:#374151;border-color:#d1d5db; }'
        + '.__vt_footer { padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb;display:flex;align-items:center;justify-content:center; }'
        + '.__vt_footer_hint { font-size:12px;color:#9ca3af;font-weight:400; }'
        + '.__vt_btn_done { border:none;background:#111827;color:#fff;border-radius:8px;height:40px;padding:0 24px;font-size:14px;font-weight:500;cursor:pointer;width:100%;transition:background 150ms ease; }'
        + '.__vt_btn_done:hover { background:#1f2937; }'
        + '.__vt_confirm_overlay { position:absolute;inset:0;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);z-index:20;animation:__vt_fadeIn 150ms ease-out; }'
        + '.__vt_confirm_card { padding:24px;text-align:left;max-width:280px; }'
        + '.__vt_btn_primary { border:none;background:#111827;color:#fff;border-radius:8px;height:36px;padding:0 18px;font-size:13px;font-weight:500;cursor:pointer;transition:background 150ms ease; }'
        + '.__vt_btn_primary:hover { background:#1f2937; }'
        + '.__vt_btn_secondary { border:1px solid #e5e7eb;background:#fff;color:#374151;border-radius:8px;height:36px;padding:0 18px;font-size:13px;font-weight:500;cursor:pointer;transition:all 150ms ease; }'
        + '.__vt_btn_secondary:hover { background:#f9fafb; }';
      return _cachedRecStyles;
    }

    function renderPendingClickInline(pc) {
      var kindLabel = escapeHtml(pc.kind || 'Click');

      return '<div class="__vt_pending_row">'
        + '<div style="flex:1;min-width:0;">'
        + '<div class="__vt_pending_label">' + kindLabel + '</div>'
        + '<div class="__vt_pending_text">&ldquo;' + escapeHtml(pc.detail || pc.elementText || '') + '&rdquo;</div>'
        + '</div>'
        + '<div class="__vt_pending_actions">'
        + '<button class="__vt_btn_add" data-rec-confirm="' + pc._id + '">Add</button>'
        + '<button class="__vt_btn_dismiss" data-rec-ignore="' + pc._id + '">Skip</button>'
        + '</div>'
        + '</div>';
    }

    function updateRecordingWidget() {
      var shadow = window.__veritioRecShadow;
      if (!shadow) return;

      var totalConfirmed = confirmedSteps.length;
      var hasPending = pendingClicks.length > 0;

      // Minimized state: thin vertical strip with expand icon
      if (widgetMinimized) {
        shadow.innerHTML = '<div class="__vt_strip" data-rec-action="toggle-minimize">'
          + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>'
          + '<span class="__vt_dot"></span>'
          + '<span class="__vt_strip_label">' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + '</span>'
          + (hasPending ? '<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>' : '')
          + '</div>'
          + '<style>' + getRecWidgetStyles() + '</style>';
        _addDynamicActions(shadow);
        return;
      }

      // Build pending clicks map: pendingByPath[pathname] = [click, ...]
      var pendingByPath = {};
      var orphanPending = [];
      for (var pi = 0; pi < pendingClicks.length; pi++) {
        var ppath = pendingClicks[pi].pathname;
        var found = false;
        for (var ci = 0; ci < confirmedSteps.length; ci++) {
          if (confirmedSteps[ci].stepType === 'navigation' && confirmedSteps[ci].pathname === ppath) {
            found = true; break;
          }
        }
        if (found) {
          if (!pendingByPath[ppath]) pendingByPath[ppath] = [];
          pendingByPath[ppath].push(pendingClicks[pi]);
        } else {
          orphanPending.push(pendingClicks[pi]);
        }
      }

      // Pre-compute: count confirmed click sub-steps per nav step
      var clickCountByNav = {};
      var hasGroupByNav = {};
      for (var cn = 0; cn < confirmedSteps.length; cn++) {
        if (confirmedSteps[cn].stepType === 'navigation') {
          var cnt = 0;
          var anyG = false;
          for (var cm = cn + 1; cm < confirmedSteps.length; cm++) {
            if (confirmedSteps[cm].stepType === 'navigation') break;
            cnt++;
            if (confirmedSteps[cm].group) anyG = true;
          }
          clickCountByNav[cn] = cnt;
          hasGroupByNav[cn] = anyG;
        }
      }

      // Build step list with inline pending clicks
      var stepsHtml = '';
      var stepNum = 0;
      var currentGroupId = null;
      var lastNavIdx = -1;

      for (var i = 0; i < confirmedSteps.length; i++) {
        var step = confirmedSteps[i];
        stepNum++;
        var isFirst = i === 0 && step.stepType === 'navigation';
        var isNav = step.stepType === 'navigation';
        if (isNav) lastNavIdx = i;

        var isSelectChild = !isNav && selectModeNavIdx >= 0 && i > selectModeNavIdx;
        if (isSelectChild) {
          var stillUnderNav = true;
          for (var sc = selectModeNavIdx + 1; sc < i; sc++) {
            if (confirmedSteps[sc].stepType === 'navigation') { stillUnderNav = false; break; }
          }
          isSelectChild = stillUnderNav;
        }

        var enteringGroup = step.group && step.group !== currentGroupId && !isSelectChild;
        var leavingGroup = currentGroupId && (!step.group || isSelectChild);

        if (leavingGroup) {
          currentGroupId = null;
          stepsHtml += '</div>';
        }

        if (!isNav && !currentGroupId && pendingByPath[step.pathname]) {
          var remaining = [];
          for (var pp = 0; pp < pendingByPath[step.pathname].length; pp++) {
            if (pendingByPath[step.pathname][pp]._id < step._id) {
              stepsHtml += renderPendingClickInline(pendingByPath[step.pathname][pp]);
            } else {
              remaining.push(pendingByPath[step.pathname][pp]);
            }
          }
          pendingByPath[step.pathname] = remaining;
          if (remaining.length === 0) delete pendingByPath[step.pathname];
        }

        if (enteringGroup) {
          currentGroupId = step.group;
          stepsHtml += '<div class="__vt_group_box">';
          stepsHtml += '<div class="__vt_group_header">'
            + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>'
            + ' Any order'
            + '<span class="__vt_group_ungroup" data-rec-ungroup="' + lastNavIdx + '">Ungroup</span>'
            + '</div>';
        }

        stepsHtml += '<div class="__vt_step_row">';

        if (!isNav) {
          if (isSelectChild) {
            var isChecked = selectModeChecked[i] || false;
            stepsHtml += '<span class="__vt_sel_cb' + (isChecked ? ' __vt_sel_on' : '') + '"'
              + ' data-rec-toggle-check="' + i + '">'
              + (isChecked ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '')
              + '</span>';
          } else if (step.group) {
            stepsHtml += '<span class="__vt_step_bullet">&bull;</span>';
          } else {
            stepsHtml += '<span class="__vt_step_num">' + stepNum + '</span>';
          }
          stepsHtml += '<span class="__vt_step_text">Click &ldquo;' + escapeHtml(step.detail || step.elementText || '') + '&rdquo;</span>';
        } else {
          stepsHtml += '<span class="__vt_step_num">' + stepNum + '</span>';
          if (isFirst) {
            stepsHtml += '<span class="__vt_tag_start">Start:</span>';
          } else {
            stepsHtml += '<span class="__vt_tag_nav">Navigate:</span>';
          }
          var displayPath = step.pathname.split('?')[0].split('#')[0] || step.pathname;
          stepsHtml += '<code class="__vt_step_path" title="' + escapeHtml(step.pathname) + '">' + escapeHtml(displayPath) + '</code>';

          var subCount = clickCountByNav[i] || 0;
          var isActive = hasGroupByNav[i] || false;
          var isInSelect = selectModeNavIdx === i;
          var isDisabled = subCount < 2;
          var tipText = isDisabled ? 'Add 2+ click actions to enable'
            : isInSelect ? 'Click to cancel selection'
            : isActive ? 'Click to edit any-order grouping'
            : 'Select actions to mark as any order';
          stepsHtml += '<div class="__vt_tog_wrap' + (isDisabled ? ' __vt_tog_off' : '') + '"'
            + (isDisabled ? '' : ' data-rec-toggle-order="' + i + '"')
            + '>'
            + '<span class="__vt_tog_label">Any order</span>'
            + '<span class="__vt_tog_track' + (isActive || isInSelect ? ' __vt_tog_on' : '') + '">'
            + '<span class="__vt_tog_knob"></span>'
            + '</span>'
            + '<span class="__vt_tog_tip">' + tipText + '</span>'
            + '</div>';
        }
        stepsHtml += '</div>';

        if (isSelectChild) {
          var nextIsSubStep = false;
          if (i + 1 < confirmedSteps.length && confirmedSteps[i + 1].stepType !== 'navigation') {
            nextIsSubStep = true;
          }
          if (!nextIsSubStep) {
            var checkedCount = 0;
            for (var ck in selectModeChecked) { if (selectModeChecked[ck]) checkedCount++; }
            stepsHtml += '<div class="__vt_sel_bar">'
              + '<button class="__vt_sel_confirm"'
              + (checkedCount < 2 ? ' disabled' : '')
              + ' data-rec-action="confirm-group">'
              + 'Group' + (checkedCount >= 2 ? ' (' + checkedCount + ')' : '')
              + '</button>'
              + '<button class="__vt_sel_cancel" data-rec-action="cancel-select">Cancel</button>'
              + '</div>';
          }
        }

        var nextStep = i + 1 < confirmedSteps.length ? confirmedSteps[i + 1] : null;
        var isLastForPage = !nextStep || nextStep.stepType === 'navigation';
        if (isLastForPage) {
          if (currentGroupId) {
            stepsHtml += '</div>';
            currentGroupId = null;
          }
          if (pendingByPath[step.pathname]) {
            var pagePending = pendingByPath[step.pathname];
            for (var pk = 0; pk < pagePending.length; pk++) {
              stepsHtml += renderPendingClickInline(pagePending[pk]);
            }
            delete pendingByPath[step.pathname];
          }
        }
      }

      if (currentGroupId) {
        stepsHtml += '</div>';
      }

      if (orphanPending.length > 0) {
        for (var oi = 0; oi < orphanPending.length; oi++) {
          stepsHtml += renderPendingClickInline(orphanPending[oi]);
        }
      }

      var bodyHtml = '';
      if (totalConfirmed === 0 && !hasPending) {
        bodyHtml = '<div class="__vt_empty">'
          + '<div class="__vt_empty_icon">'
          + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>'
          + '</div>'
          + '<p class="__vt_empty_title">Start navigating</p>'
          + '<p class="__vt_empty_desc">Pages are added automatically as you browse. Detected clicks will appear here for you to add.</p>'
          + '</div>';
      } else {
        bodyHtml = '<div class="__vt_scroll_area">'
          + '<div class="__vt_step_list">' + stepsHtml + '</div>'
          + '<div class="__vt_fade"></div>'
          + '</div>';
      }

      var confirmHtml = '';
      if (showConfirmDone) {
        confirmHtml = '<div class="__vt_confirm_overlay">'
          + '<div class="__vt_confirm_card">'
          + '<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111;">Done recording?</p>'
          + '<p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.5;">This will save ' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + ' and close this tab.</p>'
          + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
          + '<button class="__vt_btn_secondary" data-rec-action="cancel-done">Cancel</button>'
          + '<button class="__vt_btn_primary" data-rec-action="done-recording">Save &amp; close</button>'
          + '</div>'
          + '</div>'
          + '</div>';
      }

      shadow.innerHTML = '<div class="__vt_widget">'
        + '<div class="__vt_header">'
        + '<div class="__vt_header_left">'
        + '<span class="__vt_dot"></span>'
        + '<span class="__vt_header_title">Recording path</span>'
        + '</div>'
        + '<span class="__vt_badge">' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + '</span>'
        + '<button class="__vt_btn_icon" data-rec-action="toggle-minimize" title="Collapse panel">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>'
        + '</button>'
        + '</div>'
        + bodyHtml
        + '<div class="__vt_footer">'
        + (totalConfirmed >= 2
          ? '<div style="display:flex;gap:8px;width:100%;">'
            + '<button class="__vt_btn_restart" data-rec-action="restart-recording" title="Start over">'
            + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
            + '</button>'
            + '<button class="__vt_btn_done" data-rec-action="show-done-confirm">Done recording</button>'
            + '</div>'
          : '<div class="__vt_footer_hint">Record at least 2 steps to save</div>')
        + '</div>'
        + confirmHtml
        + '</div>'
        + '<style>' + getRecWidgetStyles() + '</style>';

      _addDynamicActions(shadow);

      var scrollArea = shadow.querySelector('.__vt_scroll_area');
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    }

    // Stack history.pushState wrapper on top of proxy's already-patched version
    // to call addNavStep() on SPA navigations during recording
    var origPushState = history.pushState;
    history.pushState = function() {
      var r = origPushState.apply(this, arguments);
      addNavStep();
      return r;
    };
    var origReplaceState = history.replaceState;
    history.replaceState = function() {
      var r = origReplaceState.apply(this, arguments);
      addNavStep();
      return r;
    };
    window.addEventListener('popstate', addNavStep);

    // Restore persisted state then add current page
    loadRecState();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        createRecordingWidget();
        // Set up delegated event listener once on shadow root
        reattachButtons(window.__veritioRecShadow);
        addNavStep();
        setupRecordingClickTracking();
        setupInputTracking();
      });
    } else {
      createRecordingWidget();
      reattachButtons(window.__veritioRecShadow);
      addNavStep();
      setupRecordingClickTracking();
      setupInputTracking();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`
}

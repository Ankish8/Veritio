/**
 * Shared event pipeline code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function/variable declarations for queueEvent, setupEventListeners,
 * flushEvents, startFlushing, startRrwebRecording, flushRrwebEvents, startRrwebFlushing,
 * onNavigation, checkUrlMatch, findClickableElement, and gaze tracking.
 *
 * These rely on closure variables: eventQueue, sessionId, tasks, currentTaskIndex,
 * widgetHost, widgetState, pageClickCount, taskMinimized, minimizedClickTimes,
 * SHAKE_CLICK_THRESHOLD, SHAKE_CLICK_WINDOW, clickTimes, RAGE_CLICK_THRESHOLD,
 * RAGE_CLICK_WINDOW, SCROLL_THROTTLE, lastScrollTime, taskStartTime, interactionHistory,
 * capturedSnapshotUrls, taskNavCount, FLUSH_INTERVAL, SESSION_KEY, SNIPPET_ID,
 * completeCurrentTask, checkUrlPath, captureSnapshot, captureModalSnapshot,
 * shakePill, resetIdleShakeTimer, saveFullSession, isInsidePortal, getSelector/getCSSSelector.
 *
 * @param opts.apiBaseExpr - JS expression for constructing API URLs.
 *   Proxy mode: `apiUrl(path)` — uses the helper function
 *   Direct mode: `API_BASE + path` — simple concatenation
 * @param opts.pageUrlExpr - JS expression for the current "real" page URL (stripped of proxy prefix).
 *   Proxy mode: `getRealUrl().split('#')[0]`
 *   Direct mode: `location.href.split('#')[0]`
 * @param opts.pathnameExpr - JS expression for the current "real" pathname + search + hash.
 *   Proxy mode: `getRealPathname() + location.search + location.hash`
 *   Direct mode: `location.pathname + location.search + location.hash`
 * @param opts.selectorFnName - Name of the CSS selector function to use in events.
 *   Both files define getSelector and getCSSSelector as aliases.
 * @param opts.clickUrlExpr - JS expression for page_url in click events (modal URLs).
 *   Proxy mode: `getRealUrl().split('#')[0] + '#modal'`
 *   Direct mode: `window.location.href.split('#')[0] + '#modal'`
 * @param opts.urlMatchPathExpr - JS expression for current pathname in URL match.
 *   Proxy mode: `getRealPathname()`
 *   Direct mode: `location.pathname`
 * @param opts.urlMatchUrlExpr - JS expression for full URL in URL match.
 *   Proxy mode: `TARGET_ORIGIN + realPath + location.search + location.hash`
 *   Direct mode: `location.href`
 * @param opts.includeGazeTracking - Whether to include WebGazer gaze tracking (proxy only)
 * @param opts.includeSpaNavSetup - Whether setupEventListeners includes SPA nav overrides (direct only)
 * @param opts.useAdvancedClickTracking - Proxy mode uses findClickableElement for path tracking;
 *   direct mode uses simpler INTERACTIVE-only loop.
 */

export interface EventPipelineOpts {
  apiBaseExpr: string
  pageUrlExpr: string
  pathnameExpr: string
  selectorFnName: string
  clickUrlExpr: string
  urlMatchPathExpr: string
  urlMatchUrlExpr: string
  urlMatchTargetOriginExpr?: string
  includeGazeTracking?: boolean
  includeSpaNavSetup?: boolean
  useAdvancedClickTracking?: boolean
}

export function getEventPipelineCode(opts: EventPipelineOpts): string {
  // Click tracking for url_path matching differs between proxy and direct
  const clickPathTrackingBlock = opts.useAdvancedClickTracking
    ? `
      var pathEl = findClickableElement(e.target);
      if (pathEl) {
        var pathAriaLabel = pathEl.getAttribute ? (pathEl.getAttribute('aria-label') || '') : '';
        var pathTextRaw = (pathEl.textContent || '').trim().replace(/\\\\s+/g, ' ');
        var pathText = (pathAriaLabel || pathTextRaw).substring(0, 50);
        interactionHistory.push({
          type: 'click',
          pathname: ${opts.pathnameExpr},
          selector: getCSSSelector(pathEl),
          elementText: pathText,
        });
        if (interactionHistory.length > 200) interactionHistory = interactionHistory.slice(-200);
        checkUrlPath();
      }`
    : `
      el = e.target;
      for (var d = 0; d < 5 && el && el !== document.body; d++) {
        if (el.matches && el.matches(INTERACTIVE)) break;
        el = el.parentElement;
      }
      if (el && el !== document.body && el.matches && el.matches(INTERACTIVE)) {
        interactionHistory.push({
          type: 'click',
          pathname: ${opts.pathnameExpr},
          selector: getSelector(el),
          elementText: (el.textContent || '').trim().substring(0, 40),
        });
        if (interactionHistory.length > 200) interactionHistory = interactionHistory.slice(-200);
        checkUrlPath();
      }`

  const spaNavBlock = opts.includeSpaNavSetup
    ? `
    // SPA navigation detection
    var origPushState = history.pushState;
    var origReplaceState = history.replaceState;
    history.pushState = function() {
      origPushState.apply(this, arguments);
      onNavigation();
    };
    history.replaceState = function() {
      origReplaceState.apply(this, arguments);
      onNavigation();
    };
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);`
    : ''

  // findClickableElement is needed in both modes
  const findClickableElementCode = `
  function findClickableElement(target) {
    if (!target || target === document.body || target === document.documentElement) return null;
    var el = target;
    for (var d = 0; d < 8 && el && el !== document.body; d++) {
      if (el.matches && el.matches(INTERACTIVE)) return el;
      el = el.parentElement;
    }
    el = target;
    for (var d2 = 0; d2 < 8 && el && el !== document.body; d2++) {
      try { if (getComputedStyle(el).cursor === 'pointer') return el; } catch(e2) {}
      el = el.parentElement;
    }
    var lastResortText = (target.textContent || '').trim();
    if (lastResortText.length > 0 && lastResortText.length < 200) return target;
    return null;
  }
`

  // URL match uses different expressions for proxy vs direct
  const urlMatchBlock = opts.urlMatchTargetOriginExpr
    ? `
    var realPath = ${opts.urlMatchPathExpr};
    var realUrl = ${opts.urlMatchUrlExpr};
    var target = task.success_url;

    var targetPath = target;
    try {
      var u = new URL(target);
      targetPath = u.pathname;
    } catch(e) {
      targetPath = target;
    }

    var urlMethod = taskNavCount <= 1 ? 'auto_url_direct' : 'auto_url_indirect';

    if (realUrl === target || realUrl.indexOf(target) !== -1) {
      completeCurrentTask(true, urlMethod);
    } else if (realPath === targetPath) {
      completeCurrentTask(true, urlMethod);
    } else if (target.charAt(target.length - 1) === '*') {
      var prefix = target.slice(0, -1);
      var prefixPath = prefix;
      try { prefixPath = new URL(prefix).pathname; } catch(e) { prefixPath = prefix; }
      if (realPath.indexOf(prefixPath) === 0) {
        completeCurrentTask(true, urlMethod);
      }
    }`
    : `
    var currentUrl = location.href;
    var currentPath = location.pathname;
    var target = task.success_url;

    var targetPath = target;
    try {
      var u = new URL(target);
      targetPath = u.pathname;
    } catch(e) {
      targetPath = target;
    }

    var urlMethod = taskNavCount <= 1 ? 'auto_url_direct' : 'auto_url_indirect';

    if (currentUrl === target || currentUrl.indexOf(target) !== -1) {
      completeCurrentTask(true, urlMethod);
    } else if (currentPath === targetPath) {
      completeCurrentTask(true, urlMethod);
    } else if (target.charAt(target.length - 1) === '*') {
      var prefix = target.slice(0, -1);
      var prefixPath = prefix;
      try { prefixPath = new URL(prefix).pathname; } catch(e) { prefixPath = prefix; }
      if (currentPath.indexOf(prefixPath) === 0) {
        completeCurrentTask(true, urlMethod);
      }
    }`

  const gazeTrackingBlock = opts.includeGazeTracking
    ? `
  var gazeBuffer = [];
  var GAZE_FLUSH_INTERVAL = 2000;
  var gazeFlushTimer = null;
  var webgazerReady = false;

  function flushGazeData() {
    if (gazeBuffer.length === 0) return;
    var batch = gazeBuffer.splice(0, gazeBuffer.length);
    var payload = {
      session_id: sessionId,
      task_id: (tasks[currentTaskIndex] && tasks[currentTaskIndex].id) || null,
      page_url: ${opts.pageUrlExpr},
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      gaze_points: batch,
    };
    fetch(${opts.apiBaseExpr.replace("path", "'/api/snippet/' + SNIPPET_ID + '/gaze'")}, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(function() {});
  }

  function startGazeTracking() {
    var script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    script.onload = function() {
      if (!window.webgazer) return;
      try {
        window.webgazer
          .setRegression('ridge')
          .setGazeListener(function(data) {
            if (!data) return;
            gazeBuffer.push({
              x: Math.round(data.x),
              y: Math.round(data.y),
              t: Date.now(),
            });
          })
          .begin()
          .then(function() {
            webgazerReady = true;
            window.webgazer.showVideoPreview(false).showPredictionPoints(false);
          })
          .catch(function() {});
      } catch(e) {}
    };
    document.head.appendChild(script);

    gazeFlushTimer = setInterval(flushGazeData, GAZE_FLUSH_INTERVAL);

    window.addEventListener('beforeunload', function() {
      if (gazeBuffer.length > 0) {
        var payload = JSON.stringify({
          session_id: sessionId,
          task_id: (tasks[currentTaskIndex] && tasks[currentTaskIndex].id) || null,
          page_url: ${opts.pageUrlExpr},
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          gaze_points: gazeBuffer,
        });
        navigator.sendBeacon(
          ${opts.apiBaseExpr.replace("path", "'/api/snippet/' + SNIPPET_ID + '/gaze'")},
          new Blob([payload], { type: 'text/plain' })
        );
      }
    });
  }
`
    : ''

  // Build the event API URL expression
  const eventsApiExpr = opts.apiBaseExpr.replace('path', "'/api/snippet/' + SNIPPET_ID + '/events'")
  const rrwebApiExpr = opts.apiBaseExpr.replace('path', "'/api/snippet/' + SNIPPET_ID + '/rrweb'")

  return `
${findClickableElementCode}

  function queueEvent(type, data) {
    eventQueue.push({
      session_id: sessionId,
      task_id: tasks[currentTaskIndex] ? tasks[currentTaskIndex].id : null,
      event_type: type,
      element_selector: data.selector || null,
      coordinates: data.coordinates || null,
      viewport_size: { width: window.innerWidth, height: window.innerHeight },
      page_url: data.pageUrl || ${opts.pageUrlExpr},
      timestamp: new Date().toISOString(),
      metadata: data.metadata || null,
    });
  }

  function setupEventListeners() {
    document.addEventListener('click', function(e) {
      if (widgetHost && widgetHost.contains(e.target)) return;

      if (widgetState === 'active') {
        pageClickCount++;
        resetIdleShakeTimer();
        if (taskMinimized) {
          var now2 = Date.now();
          minimizedClickTimes[minimizedClickTimes.length] = now2;
          var cutoff = now2 - SHAKE_CLICK_WINDOW;
          var kept = 0;
          for (var mc = 0; mc < minimizedClickTimes.length; mc++) {
            if (minimizedClickTimes[mc] >= cutoff) {
              minimizedClickTimes[kept++] = minimizedClickTimes[mc];
            }
          }
          minimizedClickTimes.length = kept;
          if (minimizedClickTimes.length >= SHAKE_CLICK_THRESHOLD) {
            shakePill();
            minimizedClickTimes.length = 0;
          }
        }
      }

      var now = Date.now();
      clickTimes.push(now);
      var cutoff2 = now - RAGE_CLICK_WINDOW;
      var kept2 = 0;
      for (var rc = 0; rc < clickTimes.length; rc++) {
        if (clickTimes[rc] >= cutoff2) {
          clickTimes[kept2++] = clickTimes[rc];
        }
      }
      clickTimes.length = kept2;

      var wasInteractive = false;
      var iel = e.target;
      for (var d2 = 0; d2 < 5 && iel && iel !== document.body; d2++) {
        if (iel.matches && iel.matches(INTERACTIVE)) { wasInteractive = true; break; }
        iel = iel.parentElement;
      }

      var timeSinceMs = taskStartTime > 0 ? now - taskStartTime : null;

      var isModal = isInsidePortal(e.target);
      if (!isModal) {
        var mel = e.target;
        for (var dm = 0; dm < 20 && mel && mel !== document.body && mel !== document.documentElement; dm++) {
          if (mel.tagName === 'DIALOG') { isModal = true; break; }
          if (mel.getAttribute) {
            var role = mel.getAttribute('role');
            if (role === 'dialog' || role === 'alertdialog') { isModal = true; break; }
            if (mel.getAttribute('aria-modal') === 'true') { isModal = true; break; }
          }
          try {
            var mstyle = window.getComputedStyle(mel);
            if (mstyle && mstyle.position === 'fixed') {
              var isSmallTopBar = mel.offsetHeight < window.innerHeight * 0.3 && mel.getBoundingClientRect().top < 10;
              if (!isSmallTopBar) { isModal = true; break; }
            }
          } catch(e2) {}
          mel = mel.parentElement;
        }
      }

      var isBackdropClick = false;
      if (isModal && mel) {
        if (e.target === mel) {
          isBackdropClick = true;
        } else if (e.target.parentElement === mel) {
          try {
            var childRect = e.target.getBoundingClientRect();
            if (childRect.width >= window.innerWidth * 0.9 && childRect.height >= window.innerHeight * 0.9) {
              isBackdropClick = true;
            }
          } catch(e3) {}
        }
      }

      var meaningfulEl = (wasInteractive && iel) ? iel : e.target;
      var elText = (meaningfulEl.textContent || '').trim().substring(0, 50);
      var elTag = meaningfulEl.tagName ? meaningfulEl.tagName.toLowerCase() : '';
      var elAria = meaningfulEl.getAttribute ? (meaningfulEl.getAttribute('aria-label') || '') : '';

      var clickMeta = { wasInteractive: wasInteractive, pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight, timeSinceTaskStartMs: timeSinceMs };
      if (elText) clickMeta.elementText = elText;
      if (elTag) clickMeta.elementTag = elTag;
      if (elAria) clickMeta.elementAriaLabel = elAria;
      if (isModal) clickMeta.isModal = true;
      if (isBackdropClick) clickMeta.isBackdropClick = true;

      var isRageClick = clickTimes.length >= RAGE_CLICK_THRESHOLD;
      var clickX = isModal ? e.clientX : e.pageX;
      var clickY = isModal ? e.clientY : e.pageY;
      queueEvent(isRageClick ? 'rage_click' : 'click', {
        selector: ${opts.selectorFnName}(e.target),
        coordinates: { x: clickX, y: clickY },
        metadata: clickMeta,
        pageUrl: isModal ? ${opts.clickUrlExpr} : undefined,
      });

      if (isModal) {
        var modalSnapUrl = ${opts.clickUrlExpr};
        if (!capturedSnapshotUrls[modalSnapUrl]) {
          capturedSnapshotUrls[modalSnapUrl] = true;
          requestAnimationFrame(function() {
            captureModalSnapshot(modalSnapUrl);
          });
        }
      }
${clickPathTrackingBlock}
    }, true);

    document.addEventListener('scroll', function() {
      var now = Date.now();
      if (now - lastScrollTime < SCROLL_THROTTLE) return;
      lastScrollTime = now;
      var scrollPct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      queueEvent('scroll', {
        metadata: { scrollPercentage: scrollPct },
      });
    }, true);

    window.addEventListener('error', function(e) {
      queueEvent('error', {
        metadata: { message: e.message, filename: e.filename, lineno: e.lineno },
      });
    });

    window.addEventListener('unhandledrejection', function(e) {
      queueEvent('error', {
        metadata: { message: String(e.reason) },
      });
    });
${spaNavBlock}
  }

  function onNavigation() {
    var pathname = ${opts.pathnameExpr};
    var lastNav = interactionHistory.length > 0 ? interactionHistory[interactionHistory.length - 1] : null;
    if (lastNav && lastNav.type === 'navigation' && lastNav.pathname === pathname) return;
    interactionHistory.push({
      type: 'navigation',
      pathname: pathname,
      selector: null,
      elementText: null,
    });
    if (interactionHistory.length > 200) interactionHistory = interactionHistory.slice(-200);
    if (widgetState === 'active') taskNavCount++;

    saveFullSession();
    queueEvent('page_view', {});
    captureSnapshot();
    checkUrlMatch();
    checkUrlPath();
  }

  function checkUrlMatch() {
    if (!tasks[currentTaskIndex]) return;
    if (widgetState !== 'active') return;
    var task = tasks[currentTaskIndex];
    if (task.success_criteria_type !== 'url_match' || !task.success_url) return;
${urlMatchBlock}
  }

  function flushEvents() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0, eventQueue.length);
    fetch(${eventsApiExpr}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(function() {});
  }

  function startFlushing() {
    setInterval(flushEvents, FLUSH_INTERVAL);
    window.addEventListener('beforeunload', function() {
      if (eventQueue.length > 0) {
        var blob = new Blob([JSON.stringify({ events: eventQueue })], { type: 'text/plain' });
        navigator.sendBeacon(${eventsApiExpr}, blob);
      }
    });
  }

  var rrwebEventBuffer = [];
  var rrwebChunkIndex = 0;
  try { var _ci = sessionStorage.getItem(SESSION_KEY + '_rrweb_ci'); if (_ci) rrwebChunkIndex = parseInt(_ci, 10) || 0; } catch(e) {}
  var RRWEB_FLUSH_INTERVAL = 10000;
  var RRWEB_MAX_BUFFER = 500;
  var rrwebStopFn = null;

  function startRrwebRecording() {
    if (!window.__rrwebRecord || rrwebStopFn) return;
    try {
      rrwebStopFn = window.__rrwebRecord.record({
        emit: function(event) {
          rrwebEventBuffer.push(event);
          if (rrwebEventBuffer.length >= RRWEB_MAX_BUFFER) flushRrwebEvents();
        },
        maskAllInputs: true,
        blockSelector: '#veritio-lwt-widget-host, #__veritio_lwt_widget, #__veritio_lwt_overlay, #__veritio_lwt_thinkaloud',
        sampling: { mousemove: 50, scroll: 150, input: 'last' },
        inlineStylesheet: true,
        collectFonts: true,
      });
    } catch(e) {}
  }

  function flushRrwebEvents() {
    if (rrwebEventBuffer.length === 0) return;
    var batch = rrwebEventBuffer.splice(0);
    var idx = rrwebChunkIndex++;
    try { sessionStorage.setItem(SESSION_KEY + '_rrweb_ci', String(rrwebChunkIndex)); } catch(e) {}
    var payload = {
      session_id: sessionId,
      chunk_index: idx,
      events: batch,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
    payload.user_agent = navigator.userAgent;
    fetch(${rrwebApiExpr}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function() {});
  }

  function startRrwebFlushing() {
    setInterval(flushRrwebEvents, RRWEB_FLUSH_INTERVAL);
    window.addEventListener('beforeunload', function() {
      if (rrwebEventBuffer.length > 0) {
        var idx = rrwebChunkIndex++;
        try { sessionStorage.setItem(SESSION_KEY + '_rrweb_ci', String(rrwebChunkIndex)); } catch(e) {}
        var payload = JSON.stringify({
          session_id: sessionId,
          chunk_index: idx,
          events: rrwebEventBuffer,
        });
        navigator.sendBeacon(
          ${rrwebApiExpr},
          new Blob([payload], { type: 'text/plain' })
        );
      }
    });
  }
${gazeTrackingBlock}
`
}

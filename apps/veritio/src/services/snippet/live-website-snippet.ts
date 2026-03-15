import { RRWEB_RECORD_JS } from './rrweb-record-embed'
import { RRWEB_SNAPSHOT_JS } from './rrweb-snapshot-embed'
import { getPtqCss, getPtqRenderFunctions, getPtqLogic } from './shared-ptq-widget'

export function generateSnippetJs(snippetId: string, studyId: string, apiBase: string): string {
  // apiBase is the platform origin (e.g., https://app.veritio.com)
  // Required because the snippet runs on the researcher's website (different origin)
  return `${RRWEB_RECORD_JS}
${RRWEB_SNAPSHOT_JS}
(function() {
  'use strict';

  var SNIPPET_ID = '${snippetId}';
  var STUDY_ID = '${studyId}';
  // Detect API base from the script tag's own URL (more reliable than server-side header detection)
  var _scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var API_BASE = _scriptSrc ? _scriptSrc.replace(/\\/api\\/snippet\\/.*$/, '') : '${apiBase}';
  var SESSION_KEY = '__veritio_lwt_' + SNIPPET_ID;
  var FLUSH_INTERVAL = 2000;
  var SCROLL_THROTTLE = 500;
  var RAGE_CLICK_THRESHOLD = 3;
  var RAGE_CLICK_WINDOW = 500;

  // ============================================================================
  // Shared: Interactive element detection + CSS selector generation
  // ============================================================================

  var INTERACTIVE = 'a,button,input,select,textarea,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="link"],[role="option"],[role="menuitem"],[role="combobox"],[role="treeitem"],label';

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var tag = el.tagName.toLowerCase();
    var cls = '';
    if (el.className && typeof el.className === 'string') {
      // Filter out classes that are invalid in CSS selectors (e.g. Tailwind's
      // py-2.5, px-[14px], w-1/2) — these contain dots, brackets, or slashes
      // that break querySelectorAll.
      var rawClasses = el.className.trim().split(/\\s+/).slice(0, 2);
      var safeClasses = [];
      for (var ci = 0; ci < rawClasses.length; ci++) {
        if (/^[a-zA-Z_-][\\w-]*$/.test(rawClasses[ci])) {
          safeClasses.push(rawClasses[ci]);
        }
      }
      if (safeClasses.length > 0) cls = '.' + safeClasses.join('.');
    }
    var parent = el.parentElement;
    if (parent && cls) {
      try {
        var siblings = parent.querySelectorAll(':scope > ' + tag + cls);
        if (siblings.length > 1) {
          for (var si = 0; si < siblings.length; si++) {
            if (siblings[si] === el) { cls += ':nth-child(' + (si + 1) + ')'; break; }
          }
        }
      } catch (e) {
        // Invalid selector — skip disambiguation
      }
    }
    return tag + cls;
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

  if (isRecordingMode) {
    // Recording mode: Option A — track everything, researcher picks clicks
    // Navigation steps are auto-added. Clicks appear as pending — researcher clicks "+" to add.
    // State persisted to sessionStorage so it survives full-page navigations.
    var REC_CONFIRMED_KEY = '__veritio_rec_confirmed';
    var REC_PENDING_KEY = '__veritio_rec_pending';
    var confirmedSteps = [];
    var pendingClicks = [];
    var pendingIdCounter = 0;
    var activeGroupId = null; // When non-null, newly confirmed clicks auto-join this group
    var selectModeNavIdx = -1; // Which nav step's sub-steps are in checkbox selection mode
    var selectModeChecked = {}; // { stepIndex: true/false } — which sub-steps are checked

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
      // Get text content excluding script/style tags
      var text = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        var node = el.childNodes[i];
        if (node.nodeType === 3) { // Text node
          text += node.textContent;
        } else if (node.nodeType === 1) { // Element node
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

      // Skip script/style elements entirely
      if (tag === 'script' || tag === 'style' || tag === 'noscript') return null;

      // Determine the human-readable element kind
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

    // Auto-add navigation steps
    function addNavStep() {
      var pathname = location.pathname + location.search + location.hash;
      if (confirmedSteps.length > 0) {
        var last = confirmedSteps[confirmedSteps.length - 1];
        if (last.stepType === 'navigation' && last.pathname === pathname) return;
      }
      // Navigation always ends the current any-order group
      activeGroupId = null;
      var step = {
        stepType: 'navigation',
        pathname: pathname,
        fullUrl: location.href,
        title: document.title || pathname,
        label: document.title || pathname,
      };
      confirmedSteps.push(step);
      saveRecState();
      sendToOpener(step);
      updateRecordingWidget();
    }

    // Add detected click to pending list (not sent to opener yet)
    function addPendingClick(el) {
      var desc = getElementDescription(el);
      if (!desc) return; // Skip script/style elements
      var selector = getSelector(el);
      var pathname = location.pathname + location.search + location.hash;

      // Deduplicate: skip if same selector clicked recently (within 2s) on same page.
      // Text-based dedup removed — toggling the same element (on/off) should be captured.
      var now = Date.now();
      for (var i = 0; i < pendingClicks.length; i++) {
        if (pendingClicks[i].pathname !== pathname) continue;
        if (pendingClicks[i].selector === selector && (now - (pendingClicks[i]._ts || 0)) < 2000) return;
      }

      // Auto-collapse: dropdown trigger + option selection → single "Select X from Y" entry
      var role = '';
      try { role = (el.getAttribute('role') || '').toLowerCase(); } catch(e3) {}
      if (role === 'option' || role === 'menuitem' || role === 'treeitem') {
        // Look for a recent dropdown trigger in pending clicks (within 3s)
        for (var ci = pendingClicks.length - 1; ci >= 0; ci--) {
          var prev = pendingClicks[ci];
          if (prev.pathname !== pathname) break;
          if (prev._ts && (now - prev._ts) > 3000) break;
          if (prev._role === 'combobox' || prev._role === 'listbox' || prev._hasPopup) {
            // Merge: replace the trigger entry with a combined description
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
            prev._ts = now; // Update timestamp
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
        // Find the label for the trigger (associated label or parent fieldset legend)
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
        fullUrl: location.href,
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

    // Track input changes — detect when user types into form fields
    function setupInputTracking() {
      var trackedInputs = {};
      document.addEventListener('change', function(e) {
        var el = e.target;
        if (!el || !el.tagName) return;
        var tag = el.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;

        // Skip hidden/password inputs
        var type = el.getAttribute('type') || '';
        if (type === 'hidden' || type === 'password') return;

        // Skip if inside recording widget
        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(el)) return;

        var selector = getSelector(el);
        var pathname = location.pathname + location.search + location.hash;
        var inputKey = pathname + '::' + selector;

        // Only track each input once per page
        if (trackedInputs[inputKey]) return;
        trackedInputs[inputKey] = true;

        // Determine label for the input
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
        if (tag === 'select') {
          var opt = el.options[el.selectedIndex];
          value = opt ? (opt.text || opt.value) : '';
          var kind = 'Dropdown';
        } else if (type === 'checkbox') {
          value = el.checked ? 'checked' : 'unchecked';
          var kind = 'Checkbox';
        } else if (type === 'radio') {
          value = el.value || 'selected';
          var kind = 'Radio';
        } else {
          value = (el.value || '').trim().substring(0, 50);
          var kind = 'Typed';
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
            // Replace the click entry with the typed/changed value
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
          fullUrl: location.href,
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

    // Find the correct insertion point for a click: after its page's nav step
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

    // Researcher confirms a pending click → insert after its page's nav step
    // If an any-order group is active, the click auto-joins it.
    window.__veritioConfirmClick = function(pid) {
      for (var i = 0; i < pendingClicks.length; i++) {
        if (pendingClicks[i]._id === pid) {
          var click = pendingClicks.splice(i, 1)[0];
          var insertIndex = findClickInsertIndex(click);

          // If there's an active any-order group, auto-join it
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

    // Toggle a checkbox in selection mode
    window.__veritioToggleCheck = function(stepIdx) {
      selectModeChecked[stepIdx] = !selectModeChecked[stepIdx];
      updateRecordingWidget();
    };

    // Cancel selection mode
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

    // Researcher dismisses a pending click
    window.__veritioIgnoreClick = function(pid) {
      pendingClicks = pendingClicks.filter(function(c) { return c._id !== pid; });
      saveRecState();
      updateRecordingWidget();
    };

    // Find the best element to describe a click — walk up to find an interactive
    // or cursor:pointer element, falling back to the clicked target itself
    function findClickableElement(target) {
      // Reject body/html — these are too generic to be meaningful clicks
      if (!target || target === document.body || target === document.documentElement) return null;
      // First try: walk up to find an INTERACTIVE match
      var el = target;
      for (var d = 0; d < 8 && el && el !== document.body; d++) {
        if (el.matches && el.matches(INTERACTIVE)) return el;
        el = el.parentElement;
      }
      // Fallback: walk up to find cursor:pointer element
      el = target;
      for (var d2 = 0; d2 < 8 && el && el !== document.body; d2++) {
        try {
          if (getComputedStyle(el).cursor === 'pointer') return el;
        } catch(e2) {}
        el = el.parentElement;
      }
      // Last resort: use target if it has short meaningful text (not huge containers)
      var lastResortText = (target.textContent || '').trim();
      if (lastResortText.length > 0 && lastResortText.length < 200) return target;
      return null;
    }

    // Resolve the clickable element at pointerdown time (while still in DOM),
    // then use it when the click event fires. This handles React portals/dropdowns
    // that remove elements from DOM between mousedown and mouseup.
    var _pdEl = null;       // Clickable element resolved at pointerdown (in-DOM)
    var _pdTarget = null;   // Raw pointerdown target (for link checks)
    var _pdTime = 0;
    var _pdX = 0;           // Pointerdown coordinates (for drag vs click detection)
    var _pdY = 0;
    var _pdConsumed = false; // Whether the cached element was already consumed
    var _pdClickFired = false; // Whether the click event fired after pointerdown

    // Click tracking — detect ALL meaningful clicks (except navigating links)
    function setupClickTracking() {
      // Resolve clickable element at pointerdown time (element guaranteed in DOM)
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

      // Pointerup fallback: React may remove dropdown options from DOM between
      // pointerdown and click. The click event may never fire at all, OR it may
      // fire on document.body. Use a short timeout to detect if click fires —
      // if it doesn't within 100ms, consume the cached pointerdown element.
      document.addEventListener('pointerup', function(e) {
        if (!_pdEl || _pdConsumed) return;
        if ((Date.now() - _pdTime) > 1000) return;

        // Verify it was a click (not a drag): distance < 10px
        var dx = e.clientX - _pdX;
        var dy = e.clientY - _pdY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) return;

        // Skip if inside widget
        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(e.target)) return;

        // Save reference — click handler may clear _pdEl
        var savedEl = _pdEl;
        setTimeout(function() {
          // If click already fired and handled it, skip
          if (_pdClickFired || _pdConsumed) return;
          // Click never fired — element was removed from DOM. Consume cached element.
          _pdConsumed = true;
          _pdEl = null;
          _pdTarget = null;
          addPendingClick(savedEl);
        }, 100);
      }, true);

      document.addEventListener('click', function(e) {
        _pdClickFired = true;

        // If pointerup timeout already consumed this interaction, skip
        if (_pdConsumed) {
          _pdConsumed = false;
          _pdEl = null;
          _pdTarget = null;
          return;
        }

        var target = e.target;

        // Skip clicks inside the recording widget
        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(target)) return;

        // Use the element resolved at pointerdown time (when it was in DOM).
        // Fall back to resolving from click target if pointerdown wasn't captured.
        var el = null;
        if (_pdEl && (Date.now() - _pdTime < 1000)) {
          el = _pdEl;
        }
        // For the link check, use pointerdown target if click target is body
        var checkTarget = target;
        if ((target === document.body || target === document.documentElement)
            && _pdTarget && (Date.now() - _pdTime < 1000)) {
          checkTarget = _pdTarget;
        }
        _pdEl = null;
        _pdTarget = null;

        // Skip clicks on <a> tags that will navigate to a different page
        // (navigation is auto-tracked as a NAV step)
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

        // Fall back to click target resolution if pointerdown didn't find anything
        if (!el) {
          el = findClickableElement(checkTarget);
        }
        if (!el) return;

        addPendingClick(el);
      }, true);
    }

    // Recording widget UI
    var widgetMinimized = false;
    var showConfirmDone = false;

    window.__veritioToggleMinimize = function() {
      widgetMinimized = !widgetMinimized;
      showConfirmDone = false;
      // Adjust host width and page margin when minimizing/restoring
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

    // Restart recording: clear all state and navigate back to the starting page
    window.__veritioRestartRecording = function() {
      var startUrl = '';
      if (confirmedSteps.length > 0 && confirmedSteps[0].stepType === 'navigation') {
        startUrl = confirmedSteps[0].fullUrl || confirmedSteps[0].pathname;
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
      if (startUrl && startUrl !== location.href) {
        location.href = startUrl;
      } else {
        updateRecordingWidget();
      }
    };

    var PANEL_WIDTH = '380px';

    function createRecordingWidget() {
      var host = document.createElement('div');
      host.id = '__veritio_rec_widget';
      host.style.cssText = 'position:fixed;top:0;right:0;bottom:0;width:' + PANEL_WIDTH + ';z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
      document.body.appendChild(host);
      // Push page content left so it's not hidden behind the panel
      document.documentElement.style.marginRight = PANEL_WIDTH;
      var shadow = host.attachShadow({ mode: 'open' });
      window.__veritioRecShadow = shadow;
      updateRecordingWidget();
    }

    function escHtml(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    function renderPendingClickInline(pc) {
      var kindLabel = escHtml(pc.kind || 'Click');

      return '<div class="__vt_pending_row">'
        + '<div style="flex:1;min-width:0;">'
        + '<div class="__vt_pending_label">' + kindLabel + '</div>'
        + '<div class="__vt_pending_text">&ldquo;' + escHtml(pc.detail || pc.elementText || '') + '&rdquo;</div>'
        + '</div>'
        + '<div class="__vt_pending_actions">'
        + '<button class="__vt_btn_add" onclick="window.__veritioConfirmClick(' + pc._id + ')">Add</button>'
        + '<button class="__vt_btn_dismiss" onclick="window.__veritioIgnoreClick(' + pc._id + ')">Skip</button>'
        + '</div>'
        + '</div>';
    }

    function updateRecordingWidget() {
      var shadow = window.__veritioRecShadow;
      if (!shadow) return;

      var totalConfirmed = confirmedSteps.length;
      var hasPending = pendingClicks.length > 0;

      // -- Minimized state: thin vertical strip with expand icon --
      if (widgetMinimized) {
        shadow.innerHTML = '<div class="__vt_strip" onclick="window.__veritioToggleMinimize()">'
          + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>'
          + '<span class="__vt_dot"></span>'
          + '<span class="__vt_strip_label">' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + '</span>'
          + (hasPending ? '<span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>' : '')
          + '</div>'
          + '<style>' + getWidgetStyles() + '</style>';
        reattachButtons(shadow);
        return;
      }

      // -- Build pending clicks map: pendingByPath[pathname] = [click, ...] --
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

      // -- Pre-compute: count confirmed click sub-steps per nav step --
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

      // -- Build step list with inline pending clicks --
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

        // Compute isSelectChild early — needed for group box suppression AND checkbox rendering
        var isSelectChild = !isNav && selectModeNavIdx >= 0 && i > selectModeNavIdx;
        if (isSelectChild) {
          var stillUnderNav = true;
          for (var sc = selectModeNavIdx + 1; sc < i; sc++) {
            if (confirmedSteps[sc].stepType === 'navigation') { stillUnderNav = false; break; }
          }
          isSelectChild = stillUnderNav;
        }

        // Track group transitions — suppress when in selection mode (show flat checkboxes instead)
        var enteringGroup = step.group && step.group !== currentGroupId && !isSelectChild;
        var leavingGroup = currentGroupId && (!step.group || isSelectChild);

        if (leavingGroup) {
          currentGroupId = null;
          stepsHtml += '</div>'; // close group box
        }

        // Before a click step (outside a group), interleave pending clicks
        // that were captured EARLIER (lower _id) so they appear above this step
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
            + '<span class="__vt_group_ungroup" onclick="window.__veritioUngroupAll(' + lastNavIdx + ')">Ungroup</span>'
            + '</div>';
        }

        // -- Render the step row --
        stepsHtml += '<div class="__vt_step_row">';

        if (!isNav) {
          if (isSelectChild) {
            // Checkbox mode — show checkbox for ALL sub-steps (grouped or not) in selection mode
            var isChecked = selectModeChecked[i] || false;
            stepsHtml += '<span class="__vt_sel_cb' + (isChecked ? ' __vt_sel_on' : '') + '"'
              + ' onclick="window.__veritioToggleCheck(' + i + ')">'
              + (isChecked ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '')
              + '</span>';
          } else if (step.group) {
            stepsHtml += '<span class="__vt_step_bullet">&bull;</span>';
          } else {
            stepsHtml += '<span class="__vt_step_num">' + stepNum + '</span>';
          }
          stepsHtml += '<span class="__vt_step_text">Click &ldquo;' + escHtml(step.detail || step.elementText || '') + '&rdquo;</span>';
        } else {
          // Navigation step
          stepsHtml += '<span class="__vt_step_num">' + stepNum + '</span>';
          if (isFirst) {
            stepsHtml += '<span class="__vt_tag_start">Start:</span>';
          } else {
            stepsHtml += '<span class="__vt_tag_nav">Navigate:</span>';
          }
          var displayPath = step.pathname.split('?')[0].split('#')[0] || step.pathname;
          stepsHtml += '<code class="__vt_step_path" title="' + escHtml(step.pathname) + '">' + escHtml(displayPath) + '</code>';

          // "Any order" iOS-style toggle — show on all nav steps
          var subCount = clickCountByNav[i] || 0;
          var isActive = hasGroupByNav[i] || false;
          var isInSelect = selectModeNavIdx === i;
          var isDisabled = subCount < 2;
          var tipText = isDisabled ? 'Add 2+ click actions to enable'
            : isInSelect ? 'Click to cancel selection'
            : isActive ? 'Click to edit any-order grouping'
            : 'Select actions to mark as any order';
          stepsHtml += '<div class="__vt_tog_wrap' + (isDisabled ? ' __vt_tog_off' : '') + '"'
            + (isDisabled ? '' : ' onclick="window.__veritioToggleAnyOrder(' + i + ')"')
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
          // Check if next step is still a sub-step of the select nav
          var nextIsSubStep = false;
          if (i + 1 < confirmedSteps.length && confirmedSteps[i + 1].stepType !== 'navigation') {
            nextIsSubStep = true;
          }
          if (!nextIsSubStep) {
            // Last sub-step — render confirm/cancel bar
            var checkedCount = 0;
            for (var ck in selectModeChecked) { if (selectModeChecked[ck]) checkedCount++; }
            stepsHtml += '<div class="__vt_sel_bar">'
              + '<button class="__vt_sel_confirm"'
              + (checkedCount < 2 ? ' disabled' : '')
              + ' onclick="window.__veritioConfirmGroup()">'
              + 'Group' + (checkedCount >= 2 ? ' (' + checkedCount + ')' : '')
              + '</button>'
              + '<button class="__vt_sel_cancel" onclick="window.__veritioCancelSelect()">Cancel</button>'
              + '</div>';
          }
        }

        // After the last step for this page, render remaining pending clicks
        var nextStep = i + 1 < confirmedSteps.length ? confirmedSteps[i + 1] : null;
        var isLastForPage = !nextStep || nextStep.stepType === 'navigation';
        if (isLastForPage) {
          // Close group box BEFORE rendering pending clicks so they appear outside the group
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

      // Close any open group at the end
      if (currentGroupId) {
        stepsHtml += '</div>';
      }

      // -- Orphan pending clicks (page not in confirmed nav steps) --
      if (orphanPending.length > 0) {
        for (var oi = 0; oi < orphanPending.length; oi++) {
          stepsHtml += renderPendingClickInline(orphanPending[oi]);
        }
      }

      // -- Empty state --
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

      // -- Confirmation overlay --
      var confirmHtml = '';
      if (showConfirmDone) {
        confirmHtml = '<div class="__vt_confirm_overlay">'
          + '<div class="__vt_confirm_card">'
          + '<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111;">Done recording?</p>'
          + '<p style="margin:0 0 12px;font-size:12px;color:#6b7280;line-height:1.5;">This will save ' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + ' and close this tab.</p>'
          + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
          + '<button class="__vt_btn_secondary" onclick="window.__veritioCancelDone()">Cancel</button>'
          + '<button class="__vt_btn_primary" onclick="window.__veritioDoneRecording()">Save &amp; close</button>'
          + '</div>'
          + '</div>'
          + '</div>';
      }

      // -- Help line removed — split button is self-explanatory --
      var helpHtml = '';

      // -- Assemble full widget --
      shadow.innerHTML = '<div class="__vt_widget">'
        // Header
        + '<div class="__vt_header">'
        + '<div class="__vt_header_left">'
        + '<span class="__vt_dot"></span>'
        + '<span class="__vt_header_title">Recording path</span>'
        + '</div>'
        + '<span class="__vt_badge">' + totalConfirmed + ' step' + (totalConfirmed !== 1 ? 's' : '') + '</span>'
        + '<button class="__vt_btn_icon" onclick="window.__veritioToggleMinimize()" title="Collapse panel">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>'
        + '</button>'
        + '</div>'
        // Body
        + bodyHtml
        // Footer
        + '<div class="__vt_footer">'
        + (totalConfirmed >= 2
          ? '<div style="display:flex;gap:8px;width:100%;">'
            + '<button class="__vt_btn_restart" onclick="window.__veritioRestartRecording()" title="Start over">'
            + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
            + '</button>'
            + '<button class="__vt_btn_done" onclick="window.__veritioShowDoneConfirm()">Done recording</button>'
            + '</div>'
          : '<div class="__vt_footer_hint">Record at least 2 steps to save</div>')
        + '</div>'
        // Confirmation overlay
        + confirmHtml
        + '</div>'
        + '<style>' + getWidgetStyles() + '</style>';

      reattachButtons(shadow);

      // Auto-scroll step list to bottom
      var scrollArea = shadow.querySelector('.__vt_scroll_area');
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    }

    function reattachButtons(shadow) {
      var btns = shadow.querySelectorAll('button, .__vt_pill, .__vt_tog_wrap[onclick], .__vt_sel_cb[onclick]');
      btns.forEach(function(btn) {
        var oc = btn.getAttribute('onclick');
        if (oc) {
          btn.removeAttribute('onclick');
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            eval(oc);
          });
        }
      });
    }

    function getWidgetStyles() {
      return ''
        + '@keyframes __vt_pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }'
        + '@keyframes __vt_fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }'
        + '@keyframes __vt_slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }'

        // Reset — prevent host page styles from leaking
        + '*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }'

        // Panel container — full height side panel, NO animation on re-render
        + '.__vt_widget {'
        + '  position:relative;background:#fafafa;'
        + '  border-left:1px solid #e5e7eb;'
        + '  width:100%;height:100vh;'
        + '  display:flex;flex-direction:column;'
        + '  overflow:hidden;'
        + '  font-size:13px;line-height:1.5;color:#374151;'
        + '  -webkit-font-smoothing:antialiased;'
        + '}'

        // Minimized strip — thin vertical bar
        + '.__vt_strip {'
        + '  display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;'
        + '  background:#fff;border-left:1px solid #e5e7eb;'
        + '  width:100%;height:100vh;padding:14px 0;'
        + '  transition:background 150ms ease;'
        + '}'
        + '.__vt_strip:hover { background:#f3f4f6; }'
        + '.__vt_strip_label {'
        + '  font-size:10px;font-weight:600;color:#6b7280;letter-spacing:0.02em;'
        + '  writing-mode:vertical-rl;text-orientation:mixed;'
        + '}'

        // Recording dot
        + '.__vt_dot {'
        + '  display:inline-block;width:8px;height:8px;border-radius:50%;'
        + '  background:#ef4444;animation:__vt_pulse 1.5s ease-in-out infinite;flex-shrink:0;'
        + '}'

        // Header — clean, elevated
        + '.__vt_header {'
        + '  display:flex;align-items:center;gap:8px;padding:12px 16px;'
        + '  background:#fff;'
        + '  border-bottom:1px solid #e5e7eb;'
        + '}'
        + '.__vt_header_left {'
        + '  display:flex;align-items:center;gap:8px;flex:1;min-width:0;'
        + '}'
        + '.__vt_header_title {'
        + '  font-size:14px;font-weight:600;color:#111827;letter-spacing:-0.01em;'
        + '}'
        + '.__vt_badge {'
        + '  font-size:12px;color:#6b7280;background:#f3f4f6;'
        + '  border-radius:10px;padding:2px 10px;font-weight:500;'
        + '  flex-shrink:0;'
        + '}'

        // Icon button (minimize)
        + '.__vt_btn_icon {'
        + '  border:none;background:transparent;color:#9ca3af;border-radius:6px;'
        + '  width:28px;height:28px;cursor:pointer;'
        + '  display:flex;align-items:center;justify-content:center;'
        + '  transition:color 150ms ease,background 150ms ease;flex-shrink:0;'
        + '}'
        + '.__vt_btn_icon:hover { color:#374151;background:#f3f4f6; }'

        // Scroll area + fade
        + '.__vt_scroll_area {'
        + '  position:relative;flex:1;overflow-y:auto;'
        + '  scrollbar-width:thin;scrollbar-color:#d1d5db transparent;'
        + '}'
        + '.__vt_scroll_area::-webkit-scrollbar { width:4px; }'
        + '.__vt_scroll_area::-webkit-scrollbar-track { background:transparent; }'
        + '.__vt_scroll_area::-webkit-scrollbar-thumb { background:#d1d5db;border-radius:4px; }'
        + '.__vt_scroll_area::-webkit-scrollbar-thumb:hover { background:#9ca3af; }'
        + '.__vt_step_list { padding:12px 16px 16px; }'
        + '.__vt_fade {'
        + '  position:sticky;bottom:0;left:0;right:0;height:24px;'
        + '  background:linear-gradient(transparent,#fafafa);pointer-events:none;'
        + '}'

        // Empty state
        + '.__vt_empty {'
        + '  display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + '  padding:48px 24px;flex:1;text-align:center;'
        + '}'
        + '.__vt_empty_icon {'
        + '  width:48px;height:48px;border-radius:12px;background:#f3f4f6;'
        + '  display:flex;align-items:center;justify-content:center;margin-bottom:16px;'
        + '}'
        + '.__vt_empty_title {'
        + '  font-size:14px;font-weight:600;color:#111827;margin:0 0 6px;'
        + '}'
        + '.__vt_empty_desc {'
        + '  font-size:13px;color:#6b7280;margin:0;line-height:1.5;max-width:260px;'
        + '}'

        // Step row
        + '.__vt_step_row {'
        + '  display:flex;align-items:center;gap:8px;padding:6px 0;min-height:32px;'
        + '}'
        + '.__vt_step_num {'
        + '  font-size:11px;color:#9ca3af;min-width:18px;text-align:right;'
        + '  font-variant-numeric:tabular-nums;flex-shrink:0;font-weight:500;'
        + '}'
        + '.__vt_step_path {'
        + '  font-size:12px;color:#111827;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;'
        + '  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
        + '  background:#f3f4f6;padding:2px 6px;border-radius:4px;'
        + '}'
        + '.__vt_step_text {'
        + '  font-size:13px;color:#374151;min-width:0;overflow:hidden;'
        + '  text-overflow:ellipsis;white-space:nowrap;'
        + '}'

        // Tag labels
        + '.__vt_tag_start {'
        + '  font-size:12px;font-weight:600;color:#111827;flex-shrink:0;'
        + '}'
        + '.__vt_tag_nav {'
        + '  font-size:12px;font-weight:500;color:#6b7280;flex-shrink:0;'
        + '}'

        // Group box — visual container for any-order steps
        + '.__vt_group_box {'
        + '  margin:4px 0 4px 18px;padding:6px 10px;'
        + '  border-left:2px solid #9ca3af;'
        + '  background:#f3f4f6;border-radius:0 6px 6px 0;'
        + '}'
        + '.__vt_group_header {'
        + '  font-size:11px;font-weight:500;color:#6b7280;padding:0 0 4px;'
        + '  display:flex;align-items:center;gap:4px;'
        + '}'
        + '.__vt_group_ungroup {'
        + '  margin-left:auto;font-size:10px;color:#9ca3af;cursor:pointer;'
        + '  padding:1px 4px;border-radius:3px;'
        + '}'
        + '.__vt_group_ungroup:hover { color:#ef4444;background:#fef2f2; }'

        // "Any order" iOS-style toggle switch
        + '.__vt_tog_wrap {'
        + '  margin-left:auto;display:inline-flex;align-items:center;gap:6px;'
        + '  cursor:pointer;flex-shrink:0;padding:6px 4px;position:relative;z-index:1;'
        + '}'
        + '.__vt_tog_wrap:hover .__vt_tog_track { background:#b0b5bd; }'
        + '.__vt_tog_wrap:hover .__vt_tog_on { background:#000; }'
        + '.__vt_tog_off { cursor:default;opacity:0.45; }'
        + '.__vt_tog_off:hover { opacity:0.7; }'
        + '.__vt_tog_off:hover .__vt_tog_track { background:#d1d5db; }'
        + '.__vt_tog_label { font-size:11px;font-weight:500;color:#374151;white-space:nowrap; }'
        + '.__vt_tog_off .__vt_tog_label { color:#9ca3af; }'
        + '.__vt_tog_track {'
        + '  width:32px;height:18px;border-radius:9px;background:#d1d5db;'
        + '  position:relative;transition:background 200ms ease;flex-shrink:0;'
        + '}'
        + '.__vt_tog_knob {'
        + '  position:absolute;top:3px;left:3px;width:12px;height:12px;'
        + '  border-radius:50%;background:#fff;'
        + '  box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:left 200ms ease;'
        + '}'
        + '.__vt_tog_on { background:#111827; }'
        + '.__vt_tog_on .__vt_tog_knob { left:17px; }'
        // CSS tooltip — shows on hover for ALL toggle states
        + '.__vt_tog_tip {'
        + '  display:none;position:absolute;bottom:calc(100% + 6px);right:0;'
        + '  background:#1f2937;color:#fff;font-size:11px;font-weight:400;'
        + '  padding:5px 10px;border-radius:6px;white-space:nowrap;'
        + '  pointer-events:none;z-index:99999;'
        + '  box-shadow:0 4px 12px rgba(0,0,0,0.2);'
        + '}'
        + '.__vt_tog_tip::after {'
        + '  content:"";position:absolute;top:100%;right:12px;'
        + '  border:5px solid transparent;border-top-color:#1f2937;'
        + '}'
        + '.__vt_tog_wrap:hover .__vt_tog_tip { display:block; }'

        // Checkbox for selection mode
        + '.__vt_sel_cb {'
        + '  width:16px;height:16px;min-width:16px;border-radius:4px;border:1.5px solid #d1d5db;'
        + '  cursor:pointer;display:flex;align-items:center;justify-content:center;'
        + '  transition:all 100ms ease;flex-shrink:0;'
        + '}'
        + '.__vt_sel_cb:hover { border-color:#9ca3af; }'
        + '.__vt_sel_on { background:#111827;border-color:#111827; }'
        + '.__vt_sel_on:hover { background:#000;border-color:#000; }'

        // Confirm/cancel bar for selection mode
        + '.__vt_sel_bar {'
        + '  display:flex;gap:6px;padding:8px 0 4px 18px;'
        + '}'
        + '.__vt_sel_confirm {'
        + '  border:none;background:#111827;color:#fff;border-radius:6px;'
        + '  height:28px;padding:0 12px;font-size:12px;font-weight:500;cursor:pointer;'
        + '}'
        + '.__vt_sel_confirm:hover { background:#000; }'
        + '.__vt_sel_confirm:disabled { background:#d1d5db;color:#9ca3af;cursor:default; }'
        + '.__vt_sel_cancel {'
        + '  border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:6px;'
        + '  height:28px;padding:0 12px;font-size:12px;font-weight:500;cursor:pointer;'
        + '}'
        + '.__vt_sel_cancel:hover { background:#f9fafb;color:#374151; }'

        // Bullet for steps inside group (replaces number)
        + '.__vt_step_bullet {'
        + '  font-size:16px;color:#9ca3af;min-width:18px;text-align:right;flex-shrink:0;line-height:1;'
        + '}'

        // Pending click row
        + '.__vt_pending_row {'
        + '  display:flex;align-items:center;gap:10px;'
        + '  margin:6px 0 6px 26px;padding:10px 12px;'
        + '  background:#fff;border:1px solid #e5e7eb;border-radius:10px;'
        + '  box-shadow:0 1px 3px rgba(0,0,0,0.04);'
        + '}'
        + '.__vt_pending_label {'
        + '  font-size:11px;font-weight:500;color:#9ca3af;text-transform:uppercase;'
        + '  letter-spacing:0.04em;margin-bottom:2px;'
        + '}'
        + '.__vt_pending_text {'
        + '  font-size:13px;color:#111827;'
        + '  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;'
        + '}'
        + '.__vt_pending_actions {'
        + '  display:flex;gap:6px;align-items:center;flex-shrink:0;'
        + '}'

        // Add button
        + '.__vt_btn_add {'
        + '  border:none;background:#111827;color:#fff;'
        + '  border-radius:6px;'
        + '  height:32px;padding:0 14px;font-size:13px;font-weight:500;cursor:pointer;'
        + '  flex-shrink:0;transition:background 150ms ease;white-space:nowrap;'
        + '}'
        + '.__vt_btn_add:hover { background:#1f2937; }'

        // Restart button
        + '.__vt_btn_restart {'
        + '  border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:8px;'
        + '  height:40px;width:40px;font-size:10px;cursor:pointer;'
        + '  display:flex;align-items:center;justify-content:center;flex-shrink:0;'
        + '  transition:all 150ms ease;'
        + '}'
        + '.__vt_btn_restart:hover { background:#f9fafb;color:#374151;border-color:#d1d5db; }'

        // Skip button — subtle ghost
        + '.__vt_btn_dismiss {'
        + '  border:1px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:6px;'
        + '  height:32px;padding:0 12px;font-size:13px;font-weight:500;cursor:pointer;'
        + '  flex-shrink:0;transition:all 150ms ease;white-space:nowrap;'
        + '}'
        + '.__vt_btn_dismiss:hover { background:#f9fafb;color:#374151;border-color:#d1d5db; }'

        // Footer
        + '.__vt_footer {'
        + '  padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb;'
        + '  display:flex;align-items:center;justify-content:center;'
        + '}'
        + '.__vt_footer_hint {'
        + '  font-size:12px;color:#9ca3af;font-weight:400;'
        + '}'

        // Done recording button — primary CTA
        + '.__vt_btn_done {'
        + '  border:none;background:#111827;color:#fff;border-radius:8px;'
        + '  height:40px;padding:0 24px;font-size:14px;font-weight:500;cursor:pointer;'
        + '  width:100%;transition:background 150ms ease;'
        + '}'
        + '.__vt_btn_done:hover { background:#1f2937; }'

        // Confirmation overlay
        + '.__vt_confirm_overlay {'
        + '  position:absolute;inset:0;background:rgba(255,255,255,0.95);'
        + '  display:flex;align-items:center;justify-content:center;'
        + '  backdrop-filter:blur(4px);z-index:20;'
        + '  animation:__vt_fadeIn 150ms ease-out;'
        + '}'
        + '.__vt_confirm_card {'
        + '  padding:24px;text-align:left;max-width:280px;'
        + '}'

        // Primary button (Save & close)
        + '.__vt_btn_primary {'
        + '  border:none;background:#111827;color:#fff;border-radius:8px;'
        + '  height:36px;padding:0 18px;font-size:13px;font-weight:500;cursor:pointer;'
        + '  transition:background 150ms ease;'
        + '}'
        + '.__vt_btn_primary:hover { background:#1f2937; }'

        // Secondary button (Cancel)
        + '.__vt_btn_secondary {'
        + '  border:1px solid #e5e7eb;background:#fff;color:#374151;border-radius:8px;'
        + '  height:36px;padding:0 18px;font-size:13px;font-weight:500;cursor:pointer;'
        + '  transition:all 150ms ease;'
        + '}'
        + '.__vt_btn_secondary:hover { background:#f9fafb; }';
    }

    // SPA navigation detection
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function() {
      origPush.apply(this, arguments);
      addNavStep();
    };
    history.replaceState = function() {
      origReplace.apply(this, arguments);
      addNavStep();
    };
    window.addEventListener('popstate', addNavStep);

    // Init — restore persisted state before adding current page
    loadRecState();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        createRecordingWidget();
        addNavStep();
        setupClickTracking();
        setupInputTracking();
      });
    } else {
      createRecordingWidget();
      addNavStep();
      setupClickTracking();
      setupInputTracking();
    }

    return; // Exit early — no task widget, no events, no flushing
  }

  // ============================================================================
  // Normal Mode: Full snippet functionality
  // ============================================================================

  // State
  var eventQueue = [];
  var tasks = [];
  var currentTaskIndex = 0;
  var sessionId = '';
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
  var pageClickCount = 0;
  // delayed activation removed — buttons always visible
  var confirmStep = 0;
  var onboardingPulseTimer = null;
  var idleShakeTimer = null;
  var IDLE_SHAKE_SECONDS = 8;
  var minimizedClickTimes = [];
  var SHAKE_CLICK_THRESHOLD = 3;
  var SHAKE_CLICK_WINDOW = 2000;

  // ============================================================================
  // Session Management
  // ============================================================================

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function saveSession(data) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function saveFullSession() {
    // Only persist durable states — transitional states (task_complete, ptq_saved, submitting)
    // would get stuck if restored after a page navigation
    var persistState = widgetState;
    if (persistState === 'task_complete' || persistState === 'ptq_saved' || persistState === 'submitting' || persistState === 'post_task_questions') {
      persistState = 'active';
    }
    saveSession({
      sessionId: sessionId,
      participantToken: sessionContext.sessionToken || null,
      currentTaskIndex: currentTaskIndex,
      startedAt: Date.now(),
      tasks: tasks,
      studySettings: studySettings,
      studyBranding: studyBranding,
      shareCode: shareCode,
      frontendBase: frontendBase,
      taskResponses: taskResponses,
      widgetState: persistState,
      taskMinimized: taskMinimized,
      interactionHistory: interactionHistory,
      taskStartTime: taskStartTime,
      taskNavCount: taskNavCount,
    });
  }

  function initSession() {
    var existing = getSession();
    if (existing && existing.sessionId) {
      sessionId = existing.sessionId;
      currentTaskIndex = existing.currentTaskIndex || 0;
      // Restore participant token so it survives cross-page navigation
      if (existing.participantToken && !sessionContext.sessionToken) {
        sessionContext.sessionToken = existing.participantToken;
      }
      // Restore full context if available (cross-page navigation)
      if (existing.tasks && existing.tasks.length) {
        tasks = existing.tasks;
        studySettings = existing.studySettings || {};
        studyBranding = existing.studyBranding || {};
        shareCode = existing.shareCode || '';
        frontendBase = existing.frontendBase || '';
        taskResponses = existing.taskResponses || [];
        if (existing.widgetState) widgetState = existing.widgetState;
        if (existing.taskMinimized !== undefined) taskMinimized = existing.taskMinimized;
        if (existing.interactionHistory) interactionHistory = existing.interactionHistory;
        if (existing.taskStartTime) taskStartTime = existing.taskStartTime;
        if (existing.taskNavCount) taskNavCount = existing.taskNavCount;
        // Fallback: if task is active but taskStartTime wasn't persisted (legacy session)
        if (widgetState === 'active' && !taskStartTime) taskStartTime = Date.now();
        // No delayed activation — buttons always available
      }
      return;
    }
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    currentTaskIndex = 0;
    saveSession({ sessionId: sessionId, currentTaskIndex: 0, startedAt: Date.now() });
  }

  // ============================================================================
  // Portal/Modal tracking: detect dynamically-appended body children
  // ============================================================================
  var _portalRoots = new WeakSet();

  function initPortalTracking() {
    var initialChildren = new Set();
    for (var i = 0; i < document.body.children.length; i++) {
      initialChildren.add(document.body.children[i]);
    }
    var bodyObserver = new MutationObserver(function(mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1) continue;
          if (mutations[m].target !== document.body) continue;
          if (initialChildren.has(node)) continue;
          var tn = node.tagName;
          if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'LINK' || tn === 'NOSCRIPT') continue;
          _portalRoots.add(node);
        }
        var removed = mutations[m].removedNodes;
        for (var r = 0; r < removed.length; r++) {
          if (removed[r].nodeType === 1 && _portalRoots.has(removed[r])) {
            _portalRoots.delete(removed[r]);
          }
        }
      }
    });
    bodyObserver.observe(document.body, { childList: true });
  }

  function isInsidePortal(el) {
    var node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      if (_portalRoots.has(node)) return true;
      node = node.parentElement;
    }
    return false;
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
      fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/snapshot', {
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

  // ============================================================================
  // DOM Snapshot Capture (for click maps)
  // ============================================================================

  function captureSnapshot() {
    // Strip hash — hash-only changes don't change the DOM
    var pageUrl = location.href.split('#')[0];
    if (capturedSnapshotUrls[pageUrl]) return;
    capturedSnapshotUrls[pageUrl] = true;
    setTimeout(function() {
      try {
        if (!window.__rrwebSnapshot) return;
        // Force all elements visible before capture — many sites use scroll-triggered
        // animations (opacity: 0, visibility: hidden) for below-fold content.
        // This temporary override ensures the full page is captured, not just above-fold.
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
        // No keepalive — snapshot body exceeds the 64KB keepalive limit
        fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/snapshot', {
          method: 'POST',
          body: JSON.stringify({
            pageUrl: pageUrl,
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

  // ============================================================================
  // Event Capture
  // ============================================================================

  function queueEvent(type, data) {
    eventQueue.push({
      session_id: sessionId,
      task_id: tasks[currentTaskIndex] ? tasks[currentTaskIndex].id : null,
      event_type: type,
      element_selector: data.selector || null,
      coordinates: data.coordinates || null,
      viewport_size: { width: window.innerWidth, height: window.innerHeight },
      page_url: data.pageUrl || location.href.split('#')[0],
      timestamp: new Date().toISOString(),
      metadata: data.metadata || null,
    });
  }

  function setupEventListeners() {
    // Clicks
    document.addEventListener('click', function(e) {
      // Ignore clicks on the study widget itself
      if (widgetHost && widgetHost.contains(e.target)) return;

      // Track page interactions for completion gate
      if (widgetState === 'active') {
        pageClickCount++;
        resetIdleShakeTimer();
        // Shake pill when user clicks repeatedly while minimized (confused/lost)
        if (taskMinimized) {
          var now2 = Date.now();
          minimizedClickTimes.push(now2);
          minimizedClickTimes = minimizedClickTimes.filter(function(t) { return now2 - t < SHAKE_CLICK_WINDOW; });
          if (minimizedClickTimes.length >= SHAKE_CLICK_THRESHOLD) {
            shakePill();
            minimizedClickTimes = [];
          }
        }
      }

      var now = Date.now();
      clickTimes.push(now);
      clickTimes = clickTimes.filter(function(t) { return now - t < RAGE_CLICK_WINDOW; });

      // Detect if click was on an interactive element (for hit/miss in click maps)
      var wasInteractive = false;
      var el = e.target;
      for (var d = 0; d < 5 && el && el !== document.body; d++) {
        if (el.matches && el.matches(INTERACTIVE)) { wasInteractive = true; break; }
        el = el.parentElement;
      }

      var timeSinceMs = taskStartTime > 0 ? Date.now() - taskStartTime : null;

      // Detect if click was inside a modal/overlay/popup
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

      // Detect backdrop/overlay clicks: if the click target is the fixed overlay
      // itself (or a direct child that also covers the full viewport), the user
      // clicked on the dimmed backdrop — not the dialog content.
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
          } catch(e3) { /* skip */ }
        }
      }

      // Extract text/tag from the meaningful element (interactive ancestor or target)
      var meaningfulEl = (wasInteractive && el) ? el : e.target;
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
      // Modal dialogs use position:fixed — use clientX/Y (viewport-relative)
      // so coordinates map correctly to the viewport-clipped snapshot.
      var clickX = isModal ? e.clientX : e.pageX;
      var clickY = isModal ? e.clientY : e.pageY;
      queueEvent(isRageClick ? 'rage_click' : 'click', {
        selector: getSelector(e.target),
        coordinates: { x: clickX, y: clickY },
        metadata: clickMeta,
        pageUrl: isModal ? window.location.href.split('#')[0] + '#modal' : undefined,
      });

      // Capture modal snapshot on first modal click — content is guaranteed
      // to be rendered at this point. Use rAF to ensure browser has painted.
      if (isModal) {
        var modalSnapUrl = window.location.href.split('#')[0] + '#modal';
        if (!capturedSnapshotUrls[modalSnapUrl]) {
          capturedSnapshotUrls[modalSnapUrl] = true;
          requestAnimationFrame(function() {
            captureModalSnapshot(modalSnapUrl);
          });
        }
      }

      // (shake is now handled by the more forgiving minimizedClickTimes counter above)

      // Track clicks on interactive elements for url_path matching
      el = e.target;
      for (var d = 0; d < 5 && el && el !== document.body; d++) {
        if (el.matches && el.matches(INTERACTIVE)) break;
        el = el.parentElement;
      }
      if (el && el !== document.body && el.matches && el.matches(INTERACTIVE)) {
        interactionHistory.push({
          type: 'click',
          pathname: location.pathname + location.search + location.hash,
          selector: getSelector(el),
          elementText: (el.textContent || '').trim().substring(0, 40),
        });
        checkUrlPath();
      }
    }, true);

    // Scrolls (throttled)
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

    // Errors
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
    window.addEventListener('hashchange', onNavigation);
  }

  function onNavigation() {
    // Track navigation for url_path matching (nav + click events in one history)
    // Include search + hash to match what the path recorder stores (pathname + search + hash)
    var pathname = location.pathname + location.search + location.hash;
    // Deduplicate: popstate + hashchange can both fire for the same navigation
    var lastNav = interactionHistory.length > 0 ? interactionHistory[interactionHistory.length - 1] : null;
    if (lastNav && lastNav.type === 'navigation' && lastNav.pathname === pathname) return;
    interactionHistory.push({
      type: 'navigation',
      pathname: pathname,
      selector: null,
      elementText: null,
    });
    if (widgetState === 'active') taskNavCount++;

    saveFullSession();
    queueEvent('page_view', {});
    captureSnapshot();
    checkUrlMatch();
    checkUrlPath();
  }

  function checkUrlMatch() {
    if (!tasks[currentTaskIndex]) return;
    // Only check when task is actively in progress (not before Start Task)
    if (widgetState !== 'active') return;
    var task = tasks[currentTaskIndex];
    if (task.success_criteria_type !== 'url_match' || !task.success_url) return;

    var currentUrl = location.href;
    var currentPath = location.pathname;
    var target = task.success_url;

    // Extract path from target URL (handles both full URLs and bare paths)
    var targetPath = target;
    try {
      var u = new URL(target);
      targetPath = u.pathname;
    } catch(e) {
      targetPath = target;
    }

    // Direct = navigated straight to target (first navigation during task)
    // Indirect = browsed other pages first before reaching target
    var urlMethod = taskNavCount <= 1 ? 'auto_url_direct' : 'auto_url_indirect';

    // Match strategies:
    // 1. Full URL match or target contained in current URL
    if (currentUrl === target || currentUrl.indexOf(target) !== -1) {
      completeCurrentTask(true, urlMethod);
    // 2. Path-only match (strip origin from both)
    } else if (currentPath === targetPath) {
      completeCurrentTask(true, urlMethod);
    // 3. Wildcard match (target ends with *)
    } else if (target.charAt(target.length - 1) === '*') {
      var prefix = target.slice(0, -1);
      var prefixPath = prefix;
      try { prefixPath = new URL(prefix).pathname; } catch(e) { prefixPath = prefix; }
      if (currentPath.indexOf(prefixPath) === 0) {
        completeCurrentTask(true, urlMethod);
      }
    }
  }

  // ============================================================================
  // URL Path Matching
  // ============================================================================

  // Parse query string into [{key, value}] pairs
  function parseQueryParams(pathname) {
    var qIdx = pathname.indexOf('?');
    if (qIdx === -1) return [];
    var search = pathname.slice(qIdx + 1).split('#')[0];
    if (!search) return [];
    var pairs = search.split('&');
    var result = [];
    for (var p = 0; p < pairs.length; p++) {
      if (!pairs[p]) continue;
      var eqIdx = pairs[p].indexOf('=');
      if (eqIdx === -1) { result.push({ key: pairs[p], value: '' }); }
      else { result.push({ key: pairs[p].slice(0, eqIdx), value: decodeURIComponent(pairs[p].slice(eqIdx + 1)) }); }
    }
    return result;
  }

  // Compare two pathnames with wildcard support for path segments and query params.
  // wildcardParams: undefined = ignore all query params (backward compat),
  // defined = non-wildcarded recorded params must match exactly.
  function pathnameMatches(actual, recorded, wildcardSegments, wildcardParams) {
    var aQIdx = actual.indexOf('?');
    var aHash = actual.indexOf('#');
    var aEnd = aQIdx !== -1 ? aQIdx : (aHash !== -1 ? aHash : actual.length);
    var aPath = actual.slice(0, aEnd);

    var rQIdx = recorded.indexOf('?');
    var rHash = recorded.indexOf('#');
    var rEnd = rQIdx !== -1 ? rQIdx : (rHash !== -1 ? rHash : recorded.length);
    var rPath = recorded.slice(0, rEnd);

    var aSegs = aPath.split('/');
    var rSegs = rPath.split('/');
    if (aSegs.length !== rSegs.length) return false;
    for (var i = 0; i < rSegs.length; i++) {
      if (rSegs[i] === aSegs[i]) continue;
      if (wildcardSegments) {
        if (wildcardSegments.indexOf(i) !== -1) continue;
      } else {
        // Purely numeric IDs (e.g. 12345)
        if (/^\d{4,}$/.test(rSegs[i])) continue;
        // Alphanumeric slugs with both letters and digits (e.g. mmd7jwjw, abc123)
        if (rSegs[i].length >= 6 && /^[a-zA-Z0-9_-]+$/.test(rSegs[i]) && /\d/.test(rSegs[i]) && /[a-zA-Z]/.test(rSegs[i])) continue;
      }
      return false;
    }

    // Query param matching
    if (!wildcardParams) return true; // undefined/null = ignore all (backward compat)

    var rParams = parseQueryParams(recorded);
    var aParams = parseQueryParams(actual);
    var aMap = {};
    for (var j = 0; j < aParams.length; j++) { aMap[aParams[j].key] = aParams[j].value; }
    for (var k = 0; k < rParams.length; k++) {
      if (wildcardParams.indexOf(rParams[k].key) !== -1) continue;
      if (!(rParams[k].key in aMap) || aMap[rParams[k].key] !== rParams[k].value) return false;
    }
    return true;
  }

  // Build ordered/group segments from flat steps array
  function buildSegments(steps) {
    var segments = [];
    var i = 0;
    while (i < steps.length) {
      if (steps[i].group) {
        var groupId = steps[i].group;
        var groupSteps = [];
        while (i < steps.length && steps[i].group === groupId) {
          groupSteps.push(steps[i]);
          i++;
        }
        segments.push({ type: 'group', steps: groupSteps });
      } else {
        segments.push({ type: 'ordered', step: steps[i] });
        i++;
      }
    }
    return segments;
  }

  // Match interaction history against segments (ordered + unordered groups)
  function matchAllSegments(segments, history) {
    var hIdx = 0;
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      if (seg.type === 'ordered') {
        var found = false;
        while (hIdx < history.length) {
          if (matchesStep(history[hIdx], seg.step)) {
            hIdx++;
            found = true;
            break;
          }
          hIdx++;
        }
        if (!found) return false;
      } else {
        // Group: match all items in any order
        var matched = [];
        for (var g = 0; g < seg.steps.length; g++) matched.push(false);
        var matchCount = 0;
        while (hIdx < history.length && matchCount < seg.steps.length) {
          for (var g = 0; g < seg.steps.length; g++) {
            if (!matched[g] && matchesStep(history[hIdx], seg.steps[g])) {
              matched[g] = true;
              matchCount++;
              break;
            }
          }
          hIdx++;
        }
        if (matchCount < seg.steps.length) return false;
      }
    }
    return true;
  }

  function matchesStep(historyEntry, pathStep) {
    // Navigation steps: match by pathname (with wildcard support)
    if (!pathStep.type || pathStep.type === 'navigation') {
      return historyEntry.type === 'navigation' && pathnameMatches(historyEntry.pathname, pathStep.pathname, pathStep.wildcardSegments, pathStep.wildcardParams);
    }
    // Click steps: match by selector on the same page, fallback to elementText
    if (pathStep.type === 'click') {
      if (historyEntry.type !== 'click') return false;
      if (!pathnameMatches(historyEntry.pathname, pathStep.pathname, pathStep.wildcardSegments, pathStep.wildcardParams)) return false;
      if (pathStep.selector && historyEntry.selector === pathStep.selector) return true;
      if (pathStep.elementText && historyEntry.elementText &&
          historyEntry.elementText.indexOf(pathStep.elementText) !== -1) return true;
      return false;
    }
    return false;
  }

  function checkUrlPath() {
    if (!tasks[currentTaskIndex]) return;
    // Only check when task is actively in progress (not before Start Task)
    if (widgetState !== 'active') return;
    var task = tasks[currentTaskIndex];
    if (task.success_criteria_type !== 'url_path' && task.success_criteria_type !== 'exact_path') return;
    var sp = task.success_path;
    if (!sp || !sp.steps || sp.steps.length < 2) return;

    // Detect if path uses groups
    var hasGroups = false;
    for (var i = 0; i < sp.steps.length; i++) {
      if (sp.steps[i].group) { hasGroups = true; break; }
    }

    if (hasGroups) {
      // Grouped paths: check all segments on every interaction
      var segments = buildSegments(sp.steps);
      if (matchAllSegments(segments, interactionHistory)) {
        queueEvent('path_success', {
          metadata: {
            taskId: task.id, direct: true, mode: sp.mode || 'strict',
            stepsMatched: sp.steps.length, stepsTotal: sp.steps.length,
            historyLength: interactionHistory.length,
            history: interactionHistory.map(function(h) { return h.pathname; }),
          },
        });
        completeCurrentTask(true, 'auto_path_direct');
      }
    } else {
      // Original behavior: goal-first check (unchanged for backward compat)
      var goalStep = sp.steps[sp.steps.length - 1];
      var lastEntry = interactionHistory.length > 0 ? interactionHistory[interactionHistory.length - 1] : null;
      if (lastEntry && matchesStep(lastEntry, goalStep)) {
        var stepIndex = 0;
        for (var i = 0; i < interactionHistory.length && stepIndex < sp.steps.length; i++) {
          if (matchesStep(interactionHistory[i], sp.steps[stepIndex])) {
            stepIndex++;
          }
        }
        var isDirect = stepIndex === sp.steps.length;
        queueEvent('path_success', {
          metadata: {
            taskId: task.id, direct: isDirect, mode: sp.mode || 'strict',
            stepsMatched: stepIndex, stepsTotal: sp.steps.length,
            historyLength: interactionHistory.length,
            history: interactionHistory.map(function(h) { return h.pathname; }),
          },
        });
        completeCurrentTask(true, isDirect ? 'auto_path_direct' : 'auto_path_indirect');
      }
    }
  }

  // ============================================================================
  // Event Flushing
  // ============================================================================

  function flushEvents() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0, eventQueue.length);

    fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/events', {
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
        // Use text/plain to avoid CORS preflight — application/json triggers an
        // OPTIONS request that can't complete before the page navigates away,
        // causing events to be silently dropped.
        var blob = new Blob(
          [JSON.stringify({ events: eventQueue })],
          { type: 'text/plain' }
        );
        navigator.sendBeacon(API_BASE + '/api/snippet/' + SNIPPET_ID + '/events', blob);
      }
    });
  }

  // ============================================================================
  // rrweb Session Recording
  // ============================================================================

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
        blockSelector: '#veritio-lwt-widget-host, #__veritio_lwt_widget, #__veritio_lwt_overlay',
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
    fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/rrweb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(function() {});
  }

  function startRrwebFlushing() {
    setInterval(flushRrwebEvents, RRWEB_FLUSH_INTERVAL);
    window.addEventListener('beforeunload', function() {
      // Flush pending events on unload — don't mark is_final since we can't
      // distinguish page navigation from actual tab close. Session finalization
      // is handled by inactivity timeout on the backend.
      if (rrwebEventBuffer.length > 0) {
        var idx = rrwebChunkIndex++;
        try { sessionStorage.setItem(SESSION_KEY + '_rrweb_ci', String(rrwebChunkIndex)); } catch(e) {}
        var payload = JSON.stringify({
          session_id: sessionId,
          chunk_index: idx,
          events: rrwebEventBuffer,
        });
        navigator.sendBeacon(
          API_BASE + '/api/snippet/' + SNIPPET_ID + '/rrweb',
          new Blob([payload], { type: 'text/plain' })
        );
      }
    });
  }

  // ============================================================================
  // Blocking Overlay
  // ============================================================================

  function showBlockingOverlay() {
    if (!studySettings.blockBeforeStart) return;
    if (blockingOverlay) return;
    blockingOverlay = document.createElement('div');
    blockingOverlay.id = '__veritio_lwt_overlay';
    blockingOverlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,0.3);pointer-events:auto;cursor:not-allowed;';
    document.body.appendChild(blockingOverlay);
    document.body.style.overflow = 'hidden';
  }

  function removeBlockingOverlay() {
    if (blockingOverlay && blockingOverlay.parentNode) {
      blockingOverlay.parentNode.removeChild(blockingOverlay);
      blockingOverlay = null;
    }
    document.body.style.overflow = '';
  }

  // ============================================================================
  // Think-Aloud Protocol — overlay prompt for silence detection
  // ============================================================================

  var thinkAloudEl = null;

  function getThinkAloudPosition() {
    // Smart positioning: place prompt on the opposite corner from the widget
    var widgetOnTop = false;
    if (widgetHost) {
      var rect = widgetHost.getBoundingClientRect();
      var vh = window.innerHeight;
      widgetOnTop = rect.top + rect.height / 2 < vh / 2;
    } else {
      var pos = studySettings.widgetPosition || 'bottom-right';
      widgetOnTop = pos.indexOf('top') !== -1;
    }
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
    // Notify the study tab that participant dismissed the prompt
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'lwt-think-aloud-dismissed' }, '*');
      }
    } catch(e) {}
  }

  // Listen for think-aloud prompt messages from study tab
  window.addEventListener('message', function(ev) {
    var d = ev.data;
    if (!d) return;
    if (d.type === 'lwt-think-aloud-show' && d.prompt) {
      showThinkAloudOverlay(d.prompt);
    } else if (d.type === 'lwt-think-aloud-hide') {
      hideThinkAloudOverlay();
    }
  });

  // ============================================================================
  // Task Widget (Shadow DOM) — Enhanced State Machine
  // ============================================================================

  var widgetRoot = null;

  function createWidget() {
    widgetHost = document.createElement('div');
    widgetHost.id = '__veritio_lwt_widget';
    // Position based on settings (default bottom-right)
    var pos = studySettings.widgetPosition || 'bottom-right';
    var posStyle = {
      'bottom-right': 'bottom:20px;right:20px;',
      'bottom-left': 'bottom:20px;left:20px;',
      'top-right': 'top:20px;right:20px;',
      'top-left': 'top:20px;left:20px;'
    }[pos] || 'bottom:20px;right:20px;';
    widgetHost.style.cssText = 'position:fixed;' + posStyle + 'z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    document.body.appendChild(widgetHost);
    var shadow = widgetHost.attachShadow({ mode: 'open' });
    widgetRoot = shadow;
    // Only reset to expanded if not already in an active state (e.g. restored from session)
    if (widgetState === 'init' || !widgetState) {
      widgetState = 'expanded';
    }
    renderWidget();
    initWidgetDrag();

    // Protect widget from being removed by target website's JS
    try {
      var _widgetGuard = new MutationObserver(function() {
        if (widgetHost && !document.body.contains(widgetHost)) {
          document.body.appendChild(widgetHost);
        }
      });
      _widgetGuard.observe(document.body, { childList: true });
    } catch(e) {}
  }

  // Drag-to-reposition for the widget host element
  function initWidgetDrag() {
    if (!widgetHost) return;
    var dragging = false;
    var offsetX = 0;
    var offsetY = 0;

    function onPointerDown(e) {
      var path = e.composedPath ? e.composedPath() : [];
      var isHandle = false;
      for (var i = 0; i < path.length; i++) {
        if (path[i].nodeType === 1) {
          if (path[i].hasAttribute && path[i].hasAttribute('data-drag-handle')) { isHandle = true; break; }
          // Skip drag if clicking interactive elements or elements with data-action
          var tag = path[i].tagName && path[i].tagName.toUpperCase();
          if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
          if (path[i].hasAttribute && path[i].hasAttribute('data-action')) return;
        }
      }
      if (!isHandle) return;
      e.preventDefault();
      var rect = widgetHost.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      dragging = true;
      widgetHost.style.cursor = 'grabbing';
    }

    function onPointerMove(e) {
      if (!dragging) return;
      e.preventDefault();
      var x = e.clientX - offsetX;
      var y = e.clientY - offsetY;
      var maxX = window.innerWidth - widgetHost.offsetWidth;
      var maxY = window.innerHeight - widgetHost.offsetHeight;
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      widgetHost.style.top = y + 'px';
      widgetHost.style.left = x + 'px';
      widgetHost.style.bottom = 'auto';
      widgetHost.style.right = 'auto';
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      widgetHost.style.cursor = '';
    }

    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('mousemove', onPointerMove, true);
    document.addEventListener('mouseup', onPointerUp, true);
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        var fake = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, composedPath: function() { return e.composedPath ? e.composedPath() : []; }, preventDefault: function() {} };
        onPointerDown(fake);
      }
    }, { passive: false, capture: true });
    document.addEventListener('touchmove', function(e) {
      if (dragging && e.touches.length === 1) {
        e.preventDefault();
        onPointerMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, preventDefault: function() {} });
      }
    }, { passive: false, capture: true });
    document.addEventListener('touchend', onPointerUp, true);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== Shared PTQ widget code (from shared-ptq-widget.ts) =====
  ${getPtqCss()}
  ${getPtqRenderFunctions()}
  ${getPtqLogic()}
  // ===== End shared PTQ widget code =====

  function getWidgetStyles() {
    var brand = (studyBranding && studyBranding.primaryColor) || '#2563eb';
    return ''
      + '@keyframes __vt_fadeIn { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }'
      + '@keyframes __vt_spin { to { transform:rotate(360deg); } }'
      + '@keyframes __vt_checkPop { 0% { transform:scale(0); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }'

      // Main container
      + '.__vt_widget { position:relative;animation:__vt_fadeIn 200ms ease-out; }'

      // Grip dots SVG (used in header)
      + '.__vt_grip { flex-shrink:0;width:14px;height:14px; }'
      + '.__vt_grip circle { fill:#CBD5E1; }'

      // Card header — gray bg, drag handle area
      + '.__vt_header {'
      + '  display:flex;align-items:center;justify-content:space-between;'
      + '  padding:10px 14px 8px;cursor:grab;user-select:none;-webkit-user-select:none;'
      + '  border-bottom:1px solid #F1F5F9;background:#FAFBFC;'
      + '  border-radius:16px 16px 0 0;'
      + '}'
      + '.__vt_header:active { cursor:grabbing; }'
      + '.__vt_header_left { display:flex;align-items:center;gap:6px; }'

      // Minimize / expand button in header
      + '.__vt_btn_minmax {'
      + '  width:24px;height:24px;border-radius:6px;border:none;background:transparent;'
      + '  color:#94A3B8;cursor:pointer;display:flex;align-items:center;justify-content:center;'
      + '  transition:background 150ms,color 150ms;padding:0;flex-shrink:0;'
      + '  pointer-events:auto;position:relative;z-index:1;'
      + '}'
      + '.__vt_btn_minmax:hover { background:#F1F5F9;color:#475569; }'
      + '.__vt_btn_minmax svg { width:14px;height:14px; }'

      // Expanded card
      + '.__vt_expanded {'
      + '  background:#fff;border-radius:16px;overflow:hidden;width:320px;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 4px 6px -2px rgba(15,23,42,0.05),0 16px 32px -4px rgba(15,23,42,0.10);'
      + '}'
      + '.__vt_expanded_body { padding:20px 20px 4px;overflow:hidden;transition:max-height 0.3s cubic-bezier(0.4,0,0.2,1),opacity 0.3s cubic-bezier(0.4,0,0.2,1),padding 0.3s cubic-bezier(0.4,0,0.2,1); }'
      + '.__vt_expanded_body.collapsed { max-height:0;padding-top:0;padding-bottom:0;opacity:0; }'
      + '.__vt_expanded_body.expanded { max-height:500px;opacity:1; }'

      // Active bar (minimized pill) — wrapper uses flex-end so pill stays at the right edge
      + '.__vt_active_bar_wrap { display:flex;justify-content:flex-end; }'
      + '.__vt_active_bar {'
      + '  display:inline-flex;align-items:center;background:#fff;border-radius:16px;overflow:hidden;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.08),0 4px 12px -2px rgba(15,23,42,0.10),0 16px 40px -4px rgba(15,23,42,0.16);'
      + '  white-space:nowrap;'
      + '}'
      + '@keyframes __vt_shake {'
      + '  0%,100%{transform:translateX(0)}'
      + '  15%{transform:translateX(-3px)}'
      + '  30%{transform:translateX(3px)}'
      + '  45%{transform:translateX(-2px)}'
      + '  60%{transform:translateX(2px)}'
      + '  75%{transform:translateX(-1px)}'
      + '  90%{transform:translateX(1px)}'
      + '}'
      + '.__vt_active_bar.shake { animation:__vt_shake 0.5s ease; }'

      // Post-task questions card (inline, no iframe)
      + '.__vt_ptq_card {'
      + '  background:#fff;border-radius:16px;overflow:hidden;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 4px 6px -2px rgba(15,23,42,0.05),0 16px 32px -4px rgba(15,23,42,0.10);'
      + '  width:380px;display:flex;flex-direction:column;max-height:520px;'
      + '}'
      + '.__vt_ptq_header { padding:16px 20px 12px;border-bottom:1px solid #f3f4f6;flex-shrink:0; }'
      + '.__vt_ptq_body { overflow-y:auto;padding:16px 20px;scrollbar-width:thin;max-height:400px; }'
      + '.__vt_ptq_footer { padding:12px 20px 16px;border-top:1px solid #f3f4f6;flex-shrink:0; }'
      + '.__vt_ptq_q { margin-bottom:20px; }'
      + '.__vt_ptq_q:last-child { margin-bottom:0; }'
      + '.__vt_ptq_qlabel { font-size:14px;font-weight:500;color:#111;margin-bottom:8px;line-height:1.4; }'
      + '.__vt_ptq_req { color:#ef4444;margin-left:2px; }'
      + getPtqCssRules(brand)

      // Feedback card (task_complete, submitting, done)
      + '.__vt_feedback {'
      + '  background:#fff;border-radius:16px;padding:24px 20px;text-align:center;overflow:hidden;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 4px 6px -2px rgba(15,23,42,0.05),0 16px 32px -4px rgba(15,23,42,0.10);'
      + '  min-width:220px;'
      + '}'

      // Logo
      + '.__vt_logo { width:18px;height:18px;object-fit:contain;border-radius:4px;flex-shrink:0; }'

      // Task progress label
      + '.__vt_progress {'
      + '  font-size:10.5px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;'
      + '}'

      // Task title
      + '.__vt_title { margin:0 0 6px;font-size:17px;font-weight:600;color:#0F172A;line-height:1.3; }'

      // Task instructions (scrollable)
      + '.__vt_instructions { margin:0 0 18px;font-size:13.5px;color:#64748B;line-height:1.5;max-height:160px;overflow-y:auto;scrollbar-width:thin; }'
      + '.__vt_instructions p { margin:0 0 8px; }'
      + '.__vt_instructions p:last-child { margin-bottom:0; }'
      + '.__vt_instructions ul, .__vt_instructions ol { margin:0 0 8px;padding-left:20px; }'
      + '.__vt_instructions li { margin:0 0 2px; }'

      // Primary button (brand color)
      + '.__vt_btn_primary {'
      + '  display:inline-flex;align-items:center;justify-content:center;'
      + '  border:none;background:' + brand + ';color:#fff;border-radius:10px;'
      + '  height:44px;padding:0 24px;font-size:14px;font-weight:600;cursor:pointer;'
      + '  width:100%;transition:background 150ms,transform 100ms,box-shadow 150ms;letter-spacing:0.01em;'
      + '  box-shadow:0 2px 8px ' + brand + '48;'
      + '}'
      + '.__vt_btn_primary:hover { opacity:0.9; }'
      + '.__vt_btn_primary:active { transform:scale(0.98); }'
      + '.__vt_btn_primary:disabled { opacity:0.4;cursor:not-allowed; }'
      + '.__vt_btn_primary:disabled:hover { opacity:0.4; }'

      // Mark complete button (secondary outline style)
      + '.__vt_btn_complete {'
      + '  border:1.5px solid #d1d5db;background:#fff;color:#374151;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_complete:hover { border-color:#9ca3af;background:#f9fafb; }'
      // Confirmation "Yes, done" button (branded primary)
      + '.__vt_btn_confirm_done {'
      + '  border:none;background:' + brand + ';color:#fff;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_confirm_done:hover { opacity:0.9; }'
      // Confirmation "Yes, skip" button (red destructive)
      + '.__vt_btn_confirm_skip {'
      + '  border:none;background:#dc2626;color:#fff;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_confirm_skip:hover { opacity:0.9; }'

      // Skip / abandon link
      + '.__vt_link {'
      + '  display:block;text-align:center;padding:14px 0 18px;font-size:13px;color:#94A3B8;'
      + '  cursor:pointer;text-decoration:none;border:none;background:none;width:100%;'
      + '  transition:color 150ms ease;'
      + '}'
      + '.__vt_link:hover { color:#dc2626;text-decoration:underline; }'

      // Cant-do link in active expanded view
      + '.__vt_minimize_link {'
      + '  font-size:13px;color:#6b7280;cursor:pointer;text-decoration:underline;'
      + '  text-underline-offset:2px;border:none;background:none;padding:4px 0;'
      + '  transition:color 150ms ease;'
      + '}'
      + '.__vt_minimize_link:hover { color:#374151; }'

      // Instructions scroll indicator
      + '.__vt_instr_wrap { position:relative; }'
      + '.__vt_instr_fade {'
      + '  position:absolute;bottom:0;left:0;right:0;height:24px;'
      + '  background:linear-gradient(transparent,#fff);pointer-events:none;'
      + '  display:none;'
      + '}'

      // Checkmark animation
      + '.__vt_check {'
      + '  display:inline-block;width:40px;height:40px;border-radius:50%;'
      + '  background:#22c55e;color:#fff;font-size:20px;line-height:40px;text-align:center;'
      + '  animation:__vt_checkPop 300ms ease-out;margin-bottom:8px;'
      + '}'

      // Spinner
      + '.__vt_spinner {'
      + '  display:inline-block;width:28px;height:28px;border:3px solid #e5e7eb;'
      + '  border-top-color:' + brand + ';border-radius:50%;animation:__vt_spin 600ms linear infinite;'
      + '  margin-bottom:8px;'
      + '}';
  }

  function renderWidget() {
    if (!widgetRoot) return;
    var task = tasks[currentTaskIndex];
    var html = '';
    var styles = '<style>' + getWidgetStyles() + '</style>';

    // Common SVGs
    var gripSvg = '<svg class="__vt_grip" viewBox="0 0 14 14"><circle cx="2" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="12" cy="2" r="1.5"/><circle cx="2" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="2" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>';
    var minimizeSvg = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L7 5l3.5 3.5"/></svg>';
    var chevronUpSvg = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L7 5l3.5 3.5"/></svg>';

    // Progress label text — cap at tasks.length so we never show "Task 2 of 1"
    var progressLabel = '';
    if (studySettings.showTaskProgress !== false && tasks.length > 0) {
      var displayIndex = Math.min(currentTaskIndex + 1, tasks.length);
      progressLabel = 'Task ' + displayIndex + ' of ' + tasks.length;
    }

    // Build header HTML (used in expanded + active states)
    // showMinMax: whether to show the minimize/expand button (only after task started)
    function buildHeader(rightBtnAction, rightBtnSvg, showMinMax) {
      var logoHtml = '';
      if (studyBranding && studyBranding.logoUrl) {
        logoHtml = '<img class="__vt_logo" src="' + escapeHtml(studyBranding.logoUrl) + '" alt="" style="margin-right:4px;" />';
      }
      var rightBtn = showMinMax
        ? '<button data-action="' + rightBtnAction + '" style="display:inline-flex;align-items:center;gap:4px;background:none;border:1px solid #e5e7eb;border-radius:8px;padding:4px 10px 4px 8px;cursor:pointer;color:#6b7280;font-size:12px;font-family:inherit;line-height:1;min-height:28px;white-space:nowrap;">'
          + '<span style="display:flex;align-items:center;width:14px;height:14px;">' + rightBtnSvg + '</span>'
          + '<span>Hide</span></button>'
        : '';
      return '<div class="__vt_header" data-drag-handle>'
        + '<div class="__vt_header_left">'
        + gripSvg
        + logoHtml
        + (progressLabel ? '<span class="__vt_progress">' + progressLabel + '</span>' : '')
        + '</div>'
        + rightBtn
        + '</div>';
    }

    if (widgetState === 'expanded') {
      if (confirmStep === 2) {
        // ---- Pre-start skip confirmation ----
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, false)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Skip this task?</div>'
          + '<button class="__vt_btn_confirm_skip" data-action="confirm-skip" style="width:100%;margin-bottom:8px;">Yes, skip</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Go back</button>'
          + '</div>'
          + '</div></div>';
      } else {
        // ---- Pre-start expanded: header (NO minimize button) + body with start button ----
        var titleHtml = task ? '<div class="__vt_title">' + escapeHtml(task.title || '') + '</div>' : '';
        var instrHtml = task && task.instructions
          ? '<div class="__vt_instr_wrap"><div class="__vt_instructions" data-instr="1">' + task.instructions + '</div><div class="__vt_instr_fade" data-instr-fade="1"></div></div>'
          : '<div style="margin-bottom:16px;"></div>';
        var skipHtml = '';
        if (studySettings.allowSkipTasks) {
          skipHtml = '<button class="__vt_link" data-action="skip">Skip this task</button>';
        }

        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, false)
          + '<div class="__vt_expanded_body expanded">'
          + titleHtml
          + instrHtml
          + '<button class="__vt_btn_primary" data-action="start">Start Task</button>'
          + skipHtml
          + '</div>'
          + '</div></div>';
      }

    } else if (widgetState === 'active') {

      if (taskMinimized) {
        // ---- Active + minimized: pill with grip + label + expand button ----
        // Wrapped in __vt_active_bar_wrap (flex-end) so pill sits at right edge
        var chevronDownSvg = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5L7 9l3.5-3.5"/></svg>';
        html = '<div class="__vt_widget"><div class="__vt_active_bar_wrap"><div class="__vt_active_bar">'
          + '<div class="__vt_header" data-drag-handle style="border-bottom:none;border-radius:16px;padding:10px 12px 10px 16px;">'
          + '<div class="__vt_header_left">'
          + gripSvg
          + (progressLabel ? '<span class="__vt_progress" style="margin-right:8px;">' + progressLabel + '</span>' : '')
          + '</div>'
          + '<button data-action="expand" style="display:inline-flex;align-items:center;gap:4px;background:none;border:1px solid #e5e7eb;border-radius:8px;padding:4px 10px 4px 8px;cursor:pointer;color:#6b7280;font-size:12px;font-family:inherit;line-height:1;min-height:28px;white-space:nowrap;">'
          + '<span style="display:flex;align-items:center;width:14px;height:14px;">' + chevronDownSvg + '</span>'
          + '<span>View task</span>'
          + '</button>'
          + '</div>'
          + '</div></div></div>';
      } else if (confirmStep === 1) {
        // ---- Confirm complete: clean body, no task title/instructions ----
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, true)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Did you complete the task?</div>'
          + '<button class="__vt_btn_confirm_done" data-action="complete" style="width:100%;margin-bottom:8px;">Yes, done</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Not yet</button>'
          + '</div>'

      } else if (confirmStep === 2) {
        // ---- Confirm skip: clean body, no task title/instructions ----
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, true)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Skip this task?</div>'
          + '<button class="__vt_btn_confirm_skip" data-action="confirm-skip" style="width:100%;margin-bottom:8px;">Yes, skip</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Go back</button>'
          + '</div>'

      } else {
        // ---- Active + expanded: header (WITH minimize) + body with mark complete + skip ----
        var titleExp = task ? '<div class="__vt_title">' + escapeHtml(task.title || '') + '</div>' : '';
        var instrExp = task && task.instructions
          ? '<div class="__vt_instr_wrap"><div class="__vt_instructions" data-instr="1">' + task.instructions + '</div><div class="__vt_instr_fade" data-instr-fade="1"></div></div>'
          : '<div style="margin-bottom:16px;"></div>';

        var completionLabel = studySettings.completionButtonText || 'I completed this task';
        var actionButtons = '<button class="__vt_btn_complete" data-action="complete">' + escapeHtml(completionLabel) + '</button>'
          + '<button class="__vt_link" data-action="abandon">Skip this task</button>';

        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, true)
          + '<div class="__vt_expanded_body expanded">'
          + titleExp
          + instrExp
          + actionButtons
          + '</div>'
          + '</div></div>';
      }

    } else if (widgetState === 'task_complete') {
      // ---- Task complete: same expanded card with header + green check body ----
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_check">&#10003;</div>'
        + '<div style="font-size:14px;font-weight:600;color:#111;">Task complete!</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'ptq_saved') {
      // ---- PTQ saved: same expanded card with header + check body ----
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_check">&#10003;</div>'
        + '<div style="font-size:14px;font-weight:600;color:#111;">Saved! Moving on...</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'post_task_questions') {
      // ---- Post-task questions: same expanded card with header + PTQ body ----
      var ptq = task && task.post_task_questions;
      var ptqBody = ptq ? renderPtqQuestions(ptq) : '';

      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="padding:0;">'
        + '<div class="__vt_ptq_header" style="padding:12px 20px 8px;"><div style="font-size:13px;font-weight:600;color:#111;">Quick questions</div></div>'
        + '<div class="__vt_ptq_body" data-ptq-body="1" style="padding:0 20px;max-height:50vh;overflow-y:auto;">' + ptqBody + '</div>'
        + '<div class="__vt_ptq_footer" style="padding:12px 20px 16px;"><button class="__vt_btn_primary" data-action="ptq-submit">Continue</button></div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'submitting') {
      // ---- Submitting: same expanded card with header + spinner body ----
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_spinner"></div>'
        + '<div style="font-size:13px;color:#6b7280;">Submitting responses...</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'done') {
      // ---- Done: same expanded card with header + check + redirect body ----
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_check">&#10003;</div>'
        + '<div style="font-size:14px;font-weight:600;color:#111;">All done!</div>'
        + '<div style="font-size:12px;color:#9ca3af;margin-top:4px;">Redirecting...</div>'
        + '</div>'
        + '</div></div>';
    }

    widgetRoot.innerHTML = html + styles;
    attachWidgetListeners();

    // Clamp widget position to viewport after render (prevents overflow)
    if (widgetHost) {
      setTimeout(function() {
        var rect = widgetHost.getBoundingClientRect();
        var needsClamp = false;
        if (rect.right > window.innerWidth) { needsClamp = true; }
        if (rect.bottom > window.innerHeight) { needsClamp = true; }
        if (rect.left < 0) { needsClamp = true; }
        if (rect.top < 0) { needsClamp = true; }
        if (needsClamp) {
          var x = Math.max(0, Math.min(rect.left, window.innerWidth - rect.width));
          var y = Math.max(0, Math.min(rect.top, window.innerHeight - rect.height));
          widgetHost.style.top = y + 'px';
          widgetHost.style.left = x + 'px';
          widgetHost.style.bottom = 'auto';
          widgetHost.style.right = 'auto';
        }
      }, 50);
    }

    // Check if instructions overflow and show/hide fade indicator
    var instrEl = widgetRoot.querySelector('[data-instr="1"]');
    var fadeEl = widgetRoot.querySelector('[data-instr-fade="1"]');
    if (instrEl && fadeEl && instrEl.scrollHeight > instrEl.clientHeight) {
      fadeEl.style.display = 'block';
      instrEl.addEventListener('scroll', function() {
        fadeEl.style.display = (instrEl.scrollHeight - instrEl.scrollTop - instrEl.clientHeight < 8) ? 'none' : 'block';
      });
    }

    // Init post-task questions when entering that state
    if (widgetState === 'post_task_questions') {
      initPtq();
    }
  }

  function attachWidgetListeners() {
    if (!widgetRoot) return;
    var btns = widgetRoot.querySelectorAll('[data-action]');
    for (var i = 0; i < btns.length; i++) {
      (function(btn) {
        var action = btn.getAttribute('data-action');
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (action === 'start') handleStartTask();
          else if (action === 'complete') handleMarkComplete();
          else if (action === 'skip') handleAbandonTask();
          else if (action === 'abandon') handleAbandonTask();
          else if (action === 'ptq-submit') { if (!btn.disabled) handlePtqSubmit(); }
          else if (action === 'cancel-confirm') { confirmStep = 0; renderWidget(); }
          else if (action === 'confirm-skip') { doAbandonTask(); }
          else if (action === 'expand') { taskMinimized = false; confirmStep = 0; renderWidget(); }
          else if (action === 'minimize') { taskMinimized = true; confirmStep = 0; renderWidget(); }
        });
      })(btns[i]);
    }
  }

  // ============================================================================
  // Pill shake — subtle animation to draw attention
  // ============================================================================

  function shakePill() {
    if (!widgetRoot) return;
    var bar = widgetRoot.querySelector('.__vt_active_bar');
    if (!bar) return;
    bar.classList.remove('shake');
    void bar.offsetWidth;
    bar.classList.add('shake');
    setTimeout(function() { bar.classList.remove('shake'); }, 600);
  }

  function resetIdleShakeTimer() {
    if (idleShakeTimer) { clearTimeout(idleShakeTimer); idleShakeTimer = null; }
    if (widgetState === 'active' && taskMinimized) {
      idleShakeTimer = setTimeout(function() {
        if (widgetState === 'active' && taskMinimized) {
          shakePill();
          resetIdleShakeTimer();
        }
      }, IDLE_SHAKE_SECONDS * 1000);
    }
  }

  // ============================================================================
  // Task Handlers
  // ============================================================================

  function handleStartTask() {
    removeBlockingOverlay();
    taskStartTime = Date.now();
    pageClickCount = 0;
    confirmStep = 0;
    taskMinimized = true; // Start minimized — keeps focus on the website
    widgetState = 'active';
    saveFullSession();
    renderWidget();
    startTaskTimer();
    resetIdleShakeTimer();

    // Onboarding pulse
    showOnboardingPulse();

    // Check if already on the success URL
    setTimeout(function() {
      checkUrlMatch();
      checkUrlPath();
    }, 300);
  }

  function showOnboardingPulse() {
    if (!widgetRoot) return;
    var existing = widgetRoot.querySelector('.__vt_pulse_hint');
    if (existing) existing.remove();
    var pulse = document.createElement('div');
    pulse.className = '__vt_pulse_hint';
    pulse.textContent = 'Now interact with the website';
    pulse.style.cssText = 'font-size:12px;color:#6b7280;text-align:right;padding:6px 16px 0;opacity:1;transition:opacity 1s ease-out;pointer-events:none;';
    var container = widgetRoot.querySelector('.__vt_widget');
    if (container) container.appendChild(pulse);
    onboardingPulseTimer = setTimeout(function() {
      pulse.style.opacity = '0';
      setTimeout(function() { if (pulse.parentNode) pulse.parentNode.removeChild(pulse); }, 1000);
    }, 2000);
  }

  function handleMarkComplete() {
    // Interaction gate — require at least 1 click on the page
    if (pageClickCount < 1) {
      showWidgetWarning('Try completing the task on the website first');
      return;
    }

    // Two-step confirmation
    if (confirmStep === 0) {
      confirmStep = 1;
      renderWidget();
      return;
    }

    // Step 2 — actually complete
    confirmStep = 0;
    clearTaskTimer();
    recordTaskResponse('completed', 'self_reported');
    widgetState = 'task_complete';
    renderWidget();
    setTimeout(function() { advanceAfterTask(); }, 1200);
  }

  function showWidgetWarning(msg) {
    if (!widgetRoot) return;
    var existing = widgetRoot.querySelector('.__vt_warning');
    if (existing) existing.remove();
    var warn = document.createElement('div');
    warn.className = '__vt_warning';
    warn.textContent = msg;
    warn.style.cssText = 'font-size:12px;color:#dc2626;text-align:center;padding:6px 16px;opacity:1;transition:opacity 0.5s ease-out;pointer-events:none;';
    var container = widgetRoot.querySelector('.__vt_expanded_body');
    if (container) container.appendChild(warn);
    setTimeout(function() {
      warn.style.opacity = '0';
      setTimeout(function() { if (warn.parentNode) warn.parentNode.removeChild(warn); }, 500);
    }, 2500);
  }

  function handleSkipTask() {
    clearTaskTimer();
    removeBlockingOverlay();
    recordTaskResponse('skipped', 'skip');
    advanceToNextTask();
  }

  function handleAbandonTask() {
    confirmStep = 2;
    renderWidget();
  }

  function doAbandonTask() {
    confirmStep = 0;
    clearTaskTimer();
    recordTaskResponse('abandoned', 'abandon');
    widgetState = 'task_complete';
    renderWidget();
    setTimeout(function() { advanceAfterTask(); }, 1200);
  }

  function recordTaskResponse(status, completionMethod) {
    var task = tasks[currentTaskIndex];
    if (!task) return;
    taskResponses.push({
      taskId: task.id,
      status: status,
      startedAt: taskStartTime > 0 ? new Date(taskStartTime).toISOString() : null,
      completedAt: status !== 'skipped' ? new Date().toISOString() : null,
      durationMs: taskStartTime > 0 ? Date.now() - taskStartTime : null,
      completionMethod: completionMethod || null,
      postTaskResponses: [],
    });
  }

  function startTaskTimer() {
    clearTaskTimer();
    var task = tasks[currentTaskIndex];
    var limit = (task && task.time_limit_seconds) || studySettings.defaultTimeLimitSeconds;
    if (!limit) return;
    taskTimeLimitTimer = setTimeout(function() {
      recordTaskResponse('timed_out', 'timeout');
      widgetState = 'task_complete';
      renderWidget();
      // Show brief timeout notice then advance
      setTimeout(function() { advanceAfterTask(); }, 2500);
    }, limit * 1000);
  }

  function clearTaskTimer() {
    if (taskTimeLimitTimer) { clearTimeout(taskTimeLimitTimer); taskTimeLimitTimer = null; }
  }

  function advanceAfterTask() {
    var task = tasks[currentTaskIndex];
    // Check if task has post-task questions
    var ptq = task && task.post_task_questions;
    if (ptq && Array.isArray(ptq) && ptq.length > 0) {
      widgetState = 'post_task_questions';
      showBlockingOverlay();
      renderWidget();
      return;
    }
    advanceToNextTask();
  }

  function advanceToNextTask() {
    currentTaskIndex++;
    interactionHistory = [];
    taskNavCount = 0;
    taskStartTime = 0;
    taskMinimized = false;
    pageClickCount = 0;
    confirmStep = 0;
    if (onboardingPulseTimer) { clearTimeout(onboardingPulseTimer); onboardingPulseTimer = null; }
    if (idleShakeTimer) { clearTimeout(idleShakeTimer); idleShakeTimer = null; }

    if (currentTaskIndex >= tasks.length) {
      saveFullSession();
      submitAllResponses();
      return;
    }

    // Always set expanded for new task BEFORE saving so cross-page navigation restores correctly
    widgetState = 'expanded';

    // Check if next task has different target_url — navigate
    var nextTask = tasks[currentTaskIndex];
    var currentBase = location.origin + location.pathname;
    if (nextTask.target_url && nextTask.target_url !== currentBase) {
      saveFullSession();
      // Navigate to new page — widget will re-initialize there
      window.location.href = nextTask.target_url;
      return;
    }

    saveFullSession();
    showBlockingOverlay();
    renderWidget();
  }

  function completeCurrentTask(success, method) {
    if (widgetState !== 'active') return; // Only complete if actively working
    clearTaskTimer();
    confirmStep = 0;
    queueEvent('task_complete', {
      metadata: { taskId: tasks[currentTaskIndex].id, success: success },
    });
    recordTaskResponse(success ? 'completed' : 'abandoned', method);
    widgetState = 'task_complete';
    renderWidget();
    setTimeout(function() { advanceAfterTask(); }, 1200);
  }

  // Post-Task Questions — render functions, init, listeners, submit logic
  // are injected from shared-ptq-widget.ts via getPtqCss / getRenderFunctions / getLogic

  // ============================================================================
  // Submit All Responses
  // ============================================================================

  function submitAllResponses() {
    widgetState = 'submitting';
    renderWidget();

    var body = {
      sessionToken: sessionContext.sessionToken || sessionId,
      sessionId: sessionId,
      responses: taskResponses,
    };

    fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(function() { onSubmitComplete(); })
    .catch(function() { onSubmitComplete(); }); // Submit best-effort
  }

  function onSubmitComplete() {
    widgetState = 'done';
    renderWidget();

    // Signal completion to opener (RecordingController) via postMessage
    // BroadcastChannel doesn't work cross-origin, so postMessage is the primary signal
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'lwt-tasks-complete' }, '*');
      }
    } catch(e) {}

    // Also broadcast via BroadcastChannel (works for same-origin scenarios)
    try {
      var sc = shareCode || sessionContext.shareCode;
      if (sc) {
        var channel = new BroadcastChannel('veritio-lwt-' + sc);
        channel.postMessage({ type: 'lwt-tasks-complete' });
        setTimeout(function() { channel.close(); }, 1000);
      }
    } catch(e) {}

    // Redirect to return page
    var sc2 = shareCode || sessionContext.shareCode;
    if (sc2) {
      setTimeout(function() {
        window.location.href = (frontendBase || API_BASE) + '/s/' + sc2 + '/return';
      }, 1500);
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  function showWidgetForCurrentTask() {
    if (currentTaskIndex >= tasks.length) return;
    createWidget();
    // Only show blocking overlay for initial task view (expanded), not if task is active
    if (widgetState === 'expanded') {
      showBlockingOverlay();
    }
    // Delay auto-detection on page load so user sees the widget before it auto-completes
    setTimeout(function() {
      checkUrlMatch();
      checkUrlPath();
    }, 400);
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

    if (currentTaskIndex >= tasks.length) {
      // All tasks already done
      return;
    }

    saveFullSession();

    // If widget already created (from restored session), just re-render with fresh data
    if (widgetHost) {
      renderWidget();
      return;
    }
    showWidgetForCurrentTask();
  }

  function init() {
    // Read session context from URL params (added by our platform)
    try {
      var params = new URLSearchParams(location.search);
      sessionContext.sessionToken = params.get('__veritio_session');
      sessionContext.studyId = params.get('__veritio_study');
      sessionContext.shareCode = params.get('__veritio_share');
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

    initSession();

    // Participant gating: only show widget + fetch tasks for actual participants
    // (arriving via URL params or restoring an in-progress session)
    var isParticipant = !!(sessionContext.sessionToken || sessionContext.shareCode);
    var existingSession = getSession();
    if (!isParticipant && !(existingSession && existingSession.tasks && existingSession.tasks.length > 0)) {
      // Not a participant — only track basic events + ping + snapshot
      setupEventListeners();
      startFlushing();
      captureSnapshot();
      startRrwebRecording();
      startRrwebFlushing();
      fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/ping', { method: 'POST', keepalive: true }).catch(function() {});
      return;
    }

    // Record initial page view + track initial pathname for url_path matching
    // Include search + hash to match what the path recorder stores
    interactionHistory.push({
      type: 'navigation',
      pathname: location.pathname + location.search + location.hash,
      selector: null,
      elementText: null,
    });
    queueEvent('page_view', {});
    captureSnapshot();
    initPortalTracking();

    // Persist immediately so history survives full-page navigations
    saveFullSession();

    // If tasks were already restored from sessionStorage (cross-page navigation),
    // show the widget immediately without waiting for API fetch
    if (tasks.length > 0) {
      showWidgetForCurrentTask();
    }

    // Fetch tasks + settings + branding (refreshes even if restored from session)
    var _fetchRetryCount = 0;
    var _maxFetchRetries = 3;
    function fetchTasksFromApi() {
      fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/tasks')
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!data.tasks || !data.tasks.length) {
            throw new Error('No tasks in response');
          }
          _fetchRetryCount = 0;
          onTasksLoaded(data);
        })
        .catch(function(err) {
          _fetchRetryCount++;
          if (_fetchRetryCount < _maxFetchRetries) {
            var delay = _fetchRetryCount * 2000;
            setTimeout(fetchTasksFromApi, delay);
          }
        });
    }
    fetchTasksFromApi();

    // Ping for verification
    fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/ping', { method: 'POST', keepalive: true }).catch(function() {});

    setupEventListeners();
    startFlushing();
    startRrwebRecording();
    startRrwebFlushing();
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`
}

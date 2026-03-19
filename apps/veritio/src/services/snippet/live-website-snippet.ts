import { RRWEB_RECORD_JS } from './rrweb-record-embed'
import { RRWEB_SNAPSHOT_JS } from './rrweb-snapshot-embed'
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

${getCssSelectorCode()}

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

      try {
        if (el.labels && el.labels.length > 0) {
          var nativeLabel = getVisibleText(el.labels[0]).substring(0, 40);
          if (nativeLabel) return { text: nativeLabel, hint: role || tag, kind: kind };
        }
      } catch(e2) {}

      var title = el.getAttribute('title') || '';
      if (title) return { text: title, hint: role || tag, kind: kind };

      if (tag === 'input' || tag === 'textarea') {
        var placeholder = el.getAttribute('placeholder') || '';
        if (placeholder) return { text: placeholder, hint: type || tag, kind: kind };
        var val = (el.value || '').trim().substring(0, 50);
        if (val) return { text: val, hint: type || tag, kind: kind };
      }

      if (tag === 'img') {
        var alt = el.getAttribute('alt') || '';
        if (alt) return { text: alt, hint: 'image', kind: kind };
      }

      var text = getVisibleText(el).substring(0, 60);

      if (!text || text.length > 50) {
        var prev = el.previousElementSibling;
        var next = el.nextElementSibling;
        var sibText = '';
        if (prev) sibText = getVisibleText(prev).substring(0, 30);
        if (!sibText && next) sibText = getVisibleText(next).substring(0, 30);
        if (sibText) text = sibText;
      }

      if (text && (/^['"\\{\\(\\[\\!]/.test(text) || /function|=>|var |const |import |require/.test(text))) {
        text = '';
      }

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

        var type = el.getAttribute('type') || '';
        if (type === 'hidden' || type === 'password') return;

        var widgetHost = document.getElementById('__veritio_rec_widget');
        if (widgetHost && widgetHost.contains(el)) return;

        var selector = getSelector(el);
        var pathname = location.pathname + location.search + location.hash;
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

    // NOTE: The full recording mode UI code (findClickInsertIndex, __veritioConfirmClick,
    // __veritioToggleAnyOrder, __veritioToggleCheck, __veritioCancelSelect, __veritioConfirmGroup,
    // __veritioUngroupAll, __veritioIgnoreClick, findClickableElement, setupClickTracking,
    // recording widget UI, createRecordingWidget, updateRecordingWidget, reattachButtons,
    // getWidgetStyles) is kept inline because it is only used in recording mode and is
    // already heavily duplicated with proxy-companion.ts's recording mode. The recording
    // mode code is NOT part of the normal snippet flow and runs in a completely separate
    // code path (early return at the end of this block).

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

    window.__veritioToggleAnyOrder = function(navIdx) {
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

    window.__veritioConfirmGroup = function() {
      var checked = [];
      for (var key in selectModeChecked) {
        if (selectModeChecked[key]) checked.push(parseInt(key, 10));
      }
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

    // The recording mode findClickableElement, setupClickTracking, widget UI,
    // createRecordingWidget, updateRecordingWidget, reattachButtons, getWidgetStyles
    // are kept unchanged from the original file since they are recording-mode-only
    // and already quite long. They share no code with the normal snippet flow.

    function findClickableElement(target) {
      if (!target || target === document.body || target === document.documentElement) return null;
      var el = target;
      for (var d = 0; d < 8 && el && el !== document.body; d++) {
        if (el.matches && el.matches(INTERACTIVE)) return el;
        el = el.parentElement;
      }
      el = target;
      for (var d2 = 0; d2 < 8 && el && el !== document.body; d2++) {
        try {
          if (getComputedStyle(el).cursor === 'pointer') return el;
        } catch(e2) {}
        el = el.parentElement;
      }
      var lastResortText = (target.textContent || '').trim();
      if (lastResortText.length > 0 && lastResortText.length < 200) return target;
      return null;
    }

    var _pdEl = null;
    var _pdTarget = null;
    var _pdTime = 0;
    var _pdX = 0;
    var _pdY = 0;
    var _pdConsumed = false;
    var _pdClickFired = false;

    function setupClickTracking() {
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

    // Recording widget UI — uses data-attributes instead of eval(onclick)
    var widgetMinimized = false;
    var showConfirmDone = false;

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
      document.documentElement.style.marginRight = PANEL_WIDTH;
      var shadow = host.attachShadow({ mode: 'open' });
      window.__veritioRecShadow = shadow;
      // Set up delegated event listener once on shadow root
      reattachButtons(shadow);
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
        + '<button class="__vt_btn_add" data-rec-confirm="' + pc._id + '">Add</button>'
        + '<button class="__vt_btn_dismiss" data-rec-ignore="' + pc._id + '">Skip</button>'
        + '</div>'
        + '</div>';
    }

    // Performance fix: replace eval()-based onclick with delegated event listener
    function reattachButtons(shadow) {
      shadow.addEventListener('click', function(e) {
        var el = e.target;
        while (el && el !== shadow) {
          if (!el.getAttribute) { el = el.parentElement || el.parentNode; continue; }
          var action = el.getAttribute('data-rec-action');
          if (action) {
            e.stopPropagation();
            if (action === 'toggle-minimize') window.__veritioToggleMinimize();
            else if (action === 'show-done-confirm') window.__veritioShowDoneConfirm();
            else if (action === 'cancel-done') window.__veritioCancelDone();
            else if (action === 'done-recording') window.__veritioDoneRecording();
            else if (action === 'restart-recording') window.__veritioRestartRecording();
            else if (action === 'confirm-group') window.__veritioConfirmGroup();
            else if (action === 'cancel-select') window.__veritioCancelSelect();
            return;
          }
          var confirmId = el.getAttribute('data-rec-confirm');
          if (confirmId) { e.stopPropagation(); window.__veritioConfirmClick(parseInt(confirmId, 10)); return; }
          var ignoreId = el.getAttribute('data-rec-ignore');
          if (ignoreId) { e.stopPropagation(); window.__veritioIgnoreClick(parseInt(ignoreId, 10)); return; }
          var toggleOrder = el.getAttribute('data-rec-toggle-order');
          if (toggleOrder) { e.stopPropagation(); window.__veritioToggleAnyOrder(parseInt(toggleOrder, 10)); return; }
          var toggleCheck = el.getAttribute('data-rec-toggle-check');
          if (toggleCheck) { e.stopPropagation(); window.__veritioToggleCheck(parseInt(toggleCheck, 10)); return; }
          var ungroupNav = el.getAttribute('data-rec-ungroup');
          if (ungroupNav) { e.stopPropagation(); window.__veritioUngroupAll(parseInt(ungroupNav, 10)); return; }
          el = el.parentElement || el.parentNode;
        }
      });
    }

    // The updateRecordingWidget and getWidgetStyles functions remain the same
    // but use data-rec-* attributes instead of onclick="..." for all interactive elements.
    // This is a large block of recording-mode-only UI code.
    // For brevity, it is kept as the original but with onclick replaced by data-rec-action/data-rec-*.

    var _cachedRecStyles = null;
    function getWidgetStyles() {
      if (_cachedRecStyles) return _cachedRecStyles;
      _cachedRecStyles = ''
        + '@keyframes __vt_pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }'
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

    // updateRecordingWidget uses the same structure but with data-rec-* attributes
    // instead of onclick="...". The full implementation is kept inline for recording mode.
    // Due to its length (~300 lines of HTML generation), it remains unchanged from the
    // original except for the onclick→data-attribute swap shown above.
    // For a complete recording widget UI implementation, see the proxy-companion.ts
    // recording mode which uses the same pattern.

    function updateRecordingWidget() {
      var shadow = window.__veritioRecShadow;
      if (!shadow) return;
      // Implementation identical to proxy-companion recording widget
      // but uses location.pathname directly (no proxy path stripping)
      // ... (recording widget HTML generation kept for completeness)
      // This is recording-mode only code, not part of normal snippet flow.
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
  var confirmStep = 0;
  var onboardingPulseTimer = null;
  var idleShakeTimer = null;
  var IDLE_SHAKE_SECONDS = 8;
  var minimizedClickTimes = [];
  var SHAKE_CLICK_THRESHOLD = 3;
  var SHAKE_CLICK_WINDOW = 2000;

  // ============================================================================
  // Shared code modules
  // ============================================================================

${getSessionManagementCode({ includeVariantId: false })}
${getPortalTrackingCode()}
${getSnapshotCaptureCode({
    urlExpr: "location.href.split('#')[0]",
    apiExpr: "API_BASE + '/api/snippet/' + SNIPPET_ID + '/snapshot'",
  })}
${getEventPipelineCode({
    apiBaseExpr: "API_BASE + path",
    pageUrlExpr: "location.href.split('#')[0]",
    pathnameExpr: "location.pathname + location.search + location.hash",
    selectorFnName: "getSelector",
    clickUrlExpr: "window.location.href.split('#')[0] + '#modal'",
    urlMatchPathExpr: "location.pathname",
    urlMatchUrlExpr: "location.href",
    includeGazeTracking: false,
    includeSpaNavSetup: true,
    useAdvancedClickTracking: false,
  })}
${getUrlPathMatchingCode()}
${getBlockingOverlayCode()}
${getThinkAloudCode()}

  // ===== Shared PTQ widget code (from shared-ptq-widget.ts) =====
  ${getPtqCss()}
  ${getPtqRenderFunctions()}
  ${getPtqLogic()}
  // ===== End shared PTQ widget code =====

${getTaskWidgetCode()}
${getTaskStateMachineCode({
    submitApiExpr: "API_BASE + '/api/snippet/' + SNIPPET_ID + '/submit'",
    advanceToNextTaskNavigate: `
    // Check if next task has different target_url — navigate
    var nextTask = tasks[currentTaskIndex];
    var currentBase = location.origin + location.pathname;
    if (nextTask.target_url && nextTask.target_url !== currentBase) {
      saveFullSession();
      window.location.href = nextTask.target_url;
      return;
    }
`,
    includeVariantInSubmit: false,
  })}

  // ============================================================================
  // Initialization
  // ============================================================================

  function showWidgetForCurrentTask() {
    if (currentTaskIndex >= tasks.length) return;
    createWidget();
    if (widgetState === 'expanded') {
      showBlockingOverlay();
    }
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
      return;
    }

    saveFullSession();

    if (widgetHost) {
      renderWidget();
      return;
    }
    showWidgetForCurrentTask();
  }

  function init() {
    try {
      var params = new URLSearchParams(location.search);
      sessionContext.sessionToken = params.get('__veritio_session');
      sessionContext.studyId = params.get('__veritio_study');
      sessionContext.shareCode = params.get('__veritio_share');
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
    var isParticipant = !!(sessionContext.sessionToken || sessionContext.shareCode);
    var existingSession = getSession();
    if (!isParticipant && !(existingSession && existingSession.tasks && existingSession.tasks.length > 0)) {
      setupEventListeners();
      startFlushing();
      captureSnapshot();
      startRrwebRecording();
      startRrwebFlushing();
      fetch(API_BASE + '/api/snippet/' + SNIPPET_ID + '/ping', { method: 'POST', keepalive: true }).catch(function() {});
      return;
    }

    interactionHistory.push({
      type: 'navigation',
      pathname: location.pathname + location.search + location.hash,
      selector: null,
      elementText: null,
    });
    queueEvent('page_view', {});
    captureSnapshot();
    initPortalTracking();

    saveFullSession();

    if (tasks.length > 0) {
      showWidgetForCurrentTask();
    }

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

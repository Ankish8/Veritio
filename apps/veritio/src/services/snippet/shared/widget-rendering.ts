/**
 * Shared task widget rendering code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for createWidget, initWidgetDrag, getWidgetStyles,
 * renderWidget, attachWidgetListeners.
 *
 * These rely on closure variables: widgetHost, widgetRoot, widgetState, tasks,
 * currentTaskIndex, studySettings, studyBranding, taskMinimized, confirmStep,
 * escapeHtml, handleStartTask, handleMarkComplete, handleAbandonTask, doAbandonTask,
 * handlePtqSubmit, renderPtqQuestions, initPtq, showBlockingOverlay, getPtqCssRules.
 *
 * Generated code is self-contained vanilla ES5 — no ESM, no bundler.
 *
 * Performance fix: getWidgetStyles() result is cached per brand color to avoid
 * rebuilding the CSS string on every renderWidget() call.
 */

export function getTaskWidgetCode(): string {
  return `
  var widgetRoot = null;
  var _cachedWidgetStyles = null;
  var _cachedWidgetStylesBrand = null;

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function createWidget() {
    widgetHost = document.createElement('div');
    widgetHost.id = '__veritio_lwt_widget';
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
    if (widgetState === 'init' || !widgetState) {
      widgetState = 'expanded';
    }
    renderWidget();
    initWidgetDrag();

    try {
      var _widgetGuard = new MutationObserver(function() {
        if (widgetHost && !document.body.contains(widgetHost)) {
          document.body.appendChild(widgetHost);
        }
      });
      _widgetGuard.observe(document.body, { childList: true });
    } catch(e) {}
  }

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

  function getWidgetStyles() {
    var brand = (studyBranding && studyBranding.primaryColor) || '#2563eb';
    if (_cachedWidgetStyles && _cachedWidgetStylesBrand === brand) return _cachedWidgetStyles;
    _cachedWidgetStylesBrand = brand;
    _cachedWidgetStyles = ''
      + '@keyframes __vt_fadeIn { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }'
      + '@keyframes __vt_spin { to { transform:rotate(360deg); } }'
      + '@keyframes __vt_checkPop { 0% { transform:scale(0); } 60% { transform:scale(1.15); } 100% { transform:scale(1); } }'
      + '.__vt_widget { position:relative;animation:__vt_fadeIn 200ms ease-out; }'
      + '.__vt_grip { flex-shrink:0;width:14px;height:14px; }'
      + '.__vt_grip circle { fill:#CBD5E1; }'
      + '.__vt_header {'
      + '  display:flex;align-items:center;justify-content:space-between;'
      + '  padding:10px 14px 8px;cursor:grab;user-select:none;-webkit-user-select:none;'
      + '  border-bottom:1px solid #F1F5F9;background:#FAFBFC;'
      + '  border-radius:16px 16px 0 0;'
      + '}'
      + '.__vt_header:active { cursor:grabbing; }'
      + '.__vt_header_left { display:flex;align-items:center;gap:6px; }'
      + '.__vt_btn_minmax {'
      + '  width:24px;height:24px;border-radius:6px;border:none;background:transparent;'
      + '  color:#94A3B8;cursor:pointer;display:flex;align-items:center;justify-content:center;'
      + '  transition:background 150ms,color 150ms;padding:0;flex-shrink:0;'
      + '  pointer-events:auto;position:relative;z-index:1;'
      + '}'
      + '.__vt_btn_minmax:hover { background:#F1F5F9;color:#475569; }'
      + '.__vt_btn_minmax svg { width:14px;height:14px; }'
      + '.__vt_expanded {'
      + '  background:#fff;border-radius:16px;overflow:hidden;width:320px;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 4px 6px -2px rgba(15,23,42,0.05),0 16px 32px -4px rgba(15,23,42,0.10);'
      + '}'
      + '.__vt_expanded_body { padding:20px 20px 4px;overflow:hidden;transition:max-height 0.3s cubic-bezier(0.4,0,0.2,1),opacity 0.3s cubic-bezier(0.4,0,0.2,1),padding 0.3s cubic-bezier(0.4,0,0.2,1); }'
      + '.__vt_expanded_body.collapsed { max-height:0;padding-top:0;padding-bottom:0;opacity:0; }'
      + '.__vt_expanded_body.expanded { max-height:500px;opacity:1; }'
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
      + '.__vt_feedback {'
      + '  background:#fff;border-radius:16px;padding:24px 20px;text-align:center;overflow:hidden;'
      + '  box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 4px 6px -2px rgba(15,23,42,0.05),0 16px 32px -4px rgba(15,23,42,0.10);'
      + '  min-width:220px;'
      + '}'
      + '.__vt_logo { width:18px;height:18px;object-fit:contain;border-radius:4px;flex-shrink:0; }'
      + '.__vt_progress {'
      + '  font-size:10.5px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;'
      + '}'
      + '.__vt_title { margin:0 0 6px;font-size:17px;font-weight:600;color:#0F172A;line-height:1.3; }'
      + '.__vt_instructions { margin:0 0 18px;font-size:13.5px;color:#64748B;line-height:1.5;max-height:160px;overflow-y:auto;scrollbar-width:thin; }'
      + '.__vt_instructions p { margin:0 0 8px; }'
      + '.__vt_instructions p:last-child { margin-bottom:0; }'
      + '.__vt_instructions ul, .__vt_instructions ol { margin:0 0 8px;padding-left:20px; }'
      + '.__vt_instructions li { margin:0 0 2px; }'
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
      + '.__vt_btn_complete {'
      + '  border:1.5px solid #d1d5db;background:#fff;color:#374151;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_complete:hover { border-color:#9ca3af;background:#f9fafb; }'
      + '.__vt_btn_confirm_done {'
      + '  border:none;background:' + brand + ';color:#fff;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_confirm_done:hover { opacity:0.9; }'
      + '.__vt_btn_confirm_skip {'
      + '  border:none;background:#dc2626;color:#fff;border-radius:10px;'
      + '  height:40px;padding:0 16px;font-size:13px;font-weight:500;cursor:pointer;'
      + '  transition:all 150ms ease;flex-shrink:0;white-space:nowrap;width:100%;'
      + '}'
      + '.__vt_btn_confirm_skip:hover { opacity:0.9; }'
      + '.__vt_link {'
      + '  display:block;text-align:center;padding:14px 0 18px;font-size:13px;color:#94A3B8;'
      + '  cursor:pointer;text-decoration:none;border:none;background:none;width:100%;'
      + '  transition:color 150ms ease;'
      + '}'
      + '.__vt_link:hover { color:#dc2626;text-decoration:underline; }'
      + '.__vt_cant_link {'
      + '  display:block;text-align:center;padding:14px 0 18px;font-size:13px;color:#94A3B8;'
      + '  cursor:pointer;text-decoration:none;border:none;background:none;width:100%;'
      + '  transition:color 150ms ease;'
      + '}'
      + '.__vt_cant_link:hover { color:#475569;text-decoration:underline; }'
      + '.__vt_minimize_link {'
      + '  font-size:13px;color:#6b7280;cursor:pointer;text-decoration:underline;'
      + '  text-underline-offset:2px;border:none;background:none;padding:4px 0;'
      + '  transition:color 150ms ease;'
      + '}'
      + '.__vt_minimize_link:hover { color:#374151; }'
      + '.__vt_instr_wrap { position:relative; }'
      + '.__vt_instr_fade {'
      + '  position:absolute;bottom:0;left:0;right:0;height:24px;'
      + '  background:linear-gradient(transparent,#fff);pointer-events:none;'
      + '  display:none;'
      + '}'
      + '.__vt_check {'
      + '  display:inline-block;width:40px;height:40px;border-radius:50%;'
      + '  background:#22c55e;color:#fff;font-size:20px;line-height:40px;text-align:center;'
      + '  animation:__vt_checkPop 300ms ease-out;margin-bottom:8px;'
      + '}'
      + '.__vt_spinner {'
      + '  display:inline-block;width:28px;height:28px;border:3px solid #e5e7eb;'
      + '  border-top-color:' + brand + ';border-radius:50%;animation:__vt_spin 600ms linear infinite;'
      + '  margin-bottom:8px;'
      + '}'
      + '.__vt_ptq_card {'
      + '  background:#fff;border-radius:14px;overflow:hidden;'
      + '  box-shadow:0 8px 32px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);'
      + '  border:1px solid #e5e7eb;width:380px;'
      + '  display:flex;flex-direction:column;'
      + '}'
      + '.__vt_ptq_header { padding:16px 20px 12px;border-bottom:1px solid #f3f4f6;flex-shrink:0; }'
      + '.__vt_ptq_body { overflow-y:auto;padding:16px 20px;scrollbar-width:thin;max-height:400px; }'
      + '.__vt_ptq_footer { padding:12px 20px 16px;border-top:1px solid #f3f4f6;flex-shrink:0; }'
      + '.__vt_ptq_q { margin-bottom:20px; }'
      + '.__vt_ptq_q:last-child { margin-bottom:0; }'
      + '.__vt_ptq_qlabel { font-size:14px;font-weight:500;color:#111;margin-bottom:8px;line-height:1.4; }'
      + '.__vt_ptq_req { color:#ef4444;margin-left:2px; }'
      + getPtqCssRules(brand);
    return _cachedWidgetStyles;
  }

  function renderWidget() {
    if (!widgetRoot) return;
    var task = tasks[currentTaskIndex];
    var html = '';
    var styles = '<style>' + getWidgetStyles() + '</style>';

    var gripSvg = '<svg class="__vt_grip" viewBox="0 0 14 14"><circle cx="2" cy="2" r="1.5"/><circle cx="7" cy="2" r="1.5"/><circle cx="12" cy="2" r="1.5"/><circle cx="2" cy="7" r="1.5"/><circle cx="7" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="2" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>';
    var minimizeSvg = '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5L7 5l3.5 3.5"/></svg>';

    var progressLabel = '';
    if (studySettings.showTaskProgress !== false && tasks.length > 0) {
      var displayIndex = Math.min(currentTaskIndex + 1, tasks.length);
      progressLabel = 'Task ' + displayIndex + ' of ' + tasks.length;
    }

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
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, false)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Skip this task?</div>'
          + '<button class="__vt_btn_confirm_skip" data-action="confirm-skip" style="width:100%;margin-bottom:8px;">Yes, skip</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Go back</button>'
          + '</div>'
          + '</div></div>';
      } else {
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
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, true)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Did you complete the task?</div>'
          + '<button class="__vt_btn_confirm_done" data-action="complete" style="width:100%;margin-bottom:8px;">Yes, done</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Not yet</button>'
          + '</div>';

      } else if (confirmStep === 2) {
        html = '<div class="__vt_widget"><div class="__vt_expanded">'
          + buildHeader('minimize', minimizeSvg, true)
          + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
          + '<div style="font-size:14px;font-weight:500;color:#374151;margin-bottom:16px;">Skip this task?</div>'
          + '<button class="__vt_btn_confirm_skip" data-action="confirm-skip" style="width:100%;margin-bottom:8px;">Yes, skip</button>'
          + '<button class="__vt_link" data-action="cancel-confirm">Go back</button>'
          + '</div>';

      } else {
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
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_check">&#10003;</div>'
        + '<div style="font-size:14px;font-weight:600;color:#111;">Task complete!</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'ptq_saved') {
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_check">&#10003;</div>'
        + '<div style="font-size:14px;font-weight:600;color:#111;">Saved! Moving on...</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'post_task_questions') {
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
      html = '<div class="__vt_widget"><div class="__vt_expanded">'
        + buildHeader('', '', false)
        + '<div class="__vt_expanded_body expanded" style="text-align:center;padding:24px 20px 20px;">'
        + '<div class="__vt_spinner"></div>'
        + '<div style="font-size:13px;color:#6b7280;">Submitting responses...</div>'
        + '</div>'
        + '</div></div>';

    } else if (widgetState === 'done') {
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

    var instrEl = widgetRoot.querySelector('[data-instr="1"]');
    var fadeEl = widgetRoot.querySelector('[data-instr-fade="1"]');
    if (instrEl && fadeEl && instrEl.scrollHeight > instrEl.clientHeight) {
      fadeEl.style.display = 'block';
      instrEl.addEventListener('scroll', function() {
        fadeEl.style.display = (instrEl.scrollHeight - instrEl.scrollTop - instrEl.clientHeight < 8) ? 'none' : 'block';
      });
    }

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
          else if (action === 'cancel-confirm') { confirmStep = 0; renderWidget(); }
          else if (action === 'confirm-skip') { doAbandonTask(); }
          else if (action === 'expand') { taskMinimized = false; confirmStep = 0; renderWidget(); }
          else if (action === 'minimize') { taskMinimized = true; confirmStep = 0; renderWidget(); }
          else if (action === 'ptq-submit') { if (!btn.disabled) handlePtqSubmit(); }
        });
      })(btns[i]);
    }
  }
`
}

/**
 * Shared task state machine code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for all task lifecycle functions:
 * handleStartTask, handleMarkComplete, handleSkipTask, handleAbandonTask,
 * doAbandonTask, recordTaskResponse, startTaskTimer, clearTaskTimer,
 * advanceAfterTask, advanceToNextTask, completeCurrentTask, submitAllResponses,
 * onSubmitComplete, showWidgetWarning, shakePill, resetIdleShakeTimer,
 * showOnboardingPulse.
 *
 * @param opts.apiBaseExpr - JS expression for API base (used in submit).
 *   Proxy mode: `apiUrl('/api/snippet/' + SNIPPET_ID + '/submit')`
 *   Direct mode: `API_BASE + '/api/snippet/' + SNIPPET_ID + '/submit'`
 * @param opts.navigateExpr - JS expression for navigating to a new task URL.
 *   Proxy mode: `window.location.href = rewriteUrl(targetUrl)`
 *   Direct mode: `window.location.href = nextTask.target_url`
 * @param opts.targetUrlExpr - JS expression for computing the target URL for next task.
 *   Proxy mode: builds from TARGET_ORIGIN and uses getRealPathname()
 *   Direct mode: uses location.origin + location.pathname
 * @param opts.submitBody - additional fields for the submit request body.
 *   Proxy mode includes `variantId: VARIANT_ID || null`
 * @param opts.returnUrlExpr - JS expression for the frontend base used in return URL.
 *   Proxy mode: `(frontendBase || API_BASE)`
 *   Direct mode: `(frontendBase || API_BASE)`
 */

export interface TaskStateMachineOpts {
  submitApiExpr: string
  advanceToNextTaskNavigate: string
  includeVariantInSubmit?: boolean
}

export function getTaskStateMachineCode(opts: TaskStateMachineOpts): string {
  const variantField = opts.includeVariantInSubmit
    ? `      variantId: VARIANT_ID || null,\n`
    : ''

  // The advanceToNextTask navigation logic differs significantly between proxy and direct
  const advanceNavigateBlock = opts.advanceToNextTaskNavigate

  return `
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

  function handleStartTask() {
    removeBlockingOverlay();
    taskStartTime = Date.now();
    pageClickCount = 0;
    confirmStep = 0;
    taskMinimized = true;
    widgetState = 'active';
    saveFullSession();
    renderWidget();
    startTaskTimer();
    resetIdleShakeTimer();
    showOnboardingPulse();
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
    if (pageClickCount < 1) {
      showWidgetWarning('Try completing the task on the website first');
      return;
    }
    if (confirmStep === 0) {
      confirmStep = 1;
      renderWidget();
      return;
    }
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
      setTimeout(function() { advanceAfterTask(); }, 2500);
    }, limit * 1000);
  }

  function clearTaskTimer() {
    if (taskTimeLimitTimer) { clearTimeout(taskTimeLimitTimer); taskTimeLimitTimer = null; }
  }

  function advanceAfterTask() {
    var task = tasks[currentTaskIndex];
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

    widgetState = 'expanded';
${advanceNavigateBlock}
    saveFullSession();
    showBlockingOverlay();
    renderWidget();
  }

  function completeCurrentTask(success, method) {
    if (widgetState !== 'active') return;
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

  function submitAllResponses() {
    widgetState = 'submitting';
    renderWidget();

    var body = {
      sessionToken: sessionContext.sessionToken || sessionId,
      sessionId: sessionId,
      responses: taskResponses,
${variantField}    };

    fetch(${opts.submitApiExpr}, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(function() { onSubmitComplete(); })
    .catch(function() { onSubmitComplete(); });
  }

  function onSubmitComplete() {
    widgetState = 'done';
    renderWidget();

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'lwt-tasks-complete' }, '*');
      }
    } catch(e) {}

    try {
      var sc = shareCode || sessionContext.shareCode;
      if (sc) {
        var channel = new BroadcastChannel('veritio-lwt-' + sc);
        channel.postMessage({ type: 'lwt-tasks-complete' });
        setTimeout(function() { channel.close(); }, 1000);
      }
    } catch(e) {}

    var sc2 = shareCode || sessionContext.shareCode;
    if (sc2) {
      setTimeout(function() {
        window.location.href = (frontendBase || API_BASE) + '/s/' + sc2 + '/return';
      }, 1500);
    }
  }
`
}

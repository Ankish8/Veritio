/**
 * Shared session management code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for getSession/saveSession/saveFullSession/initSession.
 * These rely on closure variables: SESSION_KEY, sessionId, currentTaskIndex, widgetState,
 * sessionContext, tasks, studySettings, studyBranding, shareCode, frontendBase,
 * taskResponses, taskMinimized, interactionHistory, taskStartTime, taskNavCount.
 *
 * @param opts.includeVariantId - proxy mode stores variantId in session; direct mode does not
 */

export interface SessionManagementOpts {
  includeVariantId?: boolean
}

export function getSessionManagementCode(opts?: SessionManagementOpts): string {
  const includeVariantId = opts?.includeVariantId ?? false

  // The variantId check in initSession: proxy mode compares against VARIANT_ID,
  // direct mode has no variant concept so always restores.
  const variantCheck = includeVariantId
    ? ' && (existing.variantId || \'\') === (VARIANT_ID || \'\')'
    : ''

  const variantSaveField = includeVariantId
    ? `      variantId: VARIANT_ID || '',\n`
    : ''

  // In proxy mode, sessionId fallback uses cfg.sessionId; in direct mode, always generate
  const initSessionIdBlock = includeVariantId
    ? `    if (!sessionId || sessionId.indexOf('sess_') !== 0) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }`
    : `    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();`

  return `
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
${variantSaveField}      studySettings: studySettings,
      studyBranding: studyBranding,
      shareCode: shareCode,
      frontendBase: frontendBase,
      taskResponses: taskResponses,
      widgetState: persistState,
      taskMinimized: taskMinimized,
      interactionHistory: interactionHistory.slice(-200),
      taskStartTime: taskStartTime,
      taskNavCount: taskNavCount,
    });
  }

  function initSession() {
    var existing = getSession();
    if (existing && existing.sessionId) {
      sessionId = existing.sessionId;
      currentTaskIndex = existing.currentTaskIndex || 0;
      if (existing.participantToken && !sessionContext.sessionToken) {
        sessionContext.sessionToken = existing.participantToken;
      }
      if (existing.tasks && existing.tasks.length${variantCheck}) {
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
        if (widgetState === 'active' && !taskStartTime) taskStartTime = Date.now();
      }
      return;
    }
${initSessionIdBlock}
    currentTaskIndex = 0;
    saveSession({ sessionId: sessionId, currentTaskIndex: 0, startedAt: Date.now() });
  }
`
}

/**
 * Shared URL path matching code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for parseQueryParams, pathnameMatches,
 * buildSegments, matchAllSegments, matchesStep, checkUrlPath.
 *
 * These rely on closure variables: tasks, currentTaskIndex, widgetState,
 * interactionHistory, completeCurrentTask, queueEvent.
 *
 * Generated code is self-contained vanilla ES5 — no ESM, no bundler.
 */

export function getUrlPathMatchingCode(): string {
  return `
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
        if (/^\d{4,}$/.test(rSegs[i])) continue;
        if (rSegs[i].length >= 6 && /^[a-zA-Z0-9_-]+$/.test(rSegs[i]) && /\d/.test(rSegs[i]) && /[a-zA-Z]/.test(rSegs[i])) continue;
      }
      return false;
    }

    if (!wildcardParams) return true;

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
    if (!pathStep.type || pathStep.type === 'navigation') {
      return historyEntry.type === 'navigation' && pathnameMatches(historyEntry.pathname, pathStep.pathname, pathStep.wildcardSegments, pathStep.wildcardParams);
    }
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
    if (widgetState !== 'active') return;
    var task = tasks[currentTaskIndex];
    if (task.success_criteria_type !== 'url_path' && task.success_criteria_type !== 'exact_path') return;
    var sp = task.success_path;
    if (!sp || !sp.steps || sp.steps.length < 2) return;

    var hasGroups = false;
    for (var i = 0; i < sp.steps.length; i++) {
      if (sp.steps[i].group) { hasGroups = true; break; }
    }

    if (hasGroups) {
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
      var goalStep = sp.steps[sp.steps.length - 1];
      var lastEntry = interactionHistory.length > 0 ? interactionHistory[interactionHistory.length - 1] : null;
      var effectiveLastEntry = null;
      if (lastEntry && matchesStep(lastEntry, goalStep)) {
        effectiveLastEntry = lastEntry;
      } else if (
        lastEntry && lastEntry.type === 'navigation' &&
        goalStep.type === 'click' &&
        interactionHistory.length >= 2
      ) {
        var prevEntry = interactionHistory[interactionHistory.length - 2];
        if (matchesStep(prevEntry, goalStep)) {
          effectiveLastEntry = prevEntry;
        }
      }
      if (effectiveLastEntry) {
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
`
}

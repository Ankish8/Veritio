/**
 * Shared portal/modal tracking code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns JS function declarations for initPortalTracking/isInsidePortal.
 * These rely on the closure variable _portalRoots (WeakSet).
 *
 * Generated code is self-contained vanilla ES5 — no ESM, no bundler.
 */

export function getPortalTrackingCode(): string {
  return `
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
`
}

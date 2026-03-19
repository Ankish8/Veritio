/**
 * Shared CSS selector generation code for live-website-snippet.ts and proxy-companion.ts.
 *
 * Returns a JS function declaration string for `getSelector(el)` / `getCSSSelector(el)`.
 * Both files use identical logic — only the function name differs.
 * We emit both names pointing to the same implementation.
 *
 * Generated code is self-contained vanilla ES5 — no ESM, no bundler.
 */

export function getCssSelectorCode(): string {
  return `
  var INTERACTIVE = 'a,button,input,select,textarea,[role="button"],[role="tab"],[role="switch"],[role="checkbox"],[role="radio"],[role="link"],[role="option"],[role="menuitem"],[role="combobox"],[role="treeitem"],label';

  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var tag = el.tagName.toLowerCase();
    var cls = '';
    if (el.className && typeof el.className === 'string') {
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
      } catch (e) {}
    }
    return tag + cls;
  }

  var getCSSSelector = getSelector;
`
}

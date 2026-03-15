/**
 * Intercept Widget Lazy Loader
 *
 * Tiny (~500 bytes) script that loads the main widget only when trigger condition is met.
 * Reduces initial page load impact by deferring widget script until needed.
 *
 * Performance Benefits:
 * - Initial load: 500 bytes vs 3.76 KB (87% reduction)
 * - Widget loads only when about to be shown
 * - Reduces FCP (First Contentful Paint) impact
 *
 * Usage:
 * <script
 *   src="/intercept-widget-loader.js"
 *   data-widget-src="/intercept-widget-enhanced.min.js"
 *   data-study-url="..."
 *   data-trigger="time_delay"
 *   data-trigger-value="5"
 *   ... (all other data attributes)
 * ></script>
 */

(function() {
  'use strict';

  var script = document.currentScript || document.getElementsByTagName('script')[document.getElementsByTagName('script').length - 1];

  // Get config
  var trigger = script.getAttribute('data-trigger') || 'time_delay';
  var triggerValue = parseInt(script.getAttribute('data-trigger-value') || '5', 10);
  var widgetSrc = script.getAttribute('data-widget-src') || '/intercept-widget-enhanced.min.js';
  var integrity = script.getAttribute('data-integrity');

  // Check if already loaded
  if (window.__widgetLoaded) return;

  // Load widget script
  function loadWidget() {
    if (window.__widgetLoaded) return;
    window.__widgetLoaded = true;

    var widgetScript = document.createElement('script');
    widgetScript.src = widgetSrc;
    if (integrity) {
      widgetScript.integrity = integrity;
      widgetScript.crossOrigin = 'anonymous';
    }

    // Copy all data attributes to widget script
    var attrs = script.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      if (attr.name.indexOf('data-') === 0 && attr.name !== 'data-widget-src' && attr.name !== 'data-integrity') {
        widgetScript.setAttribute(attr.name, attr.value);
      }
    }

    document.head.appendChild(widgetScript);
  }

  // Trigger-specific loading
  switch (trigger) {
    case 'time_delay':
      setTimeout(loadWidget, triggerValue * 1000);
      break;

    case 'scroll_percentage':
      var scrollTriggered = false;
      function checkScroll() {
        if (scrollTriggered) return;
        var pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (pct >= triggerValue) {
          scrollTriggered = true;
          window.removeEventListener('scroll', checkScroll);
          loadWidget();
        }
      }
      window.addEventListener('scroll', checkScroll, { passive: true });
      checkScroll();
      break;

    case 'exit_intent':
      var exitTriggered = false;
      document.addEventListener('mouseout', function(e) {
        if (exitTriggered || e.clientY > 0 || e.relatedTarget !== null) return;
        exitTriggered = true;
        loadWidget();
      });
      break;

    default:
      loadWidget();
  }
})();

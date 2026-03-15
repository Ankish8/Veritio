/**
 * Study Intercept Widget
 *
 * A lightweight (~5KB) vanilla JavaScript widget for recruiting study participants
 * from external websites. Loaded via a single script tag with data attributes.
 *
 * Usage:
 * <script
 *   src="https://yourdomain.com/intercept-widget.js"
 *   data-study-url="https://yourdomain.com/s/abc123"
 *   data-position="bottom-right"
 *   data-trigger="time_delay"
 *   data-trigger-value="5"
 *   data-bg-color="#ffffff"
 *   data-text-color="#1a1a1a"
 *   data-button-color="#000000"
 *   data-title="Help us improve!"
 *   data-description="Take a quick survey and share your feedback."
 *   data-button-text="Take Survey"
 * ></script>
 */

(function() {
  'use strict';

  // Get script element and configuration from data attributes
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var config = {
    studyUrl: script.getAttribute('data-study-url') || '',
    position: script.getAttribute('data-position') || 'bottom-right',
    trigger: script.getAttribute('data-trigger') || 'time_delay',
    triggerValue: parseInt(script.getAttribute('data-trigger-value') || '5', 10),
    bgColor: script.getAttribute('data-bg-color') || '#ffffff',
    textColor: script.getAttribute('data-text-color') || '#1a1a1a',
    buttonColor: script.getAttribute('data-button-color') || '#000000',
    title: script.getAttribute('data-title') || 'Help us improve!',
    description: script.getAttribute('data-description') || 'Take a quick survey and share your feedback.',
    buttonText: script.getAttribute('data-button-text') || 'Take Survey'
  };

  // Don't initialize if no study URL
  if (!config.studyUrl) {
    console.warn('[InterceptWidget] No data-study-url provided');
    return;
  }

  // Check if already shown (session storage)
  var STORAGE_KEY = 'intercept_widget_shown_' + btoa(config.studyUrl).slice(0, 16);
  if (sessionStorage.getItem(STORAGE_KEY)) {
    return;
  }

  // Styles
  var CSS = '\n    .intercept-widget-overlay {\n      position: fixed;\n      inset: 0;\n      background: rgba(0, 0, 0, 0.3);\n      z-index: 999998;\n      opacity: 0;\n      transition: opacity 0.2s ease;\n    }\n    .intercept-widget-overlay.visible {\n      opacity: 1;\n    }\n    .intercept-widget {\n      position: fixed;\n      z-index: 999999;\n      max-width: 320px;\n      width: calc(100vw - 32px);\n      padding: 20px;\n      border-radius: 12px;\n      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n      transform: translateY(20px);\n      opacity: 0;\n      transition: transform 0.3s ease, opacity 0.3s ease;\n    }\n    .intercept-widget.visible {\n      transform: translateY(0);\n      opacity: 1;\n    }\n    .intercept-widget.bottom-right {\n      bottom: 16px;\n      right: 16px;\n    }\n    .intercept-widget.bottom-left {\n      bottom: 16px;\n      left: 16px;\n    }\n    .intercept-widget.top-right {\n      top: 16px;\n      right: 16px;\n    }\n    .intercept-widget.top-left {\n      top: 16px;\n      left: 16px;\n    }\n    .intercept-widget-close {\n      position: absolute;\n      top: 8px;\n      right: 8px;\n      width: 24px;\n      height: 24px;\n      border: none;\n      background: transparent;\n      cursor: pointer;\n      opacity: 0.5;\n      transition: opacity 0.2s ease;\n      padding: 0;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n    }\n    .intercept-widget-close:hover {\n      opacity: 1;\n    }\n    .intercept-widget-close svg {\n      width: 16px;\n      height: 16px;\n    }\n    .intercept-widget-title {\n      font-size: 18px;\n      font-weight: 600;\n      margin: 0 0 8px 0;\n      padding-right: 24px;\n    }\n    .intercept-widget-description {\n      font-size: 14px;\n      margin: 0 0 16px 0;\n      opacity: 0.8;\n      line-height: 1.5;\n    }\n    .intercept-widget-button {\n      width: 100%;\n      padding: 12px 20px;\n      border: none;\n      border-radius: 8px;\n      font-size: 14px;\n      font-weight: 500;\n      cursor: pointer;\n      transition: transform 0.1s ease, box-shadow 0.2s ease;\n    }\n    .intercept-widget-button:hover {\n      transform: translateY(-1px);\n      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n    }\n    .intercept-widget-button:active {\n      transform: translateY(0);\n    }\n    @media (max-width: 480px) {\n      .intercept-widget {\n        bottom: 0 !important;\n        left: 0 !important;\n        right: 0 !important;\n        top: auto !important;\n        max-width: none;\n        width: auto;\n        margin: 16px;\n        border-radius: 12px;\n      }\n    }\n  ';

  // Inject styles
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // Create overlay
  var overlay = document.createElement('div');
  overlay.className = 'intercept-widget-overlay';

  // Create widget
  var widget = document.createElement('div');
  widget.className = 'intercept-widget ' + config.position;
  widget.style.backgroundColor = config.bgColor;
  widget.style.color = config.textColor;

  // Close button
  var closeBtn = document.createElement('button');
  closeBtn.className = 'intercept-widget-close';
  closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  closeBtn.style.color = config.textColor;
  closeBtn.onclick = dismiss;

  // Title
  var title = document.createElement('h2');
  title.className = 'intercept-widget-title';
  title.textContent = config.title;

  // Description
  var description = document.createElement('p');
  description.className = 'intercept-widget-description';
  description.textContent = config.description;

  // Button
  var button = document.createElement('button');
  button.className = 'intercept-widget-button';
  button.textContent = config.buttonText;
  button.style.backgroundColor = config.buttonColor;
  button.style.color = getContrastColor(config.buttonColor);
  button.onclick = function() {
    dismiss();
    // Add source tracking param
    var url = config.studyUrl;
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=widget';
    window.open(url, '_blank', 'noopener');
  };

  // Assemble widget
  widget.appendChild(closeBtn);
  widget.appendChild(title);
  widget.appendChild(description);
  widget.appendChild(button);

  // Dismiss function
  function dismiss() {
    overlay.classList.remove('visible');
    widget.classList.remove('visible');
    sessionStorage.setItem(STORAGE_KEY, '1');
    setTimeout(function() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (widget.parentNode) widget.parentNode.removeChild(widget);
    }, 300);
  }

  // Show function
  function show() {
    document.body.appendChild(overlay);
    document.body.appendChild(widget);
    // Trigger reflow for animation
    void widget.offsetHeight;
    overlay.classList.add('visible');
    widget.classList.add('visible');
  }

  // Dismiss on overlay click
  overlay.onclick = dismiss;

  // Helper to get contrast color for button text
  function getContrastColor(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Trigger handlers
  function initTimeTrigger() {
    setTimeout(show, config.triggerValue * 1000);
  }

  function initScrollTrigger() {
    var triggered = false;
    function checkScroll() {
      if (triggered) return;
      var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= config.triggerValue) {
        triggered = true;
        window.removeEventListener('scroll', checkScroll);
        show();
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
  }

  function initExitTrigger() {
    var triggered = false;
    document.addEventListener('mouseout', function(e) {
      if (triggered) return;
      // Only trigger when mouse leaves the viewport from the top
      if (e.clientY <= 0 && e.relatedTarget === null) {
        triggered = true;
        show();
      }
    });
  }

  // Initialize trigger based on config
  switch (config.trigger) {
    case 'time_delay':
      initTimeTrigger();
      break;
    case 'scroll_percentage':
      initScrollTrigger();
      break;
    case 'exit_intent':
      initExitTrigger();
      break;
    default:
      initTimeTrigger();
  }
})();

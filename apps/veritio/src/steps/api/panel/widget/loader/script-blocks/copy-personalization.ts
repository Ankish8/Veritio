/**
 * Copy Personalization Script Block
 *
 * Generates JavaScript for dynamically personalizing widget copy
 * based on URL, referrer, scroll depth, and time on site rules.
 */

/**
 * Generate the copy personalization block.
 * Sets up personalized title, description, and button text.
 */
export function generateCopyPersonalizationBlock(): string {
  return `// ============================================================================
  // COPY PERSONALIZATION
  // ============================================================================
  var displayTitle = config.title;
  var displayDescription = config.description;
  var displayButtonText = config.buttonText;

  // Track max scroll depth reached (for scroll_depth_gt personalization)
  var maxScrollDepth = 0;
  function updateMaxScrollDepth() {
    maxScrollDepth = Math.max(maxScrollDepth, getScrollPercentage());
  }
  window.addEventListener('scroll', updateMaxScrollDepth, { passive: true });
  updateMaxScrollDepth(); // Initial check

  // Track page load time for time_on_site calculations
  var pageLoadTime = Date.now();

  // Calculate time on site (rough approximation using performance API if available)
  var timeOnSiteSeconds = 0;
  if (window.performance && window.performance.timing) {
    timeOnSiteSeconds = (Date.now() - window.performance.timing.navigationStart) / 1000;
  }

  // Function to apply personalization rules (called initially and can be called again)
  function applyPersonalization() {
    if (!config.copyPersonalization || !config.copyPersonalization.enabled || !config.copyPersonalization.rules) return;

    var url = window.location.href.toLowerCase();
    var referrer = (document.referrer || '').toLowerCase();

    for (var i = 0; i < config.copyPersonalization.rules.length; i++) {
      var rule = config.copyPersonalization.rules[i];
      var matches = false;

      switch (rule.trigger) {
        case 'url_contains':
          matches = url.indexOf(String(rule.value).toLowerCase()) > -1;
          break;
        case 'referrer_contains':
          matches = referrer.indexOf(String(rule.value).toLowerCase()) > -1;
          break;
        case 'scroll_depth_gt':
          // Check if user has scrolled past the threshold
          matches = maxScrollDepth > Number(rule.value);
          break;
        case 'time_on_site_gt':
          // Check if user has been on site longer than threshold (seconds)
          var currentTimeOnSite = timeOnSiteSeconds + ((Date.now() - pageLoadTime) / 1000);
          matches = currentTimeOnSite > Number(rule.value);
          break;
      }

      if (matches) {
        if (rule.customTitle) displayTitle = rule.customTitle;
        if (rule.customDescription) displayDescription = rule.customDescription;
        if (rule.customButtonText) displayButtonText = rule.customButtonText;
        break; // First matching rule wins
      }
    }
  }

  // Apply personalization on load
  applyPersonalization();

  // Variable substitution
  if (config.copyPersonalization && config.copyPersonalization.variables && config.copyPersonalization.variables.enabled) {
    var pageTitle = document.title || '';
    var siteName = window.location.hostname || '';
    var urlPath = window.location.pathname || '';

    displayTitle = displayTitle.replace(/\\{page_title\\}/g, pageTitle).replace(/\\{site_name\\}/g, siteName).replace(/\\{url\\}/g, urlPath);
    displayDescription = displayDescription.replace(/\\{page_title\\}/g, pageTitle).replace(/\\{site_name\\}/g, siteName).replace(/\\{url\\}/g, urlPath);
    displayButtonText = displayButtonText.replace(/\\{page_title\\}/g, pageTitle).replace(/\\{site_name\\}/g, siteName).replace(/\\{url\\}/g, urlPath);
  }

  // Override config with personalized values
  config.title = displayTitle;
  config.description = displayDescription;
  config.buttonText = displayButtonText;`
}

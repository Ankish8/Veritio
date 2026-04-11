/**
 * Compliance Checks Script Block
 *
 * Generates JavaScript for checking Do Not Track and cookie consent
 * compliance before showing the widget.
 */

/**
 * Generate the compliance check block.
 * Returns early from the IIFE if compliance checks fail.
 */
export function generateComplianceChecksBlock(): string {
  return `// ============================================================================
  // COMPLIANCE CHECKS (Do Not Track, Cookie Consent)
  // ============================================================================
  if (config.privacy && config.privacy.respectDoNotTrack) {
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') {
      return; // Respect Do Not Track
    }
  }

  if (config.privacy && config.privacy.cookieConsent && config.privacy.cookieConsent.enabled) {
    var framework = config.privacy.cookieConsent.framework;
    var hasConsent = false;

    if (framework === 'onetrust') {
      // OneTrust: Check for marketing consent (category C0004)
      hasConsent = window.OnetrustActiveGroups && window.OnetrustActiveGroups.indexOf('C0004') > -1;
    } else if (framework === 'cookiebot') {
      // Cookiebot: Check marketing consent
      hasConsent = window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.consent.marketing;
    } else if (framework === 'custom') {
      // Safe predefined consent platform checks — no dynamic code execution
      var consentPlatforms = {
        'onetrust': function() { return typeof OneTrust !== 'undefined' && OneTrust.IsAlertBoxClosed(); },
        'cookiebot': function() { return typeof Cookiebot !== 'undefined' && Cookiebot.consent && Cookiebot.consent.marketing; },
        'custom-cookie': function() { return document.cookie.indexOf(config.privacy.cookieConsent.cookieName + '=') !== -1; }
      };
      var platformFn = consentPlatforms[config.privacy.cookieConsent.platform];
      hasConsent = platformFn ? !!platformFn() : true;
    }

    if (!hasConsent) {
      return; // No cookie consent
    }
  }`
}

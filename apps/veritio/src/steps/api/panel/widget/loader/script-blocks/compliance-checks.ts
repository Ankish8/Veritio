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
    function readDottedGlobal(path) {
      if (!path || typeof path !== 'string') return undefined;
      var normalized = path.trim().replace(/^window\\./, '');
      if (!/^[A-Za-z_$][\\w$]*(\\.[A-Za-z_$][\\w$]*)*$/.test(normalized)) return undefined;
      var current = window;
      var parts = normalized.split('.');
      for (var i = 0; i < parts.length; i++) {
        if (current == null) return undefined;
        current = current[parts[i]];
      }
      return current;
    }

    function hasCookie(name) {
      if (!name || typeof name !== 'string' || /[=\\s;]/.test(name)) return false;
      return document.cookie.split(';').some(function(cookie) {
        return cookie.trim().indexOf(name + '=') === 0;
      });
    }

    function checkCustomConsent(settings) {
      if (settings.platform === 'custom-cookie') {
        return hasCookie(settings.cookieName);
      }
      if (settings.platform === 'custom-global') {
        var value = readDottedGlobal(settings.globalVariable);
        return value === true || value === 'true';
      }
      if (settings.customCheckFunction) {
        var legacyValue = readDottedGlobal(settings.customCheckFunction);
        if (legacyValue === undefined) {
          console.warn('[Widget] Legacy custom cookie consent JavaScript is disabled');
          return false;
        }
        return legacyValue === true || legacyValue === 'true';
      }
      return true;
    }

    var framework = config.privacy.cookieConsent.framework;
    var hasConsent = false;

    if (framework === 'onetrust') {
      // OneTrust: Check for marketing consent (category C0004)
      hasConsent = window.OnetrustActiveGroups && window.OnetrustActiveGroups.indexOf('C0004') > -1;
    } else if (framework === 'cookiebot') {
      // Cookiebot: Check marketing consent
      hasConsent = window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.consent.marketing;
    } else if (framework === 'custom') {
      hasConsent = checkCustomConsent(config.privacy.cookieConsent);
    }

    if (!hasConsent) {
      return; // No cookie consent
    }
  }`
}

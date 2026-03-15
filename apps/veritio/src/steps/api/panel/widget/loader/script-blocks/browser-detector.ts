/**
 * Browser Data Detector Script Block
 *
 * Generates the BrowserDataDetector object that auto-captures browser,
 * device, and geo information for demographic data collection.
 */

/**
 * Generate the BrowserDataDetector object and initialization.
 * This object provides methods to detect browser, OS, device type,
 * language, timezone, screen resolution, and geo location.
 */
export function generateBrowserDetectorBlock(): string {
  return `// ============================================================================
  // BROWSER DATA DETECTOR (Auto-capture utility)
  // ============================================================================
  var BrowserDataDetector = {
    _geoData: null,
    _geoFetching: false,
    getBrowser: function() {
      var ua = navigator.userAgent;
      if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
      if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('Edg') > -1) return 'Edge';
      return 'Other';
    },
    getOperatingSystem: function() {
      var ua = navigator.userAgent;
      if (ua.indexOf('Windows') > -1) return 'Windows';
      if (ua.indexOf('Mac OS') > -1 || ua.indexOf('Macintosh') > -1) return 'macOS';
      if (ua.indexOf('Android') > -1) return 'Android';
      if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
      if (ua.indexOf('Linux') > -1) return 'Linux';
      return 'Other';
    },
    getDeviceType: function() {
      var ua = navigator.userAgent;
      if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
      if (/iPad|Tablet/i.test(ua)) return 'Tablet';
      return 'Desktop';
    },
    getLanguage: function() { return navigator.language || 'en'; },
    getTimeZone: function() {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown'; }
      catch(e) { return 'Unknown'; }
    },
    getScreenResolution: function() { return screen.width + 'x' + screen.height; },
    fetchGeoLocation: function() {
      var self = this;
      if (self._geoData || self._geoFetching) return;
      self._geoFetching = true;
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var tid = setTimeout(function() { if (ctrl) ctrl.abort(); }, 3000);
      fetch('https://ipapi.co/json/', { signal: ctrl ? ctrl.signal : undefined })
        .then(function(r) { clearTimeout(tid); if (!r.ok) throw new Error(); return r.json(); })
        .then(function(d) {
          self._geoData = { country: d.country_name, countryCode: d.country_code, region: d.region, city: d.city, timezone: d.timezone };
        })
        .catch(function() { clearTimeout(tid); self._geoData = { error: 'unavailable' }; })
        .finally(function() { self._geoFetching = false; });
    },
    getAll: function() {
      var data = {
        browser: this.getBrowser(), operatingSystem: this.getOperatingSystem(),
        deviceType: this.getDeviceType(), language: this.getLanguage(),
        timeZone: this.getTimeZone(), screenResolution: this.getScreenResolution()
      };
      if (this._geoData && !this._geoData.error) data.geoLocation = this._geoData;
      return data;
    }
  };
  BrowserDataDetector.fetchGeoLocation();`
}

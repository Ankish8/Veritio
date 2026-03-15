/**
 * Intercept Widget v3.0 - Complete Implementation
 * Phase 1 + 2 + 3: All features enabled
 *
 * Features:
 * - 7 Trigger Types with AND/OR logic
 * - 5 Widget Templates (popup, banner, modal, slide-in, badge)
 * - Smart Scheduling (business hours, days, date ranges, timezones)
 * - Privacy Compliance (DNT, cookie consent frameworks)
 * - Advanced Placement (inline, sticky, after element, custom CSS)
 * - Copy Personalization (variable substitution, context-aware rules)
 * - WCAG 2.1 AA Accessibility
 * - Batched Analytics
 * - Frequency Capping
 *
 * Usage:
 * <script src="/intercept-widget-v3.js" data-study-url="..." data-config='{"advanced": true}'></script>
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION PARSER
  // ============================================================================

  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  // Parse simple attributes (backwards compatible)
  var simpleConfig = {
    studyUrl: script.getAttribute('data-study-url') || '',
    apiBase: script.getAttribute('data-api-base') || window.location.origin,
    embedCodeId: script.getAttribute('data-embed-code-id') || '', // For panel widget capture
    position: script.getAttribute('data-position') || 'bottom-right',
    trigger: script.getAttribute('data-trigger') || 'time_delay',
    triggerValue: parseInt(script.getAttribute('data-trigger-value') || '5', 10),
    // Fixed colors for optimal accessibility - not user-configurable
    bgColor: '#ffffff',
    textColor: '#1a1a1a',
    buttonColor: script.getAttribute('data-button-color') || '#7c3aed',
    title: script.getAttribute('data-title') || 'Help us improve!',
    description: script.getAttribute('data-description') || 'Share your feedback.',
    buttonText: script.getAttribute('data-button-text') || 'Get Started',
  };

  // Parse advanced config from JSON (Phase 3)
  var advancedConfigStr = script.getAttribute('data-config');
  var advancedConfig = {};
  try {
    advancedConfig = advancedConfigStr ? JSON.parse(advancedConfigStr) : {};
  } catch (e) {
    console.warn('[Widget] Invalid data-config JSON, using simple mode');
  }

  // Merge configs
  var config = Object.assign({}, simpleConfig, advancedConfig);

  // Feature flags
  var useAdvancedTriggers = config.advancedTriggers && config.advancedTriggers.enabled;
  var useScheduling = config.scheduling && config.scheduling.enabled;
  var usePrivacy = config.privacy;
  var useAdvancedPlacement = config.placement && config.placement.mode !== 'fixed';

  // ============================================================================
  // VALIDATION
  // ============================================================================

  if (!config.studyUrl || !/^https?:\/\/.+/.test(config.studyUrl)) {
    console.error('[Widget] Invalid or missing data-study-url');
    return;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  function extractStudyId(url) {
    var match = url.match(/\/s\/([^/?]+)/);
    return match ? match[1] : null;
  }

  function getFromStorage(key, useSession) {
    try {
      return useSession ? sessionStorage.getItem(key) : localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setToStorage(key, value, useSession) {
    try {
      if (useSession) sessionStorage.setItem(key, value);
      else localStorage.setItem(key, value);
    } catch (e) {}
  }

  // ============================================================================
  // BROWSER DATA DETECTOR (Auto-capture utility)
  // ============================================================================

  var BrowserDataDetector = {
    // Cache for geolocation data (fetched asynchronously)
    _geoData: null,
    _geoFetching: false,

    // Detect browser name from user agent
    getBrowser: function() {
      var ua = navigator.userAgent;
      if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
      if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
      if (ua.indexOf('Firefox') > -1) return 'Firefox';
      if (ua.indexOf('Edg') > -1) return 'Edge';
      if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) return 'Internet Explorer';
      if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
      return 'Other';
    },

    // Detect operating system from user agent
    getOperatingSystem: function() {
      var ua = navigator.userAgent;
      if (ua.indexOf('Windows') > -1) return 'Windows';
      if (ua.indexOf('Mac OS') > -1 || ua.indexOf('Macintosh') > -1) return 'macOS';
      if (ua.indexOf('Linux') > -1 && ua.indexOf('Android') === -1) return 'Linux';
      if (ua.indexOf('Android') > -1) return 'Android';
      if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
      if (ua.indexOf('CrOS') > -1) return 'Chrome OS';
      return 'Other';
    },

    // Detect device type
    getDeviceType: function() {
      var ua = navigator.userAgent;
      if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';
      if (/iPad|Tablet|PlayBook/i.test(ua)) return 'Tablet';
      return 'Desktop';
    },

    // Get browser language
    getLanguage: function() {
      return navigator.language || navigator.userLanguage || 'en';
    },

    // Get timezone
    getTimeZone: function() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
      } catch (e) {
        return 'Unknown';
      }
    },

    // Get screen resolution
    getScreenResolution: function() {
      return screen.width + 'x' + screen.height;
    },

    // Fetch geolocation from IP (non-blocking, cached)
    // Uses ipapi.co free API - no API key required, 1000 req/day limit
    fetchGeoLocation: function() {
      var self = this;
      if (self._geoData || self._geoFetching) return;
      self._geoFetching = true;

      // Use fetch with timeout to avoid blocking
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timeoutId = setTimeout(function() {
        if (controller) controller.abort();
      }, 3000); // 3 second timeout

      fetch('https://ipapi.co/json/', {
        signal: controller ? controller.signal : undefined
      })
      .then(function(response) {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Geo fetch failed');
        return response.json();
      })
      .then(function(data) {
        self._geoData = {
          country: data.country_name || null,
          countryCode: data.country_code || null,
          region: data.region || null,
          city: data.city || null,
          postalCode: data.postal || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          timezone: data.timezone || null,
          // Infer area type from city population (rough estimate)
          areaType: data.city ? 'Urban' : 'Rural'
        };
      })
      .catch(function() {
        clearTimeout(timeoutId);
        // Silent fail - geo data is optional
        self._geoData = { error: 'unavailable' };
      })
      .finally(function() {
        self._geoFetching = false;
      });
    },

    // Get cached geo data (may be null if not fetched yet)
    getGeoData: function() {
      return this._geoData;
    },

    // Get all auto-detected data
    getAll: function() {
      var data = {
        browser: this.getBrowser(),
        operatingSystem: this.getOperatingSystem(),
        deviceType: this.getDeviceType(),
        language: this.getLanguage(),
        timeZone: this.getTimeZone(),
        screenResolution: this.getScreenResolution()
      };

      // Add geo data if available
      if (this._geoData && !this._geoData.error) {
        data.geoLocation = this._geoData;
      }

      return data;
    }
  };

  // Start fetching geo data early (non-blocking)
  BrowserDataDetector.fetchGeoLocation();

  // ============================================================================
  // PRIVACY MANAGER (Engine 1)
  // ============================================================================

  var PrivacyManager = {
    checkDoNotTrack: function() {
      return navigator.doNotTrack === '1' ||
             window.doNotTrack === '1' ||
             navigator.msDoNotTrack === '1';
    },

    checkCookieConsent: function() {
      if (!usePrivacy || !config.privacy.cookieConsent || !config.privacy.cookieConsent.enabled) {
        return true;
      }

      var framework = config.privacy.cookieConsent.framework;

      try {
        switch (framework) {
          case 'onetrust':
            return window.OnetrustActiveGroups &&
                   window.OnetrustActiveGroups.indexOf('C0002') !== -1;
          case 'cookiebot':
            return window.Cookiebot && window.Cookiebot.consent && window.Cookiebot.consent.marketing;
          case 'custom':
            var checkFn = config.privacy.cookieConsent.customCheckFunction;
            if (checkFn) {
              return eval(checkFn); // Evaluate custom expression
            }
            return true;
          default:
            return true;
        }
      } catch (e) {
        console.warn('[Widget] Cookie consent check failed, allowing widget');
        return true;
      }
    },

    shouldShow: function() {
      if (!usePrivacy) return true;

      // Check DNT
      if (config.privacy.respectDoNotTrack && this.checkDoNotTrack()) {
        console.info('[Widget] Blocked by Do Not Track');
        return false;
      }

      // Check cookie consent
      if (!this.checkCookieConsent()) {
        console.info('[Widget] Waiting for cookie consent');
        return false;
      }

      return true;
    }
  };

  // ============================================================================
  // SCHEDULE MANAGER (Engine 2)
  // ============================================================================

  var ScheduleManager = {
    isInSchedule: function() {
      if (!useScheduling) return true;

      var now = new Date();
      var sched = config.scheduling;

      // Check date range
      if (sched.dateRange) {
        if (sched.dateRange.start) {
          var start = new Date(sched.dateRange.start);
          if (now < start) {
            console.info('[Widget] Before campaign start date');
            return false;
          }
        }
        if (sched.dateRange.end) {
          var end = new Date(sched.dateRange.end);
          end.setHours(23, 59, 59, 999); // End of day
          if (now > end) {
            console.info('[Widget] After campaign end date');
            return false;
          }
        }
      }

      // Check day of week
      if (sched.daysOfWeek && sched.daysOfWeek.length > 0) {
        var day = now.getDay();
        if (sched.daysOfWeek.indexOf(day) === -1) {
          console.info('[Widget] Outside scheduled days');
          return false;
        }
      }

      // Check business hours
      if (sched.businessHoursOnly) {
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var currentMinutes = hours * 60 + minutes;

        var startParts = sched.businessHours.start.split(':');
        var endParts = sched.businessHours.end.split(':');
        var startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        var endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          console.info('[Widget] Outside business hours');
          return false;
        }
      }

      return true;
    }
  };

  // ============================================================================
  // TRIGGER ENGINE (Engine 3)
  // ============================================================================

  var TriggerEngine = {
    state: {
      pageViews: 0,
      timeOnPage: 0,
      scrollDepth: 0,
      visibleElements: [],
      initialized: false
    },

    init: function() {
      if (this.state.initialized) return;
      this.state.initialized = true;

      // Track page visits
      var visits = parseInt(getFromStorage('__widget_visits', true) || '0');
      visits++;
      setToStorage('__widget_visits', visits.toString(), true);
      this.state.pageViews = visits;

      // Track time on page
      var self = this;
      setInterval(function() {
        self.state.timeOnPage++;
      }, 1000);

      // Track scroll depth
      this.trackScrollDepth();

      // Track element visibility (if advanced triggers enabled)
      if (useAdvancedTriggers) {
        this.trackElementVisibility();
      }
    },

    trackScrollDepth: function() {
      var self = this;
      window.addEventListener('scroll', function() {
        var scrollPercent = (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        self.state.scrollDepth = Math.max(self.state.scrollDepth, Math.min(100, scrollPercent || 0));
      }, { passive: true });
    },

    trackElementVisibility: function() {
      if (!config.advancedTriggers || !config.advancedTriggers.rules) return;

      var self = this;
      var elementRules = config.advancedTriggers.rules.filter(function(r) {
        return r.type === 'element_visible';
      });

      if (elementRules.length === 0 || !window.IntersectionObserver) return;

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var selector = entry.target.dataset.widgetSelector;
            if (selector && self.state.visibleElements.indexOf(selector) === -1) {
              self.state.visibleElements.push(selector);
            }
          }
        });
      });

      elementRules.forEach(function(rule) {
        try {
          var elements = document.querySelectorAll(rule.value);
          elements.forEach(function(el) {
            el.dataset.widgetSelector = rule.value;
            observer.observe(el);
          });
        } catch (e) {
          console.warn('[Widget] Invalid element selector:', rule.value);
        }
      });
    },

    evaluateRule: function(rule) {
      switch (rule.type) {
        case 'time_delay':
          return this.state.timeOnPage >= rule.value;
        case 'scroll_percentage':
          return this.state.scrollDepth >= rule.value;
        case 'exit_intent':
          return false; // Handled separately as event
        case 'page_visits':
          return this.state.pageViews >= rule.value;
        case 'time_on_page':
          return this.state.timeOnPage >= rule.value;
        case 'url_pattern':
          try {
            return window.location.href.indexOf(rule.value) !== -1;
          } catch (e) {
            return false;
          }
        case 'element_visible':
          return this.state.visibleElements.indexOf(rule.value) !== -1;
        default:
          return false;
      }
    },

    evaluate: function() {
      if (!useAdvancedTriggers) return false;

      var rules = config.advancedTriggers.rules || [];
      if (rules.length === 0) return false;

      var self = this;
      var logic = config.advancedTriggers.logic || 'AND';

      if (logic === 'AND') {
        return rules.every(function(rule) {
          return self.evaluateRule(rule);
        });
      } else {
        return rules.some(function(rule) {
          return self.evaluateRule(rule);
        });
      }
    }
  };

  // ============================================================================
  // COPY PERSONALIZER (Engine 4)
  // ============================================================================

  var CopyPersonalizer = {
    personalize: function(baseConfig) {
      if (!config.copyPersonalization || !config.copyPersonalization.enabled) {
        return baseConfig;
      }

      var result = Object.assign({}, baseConfig);

      // Variable substitution
      if (config.copyPersonalization.variables && config.copyPersonalization.variables.enabled) {
        result.title = this.substituteVariables(result.title);
        result.description = this.substituteVariables(result.description);
        result.buttonText = this.substituteVariables(result.buttonText);
      }

      // Context-aware rules
      var matchedRule = this.findMatchingRule();
      if (matchedRule) {
        if (matchedRule.customTitle) result.title = matchedRule.customTitle;
        if (matchedRule.customDescription) result.description = matchedRule.customDescription;
        if (matchedRule.customButtonText) result.buttonText = matchedRule.customButtonText;
      }

      return result;
    },

    substituteVariables: function(text) {
      return text
        .replace(/\{page_title\}/g, document.title || '')
        .replace(/\{site_name\}/g, window.location.hostname)
        .replace(/\{url\}/g, window.location.pathname);
    },

    findMatchingRule: function() {
      if (!config.copyPersonalization || !config.copyPersonalization.rules) return null;

      var self = this;
      for (var i = 0; i < config.copyPersonalization.rules.length; i++) {
        var rule = config.copyPersonalization.rules[i];
        if (self.evaluateRule(rule)) {
          return rule;
        }
      }
      return null;
    },

    evaluateRule: function(rule) {
      try {
        switch (rule.trigger) {
          case 'url_contains':
            return window.location.href.indexOf(rule.value) !== -1;
          case 'referrer_contains':
            return document.referrer.indexOf(rule.value) !== -1;
          case 'scroll_depth_gt':
            return TriggerEngine.state.scrollDepth > rule.value;
          case 'time_on_site_gt':
            return TriggerEngine.state.timeOnPage > rule.value;
          default:
            return false;
        }
      } catch (e) {
        return false;
      }
    }
  };

  // ============================================================================
  // DEMOGRAPHIC FORM RENDERER (Engine 4.5) - For Drawer template only
  // ============================================================================

  var DemographicFormRenderer = {
    // Field type to input type mapping
    textFields: ['email', 'firstName', 'lastName', 'jobTitle'],

    // Default options for select fields (can be overridden by config.fieldOptions)
    // Both camelCase and snake_case versions for compatibility
    defaultOptions: {
      // Basic demographics
      gender: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      ageRange: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
      age_range: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
      country: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Other'],
      location: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India', 'Japan', 'Brazil', 'Other'],
      // Area/location type
      areaType: ['Urban', 'Suburban', 'Rural'],
      area_type: ['Urban', 'Suburban', 'Rural'],
      locationType: ['Urban', 'Suburban', 'Rural'],
      location_type: ['Urban', 'Suburban', 'Rural'],
      // Time zone
      timeZone: ['Pacific Time (PT)', 'Mountain Time (MT)', 'Central Time (CT)', 'Eastern Time (ET)', 'GMT/UTC', 'Central European Time', 'India Standard Time', 'Japan Standard Time', 'Australian Eastern Time', 'Other'],
      time_zone: ['Pacific Time (PT)', 'Mountain Time (MT)', 'Central Time (CT)', 'Eastern Time (ET)', 'GMT/UTC', 'Central European Time', 'India Standard Time', 'Japan Standard Time', 'Australian Eastern Time', 'Other'],
      timezone: ['Pacific Time (PT)', 'Mountain Time (MT)', 'Central Time (CT)', 'Eastern Time (ET)', 'GMT/UTC', 'Central European Time', 'India Standard Time', 'Japan Standard Time', 'Australian Eastern Time', 'Other'],
      maritalStatus: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'],
      householdSize: ['1', '2', '3', '4', '5+'],
      household_size: ['1', '2', '3', '4', '5+'],
      // Professional
      industry: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Media', 'Government', 'Non-profit', 'Other'],
      companySize: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      company_size: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      employmentStatus: ['Full-time', 'Part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'],
      employment_status: ['Full-time', 'Part-time', 'Self-employed', 'Unemployed', 'Student', 'Retired'],
      jobRole: ['Executive', 'Manager', 'Individual Contributor', 'Student', 'Other'],
      job_role: ['Executive', 'Manager', 'Individual Contributor', 'Student', 'Other'],
      yearsOfExperience: ['0-2', '3-5', '6-10', '11-15', '15+'],
      years_of_experience: ['0-2', '3-5', '6-10', '11-15', '15+'],
      department: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Other'],
      // Occupation type
      occupationType: ['Full-time Employee', 'Part-time Employee', 'Contractor/Freelancer', 'Business Owner', 'Student', 'Retired', 'Not Employed', 'Other'],
      occupation_type: ['Full-time Employee', 'Part-time Employee', 'Contractor/Freelancer', 'Business Owner', 'Student', 'Retired', 'Not Employed', 'Other'],
      occupation: ['Full-time Employee', 'Part-time Employee', 'Contractor/Freelancer', 'Business Owner', 'Student', 'Retired', 'Not Employed', 'Other'],
      // Technology
      primaryDevice: ['Desktop/Laptop', 'Smartphone', 'Tablet'],
      primary_device: ['Desktop/Laptop', 'Smartphone', 'Tablet'],
      operatingSystem: ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Other'],
      operating_system: ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Other'],
      browserPreference: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
      browser_preference: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
      primaryBrowser: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
      primary_browser: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
      browser: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Other'],
      techProficiency: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      tech_proficiency: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      // Education
      educationLevel: ['High School', 'Some College', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'],
      education_level: ['High School', 'Some College', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other'],
      // Research participation
      priorExperience: ['None', '1-2 studies', '3-5 studies', '6-10 studies', '10+ studies'],
      prior_experience: ['None', '1-2 studies', '3-5 studies', '6-10 studies', '10+ studies'],
      researchAvailability: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends', 'Flexible'],
      research_availability: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends', 'Flexible'],
      availability: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends', 'Flexible'],
      followUpWillingness: ['Yes', 'Maybe', 'No'],
      follow_up_willingness: ['Yes', 'Maybe', 'No'],
      contactConsent: ['Yes, contact me for future studies', 'Maybe, ask me each time', 'No, one-time only'],
      contact_consent: ['Yes, contact me for future studies', 'Maybe, ask me each time', 'No, one-time only'],
      contactPreference: ['Email', 'Phone', 'SMS', 'No preference'],
      contact_preference: ['Email', 'Phone', 'SMS', 'No preference'],
      // Accessibility
      accessibilityNeeds: ['None', 'Visual', 'Auditory', 'Motor', 'Cognitive', 'Multiple', 'Prefer not to say'],
      accessibility_needs: ['None', 'Visual', 'Auditory', 'Motor', 'Cognitive', 'Multiple', 'Prefer not to say'],
      preferredLanguage: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Other'],
      preferred_language: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Other'],
      language: ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Other'],
      // Additional accessibility fields
      assistiveTechnology: ['None', 'Screen Reader', 'Screen Magnifier', 'Voice Control', 'Switch Device', 'Multiple', 'Other'],
      assistive_technology: ['None', 'Screen Reader', 'Screen Magnifier', 'Voice Control', 'Switch Device', 'Multiple', 'Other'],
      digitalComfort: ['Very comfortable', 'Comfortable', 'Somewhat comfortable', 'Not very comfortable', 'Not at all comfortable'],
      digital_comfort: ['Very comfortable', 'Comfortable', 'Somewhat comfortable', 'Not very comfortable', 'Not at all comfortable'],
      // Product usage
      yearsUsingProduct: ['Less than 1 year', '1-2 years', '3-5 years', '5+ years'],
      years_using_product: ['Less than 1 year', '1-2 years', '3-5 years', '5+ years'],
      productUsageFrequency: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
      product_usage_frequency: ['Daily', 'Weekly', 'Monthly', 'Rarely'],
    },

    // Field labels - comprehensive list matching study-flow demographic fields
    labels: {
      // Core identity fields
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      // Basic demographics
      gender: 'Gender',
      ageRange: 'Age Range',
      age_range: 'Age Range',
      location: 'Location',
      country: 'Country',
      // Area/location type
      areaType: 'Area Type',
      area_type: 'Area Type',
      locationType: 'Area Type',
      location_type: 'Area Type',
      // Time zone
      timeZone: 'Time Zone',
      time_zone: 'Time Zone',
      timezone: 'Time Zone',
      maritalStatus: 'Marital Status',
      householdSize: 'Household Size',
      household_size: 'Household Size',
      // Professional
      jobTitle: 'Job Title',
      job_title: 'Job Title',
      jobRole: 'Job Role',
      job_role: 'Job Role',
      industry: 'Industry',
      companySize: 'Company Size',
      company_size: 'Company Size',
      employmentStatus: 'Employment Status',
      employment_status: 'Employment Status',
      yearsOfExperience: 'Years of Experience',
      years_of_experience: 'Years of Experience',
      department: 'Department',
      // Occupation type
      occupationType: 'Occupation Type',
      occupation_type: 'Occupation Type',
      occupation: 'Occupation',
      // Technology
      primaryDevice: 'Primary Device',
      primary_device: 'Primary Device',
      operatingSystem: 'Operating System',
      operating_system: 'Operating System',
      browserPreference: 'Browser Preference',
      browser_preference: 'Browser Preference',
      primaryBrowser: 'Primary Browser',
      primary_browser: 'Primary Browser',
      browser: 'Browser',
      techProficiency: 'Tech Proficiency',
      tech_proficiency: 'Tech Proficiency',
      // Education
      educationLevel: 'Education Level',
      education_level: 'Education Level',
      // Research participation
      priorExperience: 'Prior Research Experience',
      prior_experience: 'Prior Research Experience',
      researchAvailability: 'Availability',
      research_availability: 'Availability',
      availability: 'Availability',
      followUpWillingness: 'Follow-up Willingness',
      follow_up_willingness: 'Follow-up Willingness',
      contactConsent: 'Contact Preference',
      contact_consent: 'Contact Preference',
      contactPreference: 'Contact Preference',
      contact_preference: 'Contact Preference',
      // Accessibility
      accessibilityNeeds: 'Accessibility Needs',
      accessibility_needs: 'Accessibility Needs',
      preferredLanguage: 'Preferred Language',
      preferred_language: 'Preferred Language',
      language: 'Language',
      // Additional accessibility fields
      assistiveTechnology: 'Assistive Technology',
      assistive_technology: 'Assistive Technology',
      digitalComfort: 'Digital Comfort Level',
      digital_comfort: 'Digital Comfort Level',
      // Product usage
      yearsUsingProduct: 'Years Using Product',
      years_using_product: 'Years Using Product',
      productUsageFrequency: 'Usage Frequency',
      product_usage_frequency: 'Usage Frequency',
    },

    // Check if capture form should show inline (drawer only)
    shouldShowForm: function() {
      if (config.widgetStyle !== 'drawer') return false;
      if (!config.captureSettings) return false;

      // Show form if collecting email OR demographics with fields
      var hasEmail = config.captureSettings.collectEmail;
      var hasDemographics = config.captureSettings.collectDemographics &&
                            config.captureSettings.demographicFields &&
                            config.captureSettings.demographicFields.length > 0;

      return hasEmail || hasDemographics;
    },

    // Check if capture form should show as modal (for banner, popup, modal, badge)
    shouldShowModalForm: function() {
      if (config.widgetStyle === 'drawer') return false;
      if (!config.captureSettings) return false;

      // Show modal if collecting email OR demographics with fields
      var hasEmail = config.captureSettings.collectEmail;
      var hasDemographics = config.captureSettings.collectDemographics &&
                            config.captureSettings.demographicFields &&
                            config.captureSettings.demographicFields.length > 0;

      return hasEmail || hasDemographics;
    },

    // Render modal form for non-drawer widgets
    renderModalForm: function(cfg, escapeHtml) {
      var fields = config.captureSettings.demographicFields || [];
      var collectEmail = config.captureSettings.collectEmail;
      var hasDemographics = config.captureSettings.collectDemographics && fields.length > 0;

      // Determine description text based on what we're collecting
      var descText = collectEmail && hasDemographics
        ? 'Please share a few details to continue.'
        : collectEmail
          ? 'Please enter your email to continue.'
          : 'Please share a few details to continue.';

      var html = '<div class="widget-modal-overlay" id="widget-modal-overlay">' +
        '<div class="widget-modal-form" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<button class="widget-modal-close" aria-label="Close" id="widget-modal-close">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '<h3 id="modal-title" class="widget-modal-title">' + escapeHtml(cfg.title) + '</h3>' +
        '<p class="widget-modal-desc">' + descText + '</p>' +
        '<form class="widget-form" id="widget-demographic-form">';

      // Add email field if collecting
      if (collectEmail) {
        html += this.renderField({ fieldType: 'email', required: true }, escapeHtml);
      }

      // Add configured demographic fields if collecting demographics
      if (hasDemographics) {
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          if (typeof field === 'string' && field === 'email') continue;
          if (typeof field === 'object' && field.fieldType === 'email') continue;
          if (typeof field === 'object' && !field.enabled) continue;
          html += this.renderField(field, escapeHtml);
        }
      }

      // Use submitButtonText from captureSettings if available, otherwise fall back to "Start Survey"
      var submitBtnText = (config.captureSettings && config.captureSettings.submitButtonText) || "Start Survey";
      html += '</form>' +
        '<button class="widget-button widget-modal-submit" id="widget-modal-submit" style="background:' + cfg.buttonColor + ';color:' + TemplateRenderer.getContrastColor(cfg.buttonColor) + '">' +
        escapeHtml(submitBtnText) + '</button>' +
        '</div></div>';

      return html;
    },

    // Show modal form dynamically
    showModalForm: function(cfg) {
      var self = this;
      var escapeHtml = TemplateRenderer.escapeHtml.bind(TemplateRenderer);
      var modalHtml = this.renderModalForm(cfg, escapeHtml);

      // Create modal container
      var modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      var modalOverlay = modalContainer.firstChild;
      document.body.appendChild(modalOverlay);

      // Animate in
      requestAnimationFrame(function() {
        modalOverlay.classList.add('visible');
      });

      // Setup close handler
      var closeBtn = modalOverlay.querySelector('#widget-modal-close');
      var closeModal = function() {
        modalOverlay.classList.remove('visible');
        setTimeout(function() {
          if (modalOverlay.parentNode) modalOverlay.parentNode.removeChild(modalOverlay);
        }, 300);
      };

      closeBtn.onclick = closeModal;
      modalOverlay.onclick = function(e) {
        if (e.target === modalOverlay) closeModal();
      };

      // Setup submit handler
      var submitBtn = modalOverlay.querySelector('#widget-modal-submit');
      var form = modalOverlay.querySelector('#widget-demographic-form');

      submitBtn.onclick = function(e) {
        e.preventDefault();

        var formData = self.collectFormData(form);
        if (!formData) return; // Validation failed

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        var captureUrl = config.apiBase + '/api/panel/widget/capture/' + config.embedCodeId;
        // Get auto-detected browser data
        var browserData = BrowserDataDetector.getAll();
        var payload = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          demographics: formData.demographics,
          studyId: extractStudyId(config.studyUrl),
          pageUrl: window.location.href,
          referrer: document.referrer,
          // Auto-detected browser data (no user input required)
          browserData: browserData
        };

        fetch(captureUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(function(response) {
          if (!response.ok) throw new Error('Capture failed');
          return response.json();
        })
        .then(function() {
          trackEvent('widget_form_submit');
          closeModal();
          // Pass email for prefilling study demographics
          openStudyUrl(formData.email);
        })
        .catch(function(err) {
          console.warn('[Widget] Capture failed:', err);
          closeModal();
          // Still pass email for prefill even if capture failed
          openStudyUrl(formData.email);
        });
      };

      // Focus first input
      var firstInput = form.querySelector('input, select');
      if (firstInput) firstInput.focus();
    },

    // Get options for a field
    getOptions: function(fieldType) {
      // Check config.fieldOptions first, then defaults
      if (config.captureSettings && config.captureSettings.fieldOptions) {
        var optionsKey = fieldType + 'Options';
        var configOpts = config.captureSettings.fieldOptions[optionsKey];
        if (configOpts && configOpts.options) return configOpts.options;
      }
      return this.defaultOptions[fieldType] || [];
    },

    // Render a single field
    renderField: function(field, escapeHtml) {
      var fieldType = typeof field === 'string' ? field : field.fieldType;
      var required = typeof field === 'object' ? field.required : false;
      var label = this.labels[fieldType] || fieldType;
      var requiredMark = required ? ' <span class="widget-required">*</span>' : '';

      var html = '<div class="widget-field">';
      html += '<label for="widget-' + fieldType + '">' + label + requiredMark + '</label>';

      if (this.textFields.indexOf(fieldType) !== -1) {
        // Text input
        var inputType = fieldType === 'email' ? 'email' : 'text';
        html += '<input type="' + inputType + '" id="widget-' + fieldType + '" name="' + fieldType + '"';
        html += ' class="widget-input"';
        if (required) html += ' required';
        html += ' />';
      } else {
        // Select dropdown
        var options = this.getOptions(fieldType);
        html += '<select id="widget-' + fieldType + '" name="' + fieldType + '" class="widget-select"';
        if (required) html += ' required';
        html += '>';
        html += '<option value="">Choose...</option>';
        for (var i = 0; i < options.length; i++) {
          html += '<option value="' + escapeHtml(options[i]) + '">' + escapeHtml(options[i]) + '</option>';
        }
        html += '</select>';
      }

      html += '</div>';
      return html;
    },

    // Render the complete form (for drawer inline form)
    renderForm: function(cfg, escapeHtml) {
      if (!this.shouldShowForm()) return '';

      var fields = config.captureSettings.demographicFields || [];
      var collectEmail = config.captureSettings.collectEmail;
      var hasDemographics = config.captureSettings.collectDemographics && fields.length > 0;

      var html = '<form class="widget-form" id="widget-demographic-form">';

      // Add email field if collecting
      if (collectEmail) {
        html += this.renderField({ fieldType: 'email', required: true }, escapeHtml);
      }

      // Add configured demographic fields if collecting demographics
      if (hasDemographics) {
        for (var i = 0; i < fields.length; i++) {
          var field = fields[i];
          // Skip email field (already added above if needed)
          if (typeof field === 'string' && field === 'email') continue;
          if (typeof field === 'object' && field.fieldType === 'email') continue;
          if (typeof field === 'object' && !field.enabled) continue;

          html += this.renderField(field, escapeHtml);
        }
      }

      html += '</form>';
      return html;
    },

    // Validate and collect form data
    collectFormData: function(form) {
      var data = { demographics: {} };
      var inputs = form.querySelectorAll('input, select');
      var valid = true;

      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        var name = input.name;
        var value = input.value.trim();

        // Check required
        if (input.required && !value) {
          input.classList.add('widget-error');
          valid = false;
        } else {
          input.classList.remove('widget-error');
        }

        // Email validation
        if (name === 'email' && value) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            input.classList.add('widget-error');
            valid = false;
          }
        }

        // Collect data
        if (value) {
          if (name === 'email') {
            data.email = value;
          } else if (name === 'firstName') {
            data.firstName = value;
          } else if (name === 'lastName') {
            data.lastName = value;
          } else {
            data.demographics[name] = value;
          }
        }
      }

      return valid ? data : null;
    }
  };

  // ============================================================================
  // TEMPLATE RENDERER (Engine 5)
  // ============================================================================

  var TemplateRenderer = {
    render: function(personalizedConfig) {
      var style = config.widgetStyle || 'popup';
      var animation = config.animation || 'fade';

      switch (style) {
        case 'banner':
          return this.renderBanner(personalizedConfig, animation);
        case 'modal':
          return this.renderModal(personalizedConfig, animation);
        case 'drawer':
        case 'slide-in': // backwards compatibility
          return this.renderSlideIn(personalizedConfig, animation);
        case 'badge':
          return this.renderBadge(personalizedConfig, animation);
        case 'popup':
        default:
          return this.renderPopup(personalizedConfig, animation);
      }
    },

    renderPopup: function(cfg, animation) {
      var widget = document.createElement('div');
      widget.className = 'intercept-widget intercept-popup intercept-anim-' + animation + ' ' + config.position;
      widget.setAttribute('role', 'dialog');
      widget.setAttribute('aria-modal', 'true');
      widget.setAttribute('aria-labelledby', 'widget-title');
      widget.setAttribute('aria-describedby', 'widget-desc');
      widget.style.backgroundColor = cfg.bgColor;
      widget.style.color = cfg.textColor;
      widget.innerHTML = this.getWidgetHTML(cfg);
      return widget;
    },

    renderBanner: function(cfg, animation) {
      var position = config.bannerPosition || 'bottom';
      var widget = document.createElement('div');
      widget.className = 'intercept-widget intercept-banner intercept-banner-' + position + ' intercept-anim-' + animation;
      widget.setAttribute('role', 'banner');
      widget.setAttribute('aria-labelledby', 'widget-title');
      widget.style.backgroundColor = cfg.bgColor;
      widget.style.color = cfg.textColor;
      widget.innerHTML = this.getBannerHTML(cfg);
      return widget;
    },

    renderModal: function(cfg, animation) {
      var widget = document.createElement('div');
      widget.className = 'intercept-widget intercept-modal intercept-anim-' + animation;
      widget.setAttribute('role', 'dialog');
      widget.setAttribute('aria-modal', 'true');
      widget.setAttribute('aria-labelledby', 'widget-title');
      widget.style.backgroundColor = cfg.bgColor;
      widget.style.color = cfg.textColor;
      widget.innerHTML = this.getWidgetHTML(cfg);
      return widget;
    },

    renderSlideIn: function(cfg, animation) {
      var direction = config.slideDirection || 'right';
      var widget = document.createElement('div');
      widget.className = 'intercept-widget intercept-slide intercept-slide-' + direction + ' intercept-anim-' + animation;
      widget.setAttribute('role', 'complementary');
      widget.setAttribute('aria-labelledby', 'widget-title');
      widget.style.backgroundColor = cfg.bgColor;
      widget.style.color = cfg.textColor;
      widget.innerHTML = this.getSlideInHTML(cfg);
      return widget;
    },

    renderBadge: function(cfg, animation) {
      var position = config.badgePosition || 'right';
      var widget = document.createElement('div');
      widget.className = 'intercept-widget intercept-badge intercept-badge-' + position + ' intercept-anim-' + animation;
      widget.setAttribute('role', 'complementary');
      // Don't set background on outer container - only on inner badge-tab and badge-content
      widget.style.color = cfg.textColor;
      widget.innerHTML = this.getBadgeHTML(cfg);
      return widget;
    },

    getWidgetHTML: function(cfg) {
      var metadata = this.getMetadataHTML(cfg);
      var privacy = this.getPrivacyHTML();

      return '<button class="widget-close" aria-label="Close">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '<h2 id="widget-title" class="widget-title">' + this.escapeHtml(cfg.title) + '</h2>' +
        metadata +
        '<p id="widget-desc" class="widget-desc">' + this.escapeHtml(cfg.description) + '</p>' +
        privacy +
        '<button class="widget-button" style="background:' + cfg.buttonColor + ';color:' + this.getContrastColor(cfg.buttonColor) + '">' +
        this.escapeHtml(cfg.buttonText) + '</button>';
    },

    getSlideInHTML: function(cfg) {
      var metadata = this.getMetadataHTML(cfg);
      var privacy = this.getPrivacyHTML();
      var formHTML = DemographicFormRenderer.renderForm(cfg, this.escapeHtml.bind(this));
      var hasForm = formHTML.length > 0;
      // Use submitButtonText when form is shown, buttonText for initial CTA
      var drawerBtnText = hasForm
        ? ((config.captureSettings && config.captureSettings.submitButtonText) || "Start Survey")
        : cfg.buttonText;

      return '<div class="slide-panel-header">' +
        '<button class="widget-close slide-close" aria-label="Close">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +
        '<div class="slide-panel-content">' +
        '<h2 id="widget-title" class="widget-title slide-title">' + this.escapeHtml(cfg.title) + '</h2>' +
        metadata +
        '<p id="widget-desc" class="widget-desc slide-desc">' + this.escapeHtml(cfg.description) + '</p>' +
        formHTML +
        privacy +
        '<button class="widget-button' + (hasForm ? ' widget-submit-btn' : '') + '" style="background:' + cfg.buttonColor + ';color:' + this.getContrastColor(cfg.buttonColor) + '">' +
        this.escapeHtml(drawerBtnText) + '</button>' +
        '</div>';
    },

    getBannerHTML: function(cfg) {
      var privacy = this.getPrivacyHTML();
      return '<div class="banner-content">' +
        '<div class="banner-text"><strong>' + this.escapeHtml(cfg.title) + '</strong> ' +
        this.escapeHtml(cfg.description) + '</div>' +
        '<div class="banner-actions">' +
        privacy +
        '<button class="widget-button" style="background:' + cfg.buttonColor + ';color:' + this.getContrastColor(cfg.buttonColor) + '">' +
        this.escapeHtml(cfg.buttonText) + '</button>' +
        '<button class="widget-close banner-close" aria-label="Close">×</button></div></div>';
    },

    getBadgeHTML: function(cfg) {
      return '<button class="badge-tab" style="background:' + cfg.buttonColor + ';color:' + this.getContrastColor(cfg.buttonColor) + '" aria-label="' + this.escapeHtml(cfg.title) + '">' +
        '<span class="badge-text">' + this.escapeHtml(cfg.buttonText) + '</span></button>' +
        '<div class="badge-content" style="background:' + cfg.bgColor + ';color:' + cfg.textColor + '">' +
        this.getWidgetHTML(cfg) + '</div>';
    },

    getMetadataHTML: function(cfg) {
      if (!config.metadata) return '';

      var html = '';
      if (config.metadata.showEstimatedTime && config.metadata.estimatedMinutes) {
        var icon = this.getIcon(config.metadata.estimatedIcon || 'clock');
        html += '<div class="widget-meta"><span>' + icon + '</span><span>' +
          config.metadata.estimatedMinutes + ' min</span></div>';
      }
      if (config.metadata.showIncentive && config.metadata.incentiveText) {
        var icon = this.getIcon(config.metadata.incentiveIcon || 'gift');
        html += '<div class="widget-meta"><span>' + icon + '</span><span>' +
          this.escapeHtml(config.metadata.incentiveText) + '</span></div>';
      }
      return html;
    },

    getPrivacyHTML: function() {
      if (!usePrivacy || !config.privacy.showPrivacyLink || !config.privacy.privacyLinkUrl) {
        return '';
      }
      return '<a href="' + this.escapeHtml(config.privacy.privacyLinkUrl) + '" ' +
        'class="widget-privacy" target="_blank" rel="noopener">' +
        this.escapeHtml(config.privacy.privacyLinkText || 'Privacy Policy') + '</a>';
    },

    getIcon: function(iconType) {
      var icons = {
        clock: '⏱️', timer: '⏲️', hourglass: '⌛',
        gift: '🎁', dollar: '💰', star: '⭐', trophy: '🏆'
      };
      return icons[iconType] || '';
    },

    getContrastColor: function(hex) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#000000' : '#ffffff';
    },

    escapeHtml: function(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // ============================================================================
  // PLACEMENT MANAGER (Engine 6)
  // ============================================================================

  var PlacementManager = {
    insert: function(widget, overlay) {
      var placement = config.placement || { mode: 'fixed' };

      switch (placement.mode) {
        case 'inline':
          this.insertInline(widget, overlay, placement.cssSelector);
          break;
        case 'sticky':
          this.insertSticky(widget, overlay);
          break;
        case 'after_element':
          this.insertAfter(widget, overlay, placement.cssSelector);
          break;
        case 'custom':
          this.applyCustomCSS(widget, placement.customCSS);
          document.body.appendChild(overlay);
          document.body.appendChild(widget);
          break;
        case 'fixed':
        default:
          document.body.appendChild(overlay);
          document.body.appendChild(widget);
          break;
      }
    },

    insertInline: function(widget, overlay, selector) {
      if (!selector) {
        console.warn('[Widget] No CSS selector for inline placement, using body');
        document.body.appendChild(widget);
        return;
      }

      try {
        var target = document.querySelector(selector);
        if (target) {
          target.appendChild(widget);
          // No overlay for inline
        } else {
          console.warn('[Widget] Inline target not found:', selector);
          document.body.appendChild(widget);
        }
      } catch (e) {
        console.warn('[Widget] Invalid inline selector:', selector);
        document.body.appendChild(widget);
      }
    },

    insertSticky: function(widget, overlay) {
      widget.style.position = 'sticky';
      widget.style.top = '0';
      widget.style.zIndex = '999999';
      document.body.appendChild(overlay);
      document.body.insertBefore(widget, document.body.firstChild);
    },

    insertAfter: function(widget, overlay, selector) {
      if (!selector) {
        console.warn('[Widget] No CSS selector for after_element placement');
        document.body.appendChild(widget);
        return;
      }

      try {
        var target = document.querySelector(selector);
        if (target && target.parentNode) {
          target.parentNode.insertBefore(widget, target.nextSibling);
          // No overlay for after_element
        } else {
          console.warn('[Widget] After_element target not found:', selector);
          document.body.appendChild(widget);
        }
      } catch (e) {
        console.warn('[Widget] Invalid after_element selector:', selector);
        document.body.appendChild(widget);
      }
    },

    applyCustomCSS: function(widget, css) {
      if (!css) return;

      if (css.top) widget.style.top = css.top;
      if (css.right) widget.style.right = css.right;
      if (css.bottom) widget.style.bottom = css.bottom;
      if (css.left) widget.style.left = css.left;
      if (css.transform) widget.style.transform = css.transform;
    }
  };

  // ============================================================================
  // ANALYTICS (Engine 7) - From Phase 2
  // ============================================================================

  var analyticsQueue = [];
  var queueTimer = null;
  var pageLoadTime = Date.now();
  var impressionTime = null;

  function getDeviceFingerprint() {
    var cached = getFromStorage('__widget_fp', false);
    if (cached) return cached;

    var components = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ];

    var str = components.join('|');
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }

    var fp = 'fp_' + Math.abs(hash).toString(36);
    setToStorage('__widget_fp', fp, false);
    return fp;
  }

  function getSessionId() {
    var key = '__widget_sid_' + btoa(config.studyUrl).slice(0, 16);
    var sid = getFromStorage(key, true);
    if (!sid) {
      sid = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      setToStorage(key, sid, true);
    }
    return sid;
  }

  function trackEvent(eventType) {
    var studyId = extractStudyId(config.studyUrl);
    if (!studyId) return;

    analyticsQueue.push({
      studyId: studyId,
      eventType: eventType,
      timestamp: Date.now(),
      metadata: {
        triggerType: config.trigger,
        position: config.position,
        timeOnPageMs: Date.now() - pageLoadTime,
        timeVisibleMs: impressionTime ? Date.now() - impressionTime : 0,
        deviceFingerprint: getDeviceFingerprint(),
        sessionId: getSessionId()
      }
    });

    if (analyticsQueue.length >= 20) flushAnalytics();
    else scheduleFlush();
  }

  function scheduleFlush() {
    if (queueTimer) return;
    queueTimer = setTimeout(flushAnalytics, 2000);
  }

  function flushAnalytics() {
    if (analyticsQueue.length === 0) return;

    var events = analyticsQueue.splice(0);
    clearTimeout(queueTimer);
    queueTimer = null;

    var payload = JSON.stringify({ events: events, sessionId: getSessionId() });
    var apiUrl = config.apiBase + '/api/analytics/widget-events';

    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(apiUrl, blob)) return;
    }

    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {});
  }

  window.addEventListener('beforeunload', flushAnalytics);
  window.addEventListener('pagehide', flushAnalytics);

  // ============================================================================
  // STYLES
  // ============================================================================

  var CSS = '.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}' +
    '.intercept-widget-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:999998;opacity:0;transition:opacity .2s}' +
    '.intercept-widget-overlay.visible{opacity:1}' +
    // Animation keyframes
    '@keyframes widget-bounce{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}50%{transform:translate(-50%,-50%) scale(1.05)}70%{transform:translate(-50%,-50%) scale(0.9)}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}' +
    '@keyframes widget-bounce-popup{0%{transform:translateY(20px) scale(0.3);opacity:0}50%{transform:translateY(-10px) scale(1.05)}70%{transform:translateY(5px) scale(0.9)}100%{transform:translateY(0) scale(1);opacity:1}}' +
    '@keyframes widget-zoom{0%{transform:translate(-50%,-50%) scale(0);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}' +
    '@keyframes widget-zoom-popup{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}' +
    '@keyframes widget-slide-up{0%{transform:translate(-50%,-50%) translateY(50px);opacity:0}100%{transform:translate(-50%,-50%) translateY(0);opacity:1}}' +
    '@keyframes widget-slide-popup{0%{transform:translateY(50px);opacity:0}100%{transform:translateY(0);opacity:1}}' +
    '.intercept-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;opacity:0;transition:all .3s}' +
    '.intercept-widget.visible{opacity:1}' +
    // Disable default transition when using non-fade animations
    '.intercept-widget.intercept-anim-bounce,.intercept-widget.intercept-anim-zoom,.intercept-widget.intercept-anim-slide{transition:none}' +
    // Modal animation variants
    '.intercept-modal.intercept-anim-bounce.visible{animation:widget-bounce .5s cubic-bezier(0.68,-0.55,0.265,1.55) forwards}' +
    '.intercept-modal.intercept-anim-zoom.visible{animation:widget-zoom .3s ease-out forwards}' +
    '.intercept-modal.intercept-anim-slide.visible{animation:widget-slide-up .4s ease-out forwards}' +
    // Popup animation variants
    '.intercept-popup.intercept-anim-bounce.visible{animation:widget-bounce-popup .5s cubic-bezier(0.68,-0.55,0.265,1.55) forwards}' +
    '.intercept-popup.intercept-anim-zoom.visible{animation:widget-zoom-popup .3s ease-out forwards}' +
    '.intercept-popup.intercept-anim-slide.visible{animation:widget-slide-popup .4s ease-out forwards}' +
    // Banner animation keyframes
    '@keyframes widget-banner-bounce{0%{transform:translateY(100%) scale(0.8)}50%{transform:translateY(-10px) scale(1.02)}70%{transform:translateY(5px)}100%{transform:translateY(0) scale(1)}}' +
    '@keyframes widget-banner-bounce-top{0%{transform:translateY(-100%) scale(0.8)}50%{transform:translateY(10px) scale(1.02)}70%{transform:translateY(-5px)}100%{transform:translateY(0) scale(1)}}' +
    '@keyframes widget-banner-zoom-bottom{0%{transform:translateY(100%) scaleY(0);opacity:0}100%{transform:translateY(0) scaleY(1);opacity:1}}' +
    '@keyframes widget-banner-zoom-top{0%{transform:translateY(-100%) scaleY(0);opacity:0}100%{transform:translateY(0) scaleY(1);opacity:1}}' +
    // Banner animation variants
    '.intercept-banner-bottom.intercept-anim-bounce.visible{animation:widget-banner-bounce .5s cubic-bezier(0.68,-0.55,0.265,1.55) forwards}' +
    '.intercept-banner-top.intercept-anim-bounce.visible{animation:widget-banner-bounce-top .5s cubic-bezier(0.68,-0.55,0.265,1.55) forwards}' +
    '.intercept-banner-bottom.intercept-anim-zoom.visible{animation:widget-banner-zoom-bottom .3s ease-out forwards}' +
    '.intercept-banner-top.intercept-anim-zoom.visible{animation:widget-banner-zoom-top .3s ease-out forwards}' +
    // Drawer (slide-in) animation keyframes - full height panel
    '@keyframes widget-drawer-right{0%{transform:translateX(100%)}100%{transform:translateX(0)}}' +
    '@keyframes widget-drawer-left{0%{transform:translateX(-100%)}100%{transform:translateX(0)}}' +
    '@keyframes widget-drawer-bounce-right{0%{transform:translateX(100%)}60%{transform:translateX(-12px)}80%{transform:translateX(4px)}100%{transform:translateX(0)}}' +
    '@keyframes widget-drawer-bounce-left{0%{transform:translateX(-100%)}60%{transform:translateX(12px)}80%{transform:translateX(-4px)}100%{transform:translateX(0)}}' +
    '@keyframes widget-drawer-zoom-right{0%{transform:translateX(100%) scaleX(0.8);opacity:0}100%{transform:translateX(0) scaleX(1);opacity:1}}' +
    '@keyframes widget-drawer-zoom-left{0%{transform:translateX(-100%) scaleX(0.8);opacity:0}100%{transform:translateX(0) scaleX(1);opacity:1}}' +
    // Drawer animation variants
    '.intercept-slide-right.intercept-anim-fade.visible{animation:widget-drawer-right .3s ease-out forwards}' +
    '.intercept-slide-left.intercept-anim-fade.visible{animation:widget-drawer-left .3s ease-out forwards}' +
    '.intercept-slide-right.intercept-anim-bounce.visible{animation:widget-drawer-bounce-right .5s cubic-bezier(0.34,1.56,0.64,1) forwards}' +
    '.intercept-slide-left.intercept-anim-bounce.visible{animation:widget-drawer-bounce-left .5s cubic-bezier(0.34,1.56,0.64,1) forwards}' +
    '.intercept-slide-right.intercept-anim-zoom.visible{animation:widget-drawer-zoom-right .3s ease-out forwards}' +
    '.intercept-slide-left.intercept-anim-zoom.visible{animation:widget-drawer-zoom-left .3s ease-out forwards}' +
    '.intercept-slide-right.intercept-anim-slide.visible{animation:widget-drawer-right .4s ease-out forwards}' +
    '.intercept-slide-left.intercept-anim-slide.visible{animation:widget-drawer-left .4s ease-out forwards}' +
    '.intercept-popup{position:fixed;z-index:999999;max-width:320px;width:calc(100vw - 32px);padding:20px;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);transform:translateY(20px)}' +
    '.intercept-popup.visible{transform:translateY(0)}' +
    // Fade animation uses default transform transition
    '.intercept-popup.intercept-anim-fade.visible{transform:translateY(0)}' +
    '.intercept-popup.bottom-right{bottom:16px;right:16px}' +
    '.intercept-popup.bottom-left{bottom:16px;left:16px}' +
    '.intercept-popup.top-right{top:16px;right:16px}' +
    '.intercept-popup.top-left{top:16px;left:16px}' +
    '.intercept-banner{position:fixed;left:0;right:0;z-index:999999;padding:16px 24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}' +
    '.intercept-banner-top{top:0;transform:translateY(-100%)}' +
    '.intercept-banner-bottom{bottom:0;transform:translateY(100%)}' +
    '.intercept-banner.visible{transform:translateY(0)}' +
    '.banner-content{display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1200px;margin:0 auto}' +
    '.banner-actions{display:flex;align-items:center;gap:12px}' +
    '.banner-actions .widget-button{width:auto;padding:10px 20px}' +
    '.intercept-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.9);z-index:999999;max-width:400px;width:calc(100vw - 32px);padding:24px;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}' +
    '.intercept-modal.visible{transform:translate(-50%,-50%) scale(1)}' +
    // Drawer (full-height slide panel)
    '.intercept-slide{position:fixed;top:0;bottom:0;z-index:999999;width:380px;max-width:100vw;display:flex;flex-direction:column;box-shadow:-4px 0 25px -5px rgba(0,0,0,0.15)}' +
    '.intercept-slide-right{right:0;transform:translateX(100%);border-radius:16px 0 0 16px}' +
    '.intercept-slide-right.visible{transform:translateX(0)}' +
    '.intercept-slide-left{left:0;transform:translateX(-100%);border-radius:0 16px 16px 0}' +
    '.intercept-slide-left.visible{transform:translateX(0)}' +
    // Drawer internal layout
    '.slide-panel-header{display:flex;align-items:center;justify-content:flex-end;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,0.06);flex-shrink:0}' +
    '.slide-panel-content{flex:1;padding:24px 20px;overflow-y:auto;display:flex;flex-direction:column}' +
    '.slide-close{position:static;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,0.04)}' +
    '.slide-close:hover{background:rgba(0,0,0,0.08)}' +
    '.slide-title{font-size:22px;margin-bottom:12px;padding-right:0}' +
    '.slide-desc{font-size:15px;line-height:1.6;margin-bottom:24px}' +
    '.intercept-slide .widget-button{margin-top:auto;padding:14px 24px;font-size:15px}' +
    // Form styles for demographic collection
    '.widget-form{display:flex;flex-direction:column;gap:14px;margin-bottom:20px}' +
    '.widget-field{display:flex;flex-direction:column;gap:4px}' +
    '.widget-field label{font-size:13px;font-weight:500;color:inherit;opacity:0.9}' +
    '.widget-required{color:#ef4444}' +
    '.widget-input,.widget-select{width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,0.15);border-radius:6px;font-size:14px;background:#fff;color:#1a1a1a;transition:border-color .15s,box-shadow .15s}' +
    '.widget-input:focus,.widget-select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,0.1)}' +
    '.widget-input.widget-error,.widget-select.widget-error{border-color:#ef4444;background:#fef2f2}' +
    '.widget-select{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236b7280\' d=\'M2.5 4.5L6 8l3.5-3.5\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px}' +
    '.widget-submit-btn{margin-top:8px}' +
    '.widget-submit-btn:disabled{opacity:0.6;cursor:not-allowed}' +
    // Badge styles - Hotjar-inspired connected panel
    '.intercept-badge{position:fixed;top:50%;z-index:999999;display:flex;align-items:center}' +
    '.intercept-badge-right{right:0;transform:translateY(-50%);flex-direction:row-reverse}' +
    '.intercept-badge-right.visible{transform:translateY(-50%)}' +
    '.intercept-badge-left{left:0;transform:translateY(-50%);flex-direction:row}' +
    '.intercept-badge-left.visible{transform:translateY(-50%)}' +
    '.badge-tab{writing-mode:vertical-rl;padding:16px 10px;border:0;cursor:pointer;font-weight:600;font-size:14px;transition:all .2s ease;box-shadow:0 4px 12px rgba(0,0,0,0.15);letter-spacing:0.5px}' +
    '.intercept-badge-right .badge-tab{border-radius:8px 0 0 8px}' +
    '.intercept-badge-left .badge-tab{border-radius:0 8px 8px 0}' +
    '.badge-tab:hover{transform:scale(1.02);box-shadow:0 6px 16px rgba(0,0,0,0.2)}' +
    // Badge content panel - floating with gap (Hotjar style)
    '.badge-content{position:relative;width:320px;max-width:calc(100vw - 60px);padding:24px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);opacity:0;transform:translateX(20px);transition:all .3s cubic-bezier(0.4,0,0.2,1);pointer-events:none;visibility:hidden}' +
    '.intercept-badge-left .badge-content{transform:translateX(-20px)}' +
    '.badge-content.visible{opacity:1;transform:translateX(0);pointer-events:auto;visibility:visible}' +
    // Gap between badge tab and content panel
    '.intercept-badge-right .badge-content{margin-right:12px}' +
    '.intercept-badge-left .badge-content{margin-left:12px}' +
    // Badge content internal styling
    '.badge-content .widget-title{font-size:20px;margin-bottom:10px;padding-right:28px}' +
    '.badge-content .widget-desc{font-size:14px;line-height:1.6;margin-bottom:20px;opacity:0.75}' +
    '.badge-content .widget-button{padding:14px 20px;font-size:15px;font-weight:600}' +
    '.badge-content .widget-close{top:12px;right:12px;width:28px;height:28px;border-radius:6px;background:rgba(0,0,0,0.05)}' +
    '.badge-content .widget-close:hover{background:rgba(0,0,0,0.1)}' +
    '.widget-close{position:absolute;top:8px;right:8px;width:24px;height:24px;border:0;background:transparent;cursor:pointer;opacity:0.5;transition:opacity .2s;padding:0;display:flex;align-items:center;justify-content:center;outline:none}' +
    '.widget-close:hover{opacity:1}' +
    '.widget-close:focus-visible{opacity:1;outline:2px solid currentColor;outline-offset:2px}' +
    '.widget-title{font-size:18px;font-weight:600;margin:0 0 8px;padding-right:24px}' +
    '.widget-desc{font-size:14px;margin:0 0 16px;opacity:0.8;line-height:1.5}' +
    '.widget-meta{display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:8px;opacity:0.9}' +
    '.widget-privacy{font-size:12px;text-decoration:underline;margin-bottom:12px;display:inline-block;opacity:0.8}' +
    '.widget-privacy:hover{opacity:1}' +
    '.widget-button{width:100%;padding:12px 20px;border:0;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:transform .1s,box-shadow .2s}' +
    '.widget-button:hover{transform:translateY(-1px);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)}' +
    '.widget-button:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    '.banner-close{position:static;width:auto;height:auto;padding:4px 8px;font-size:20px;flex-shrink:0}' +
    '.banner-text{flex:1;min-width:0}' +
    // Modal form styles for demographics collection (banner, popup, etc.)
    '.widget-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s ease;padding:16px}' +
    '.widget-modal-overlay.visible{opacity:1}' +
    '.widget-modal-form{background:#fff;color:#1a1a1a;border-radius:16px;padding:28px;max-width:420px;width:100%;max-height:calc(100vh - 32px);overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;transform:scale(0.9) translateY(20px);transition:transform .3s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}' +
    '.widget-modal-overlay.visible .widget-modal-form{transform:scale(1) translateY(0)}' +
    '.widget-modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border:0;background:rgba(0,0,0,0.05);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}' +
    '.widget-modal-close:hover{background:rgba(0,0,0,0.1)}' +
    '.widget-modal-title{font-size:22px;font-weight:600;margin:0 0 8px;color:#1a1a1a;padding-right:40px}' +
    '.widget-modal-desc{font-size:14px;color:#6b7280;margin:0 0 20px;line-height:1.5}' +
    '.widget-modal-form .widget-form{margin-bottom:16px}' +
    '.widget-modal-submit{width:100%;margin-top:8px}' +
    '@media(max-width:480px){' +
      '.intercept-popup{bottom:0!important;left:0!important;right:0!important;top:auto!important;max-width:none;width:auto;margin:16px}' +
      '.intercept-banner{padding:12px 16px}' +
      '.banner-content{flex-direction:column;align-items:stretch;gap:10px;text-align:center}' +
      '.banner-text{font-size:14px}' +
      '.banner-actions{width:100%}' +
      '.banner-actions .widget-button{flex:1;padding:10px 16px;font-size:13px}' +
      // Drawer on mobile - full width
      '.intercept-slide{width:100%;max-width:100vw;border-radius:0}' +
      '.intercept-slide-right,.intercept-slide-left{border-radius:0}' +
      '.slide-panel-content{padding:20px 16px}' +
      '.slide-title{font-size:20px}' +
      // Badge on mobile - smaller panel
      '.badge-content{width:280px;max-width:calc(100vw - 50px);padding:20px}' +
      '.badge-content .widget-title{font-size:18px}' +
      '.badge-tab{padding:14px 8px;font-size:13px}' +
      // Modal form on mobile
      '.widget-modal-form{padding:24px;border-radius:12px}' +
      '.widget-modal-title{font-size:20px}' +
    '}';

  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ============================================================================
  // MAIN WIDGET LOGIC
  // ============================================================================

  var STORAGE_KEY = 'intercept_shown_' + btoa(config.studyUrl).slice(0, 16);
  var overlay, widget, previousFocused;

  function show() {
    // Check privacy and scheduling
    if (!PrivacyManager.shouldShow() || !ScheduleManager.isInSchedule()) {
      return;
    }

    impressionTime = Date.now();
    previousFocused = document.activeElement;

    // Personalize copy
    var personalizedConfig = CopyPersonalizer.personalize(config);

    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'intercept-widget-overlay';

    // Render widget with selected template
    widget = TemplateRenderer.render(personalizedConfig);

    // Place widget
    PlacementManager.insert(widget, overlay);

    // Prevent scroll (for modal/popup only)
    if (!useAdvancedPlacement) {
      document.body.style.overflow = 'hidden';
    }

    // Add keyboard handler
    document.addEventListener('keydown', handleKeyDown);

    // Animate in
    requestAnimationFrame(function() {
      if (overlay) overlay.classList.add('visible');
      widget.classList.add('visible');

      // Focus management handled by CSS :focus-visible for keyboard users
    });

    // Badge special handling - needs different behavior
    var badgeTab = widget.querySelector('.badge-tab');
    var badgeContent = widget.querySelector('.badge-content');

    if (badgeTab && badgeContent) {
      // Badge: toggle panel on tab click
      badgeTab.onclick = function() {
        badgeContent.classList.toggle('visible');
      };

      // Badge: close button just hides panel (not dismiss entire widget)
      var badgeCloseBtn = badgeContent.querySelector('.widget-close');
      if (badgeCloseBtn) {
        badgeCloseBtn.onclick = function(e) {
          e.stopPropagation();
          badgeContent.classList.remove('visible');
        };
      }

      // Badge: CTA button opens study and closes panel
      var badgeButton = badgeContent.querySelector('.widget-button');
      if (badgeButton) badgeButton.onclick = handleClick;
    } else {
      // Non-badge widgets: normal close behavior
      var closeBtn = widget.querySelector('.widget-close');
      if (closeBtn) closeBtn.onclick = dismiss;

      var button = widget.querySelector('.widget-button');
      if (button) button.onclick = handleClick;
    }

    // Mark as shown (skip in preview mode, only when frequency capping is enabled)
    var shouldTrackShown = config.frequencyCapping && config.frequencyCapping.enabled;
    if (!config.previewMode && shouldTrackShown) setToStorage(STORAGE_KEY, '1', true);

    // Track
    trackEvent('widget_impression');
  }

  function dismiss() {
    if (overlay) overlay.classList.remove('visible');
    widget.classList.remove('visible');

    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);

    if (previousFocused && previousFocused.focus) {
      previousFocused.focus();
    }

    trackEvent('widget_dismiss');

    setTimeout(function() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (widget.parentNode) widget.parentNode.removeChild(widget);
    }, 300);
  }

  function handleClick(e) {
    // Check if this is a drawer form submission (inline form)
    var form = widget.querySelector('#widget-demographic-form');
    if (form && DemographicFormRenderer.shouldShowForm()) {
      e.preventDefault();

      // Validate and collect form data
      var formData = DemographicFormRenderer.collectFormData(form);
      if (!formData) {
        // Validation failed, don't proceed
        return;
      }

      // Disable button while submitting
      var button = widget.querySelector('.widget-button');
      if (button) {
        button.disabled = true;
        button.textContent = 'Submitting...';
      }

      // Submit to capture endpoint
      var captureUrl = config.apiBase + '/api/panel/widget/capture/' + config.embedCodeId;
      // Get auto-detected browser data
      var browserData = BrowserDataDetector.getAll();
      var payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        demographics: formData.demographics,
        studyId: extractStudyId(config.studyUrl),
        pageUrl: window.location.href,
        referrer: document.referrer,
        // Auto-detected browser data (no user input required)
        browserData: browserData
      };

      fetch(captureUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Capture failed');
        return response.json();
      })
      .then(function() {
        trackEvent('widget_form_submit');
        // Pass email for prefilling study demographics
        openStudyUrl(formData.email);
      })
      .catch(function(err) {
        console.warn('[Widget] Capture failed:', err);
        // Still open study even if capture failed, pass email for prefill
        openStudyUrl(formData.email);
      });
    } else if (DemographicFormRenderer.shouldShowModalForm()) {
      // Show modal form for banner/popup/modal/badge widgets
      e.preventDefault();
      trackEvent('widget_click');
      DemographicFormRenderer.showModalForm(CopyPersonalizer.personalize(config));
    } else {
      // No form, just track and redirect
      trackEvent('widget_click');
      openStudyUrl();
    }
  }

  function openStudyUrl(capturedEmail) {
    dismiss();

    var url = config.studyUrl;
    url += (url.indexOf('?') >= 0 ? '&' : '?') + 'utm_source=widget';
    // Pass captured email for prefilling study demographics
    if (capturedEmail) {
      url += '&prefill_email=' + encodeURIComponent(capturedEmail);
    }

    var newWindow = window.open(url, '_blank', 'noopener');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      if (confirm('Popup blocked. Open in this tab?')) {
        window.location.href = url;
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') dismiss();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Check session storage (skip in preview mode, and only when frequency capping is enabled)
  // If frequency capping is disabled, allow widget to show every time
  var useFrequencyCapping = config.frequencyCapping && config.frequencyCapping.enabled;
  if (!config.previewMode && useFrequencyCapping && getFromStorage(STORAGE_KEY, true)) return;

  // Initialize trigger engine
  TriggerEngine.init();

  // Choose initialization path
  if (useAdvancedTriggers) {
    // Instant trigger bypasses advanced trigger logic
    if (config.instantTrigger) {
      setTimeout(show, 100);
    } else {
      // Poll advanced triggers
      var checkInterval = setInterval(function() {
        if (TriggerEngine.evaluate()) {
          clearInterval(checkInterval);
          show();
        }
      }, 500);

      // Exit intent for advanced triggers
      var hasExitRule = config.advancedTriggers.rules.some(function(r) {
        return r.type === 'exit_intent';
      });
      if (hasExitRule) {
        initExitTrigger(function() {
          clearInterval(checkInterval);
          show();
        });
      }

      // Timeout after 60s
      setTimeout(function() { clearInterval(checkInterval); }, 60000);
    }
  } else {
    // Simple triggers (Phase 1)
    switch (config.trigger) {
      case 'time_delay':
        // Instant trigger in preview mode, otherwise use configured delay
        setTimeout(show, (config.instantTrigger ? 0.1 : config.triggerValue) * 1000);
        break;
      case 'scroll_percentage':
        if (config.instantTrigger) {
          setTimeout(show, 100); // Show immediately for instant trigger
        } else {
          initScrollTrigger(show);
        }
        break;
      case 'exit_intent':
        if (config.instantTrigger) {
          setTimeout(show, 100); // Show immediately for instant trigger
        } else {
          initExitTrigger(show);
        }
        break;
    }
  }

  function initScrollTrigger(callback) {
    var triggered = false;
    function check() {
      if (triggered) return;
      var pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (pct >= config.triggerValue) {
        triggered = true;
        window.removeEventListener('scroll', check);
        callback();
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  function initExitTrigger(callback) {
    var triggered = false;
    document.addEventListener('mouseout', function(e) {
      if (triggered || e.clientY > 0 || e.relatedTarget !== null) return;
      triggered = true;
      callback();
    });
  }
})();

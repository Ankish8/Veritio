/**
 * V2 Widget Loader Script Generator
 *
 * Generates the complete inline JavaScript loader script for popup and drawer widgets.
 * This is the main entry point that orchestrates all script blocks.
 */

import { escapeJs, generateEscapeHtmlFunction, generateContrastColorFunction } from './escaping'
import { RADIUS_MAP, DEMOGRAPHIC_OPTIONS } from './constants'
import type { LoaderConfig, NormalizedDemographicField } from './types'
import { generateV3LoaderScript } from './generate-v3-loader-script'
import {
  generateBrowserDetectorBlock,
  generateComplianceChecksBlock,
  generateVisitorTargetingBlock,
  generateSchedulingChecksBlock,
  generateCopyPersonalizationBlock,
  generateTriggerLogicBlock,
  generateWidgetStyles,
  generateWidgetFunctions,
  generateFormHandlingBlock,
} from './script-blocks/index'

/**
 * Generate the complete widget loader script.
 * Decides between V2 (inline) and V3 (external) based on widget style.
 */
export function generateLoaderScript(opts: LoaderConfig): string {
  const { embedCodeId, apiBase, studyUrl, config, branding } = opts

  // If no study URL, widget can't do much
  if (!studyUrl) {
    return `/* Veritio Widget - No active study configured */`
  }

  // Widget style settings
  const widgetStyle = config.widgetStyle || 'popup'

  // Use v3 widget for advanced styles (badge, banner, modal)
  // These styles require the full v3 widget with all template support
  const useV3Widget = widgetStyle !== 'popup' && widgetStyle !== 'drawer'

  if (useV3Widget) {
    return generateV3LoaderScript(opts)
  }

  // Normalize demographic fields: support both old string[] and new object[] format
  const captureSettings = config.captureSettings || { collectEmail: true }
  const rawDemographicFields = captureSettings.demographicFields || []

  const demographicFields: NormalizedDemographicField[] = rawDemographicFields.map((field) => {
    if (typeof field === 'string') {
      return { id: field, fieldType: field, required: false, width: 'full', label: '' }
    }
    return {
      id: field.id,
      fieldType: field.fieldType,
      required: field.required ?? false,
      width: field.width ?? 'full',
      label: field.label ?? '',
    }
  })

  // Determine colors based on theme mode
  const themeMode = branding.themeMode || 'light'
  const buttonColor = branding.primaryColor || '#7c3aed'
  const borderRadius = RADIUS_MAP[branding.radiusOption] ?? 8
  const slideDirection = config.slideDirection || 'right'

  // Generate the inline widget script with capture form support
  return `(function(){
  'use strict';

  // Widget Configuration
  var config = {
    embedCodeId: '${escapeJs(embedCodeId)}',
    studyUrl: '${escapeJs(studyUrl)}',
    apiBase: '${escapeJs(apiBase)}',
    position: '${escapeJs(config.position || 'bottom-right')}',
    trigger: '${escapeJs(config.triggerType || 'time_delay')}',
    triggerValue: ${config.triggerValue || 5},
    themeMode: '${themeMode}',
    buttonColor: '${escapeJs(buttonColor)}',
    borderRadius: ${borderRadius},
    title: '${escapeJs(config.title || 'Help us improve!')}',
    description: '${escapeJs(config.description || 'Share your feedback.')}',
    buttonText: '${escapeJs(config.buttonText || 'Get Started')}',
    widgetStyle: '${escapeJs(widgetStyle)}',
    slideDirection: '${escapeJs(slideDirection)}',
    frequencyCapping: ${JSON.stringify(config.frequencyCapping || { enabled: false })},
    captureSettings: ${JSON.stringify(captureSettings)},
    demographicFields: ${JSON.stringify(demographicFields)},
    // Extended settings
    targeting: ${JSON.stringify(config.targeting || { newVisitors: false, returningVisitors: false, excludeParticipants: false })},
    scheduling: ${JSON.stringify(config.scheduling || { enabled: false })},
    privacy: ${JSON.stringify(config.privacy || { respectDoNotTrack: false, showPrivacyLink: false, cookieConsent: { enabled: false } })},
    advancedTriggers: ${JSON.stringify(config.advancedTriggers || { enabled: false, rules: [], logic: 'AND' })},
    placement: ${JSON.stringify(config.placement || { mode: 'fixed' })},
    copyPersonalization: ${JSON.stringify(config.copyPersonalization || { enabled: false, rules: [], variables: { enabled: false } })}
  };

  ${generateBrowserDetectorBlock()}

  // Determine colors based on theme mode
  function getThemeColors() {
    var isDark = config.themeMode === 'dark';
    if (config.themeMode === 'system') {
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return {
      bgColor: isDark ? '#1a1a1a' : '#ffffff',
      textColor: isDark ? '#f5f5f5' : '#1a1a1a',
      inputBg: isDark ? '#2a2a2a' : '#ffffff',
      inputBorder: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
      isDark: isDark
    };
  }
  var theme = getThemeColors();

  // Storage helpers
  function getStorage(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  }
  function setStorage(key, val) {
    try { localStorage.setItem(key, val); } catch(e) {}
  }

  // Get current scroll percentage (handles edge cases)
  function getScrollPercentage() {
    var scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 100; // Page is not scrollable, consider it 100%
    return Math.min(100, (window.scrollY / scrollHeight) * 100);
  }

  // Check frequency cap
  var storageKey = '__veritio_widget_' + config.embedCodeId;
  if (config.frequencyCapping && config.frequencyCapping.enabled) {
    var stored = getStorage(storageKey);
    if (stored) {
      try {
        var data = JSON.parse(stored);
        var now = Date.now();
        var windowMs = config.frequencyCapping.timeWindow === 'day' ? 86400000 :
                       config.frequencyCapping.timeWindow === 'week' ? 604800000 :
                       config.frequencyCapping.timeWindow === 'month' ? 2592000000 :
                       config.frequencyCapping.timeWindow === 'forever' ? Infinity : 86400000;
        if (now - data.firstSeen < windowMs && data.count >= (config.frequencyCapping.maxImpressions || 3)) {
          return; // Frequency cap reached
        }
        if (now - data.firstSeen >= windowMs) {
          data = { firstSeen: now, count: 0 };
        }
      } catch(e) {}
    }
  }

  ${generateComplianceChecksBlock()}

  ${generateVisitorTargetingBlock()}

  ${generateSchedulingChecksBlock()}

  ${generateCopyPersonalizationBlock()}

  ${generateWidgetStyles(borderRadius)}

  // Contrast color helper
  ${generateContrastColorFunction()}

  // Escape HTML
  ${generateEscapeHtmlFunction()}

  // Demographic field options - comprehensive list matching study-flow fields
  var demographicOptions = ${JSON.stringify(DEMOGRAPHIC_OPTIONS)};

  ${generateWidgetFunctions()}

  ${generateFormHandlingBlock()}

  ${generateTriggerLogicBlock()}
})();`
}

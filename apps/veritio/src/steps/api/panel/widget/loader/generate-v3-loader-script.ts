/**
 * V3 Widget Loader Script Generator
 *
 * Generates a lightweight loader that delegates to the external v3 widget script.
 * Used for advanced widget styles: badge, banner, modal.
 */

import { escapeJs } from './escaping'
import { RADIUS_MAP } from './constants'
import type { LoaderConfig } from './types'

/**
 * Generate loader script that uses intercept-widget-v3.js for advanced styles.
 * The v3 widget is a more feature-rich external script served by the frontend.
 */
export function generateV3LoaderScript(opts: LoaderConfig): string {
  const { apiBase, studyUrl, config, branding } = opts

  // Determine colors based on theme mode
  const themeMode = branding.themeMode || 'light'
  const isDark = themeMode === 'dark'
  const buttonColor = branding.primaryColor || '#7c3aed'
  const borderRadius = RADIUS_MAP[branding.radiusOption] ?? 8

  // Frontend URL for static assets (v3 widget script is served by Next.js, not the API)
  // In production, both frontend and API share the same origin. In dev, they're on different ports.
  const frontendBase =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    (studyUrl ? studyUrl.split('/s/')[0] : null) ||
    apiBase.replace(':4000', ':4001') // Fallback: convert API port to frontend port

  // Build the full config object for v3 widget
  // Note: v3 widget uses 'trigger' not 'triggerType', and 'bgColor' not 'backgroundColor'
  const v3Config = {
    studyUrl,
    apiBase,
    embedCodeId: opts.embedCodeId, // For capture endpoint
    position: config.position || 'bottom-right',
    trigger: config.triggerType || 'time_delay', // v3 uses 'trigger'
    triggerValue: config.triggerValue || 5,
    bgColor: isDark ? '#1a1a1a' : '#ffffff', // v3 uses 'bgColor'
    textColor: isDark ? '#f5f5f5' : '#1a1a1a',
    buttonColor,
    borderRadius,
    title: config.title || 'Help us improve!',
    description: config.description || 'Share your feedback.',
    buttonText: config.buttonText || 'Get Started',
    widgetStyle: config.widgetStyle || 'popup',
    bannerPosition: config.bannerPosition || 'bottom',
    slideDirection: config.slideDirection || 'right',
    badgePosition: config.badgePosition || 'right',
    animation: config.animation || 'fade',
    frequencyCapping: config.frequencyCapping || { enabled: false },
    captureSettings: config.captureSettings || { collectEmail: false }, // For demographics/email collection
    previewMode: false,
    instantTrigger: false,
  }

  // Generate loader that loads v3 widget script from frontend (where static assets are served)
  return `(function(){
  'use strict';

  // Load v3 widget script for advanced templates (badge, banner, modal)
  var config = ${JSON.stringify(v3Config)};

  var script = document.createElement('script');
  script.src = '${escapeJs(frontendBase)}/intercept-widget-v3.js';
  script.setAttribute('data-study-url', config.studyUrl);
  script.setAttribute('data-config', JSON.stringify(config));
  script.async = true;
  document.body.appendChild(script);
})();`
}

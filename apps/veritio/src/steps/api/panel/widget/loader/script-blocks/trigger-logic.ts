/**
 * Trigger Logic Script Block
 *
 * Generates JavaScript for widget triggering based on simple triggers
 * (time delay, scroll percentage, exit intent) or advanced trigger rules
 * with AND/OR logic.
 */

/**
 * Generate the trigger logic block.
 * Handles both simple and advanced multi-rule triggers.
 */
export function generateTriggerLogicBlock(): string {
  return `// ============================================================================
  // TRIGGER LOGIC (Simple or Advanced)
  // ============================================================================
  var widgetShown = false;

  function triggerWidget() {
    if (widgetShown) return;
    widgetShown = true;
    // Clean up scroll tracking listener (no longer needed)
    window.removeEventListener('scroll', updateMaxScrollDepth);
    // Re-apply personalization with latest scroll depth and time on site
    applyPersonalization();
    config.title = displayTitle;
    config.description = displayDescription;
    config.buttonText = displayButtonText;
    showWidget();
  }

  // Advanced triggers with AND/OR logic
  if (config.advancedTriggers && config.advancedTriggers.enabled && config.advancedTriggers.rules && config.advancedTriggers.rules.length > 0) {
    var ruleStates = {}; // Track which rules are satisfied
    var rules = config.advancedTriggers.rules;
    var logic = config.advancedTriggers.logic || 'AND';

    // Initialize rule states
    rules.forEach(function(rule) { ruleStates[rule.id] = false; });

    function checkAdvancedTriggers() {
      if (widgetShown) return;

      var satisfied = logic === 'AND'
        ? rules.every(function(r) { return ruleStates[r.id]; })
        : rules.some(function(r) { return ruleStates[r.id]; });

      if (satisfied) {
        triggerWidget();
      }
    }

    // Set up listeners for each rule type
    rules.forEach(function(rule) {
      switch (rule.type) {
        case 'time_delay':
          setTimeout(function() {
            ruleStates[rule.id] = true;
            checkAdvancedTriggers();
          }, (Number(rule.value) || 5) * 1000);
          break;

        case 'scroll_percentage':
          var scrollVal = Number(rule.value) || 50;
          function checkScrollRule() {
            if (ruleStates[rule.id]) return;
            if (getScrollPercentage() >= scrollVal) {
              ruleStates[rule.id] = true;
              window.removeEventListener('scroll', checkScrollRule);
              checkAdvancedTriggers();
            }
          }
          window.addEventListener('scroll', checkScrollRule, { passive: true });
          checkScrollRule();
          break;

        case 'exit_intent':
          document.addEventListener('mouseout', function(e) {
            if (ruleStates[rule.id] || e.clientY > 0 || e.relatedTarget !== null) return;
            ruleStates[rule.id] = true;
            checkAdvancedTriggers();
          });
          break;

        case 'page_visits':
          var requiredVisits = Number(rule.value) || 2;
          if (visitorData.visits >= requiredVisits) {
            ruleStates[rule.id] = true;
          }
          break;

        case 'time_on_page':
          var requiredTime = Number(rule.value) || 30;
          setTimeout(function() {
            ruleStates[rule.id] = true;
            checkAdvancedTriggers();
          }, requiredTime * 1000);
          break;

        case 'url_pattern':
          var pattern = String(rule.value || '');
          try {
            var regex = new RegExp(pattern, 'i');
            if (regex.test(window.location.href)) {
              ruleStates[rule.id] = true;
            }
          } catch(e) {
            // Invalid regex, check simple contains
            if (window.location.href.toLowerCase().indexOf(pattern.toLowerCase()) > -1) {
              ruleStates[rule.id] = true;
            }
          }
          break;

        case 'element_visible':
          var selector = String(rule.value || '');
          if (selector) {
            var checkElement = function() {
              var el = document.querySelector(selector);
              if (el) {
                var rect = el.getBoundingClientRect();
                var inViewport = rect.top < window.innerHeight && rect.bottom > 0;
                if (inViewport) {
                  ruleStates[rule.id] = true;
                  window.removeEventListener('scroll', checkElement);
                  checkAdvancedTriggers();
                }
              }
            };
            window.addEventListener('scroll', checkElement, { passive: true });
            setTimeout(checkElement, 100); // Initial check
          }
          break;
      }
    });

    // Initial check for already-satisfied rules
    checkAdvancedTriggers();

  } else {
    // Simple trigger logic (fallback)
    switch (config.trigger) {
      case 'time_delay':
        setTimeout(triggerWidget, config.triggerValue * 1000);
        break;
      case 'scroll_percentage':
        function checkScrollSimple() {
          if (widgetShown) return;
          if (getScrollPercentage() >= config.triggerValue) {
            window.removeEventListener('scroll', checkScrollSimple);
            triggerWidget();
          }
        }
        window.addEventListener('scroll', checkScrollSimple, { passive: true });
        checkScrollSimple();
        break;
      case 'exit_intent':
        document.addEventListener('mouseout', function(e) {
          if (widgetShown || e.clientY > 0 || e.relatedTarget !== null) return;
          triggerWidget();
        });
        break;
      default:
        setTimeout(triggerWidget, 5000);
    }
  }`
}

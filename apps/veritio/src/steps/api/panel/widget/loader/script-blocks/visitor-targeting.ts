/**
 * Visitor Targeting Script Block
 *
 * Generates JavaScript for tracking visitor status (new vs returning)
 * and applying targeting rules to determine widget eligibility.
 */

/**
 * Generate the visitor targeting block.
 * Tracks visits in localStorage and checks targeting rules.
 */
export function generateVisitorTargetingBlock(): string {
  return `// ============================================================================
  // VISITOR TARGETING
  // ============================================================================
  var visitorKey = '__veritio_visitor_' + config.embedCodeId;
  var visitorData = null;
  try {
    var storedVisitor = getStorage(visitorKey);
    if (storedVisitor) {
      visitorData = JSON.parse(storedVisitor);
    } else {
      visitorData = { firstSeen: Date.now(), visits: 0, participated: false };
    }
    visitorData.visits++;
    setStorage(visitorKey, JSON.stringify(visitorData));
  } catch(e) {
    visitorData = { firstSeen: Date.now(), visits: 1, participated: false };
  }

  var isNewVisitor = visitorData.visits <= 1;
  var isReturningVisitor = visitorData.visits > 1;

  if (config.targeting) {
    // Handle visitor type targeting
    var hasVisitorTypeFilter = config.targeting.newVisitors || config.targeting.returningVisitors;
    if (hasVisitorTypeFilter) {
      // If BOTH are selected, show to everyone (no filtering)
      var bothSelected = config.targeting.newVisitors && config.targeting.returningVisitors;
      if (!bothSelected) {
        // Only one is selected - apply the filter
        if (config.targeting.newVisitors && !isNewVisitor) {
          return; // Targeting new visitors only, but this is a returning visitor
        }
        if (config.targeting.returningVisitors && !isReturningVisitor) {
          return; // Targeting returning visitors only, but this is a new visitor
        }
      }
    }
    // Check exclude previous participants
    if (config.targeting.excludeParticipants && visitorData.participated) {
      return; // Already participated
    }
  }`
}

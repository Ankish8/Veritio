/**
 * Scheduling Checks Script Block
 *
 * Generates JavaScript for checking date range, day of week,
 * and business hours scheduling constraints.
 */

/**
 * Generate the scheduling checks block.
 * Returns early from the IIFE if scheduling constraints are not met.
 */
export function generateSchedulingChecksBlock(): string {
  return `// ============================================================================
  // SCHEDULING CHECKS
  // ============================================================================
  if (config.scheduling && config.scheduling.enabled) {
    var now = new Date();

    // Check date range
    if (config.scheduling.dateRange) {
      if (config.scheduling.dateRange.start) {
        var startDate = new Date(config.scheduling.dateRange.start);
        if (now < startDate) {
          return; // Before campaign start
        }
      }
      if (config.scheduling.dateRange.end) {
        var endDate = new Date(config.scheduling.dateRange.end);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (now > endDate) {
          return; // After campaign end
        }
      }
    }

    // Check day of week (0=Sunday to 6=Saturday)
    if (config.scheduling.daysOfWeek && config.scheduling.daysOfWeek.length > 0) {
      var currentDay = now.getDay();
      if (config.scheduling.daysOfWeek.indexOf(currentDay) === -1) {
        return; // Not an active day
      }
    }

    // Check business hours
    if (config.scheduling.businessHoursOnly && config.scheduling.businessHours) {
      var currentHour = now.getHours();
      var currentMinute = now.getMinutes();
      var currentTime = currentHour * 60 + currentMinute;

      var startParts = (config.scheduling.businessHours.start || '09:00').split(':');
      var startTime = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || 0);

      var endParts = (config.scheduling.businessHours.end || '17:00').split(':');
      var endTime = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || 0);

      if (currentTime < startTime || currentTime > endTime) {
        return; // Outside business hours
      }
    }
  }`
}

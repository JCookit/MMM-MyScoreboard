/**
 * Test configuration for MMM-MyScoreboard seasonal date filtering
 * 
 * This configuration demonstrates how season date ranges work
 * with various fake dates throughout the year.
 */

// Test Case 1: Mid-summer (July) - Only MLB should show
const summerTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-07-15', // July 15th - middle of summer
    sports: [
      {
        league: "NFL",
        from: "09-01",
        to: "02-15",
        teams: ["KC", "NE"] // Should be HIDDEN (out of season)
      },
      {
        league: "MLB", 
        from: "03-01",
        to: "11-15",
        teams: ["SEA", "TOR"] // Should be VISIBLE (in season)
      },
      {
        league: "NBA",
        from: "10-15",
        to: "06-15", 
        teams: ["TOR", "LAL"] // Should be HIDDEN (out of season)
      },
      {
        league: "NHL",
        from: "10-01",
        to: "06-30",
        teams: ["TOR", "BOS"] // Should be HIDDEN (out of season)
      }
    ]
  }
};

// Test Case 2: NFL/NHL/NBA Season (January) - Should show these three
const winterTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right', 
  config: {
    useFakeDate: '2025-01-15', // January 15th - winter sports
    sports: [
      {
        league: "NFL",
        from: "09-01",
        to: "02-15",
        teams: ["KC", "NE"] // Should be VISIBLE (playoffs)
      },
      {
        league: "MLB",
        from: "03-01", 
        to: "11-15",
        teams: ["SEA", "TOR"] // Should be HIDDEN (off-season)
      },
      {
        league: "NBA",
        from: "10-15",
        to: "06-15",
        teams: ["TOR", "LAL"] // Should be VISIBLE (mid-season)
      },
      {
        league: "NHL", 
        from: "10-01",
        to: "06-30",
        teams: ["TOR", "BOS"] // Should be VISIBLE (mid-season)
      }
    ]
  }
};

// Test Case 3: Spring transition (April) - NBA/NHL ending, MLB starting  
const springTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-04-15', // April 15th - spring transition
    sports: [
      {
        league: "NFL",
        from: "09-01", 
        to: "02-15",
        teams: ["KC", "NE"] // Should be HIDDEN (long off-season)
      },
      {
        league: "MLB",
        from: "03-01",
        to: "11-15", 
        teams: ["SEA", "TOR"] // Should be VISIBLE (early season)
      },
      {
        league: "NBA",
        from: "10-15",
        to: "06-15",
        teams: ["TOR", "LAL"] // Should be VISIBLE (playoffs approaching)
      },
      {
        league: "NHL",
        from: "10-01",
        to: "06-30",
        teams: ["TOR", "BOS"] // Should be VISIBLE (playoffs)
      }
    ]
  }
};

// Test Case 4: No date ranges (always active)
const alwaysActiveTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-07-15',
    sports: [
      {
        league: "MLS", 
        // No from/to specified - defaults to year-round
        teams: ["SEA", "TOR"] // Should always be VISIBLE
      },
      {
        league: "EPL",
        from: "08-15",
        to: "05-25", 
        teams: ["TOT", "ARS"] // Should be HIDDEN in July
      }
    ]
  }
};

module.exports = {
  summerTest,
  winterTest, 
  springTest,
  alwaysActiveTest
};

/**
 * TESTING INSTRUCTIONS:
 * 
 * 1. Copy one of the test configs above into your MagicMirror config.js
 * 2. Restart MagicMirror 
 * 3. Check the MagicMirror logs (not browser console) for debug messages like:
 *    "[MMM-MyScoreboard] Backend skipping NFL - not in season (09-01 to 02-15)"
 * 4. Verify only the expected leagues appear in the module
 * 5. Change useFakeDate to test different seasons
 * 
 * Expected Results:
 * - Summer (July): Only MLB visible
 * - Winter (January): NFL, NBA, NHL visible  
 * - Spring (April): MLB, NBA, NHL visible
 * - Always Active: MLS always visible, EPL hidden in July
 * 
 * NOTE: Filtering now happens in the backend (node_helper), so you'll see
 * the debug messages in the MagicMirror server logs, not the browser console.
 */

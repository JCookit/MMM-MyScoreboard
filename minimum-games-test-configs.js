/**
 * Test configuration for MMM-MyScoreboard minimum games feature
 * 
 * This configuration demonstrates the new minimumNumberOfGames parameter
 * which ensures you always see at least N games for each league.
 */

// Test Case 1: MLB with minimum 3 games (useful during off-days)
const mlbMinimumTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-07-15', // Mid-season date
    sports: [
      {
        league: "MLB",
        from: "03-01",
        to: "11-15", 
        minimumNumberOfGames: 3,  // Always show at least 3 games
        teams: ["SEA", "TOR"] // Only 2 teams - will need to look past/future
      }
    ]
  }
};

// Test Case 2: NFL with minimum during bye weeks
const nflByeWeekTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-10-15', // Mid-NFL season
    sports: [
      {
        league: "NFL",
        from: "09-01",
        to: "02-15",
        minimumNumberOfGames: 2,  // Show at least 2 games even during bye weeks
        teams: ["KC", "NE"] // Popular teams that might have byes
      }
    ]
  }
};

// Test Case 3: Multiple leagues with different minimums
const multiLeagueTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-11-15', // Late fall - multiple sports active
    sports: [
      {
        league: "NFL", 
        from: "09-01",
        to: "02-15",
        minimumNumberOfGames: 1,
        teams: ["KC", "NE"]
      },
      {
        league: "NBA",
        from: "10-15", 
        to: "06-15",
        minimumNumberOfGames: 2, // Show more NBA games
        teams: ["TOR", "LAL"]
      },
      {
        league: "NHL",
        from: "10-01",
        to: "06-30", 
        minimumNumberOfGames: 3, // Show even more NHL games
        teams: ["TOR", "BOS"]
      }
    ]
  }
};

// Test Case 4: Zero minimum (original behavior)
const originalBehaviorTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    useFakeDate: '2024-07-15',
    sports: [
      {
        league: "MLB",
        from: "03-01",
        to: "11-15",
        minimumNumberOfGames: 0, // Or omit entirely - same as original behavior
        teams: ["SEA", "TOR"]
      }
    ]
  }
};

// Test Case 5: High minimum to test algorithm limits
const stressTest = {
  module: 'MMM-MyScoreboard',
  position: 'top_right', 
  config: {
    useFakeDate: '2024-07-15',
    sports: [
      {
        league: "MLB",
        from: "03-01", 
        to: "11-15",
        minimumNumberOfGames: 10, // Very high - should search many days
        teams: ["SEA"] // Only 1 team to make it challenging
      }
    ]
  }
};

module.exports = {
  mlbMinimumTest,
  nflByeWeekTest,
  multiLeagueTest,
  originalBehaviorTest,
  stressTest
};

/**
 * TESTING INSTRUCTIONS:
 * 
 * 1. Copy one of the test configs above into your MagicMirror config.js
 * 2. Restart MagicMirror
 * 3. Check the MagicMirror server logs for debug messages like:
 *    "[MMM-MyScoreboard] Looking for minimum 3 games for MLB"
 *    "[MMM-MyScoreboard] Fetched X games for MLB on YYYY-MM-DD (day offset: N)" 
 * 4. Verify the module shows games from multiple days if needed
 * 5. Try different useFakeDate values to test various scenarios
 * 
 * Expected Behavior:
 * - minimumNumberOfGames: 0 -> Original behavior (today + maybe yesterday)
 * - minimumNumberOfGames: N > 0 -> Search up to 20 days past/future to find N games
 * - Algorithm searches: today -> yesterday/tomorrow -> 2 days ago/future -> etc.
 * - Respects season boundaries (won't search out-of-season dates)
 * - Caches results per day to avoid duplicate API calls
 * 
 * Performance Notes:
 * - Cache is cleared daily automatically
 * - Season filtering happens before API calls (efficient)
 * - Algorithm stops as soon as minimum is reached
 * - Maximum search range is 20 days in each direction
 */

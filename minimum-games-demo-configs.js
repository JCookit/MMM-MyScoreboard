/**
 * Demonstration configurations for the minimumNumberOfGames feature
 * These configs show different scenarios and use cases for the new multi-day algorithm
 */

// 1. Basic minimum games - guarantee at least 3 games even during bye weeks
const basicMinimumGames = {
	module: "MMM-MyScoreboard",
	position: "top_right",
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 3,  // NEW: Replace rolloverHours/alwaysShowToday
		sports: [
			{
				league: "NFL",
				teams: ["KC", "PHI", "BUF", "DAL", "SF"]
			}
		]
	}
};

// 2. Multi-league with different minimum requirements
const multiLeagueMinimum = {
	module: "MMM-MyScoreboard",
	position: "top_right", 
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 5,  // Higher minimum for more content
		sports: [
			{
				league: "NFL",
				teams: ["KC", "PHI", "BUF"]
			},
			{
				league: "NBA", 
				teams: ["LAL", "GSW", "BOS"]
			},
			{
				league: "MLB",
				teams: ["LAD", "NYY", "HOU"]
			}
		]
	}
};

// 3. Conservative minimum - just ensure never blank
const conservativeMinimum = {
	module: "MMM-MyScoreboard",
	position: "top_right",
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine", 
		minimumNumberOfGames: 1,  // Just ensure something shows
		sports: [
			{
				league: "NFL",
				teams: ["KC"]
			}
		]
	}
};

// 4. Aggressive minimum - always show lots of content
const aggressiveMinimum = {
	module: "MMM-MyScoreboard",
	position: "top_right",
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 10,  // Always show 10 games if available
		sports: [
			{
				league: "NFL",
				teams: ["KC", "PHI", "BUF", "DAL", "SF", "MIA", "CIN", "BAL", "MIN", "DET"]
			}
		]
	}
};

// 5. Seasonal testing - mix in-season and off-season leagues
const seasonalMixMinimum = {
	module: "MMM-MyScoreboard",
	position: "top_right",
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 4,
		sports: [
			{
				league: "NFL",    // Fall/Winter season
				teams: ["KC", "PHI", "BUF"]
			},
			{
				league: "MLB",    // Spring/Summer season  
				teams: ["LAD", "NYY", "HOU"]
			},
			{
				league: "NBA",    // Fall-Spring season
				teams: ["LAL", "GSW", "BOS"] 
			}
		]
	}
};

// 6. Single team focus with minimum guarantee
const singleTeamMinimum = {
	module: "MMM-MyScoreboard",
	position: "top_right",
	config: {
		showLeagueSeparators: false,  // Single league, no separators needed
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 2,  // Show 2 games even if my team didn't play
		sports: [
			{
				league: "NFL",
				teams: ["KC"]  // Just my favorite team
			}
		]
	}
};

// 7. Testing edge cases - very high minimum
const edgeCaseMinimum = {
	module: "MMM-MyScoreboard", 
	position: "top_right",
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		minimumNumberOfGames: 50,  // Algorithm will find what it can, max 20 days
		sports: [
			{
				league: "NFL",
				teams: ["KC", "PHI", "BUF", "DAL", "SF"]
			}
		]
	}
};

// 8. Comparison with old behavior (no minimum, might be blank)
const oldBehaviorComparison = {
	module: "MMM-MyScoreboard",
	position: "top_right", 
	config: {
		showLeagueSeparators: true,
		colored: true,
		viewStyle: "oneLine",
		// minimumNumberOfGames: undefined,  // OLD: might show nothing during bye weeks
		// rolloverHours: 6,                // OLD: deprecated parameter
		// alwaysShowToday: true,           // OLD: deprecated parameter  
		sports: [
			{
				league: "NFL",
				teams: ["KC", "PHI", "BUF"]
			}
		]
	}
};

// USAGE INSTRUCTIONS:
// 1. Copy one of the above configs to your MagicMirror config.js modules array
// 2. Restart MagicMirror to see the new minimumNumberOfGames behavior
// 3. Try during bye weeks, off-seasons, or game-light days to see the algorithm work
// 4. Monitor the MagicMirror logs to see the multi-day search in action

// MIGRATION FROM OLD PARAMETERS:
// The old parameters are now DEPRECATED and handled automatically:
//   rolloverHours: 6          // ❌ DEPRECATED - no longer needed
//   alwaysShowToday: true     // ❌ DEPRECATED - no longer needed
// 
// Replace with the new unified parameter:
//   minimumNumberOfGames: 3   // ✅ NEW - unified approach handles everything

// CLEAN IMPLEMENTATION:
// - Backend: Single algorithm handles all cases
// - Frontend: Single data structure (sportsDataMultiDay) for all games  
// - Socket Messages: Only MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY used
// - No more separate today/yesterday handling

module.exports = {
	basicMinimumGames,
	multiLeagueMinimum,
	conservativeMinimum, 
	aggressiveMinimum,
	seasonalMixMinimum,
	singleTeamMinimum,
	edgeCaseMinimum,
	oldBehaviorComparison
};

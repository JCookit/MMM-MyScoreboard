// Example configuration for testing MMM-MyScoreboard with fake dates

// Test configuration 1: NFL Super Bowl Sunday 2024
var config = {
  modules: [
    {
      module: 'MMM-MyScoreboard',
      position: 'top_right',
      config: {
        useFakeDate: '2024-02-11', // Super Bowl LVIII
        sports: [
          {
            league: 'NFL',
            teams: ['KC', 'SF'] // Chiefs vs 49ers
          }
        ]
      }
    }
  ]
}

// Test configuration 2: NHL All-Star Game 2024
var config2 = {
  modules: [
    {
      module: 'MMM-MyScoreboard',
      position: 'top_right', 
      config: {
        useFakeDate: '2024-02-03', // NHL All-Star Game
        sports: [
          {
            league: 'NHL',
            teams: ['TOR', 'BOS', 'NYR']
          }
        ]
      }
    }
  ]
}

// Test configuration 3: Off-season testing (no games)
var config3 = {
  modules: [
    {
      module: 'MMM-MyScoreboard',
      position: 'top_right',
      config: {
        useFakeDate: '2024-07-15', // Middle of NFL/NHL off-season
        sports: [
          {
            league: 'NFL',
            teams: ['KC', 'NE']
          },
          {
            league: 'NHL', 
            teams: ['TOR', 'BOS']
          }
        ]
      }
    }
  ]
}

// Test configuration 4: Rollover testing with time offset
var config4 = {
  modules: [
    {
      module: 'MMM-MyScoreboard',
      position: 'top_right',
      config: {
        useFakeDate: '2024-02-11', // Super Bowl Sunday
        debugHours: 2, // Simulate 2 hours later
        rolloverHours: 3, // Show yesterday's games until 3 AM
        sports: [
          {
            league: 'NFL',
            teams: ['KC', 'SF']
          }
        ]
      }
    }
  ]
}

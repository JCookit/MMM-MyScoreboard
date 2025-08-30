# Season Date Range Filtering & Minimum Games

The MMM-MyScoreboard module now supports two major features to ensure you always see relevant content:

1. **Season date ranges** to automatically filter leagues based on their active seasons
2. **Minimum games guarantee** to show a specified number of games even during bye weeks or off-days

## Season Configuration

Add `from` and `to` fields to your sports configuration:

```javascript
{
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    sports: [
      {
        league: "NFL",
        from: "09-01",    // NFL season starts September 1st
        to: "02-15",      // NFL season ends February 15th (Super Bowl)
        teams: ["KC", "NE"]
      },
      {
        league: "MLB",
        from: "03-01",    // Spring training starts
        to: "11-15",      // World Series ends
        teams: ["SEA", "TOR", "CHI", "BOS"]
      }
    ]
  }
}
```

## Minimum Games Configuration

Add `minimumNumberOfGames` to ensure you always see at least N games:

```javascript
{
  module: 'MMM-MyScoreboard',
  position: 'top_right',
  config: {
    sports: [
      {
        league: "MLB",
        from: "03-01",
        to: "11-15",
        minimumNumberOfGames: 3,  // Always show at least 3 games
        teams: ["SEA", "TOR", "CHI", "BOS"]
      },
      {
        league: "NFL", 
        from: "09-01",
        to: "02-15",
        minimumNumberOfGames: 1,  // Show at least 1 game (useful for bye weeks)
        teams: ["KC", "NE"]
      }
    ]
  }
}
```

## Minimum Games Algorithm

When `minimumNumberOfGames` > 0, the backend uses this algorithm:

1. **Fetch today's games** and filter for your configured teams
2. **Check minimum**: If you have ≥ minimumNumberOfGames, stop
3. **Expand search**: Look N days ago AND N days in the future (N = 1, 2, 3...)
4. **Repeat** until minimum reached or maximum search range (20 days) exceeded
5. **Respect seasons**: Only search dates within the league's season range

### Search Pattern Example
```
Day 0:  Today
Day -1: Yesterday    Day +1: Tomorrow  
Day -2: 2 days ago   Day +2: 2 days future
Day -3: 3 days ago   Day +3: 3 days future
... up to ±20 days
```

### Caching & Performance
- **Daily cache**: Results cached per day to avoid duplicate API calls
- **Automatic cleanup**: Cache cleared when date changes
- **Season-aware**: Won't make API calls for out-of-season dates
- **Early exit**: Stops searching as soon as minimum is reached

## Parameter Defaults

- **from/to**: If not specified, defaults to year-round (`"01-01"` to `"12-31"`)
- **minimumNumberOfGames**: If not specified, defaults to `0` (original behavior)

## Year Wraparound Support

The system handles seasons that span across New Year:

### Example: NFL Season
```javascript
{
  league: "NFL",
  from: "09-01",  // September 1st, 2024
  to: "02-15"     // February 15th, 2025
}
```

**How it works:**
- **September-December**: Uses current year for both dates
- **January-February**: Uses previous year for `from` date
- **March-August**: League is out of season (no API calls, no display)

## Current Date Logic

The system checks if the current date (including fake dates for testing) falls within the season range:

1. **Parse current date** using `getCurrentMoment()` (respects `useFakeDate`)
2. **Check season range** accounting for year wraparound
3. **Skip league entirely** if out of season

## Benefits

### API Efficiency
- **No unnecessary calls** during off-seasons (filtered in backend)
- **Reduced server load** - API calls are skipped entirely for out-of-season leagues
- **Better API citizenship** - only fetch when needed

### Clean UI
- **No empty sections** for out-of-season leagues
- **Focused display** on currently active sports
- **Automatic seasonal transitions** without frontend logic

### Performance
- **Fewer network requests** during off-seasons
- **Less processing** of irrelevant data
- **Cleaner logs** with seasonal debug messages in server logs

## Testing with Fake Dates

Perfect for testing seasonal behavior:

```javascript
{
  useFakeDate: '2024-07-15', // Mid-summer
  sports: [
    {
      league: "NFL",
      from: "09-01",
      to: "02-15",
      teams: ["KC"] // Will be hidden - NFL out of season
    },
    {
      league: "MLB", 
      from: "03-01",
      to: "11-15",
      teams: ["SEA"] // Will show - MLB in season
    }
  ]
}
```

## Debug Output

The module will log when leagues are filtered (in the MagicMirror server logs):

```
[MMM-MyScoreboard] Backend skipping NFL - not in season (09-01 to 02-15)
[MMM-MyScoreboard] Backend skipping NBA - not in season (10-15 to 06-15)
```

**Note**: Debug messages appear in the MagicMirror server logs, not the browser console, since filtering now happens in the backend.

## Default Behavior

If `from` and `to` are not specified, the league is active year-round (equivalent to `from: "01-01", to: "12-31"`).

## Real-World Examples

### US Major Sports
```javascript
sports: [
  { league: "NFL", from: "09-01", to: "02-15" },    // Fall/Winter
  { league: "NBA", from: "10-15", to: "06-15" },    // Fall/Winter/Spring  
  { league: "NHL", from: "10-01", to: "06-30" },    // Fall/Winter/Spring
  { league: "MLB", from: "02-15", to: "11-15" },    // Spring/Summer/Fall
  { league: "MLS", from: "02-25", to: "11-10" }     // Spring/Summer/Fall
]
```

### College Sports
```javascript
sports: [
  { league: "NCAAF", from: "08-25", to: "01-15" },  // College Football
  { league: "NCAAM", from: "11-01", to: "04-10" },  // College Basketball
]
```

This ensures your Magic Mirror only shows relevant sports throughout the year!

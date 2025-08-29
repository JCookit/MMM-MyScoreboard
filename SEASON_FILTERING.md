# Season Date Range Filtering

The MMM-MyScoreboard module now supports season date ranges to automatically filter leagues based on their active seasons. This prevents unnecessary API calls during off-seasons and keeps the display clean.

## Configuration

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
      },
      {
        league: "NHL",
        from: "10-01",    // NHL season starts
        to: "06-30",      // Stanley Cup ends
        teams: ["TOR", "BOS"]
      },
      {
        league: "NBA",
        from: "10-15",    // NBA season starts
        to: "06-15",      // NBA Finals end
        teams: ["TOR", "LAL"]
      }
    ]
  }
}
```

## Date Format

- **Format**: `MM-DD` (e.g., "03-01" for March 1st)
- **Optional**: If not specified, defaults to `"01-01"` to `"12-31"` (full year)

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

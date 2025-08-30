# Minimum Number of Games Feature - Complete Superset Implementation

## Overview
The new `minimumNumberOfGames` parameter completely replaces the old `rolloverHours` and `alwaysShowToday` parameters. The multi-day system is now a **complete superset** that handles ALL data flow, not just minimum games scenarios.

## Complete Superset Design
- **Backend**: All data is sent through the `MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY` message format
- **Frontend**: Multi-day structure (`sportsDataMultiDay`) handles ALL games from ALL days
- **Legacy Compatibility**: Old `SCORE-UPDATE` and `SCORE-UPDATE-YD` messages still work but convert to multi-day format
- **Data Structure**: No more separate `sportsData` and `sportsDataYd` - everything uses unified multi-day approach

## How It Works
When you set `minimumNumberOfGames: N`, the module will:

1. **Start with today's games** for your configured teams/leagues
2. **If not enough games found**, expand search in both directions:
   - Yesterday ↔ Tomorrow
   - 2 days ago ↔ 2 days future  
   - 3 days ago ↔ 3 days future
   - Continue up to 20 days maximum
3. **Respect season boundaries** - won't show off-season games
4. **Use intelligent caching** - avoids redundant API calls
5. **Display with visual differentiation** - past/future games are styled differently

## Configuration Migration

### Old Way (Deprecated)
```javascript
config: {
    rolloverHours: 6,        // ❌ Remove this
    alwaysShowToday: true,   // ❌ Remove this
    sports: [...]
}
```

### New Way (Recommended)
```javascript
config: {
    minimumNumberOfGames: 3,  // ✅ Add this instead
    sports: [...]
}
```

## Visual Design
- **Today's games**: Normal appearance
- **Yesterday/Tomorrow**: Slightly dimmed (opacity: 0.85)
- **2-3 days past/future**: More dimmed (opacity: 0.75-0.8)
- **Future games**: Italicized text
- **4+ days away**: Most dimmed (opacity: 0.65)

## Cache System
- **Daily cache per league** - efficient API usage
- **Automatic cleanup** - prevents memory bloat  
- **Season-aware** - respects league boundaries
- **Early termination** - stops searching when minimum reached

## Backend Algorithm
The `gatherMinimumGames()` function implements an expanding search pattern:

```
Day 0 (today) → Day -1,+1 → Day -2,+2 → Day -3,+3 → ... → Day -20,+20
```

Each day is checked for:
1. Season validity (league must be active)
2. Team filtering (if specific teams configured)
3. Game availability
4. Cache efficiency

## Frontend Integration
- **Multi-day data structure**: `sportsDataMultiDay` holds games from all days
- **Day labels**: `dayLabels` maps dates to "Today", "Yesterday", etc.
- **Unified rendering**: Single `getDom()` function handles all games
- **Backward compatibility**: Still processes old today/yesterday messages

## Example Configurations
See `minimum-games-demo-configs.js` for 8 different example configurations:

1. **Basic**: `minimumNumberOfGames: 3` for typical use
2. **Multi-league**: Higher minimum across multiple sports
3. **Conservative**: `minimumNumberOfGames: 1` just to avoid blank
4. **Aggressive**: `minimumNumberOfGames: 10` for content-rich display
5. **Seasonal**: Mix of different league seasons
6. **Single team**: Focus on one favorite team
7. **Edge case**: Very high minimum to test limits
8. **Comparison**: Old behavior vs new behavior

## Technical Benefits
1. **Eliminates blank module** during bye weeks/off-seasons
2. **Complete superset architecture** - single data flow for all scenarios
3. **Intelligent search** respects season boundaries
4. **Efficient caching** reduces API calls
5. **Visual clarity** differentiates time periods
6. **User control** via single parameter
7. **Backward compatible** with existing configs
8. **Unified data structure** - no more separate today/yesterday handling

## Data Flow Architecture

### Backend (node_helper.js)
- **Single Output**: Always sends `MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY` messages
- **Superset Logic**: Handles both minimum games algorithm and basic single-day fetching
- **Unified Format**: All data converted to consistent multi-day structure

### Frontend (MMM-MyScoreboard.js)  
- **Single Structure**: Only `sportsDataMultiDay` used for ALL game storage
- **Legacy Conversion**: Old message types automatically converted to multi-day format
- **Unified Rendering**: Single `getDom()` loop handles all games regardless of source

## Testing
During development, you can:
- Set high `minimumNumberOfGames` values to see algorithm limits
- Test during known bye weeks or off-seasons
- Monitor MagicMirror logs to see search progression
- Try different team/league combinations

## Files Modified
- **node_helper.js**: Complete backend algorithm with cache
- **MMM-MyScoreboard.js**: Multi-day frontend data structures  
- **MMM-MyScoreboard.css**: Visual styling for multi-day games
- **minimum-games-demo-configs.js**: Example configurations

The implementation is complete and ready for use!

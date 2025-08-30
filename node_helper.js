const Log = require('logger')
const NodeHelper = require('node_helper')
const moment = require('moment-timezone')
const fs = require('node:fs')
const path = require('node:path')

module.exports = NodeHelper.create({

  providers: {},
  
  // Cache for games by date and league - cleared daily
  gamesCache: {},
  cacheDate: null,
  
  // Constants for minimum games algorithm
  MAX_DAYS_TO_SEARCH: 20,

  // Helper function to get current moment, respecting fake date for testing
  getCurrentMoment: function(useFakeDate) {
    if (useFakeDate) {
      return moment(useFakeDate, 'YYYY-MM-DD')
    }
    return moment()
  },

  // Check if current date falls within a sport's season range
  isInSeason: function(sport, useFakeDate, targetDate) {
    // If no season dates specified, assume year-round
    if (!sport.from && !sport.to) {
      return true
    }
    
    const now = targetDate ? moment(targetDate) : this.getCurrentMoment(useFakeDate)
    const currentYear = now.year()
    const currentDate = now.format('MM-DD')
    
    const fromDate = sport.from || '01-01'
    const toDate = sport.to || '12-31'
    
    // Handle year wraparound (e.g., NFL: 09-01 to 02-15)
    if (fromDate <= toDate) {
      // Same year season (e.g., MLB: 03-01 to 11-15)
      return currentDate >= fromDate && currentDate <= toDate
    } else {
      // Year wraparound season (e.g., NFL: 09-01 to 02-15)
      return currentDate >= fromDate || currentDate <= toDate
    }
  },

  // Clear cache if date has changed
  checkAndClearCache: function(useFakeDate) {
    const currentDate = this.getCurrentMoment(useFakeDate).format('YYYY-MM-DD')
    if (this.cacheDate !== currentDate) {
      Log.debug(`[MMM-MyScoreboard] Clearing games cache - date changed from ${this.cacheDate} to ${currentDate}`)
      this.gamesCache = {}
      this.cacheDate = currentDate
    }
  },

  // Get cache key for a specific date and league
  getCacheKey: function(league, date) {
    // Handle both moment objects and string dates
    const dateStr = (typeof date === 'string') ? date : date.format('YYYY-MM-DD')
    return `${league}-${dateStr}`
  },

  // Filter games to only include user's configured teams
  filterGamesForTeams: function(games, configuredTeams) {
    if (!games || !games.length || !configuredTeams || !configuredTeams.length) {
      return []
    }
    
    return games.filter(game => {
      // Check if any of the user's teams are playing in this game
      return configuredTeams.some(team => {
        // Handle different provider data structures
        // ESPN uses hTeam/vTeam, other providers might use homeTeam/awayTeam
        const homeTeamAbbrev = game.hTeam || (game.homeTeam && game.homeTeam.abbreviation) || game.homeTeam
        const awayTeamAbbrev = game.vTeam || (game.awayTeam && game.awayTeam.abbreviation) || game.awayTeam
        
        return (homeTeamAbbrev === team) || (awayTeamAbbrev === team)
      })
    })
  },

  // Helper function to fetch and process a single day
  async fetchSingleDay(payload, targetDate, dayOffset) {
    const dateKey = targetDate.format('YYYY-MM-DD')
    
    // Check if this day is in season
    if (!this.isInSeason({...payload, from: payload.from, to: payload.to}, payload.useFakeDate, targetDate)) {
      Log.debug(`[MMM-MyScoreboard] ⏭️ Skipping ${dateKey} - out of season`)
      return null
    }
    
    Log.debug(`[MMM-MyScoreboard] 📅 Fetching ${dateKey} (offset: ${dayOffset})`)
    const { userGames } = await this.fetchAndProcessDayAsync(payload, targetDate, dayOffset)
    
    if (userGames && userGames.length > 0) {
      Log.debug(`[MMM-MyScoreboard] 📈 Found ${userGames.length} games for ${dateKey}`)
      return {
        dateKey,
        games: userGames
      }
    }
    
    Log.debug(`[MMM-MyScoreboard] ❌ No games found for ${dateKey}`)
    return null
  },

  // Helper function to try fetching games for a single direction (past or future)
  async tryDirection(payload, baseDate, dayOffset, direction, processedDays) {
    const targetDate = direction === 'past' 
      ? moment(baseDate).subtract(dayOffset, 'days')
      : moment(baseDate).add(dayOffset, 'days')
    
    const dateKey = targetDate.format('YYYY-MM-DD')
    
    if (processedDays.has(dateKey)) {
      Log.debug(`[MMM-MyScoreboard] ⏭️ Skipping ${dateKey} (already processed)`)
      return null
    }
    
    const result = await this.fetchSingleDay(payload, targetDate, direction === 'past' ? -dayOffset : dayOffset)
    processedDays.add(dateKey)
    
    if (result) {
      Log.debug(`[MMM-MyScoreboard] 📈 Added ${result.games.length} games for ${dateKey}`)
      return result
    }
    
    return null
  },

  // Main algorithm to gather minimum number of games - V2 with day tracking
  async gatherMinimumGames(payload) {
    const self = this
    const baseDate = moment(payload.gameDate)
    const league = payload.league
    const teams = payload.teams
    const minimumGames = payload.minimumNumberOfGames || 0
    
    Log.debug(`[MMM-MyScoreboard] 🚀 gatherMinimumGames START:`)
    Log.debug(`[MMM-MyScoreboard]    - League: ${league}`)
    Log.debug(`[MMM-MyScoreboard]    - Base Date: ${baseDate.format('YYYY-MM-DD')}`)
    Log.debug(`[MMM-MyScoreboard]    - Teams: [${teams.join(', ')}]`)
    Log.debug(`[MMM-MyScoreboard]    - Minimum Games: ${minimumGames}`)
    Log.debug(`[MMM-MyScoreboard]    - Provider: ${payload.provider}`)
    
    // Initialize results
    let gamesByDay = {}
    let totalUserGames = 0
    let processedDays = new Set()
    
    Log.debug(`[MMM-MyScoreboard] Looking for minimum ${minimumGames} games for ${league}`)
    
    // Process today first
    const todayResult = await this.fetchSingleDay(payload, baseDate, 0)
    const todayDateKey = baseDate.format('YYYY-MM-DD')
    processedDays.add(todayDateKey)
    
    if (todayResult) {
      gamesByDay[todayResult.dateKey] = {
        actualDate: todayResult.dateKey,
        games: todayResult.games
      }
      totalUserGames += todayResult.games.length
      Log.debug(`[MMM-MyScoreboard] 📈 After TODAY: ${totalUserGames} total games`)
    }
    
    // Check if we have enough or if minimum is 0 (original behavior)
    Log.debug(`[MMM-MyScoreboard] 🔢 Current count: ${totalUserGames}, minimum needed: ${minimumGames}`)
    
    if (minimumGames === 0 || totalUserGames >= minimumGames) {
      Log.debug(`[MMM-MyScoreboard] ✅ Sufficient games found, returning results...`)
      Log.debug(`[MMM-MyScoreboard] 📤 Final results keys: [${Object.keys(gamesByDay).join(', ')}]`)
      return gamesByDay
    }
    
    // Continue searching past and future days iteratively
    Log.debug(`[MMM-MyScoreboard] 🔄 Need more games, searching additional days...`)
    
    for (let dayOffset = 1; dayOffset <= this.MAX_DAYS_TO_SEARCH && totalUserGames < minimumGames; dayOffset++) {
      Log.debug(`[MMM-MyScoreboard] 🔄 Day search iteration: offset ${dayOffset}, current total: ${totalUserGames}`)
      
      // Try past first
      const pastResult = await this.tryDirection(payload, baseDate, dayOffset, 'past', processedDays)
      if (pastResult) {
        gamesByDay[pastResult.dateKey] = {
          actualDate: pastResult.dateKey,
          games: pastResult.games
        }
        totalUserGames += pastResult.games.length
        Log.debug(`[MMM-MyScoreboard] 📈 Past day added, total: ${totalUserGames}`)
        
        if (totalUserGames >= minimumGames) {
          Log.debug(`[MMM-MyScoreboard] ✅ Minimum reached after past day`)
          break
        }
      }
      
      // Try future if still need more
      if (totalUserGames < minimumGames) {
        const futureResult = await this.tryDirection(payload, baseDate, dayOffset, 'future', processedDays)
        if (futureResult) {
          gamesByDay[futureResult.dateKey] = {
            actualDate: futureResult.dateKey,
            games: futureResult.games
          }
          totalUserGames += futureResult.games.length
          Log.debug(`[MMM-MyScoreboard] 📈 Future day added, total: ${totalUserGames}`)
        }
      }
    }
    
    if (totalUserGames < minimumGames) {
      Log.debug(`[MMM-MyScoreboard] 🔚 Max search days reached. Final count: ${totalUserGames}`)
    } else {
      Log.debug(`[MMM-MyScoreboard] ✅ Minimum games achieved: ${totalUserGames}`)
    }
    
    Log.debug(`[MMM-MyScoreboard] 🏁 Final search results keys: [${Object.keys(gamesByDay).join(', ')}]`)
    return gamesByDay
  },
  
  // Async wrapper for fetchAndProcessDay
  fetchAndProcessDayAsync: function(payload, targetDate, dayOffset) {
    return new Promise((resolve, reject) => {
      this.fetchAndProcessDay(payload, targetDate, dayOffset, (userGames, allGames) => {
        resolve({ userGames, allGames })
      })
    })
  },

  // Fetch and process a single day's games
  fetchAndProcessDay: function(payload, targetDate, dayOffset, callback) {
    const self = this
    const league = payload.league
    const teams = payload.teams
    const cacheKey = this.getCacheKey(league, targetDate)
    const dateStr = (typeof targetDate === 'string') ? targetDate : targetDate.format('YYYY-MM-DD')
    
    Log.debug(`[MMM-MyScoreboard] 🔍 fetchAndProcessDay: ${league} on ${dateStr} (dayOffset: ${dayOffset}, teams: [${teams.join(', ')}])`)
    
    // Only use cache for non-today dates (today's games change frequently)
    const isToday = dayOffset === 0
    if (!isToday && this.gamesCache[cacheKey]) {
      Log.debug(`[MMM-MyScoreboard] ✅ Using cached games for ${league} on ${dateStr}`)
      const cachedGames = this.gamesCache[cacheKey]
      Log.debug(`[MMM-MyScoreboard] 📊 Cached data: ${cachedGames.length} total games`)
      const userGames = this.filterGamesForTeams(cachedGames, teams)
      Log.debug(`[MMM-MyScoreboard] 🎯 Filtered to ${userGames.length} user games`)
      return callback(userGames, cachedGames)
    }
    
    // Fetch from provider
    const provider = this.providers[payload.provider]
    Log.debug(`[MMM-MyScoreboard] 🌐 Calling provider ${payload.provider} for ${league} on ${dateStr}`)
    const dayPayload = {...payload, gameDate: targetDate}
    
    //Log.debug(`[MMM-MyScoreboard] 📤 Provider payload:`, JSON.stringify(dayPayload, null, 2))
    
    provider.getScores(dayPayload, targetDate, function(scores, sortIdx, noGamesToday) {
      Log.debug(`[MMM-MyScoreboard] 📥 Provider response for ${league} on ${dateStr}:`)
      Log.debug(`[MMM-MyScoreboard]    - scores: ${scores ? scores.length : 'null/undefined'} games`)
      Log.debug(`[MMM-MyScoreboard]    - sortIdx: ${sortIdx}`)
      Log.debug(`[MMM-MyScoreboard]    - noGamesToday: ${noGamesToday}`)
      
      // if (scores && scores.length > 0) {
      //   Log.debug(`[MMM-MyScoreboard] 📋 First game sample:`, JSON.stringify(scores[0], null, 2))
      // }
      
      // Store in cache only for non-today dates
      const games = scores || []
      if (!isToday) {
        self.gamesCache[cacheKey] = games
        Log.debug(`[MMM-MyScoreboard] 💾 Cached ${games.length} games for ${league} on ${dateStr}`)
      } else {
        Log.debug(`[MMM-MyScoreboard] ⚡ Not caching today's games - fetched ${games.length} games for ${league}`)
      }
      
      // Filter for user's teams
      const userGames = self.filterGamesForTeams(games, teams)
      Log.debug(`[MMM-MyScoreboard] 🎯 Filtered to ${userGames.length} user games for teams [${teams.join(', ')}]`)
      
      // if (userGames.length > 0) {
      //   Log.debug(`[MMM-MyScoreboard] 🎮 User games sample:`, JSON.stringify(userGames[0], null, 2))
      // }
      
      callback(userGames, games)
    })
  },
  
  
  start: function () {
    Log.log('Starting node_helper for: ' + this.name)

    this.providers.SNET = require('./providers/SNET.js')
    this.providers.SNET_YD = require('./providers/SNET_YD.js')
    this.providers.ESPN = require('./providers/ESPN.js')
    this.providers.Scorepanel = require('./providers/ESPN_Scorepanel.js')

    this.localLogos = {}
    var fsTree = this.getDirectoryTree('./modules/MMM-MyScoreboard/logos')
    fsTree.forEach((league) => {
      if (league.children) {
        var logoFiles = []
        league.children.forEach((file) => {
          logoFiles.push(file.name)
        })
        this.localLogos[league.name] = logoFiles
      }
    })

    this.localLogosCustom = {}
    fsTree = this.getDirectoryTree('./modules/MMM-MyScoreboard/logos_custom')
    fsTree.forEach((league) => {
      if (league.children) {
        var logoFiles = []
        league.children.forEach((file) => {
          logoFiles.push(file.name)
        })
        this.localLogosCustom[league.name] = logoFiles
      }
    })
  },

  getDirectoryTree(dirPath) {
    const result = []
    const files = fs.readdirSync(dirPath, { withFileTypes: true })

    files.forEach((file) => {
      const filePath = path.join(dirPath, file.name)
      if (file.name.endsWith('.svg') || file.name.endsWith('.png')) {
        result.push({ name: file.name })
      }
      else if (file.isDirectory()) {
        const children = this.getDirectoryTree(filePath)
        if (children.length > 0) {
          result.push({ name: file.name, children })
        }
      }
    })

    return result
  },

  socketNotificationReceived: async function (notification, payload) {
    if (notification == 'MMM-MYSCOREBOARD-GET-SCORES') {
      /*
        payload contains:
          provider to get data from
          game date for which to retrive scores,
          league
          teams
          module instance identifier
          sport's index from the config's order
          from/to season dates (optional)
          useFakeDate (optional)
          minimumNumberOfGames (optional)
      */

      // Check and clear cache if date changed
      this.checkAndClearCache(payload.useFakeDate)

      // Check if this sport is in season for the base date
      const sportConfig = {
        league: payload.league,
        from: payload.from,
        to: payload.to
      }

      // Single code flow: always use the minimum games algorithm 
      // When minimumNumberOfGames is 0/undefined, algorithm stops after today
      const self = this
      
      try {
        const results = await this.gatherMinimumGames(payload)
        Log.debug(`[MMM-MyScoreboard] 📊 Backend gathered results with keys: [${Object.keys(results).join(', ')}]`)
        
        // Convert results to frontend format (results already have actual date keys)
        const dateKeyedResults = {}
        
        Object.entries(results).forEach(([dateKey, dayData]) => {
          dateKeyedResults[dateKey] = {
            scores: dayData.games || [],
            sortIdx: dayData.sortIdx || 999
          }
          
          Log.debug(`[MMM-MyScoreboard] 🗓️ Prepared ${dateKey} with ${(dayData.games || []).length} games`)
        })
        
        // Send SINGLE notification with all days
        const notification = {
          instanceId: payload.instanceId,
          league: payload.league,
          label: payload.label,
          provider: payload.provider,
          sortIdx: payload.index || 999,
          gamesByDate: dateKeyedResults
        }
        
        Log.debug(`[MMM-MyScoreboard] 🚀 SENDING single MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY with dates: [${Object.keys(dateKeyedResults).join(', ')}]`)
        
        self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY', notification)
      } catch (error) {
        Log.error(`[MMM-MyScoreboard] Error gathering games: ${error}`)
        // Send error response - single notification format
        const todayDate = self.getCurrentMoment(payload.useFakeDate).format('YYYY-MM-DD')
        self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE-MULTIDAY', {
          instanceId: payload.instanceId,
          league: payload.league,
          label: payload.label,
          provider: payload.provider,
          sortIdx: 999,
          gamesByDate: {
            [todayDate]: {
              scores: [],
              sortIdx: 999
            }
          },
          error: true
        })
      }
    }
    else if (notification == 'MMM-MYSCOREBOARD-GET-LOCAL-LOGOS') {
      this.sendSocketNotification('MMM-MYSCOREBOARD-LOCAL-LOGO-LIST', { instanceId: payload.instanceId, index: payload.league, logos: this.localLogos, logosCustom: this.localLogosCustom })
    }
  },

})

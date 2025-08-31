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
      Log.info(`[MMM-MyScoreboard] Cache cleared - date changed to ${currentDate}`)
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

  // Check if a game involves any of the user's configured teams
  isUserTeamGame: function(game, configuredTeams) {
    if (!game || !configuredTeams || !configuredTeams.length) {
      return false
    }
    
    return configuredTeams.some(team => {
      // Handle different provider data structures
      // ESPN uses hTeam/vTeam, other providers might use homeTeam/awayTeam
      const homeTeamAbbrev = game.hTeam || (game.homeTeam && game.homeTeam.abbreviation) || game.homeTeam
      const awayTeamAbbrev = game.vTeam || (game.awayTeam && game.awayTeam.abbreviation) || game.awayTeam
      
      return (homeTeamAbbrev === team) || (awayTeamAbbrev === team)
    })
  },

  // Filter games to only include user's configured teams
  filterGamesForTeams: function(games, configuredTeams) {
    if (!games || !games.length || !configuredTeams || !configuredTeams.length) {
      return []
    }
    
    return games.filter(game => this.isUserTeamGame(game, configuredTeams))
  },

  // Helper function to fetch and process a single day
  async fetchSingleDay(payload, targetDate, dayOffset) {
    const dateKey = targetDate.format('YYYY-MM-DD')
    
    // Check if this day is in season
    if (!this.isInSeason({...payload, from: payload.from, to: payload.to}, payload.useFakeDate, targetDate)) {
      return null
    }
    
    const { userGames } = await this.fetchAndProcessDay(payload, targetDate, dayOffset)
    
    if (userGames && userGames.length > 0) {
      Log.info(`[MMM-MyScoreboard] Found ${userGames.length} games for ${dateKey}`)
      return {
        dateKey,
        games: userGames
      }
    }
    
    return null
  },

  // Helper function to try fetching games for a single direction (past or future)
  async tryDirection(payload, baseDate, dayOffset, direction, processedDays) {
    const targetDate = direction === 'past' 
      ? moment(baseDate).subtract(dayOffset, 'days')
      : moment(baseDate).add(dayOffset, 'days')
    
    const dateKey = targetDate.format('YYYY-MM-DD')
    
    if (processedDays.has(dateKey)) {
      return null
    }
    
    const result = await this.fetchSingleDay(payload, targetDate, direction === 'past' ? -dayOffset : dayOffset)
    processedDays.add(dateKey)
    
    if (result) {
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
    
    Log.info(`[MMM-MyScoreboard] Looking for ${minimumGames} minimum games for ${league}`)
    
    // Initialize results
    let gamesByDay = {}
    let totalUserGames = 0
    let processedDays = new Set()
    
    Log.info(`[MMM-MyScoreboard] Looking for minimum ${minimumGames} games for ${league}`)
    
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
    }
    
    // Check if we have enough or if minimum is 0 (original behavior)
    if (minimumGames === 0 || totalUserGames >= minimumGames) {
      Log.info(`[MMM-MyScoreboard] Found ${totalUserGames} games (${minimumGames} minimum required)`)
      return gamesByDay
    }
    
    // Continue searching past and future days iteratively
    Log.info(`[MMM-MyScoreboard] Need ${minimumGames - totalUserGames} more games, searching additional days...`)
    
    for (let dayOffset = 1; dayOffset <= this.MAX_DAYS_TO_SEARCH && totalUserGames < minimumGames; dayOffset++) {
      
      // Try past first
      const pastResult = await this.tryDirection(payload, baseDate, dayOffset, 'past', processedDays)
      if (pastResult) {
        gamesByDay[pastResult.dateKey] = {
          actualDate: pastResult.dateKey,
          games: pastResult.games
        }
        totalUserGames += pastResult.games.length
        
        if (totalUserGames >= minimumGames) {
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
        }
      }
    }
    
    // Fallback: If we still don't have enough games, use any cached games sorted by distance from today
    if (totalUserGames < minimumGames) {
      Log.info(`[MMM-MyScoreboard] Using fallback: need ${minimumGames - totalUserGames} more games from cache...`)
      
      // Collect all cached games with their distance from today
      let allAvailableGames = []
      const league = payload.league
      
      // Include today's games (they should be in cache from fetchSingleDay above)
      const todayCacheKey = this.getCacheKey(league, baseDate)
      if (this.gamesCache[todayCacheKey]) {
        this.gamesCache[todayCacheKey].forEach(game => {
          if (!this.isUserTeamGame(game, payload.teams)) { // Don't re-add user games
            const todayGameWithDistance = {
              ...game,
              distanceFromToday: 0,
              dateKey: baseDate.format('YYYY-MM-DD')
            }
            allAvailableGames.push(todayGameWithDistance)
          }
        })
      }

      // Add cached games from other days
      Object.keys(this.gamesCache).forEach(cacheKey => {
        if (cacheKey.startsWith(league + '-')) {
          const dateStr = cacheKey.replace(league + '-', '')
          const gameDate = moment(dateStr)
          const distance = Math.abs(gameDate.diff(baseDate, 'days'))
          
          if (distance > 0) {
            this.gamesCache[cacheKey].forEach(game => {
              if (!this.isUserTeamGame(game, payload.teams)) { 
                const gameWithDistance = {
                  ...game,
                  distanceFromToday: distance,
                  dateKey: dateStr
                }
                allAvailableGames.push(gameWithDistance)
              }
            })
          }
        }
      });
      
      // Sort by distance from today, then by game importance (you could add more criteria)
      allAvailableGames.sort((a, b) => {
        if (a.distanceFromToday !== b.distanceFromToday) {
          return a.distanceFromToday - b.distanceFromToday
        }
        // Secondary sort could be by game status, rankings, etc.
        return 0
      })
      
      // Take the games we need
      const gamesNeeded = minimumGames - totalUserGames
      const fallbackGames = allAvailableGames.slice(0, gamesNeeded)
      
      // Add these games to the appropriate day buckets
      fallbackGames.forEach(game => {
        const dateKey = game.dateKey
        if (!gamesByDay[dateKey]) {
          gamesByDay[dateKey] = {
            actualDate: dateKey,
            games: []
          }
        }
        
        // Remove the distance metadata before adding to results
        const cleanGame = { ...game }
        delete cleanGame.distanceFromToday
        delete cleanGame.dateKey
        
        gamesByDay[dateKey].games.push(cleanGame)
        totalUserGames++
      })
    }

    Log.info(`[MMM-MyScoreboard] Final result: ${totalUserGames} games found across ${Object.keys(gamesByDay).length} days`)
    return gamesByDay
  },
  
  // Fetch and process a single day's games
  async fetchAndProcessDay(payload, targetDate, dayOffset) {
    const self = this
    const league = payload.league
    const teams = payload.teams
    const cacheKey = this.getCacheKey(league, targetDate)
    const dateStr = (typeof targetDate === 'string') ? targetDate : targetDate.format('YYYY-MM-DD')
    
    // Only use cache for non-today dates (today's games change frequently)
    const isToday = dayOffset === 0
    if (!isToday && this.gamesCache[cacheKey]) {
      const cachedGames = this.gamesCache[cacheKey]
      const userGames = this.filterGamesForTeams(cachedGames, teams)
      return { userGames, allGames: cachedGames }
    }
    
    // Fetch from provider
    const provider = this.providers[payload.provider]
    let dayPayload = {...payload, gameDate: targetDate}
    dayPayload.teams = null;   // don't have the provider filter on teams
    
    return new Promise((resolve, reject) => {
      provider.getScores(dayPayload, targetDate, function(scores, sortIdx, noGamesToday) {
        
        // if (scores && scores.length > 0) {
        //   Log.debug(`[MMM-MyScoreboard] 📋 First game sample:`, JSON.stringify(scores[0], null, 2))
        // }
        
        // Store in cache - always cache, but don't READ from cache for today (games change frequently)
        const games = scores || []
        self.gamesCache[cacheKey] = games
        
        // Filter for user's teams
        const userGames = self.filterGamesForTeams(games, teams)
        
        // if (userGames.length > 0) {
        //   Log.debug(`[MMM-MyScoreboard] 🎮 User games sample:`, JSON.stringify(userGames[0], null, 2))
        // }
        
        resolve({ userGames, allGames: games })
      })
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
        
        // Convert results to frontend format (results already have actual date keys)
        const dateKeyedResults = {}
        
        Object.entries(results).forEach(([dateKey, dayData]) => {
          dateKeyedResults[dateKey] = {
            scores: dayData.games || [],
            sortIdx: dayData.sortIdx || 999
          }
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
        
        Log.info(`[MMM-MyScoreboard] Sending score update for ${Object.keys(dateKeyedResults).length} days`)
        
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

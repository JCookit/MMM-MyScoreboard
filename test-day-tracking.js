#!/usr/bin/env node

// Test script to verify day tracking functionality

const path = require('path')
const moment = require('moment-timezone')

// Mock the Log module since this is a test
global.Log = {
  log: console.log,
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
}

// Load the node helper
const NodeHelper = require('./node_helper.js')

// Create a test instance 
const helper = NodeHelper.create({})

// Test payload similar to what you're experiencing
const testPayload = {
  league: 'MLB',
  teams: ['LAD', 'NYY', 'BOS'], // Multiple teams to get multiple games
  gameDate: '2025-01-28', // Base date
  minimumNumberOfGames: 3,
  useFakeDate: false,
  from: '03-01',
  to: '11-30'
}

console.log('🏁 Testing day tracking with MLB teams: LAD, NYY, BOS')
console.log('📅 Base date:', testPayload.gameDate)
console.log('🎯 Minimum games needed:', testPayload.minimumNumberOfGames)
console.log('🔍 Expected: Games should be separated by their fetch days, not grouped into single date\n')

// Test the gather function
helper.gatherMinimumGames(testPayload)
  .then(results => {
    console.log('\n🏆 FINAL RESULTS:')
    console.log('📊 Games by Date keys:', Object.keys(results).join(', '))
    
    // Show details for each date
    Object.keys(results).forEach(dateKey => {
      const dayData = results[dateKey]
      console.log(`\n📅 ${dateKey}:`)
      console.log(`   - actualDate: ${dayData.actualDate}`)
      console.log(`   - games count: ${dayData.games.length}`)
      if (dayData.games.length > 0) {
        dayData.games.forEach((game, idx) => {
          const homeTeam = game.hTeam || game.homeTeam || '?'
          const awayTeam = game.vTeam || game.awayTeam || '?'
          console.log(`   - Game ${idx + 1}: ${awayTeam} @ ${homeTeam}`)
        })
      }
    })
    
    console.log('\n✅ Test completed! Check if games are properly separated by fetch day.')
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
  })

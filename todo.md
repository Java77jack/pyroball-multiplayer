# Pyroball Multiplayer Platform - TODO

## Phase 1: Database Schema
- [ ] Create users table with stats fields (wins, losses, goals, assists)
- [ ] Create game_rooms table (room_code, host_id, status, team_assignments)
- [ ] Create matches table (room_id, home_team, away_team, final_score, duration)
- [ ] Create player_stats table (player_id, match_id, goals, assists, steals, blocks)
- [ ] Create chat_messages table (room_id, sender_id, message, timestamp)
- [ ] Create spectators table (match_id, spectator_id, joined_at)
- [ ] Run migrations and verify schema

## Phase 2: WebSocket Server
- [x] Install Socket.io and dependencies
- [x] Set up WebSocket server in server/socket.ts
- [x] Implement room creation and joining logic
- [x] Implement room listing and matchmaking
- [x] Implement player disconnect/reconnect handling
- [x] Implement spectator join/leave logic
- [ ] Test room management with multiple connections

## Phase 3: Server-Authoritative Game Engine
- [x] Create server game engine (server/gameEngine.ts)
- [x] Implement state validation for player actions
- [x] Implement action queue processing on server
- [x] Implement cheat detection (impossible moves, out-of-bounds)
- [x] Implement goal scoring with validation
- [x] Implement match end conditions and winner determination
- [ ] Create replay/match history system

## Phase 4: Client-Side Prediction & Interpolation
- [ ] Implement client-side prediction for local player
- [ ] Implement state reconciliation when server state differs
- [ ] Implement interpolation for remote players
- [ ] Implement lag compensation for smooth visuals
- [ ] Handle network latency gracefully
- [ ] Test with simulated latency

## Phase 5: Lobby UI
- [ ] Create LobbyScreen component with room list
- [ ] Implement room creation dialog with difficulty/team selection
- [ ] Implement room joining with room code input
- [ ] Show player list in lobby with ready status
- [ ] Implement team assignment UI
- [ ] Implement start match button (host only)
- [ ] Add player count and match status indicators

## Phase 6: Spectator Mode & Stats
- [ ] Implement spectator join from room list
- [ ] Create spectator UI (no controls, camera follows ball)
- [ ] Implement player stats tracking during matches
- [ ] Create player profile page with career stats
- [ ] Create match history page with replays
- [ ] Implement leaderboard system
- [ ] Add stats to database on match completion

## Phase 7: Real-Time Chat
- [ ] Implement chat message sending via Socket.io
- [ ] Implement chat message display in lobby
- [ ] Implement in-game chat overlay
- [ ] Add message history loading
- [ ] Implement chat notifications
- [ ] Add profanity filter (optional)
- [ ] Test chat with multiple players

## Phase 8: Build & Deploy
- [ ] Run full TypeScript type check
- [ ] Build production bundle
- [ ] Test all features end-to-end
- [ ] Deploy to permanent hosting
- [ ] Verify WebSocket connections work
- [ ] Test matchmaking with multiple players
- [ ] Monitor for errors and performance issues


## Player Quality & Experience Enhancements

### Player Grounding & Physics
- [x] Fix player floating on screen - improved ground shadow and anchoring
- [x] Adjust perspective projection to properly ground players on court
- [x] Improve shadow rendering for better depth perception
- [ ] Add proper collision detection with court boundaries

### Shooting Direction & AI
- [x] Fix player shooting directions - now shooting at goal center
- [x] Improve AI targeting logic to aim at goal center
- [x] Adjust player positioning for better shot angles
- [ ] Test shooting accuracy from different court positions

### Player Animations & Polish
- [ ] Enhance player running animations with better arm motion
- [ ] Improve idle stance and posture
- [ ] Add smooth transitions between animation states
- [ ] Improve player sprite quality and detail
- [ ] Add player rotation/facing based on movement direction

### Testing & Validation
- [x] Test player grounding in all court areas
- [x] Verify shooting directions and accuracy
- [ ] Check animation smoothness and quality
- [ ] Test on different screen sizes

## Arena Revamp & Visual Overhaul

### New Arena Image
- [x] Generate new arena with turf surface, skybox, luxury seating, upper deck crowds
- [x] Add sponsor dasher boards (ND Games, Viiwi Mobile, Dubby Energy, Terp Fiendz, ND Labels)
- [x] Update arena background image in ASSET_URLS
- [x] Recalibrate projection grid for new arena alignment

### Goal Updates
- [x] Update goal height to 6ft (from 8ft)
- [x] Update LED backboard to 4ft (total 10ft)
- [x] Add 2ft goal setback from field end line (run-in zone)
- [x] Update GOAL and BACKBOARD constants in gameConstants.ts

### Run-In Zone Rule
- [x] Add RUN_IN_ZONE constants (center red zone width, side zone)
- [x] Implement run-in violation detection in useGameEngine.ts
- [x] Award 1pt to opposing team on center zone run-in violation
- [x] Reset possession from center after violation
- [x] Write vitest for run-in zone rule

### 16 Team Sprites
- [x] Generate sprite sheets for all 16 teams (Inferno, Vortex, Empire, Sledge, Glaciers, BlueClaws, NightRaid, Seawolves, Rebellion, Railers, Havoc, Wrath, Sizzle, Hoppers, Gauchos, Engineers)
- [x] Upload all 16 sprite sheets to CDN
- [x] Add spriteSheet field to TeamData interface
- [x] Expand TEAMS object to all 16 teams with CDN sprite URLs
- [x] Update sprite rendering system to use sprite sheet source rectangles
- [x] Update TeamSelect page with animations for all 16 teams

### Net Physics & LED Backboard Effects
- [x] Add netDeform and ledFlash to GameState interface
- [x] Trigger net deformation on goal scored (mesh bulge + wobble)
- [x] Trigger LED backboard flash in team colors on goal scored
- [x] Add decay timers for net deform and LED flash
- [x] Render net mesh lines with quadratic curve deformation
- [x] Render LED backboard with pulsing strobe glow effect

### HowToPlay Updates
- [x] Add Run-In Zone Rule to Scoring Zones section
- [x] Add LED Backboard info to Special Mechanics section
- [x] Update court description with new goal specs (6ft tall, 4ft LED, 2ft setback)

## Dynamic Broadcast Camera System
- [x] Analyze current camera/rendering pipeline (projection, shake, zoom)
- [x] Design camera state machine (offense, transition, scoring zone, shot focus)
- [x] Implement smooth ball-carrier tracking with forward anticipation offset
- [x] Implement context-aware zoom (widen on transitions, tighten near goal)
- [x] Implement easing/lerp for all camera movement (no snapping)
- [x] Integrate camera transform into GameCanvas render loop
- [x] Ensure both offensive and defensive players remain visible
- [x] Maintain consistent scale (no drastic zoom changes)
- [x] Prioritize gameplay readability over cinematic effects
- [x] Write vitest for camera state logic

## Team Logos (12 Missing)
- [x] Generate logo for Glaciers
- [x] Generate logo for Blue Claws
- [x] Generate logo for Night Raid
- [x] Generate logo for Seawolves
- [x] Generate logo for Rebellion
- [x] Generate logo for Railers
- [x] Generate logo for Havoc
- [x] Generate logo for Wrath
- [x] Generate logo for Sizzle
- [x] Generate logo for Hoppers
- [x] Generate logo for Gauchos
- [x] Generate logo for Engineers
- [x] Upload all logos to CDN and update TEAMS data

## Dynamic Crowd Reaction System
- [x] Canvas-based crowd animation (arms waving, standing ovations on goals)
- [x] Crowd color matching the scoring team
- [x] Confetti burst effect on goals
- [x] Intensity scaling (bigger reactions for clutch/overtime goals)
- [x] Crowd audio effects (cheers on goals, ambient murmur during play)
- [x] Write vitest for crowd reaction system

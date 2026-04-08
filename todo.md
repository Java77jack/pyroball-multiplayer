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


## Visual & Mechanics Improvements

### Arena Rendering
- [x] Generate professional Pyroball arena with correct isometric perspective
- [x] Upload arena image to CDN
- [x] Integrate arena background into game rendering
- [x] Adjust field perspective coordinates to match arena
- [x] Verify players render correctly over arena background

### Player Movement
- [x] Implement acceleration/deceleration physics
- [ ] Enhance player running animation with arm swinging
- [ ] Add idle stance with realistic posture
- [ ] Add directional facing based on movement
- [ ] Smooth transitions between animation states

### Hand-Based Ball Interactions
- [x] Modify shooting mechanics to show hand/arm extension (ball released from hand position)
- [x] Add passing animation with arm motion (ball released from hand position)
- [ ] Show ball in player's hand during possession
- [ ] Add ball trajectory visualization
- [ ] Improve visual feedback for shot power

### Testing & Polish
- [x] Test player animations in all movement directions
- [x] Verify ball interactions look natural
- [x] Check arena image integration
- [ ] Test on multiple screen sizes
- [x] Verify gamepad controls still work

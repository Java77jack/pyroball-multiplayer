# Player Profile System TODO

## Phase 1: Database Schema
- [ ] Extend schema with achievements table
- [ ] Add player_achievements join table
- [ ] Add player_stats table with career statistics
- [ ] Add leaderboard materialized view
- [ ] Generate and apply migrations

## Phase 2: tRPC Procedures
- [ ] Create profile.getProfile procedure
- [ ] Create profile.getStats procedure
- [ ] Create profile.getAchievements procedure
- [ ] Create profile.getLeaderboard procedure
- [ ] Create profile.updateStats procedure (called after matches)
- [ ] Create profile.unlockAchievement procedure

## Phase 3: Profile UI
- [ ] Design profile page layout
- [ ] Build player header with avatar and basic info
- [ ] Build stats display (wins, losses, goals, assists, etc.)
- [ ] Build achievements showcase
- [ ] Add profile editing for display name/bio
- [ ] Add follow/friend system UI

## Phase 4: Achievements System
- [ ] Define achievement types and unlock conditions
- [ ] Implement achievement unlock logic
- [ ] Add achievement notifications
- [ ] Build achievement detail modals
- [ ] Add achievement progress tracking

## Phase 5: Leaderboard
- [ ] Design leaderboard page
- [ ] Implement global rankings by wins/rating
- [ ] Add filtering (weekly, monthly, all-time)
- [ ] Add player search
- [ ] Show rank progression

## Phase 6: Integration & Testing
- [ ] Write unit tests for profile procedures
- [ ] Test achievement unlock logic
- [ ] Test leaderboard calculations
- [ ] Integrate profile with match results
- [ ] Deploy and test end-to-end

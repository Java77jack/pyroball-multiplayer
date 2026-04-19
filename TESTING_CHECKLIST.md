# Pyroball: Testing Checklist for itch.io Release

## Game Modes

### [ ] Practice Mode
- [ ] Start practice game successfully
- [ ] Player controls respond to keyboard (W/A/S/D)
- [ ] Ball physics work correctly (bounces, rolls)
- [ ] Shooting works (Space/E key)
- [ ] Passing works (Q key)
- [ ] Catching works (automatic)
- [ ] Score updates correctly
- [ ] Timer counts down
- [ ] Game ends at 0:00
- [ ] Results screen shows final score
- [ ] Can return to main menu

### [ ] Quick Play (vs AI)
- [ ] Team selection works
- [ ] Both home and away teams can be selected
- [ ] VS screen displays correctly
- [ ] Game starts after VS animation
- [ ] AI players move and play
- [ ] AI shoots at goal
- [ ] AI passes to teammates
- [ ] Score updates correctly
- [ ] Game ends at time limit
- [ ] Winner is determined correctly
- [ ] Results screen shows stats

### [ ] Season Mode
- [ ] Season hub loads
- [ ] Team selection grid displays all 16 teams
- [ ] Team logos display correctly
- [ ] Team stats display (speed, scoring, rebounding, aggressiveness)
- [ ] Difficulty selection works
- [ ] Season creation works
- [ ] First match starts correctly
- [ ] Match results update season standings
- [ ] Can play multiple matches in sequence
- [ ] Season stats accumulate correctly

### [ ] How To Play
- [ ] Instructions display correctly
- [ ] All controls are documented
- [ ] Back button works

### [ ] Teams Screen
- [ ] All 16 teams display
- [ ] Team logos show
- [ ] Team stats display
- [ ] Team colors are correct

## Controls & Input

### [ ] Keyboard Controls
- [ ] W/A/S/D moves player
- [ ] Space/E shoots
- [ ] Q passes
- [ ] Esc returns to menu
- [ ] Enter/Space skips animations

### [ ] Gamepad/Controller (if available)
- [ ] Left stick moves player
- [ ] A button shoots
- [ ] X button passes
- [ ] Y button returns to menu
- [ ] Navigation works in menus

## Graphics & Performance

### [ ] Player Rendering
- [ ] Players display with correct team colors
- [ ] Player numbers are visible
- [ ] Player animations are smooth
- [ ] Running animation is fluid
- [ ] Jumping animation works
- [ ] Shooting animation works
- [ ] Idle stance looks natural

### [ ] Court & Arena
- [ ] Court displays correctly
- [ ] Goals are visible
- [ ] Court boundaries are clear
- [ ] Crowd renders without lag
- [ ] Lighting and shadows look good

### [ ] Ball Physics
- [ ] Ball renders correctly
- [ ] Ball bounces realistically
- [ ] Ball rolls smoothly
- [ ] Ball trajectory is predictable

### [ ] Performance
- [ ] Game runs at 60fps (or consistent frame rate)
- [ ] No stuttering during gameplay
- [ ] No lag spikes
- [ ] Smooth camera movement
- [ ] Smooth animations

## UI & Navigation

### [ ] Main Menu
- [ ] All buttons display correctly
- [ ] Buttons are clickable
- [ ] Navigation works smoothly
- [ ] Title and version display

### [ ] Team Select
- [ ] Team carousel works
- [ ] Teams can be selected
- [ ] Selection advances to next step
- [ ] Back button works

### [ ] Game HUD
- [ ] Score displays correctly
- [ ] Timer displays correctly
- [ ] Team names display
- [ ] Player indicators show
- [ ] Shot meter displays (when shooting)

### [ ] Results Screen
- [ ] Final score displays
- [ ] Winner is announced
- [ ] Stats display
- [ ] Can return to menu
- [ ] Can play again

## Audio

### [ ] Music
- [ ] Background music plays
- [ ] Music loops correctly
- [ ] No audio glitches

### [ ] Sound Effects
- [ ] Shooting sound plays
- [ ] Goal sound plays
- [ ] UI click sounds play

## Browser Compatibility

### [ ] Chrome/Chromium
- [ ] Game loads
- [ ] All features work
- [ ] Performance is good

### [ ] Firefox
- [ ] Game loads
- [ ] All features work
- [ ] Performance is good

### [ ] Safari
- [ ] Game loads
- [ ] All features work
- [ ] Performance is good

### [ ] Edge
- [ ] Game loads
- [ ] All features work
- [ ] Performance is good

## Responsive Design

### [ ] Desktop (1920x1080)
- [ ] Game displays correctly
- [ ] All UI is visible
- [ ] Controls are responsive

### [ ] Laptop (1366x768)
- [ ] Game displays correctly
- [ ] All UI is visible
- [ ] Controls are responsive

### [ ] Tablet (iPad, 1024x768)
- [ ] Game displays correctly
- [ ] Touch controls work (if implemented)
- [ ] UI is readable

### [ ] Mobile (1280x720)
- [ ] Game displays correctly
- [ ] Touch controls work (if implemented)
- [ ] UI is readable

## Edge Cases & Error Handling

### [ ] Network
- [ ] Game works offline
- [ ] No console errors
- [ ] Graceful error messages

### [ ] Performance Under Load
- [ ] Game runs smoothly with all features
- [ ] No memory leaks
- [ ] Consistent performance

### [ ] Unusual Input
- [ ] Rapid button clicks don't break game
- [ ] Holding keys works correctly
- [ ] Simultaneous inputs handled properly

## Known Issues & Limitations

- **Multiplayer**: Not implemented (Phase 1-8 planned for future)
- **Spectator Mode**: Not implemented
- **Chat**: Not implemented
- **Replays**: Not implemented
- **Leaderboard**: Not implemented
- **Mobile Touch Controls**: Not implemented

## Release Checklist

- [ ] All critical tests pass
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Documentation is complete
- [ ] Build is optimized
- [ ] itch.io page is set up
- [ ] Screenshots are captured
- [ ] Description is written
- [ ] Tags are set
- [ ] Release version is tagged in git

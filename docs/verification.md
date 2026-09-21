# Verification — 21 September 2026

## Automated checks

- 18 tests pass across physics and birthday lamp collection, including clear separation of lamps from gates and a combined gate-and-lamp route using normal steering.
- A controller using only normal steering completes the entire course, hits all 20 gates and collects all 20 lamps for 8,400 points in less than two minutes.
- TypeScript and production Vite build pass. Production JavaScript is approximately 134 KB gzip, with two local font subsets and home-screen icons.
- `npm audit` reports no known dependency vulnerabilities.

## Browser checks

- Inspected portrait framing at 390 × 844 and 360 × 800 and landscape at 844 × 390 and 568 × 320 in the Chromium-based in-app browser. Verified small landscape result dialogs scroll to all actions.
- Start, how-to-play, pause, resume, restart and finish screens exercised through their actual buttons.
- Drag steering checked visually against skier movement, snow spray and world-space tracks.
- A full browser run finished in 1:29.4 with 17/20 gates and 5,600 points before the birthday additions.
- Birthday version: home screen displays “Happy birthday, Ljubica!”, lamp/table display and small gifts. Four lamp designs render between gate flags. A full browser run finished in 1:13.0 with 8 gates and 4 lamps, correctly scoring 1,000 points. The finish screen retained the earlier 5,600 best score after page reloads. Replay reset lamps, gates and score to zero. Pause/resume preserved progress.
- Independent source review found no remaining important defects in core or birthday features.

## Physical-device and deployment checks still to do

The browser viewport checks are not physical iPhone or Android tests. Frame rate, battery use, real touch feel, Safari audio interruptions, notch/safe-area behavior and Add to Home Screen need final checks on real devices. No measured 60-FPS guarantee is made. The game is running locally; no public hosting deployment has been performed. Offline caching is not implemented.

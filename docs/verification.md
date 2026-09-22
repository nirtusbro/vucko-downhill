# Verification — 22 September 2026

## Automated checks

- 38 tests pass across physics, difficulty, lamp collection and falling presents. Checks include 45-metre gate spacing, saved per-design lamp counts, repeats across reloads, damaged/unavailable storage, random safe drops across 50 seeds, landing before collection, one-time +200 scoring, replay and finish behavior.
- A controller using only normal steering completes the shorter course in every difficulty, hits all 20 gates and collects all 20 lamps for 8,400 points plus any present bonuses, in 27–60 seconds. Every mode reaches its increased pace within three seconds.
- TypeScript and production Vite build pass. Production JavaScript is approximately 137 KB gzip, with two local font subsets and home-screen icons.
- `npm audit` reports no known dependency vulnerabilities.

## Browser checks

- Inspected portrait framing at 390 × 844 and 360 × 800 and landscape at 844 × 390 and 568 × 320 in the Chromium-based in-app browser. Verified small landscape result dialogs scroll to all actions.
- Start, how-to-play, pause, resume, restart and finish screens exercised through their actual buttons.
- Drag steering checked visually against skier movement, snow spray and world-space tracks.
- A full browser run finished in 1:29.4 with 17/20 gates and 5,600 points before the birthday additions.
- Earlier birthday version: home screen displays “Happy birthday, Ljubica!”, lamp/table display and small gifts. Four lamp designs now sit in open stretches between gate stations. An earlier full browser run finished in 1:13.0 with 8 gates and 4 lamps, correctly scoring 1,000 points. Replay reset lamps, gates and score to zero. Pause/resume preserved progress.
- Faster version: a Classic browser run finished in 47.3 seconds with 7 gates, 1 lamp and 3 presents. The result correctly displayed 1,650 total points and +600 present points, preserving the existing Classic best of 8,350. Gold landing rings and wrapped gifts rendered on the slope; Expert reached 132 km/h on a straight. Mode selection, independent best labels and zeroed replay counters were checked through actual controls.
- Inspected new home controls at 390 × 844, compact HUD/results at 320 × 568, and landscape home at 568 × 320. Fixed overlapping landscape title/selector and cramped narrow-phone HUD labels. Result dialogs remain scrollable to all actions.
- Keepsake shelf: an Easy run on the 1,000-metre course finished in 42 seconds, collecting 3 lamps. Returning home showed one rose mushroom, one lavender pleated lamp and one blue porcelain lamp. Reloading retained all three and their matching counts. The home shelf uses four compact illustrations, which gain color when collected. Its portrait position accounts for the top safe-area inset.
- Independent source review found no remaining important defects in core or birthday features.

## Physical-device and deployment checks still to do

The browser viewport checks are not physical iPhone or Android tests. Frame rate, battery use, real touch feel, Safari audio interruptions, notch/safe-area behavior and Add to Home Screen need final checks on real devices. No measured 60-FPS guarantee is made. The game is running locally; no public hosting deployment has been performed. Offline caching is not implemented.

# Vučko — Downhill days

A complete mobile-first slalom skiing game, personalized as a birthday present for Ljubica, built with Three.js, TypeScript, and Vite. All mountain scenery, table lamps, birthday decorations and the animated wolf are modeled procedurally. Audio is synthesized locally; fonts are bundled. There are no remote asset or account dependencies.

## Run

Requires Node.js 22.12+ (or a supported newer LTS).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To play on a phone, connect the phone to the same Wi-Fi and open Vite's **Network** URL. The host computer must be running the server and allow the connection through its firewall.

```sh
npm test       # Physics and full-course regression checks
npm run build # TypeScript checks + production static build
npm run preview
```

Deploy the contents of `dist/` to any static HTTPS host. Relative asset paths support hosting at a subdirectory. There is no backend. `public/manifest.webmanifest`, SVG and PNG icons, Apple home-screen metadata and standalone display are included. This is PWA-ready; an offline service worker is deliberately not installed. Add to Home Screen is best checked on the final HTTPS URL.

## Play

- **Phone:** steer with your right thumb by dragging left/right. Hold the gold **Speed up** button with your left thumb for a 45% increase in target speed. Both touches work independently; releasing boost eases speed back down, while releasing steering straightens gradually. A full-strength turn takes roughly 90 pixels of drag on a phone.
- **Desktop:** mouse drag, A/D, or left/right arrows to steer; hold Space (or the speed button) to boost. P or Esc toggles pause. Boost is unlimited, with the tradeoff of less reaction time for gates and pickups; it stops during crashes, pause and finish.
- Pass between both flags of each gate. Hits award 100 points multiplied by a combo that caps at ×4.
- Choose Easy, Classic or Expert on the home screen. Cruising speeds are approximately 86, 108 and 130 km/h; sharper carving costs speed. Easy has wider gates and gentler turns; Expert has tight gates and stronger turns. Your selection and each mode's best score are saved separately.
- A prominent **High score** on the home screen shows your saved record for the selected difficulty, updates after a new best and survives reloads.
- Collect optional table lamps in the open stretches between gates for 50 extra points. Each run places 8 lamps, chosen by the run seed with one lamp per band of two or three stretches, so their spots vary between runs and never bunch. A lamp sits halfway to the next gate, held 5 metres wide of the direct line on the previous gate's side, so a pickup means holding your line and cutting back late for the next gate. Each run rolls 8 distinct designs from a catalogue of 100 lamps. Ten shape families and ten finishes vary silhouettes, proportions, colours and decorative details. Collected lamps float up and disappear with a chime. The HUD and finish screen show the collection count. A perfect run with all 8 lamps scores 7,800 before present and finish-time bonuses.
- A birthday present falls at a random location about 5.5 seconds into the run and then every 9–14 seconds, so a typical run sees three or four. Gold rings mark their landing spots; ski close after they land for +200 points. Drops stay clear of gate stations and the slope edges, and vary each run. Missed presents disappear; they never cause a crash or break your combo.
- Every lamp pickup is saved immediately to **Ljubica’s collection**, accessible from the home screen and finish results. The gallery shows collected lamps in colour and undiscovered ones as black silhouettes, with filters for collected/missing and rarity. Counts persist across runs and reloads; the original four lamp counts migrate automatically. If storage is unavailable, progress stays available for the session.
- **Rarity:** 40 Common, 30 Uncommon, 20 Rare, 8 Epic and 2 Legendary designs. Base tier weights are 55/25/14/5/1; weighted sampling without replacement and a 3× weight for unseen designs help collection progress. All 100 can appear in any difficulty.
- **Finish-time bonus:** `max(0, round((90 − seconds) × 50))`, awarded only once after crossing the finish. Faster runs earn more; slow runs lose no existing points. The result shows on-slope points, time bonus and total separately. Existing high scores are preserved.
- Missed gates break the combo. Trees, rocks and the course boundary cause a short tumble and automatic recovery.
- The 1,000-meter, 20-gate course has gates 45 metres apart (previously 65), giving about a third less time between turns. A clean run takes roughly 30–50 seconds depending on difficulty; crashes add time. Lamps remain halfway between gate stations.
- Sound starts only after a gesture. The mute button and best score persist on this browser. The run pauses when the page hides or loses focus.

## Structure

| File                 | Responsibility                                                              |
| -------------------- | --------------------------------------------------------------------------- |
| `src/physics.ts`     | Renderer-independent movement, course, seeded lamp spots, collisions, scoring and finish |
| `src/difficulty.ts`  | Speed, steering, gate opening and lamp pickup settings per mode             |
| `src/presents.ts`    | Random timed drops, landing, swept pickup scoring and bounded gift pool    |
| `src/collection.ts`  | Versioned collection counts, original-save migration and storage fallback        |
| `src/lamp-catalog.ts` | Stable 100-design catalogue, lamps per run and weighted run selection |
| `src/lamp-model.ts` | Cached 3D sculptures for all ten shape families |
| `src/lamp-art.ts` | Matching SVG collection illustrations |
| `src/collection-view.ts` | Gallery, filters and home preview |
| `src/scoring.ts` | Finish-time bonus formula |
| `src/input.ts`       | Pointer capture, analog drag and keyboard input                             |
| `src/scene.ts`       | Rendering, responsive following camera, gates and lighting                  |
| `src/character.ts`   | Articulated wolf, scarf, skis, poles and celebration                        |
| `src/environment.ts` | Culled scenery chunks, instanced trees/fences, mountains and cabins         |
| `src/effects.ts`     | Fixed-size pools for world-space ski tracks and snow spray                  |
| `src/birthday.ts`    | Run lamp models, pickup animation, gifts, bunting and home display |
| `src/audio.ts`       | Gesture-unlocked Web Audio ambience and effects                             |
| `src/main.ts`        | Fixed-step loop, screens, HUD, tutorial and browser lifecycle               |

Simulation runs at 120 fixed steps per second independently of rendering. Rendering caps pixel ratio at 1.75, uses no real-time shadow maps, limits snow particles to 110 and track segments to 900, and culls course chunks behind/ahead of the skier. Geometry and materials are reused. The camera adapts between portrait and landscape.

The automated tests cover acceleration, steering inertia, edge resistance, 30/120-Hz trajectory consistency, single-award gate scoring, missed gates, boundary/rock crash recovery, simultaneous collision/gate feedback, full-course reachability, frozen finish time, lamp pickup bonuses, missed pickups, and replay resets. Browser checks and outstanding physical-device checks are recorded in `docs/verification.md`.

To regenerate home-screen icons after editing `public/icon.svg`, run `node scripts/icons.mjs`.

The bundled Nunito typeface is distributed under the SIL Open Font License (see `node_modules/@fontsource-variable/nunito/LICENSE`).

# Vučko — Downhill days

A complete mobile-first slalom skiing game, personalized as a birthday present for Ljubica, built with Three.js, TypeScript, and Vite. Twenty levels hold a hundred table lamps: four to pick up on each slope and one earned at each finish. All mountain scenery, table lamps, birthday decorations and the animated wolf are modeled procedurally. Audio is synthesized locally; fonts are bundled. There are no remote asset or account dependencies.

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

Deploy the contents of `dist/` to any static HTTPS host. Relative asset paths support hosting at a subdirectory. There is no backend. `public/manifest.webmanifest`, PNG icons (regular and maskable), Apple home-screen metadata and standalone display are included. A Workbox service worker (`dist/sw.js`, built by `vite-plugin-pwa`) precaches the whole game so it runs offline once installed. New builds are not applied mid-run: when one is ready an “Update ready · Restart” button appears on the menu. Installing is made discoverable on the menu: Chrome and Edge only show their own banner after a few visits, so the game captures their install prompt and offers it behind an “Install on this phone” button as soon as the browser allows; Safari has no such prompt, so on an iPhone or iPad the menu shows a hint to use Share → Add to Home Screen instead. Both disappear once the game runs from the home screen. Add to Home Screen is best checked on the final HTTPS URL.

## Play

- **Phone:** steer with your thumb by dragging left/right anywhere on the lower part of the screen. Releasing straightens gradually. A full-strength turn takes roughly 90 pixels of drag on a phone.
- **Desktop:** mouse drag, A/D, or left/right arrows to steer. P or Esc toggles pause.
- **20 levels, 100 lamps, 20 bonus levels.** Level n owns catalogue lamps 5n−4 to 5n: four wait on its slope as pickups and the fifth, the rarest, is earned by **clearing every gate and reaching the level's goal score**, which also unlocks the next level. Miss a single gate and the finish lamp stays dark for that run, however high the score. Because the catalogue is ordered by rarity, the ladder climbs from Common lamps to the two Legendary ones on level 20. Every level is fixed in every element: its layout, its lamps, its rocks and trees, and even where and when the presents fall, so a level plays the same way every time. Slope lamps you pick up are only kept if you pass the level on that run; fail, and they go back to the slope. The finish lamp likewise stays a silhouette until you pass. The home screen shows the current level, its finish lamp, the four slope lamps (lit once found), the goal and your level best, with arrows to revisit any unlocked level. The **Levels & lamps** map lists all 20 levels with their five lamps, the next level highlighted and locked levels greyed, with a Ski button on each unlocked level.
- **Twenty hand-placed levels.** Every gate of every level is authored by hand in `src/levels.ts` as [x, gap, width scale], along with which stretches hold the four lamps, guard trees, stray rocks, line rocks (a rock on the direct line halfway along), rock gates (two rocks to thread on the way into the next flags) and weaves (three rocks alternating sides on the way in). Nothing is generated at random; a level plays the same way every time, presents included. Each level is named and introduces a challenge, shown as a one-line hint on the home card:

  | # | Level | What it teaches or adds |
  | - | ----- | ----------------------- |
  | 1 | First tracks | Steering: wide gates whose swings grow from ±4.5 to ±7 |
  | 2 | Little lights | The fork: a rock on the line beside every lamp |
  | 3 | Find the rhythm | Combo: even spacing, one off-beat gate, goal at 72% |
  | 4 | Squeeze | Two funnels closing to 75%, a rock gate at the end |
  | 5 | Halfway sprint | Tight par and 120 points per second: carry speed |
  | 6 | Hold the line | Same-side pairs with a rock between them, then a snap back |
  | 7 | Light touch | Two chicanes of 30-metre flicks that narrow as they go |
  | 8 | Read ahead | Three rock gates on the way into flags |
  | 9 | Guarded lights | Guard trees on every lamp, rock-strewn staircases |
  | 10 | Commit | Edge-to-edge hairpins with calm gates between |
  | 11 | The long run | Twenty-two gates mixing every earlier trick |
  | 12 | Tight corridor | Flags narrowing to 4.7 m with four rock gates |
  | 13 | Boulder field | Three weaves back to back, rock gates and stray rocks |
  | 14 | Zigzag | Edge-to-edge alternation at 36-metre spacing |
  | 15 | No mercy | Goal at 90%, hairpins, a weave and line rocks |
  | 16 | Speed run | Tight par, 250 points per second, goal at 94% |
  | 17 | Thin air | 37 m/s through 5.8-metre flags with chicanes |
  | 18 | The gauntlet | Three weaves, three rock gates, hairpins and flicks |
  | 19 | Everything at once | 26 gates, every trick, goal at 90% |
  | 20 | The summit | 40 m/s, 5.5-metre flags, 26 hazards, goal at 97% |

  **Beyond the summit.** Ten bonus levels, 21 to 30, for those who really want to play: no lamps, no presents, just gates and rock. Every stretch that carries nothing else gets a stray rock, flags narrow from 5.4 m to 4.7 m (4.2 m inside funnels), speed climbs from 44 to 49 m/s, and goals sit at 90% to 97% of the gate maximum, so at most one tumble is survivable. They unlock after level 20 and are listed in their own section at the bottom of the level map. Clearing one earns nothing but the next.

  | # | Level | What it throws at you |
  | - | ----- | --------------------- |
  | 21 | Black run | Four rock gates and two weaves at speed |
  | 22 | Rock garden | Seven weaves back to back |
  | 23 | The chute | Three funnels with chicanes between |
  | 24 | Knife edge | Hairpins nearly every gate, rocks on every way in |
  | 25 | Couloir | Twenty-eight gates of 30-metre flicks ending in rock |
  | 26 | Icefall | Staircases with a rock on every step |
  | 27 | Vertigo | Hairpins into chicanes into hairpins |
  | 28 | Whiteout | Everything, thirty gates |
  | 29 | Last light | Tighter and rockier still |
  | 30 | Beyond the summit | Thirty gates, every trick, goal at 97% |

  **The north face.** Ten more levels, 31 to 40, that add one mechanic: **slopes**, bands of shaped snow that move the skier. A band runs from 12 m past one gate to 12 m before the next (10 m before any rock in the stretch) and eases in and out over 8 m at each end. Snow comes in five shapes, and the skis feel each one straight off the surface, since the sideways drive is read from the local fall of the snow: a **camber** tilts the whole piste one way (16 cm a metre); a **dish** curves it up into 1.6-metre walls either side that pull toward the middle, so flags up on the walls take a deliberate climb; a **crown** raises a 1.4-metre ridge down the middle that tips the skier off to whichever side they are on; a **roller** is a 3 m knoll across the piste that slows the climb, hides the flags behind its crest and gives speed back on the far side; a **step** splits the piste into two shelves 1.6 m apart with a bank across the middle, so you pick a shelf or cross the bank. The physics is a sideslip: gravity across the tilt drives the skis into a skid that builds at 16 m/s² while the bank lasts, edge grip bleeds it away with a 0.45-second time constant (so it tends to 7.2 m/s), and the skid keeps carrying the skier for a moment after the bank ends. Skidding scrubs forward speed (0.25 m/s² per metre a second of slip), and height is speed: dropping into the trough of a bank gives a little back and climbing its crest takes some away. A 26-metre band moves an un-steered skier about two metres by its end and another two as the skid dies; a bank followed closely by a rock gate is the hardest thing on the mountain. Gates always stand on flat snow. The bank is real terrain: the piste between the fences is its own finely gridded strip of snow, shaped to the level, and where a band lies the snow tilts about the centre line (16 cm a metre), sinking on the side it pushes toward and rising on the other, easing in over 8 m and coming back level just inside the fences; the sunk side is shaded like a trough in shadow, Vučko leans with the bank and throws spray across it. There are no markings or arrows: you read the slope from the snow. A band may share its stretch with a rock gate only, so the drift lines you up with a rock rather than the gap. The ladder restarts a little slower than level 30 (44 m/s) and climbs to 49 m/s with flags narrowing from 5.2 m to 4.7 m and goals from 90% to 97%.

  | # | Level | What it throws at you |
  | - | ----- | --------------------- |
  The ten are planned as a course, and every one of them is hard: they come after thirty levels. Each has a signature shape, but no level is a drill in one shape. Every level mixes at least four kinds of challenge (shapes of snow, rock gates, weaves, line-rock staircases, quick flicks), never asks the same thing more than four stretches running, changes rhythm between 30-metre flicks and 50- to 60-metre stretches, and has at least one edge-to-edge hairpin. A design test (`tests/design.test.ts`) reads every level for exactly these things, prints a report, and fails the build if a level goes monotonous, soft or impassable.

  | # | Level | Signature | What it throws at you |
  | - | ----- | --------- | --------------------- |
  | 31 | First bank | Camber | Off-camber bands first (aim upslope early), then with the grain (hold back or overshoot); rock gates and a weave between |
  | 32 | Halfpipe | Dish | Dishes into rock gates high on the walls, a line-rock staircase back down a wall, a camber and a crown for contrast |
  | 33 | The ridge | Crown | Flank pairs where staying out pays, crossings into rock gates, a blind crossing over a roller, a 60-metre crown |
  | 34 | Terraces | Step | Rides and climbs into rock gates, a rock-strewn staircase, a camber, a dish and a roller so no two banks ask the same |
  | 35 | Blind rollers | Roller | Crests before hairpins, crests before rock gates you cannot see, flicks straight after a crest, a staircase |
  | 36 | Long traverse | Camber | 60-metre stretches where the skid reaches full speed and carries past the band; four banks in a row into rock gates |
  | 37 | Switchbacks | Crown and dish | One throws you out to the flank, the next pulls you in while the flags sit up the wall; rock gates at the foot of both |
  | 38 | Cornice | Roller and step | Crests before flicks you could not see, steps into rock gates both ways, a dish into a rock gate, narrowing flicks |
  | 39 | Avalanche path | All five | Each shape behind the rock feature that hurts it most: camber into a rock gate, roller before a blind rock gate, step onto the high shelf |
  | 40 | North face | All five | The whole course in order and tighter: thirty gates, most bands into rock gates, goal at 97% |

  Across the ladder the course grows from 10 to 26 gates, gaps close from 55 to 30–45 metres, gate openings narrow from 8.4 to 5.5 metres (further within funnels and the corridor), and cruising speed rises from about 91 to 166 km/h (each level's authored speed times a global 1.15 scale, after the game was made 15% faster). **No two consecutive gates can be taken in a straight line:** their openings never overlap sideways, and where a design wants a same-side pair or a small step, a rock sits on the line between them (a lamp's fork rock, a line rock, a rock gate or a weave), so the skier always has to move. Every layout is checked so a relaxed steering line can still hit every gate and pickup at that level's speed with at least 0.4 m of gate margin, and a straight, un-steered line passes no level.
- **Replays.** Lamps already in the collection are not shown on the slope again and score nothing, and the HUD counts only the lamps still to find.
- **Endless run.** A separate mode from the home screen: a course generated on the fly from a random seed, with only gates, rocks, trees and presents. It starts slow and easy (22 m/s, 9-metre flags, 55-metre gaps) and hardens over the first three kilometres (34-metre gaps, 4.8-metre flags, flicks, same-side pairs with line rocks, rock gates, weaves, trees on the outside of turns), with cruising speed still climbing to 46 m/s by six kilometres. It starts with three lives, every miss or tumble costs one, and every ten presents caught win a life with no cap, so ten gifts on three lives make a fourth. The HUD shows the lives as large hearts under the top bar (hollow for lost ones below three, one heart and a count past six), which flash when one is lost, plus the count of presents toward the next life and the distance; the home screen shows the endless best score and longest run under the Endless button, and the results record both. Consecutive gates never line up unless a rock sits between them, as in the levels. The scenery, ground, glints and chairlift are built one terrain period (1,800 m) long and leapfrog down the slope, so the run can go on indefinitely.
- **Gates.** Pass between both flags. Hits award 100 points multiplied by a combo that caps at ×8, and crossing within 1 metre of the gate's centre adds a +50 bullseye. The slope steepens so cruising speed rises 8% by the finish.
- **Slope lamps.** Each level's four pickups sit off the racing line on the previous gate's side of their stretch and move earlier in the stretch on faster levels to leave room to cut back. They are worth no points, so a replay with some lamps already owned has the same maximum score as the first run; they are kept only by passing the level. From level 2 a fork rock sits on the direct line beside every pickup: go wide for the lamp or cut inside past the rock. From level 7 some pickups also get a guard tree on the lamp side. Lamp-free stretches hold a rock where a lamp would have been with a chance rising from 10% at level 3 to 80% at level 20.
- **Presents.** A birthday present falls at a random location about 5.5 seconds into the run and then every 9–14 seconds. Gold rings mark their landing spots; ski close after they land for +200 points. Drops stay clear of gate stations, rocks, trees and the slope edges, and vary each run. Missed presents disappear; they never cause a crash or break your combo.
- **Finish-time bonus:** points per second under the level's par time, awarded once after crossing the finish. Most levels pay 50 a second with par about 1.3× the course length at cruising speed plus two seconds, so a clean run earns a few hundred points; Halfway sprint pays 120 a second against a tighter par, and Speed run and The summit 250 a second against par at 1.1×. The result shows on-slope points, time bonus, goal and total, and after a pass a card above the table introduces the next level by name, hint, gate count, goal and the lamp it earns.
- Missed gates and tumbles break the combo, and every tumble also costs 300 points (never below zero). Rocks and trees inside the course, the edge scenery and the course boundary cause a short tumble and automatic recovery. The HUD's goal line turns red the moment a gate is missed. A clean level takes roughly 20–30 seconds.
- Sound starts only after a gesture. The mute button, level progress and best scores persist on this browser. The run pauses when the page hides or loses focus.

## Structure

| File                 | Responsibility                                                              |
| -------------------- | --------------------------------------------------------------------------- |
| `src/levels.ts`      | Forty hand-placed level designs, level-to-lamp mapping, slope bands and the course builder |
| `src/piste.ts`       | The piste snow as fine tiles shaped to the course: banks tilt the surface and shade the trough; glints ride on it |
| `src/endless.ts`     | The endless course: generated ahead of the skier, harder with distance |
| `src/physics.ts`     | Renderer-independent movement, collisions, scoring, goal and finish         |
| `src/progress.ts`    | Unlocked level, the hundred-lamp collection and best score per level in storage |
| `src/presents.ts`    | Random timed drops, landing, swept pickup scoring and bounded gift pool    |
| `src/lamp-catalog.ts` | Stable 100-design catalogue |
| `src/lamp-model.ts` | Cached 3D sculptures for all ten shape families |
| `src/lamp-art.ts` | Matching SVG illustrations |
| `src/collection-view.ts` | Level map listing each level's five lamps, plus the home preview |
| `src/hazards.ts`     | Pooled rocks and trees drawn for whatever hazards are in view |
| `src/random.ts`      | Hashed seeded generator behind every level layout |
| `src/scoring.ts` | Finish-time bonus against par |
| `src/input.ts`       | Pointer capture, analog drag and keyboard input                             |
| `src/scene.ts`       | Rendering, responsive following camera, per-level gates and lighting        |
| `src/character.ts`   | Articulated wolf, scarf, skis, poles and celebration                        |
| `src/environment.ts` | Culled scenery chunks, instanced forest and fringe trees, bushes, lamp posts, fences, a chairlift, mountains, cabins and movable finish |
| `src/effects.ts`     | Fixed-size pools for world-space ski tracks and snow spray                  |
| `src/birthday.ts`    | Slope lamp models, pickup animation, gifts, bunting and home display |
| `src/audio.ts`       | Gesture-unlocked Web Audio ambience and effects                             |
| `src/main.ts`        | Fixed-step loop, level selection, screens, HUD, tutorial and browser lifecycle |

Simulation runs at 120 fixed steps per second independently of rendering. Rendering caps pixel ratio at 1.75, uses no real-time shadow maps, limits snow particles to 110 and track segments to 900, and culls course chunks behind/ahead of the skier. Geometry and materials are reused. The camera adapts between portrait and landscape.

The automated tests cover acceleration, steering inertia, edge resistance, 30/120-Hz trajectory consistency, single-award gate scoring, bullseyes and the ×8 combo, gate tightening and the slope ramp, missed gates, boundary/rock crash recovery, simultaneous collision/gate feedback, hazard placement rules and hazard-free present landings, level progress, immediate pickup saves and unlocking, twenty distinct hand-placed layouts covering all hundred lamps with rising speed and narrowing gates, one feature per stretch, hazards clear of gate lines, no straight-line gate pairs without a rock between them, presents fixed per level, reachability of every gate and pickup on all 20 levels with a passable goal, an un-passable straight line on every level, owned lamps hidden on replay, frozen finish time, pickup bonuses, missed pickups, and replay resets. Browser checks and outstanding physical-device checks are recorded in `docs/verification.md`.

To regenerate home-screen icons after replacing `art/icon-master.png` (a square PNG), run `npm run icons`.

The bundled Nunito typeface is distributed under the SIL Open Font License (see `node_modules/@fontsource-variable/nunito/LICENSE`).

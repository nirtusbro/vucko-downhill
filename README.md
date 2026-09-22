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

- **Phone:** touch the lower three quarters of the game and drag left/right. Displacement controls carving force. Release to straighten gradually. A full-strength turn takes roughly 90 pixels of drag on a phone.
- **Desktop:** mouse drag, A/D, or left/right arrows. P or Esc toggles pause.
- Pass between both flags of each gate. Hits award 100 points multiplied by a combo that caps at ×4.
- Choose Easy, Classic or Expert on the home screen. Cruising speeds are approximately 86, 108 and 130 km/h; sharper carving costs speed. Easy has wider gates and gentler turns; Expert has tight gates and stronger turns. Your selection and each mode's best score are saved separately.
- Collect optional table lamps in the open stretches between gates for 50 extra points. Each sits halfway to the next gate (or finish), slightly off the direct line, leaving room for a bonus detour. Four designs repeat along the course: rose mushroom, lavender pleats, emerald banker, and blue porcelain. Collected lamps float up and disappear with a chime. The HUD and finish screen show the collection count. A perfect run with all 20 lamps scores 8,400 before present bonuses.
- Birthday presents fall at random locations every 3.8–6.5 seconds. Gold rings mark their landing spots; ski close after they land for +200 points. Drops stay clear of gate stations and the slope edges, and vary each run. Missed presents disappear; they never cause a crash or break your combo.
- Every lamp pickup is also added immediately to **Ljubica's lamp shelf** on the home screen. The four designs light up as you find them, with repeat pickups increasing their counts across runs and difficulties. The collection survives reloads in this browser, including when you leave a run early. If storage is unavailable, it remains available for the current session.
- Missed gates break the combo. Trees, rocks and the course boundary cause a short tumble and automatic recovery.
- The 1,000-meter, 20-gate course has gates 45 metres apart (previously 65), giving about a third less time between turns. A clean run takes roughly 30–50 seconds depending on difficulty; crashes add time. Lamps remain halfway between gate stations.
- Sound starts only after a gesture. The mute button and best score persist on this browser. The run pauses when the page hides or loses focus.

## Structure

| File                 | Responsibility                                                              |
| -------------------- | --------------------------------------------------------------------------- |
| `src/physics.ts`     | Renderer-independent movement, course, collisions, scoring and finish       |
| `src/difficulty.ts`  | Speed, steering, gate opening and lamp pickup settings per mode             |
| `src/presents.ts`    | Random timed drops, landing, swept pickup scoring and bounded gift pool    |
| `src/collection.ts`  | Persistent lamp counts by design, shared names and storage fallback        |
| `src/input.ts`       | Pointer capture, analog drag and keyboard input                             |
| `src/scene.ts`       | Rendering, responsive following camera, gates and lighting                  |
| `src/character.ts`   | Articulated wolf, scarf, skis, poles and celebration                        |
| `src/environment.ts` | Culled scenery chunks, instanced trees/fences, mountains and cabins         |
| `src/effects.ts`     | Fixed-size pools for world-space ski tracks and snow spray                  |
| `src/birthday.ts`    | Four lamp designs, pickup animation, gifts, bunting and home-screen display |
| `src/audio.ts`       | Gesture-unlocked Web Audio ambience and effects                             |
| `src/main.ts`        | Fixed-step loop, screens, HUD, tutorial and browser lifecycle               |

Simulation runs at 120 fixed steps per second independently of rendering. Rendering caps pixel ratio at 1.75, uses no real-time shadow maps, limits snow particles to 110 and track segments to 900, and culls course chunks behind/ahead of the skier. Geometry and materials are reused. The camera adapts between portrait and landscape.

The automated tests cover acceleration, steering inertia, edge resistance, 30/120-Hz trajectory consistency, single-award gate scoring, missed gates, boundary/rock crash recovery, simultaneous collision/gate feedback, full-course reachability, frozen finish time, lamp pickup bonuses, missed pickups, and replay resets. Browser checks and outstanding physical-device checks are recorded in `docs/verification.md`.

To regenerate home-screen icons after editing `public/icon.svg`, run `node scripts/icons.mjs`.

The bundled Nunito typeface is distributed under the SIL Open Font License (see `node_modules/@fontsource-variable/nunito/LICENSE`).

# Vučko Downhill implementation plan

Goal: a complete one-thumb mobile skiing game following the supplied brief.

Architecture: a fixed-step simulation independent of Three.js; procedural low-poly scenery and articulated character; pointer/keyboard input; HTML menus and HUD; Web Audio effects. The skier moves through a fixed world, with camera and ski trails following actual position and heading.

Visual design: snow #f2f8ff, sky #85c9ed, navy #163d59, pine #245e59, racing red #e44343, ice #b6dcef. Rounded Trebuchet display type and system body type. Live mountain scene dominates all screen sizes; large thumb-level start action; minimal running HUD.

1. Skiing prototype: configure Vite/TypeScript; write failing physics tests; implement acceleration, steering inertia, resistance, gate crossing and recovery; render slope, skier, camera and several gates; validate touch and keyboard before visual expansion.
2. Visual identity: articulated wolf with face, ears, scarf, ski boots, poles and skis; instanced trees, mountain ridges, cabins, fences and rocks; pooled spray and curved world-space tracks. Inspect portrait and landscape renders.
3. Game loop: 20 handcrafted gates over a roughly 90-second course; combo scoring; start/tutorial/pause/finish/replay; persistent best score; reliable reset and pause-on-hidden behavior.
4. Polish and delivery: gesture-unlocked audio, mute, responsive safe-area UI, manifest and icons; build and test; browser exercise of steering, pause, replay, storage and completion; document local and phone access plus static deployment.

Validation: simulation tests at different frame rates; production TypeScript/build checks; browser interaction tests and screenshots at 390x844, 360x800, 430x932 and landscape. Real-device Safari/Chrome performance remains a physical-device check.

Birthday personalization: user requested a birthday gift for Ljubica. Add a home greeting, sparse pastel gift boxes and bunting outside the course, and 20 collectible table lamps centered between gates. Four shared procedural lamp models, +50 points per pickup, one-time collection, replay reset, gentle pickup animation and chime, HUD/finish collection counters. Keep the underlying skiing and gate combo unchanged.

Difficulty and faster birthday runs (22 September): add saved Easy/Classic/Expert selection, visible matching gate widths and separate best scores. Following the user's request for a faster game, raise cruising speeds to 24/30/36 m/s, start at half cruise speed and accelerate faster. Add a three-slot present pool: randomized safe landing positions, 1.8-second visible falls, gold ground rings, +200 one-time bonuses, collection animation/audio and HUD/results counts. Verify reachability in every mode, seeded random drops, landing/pickup/replay/finish behavior, production build and responsive browser layout. This supersedes the original slower course timing.

Closer gates and keepsake shelf: reduce successive gate spacing from 65 to 45 metres, finish 80 metres beyond the last gate, retaining halfway lamp detours. Add a home shelf with four illustrated lamp designs and cumulative counts. Persist each pickup immediately, including repeat designs and unfinished runs. Keep the shelf after replay and reload; retain session progress if storage is blocked. Verify full-course steering in all modes, storage validation and browser pickup-to-shelf flow, plus portrait and landscape layouts.

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

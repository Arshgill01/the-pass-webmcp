# Design direction

## Character

The interface should feel like equipment used during service: dense, legible, decisive, and slightly worn-in. It is not a futuristic command center and not a restaurant-themed marketing page.

Reference qualities:

- a real kitchen display system;
- printed thermal tickets;
- stainless-steel pass hardware translated into restrained digital surfaces;
- large clocks and stable columns that can be read at a glance.

## Palette

- canvas: near-black warm charcoal `#141310`;
- surfaces: `#1d1b17` and `#25221d`;
- primary text: warm bone `#f2eee5`;
- borders: `#3b3730`;
- warning: amber `#e7a63b`;
- blocking failure: red-orange `#dd5b45`;
- verified: restrained olive `#86a96b`.

Avoid blue, purple, gradients, glow, glass, and decorative shadows.

## Layout

- fixed operational top bar with product, service clock, and reset;
- full-width incident strip directly under it;
- four stable station lanes;
- one recovery drawer on the right;
- a compact activity/evidence strip only if it earns space in the canonical demo.

Do not create a marketing hero, sidebar navigation, KPI-card grid, charts, or settings area.

## Ticket hierarchy

Within one glance, a ticket must communicate:

1. ticket/table identity;
2. age and urgency;
3. item and current station;
4. blocked/held/staged status;
5. keep-together relationship;
6. whether the latest change came from human or agent.

Do not turn every property into a pill badge. Use typography, rules, placement, and limited status language.

## The stale moment

Stale rejection needs a deliberate visual treatment:

- do not show a generic toast;
- retain the rejected staged action in context;
- mark it `OUTDATED — NOT APPLIED`;
- identify the intervening human change;
- show the current version and required next action;
- never flash or shake the whole screen.

This is the video's central proof and must be readable without narration.

## Motion

The moving clock and ticket age provide sufficient energy. Use motion only for a ticket changing lane or a staged action entering the drawer. Respect `prefers-reduced-motion`.

## Accessibility

- WCAG AA contrast for operational text;
- keyboard-visible focus;
- status not communicated by color alone;
- semantic headings and regions;
- buttons at least 38px high on desktop and larger for touch layouts;
- live regions only for important incident and validation changes, not every clock tick.

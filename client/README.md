# WeatherGPT — client

Conversational weather intelligence and early warning for India.
**SIH26068.** Phase 1 UI, wired to the Phase 2 API when one is configured.

> The language model is the interface, not the source of truth. Weather
> numbers are fetched and scored before anything is phrased.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm run build` produces a static bundle in `dist/`.

## Live or sample data

`VITE_API_URL` decides. Set it and the app calls the Phase 2 server; leave it
unset and everything runs on `src/lib/sampleData.js`. The footer says which.

That swap happens in exactly one place — `src/lib/DataContext.jsx` — which was
the promise made when Phase 1 shipped. No component knows or cares where its
numbers came from.

## Structure

```
src/
├── lib/
│   ├── api.js           fetch client for the Phase 2 server
│   ├── adapters.js      API shapes → view shapes; the seam
│   ├── DataContext.jsx  live-or-sample decision lives here, and only here
│   ├── constants.js     IMD colour codes, risk bands, languages, nav
│   ├── sampleData.js      the offline fallback
│   ├── useTheme.js      light / dark / system
│   └── utils.js         cn(), time formatting
├── components/
│   ├── layout/          AppShell, TopNav, MobileNav, LangToggle, Footer
│   ├── ui/              Card, Button, Severity, Reveal, Bits — the primitives
│   ├── weather/         Hero, HourlyStrip, DailyList, ConfidencePanel, …
│   ├── warning/         WarningBanner, WarningCard
│   ├── risk/            RiskPanel
│   └── chat/            Message, Composer, VoiceButton
└── pages/               Home, Chat, Alerts, MapView, Settings
```

## Design system

Tokens live in two places and nowhere else:

- **`src/index.css`** — CSS custom properties for every colour, plus the
  handful of component classes (`.shell`, `.lbl`, `.rail-x`).
- **`tailwind.config.js`** — maps those properties onto Tailwind's scale,
  along with the type ramp, radii, easing and keyframes.

Changing the palette means editing one `:root` block. Adding a light theme
in a later phase means adding a second one.

### The colour rule

The interface is monochrome. **The only saturated colours in the product are
the four IMD hazard severities** — green, yellow, orange, red. If something on
screen is coloured, it means something. This is why the orange warning card
reads instantly, and it is why forecast confidence is deliberately *not*
colour-coded: confidence is not a hazard.

`accent` is therefore not a hue. It is the inverse of the page — black on
white, white on black — so buttons and active states carry weight without
spending a colour.

### Themes

Three states, not two: an explicit choice stamps `data-theme` on `<html>`;
the default follows `prefers-color-scheme`. `useTheme()` owns it, the choice
persists in `localStorage`, and a tiny inline script in `index.html` applies
it before first paint so there is no flash.

### Type

- `font-display` — Inter Tight, semibold, tight tracking. Headlines and figures.
- `font-sans` — Inter. All interface text.
- `font-mono` — IBM Plex Mono. Labels, timestamps, and every number that
  belongs in a column (pair it with `.tnum`).

### Motion

Subtle and consistent: 200–300 ms on state changes, 600 ms on reveals, one
easing curve (`ease-out`). `<Reveal>` staggers content in as it enters the
viewport but never hides what is already on screen, so the first painted
frame is always complete. Everything collapses under
`prefers-reduced-motion`.

## Conventions worth keeping

1. **A warning renders above the answer.** `WarningBanner` sits before the
   hero on every screen that has one. Do not move it below the fold.
2. **Official text is immutable.** `WarningCard` renders the CAP text in a
   separate, labelled block from any generated gloss. Keep them apart.
3. **Show provenance.** Source and issue time appear on the answer, not in
   a tooltip.
4. **Mock data mirrors the contract.** When you add a field to a component,
   add it to `sampleData.js` in the shape the API will actually return.

See `PHASES.md` for what comes next.

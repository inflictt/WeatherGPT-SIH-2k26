/**
 * WeatherGPT design system.
 *
 * Every token maps to a CSS custom property in src/index.css, so re-theming
 * means editing one :root block and nothing else.
 *
 * The reference is Airbnb.org's editorial system: one typeface, achromatic
 * surfaces, a single filled action, flat components, nothing above 12px
 * radius. Two deliberate extensions are marked below — a 12px uppercase
 * label and the four IMD hazard colours — because a warning dashboard needs
 * things a marketing page does not.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // --- surfaces, back to front ---
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunk: 'rgb(var(--c-sunk) / <alpha-value>)',
        // --- lines ---
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
        'accent-2': 'rgb(var(--c-accent-2) / <alpha-value>)',
        'accent-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
        'on-sev': 'rgb(var(--c-on-sev) / <alpha-value>)',
        // Carbon on paper / paper on carbon. The deliberate 1px frame the
        // reference puts on media blocks and the nav edge — never a divider.
        rule: 'rgb(var(--c-rule) / <alpha-value>)',
        // --- text, most to least prominent ---
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
        // --- the single interactive accent ---
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        'accent-dim': 'rgb(var(--c-accent-dim) / <alpha-value>)',
        // --- hazard severity. THE ONLY saturated colour in the product. ---
        sev: {
          green: 'rgb(var(--c-sev-green) / <alpha-value>)',
          yellow: 'rgb(var(--c-sev-yellow) / <alpha-value>)',
          orange: 'rgb(var(--c-sev-orange) / <alpha-value>)',
          red: 'rgb(var(--c-sev-red) / <alpha-value>)',
          // The wash each band sits on — a real token rather than an alpha of
          // the ink, so a warning card reads the same on paper and on a band.
          'green-w': 'rgb(var(--c-sev-green-w) / <alpha-value>)',
          'yellow-w': 'rgb(var(--c-sev-yellow-w) / <alpha-value>)',
          'orange-w': 'rgb(var(--c-sev-orange-w) / <alpha-value>)',
          'red-w': 'rgb(var(--c-sev-red-w) / <alpha-value>)',
        },
      },

      /**
       * ONE family, for everything from a 12px label to the 72px hero.
       *
       * This is the reference's central move and the reason its pages read as
       * calm: hierarchy is carried entirely by size, weight and tracking, so
       * nothing on the page is competing on voice. Inter substitutes for
       * Airbnb Cereal VF — the sheet names it first, and the geometric
       * proportions and tight tracking carry over.
       *
       * `display` and `mono` remain as aliases so existing markup keeps
       * rendering, but they resolve to the same stack: there is no second
       * voice in this system. Figures that need to line up in a column use
       * `.tnum` (tabular figures), not a monospace face.
       */
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Archivo', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      /**
       * The reference's scale, exactly: 14 / 16 / 18 / 22 / 26 / 48 / 72, with
       * tracking tightening as size grows (-0.01em at 22–26, -0.02em at 48,
       * -0.03em at 72) and nothing below 14px.
       *
       * `label` is the one addition — 12px, uppercase, one tracking value. A
       * dashboard needs a label style and the reference has none. It replaced
       * eleven ad-hoc sizes between 9px and 15px at seven different tracking
       * values, which was the single biggest source of visual noise in the
       * previous build. 9px text also fails on the phones this product is for.
       *
       * `data` at 13px is the second and last addition: the reference floors
       * at 14px because it is a marketing page with no data grid, and an
       * hourly strip or a month calendar genuinely needs one step below that.
       * Everything else stays on the reference scale.
       */
      fontSize: {
        label: ['11px', { lineHeight: '1.5', letterSpacing: '0.14em' }],
        data: ['13px', { lineHeight: '1.45' }],
        caption: ['14px', { lineHeight: '1.45' }],
        'body-sm': ['15px', { lineHeight: '1.55' }],
        'body-lg': ['17px', { lineHeight: '1.6' }],
        subheading: ['20px', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        'heading-sm': ['24px', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        heading: ['clamp(28px, 4vw, 40px)', { lineHeight: '1.14', letterSpacing: '-0.02em' }],
        display: ['clamp(38px, 7.4vw, 72px)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        // The hero temperature, and nothing else. Tighter than `display`
        // because a two-digit figure at 84px has no word-shapes to protect.
        figure: ['clamp(54px, 9.5vw, 84px)', { lineHeight: '0.92', letterSpacing: '-0.045em' }],
      },

      /**
       * 400 for long-form copy, 500 for body and UI (the dominant weight),
       * 700 to anchor a headline. The reference tops out at 700 and its
       * don't-list forbids going heavier.
       */
      fontWeight: { normal: '400', medium: '500', semibold: '500', bold: '700' },

      // Softer and larger than the system this replaced. Cards 18, wells and
      // buttons 11, chips 9, small marks 7.
      borderRadius: { xs: '3px', sm: '7px', DEFAULT: '9px', md: '9px', lg: '11px', xl: '18px', '2xl': '22px' },

      maxWidth: { measure: '640px', shell: '1200px' },

      // 8px base unit. Section rhythm is 64px, card padding 24px.
      spacing: { section: '64px', 'section-lg': '96px' },

      // Elevation is back: the design lifts cards off the ground rather than
      // separating them by surface contrast alone. One shadow, defined per
      // theme in index.css, because a dark theme needs a much deeper one to
      // read at all.
      boxShadow: { card: 'var(--shadow)' },

      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 0.68, 0.28, 1)',
        inout: 'cubic-bezier(0.65, 0.05, 0.36, 1)',
      },

      keyframes: {
        rise: { from: { opacity: '0', transform: 'translate3d(0,10px,0)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        sweep: { from: { transform: 'translate3d(-100%,0,0)' }, to: { transform: 'translate3d(100%,0,0)' } },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.45' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        // The gate's ambient fields. Transform only, so the blur is rasterised
        // once and then moved by the compositor rather than redrawn.
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(5vw,3vh,0) scale(1.14)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22,0.68,0.28,1) both',
        fade: 'fade 0.4s ease both',
        sweep: 'sweep 1.6s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.22,0.68,0.28,1) infinite',
        blink: 'blink 1.4s ease-in-out infinite',
        drift: 'drift 36s ease-in-out infinite',
        'drift-slow': 'drift 48s ease-in-out infinite reverse',
        'spin-slow': 'spin 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}

/**
 * WeatherGPT design system.
 * Every token below maps to a CSS custom property declared in src/index.css,
 * so re-theming (e.g. adding a light mode in a later phase) means editing one
 * :root block and nothing else.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // --- Origin Financial Palette ---
        iris: {
          DEFAULT: '#847dff',
          pale: '#d1c9ff',
          deep: '#4b49aa',
        },
        cyanSignal: '#00b3dd',
        orchid: '#dd90d8',
        periwinkle: '#90b8f0',
        obsidian: 'rgb(var(--c-ground) / <alpha-value>)',
        abyss: 'rgb(var(--c-sunk) / <alpha-value>)',
        graphite: 'rgb(var(--c-raised) / <alpha-value>)',
        steel: 'rgb(var(--c-steel) / <alpha-value>)',
        silver: 'rgb(var(--c-silver) / <alpha-value>)',
        fog: 'rgb(var(--c-ink-3) / <alpha-value>)',
        ash: 'rgb(var(--c-ink-2) / <alpha-value>)',
        cloud: 'rgb(var(--c-ink) / <alpha-value>)',
        pure: 'rgb(var(--c-accent) / <alpha-value>)',
        void: 'rgb(var(--c-on-accent) / <alpha-value>)',

        // Semantic surface mappings
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        sunk: 'rgb(var(--c-sunk) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',

        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',

        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--c-on-accent) / <alpha-value>)',
        'accent-dim': 'rgb(var(--c-accent-dim) / <alpha-value>)',

        // IMD Hazard Severities
        sev: {
          green: '#4ade80',
          yellow: '#facc15',
          orange: '#fb923c',
          red: '#f87171',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Newsreader', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Geist Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Roboto Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        label: ['11px', { lineHeight: '1.4', letterSpacing: '0.182em' }],
        'mono-label': ['11px', { lineHeight: '1.4', letterSpacing: '0.182em' }],
        micro: ['10px', { lineHeight: '1.6', letterSpacing: '0.18em' }],
        data: ['12px', { lineHeight: '1.4', letterSpacing: '0.021em' }],
        'body-sm': ['14px', { lineHeight: '1.67' }],
        body: ['16px', { lineHeight: '1.5' }],
        subheading: ['18px', { lineHeight: '1.5' }],
        'heading-lg': ['38px', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'heading-sm': ['26px', { lineHeight: '1.29', letterSpacing: '-0.01em' }],
        'display-sm': ['80px', { lineHeight: '1.0', letterSpacing: '-0.03em' }],
        display: ['96px', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
        'display-xl': ['clamp(56px, 11vw, 96px)', { lineHeight: '0.9', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        button: '8px',
        card: '16px',
        tile: '30px',
        pill: '9999px',
        DEFAULT: '8px',
      },
      maxWidth: {
        measure: '640px',
        shell: '1200px',
        container: '1200px',
      },
      boxShadow: {
        lg: '0 18px 20px 0 rgba(0, 0, 0, 0.2)',
      },
      animation: {
        rise: 'rise 0.55s cubic-bezier(0.22,0.68,0.28,1) both',
        fade: 'fade 0.5s ease both',
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.22,0.68,0.28,1) infinite',
      },
    },
  },
  plugins: [],
}

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
        obsidian: '#0f1011',
        abyss: '#090a0b',
        graphite: '#2e2e2e',
        steel: '#3f4041',
        silver: '#cacaca',
        fog: '#6a6b6b',
        ash: '#9f9fa0',
        cloud: '#f5f5f7',
        pure: '#ffffff',
        void: '#000000',

        // Semantic surface mappings
        ground: '#0f1011',
        surface: '#18191b',
        raised: '#2e2e2e',
        sunk: '#090a0b',
        line: 'rgba(255, 255, 255, 0.12)',
        'line-soft': 'rgba(255, 255, 255, 0.06)',

        ink: '#f5f5f7',
        'ink-2': '#9f9fa0',
        'ink-3': '#6a6b6b',

        accent: '#ffffff',
        'on-accent': '#000000',
        'accent-dim': '#2e2e2e',

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

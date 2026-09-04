import { cn } from '../../lib/utils'

export default function ThemeToggle({ resolved, toggle }) {
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'tap flex h-9 w-9 flex-none items-center justify-center rounded-md border border-line',
        'text-ink-2 transition-colors duration-250 ease-out hover:bg-raised hover:text-ink',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  )
}

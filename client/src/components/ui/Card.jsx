import { cn } from '../../lib/utils'

/**
 * The one container in the system. `tone` washes it with a hazard colour;
 * everything else stays neutral so a coloured card always means something.
 */
export function Card({ as: Tag = 'section', tone, interactive, className, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'relative rounded-lg border border-line bg-surface',
        'transition-colors duration-300 ease-out',
        interactive && 'hover:bg-raised',
        tone && 'border-l-2',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Section heading row: mono label on the left, optional meta on the right. */
export function CardHead({ label, meta, className }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 px-5 pt-4', className)}>
      <h2 className="lbl">{label}</h2>
      {meta ? <span className="font-mono text-[10px] text-ink-3">{meta}</span> : null}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 pb-5 pt-3', className)}>{children}</div>
}

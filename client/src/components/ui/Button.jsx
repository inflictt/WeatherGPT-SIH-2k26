import { cn } from '../../lib/utils'

const VARIANTS = {
  primary: 'bg-accent text-on-accent border border-accent hover:opacity-90',
  ghost: 'bg-surface text-ink border border-line hover:bg-raised',
  quiet: 'bg-transparent text-ink-3 border border-transparent hover:text-ink hover:bg-raised',
}

const SIZES = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-[14px]',
}

export default function Button({
  variant = 'ghost',
  size = 'md',
  className,
  as: Tag = 'button',
  ...rest
}) {
  return (
    <Tag
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium',
        'transition-[background-color,border-color,color,transform] duration-200 ease-out',
        'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  )
}

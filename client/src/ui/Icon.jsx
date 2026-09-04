/**
 * The line-icon set, lifted from the design.
 *
 * One stroke weight (1.7), one cap style, one 24-unit box, so icons sit
 * together without one looking heavier than its neighbour. `size` is in px and
 * colour comes from `currentColor`, which is what lets an icon inherit a
 * severity or the accent without a second prop.
 *
 * Every icon here is used. Deleting one that stops being referenced is
 * cheaper than carrying a set that quietly grows into a sprite sheet.
 */
const P = {
  // brand — a cloud with three drops, the product mark
  cloudRain: 'M7.5 15.5h9a3.5 3.5 0 0 0 .4-7 5.5 5.5 0 0 0-10.5-1.1A3.75 3.75 0 0 0 7.5 15.5Z|M8.6 18.4 7.9 20.6M12 18.4l-.7 2.2M15.4 18.4l-.7 2.2',
  cloud: 'M7.5 17h9a4 4 0 0 0 .4-8 6 6 0 0 0-11.4-1.2A4.25 4.25 0 0 0 7.5 17Z',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z|M12 2.6v2M12 19.4v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.6 12h2M19.4 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20.5 13.2A8.4 8.4 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z',
  wind: 'M3 8.5h10.5a2.75 2.75 0 1 0-2.75-2.75M3 15.5h13a2.75 2.75 0 1 1-2.75 2.75M3 12h7',
  drop: 'M12 3.2s5.5 5.6 5.5 9.3a5.5 5.5 0 1 1-11 0C6.5 8.8 12 3.2 12 3.2Z',
  eye: 'M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z|M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z',
  gauge: 'M12 20a8 8 0 1 0-8-8|M12 12l4.5-4',
  // navigation
  pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  crosshair: 'M12 12.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z|M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z|M15.5 15.5 20 20',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'm6 9 6 6 6-6',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M20 11a8 8 0 1 0-.7 4.3|M20 5.5V11h-5.5',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z|M19.4 14.2a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.5 1v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1-2.5H4.6a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V4.6a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 2.5 1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1 2.5h.2a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.4.9Z',
  // meaning
  alert: 'M12 8.5v4.5M12 16.5h.01|M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z',
  shield: 'M12 21s7.5-3.4 7.5-9V5.8L12 3 4.5 5.8V12c0 5.6 7.5 9 7.5 9Z',
  message: 'M20.5 11.6a7.7 7.7 0 0 1-8.3 7.7 8.6 8.6 0 0 1-2.6-.5L4.5 20.5l1.7-5a8.6 8.6 0 0 1-.5-2.6 7.7 7.7 0 0 1 7.7-8.3 7.7 7.7 0 0 1 7.1 7.1Z',
  mic: 'M12 15.2a3.2 3.2 0 0 0 3.2-3.2V6.2a3.2 3.2 0 1 0-6.4 0V12a3.2 3.2 0 0 0 3.2 3.2Z|M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18.5V21.5',
  send: 'M20.5 3.5 3.5 10.2l6.8 2.9 2.9 6.8Z|m10.3 13.1 4.4-4.4',
  volume: 'M11 5.5 6.8 9H3.5v6h3.3L11 18.5Z|M15.2 9.2a4 4 0 0 1 0 5.6M18 6.4a8 8 0 0 1 0 11.2',
  map: 'M3.5 6.7 9 4.5v12.8L3.5 19.5Z|M9 4.5l6 2.2v12.8L9 17.3Z|M15 6.7l5.5-2.2v12.8L15 19.5Z',
  // farm
  leaf: 'M4.6 19.4C3 15.3 4.8 9.3 9.6 6.5 13 4.5 17.2 4.4 20 4.6c.2 2.8 0 7-2 10.4-2.8 4.8-8.8 6.6-12.9 5Z|M4.6 19.4 11.5 12.5',
  sprout: 'M12 20v-7|M12 13c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6Z|M12 13c0-3.9 3.1-7 7-7 0 3.9-3.1 7-7 7Z',
  layers: 'm12 3.2 8.5 4.4L12 12 3.5 7.6Z|m3.5 12 8.5 4.4L20.5 12|m3.5 16.4 8.5 4.4 8.5-4.4',
  calendar: 'M5.5 5.5h13a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V7a1.5 1.5 0 0 1 1.5-1.5Z|M8.5 3v4M15.5 3v4M4 10.5h16',
  camera: 'M4.5 8h2.9l1.4-2.2h6.4L16.6 8h2.9A1.5 1.5 0 0 1 21 9.5v9A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-9A1.5 1.5 0 0 1 4.5 8Z|M12 16.8a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z',
  flask: 'M9.5 3.5h5M10.5 3.5v5.2L5.2 17.4A2 2 0 0 0 6.9 20.5h10.2a2 2 0 0 0 1.7-3.1L13.5 8.7V3.5|M8 14.5h8',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
}

export default function Icon({ name, size = 18, className, strokeWidth = 1.7, ...rest }) {
  const d = P[name]
  if (!d) return null
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {d.split('|').map((seg, i) => (
        <path key={i} d={seg} />
      ))}
    </svg>
  )
}

export const ICON_NAMES = Object.keys(P)

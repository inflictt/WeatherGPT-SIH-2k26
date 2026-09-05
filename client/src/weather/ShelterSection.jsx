import { useState } from 'react'
import { getNearestShelters } from '../lib/shelters'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card } from '../ui/Bits'

export default function ShelterSection({ location, lang = 'en', className }) {
  const [filter, setFilter] = useState('all') // 'all' | 'open'
  const shelters = getNearestShelters(location, { count: 6 })

  const filtered = shelters.filter((s) => {
    if (filter === 'open') return s.status === 'open'
    return true
  })

  const isHindi = lang === 'hi'
  const isHinglish = lang === 'hinglish'

  return (
    <Card className={cn('overflow-hidden border border-line bg-surface shadow-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft bg-sunk/40 p-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sev-orange-w text-sev-orange font-bold">
            <Icon name="shield" size={18} />
          </span>
          <div>
            <h3 className="text-subheading font-bold tracking-tight text-ink">
              {isHindi
                ? 'निकटतम आपातकालीन आश्रय एवं राहत शिविर'
                : isHinglish
                  ? 'Nearest Emergency Shelters & Rahat Shivir'
                  : 'Nearest Emergency Shelters & Relief Camps'}
            </h3>
            <span className="text-data text-ink-3">
              {isHindi
                ? `${location?.name || 'वर्तमान स्थान'} से सटीक दूरी एवं नेविगेशन`
                : `Verified disaster shelters near ${location?.name || 'current location'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1 text-data font-medium">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-md px-2.5 py-1 transition-colors',
              filter === 'all' ? 'bg-accent text-on-accent font-semibold' : 'text-ink-2 hover:text-ink'
            )}
          >
            {isHindi ? 'सभी शिविर' : 'All'} ({shelters.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('open')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors',
              filter === 'open' ? 'bg-sev-green text-on-sev font-semibold' : 'text-ink-2 hover:text-ink'
            )}
          >
            <span className="h-2 w-2 rounded-full bg-sev-green animate-pulse" />
            <span>{isHindi ? 'सक्रिय शिविर' : 'Open Now'}</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-line-soft">
        {filtered.map((sh) => {
          const occPercent = Math.min(100, Math.round((sh.occupied / sh.totalCap) * 100))
          const name = isHindi && sh.nameHi ? sh.nameHi : sh.name
          const type = isHindi && sh.typeHi ? sh.typeHi : sh.type
          const address = isHindi && sh.addressHi ? sh.addressHi : sh.address
          const facilities = isHindi && sh.facilitiesHi ? sh.facilitiesHi : sh.facilities

          return (
            <div
              key={sh.id}
              className="flex flex-col gap-3 p-4 transition-colors duration-150 hover:bg-sunk/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-meta font-bold uppercase tracking-wider',
                      sh.status === 'open'
                        ? 'bg-sev-green-w text-sev-green border border-sev-green/30'
                        : sh.status === 'standby'
                          ? 'bg-sev-yellow-w text-sev-yellow border border-sev-yellow/30'
                          : 'bg-sev-red-w text-sev-red border border-sev-red/30'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        sh.status === 'open'
                          ? 'bg-sev-green'
                          : sh.status === 'standby'
                            ? 'bg-sev-yellow'
                            : 'bg-sev-red'
                      )}
                    />
                    {sh.status === 'open'
                      ? (isHindi ? 'सक्रिय / खुला' : 'Open & Ready')
                      : sh.status === 'standby'
                        ? (isHindi ? 'स्टैंडबाय पर' : 'On Standby')
                        : (isHindi ? 'पूर्ण क्षमता' : 'Full')}
                  </span>

                  <span className="text-meta font-medium text-ink-3">· {type}</span>
                </div>

                <h4 className="text-body font-bold leading-snug text-ink">{name}</h4>

                <p className="text-data text-ink-2 leading-relaxed">{address}</p>

                {/* Facilities Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {facilities.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-sunk px-2 py-0.5 text-[11px] font-medium text-ink-2"
                    >
                      ✓ {f}
                    </span>
                  ))}
                </div>

                {/* Capacity Meter */}
                <div className="flex items-center gap-3 pt-1 text-data text-ink-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sunk">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        occPercent > 80 ? 'bg-sev-red' : 'bg-accent'
                      )}
                      style={{ width: `${occPercent}%` }}
                    />
                  </div>
                  <span>
                    {isHindi
                      ? `क्षमता: ${sh.occupied}/${sh.totalCap} व्यक्ति (${occPercent}% भरा)`
                      : `Capacity: ${sh.occupied}/${sh.totalCap} persons (${occPercent}% occupied)`}
                  </span>
                </div>
              </div>

              {/* Action Buttons & Precise Distance */}
              <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2.5">
                <div className="text-left sm:text-right">
                  <div className="flex items-baseline gap-1 sm:justify-end">
                    <span className="font-mono text-heading font-bold text-ink">
                      {sh.roadKm ?? sh.distanceKm}
                    </span>
                    <span className="text-caption font-semibold text-ink-3">km</span>
                  </div>
                  <span className="text-meta text-ink-3 block">
                    {isHindi
                      ? `सड़क मार्ग (~${sh.travelTimeMins} मिनट)`
                      : `~${sh.travelTimeMins} mins road distance`}
                  </span>
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <a
                    href={`tel:${sh.helpline.replace(/[^0-9]/g, '')}`}
                    className="btn flex-1 items-center justify-center gap-1.5 py-1.5 text-data sm:flex-none"
                    title={`Call helpline: ${sh.helpline}`}
                  >
                    <Icon name="phone" size={13} />
                    <span>{isHindi ? 'हेल्पलाइन' : 'Call'} ({sh.helpline})</span>
                  </a>

                  <a
                    href={sh.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${sh.lat},${sh.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost flex items-center gap-1 py-1.5 text-data hover:border-accent hover:text-accent"
                    title="Open turn-by-turn navigation in Google Maps"
                  >
                    <Icon name="mapPin" size={13} />
                    <span>{isHindi ? 'नेविगेशन' : 'Directions'}</span>
                    <span className="text-xs">↗</span>
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Emergency Helpline Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sunk/60 p-3.5 px-4 sm:px-5 text-data">
        <div className="flex items-center gap-2 text-ink-2 font-medium">
          <Icon name="alertTriangle" size={15} className="text-sev-orange" />
          <span>
            {isHindi
              ? '24x7 आपातकालीन आपदा नियंत्रण कक्ष:'
              : '24x7 Emergency Disaster Control Rooms:'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:1077"
            className="font-mono font-bold text-accent hover:underline"
          >
            📞 1077 ({isHindi ? 'ज़िला' : 'District'})
          </a>
          <a
            href="tel:1070"
            className="font-mono font-bold text-accent hover:underline"
          >
            📞 1070 ({isHindi ? 'राज्य' : 'State'})
          </a>
          <a
            href="tel:108"
            className="font-mono font-bold text-accent hover:underline"
          >
            🚑 108 ({isHindi ? 'एम्बुलेंस' : 'Ambulance'})
          </a>
          <a
            href="tel:112"
            className="font-mono font-bold text-accent hover:underline"
          >
            🚨 112 ({isHindi ? 'आपातकाल' : 'Emergency'})
          </a>
        </div>
      </div>
    </Card>
  )
}

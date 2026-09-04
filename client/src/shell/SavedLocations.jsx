import { useSavedLocations } from '../lib/useSavedLocations'
import { useData } from '../lib/DataContext'
import { placeLine } from '../lib/utils'
import { t } from '../lib/i18n'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Switch } from '../ui/Bits'

export default function SavedLocations({ token, lang = 'en' }) {
  const saved = useSavedLocations(token)
  const { location } = useData()

  const already = saved.rows.some(
    (r) => r.name === location?.name && r.district === location?.district,
  )

  return (
    <Card>
      <CardHead
        title="Where you get alerted"
        meta={saved.persisted ? 'Synced to your account' : 'This device only'}
      />
      <CardBody className="p-0">
        {saved.rows.length === 0 ? (
          <div className="px-5 py-5">
            <p className="text-data leading-relaxed text-ink-3">
              No saved locations yet. Save one to be told when a severe warning is issued for it.
            </p>
            {location && (
              <button type="button" onClick={() => saved.add(location)} className="btn mt-3.5">
                <Icon name="plus" size={15} />
                Save {location.name}
              </button>
            )}
          </div>
        ) : (
          <ul className="px-5 py-1">
            {saved.rows.map((l) => (
              <li key={l.id} className="flex items-center gap-4 border-b border-line-soft py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-caption text-ink">{l.name}</div>
                  <div className="lbl truncate">{placeLine(l, { district: true }).replace(`${l.name} · `, '') || '—'}</div>
                </div>
                <Switch
                  on={l.active !== false}
                  label={`Alerts for ${l.name}`}
                  onChange={() => saved.toggle(l.id)}
                />
                <button
                  type="button"
                  onClick={() => saved.remove(l.id)}
                  aria-label={`Remove ${l.name}`}
                  className="tap flex-none text-ink-3 transition-colors duration-150 hover:text-sev-red"
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-line-soft px-5 py-3.5">
          <p className="text-data leading-relaxed text-ink-3">
            {saved.persisted
              ? 'You are notified once per warning.'
              : 'Stored on this device only. Severe alerts are monitored automatically.'}
          </p>
          {location && saved.rows.length > 0 && !already && (
            <button
              type="button"
              onClick={() => saved.add(location)}
              className="lbl -mb-2 mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-accent hover:text-accent-2"
            >
              <Icon name="plus" size={13} />
              Add {location.name}
            </button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

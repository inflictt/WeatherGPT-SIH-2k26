import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFarm } from '../lib/useFarm'
import { useData } from '../lib/DataContext'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell, PageHead, Card, CardHead, CardBody } from '../ui/Bits'
import Reveal from '../ui/Reveal'

const ACTIVITY_TYPES = [
  { id: 'irrigation', label: 'Irrigation (सिंचाई)', icon: 'drop' },
  { id: 'fertilizer', label: 'Fertilizer / Nutrients (खाद)', icon: 'sprout' },
  { id: 'spraying', label: 'Spraying / Fungicide (दवा छिड़काव)', icon: 'flask' },
  { id: 'pesticide', label: 'Pesticide Application (कीटनाशक)', icon: 'flask' },
  { id: 'sowing', label: 'Sowing / Planting (बुवाई)', icon: 'sprout' },
  { id: 'weeding', label: 'Weeding / Hoeing (निराई-गुड़ाई)', icon: 'leaf' },
  { id: 'ploughing', label: 'Ploughing / Tillage (जुताई)', icon: 'layers' },
  { id: 'harvest', label: 'Harvesting (कटाई व मड़ाई)', icon: 'leaf' },
  { id: 'pest_scout', label: 'Pest Scouting (कीट निगरानी)', icon: 'eye' },
  { id: 'disease_scout', label: 'Disease Scouting (रोग निरीक्षण)', icon: 'eye' },
  { id: 'soil_test', label: 'Soil Testing (मृदा परीक्षण)', icon: 'flask' },
  { id: 'other', label: 'Other Farm Work', icon: 'check' },
]

export default function JournalScreen({ audience = 'farm', lang = 'en' }) {
  const { farm, activities, timeline, fields, crops, addActivity } = useFarm()
  const { location } = useData()

  const [showLogModal, setShowLogModal] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'activities' | 'weather' | 'scans'

  // Draft activity form
  const [draftType, setDraftType] = useState('irrigation')
  const [draftFieldId, setDraftFieldId] = useState(fields[0]?.id || '')
  const [draftCrop, setDraftCrop] = useState(crops[0]?.name || '')
  const [draftDate, setDraftDate] = useState(new Date().toISOString().split('T')[0])
  const [draftQuantity, setDraftQuantity] = useState('')
  const [draftUnit, setDraftUnit] = useState('hours')
  const [draftCost, setDraftCost] = useState('')
  const [draftNotes, setDraftNotes] = useState('')

  const isHindi = lang === 'hi'

  const handleSaveActivity = (e) => {
    e.preventDefault()
    addActivity({
      activityType: draftType,
      fieldId: draftFieldId,
      crop: draftCrop,
      date: draftDate,
      quantity: draftQuantity ? Number(draftQuantity) : null,
      unit: draftUnit,
      cost: draftCost ? Number(draftCost) : 0,
      notes: draftNotes.trim(),
    })

    setDraftNotes('')
    setDraftQuantity('')
    setDraftCost('')
    setShowLogModal(false)
  }

  // Combined timeline items
  const combinedTimeline = [
    ...(timeline || []).map((ev) => ({
      ...ev,
      category: /rain|heat|weather|alert/i.test(ev.eventType) ? 'weather' : /scan/i.test(ev.eventType) ? 'scans' : 'activities',
    })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const filteredTimeline = combinedTimeline.filter((ev) => {
    if (filter === 'activities') return ev.category === 'activities'
    if (filter === 'weather') return ev.category === 'weather'
    if (filter === 'scans') return ev.category === 'scans'
    return true
  })

  return (
    <Shell className="space-y-5 py-6 pb-12">
      <PageHead
        eyebrow={`${placeLine(location)} · ${farm?.name || 'Aakrishi Farm'}`}
        title={isHindi ? 'खेत जर्नल व स्मृति टाइमलाइन (Journal)' : 'Farm Activity Journal & Memory Timeline'}
        aside={
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95 transition-all active:scale-95"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'गतिविधि दर्ज करें' : '+ Log Activity'}</span>
          </button>
        }
      >
        Persistent farm memory tracking irrigation, chemical sprays, fertilization, harvest, and automated weather events.
      </PageHead>

      {/* ----------------------------------------------------------- SUMMARY TILES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'दर्ज गतिविधियाँ' : 'Logged Activities'}</div>
          <div className="mt-1.5 text-heading font-semibold text-ink">{activities.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'टाइमलाइन घटनाएँ' : 'Memory Events'}</div>
          <div className="mt-1.5 text-heading font-semibold text-accent">{timeline.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'सक्रिय फ़ील्ड' : 'Active Fields'}</div>
          <div className="mt-1.5 text-heading font-semibold text-ink">{fields.length}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'मुख्य फ़सलें' : 'Crops Tracked'}</div>
          <div className="mt-1.5 text-heading font-semibold text-ink">{crops.length}</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: isHindi ? 'सभी घटनाएँ' : 'All Memory' },
            { id: 'activities', label: isHindi ? 'खेत कार्य' : 'Farm Activities' },
            { id: 'weather', label: isHindi ? 'मौसम व अलर्ट' : 'Weather & Alerts' },
            { id: 'scans', label: isHindi ? 'अवलोकन / स्कैन' : 'Scans & Checks' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-caption font-semibold transition-all',
                filter === tab.id
                  ? 'bg-accent text-on-accent shadow-xs'
                  : 'bg-surface border border-line text-ink-2 hover:border-accent hover:text-ink'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          to="/insights"
          className="lbl flex items-center gap-1.5 text-accent hover:text-accent-2 transition-colors"
        >
          <Icon name="chart" size={14} />
          <span>{isHindi ? 'खर्च व आय इनसाइट्स देखें' : 'View Financial Insights'}</span>
        </Link>
      </div>

      {/* ------------------------------------------------------- TIMELINE STREAM */}
      <div className="space-y-3">
        {filteredTimeline.length === 0 ? (
          <div className="rounded-2xl border border-line border-dashed bg-surface p-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon name="layers" size={24} />
            </span>
            <h4 className="mt-3 text-subheading font-semibold text-ink">
              {isHindi ? 'कोई टाइमलाइन रिकॉर्ड नहीं' : 'No memory events yet'}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-data text-ink-3">
              {isHindi
                ? 'सिंचाई, खाद, या कीटनाशक छिड़काव दर्ज करने के लिए ऊपर दिए गए बटन का उपयोग करें।'
                : 'Log activities and scans to build continuous chronological farm memory.'}
            </p>
            <button
              type="button"
              onClick={() => setShowLogModal(true)}
              className="mt-4 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-xs hover:opacity-95"
            >
              {isHindi ? '+ पहली गतिविधि दर्ज करें' : '+ Log First Activity'}
            </button>
          </div>
        ) : (
          filteredTimeline.map((ev, i) => {
            const isAlert = ev.eventType === 'ALERT'
            const isRain = ev.eventType === 'HEAVY_RAIN'
            const isScan = /scan/i.test(ev.eventType)
            const isTask = ev.eventType === 'TASK_COMPLETED'

            return (
              <div
                key={ev.id || i}
                className={cn(
                  'rounded-2xl border bg-surface p-4 sm:p-5 shadow-card transition-all flex items-start gap-4',
                  isAlert
                    ? 'border-sev-orange/50 bg-sev-orange-soft/20'
                    : isRain
                      ? 'border-accent/40 bg-accent-soft/20'
                      : 'border-line'
                )}
              >
                <span
                  className={cn(
                    'grid h-10 w-10 flex-none place-items-center rounded-xl text-on-accent',
                    isAlert
                      ? 'bg-sev-orange text-on-sev'
                      : isRain
                        ? 'bg-accent'
                        : isScan
                          ? 'bg-sev-green'
                          : 'bg-ink-2'
                  )}
                >
                  <Icon
                    name={
                      isAlert
                        ? 'alert'
                        : isRain
                          ? 'cloudRain'
                          : isScan
                            ? 'eye'
                            : isTask
                              ? 'check'
                              : 'layers'
                    }
                    size={18}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-body-sm font-bold text-ink">{ev.title}</h4>
                    <span className="lbl text-ink-3">
                      {new Date(ev.timestamp).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {ev.description && (
                    <p className="mt-1 text-data leading-relaxed text-ink-2">{ev.description}</p>
                  )}

                  {ev.metadata && (ev.metadata.cost > 0 || ev.metadata.quantity) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pt-1 border-t border-line-soft">
                      {ev.metadata.quantity && (
                        <span className="rounded-md bg-sunk px-2 py-0.5 font-mono text-[11px] text-ink-2">
                          Qty: {ev.metadata.quantity} {ev.metadata.unit || ''}
                        </span>
                      )}
                      {ev.metadata.cost > 0 && (
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
                          Cost: ₹{ev.metadata.cost.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ------------------------------------------------------- LOG ACTIVITY MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-subheading font-bold text-ink">
                {isHindi ? 'खेत गतिविधि दर्ज करें' : 'Log Farm Activity'}
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-ink-3 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3.5">
              <div>
                <label className="lbl block mb-1">{isHindi ? 'गतिविधि प्रकार *' : 'Activity Type *'}</label>
                <select
                  value={draftType}
                  onChange={(e) => setDraftType(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ground px-3 py-2.5 text-caption text-ink outline-none focus:border-accent"
                >
                  {ACTIVITY_TYPES.map((ty) => (
                    <option key={ty.id} value={ty.id}>
                      {ty.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl block mb-1">{isHindi ? 'खेत / प्लॉट' : 'Field / Plot'}</label>
                  <select
                    value={draftFieldId}
                    onChange={(e) => setDraftFieldId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    {fields.map((fld) => (
                      <option key={fld.id} value={fld.id}>
                        {fld.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="lbl block mb-1">{isHindi ? 'फ़सल' : 'Crop'}</label>
                  <select
                    value={draftCrop}
                    onChange={(e) => setDraftCrop(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    {crops.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="lbl block mb-1">{isHindi ? 'दिनांक' : 'Date'}</label>
                  <input
                    type="date"
                    required
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="lbl block mb-1">{isHindi ? 'मात्रा' : 'Quantity'}</label>
                  <input
                    type="number"
                    step="any"
                    value={draftQuantity}
                    onChange={(e) => setDraftQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="lbl block mb-1">{isHindi ? 'इकाई' : 'Unit'}</label>
                  <input
                    type="text"
                    value={draftUnit}
                    onChange={(e) => setDraftUnit(e.target.value)}
                    placeholder="kg / L / hrs"
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="lbl block mb-1">
                  {isHindi ? 'लागत / व्यय (₹) — शून्य छोड़ सकते हैं' : 'Cost (₹) — optional, logged to finance'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={draftCost}
                  onChange={(e) => setDraftCost(e.target.value)}
                  placeholder="₹ 0"
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2 text-caption text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="lbl block mb-1">{isHindi ? 'विवरण / नोट्स' : 'Observations & Notes'}</label>
                <textarea
                  rows="2"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder={isHindi ? 'दवा का नाम, खाद का ब्रांड, या मौसम का असर...' : 'Chemical brand name, fertilizer dosage, weather observation...'}
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2 text-caption text-ink outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-caption font-semibold text-ink-2 hover:text-ink"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-5 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
                >
                  {isHindi ? 'जर्नल में सहेजें' : 'Save to Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}

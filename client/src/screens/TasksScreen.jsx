import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFarm } from '../lib/useFarm'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { evaluateFarmIntelligence } from '../lib/farmIntelligence'
import { t } from '../lib/i18n'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell, PageHead, Card, CardHead, CardBody } from '../ui/Bits'
import Reveal from '../ui/Reveal'

const TASK_TYPES = [
  { id: 'irrigation', label: 'Irrigation (सिंचाई)', icon: 'drop' },
  { id: 'spray', label: 'Spray / Pesticide (छिड़काव)', icon: 'flask' },
  { id: 'fertilizer', label: 'Fertilizer (उर्वरक)', icon: 'sprout' },
  { id: 'inspection', label: 'Field Scout (निरीक्षण)', icon: 'eye' },
  { id: 'drainage', label: 'Drainage (जल निकासी)', icon: 'layers' },
  { id: 'harvest', label: 'Harvest (कटाई)', icon: 'leaf' },
  { id: 'weeding', label: 'Weeding (निराई)', icon: 'sprout' },
  { id: 'sowing', label: 'Sowing (बुवाई)', icon: 'sprout' },
  { id: 'other', label: 'Other Task', icon: 'check' },
]

export default function TasksScreen({ audience = 'farm', lang = 'en' }) {
  const { farm, tasks, fields, crops, addTask, completeTask, deleteTask } = useFarm()
  const { current, daily, summary24h, hourly, location } = useData()
  const warnings = useActiveWarnings()

  const [filter, setFilter] = useState('all') // 'all' | 'today' | 'upcoming' | 'completed'
  const [showAddModal, setShowAddModal] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftType, setDraftType] = useState('irrigation')
  const [draftFieldId, setDraftFieldId] = useState(fields[0]?.id || '')
  const [draftCrop, setDraftCrop] = useState(crops[0]?.name || '')
  const [draftDueDate, setDraftDueDate] = useState(new Date().toISOString().split('T')[0])
  const [draftPriority, setDraftPriority] = useState('medium')
  const [draftDryReq, setDraftDryReq] = useState(false)

  const isHindi = lang === 'hi'

  const intelligence = evaluateFarmIntelligence({
    farm,
    current,
    daily,
    summary24h,
    hourly,
    warnings,
    lang,
  })

  // Evaluated tasks with weather conflicts attached
  const evaluatedTasks = intelligence.tasks || tasks

  const todayIso = new Date().toISOString().split('T')[0]

  const filteredTasks = evaluatedTasks.filter((t) => {
    if (filter === 'today') return t.dueDate === todayIso && t.status !== 'completed'
    if (filter === 'upcoming') return t.dueDate > todayIso && t.status !== 'completed'
    if (filter === 'completed') return t.status === 'completed'
    return true
  })

  const conflictCount = evaluatedTasks.filter((t) => t.weatherConflict?.hasConflict && t.status !== 'completed').length
  const todayCount = evaluatedTasks.filter((t) => t.dueDate === todayIso && t.status !== 'completed').length
  const completedCount = evaluatedTasks.filter((t) => t.status === 'completed').length

  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!draftTitle.trim()) return

    addTask({
      title: draftTitle.trim(),
      type: draftType,
      fieldId: draftFieldId,
      crop: draftCrop,
      dueDate: draftDueDate,
      priority: draftPriority,
      status: draftDueDate === todayIso ? 'today' : draftDueDate < todayIso ? 'overdue' : 'upcoming',
      weatherDependency: {
        noRainRequired: draftDryReq || draftType === 'spray',
      },
    })

    setDraftTitle('')
    setShowAddModal(false)
  }

  return (
    <Shell className="space-y-5 py-6 pb-12">
      <PageHead
        eyebrow={`${placeLine(location)} · ${farm?.name || 'Aakrishi Farm'}`}
        title={isHindi ? 'मौसम-जागरूक कृषि कार्य (Tasks)' : 'Weather-Aware Farm Tasks'}
        aside={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95 transition-all active:scale-95"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'नया कार्य जोड़ें' : '+ Add Task'}</span>
          </button>
        }
      >
        Automated task conflict detection against numerical rain, wind, and SDMA alert forecasts.
      </PageHead>

      {/* ------------------------------------------- WEATHER CONFLICT ALERT BANNER */}
      {conflictCount > 0 && (
        <Reveal>
          <div className="flex items-start gap-3.5 rounded-2xl border border-sev-orange/50 bg-sev-orange-soft/40 p-4 shadow-sm">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-sev-orange text-on-sev text-lg">
              <Icon name="alert" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="lbl text-sev-orange font-bold uppercase tracking-wider">
                  {isHindi ? 'मौसम विरोध अलर्ट' : 'Weather Conflict Warning'}
                </span>
                <span className="rounded-md bg-sev-orange px-2 py-0.5 font-mono text-[11px] font-bold text-on-sev">
                  {conflictCount} {isHindi ? 'कार्यों में टकराव' : 'Tasks Affected'}
                </span>
              </div>
              <p className="mt-1 text-data font-medium text-ink leading-relaxed">
                {isHindi
                  ? 'आगामी वर्षा या तेज़ हवाओं के कारण कुछ निर्धारित कार्यों (जैसे स्प्रे / सिंचाई) को स्थगित या पुनर्निर्धारित करने की सलाह दी जाती है।'
                  : 'Upcoming precipitation or winds conflict with scheduled operations. Review recommendations below before proceeding.'}
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {/* ------------------------------------------------------------- METRICS ROW */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'आज के कार्य' : 'Due Today'}</div>
          <div className="mt-1.5 text-heading font-semibold text-ink">{todayCount}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'मौसम टकराव' : 'Conflicts'}</div>
          <div className="mt-1.5 text-heading font-semibold text-sev-orange">{conflictCount}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'पूर्ण कार्य' : 'Completed'}</div>
          <div className="mt-1.5 text-heading font-semibold text-sev-green">{completedCount}</div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'कुल कार्य' : 'Total Tasks'}</div>
          <div className="mt-1.5 text-heading font-semibold text-ink">{evaluatedTasks.length}</div>
        </div>
      </div>

      {/* ------------------------------------------------------------- FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: isHindi ? 'सभी' : 'All Tasks' },
            { id: 'today', label: isHindi ? 'आज' : 'Today' },
            { id: 'upcoming', label: isHindi ? 'आगामी' : 'Upcoming' },
            { id: 'completed', label: isHindi ? 'पूर्ण' : 'Completed' },
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
          to="/chat"
          className="lbl flex items-center gap-1.5 text-accent hover:text-accent-2 transition-colors"
        >
          <Icon name="message" size={14} />
          <span>{isHindi ? 'कृषिवाणी से कार्य पूछें' : 'Ask Krishivaani about tasks'}</span>
        </Link>
      </div>

      {/* -------------------------------------------------------------- TASK LIST */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-line border-dashed bg-surface p-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon name="check" size={24} />
            </span>
            <h4 className="mt-3 text-subheading font-semibold text-ink">
              {isHindi ? 'कोई कार्य नहीं मिला' : 'No tasks in this view'}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-data text-ink-3">
              {isHindi
                ? 'नया कार्य जोड़ने के लिए ऊपर दिए गए बटन का उपयोग करें।'
                : 'Stay ahead of the weather by scheduling tasks with automated conflict checks.'}
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-xs hover:opacity-95"
            >
              {isHindi ? '+ नया कार्य बनाएँ' : '+ Create Task'}
            </button>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const hasConflict = t.weatherConflict?.hasConflict && t.status !== 'completed'
            const isCompleted = t.status === 'completed'
            const field = fields.find((f) => f.id === t.fieldId)

            return (
              <div
                key={t.id}
                className={cn(
                  'rounded-2xl border bg-surface p-4 sm:p-5 shadow-card transition-all space-y-3',
                  hasConflict ? 'border-sev-orange/60 ring-1 ring-sev-orange/20' : 'border-line',
                  isCompleted && 'opacity-65 bg-sunk/40'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => !isCompleted && completeTask(t.id)}
                      disabled={isCompleted}
                      title={isCompleted ? 'Completed' : 'Click to complete'}
                      className={cn(
                        'mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg border transition-colors',
                        isCompleted
                          ? 'border-sev-green bg-sev-green text-on-sev'
                          : 'border-line bg-surface text-transparent hover:border-accent hover:text-accent'
                      )}
                    >
                      <Icon name="check" size={14} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={cn(
                            'text-body-sm font-bold text-ink',
                            isCompleted && 'line-through text-ink-3'
                          )}
                        >
                          {t.title}
                        </h4>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase',
                            t.priority === 'critical' || t.priority === 'high'
                              ? 'bg-sev-red-soft text-sev-red'
                              : t.priority === 'medium'
                                ? 'bg-sev-amber-soft text-sev-amber'
                                : 'bg-sunk text-ink-3'
                          )}
                        >
                          {t.priority}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-data text-ink-3">
                        {t.crop && <span>🌾 {t.crop}</span>}
                        {field && <span>📍 {field.name}</span>}
                        <span>📅 Due: {t.dueDate}</span>
                      </div>

                      {t.notes && <p className="mt-1.5 text-data text-ink-2 leading-relaxed">{t.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-none">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => completeTask(t.id)}
                        className="rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-accent hover:border-accent hover:bg-accent-soft transition-colors shadow-xs"
                      >
                        {isHindi ? 'पूर्ण करें' : 'Done'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteTask(t.id)}
                      className="text-xs text-ink-3 hover:text-sev-red px-2 py-1 transition-colors"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Conflict banner inside card */}
                {hasConflict && (
                  <div className="rounded-xl border border-sev-orange/40 bg-sev-orange-soft/30 p-3 flex items-start gap-2.5">
                    <span className="text-sev-orange flex-none mt-0.5">
                      <Icon name="alert" size={15} />
                    </span>
                    <div className="text-caption min-w-0 flex-1">
                      <span className="font-bold text-sev-orange block">
                        {isHindi ? 'मौसम टकराव चेतावनी:' : 'Weather Conflict:'} {t.weatherConflict.reason}
                      </span>
                      {t.weatherConflict.recommendation && (
                        <span className="text-ink-2 mt-0.5 block font-medium">
                          👉 {t.weatherConflict.recommendation}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ----------------------------------------------------------- ADD TASK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-subheading font-bold text-ink">
                {isHindi ? 'नया कृषि कार्य जोड़ें' : 'Schedule Farm Task'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-ink-3 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="lbl block mb-1">{isHindi ? 'कार्य का शीर्षक *' : 'Task Title *'}</label>
                <input
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder={isHindi ? 'जैसे: गेहूं में यूरिया छिड़काव' : 'e.g., Spray fungicide on Wheat'}
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2.5 text-caption text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl block mb-1">{isHindi ? 'कार्य प्रकार' : 'Task Type'}</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    {TASK_TYPES.map((ty) => (
                      <option key={ty.id} value={ty.id}>
                        {ty.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="lbl block mb-1">{isHindi ? 'प्राथमिकता' : 'Priority'}</label>
                  <select
                    value={draftPriority}
                    onChange={(e) => setDraftPriority(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
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
                        {fld.name} ({fld.areaHa} ha)
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

              <div>
                <label className="lbl block mb-1">{isHindi ? 'तय तिथि' : 'Due Date'}</label>
                <input
                  type="date"
                  required
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2 text-caption text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dryReq"
                  checked={draftDryReq}
                  onChange={(e) => setDraftDryReq(e.target.checked)}
                  className="h-4 w-4 rounded accent-accent"
                />
                <label htmlFor="dryReq" className="text-caption text-ink-2 cursor-pointer">
                  {isHindi
                    ? 'मौसम सुरक्षा: बारिश होने पर चेतावनी दें (Dry weather required)'
                    : 'Flag conflict if precipitation is forecasted around this date'}
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-line px-4 py-2 text-caption font-semibold text-ink-2 hover:text-ink"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-5 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
                >
                  {isHindi ? 'कार्य सहेजें' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}

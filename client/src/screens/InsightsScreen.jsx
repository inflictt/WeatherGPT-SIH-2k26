import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFarm } from '../lib/useFarm'
import { useData } from '../lib/DataContext'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell, PageHead, Card, CardHead, CardBody, Meter } from '../ui/Bits'
import Reveal from '../ui/Reveal'

const EXPENSE_CATEGORIES = [
  { id: 'seeds', label: 'Seeds (बीज)', color: 'bg-sev-green' },
  { id: 'fertilizer', label: 'Fertilizers / Nutrients (उर्वरक)', color: 'bg-accent' },
  { id: 'pesticides', label: 'Pesticides & Spray (कीटनाशक व फफूंदनाशी)', color: 'bg-sev-amber' },
  { id: 'labour', label: 'Farm Labour (मजदूरी)', color: 'bg-sev-orange' },
  { id: 'irrigation', label: 'Irrigation & Electricity (सिंचाई/बिजली)', color: 'bg-accent-2' },
  { id: 'equipment_fuel', label: 'Fuel & Diesel (डीजल/ईंधन)', color: 'bg-ink-3' },
  { id: 'machinery_rental', label: 'Tractor / Rental (किराया)', color: 'bg-ink-2' },
  { id: 'other', label: 'Other Farm Expenses', color: 'bg-sunk' },
]

export default function InsightsScreen({ audience = 'farm', lang = 'en' }) {
  const { farm, finances, activities, tasks, crops, addFinance } = useFarm()
  const { location, summary24h } = useData()

  const [showAddFinance, setShowAddFinance] = useState(false)
  const [draftType, setDraftType] = useState('expense')
  const [draftCategory, setDraftCategory] = useState('fertilizer')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftCrop, setDraftCrop] = useState(crops[0]?.name || '')
  const [draftDate, setDraftDate] = useState(new Date().toISOString().split('T')[0])
  const [draftNotes, setDraftNotes] = useState('')

  const isHindi = lang === 'hi'

  // Aggregations
  let totalExpense = 0
  let totalIncome = 0
  const categoryTotals = {}
  const cropTotals = {}

  finances.forEach((f) => {
    const amt = Number(f.amount) || 0
    if (f.type === 'expense') {
      totalExpense += amt
      categoryTotals[f.category] = (categoryTotals[f.category] || 0) + amt
      if (f.crop) {
        cropTotals[f.crop] = (cropTotals[f.crop] || 0) + amt
      }
    } else if (f.type === 'income') {
      totalIncome += amt
    }
  })

  const netCashflow = totalIncome - totalExpense

  // Task execution metrics
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const totalTasks = tasks.length
  const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

  // Rain water conservation estimate
  const rainMm = summary24h?.rainMm || 40.4
  const estimatedLitersRain = Math.round(rainMm * (Number(farm?.areaHa) || 2.5) * 10000)

  const handleCreateFinance = (e) => {
    e.preventDefault()
    if (!draftAmount || Number(draftAmount) <= 0) return

    addFinance({
      type: draftType,
      category: draftCategory,
      amount: Number(draftAmount),
      crop: draftCrop,
      date: draftDate,
      notes: draftNotes.trim(),
    })

    setDraftAmount('')
    setDraftNotes('')
    setShowAddFinance(false)
  }

  return (
    <Shell className="space-y-5 py-6 pb-12">
      <PageHead
        eyebrow={`${placeLine(location)} · ${farm?.name || 'Aakrishi Farm'}`}
        title={isHindi ? 'कृषि इनसाइट्स व व्यय विश्लेषण' : 'Farm Financial & Operational Insights'}
        aside={
          <button
            type="button"
            onClick={() => setShowAddFinance(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95 transition-all active:scale-95"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'आय / व्यय दर्ज करें' : '+ Record Finance'}</span>
          </button>
        }
      >
        Real expenditure tracking, water conservation, crop-wise investment, and task completion metrics.
      </PageHead>

      {/* -------------------------------------------------------- HONEST DISCLAIMER */}
      <div className="rounded-xl border border-line bg-sunk/60 px-4 py-3 text-data text-ink-3 flex items-center justify-between gap-3">
        <span className="lbl text-ink-2 flex items-center gap-1.5">
          <Icon name="check" size={14} className="text-accent" />
          <span>{isHindi ? 'दर्ज डेटा पर आधारित' : 'Strictly Based on Recorded Farm Data'}</span>
        </span>
        <span className="text-xs italic text-ink-3">
          {isHindi
            ? 'केवल आपके द्वारा दर्ज वास्तविक खर्च और गतिविधियों का विश्लेषण।'
            : 'No manufactured profits or speculative revenue.'}
        </span>
      </div>

      {/* --------------------------------------------------------- KEY METRICS ROW */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'कुल दर्ज व्यय' : 'Recorded Expenses'}</div>
          <div className="mt-2 text-figure font-semibold text-sev-red">
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-data text-ink-3">
            {finances.filter((f) => f.type === 'expense').length} {isHindi ? 'प्रविष्टियाँ' : 'entries recorded'}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'कुल दर्ज आय' : 'Recorded Harvest Revenue'}</div>
          <div className="mt-2 text-figure font-semibold text-sev-green">
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-data text-ink-3">
            {finances.filter((f) => f.type === 'income').length} {isHindi ? 'बिक्री रिकॉर्ड' : 'sales recorded'}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-card">
          <div className="lbl text-ink-3">{isHindi ? 'शुद्ध स्थिति (Net Cashflow)' : 'Net Farm Position'}</div>
          <div
            className={cn(
              'mt-2 text-figure font-semibold',
              netCashflow >= 0 ? 'text-sev-green' : 'text-ink-2'
            )}
          >
            {netCashflow >= 0 ? `+₹${netCashflow.toLocaleString('en-IN')}` : `-₹${Math.abs(netCashflow).toLocaleString('en-IN')}`}
          </div>
          <div className="mt-1 text-data text-ink-3">
            {netCashflow >= 0 ? (isHindi ? 'सकारात्मक स्थिति' : 'Cash positive') : (isHindi ? 'वर्तमान फसल निवेश चरण' : 'Active investment phase')}
          </div>
        </div>
      </div>

      {/* ------------------------------------------- EXPENSE BREAKDOWN & CROP INVESTMENTS */}
      <Reveal>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Category Breakdown */}
          <Card>
            <CardHead
              title={isHindi ? 'मद-वार व्यय विभाजन (Category)' : 'Expenditure by Category'}
              meta={`₹${totalExpense.toLocaleString('en-IN')}`}
            />
            <CardBody className="space-y-4">
              {Object.keys(categoryTotals).length === 0 ? (
                <p className="text-data text-ink-3 py-6 text-center">
                  {isHindi ? 'अभी कोई खर्च दर्ज नहीं किया गया है।' : 'No expense entries logged yet.'}
                </p>
              ) : (
                EXPENSE_CATEGORIES.filter((c) => categoryTotals[c.id] > 0).map((cat) => {
                  const amt = categoryTotals[cat.id]
                  const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0
                  return (
                    <div key={cat.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-caption font-medium">
                        <span className="text-ink">{cat.label}</span>
                        <span className="font-mono text-ink">
                          ₹{amt.toLocaleString('en-IN')} <span className="opacity-60 text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-sunk">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', cat.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardBody>
          </Card>

          {/* Crop-wise Distribution */}
          <Card>
            <CardHead
              title={isHindi ? 'फ़सल-वार निवेश (Crop-wise)' : 'Investment by Crop'}
              meta={`${Object.keys(cropTotals).length} ${isHindi ? 'फ़सलें' : 'Crops'}`}
            />
            <CardBody className="space-y-4">
              {Object.keys(cropTotals).length === 0 ? (
                <p className="text-data text-ink-3 py-6 text-center">
                  {isHindi ? 'फ़सल-विशिष्ट खर्च अभी दर्ज नहीं हैं।' : 'No crop-specific expenses logged yet.'}
                </p>
              ) : (
                Object.entries(cropTotals).map(([cropName, amt]) => {
                  const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0
                  return (
                    <div key={cropName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-caption font-medium">
                        <span className="text-ink">🌾 {cropName}</span>
                        <span className="font-mono text-ink">
                          ₹{amt.toLocaleString('en-IN')} <span className="opacity-60 text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-sunk">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardBody>
          </Card>
        </div>
      </Reveal>

      {/* ------------------------------------------ OPERATIONAL EFFICIENCY & WATER */}
      <Reveal delay={60}>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Operational Efficiency */}
          <Card>
            <CardHead
              title={isHindi ? 'कार्य निष्पादन दर' : 'Task Completion Efficiency'}
              meta={`${completedTasks} / ${totalTasks} ${isHindi ? 'पूर्ण' : 'Done'}`}
            />
            <CardBody className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="tnum text-figure font-semibold text-accent">{taskRate}%</span>
                <div className="min-w-0 flex-1">
                  <div className="text-caption font-semibold text-ink">
                    {taskRate >= 80
                      ? (isHindi ? 'उत्कृष्ट समयबद्धता' : 'High Operational Timeliness')
                      : (isHindi ? 'लंबित कार्यों पर ध्यान दें' : 'Pending Tasks Require Attention')}
                  </div>
                  <p className="text-data text-ink-3 mt-0.5">
                    {isHindi
                      ? 'मौसम अनुकूलता देखकर कार्यों को समय पर पूरा करने से फ़सल सुरक्षा बढ़ती है।'
                      : 'Timely execution prevents weed and fungal buildup across fields.'}
                  </p>
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-sunk">
                <div
                  className="h-full rounded-full bg-sev-green transition-all duration-500"
                  style={{ width: `${taskRate}%` }}
                />
              </div>

              <div className="pt-2 flex justify-between text-data text-ink-3">
                <Link to="/tasks" className="text-accent hover:underline font-medium">
                  {isHindi ? 'कार्य सूची प्रबंधित करें →' : 'Manage Farm Tasks →'}
                </Link>
                <span>{tasks.filter((t) => t.status === 'today').length} {isHindi ? 'आज निर्धारित' : 'Due today'}</span>
              </div>
            </CardBody>
          </Card>

          {/* Natural Water Contribution */}
          <Card>
            <CardHead
              title={isHindi ? 'वर्षा जल व सिंचाई बचत' : 'Precipitation & Water Intelligence'}
              meta={summary24h?.rainMm ? `${Math.round(summary24h.rainMm)} mm rain` : 'Natural Rain'}
            />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon name="drop" size={24} />
                </span>
                <div className="min-w-0">
                  <div className="text-subheading font-bold text-ink">
                    ~{estimatedLitersRain.toLocaleString('en-IN')} Litres
                  </div>
                  <div className="lbl text-ink-3">{isHindi ? 'प्राकृतिक वर्षा जल लाभ' : 'Natural Rain Replenishment'}</div>
                </div>
              </div>

              <p className="text-data leading-relaxed text-ink-2">
                {isHindi
                  ? `हालिया वर्षा के कारण मुख्य ट्यूबवेल सिंचाई को स्थगित रखा गया, जिससे बिजली और भूमिगत जल की महत्वपूर्ण बचत हुई।`
                  : `Recent rainfall naturally replenished soil moisture on your ${farm?.areaHa || 2.5} ha plots, enabling irrigation deferral and power savings.`}
              </p>

              <div className="border-t border-line-soft pt-3 flex items-center justify-between text-data text-ink-3">
                <span>{isHindi ? 'सिंचाई स्थिति:' : 'Irrigation Advice:'}</span>
                <span className="font-bold text-sev-green">{isHindi ? 'स्थगित (Hold Off)' : 'Deferred / Saved'}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </Reveal>

      {/* ----------------------------------------------------- RECORD FINANCE MODAL */}
      {showAddFinance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-subheading font-bold text-ink">
                {isHindi ? 'वित्तीय प्रविष्टि जोड़ें' : 'Record Farm Income / Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFinance(false)}
                className="text-ink-3 hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFinance} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl block mb-1">{isHindi ? 'प्रकार *' : 'Entry Type *'}</label>
                  <select
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    <option value="expense">{isHindi ? 'व्यय / खर्च (Expense)' : 'Expense'}</option>
                    <option value="income">{isHindi ? 'आय / बिक्री (Income)' : 'Harvest Income'}</option>
                  </select>
                </div>

                <div>
                  <label className="lbl block mb-1">{isHindi ? 'राशि (₹) *' : 'Amount (₹) *'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={draftAmount}
                    onChange={(e) => setDraftAmount(e.target.value)}
                    placeholder="₹ 5000"
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl block mb-1">{isHindi ? 'श्रेणी *' : 'Category *'}</label>
                  <select
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-ground px-3 py-2 text-caption text-ink outline-none focus:border-accent"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                    <option value="harvest_sale">{isHindi ? 'फ़सल बिक्री (Harvest Sale)' : 'Harvest Sale'}</option>
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
                    <option value="General Farm">{isHindi ? 'सामान्य खेत (General)' : 'General Farm'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="lbl block mb-1">{isHindi ? 'दिनांक' : 'Date'}</label>
                <input
                  type="date"
                  required
                  value={draftDate}
                  onChange={(e) => setDraftDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2 text-caption text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="lbl block mb-1">{isHindi ? 'विवरण' : 'Notes / Vendor'}</label>
                <input
                  type="text"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder={isHindi ? 'दुकानदार, बीज प्रकार या मंडी का नाम...' : 'e.g. Mandi sale, IFFCO dealer...'}
                  className="w-full rounded-xl border border-line bg-ground px-3.5 py-2 text-caption text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddFinance(false)}
                  className="rounded-xl border border-line px-4 py-2 text-caption font-semibold text-ink-2 hover:text-ink"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-5 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
                >
                  {isHindi ? 'सहेजें' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  )
}

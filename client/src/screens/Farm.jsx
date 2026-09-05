import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useFarm, stageFor } from '../lib/useFarm'
import { evaluateFarmIntelligence } from '../lib/farmIntelligence'
import { t } from '../lib/i18n'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, SubTabs, Meter } from '../ui/Bits'
import Reveal from '../ui/Reveal'
import ImageAnalyser from '../weather/ImageAnalyser'
import FarmConditions from '../weather/FarmConditions'
import CropPlanner from '../weather/CropPlanner'
import FieldMapView from '../weather/FieldMapView'

const SOILS = ['Alluvial', 'Black (regur)', 'Red', 'Laterite', 'Loamy', 'Sandy', 'Clay', 'Silty']
const IRRIGATION = ['Rain-fed', 'Tube well', 'Canal', 'Drip', 'Sprinkler', 'Tank / pond']
const WATER = ['Adequate', 'Limited', 'Scarce']

export default function Farm({ audience = 'farm', setAudience, lang = 'en' }) {
  const [tab, setTab] = useState('fields') // default to fields so the user sees multi-field parcels and boundary map!
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [showAddField, setShowAddField] = useState(false)
  const [showAddLivestock, setShowAddLivestock] = useState(false)

  // Form states for new field
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldArea, setNewFieldArea] = useState('1.5')
  const [newFieldSoil, setNewFieldSoil] = useState('Alluvial')
  const [newFieldIrrigation, setNewFieldIrrigation] = useState('Tube well')
  const [newFieldCrop, setNewFieldCrop] = useState('Wheat (गेहूँ)')
  const [newFieldNotes, setNewFieldNotes] = useState('')

  // Form states for new livestock
  const [animalName, setAnimalName] = useState('')
  const [animalType, setAnimalType] = useState('Cattle')
  const [animalCount, setAnimalCount] = useState('2')
  const [animalHealth, setAnimalHealth] = useState('healthy')
  const [animalNotes, setAnimalNotes] = useState('')

  const {
    farm,
    farms,
    activeFarmId,
    fields,
    tasks,
    livestock,
    set,
    addFarm,
    switchFarm,
    deleteFarm,
    addField,
    updateField,
    deleteField,
    addLivestock,
    deleteLivestock,
    addCrop,
    updateCrop,
    removeCrop,
    logObservation,
    completeness,
  } = useFarm()
  const { current, daily, summary24h, hourly, location } = useData()
  const warnings = useActiveWarnings()

  const isGeneral = audience === 'everyone'
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

  const tabs = [
    { key: 'fields', label: isHindi ? 'खेत और प्लॉट (Fields & Map)' : 'Plots & Fields' },
    { key: 'planner', label: isHindi ? 'योजनाकार (Planner)' : 'Crop Planner' },
    { key: 'intelligence', label: isHindi ? 'खेत स्थिति (Intelligence)' : 'Farm Intelligence' },
    { key: 'livestock', label: isHindi ? 'पशुधन (Livestock)' : 'Livestock' },
    { key: 'farm', label: t('subTabMyFarm', lang) },
    { key: 'doctor', label: t('subTabCropDoctor', lang) },
    { key: 'soil', label: t('subTabSoilCheck', lang) },
  ]

  return (
    <Shell className="space-y-4 pb-8">
      {isGeneral && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent">
              <Icon name="sprout" size={20} />
            </span>
            <div>
              <h4 className="text-body-sm font-bold text-ink">
                {t('farmerViewNotice', lang)}
              </h4>
            </div>
          </div>
          {setAudience && (
            <button
              type="button"
              onClick={() => setAudience('farm')}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
            >
              <span>{t('switchToFarmerMode', lang)}</span>
            </button>
          )}
        </div>
      )}

      {/* Header with farm selector */}
      <PageHead
        eyebrow={placeLine(location)}
        title={t('farmConnectTitle', lang)}
        aside={
          <div className="flex items-center gap-3">
            <span className="lbl">{farm?.name ? farm.name.split('(')[0].trim() : t('tabFarmShort', lang)}</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-sunk">
              <span
                className="block h-full origin-left rounded-full bg-accent transition-transform duration-700"
                style={{ transform: `scaleX(${completeness / 100})` }}
              />
            </span>
            <span className="tnum text-data font-medium text-ink">{completeness}%</span>
          </div>
        }
      >
        Continuous farm monitoring, automated weather intelligence, smart photo triggers, and field diagnosis.
      </PageHead>

      {/* Multi-Farm Selection Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lbl text-ink-3 flex items-center gap-1">
            <Icon name="pin" size={13} />
            {isHindi ? 'खेत / प्लॉट:' : 'Farm Plot:'}
          </span>
          {farms.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => switchFarm(f.id)}
              className={cn(
                'rounded-lg px-3 py-1 text-caption font-semibold transition-colors',
                f.id === activeFarmId
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'bg-sunk text-ink-2 hover:bg-line-soft hover:text-ink'
              )}
            >
              {f.name || 'Unnamed Plot'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ask"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1 text-xs font-bold text-accent hover:bg-accent hover:text-on-accent transition-colors shadow-xs"
          >
            <Icon name="mic" size={13} />
            <span>{isHindi ? 'बोलकर पूछें' : 'Voice Assistant'}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              const plotName = prompt(
                isHindi ? 'नए खेत का नाम दर्ज करें:' : 'Enter new farm/plot name:',
                isHindi ? `खेत ${farms.length + 1}` : `Plot ${farms.length + 1}`
              )
              if (plotName?.trim()) addFarm(plotName.trim())
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-accent hover:border-accent hover:bg-accent-soft shadow-xs"
          >
            <Icon name="plus" size={12} />
            <span>{isHindi ? 'नया खेत जोड़ें' : '+ Add Plot'}</span>
          </button>
        </div>
      </div>

      {/* Quick Farm Operations Hub Bar */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/tasks"
          className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 shadow-xs transition-all hover:border-accent hover:bg-accent-soft/30"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sev-blue/15 text-sev-blue">
              <Icon name="calendar" size={14} />
            </span>
            <div className="text-left">
              <div className="text-caption font-bold text-ink">
                {isHindi ? 'मौसम-आधारित कार्य' : 'Farm Tasks'}
              </div>
              <div className="text-[11px] text-ink-3">
                {tasks.filter((t) => t.status !== 'completed').length} {isHindi ? 'शेष कार्य' : 'pending'}
              </div>
            </div>
          </div>
          <Icon name="chevronRight" size={14} className="text-ink-3" />
        </Link>

        <Link
          to="/journal"
          className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 shadow-xs transition-all hover:border-accent hover:bg-accent-soft/30"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sev-green/15 text-sev-green">
              <Icon name="layers" size={14} />
            </span>
            <div className="text-left">
              <div className="text-caption font-bold text-ink">
                {isHindi ? 'खेत डायरी (Journal)' : 'Farm Journal'}
              </div>
              <div className="text-[11px] text-ink-3">
                {isHindi ? 'गतिविधि व टाइमलाइन' : 'Activity & memory'}
              </div>
            </div>
          </div>
          <Icon name="chevronRight" size={14} className="text-ink-3" />
        </Link>

        <Link
          to="/insights"
          className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 shadow-xs transition-all hover:border-accent hover:bg-accent-soft/30"
        >
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sev-purple/15 text-sev-purple">
              <Icon name="gauge" size={14} />
            </span>
            <div className="text-left">
              <div className="text-caption font-bold text-ink">
                {isHindi ? 'आय-व्यय विश्लेषण' : 'Farm Finance'}
              </div>
              <div className="text-[11px] text-ink-3">
                {isHindi ? 'खर्चे और पैदावार' : 'Costs & harvest'}
              </div>
            </div>
          </div>
          <Icon name="chevronRight" size={14} className="text-ink-3" />
        </Link>
      </div>

      <SubTabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ------------------------------------------------------------ FIELDS & BOUNDARY MAP TAB */}
      {tab === 'fields' && (
        <div className="space-y-4 pt-1">
          {/* Interactive Field Boundary Parcel Map */}
          <FieldMapView
            fields={fields}
            activeFieldId={selectedFieldId}
            onSelectField={(id) => setSelectedFieldId(id)}
            location={location}
            lang={lang}
          />

          {/* Fields List Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-body-sm font-bold text-ink">
                {isHindi ? 'खेत के प्लॉट एवं फ़ील्ड्स' : 'Farm Parcels & Multi-Field Management'}
              </h3>
              <p className="text-caption text-ink-3">
                {fields.length} {isHindi ? 'प्लॉट पंजीकृत हैं' : 'parcels recorded with dedicated soil, crop & risk context'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddField(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
            >
              <Icon name="plus" size={14} />
              <span>{isHindi ? 'नया प्लॉट जोड़ें' : '+ Add Field Parcel'}</span>
            </button>
          </div>

          {/* Add Field Modal Form */}
          {showAddField && (
            <Card className="border-accent/40 bg-accent-soft/10">
              <CardHead
                title={isHindi ? 'नया खेत प्लॉट जोड़ें' : 'Register New Field Parcel'}
                meta={isHindi ? 'प्रत्येक प्लॉट का स्वतंत्र प्रबंधन' : 'Separate crop, soil & boundary tracking'}
                action={
                  <button
                    type="button"
                    onClick={() => setShowAddField(false)}
                    className="text-ink-3 hover:text-ink"
                  >
                    <Icon name="close" size={16} />
                  </button>
                }
              />
              <CardBody>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!newFieldName.trim()) return
                    // compute a sample boundary polygon offset around farm location
                    const baseLat = location?.lat || 28.46
                    const baseLon = location?.lon || 77.026
                    const offset = (fields.length + 1) * 0.003
                    const generatedBoundary = [
                      [baseLat + offset, baseLon + offset],
                      [baseLat + offset + 0.0015, baseLon + offset + 0.002],
                      [baseLat + offset - 0.0005, baseLon + offset + 0.003],
                      [baseLat + offset - 0.0015, baseLon + offset + 0.001],
                    ]

                    addField({
                      name: newFieldName.trim(),
                      areaHa: parseFloat(newFieldArea) || 1,
                      soilType: newFieldSoil,
                      irrigationType: newFieldIrrigation,
                      assignedCropName: newFieldCrop,
                      healthStatus: 'healthy',
                      boundary: generatedBoundary,
                      notes: newFieldNotes,
                    })
                    setNewFieldName('')
                    setShowAddField(false)
                  }}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={isHindi ? 'प्लॉट का नाम' : 'Parcel Name'} icon="sprout">
                      <input
                        required
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g. West Plot (पश्चिम खेत)"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={isHindi ? 'क्षेत्रफल (Area in Hectares)' : 'Area (Hectares)'} icon="layers">
                      <input
                        required
                        type="number"
                        step="0.1"
                        value={newFieldArea}
                        onChange={(e) => setNewFieldArea(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={isHindi ? 'बोई गई फसल' : 'Assigned Crop'} icon="leaf">
                      <input
                        value={newFieldCrop}
                        onChange={(e) => setNewFieldCrop(e.target.value)}
                        placeholder="e.g. Mustard, Gram, Wheat"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={isHindi ? 'मिट्टी का प्रकार' : 'Soil Type'} icon="flask">
                      <select
                        value={newFieldSoil}
                        onChange={(e) => setNewFieldSoil(e.target.value)}
                        className={inputCls}
                      >
                        {SOILS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={isHindi ? 'सिंचाई का साधन' : 'Irrigation Method'} icon="drop">
                      <select
                        value={newFieldIrrigation}
                        onChange={(e) => setNewFieldIrrigation(e.target.value)}
                        className={inputCls}
                      >
                        {IRRIGATION.map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={isHindi ? 'विशेष विवरण / नोट्स' : 'Field Notes'}>
                      <input
                        value={newFieldNotes}
                        onChange={(e) => setNewFieldNotes(e.target.value)}
                        placeholder="e.g. Near tube well, slight slope"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddField(false)}
                      className="rounded-lg border border-line px-3 py-1.5 text-caption font-semibold text-ink-2"
                    >
                      {isHindi ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-accent px-4 py-1.5 text-caption font-bold text-on-accent shadow-xs"
                    >
                      {isHindi ? 'प्लॉट सहेजें' : 'Save Field Parcel'}
                    </button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Field Parcel Cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => {
              const isSelected = f.id === selectedFieldId
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFieldId(f.id)}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-4 shadow-xs transition-all',
                    isSelected
                      ? 'border-accent bg-accent-soft/20 shadow-md ring-1 ring-accent'
                      : 'border-line bg-surface hover:border-accent/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-bold text-ink">{f.name}</span>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            f.healthStatus === 'healthy'
                              ? 'bg-sev-green/15 text-sev-green'
                              : f.healthStatus === 'attention'
                              ? 'bg-sev-yellow/15 text-sev-yellow'
                              : 'bg-sev-orange/15 text-sev-orange'
                          )}
                        >
                          {f.healthStatus || 'healthy'}
                        </span>
                      </div>
                      <p className="text-caption text-ink-3 mt-0.5">
                        {f.areaHa} ha ({(f.areaHa * 2.471).toFixed(1)} acres) · {f.soilType} soil
                      </p>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(isHindi ? `क्या आप ${f.name} हटाना चाहते हैं?` : `Delete parcel ${f.name}?`)) {
                            deleteField(f.id)
                          }
                        }}
                        className="text-ink-3 hover:text-sev-red p-1 transition-colors"
                        title="Delete parcel"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-sunk/60 p-2.5 text-caption">
                    <div>
                      <span className="lbl text-[11px] text-ink-3 block">
                        {isHindi ? 'फसल' : 'Crop'}
                      </span>
                      <span className="font-semibold text-ink">
                        {f.assignedCropName || 'None assigned'}
                      </span>
                    </div>
                    <div>
                      <span className="lbl text-[11px] text-ink-3 block">
                        {isHindi ? 'सिंचाई' : 'Irrigation'}
                      </span>
                      <span className="font-semibold text-ink">
                        {f.irrigationType || 'Rain-fed'}
                      </span>
                    </div>
                  </div>

                  {f.notes && (
                    <p className="mt-2 text-xs italic text-ink-3">
                      "{f.notes}"
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ LIVESTOCK TAB */}
      {tab === 'livestock' && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-body-sm font-bold text-ink">
                {isHindi ? 'पशुधन प्रबंधन (Livestock Care)' : 'Livestock Management & Health'}
              </h3>
              <p className="text-caption text-ink-3">
                {livestock.reduce((sum, item) => sum + (parseInt(item.count) || 1), 0)} {isHindi ? 'पशु पंजीकृत हैं' : 'animals under management'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLivestock(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
            >
              <Icon name="plus" size={14} />
              <span>{isHindi ? 'नया पशु समूह जोड़ें' : '+ Add Animal Group'}</span>
            </button>
          </div>

          {showAddLivestock && (
            <Card className="border-accent/40 bg-accent-soft/10">
              <CardHead
                title={isHindi ? 'पशुधन रिकॉर्ड दर्ज करें' : 'Record Livestock Group'}
                action={
                  <button
                    type="button"
                    onClick={() => setShowAddLivestock(false)}
                    className="text-ink-3 hover:text-ink"
                  >
                    <Icon name="close" size={16} />
                  </button>
                }
              />
              <CardBody>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!animalName.trim()) return
                    addLivestock({
                      name: animalName.trim(),
                      type: animalType,
                      count: parseInt(animalCount) || 1,
                      healthStatus: animalHealth,
                      vaccinationNotes: animalNotes,
                    })
                    setAnimalName('')
                    setShowAddLivestock(false)
                  }}
                  className="space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={isHindi ? 'समूह / पशु का नाम' : 'Group / Tag Name'}>
                      <input
                        required
                        value={animalName}
                        onChange={(e) => setAnimalName(e.target.value)}
                        placeholder="e.g. Sahiwal Cows (साहीवाल गाय)"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={isHindi ? 'पशु का प्रकार' : 'Animal Type'}>
                      <select
                        value={animalType}
                        onChange={(e) => setAnimalType(e.target.value)}
                        className={inputCls}
                      >
                        <option value="Cattle">Cattle (गाय)</option>
                        <option value="Buffalo">Buffalo (भैंस)</option>
                        <option value="Goat">Goat (बकरी)</option>
                        <option value="Sheep">Sheep (भेड़)</option>
                        <option value="Poultry">Poultry (मुर्गी पालन)</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label={isHindi ? 'संख्या' : 'Head Count'}>
                      <input
                        required
                        type="number"
                        min="1"
                        value={animalCount}
                        onChange={(e) => setAnimalCount(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={isHindi ? 'स्वास्थ्य स्थिति' : 'Health Status'}>
                      <select
                        value={animalHealth}
                        onChange={(e) => setAnimalHealth(e.target.value)}
                        className={inputCls}
                      >
                        <option value="healthy">Healthy (स्वस्थ)</option>
                        <option value="monitoring">Under Monitoring (निगरानी)</option>
                        <option value="treatment">In Treatment (उपचार जारी)</option>
                      </select>
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label={isHindi ? 'टीकाकरण व चारा विवरण' : 'Vaccination & Care Notes'}>
                        <input
                          value={animalNotes}
                          onChange={(e) => setAnimalNotes(e.target.value)}
                          placeholder="e.g. FMD vaccinated in July. Green fodder + dry straw daily."
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddLivestock(false)}
                      className="rounded-lg border border-line px-3 py-1.5 text-caption font-semibold text-ink-2"
                    >
                      {isHindi ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-accent px-4 py-1.5 text-caption font-bold text-on-accent shadow-xs"
                    >
                      {isHindi ? 'पशुधन सहेजें' : 'Save Livestock Record'}
                    </button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {livestock.length === 0 ? (
              <div className="col-span-2 rounded-2xl border border-line bg-surface p-8 text-center text-ink-3">
                <p className="text-caption font-semibold">
                  {isHindi ? 'कोई पशुधन रिकॉर्ड दर्ज नहीं है।' : 'No livestock registered yet.'}
                </p>
                <p className="text-xs mt-1">
                  {isHindi ? 'पशुओं की संख्या व स्वास्थ्य ट्रैक करने के लिए समूह जोड़ें।' : 'Add your dairy, goats, or poultry groups for feed & vaccination reminders.'}
                </p>
              </div>
            ) : (
              livestock.map((item) => (
                <div key={item.id} className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-bold text-ink">{item.name}</span>
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                          {item.count} {item.type}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'inline-block mt-1 text-[11px] font-semibold',
                          item.healthStatus === 'healthy'
                            ? 'text-sev-green'
                            : 'text-sev-orange'
                        )}
                      >
                        ● {item.healthStatus || 'healthy'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(isHindi ? `क्या आप ${item.name} हटाना चाहते हैं?` : `Remove ${item.name}?`)) {
                          deleteLivestock(item.id)
                        }
                      }}
                      className="text-ink-3 hover:text-sev-red p-1 transition-colors"
                      title="Delete record"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>

                  {item.vaccinationNotes && (
                    <div className="mt-3 rounded-xl bg-sunk/60 p-2.5 text-xs text-ink-2">
                      <span className="font-semibold text-ink block mb-0.5">
                        {isHindi ? 'देखभाल व टीकाकरण:' : 'Care & Vaccination:'}
                      </span>
                      {item.vaccinationNotes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ PLANNER TAB */}
      {tab === 'planner' && (
        <div className="pt-1">
          <CropPlanner
            farm={farm}
            updateCrop={updateCrop}
            addCrop={addCrop}
            lang={lang}
            location={location}
          />
        </div>
      )}

      {/* ------------------------------------------------------------ FARM INTELLIGENCE DASHBOARD */}
      {tab === 'intelligence' && (
        <div className="pt-1">
          <FarmConditions
            intelligence={intelligence}
            onOpenScan={() => setTab('doctor')}
            lang={lang}
          />
        </div>
      )}

      {/* ------------------------------------------------------------ MY FARM PROFILE */}
      {tab === 'farm' && (
        <div className="space-y-3 pt-1">
          <Card>
            <CardHead
              title={t('subTabMyFarm', lang)}
              meta={farm.name ? 'Saved on this device' : 'Not set up yet'}
              action={
                farms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(isHindi ? 'क्या आप इस खेत प्लॉट को हटाना चाहते हैं?' : 'Delete this farm plot?')) {
                        deleteFarm(farm.id)
                      }
                    }}
                    className="lbl inline-flex items-center gap-1 text-sev-red hover:underline"
                  >
                    <Icon name="trash" size={13} />
                    {isHindi ? 'खेत हटाएं' : 'Delete Plot'}
                  </button>
                )
              }
            />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t('farmName', lang)} icon="sprout">
                  <input
                    value={farm.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="e.g. Kapriwas East"
                    className={inputCls}
                  />
                </Field>
                <Field label={t('areaUnderCrop', lang)} icon="layers">
                  <div className="flex items-center gap-2">
                    <input
                      value={farm.areaHa}
                      onChange={(e) => set({ areaHa: e.target.value })}
                      inputMode="decimal"
                      placeholder="2.4"
                      className={inputCls}
                    />
                    <span className="lbl flex-none">ha</span>
                  </div>
                </Field>
                <Field label={t('soilType', lang)} icon="flask">
                  <select
                    value={farm.soilType}
                    onChange={(e) =>
                      set({ soilType: e.target.value, soilSource: 'manual', soilConfidence: null })
                    }
                    className={inputCls}
                  >
                    <option value="">Not set</option>
                    {SOILS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('irrigationSource', lang)} icon="drop">
                  <select
                    value={farm.irrigation}
                    onChange={(e) => set({ irrigation: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Not set</option>
                    {IRRIGATION.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('waterAvailability', lang)} icon="drop">
                  <select
                    value={farm.water}
                    onChange={(e) => set({ water: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Not set</option>
                    {WATER.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('seasonLabel', lang)} icon="calendar">
                  <input
                    value={farm.season}
                    onChange={(e) => set({ season: e.target.value })}
                    placeholder="e.g. Rabi 2026"
                    className={inputCls}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* ---- crops ---- */}
          <Card>
            <CardHead
              title={t('cropsThisSeason', lang)}
              action={
                <button
                  type="button"
                  onClick={() => addCrop({ name: 'Wheat' })}
                  className="lbl inline-flex items-center gap-1.5 text-accent hover:text-accent-2"
                >
                  <Icon name="plus" size={13} />
                  {t('addCrop', lang)}
                </button>
              }
            />
            <CardBody className="space-y-3">
              {farm.crops.length === 0 && (
                <p className="text-data leading-relaxed text-ink-3">
                  No crops yet. Add one to customize your daily brief and lifecycle stages.
                </p>
              )}
              {farm.crops.map((c) => {
                const st = stageFor(c)
                return (
                  <div key={c.id} className="rounded-lg border border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Field label={t('cropName', lang)}>
                        <input
                          value={c.name}
                          onChange={(e) => updateCrop(c.id, { name: e.target.value })}
                          placeholder="Wheat / Gehu"
                          className={inputCls}
                        />
                      </Field>
                      <Field label={t('sownOn', lang)}>
                        <input
                          type="date"
                          value={c.sownAt || ''}
                          onChange={(e) => updateCrop(c.id, { sownAt: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeCrop(c.id)}
                        aria-label={`Remove ${c.name || 'crop'}`}
                        className="tap mt-6 grid h-9 w-9 flex-none place-items-center rounded-md text-ink-3 transition-colors hover:text-sev-red"
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </div>

                    {c.sownAt && (
                      <div className="mt-3.5 border-t border-line-soft pt-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-data font-medium text-ink">
                            {isHindi ? st.labelHi || st.label : st.label}
                          </span>
                          <span className="tnum text-data text-ink-3">
                            {st.days != null ? `Day ${st.days}` : ''}
                          </span>
                        </div>
                        <Meter value={st.progress} max={1} className="mt-2" />
                      </div>
                    )}
                  </div>
                )
              })}
            </CardBody>
          </Card>

          {/* ---- observation log ---- */}
          <Card>
            <CardHead
              title={t('observationLog', lang)}
              meta={`${farm.observations.length} recorded`}
            />
            <CardBody className="space-y-2.5">
              {farm.observations.length === 0 && (
                <p className="text-data leading-relaxed text-ink-3">
                  {t('noObservationsYet', lang)}
                </p>
              )}
              {farm.observations.map((o) => (
                <div
                  key={o.id}
                  className="flex items-start gap-3 border-b border-line-soft pb-2.5 last:border-b-0"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-sunk text-ink-3">
                    <Icon name={o.mode === 'soil' ? 'flask' : 'leaf'} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-caption font-medium text-ink">{o.prediction}</span>
                      <span className="tnum lbl">
                        {Math.round((o.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="text-data text-ink-3">
                      {new Date(o.at).toLocaleString()} ·{' '}
                      {o.mode === 'soil' ? t('subTabSoilCheck', lang) : t('subTabCropDoctor', lang)}
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------- CROP DOCTOR */}
      {tab === 'doctor' && (
        <div className="space-y-3 pt-1">
          <ImageAnalyser
            mode="leaf"
            crop={farm.crops[0]?.name}
            location={location}
            lang={lang}
            onResult={(r) => {
              logObservation({ mode: 'leaf', prediction: r.prediction, confidence: r.confidence })
            }}
            onViewDashboard={() => setTab('intelligence')}
          />
        </div>
      )}

      {/* --------------------------------------------------------- SOIL CHECK */}
      {tab === 'soil' && (
        <div className="space-y-3 pt-1">
          <ImageAnalyser
            mode="soil"
            lang={lang}
            onResult={(r) => {
              logObservation({ mode: 'soil', prediction: r.prediction, confidence: r.confidence })
              set({ soilType: r.prediction, soilConfidence: r.confidence, soilSource: 'model' })
            }}
            onViewDashboard={() => setTab('intelligence')}
          />
        </div>
      )}
    </Shell>
  )
}

const inputCls =
  'h-10 w-full rounded-lg border border-line bg-sunk px-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface'

function Field({ label, icon, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-ink-3">
        {icon ? <Icon name={icon} size={13} /> : null}
        <span className="lbl">{label}</span>
      </span>
      {children}
    </label>
  )
}

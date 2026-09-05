import { useCallback, useEffect, useState } from 'react'
import { CROP_STAGES } from './constants'
import { getCropProfile, calculateCropLifecycle } from './cropProfiles'
import { api, LIVE } from './api'

/**
 * Multi-farm, multi-field, tasks, activities, finance & farm memory store.
 * Stored resiliently in localStorage and synchronized with server database when logged in.
 */
const FARMS_KEY = 'wg-farms-store-v2'
const LEGACY_KEY = 'wg-farms-store'

export const DEFAULT_FIELDS = [
  {
    id: 'fld_1',
    name: 'North Field (उत्तर प्लॉट)',
    areaHa: 1.5,
    soilType: 'Alluvial',
    irrigationType: 'Tube well',
    waterAvailability: 'Adequate',
    healthStatus: 'healthy',
    assignedCropName: 'Wheat (गेहूँ)',
    assignedCropVariety: 'HD-2967',
    sownAt: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    notes: 'Well drained alluvial loam, near tube well discharge.',
    boundary: [
      [28.4615, 77.0255],
      [28.4625, 77.0275],
      [28.4605, 77.0285],
      [28.4595, 77.0265],
    ],
  },
  {
    id: 'fld_2',
    name: 'South Field (दक्षिण प्लॉट)',
    areaHa: 1.0,
    soilType: 'Loamy',
    irrigationType: 'Sprinkler',
    waterAvailability: 'Limited',
    healthStatus: 'attention',
    assignedCropName: 'Mustard (सरसों)',
    assignedCropVariety: 'Pusa Bold',
    sownAt: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    notes: 'Slight lower slope. Monitor for standing water during heavy showers.',
    boundary: [
      [28.4585, 77.0245],
      [28.4595, 77.0265],
      [28.4575, 77.0275],
      [28.4565, 77.0255],
    ],
  },
]

export const DEFAULT_TASKS = [
  {
    id: 'tsk_1',
    title: 'Postpone Wheat Irrigation',
    type: 'irrigation',
    crop: 'Wheat (गेहूँ)',
    fieldId: 'fld_1',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'today',
    notes: 'Rain expected; save water and power while soil moisture remains high.',
    weatherDependency: { noRainRequired: true },
  },
  {
    id: 'tsk_2',
    title: 'Inspect Mustard Leaves for White Rust',
    type: 'inspection',
    crop: 'Mustard (सरसों)',
    fieldId: 'fld_2',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'medium',
    status: 'upcoming',
    notes: 'High humidity increases foliar fungal pressure. Inspect lower leaves.',
  },
  {
    id: 'tsk_3',
    title: 'Clean Field 2 Drainage Channel',
    type: 'drainage',
    crop: 'Mustard (सरसों)',
    fieldId: 'fld_2',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'today',
    notes: 'Prevent waterlogging along the lower boundary after thunderstorms.',
  },
]

export const DEFAULT_ACTIVITIES = [
  {
    id: 'act_1',
    activityType: 'sowing',
    crop: 'Wheat (गेहूँ)',
    fieldId: 'fld_1',
    date: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
    quantity: 100,
    unit: 'kg seed',
    cost: 3800,
    notes: 'Certified HD-2967 seed treated with Trichoderma.',
  },
  {
    id: 'act_2',
    activityType: 'sowing',
    crop: 'Mustard (सरसों)',
    fieldId: 'fld_2',
    date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    quantity: 4,
    unit: 'kg seed',
    cost: 1200,
    notes: 'Pusa Bold seed sown with seed drill.',
  },
]

export const DEFAULT_FINANCES = [
  {
    id: 'fin_1',
    type: 'expense',
    category: 'seeds',
    amount: 5000,
    crop: 'Wheat & Mustard',
    date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    notes: 'Certified seeds from block agriculture office.',
  },
  {
    id: 'fin_2',
    type: 'expense',
    category: 'fertilizer',
    amount: 4200,
    crop: 'Wheat (गेहूँ)',
    date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    notes: 'DAP basal application.',
  },
]

export const DEFAULT_TIMELINE = [
  {
    id: 'ev_1',
    eventType: 'HEAVY_RAIN',
    title: 'Rainfall Event Detected',
    description: '40.4 mm cumulative rain recorded over the past 72 hours.',
    timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
    severity: 'advisory',
  },
  {
    id: 'ev_2',
    eventType: 'ALERT',
    title: 'SDMA Weather Warning Active',
    description: 'Orange alert for heavy rain and squall winds in Gurugram district.',
    timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
    severity: 'warning',
  },
]

export const DEFAULT_LIVESTOCK = [
  {
    id: 'ls_1',
    name: 'Dairy Cattle (गाय)',
    type: 'cattle',
    count: 3,
    breed: 'Sahiwal / Gir cross',
    healthStatus: 'healthy',
    vaccinationNotes: 'FMD vaccination completed in October.',
    productionNotes: 'Avg 22 L/day combined milk yield.',
  },
]

export const DEFAULT_FARM = {
  id: 'f_default',
  name: 'Main Farm (मुख्य खेत)',
  areaHa: '2.5',
  soilType: 'Alluvial',
  soilConfidence: null,
  soilSource: null,
  irrigation: 'Tube well',
  water: 'Adequate',
  season: 'Rabi 2026',
  crops: [
    {
      id: 'c_wheat',
      name: 'Wheat (गेहूँ)',
      variety: 'HD-2967 / DBW-187',
      sownAt: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
      fieldId: 'fld_1',
    },
    {
      id: 'c_mustard',
      name: 'Mustard (सरसों)',
      variety: 'Pusa Bold / Giriraj',
      sownAt: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
      fieldId: 'fld_2',
    },
  ],
  fields: DEFAULT_FIELDS,
  tasks: DEFAULT_TASKS,
  activities: DEFAULT_ACTIVITIES,
  finances: DEFAULT_FINANCES,
  timeline: DEFAULT_TIMELINE,
  livestock: DEFAULT_LIVESTOCK,
  observations: [],
}

function ensureFarmDefaults(f) {
  if (!f) return DEFAULT_FARM
  return {
    ...DEFAULT_FARM,
    ...f,
    crops: Array.isArray(f.crops) && f.crops.length > 0 ? f.crops : DEFAULT_FARM.crops,
    fields: Array.isArray(f.fields) && f.fields.length > 0 ? f.fields : DEFAULT_FIELDS,
    tasks: Array.isArray(f.tasks) && f.tasks.length > 0 ? f.tasks : DEFAULT_TASKS,
    activities: Array.isArray(f.activities) ? f.activities : DEFAULT_ACTIVITIES,
    finances: Array.isArray(f.finances) ? f.finances : DEFAULT_FINANCES,
    timeline: Array.isArray(f.timeline) ? f.timeline : DEFAULT_TIMELINE,
    livestock: Array.isArray(f.livestock) ? f.livestock : DEFAULT_LIVESTOCK,
    observations: Array.isArray(f.observations) ? f.observations : [],
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(FARMS_KEY) || localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed?.farms) && parsed.farms.length > 0) {
        return {
          farms: parsed.farms.map(ensureFarmDefaults),
          activeFarmId: parsed.activeFarmId || parsed.farms[0]?.id || DEFAULT_FARM.id,
        }
      }
    }
    return {
      farms: [DEFAULT_FARM],
      activeFarmId: DEFAULT_FARM.id,
    }
  } catch {
    return {
      farms: [DEFAULT_FARM],
      activeFarmId: DEFAULT_FARM.id,
    }
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(FARMS_KEY, JSON.stringify(store))
  } catch {}
}

/** How much of the profile is filled in, as a percentage. */
export function completeness(farm) {
  if (!farm) return 0
  const checks = [
    Boolean(farm.name),
    Boolean(farm.areaHa),
    Boolean(farm.soilType),
    Boolean(farm.irrigation),
    Boolean(farm.water),
    Boolean(farm.season),
    farm.crops && farm.crops.length > 0,
    farm.fields && farm.fields.length > 0,
    farm.tasks && farm.tasks.length > 0,
    farm.observations && farm.observations.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

/** Days between a sowing date and now, or null when the date is unusable. */
export function daysSince(iso) {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 86400000))
}

/** Crop stage calculation from sowing date using agronomic profiles */
export function stageFor(crop) {
  if (!crop) return { key: 'planning', label: 'Planning', progress: 0, days: null }
  const profile = getCropProfile(crop.name)
  const life = calculateCropLifecycle(profile, crop.sownAt)
  if (!life.hasSownDate) {
    return { key: 'planning', label: 'Planning', progress: 0, days: null }
  }
  return {
    key: life.currentStage?.key || 'germination',
    label: life.currentStage?.label || 'Germination',
    labelHi: life.currentStage?.labelHi || 'अंकुरण',
    progress: life.progressPercent / 100,
    days: life.daysAfterSowing,
    criticalIrrigation: life.currentStage?.criticalIrrigation,
    irrigationNeed: life.currentStage?.irrigationNeed,
    expectedHarvestDate: life.expectedHarvestDate,
  }
}

export function useFarm() {
  const [store, setStore] = useState(readStore)

  useEffect(() => {
    writeStore(store)
  }, [store])

  const farm =
    store.farms.find((f) => f.id === store.activeFarmId) ||
    store.farms[0] ||
    DEFAULT_FARM

  // Update active farm top-level attributes
  const set = useCallback((patch) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) =>
        f.id === prev.activeFarmId ? { ...f, ...patch } : f
      )
      return { ...prev, farms: updated }
    })
  }, [])

  // Multi-farm actions
  const addFarm = useCallback((name = 'New Farm Plot', areaHa = '1.0') => {
    const newId = `f_${Date.now()}`
    const newFarm = {
      ...DEFAULT_FARM,
      id: newId,
      name,
      areaHa,
      crops: [],
      fields: [],
      tasks: [],
      activities: [],
      finances: [],
      timeline: [],
      livestock: [],
      observations: [],
    }
    setStore((prev) => ({
      farms: [...prev.farms, newFarm],
      activeFarmId: newId,
    }))
    return newFarm
  }, [])

  const switchFarm = useCallback((id) => {
    setStore((prev) => ({ ...prev, activeFarmId: id }))
  }, [])

  const deleteFarm = useCallback((id) => {
    setStore((prev) => {
      if (prev.farms.length <= 1) return prev
      const remaining = prev.farms.filter((f) => f.id !== id)
      const nextActiveId = prev.activeFarmId === id ? remaining[0].id : prev.activeFarmId
      return { farms: remaining, activeFarmId: nextActiveId }
    })
  }, [])

  // Fields management
  const addField = useCallback((field) => {
    const newField = {
      id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'New Field',
      areaHa: 1.0,
      soilType: 'Loamy',
      irrigationType: 'Tube well',
      healthStatus: 'healthy',
      boundary: [],
      ...field,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            fields: [newField, ...(f.fields || [])],
            timeline: [
              {
                id: `ev_${Date.now()}`,
                eventType: 'NOTE',
                title: `Field Added: ${newField.name}`,
                description: `Plot registered with ${newField.areaHa} ha.`,
                timestamp: new Date().toISOString(),
                severity: 'info',
              },
              ...(f.timeline || []),
            ],
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
    return newField
  }, [])

  const updateField = useCallback((id, patch) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            fields: (f.fields || []).map((fld) => (fld.id === id ? { ...fld, ...patch } : fld)),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const deleteField = useCallback((id) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            fields: (f.fields || []).filter((fld) => fld.id !== id),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  // Tasks management
  const addTask = useCallback((task) => {
    const newTask = {
      id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: 'New Farm Task',
      type: 'other',
      priority: 'medium',
      status: 'today',
      dueDate: new Date().toISOString().split('T')[0],
      ...task,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return { ...f, tasks: [newTask, ...(f.tasks || [])] }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
    return newTask
  }, [])

  const updateTask = useCallback((id, patch) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            tasks: (f.tasks || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const completeTask = useCallback((id) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          const task = (f.tasks || []).find((t) => t.id === id)
          const newTasks = (f.tasks || []).map((t) =>
            t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t
          )
          const newTimeline = task
            ? [
                {
                  id: `ev_${Date.now()}`,
                  eventType: 'TASK_COMPLETED',
                  title: `Task Completed: ${task.title}`,
                  description: `Completed on ${new Date().toLocaleDateString()}`,
                  timestamp: new Date().toISOString(),
                  severity: 'info',
                },
                ...(f.timeline || []),
              ]
            : f.timeline || []
          return { ...f, tasks: newTasks, timeline: newTimeline }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const deleteTask = useCallback((id) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            tasks: (f.tasks || []).filter((t) => t.id !== id),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  // Activities journal
  const addActivity = useCallback((act) => {
    const newAct = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      activityType: 'irrigation',
      cost: 0,
      ...act,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          const newActs = [newAct, ...(f.activities || [])]
          const newTimeline = [
            {
              id: `ev_${Date.now()}`,
              eventType: 'NOTE',
              title: `Activity: ${newAct.activityType.toUpperCase()}`,
              description: newAct.notes || `Logged ${newAct.activityType} on ${newAct.crop || 'crop'}.`,
              timestamp: new Date().toISOString(),
              severity: 'info',
            },
            ...(f.timeline || []),
          ]
          let newFinances = f.finances || []
          if (newAct.cost && newAct.cost > 0) {
            newFinances = [
              {
                id: `fin_${Date.now()}`,
                type: 'expense',
                category: 'other',
                amount: Number(newAct.cost),
                crop: newAct.crop,
                date: newAct.date,
                notes: `From activity: ${newAct.activityType}`,
              },
              ...newFinances,
            ]
          }
          return { ...f, activities: newActs, timeline: newTimeline, finances: newFinances }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
    return newAct
  }, [])

  // Finance
  const addFinance = useCallback((fin) => {
    const newFin = {
      id: `fin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      category: 'other',
      amount: 0,
      ...fin,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return { ...f, finances: [newFin, ...(f.finances || [])] }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
    return newFin
  }, [])

  // Livestock
  const addLivestock = useCallback((item) => {
    const newItem = {
      id: `ls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: 'Animal Group',
      type: 'cattle',
      count: 1,
      healthStatus: 'healthy',
      ...item,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return { ...f, livestock: [newItem, ...(f.livestock || [])] }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
    return newItem
  }, [])

  const updateLivestock = useCallback((id, patch) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            livestock: (f.livestock || []).map((ls) => (ls.id === id ? { ...ls, ...patch } : ls)),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const deleteLivestock = useCallback((id) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            livestock: (f.livestock || []).filter((ls) => ls.id !== id),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  // Crop management within active farm
  const addCrop = useCallback((crop) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            crops: [
              ...f.crops,
              {
                id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: 'Wheat',
                variety: '',
                sownAt: new Date().toISOString().split('T')[0],
                ...crop,
              },
            ],
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const updateCrop = useCallback((id, patch) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            crops: f.crops.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const removeCrop = useCallback((id) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            crops: f.crops.filter((c) => c.id !== id),
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  // Log scan observations
  const logObservation = useCallback((o) => {
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return {
            ...f,
            observations: [
              { id: `o_${Date.now()}`, at: new Date().toISOString(), ...o },
              ...f.observations,
            ].slice(0, 30),
            timeline: [
              {
                id: `ev_${Date.now()}`,
                eventType: o.type === 'disease' ? 'DISEASE_SCAN' : 'SOIL_SCAN',
                title: o.type === 'disease' ? `Disease Scan: ${o.result || 'Analyzed'}` : `Soil Check: ${o.result || 'Analyzed'}`,
                description: `Scan confidence: ${Math.round((o.confidence || 0.85) * 100)}%`,
                timestamp: new Date().toISOString(),
                severity: o.severity || 'info',
              },
              ...(f.timeline || []),
            ],
          }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const logTimelineEvent = useCallback((event) => {
    const newEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      severity: 'info',
      ...event,
    }
    setStore((prev) => {
      const updated = prev.farms.map((f) => {
        if (f.id === prev.activeFarmId) {
          return { ...f, timeline: [newEvent, ...(f.timeline || [])].slice(0, 60) }
        }
        return f
      })
      return { ...prev, farms: updated }
    })
  }, [])

  const reset = useCallback(() => {
    setStore({
      farms: [DEFAULT_FARM],
      activeFarmId: DEFAULT_FARM.id,
    })
  }, [])

  return {
    farm,
    farms: store.farms,
    activeFarmId: store.activeFarmId,
    fields: farm.fields || [],
    tasks: farm.tasks || [],
    activities: farm.activities || [],
    finances: farm.finances || [],
    timeline: farm.timeline || [],
    livestock: farm.livestock || [],
    crops: farm.crops || [],
    observations: farm.observations || [],
    set,
    addFarm,
    switchFarm,
    deleteFarm,
    addField,
    updateField,
    deleteField,
    addTask,
    updateTask,
    completeTask,
    deleteTask,
    addActivity,
    addFinance,
    addLivestock,
    updateLivestock,
    deleteLivestock,
    addCrop,
    updateCrop,
    removeCrop,
    logObservation,
    logTimelineEvent,
    reset,
    completeness: completeness(farm),
    hasProfile: Boolean(farm.name || farm.crops.length),
  }
}

export default useFarm

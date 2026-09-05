import { z } from 'zod'
import { Field } from '../models/Field.js'
import { FarmTask } from '../models/FarmTask.js'
import { FarmActivity } from '../models/FarmActivity.js'
import { FarmFinance } from '../models/FarmFinance.js'
import { FarmEvent } from '../models/FarmEvent.js'
import { Livestock } from '../models/Livestock.js'
import { Farm } from '../models/Farm.js'
import { notFound } from '../utils/AppError.js'

const getUserId = (req) => String(req.user?._id || req.user?.id || 'anonymous')

/* ------------------------------------------------------------- ZOD SCHEMAS */

export const fieldSchema = z.object({
  farmId: z.string(),
  name: z.string().min(1).max(80),
  areaHa: z.coerce.number().positive().max(10000),
  soilType: z.string().max(50).optional(),
  irrigationType: z.string().max(50).optional(),
  waterAvailability: z.string().max(50).optional(),
  healthStatus: z.enum(['healthy', 'attention', 'elevated_risk', 'critical']).optional(),
  boundary: z.any().optional(),
  assignedCropName: z.string().max(80).optional(),
  assignedCropVariety: z.string().max(80).optional(),
  sownAt: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const taskSchema = z.object({
  farmId: z.string(),
  fieldId: z.string().nullable().optional(),
  title: z.string().min(1).max(120),
  type: z.enum([
    'irrigation',
    'spray',
    'fertilizer',
    'weeding',
    'sowing',
    'harvest',
    'inspection',
    'drainage',
    'tillage',
    'livestock',
    'other',
  ]),
  crop: z.string().max(80).optional(),
  dueDate: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['upcoming', 'today', 'completed', 'skipped', 'overdue']).optional(),
  notes: z.string().max(500).optional(),
  weatherDependency: z
    .object({
      noRainRequired: z.boolean().optional(),
      maxWindKmh: z.number().optional(),
      maxTempC: z.number().optional(),
    })
    .optional(),
})

export const activitySchema = z.object({
  farmId: z.string(),
  fieldId: z.string().nullable().optional(),
  activityType: z.enum([
    'irrigation',
    'fertilizer',
    'spraying',
    'pesticide',
    'weeding',
    'ploughing',
    'sowing',
    'harvest',
    'pest_scout',
    'disease_scout',
    'soil_test',
    'livestock_care',
    'other',
  ]),
  crop: z.string().max(80).optional(),
  date: z.string().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().max(30).nullable().optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  photoUrl: z.string().nullable().optional(),
})

export const financeSchema = z.object({
  farmId: z.string(),
  fieldId: z.string().nullable().optional(),
  type: z.enum(['expense', 'income']),
  category: z.enum([
    'seeds',
    'fertilizer',
    'pesticides',
    'labour',
    'irrigation',
    'equipment_fuel',
    'machinery_rental',
    'transport',
    'harvest_sale',
    'subsidies',
    'livestock_sale',
    'other',
  ]),
  amount: z.number().positive(),
  crop: z.string().max(80).optional(),
  date: z.string().optional(),
  buyerOrVendor: z.string().max(100).optional(),
  quantityKg: z.number().optional(),
  notes: z.string().max(500).optional(),
})

export const livestockSchema = z.object({
  farmId: z.string(),
  name: z.string().min(1).max(80),
  type: z.string().transform((v) => v.toLowerCase()),
  count: z.coerce.number().int().positive(),
  breed: z.string().max(80).optional(),
  healthStatus: z.string().optional().default('healthy'),
  vaccinationNotes: z.string().max(500).optional(),
  productionNotes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
})

/* ----------------------------------------------------------------- FIELDS */

export async function listFields(req, res) {
  const farmId = req.query.farmId
  const filter = {}
  if (farmId) filter.farmId = farmId
  if (req.user?.id) filter.userId = getUserId(req)

  const fields = await Field.find(filter).sort({ createdAt: -1 })
  res.json({ fields })
}

export async function createField(req, res) {
  const field = await Field.create({
    ...req.body,
    userId: getUserId(req),
  })

  // Create timeline event
  await FarmEvent.create({
    farmId: field.farmId,
    fieldId: field._id.toString(),
    userId: getUserId(req),
    eventType: 'NOTE',
    title: `Field Created: ${field.name}`,
    description: `Added field ${field.name} (${field.areaHa} ha, ${field.soilType || 'Soil not specified'}).`,
    severity: 'info',
  }).catch(() => {})

  res.status(201).json({ field })
}

export async function updateField(req, res) {
  const field = await Field.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true },
  )
  if (!field) throw notFound('Field not found')
  res.json({ field })
}

export async function deleteField(req, res) {
  const field = await Field.findByIdAndDelete(req.params.id)
  if (!field) throw notFound('Field not found')
  res.json({ ok: true })
}

/* ------------------------------------------------------------------ TASKS */

export async function listTasks(req, res) {
  const { farmId, status } = req.query
  const filter = {}
  if (farmId) filter.farmId = farmId
  if (status) filter.status = status
  if (req.user?.id) filter.userId = getUserId(req)

  const tasks = await FarmTask.find(filter).sort({ dueDate: 1 })
  res.json({ tasks })
}

export async function createTask(req, res) {
  const task = await FarmTask.create({
    ...req.body,
    userId: getUserId(req),
    dueDate: new Date(req.body.dueDate),
  })

  res.status(201).json({ task })
}

export async function updateTask(req, res) {
  const patch = { ...req.body }
  if (patch.dueDate) patch.dueDate = new Date(patch.dueDate)

  const task = await FarmTask.findByIdAndUpdate(
    req.params.id,
    { $set: patch },
    { new: true },
  )
  if (!task) throw notFound('Task not found')
  res.json({ task })
}

export async function completeTask(req, res) {
  const task = await FarmTask.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'completed', completedAt: new Date() } },
    { new: true },
  )
  if (!task) throw notFound('Task not found')

  // Log to timeline
  await FarmEvent.create({
    farmId: task.farmId,
    fieldId: task.fieldId ? String(task.fieldId) : null,
    userId: getUserId(req),
    eventType: 'TASK_COMPLETED',
    title: `Task Completed: ${task.title}`,
    description: `Marked "${task.title}" as completed.`,
    severity: 'info',
  }).catch(() => {})

  res.json({ task })
}

export async function deleteTask(req, res) {
  const task = await FarmTask.findByIdAndDelete(req.params.id)
  if (!task) throw notFound('Task not found')
  res.json({ ok: true })
}

/* ------------------------------------------------------------- ACTIVITIES */

export async function listActivities(req, res) {
  const { farmId } = req.query
  const filter = {}
  if (farmId) filter.farmId = farmId
  if (req.user?.id) filter.userId = getUserId(req)

  const activities = await FarmActivity.find(filter).sort({ date: -1 }).limit(100)
  res.json({ activities })
}

export async function createActivity(req, res) {
  const activity = await FarmActivity.create({
    ...req.body,
    userId: getUserId(req),
    date: req.body.date ? new Date(req.body.date) : new Date(),
  })

  // Create corresponding timeline event
  const eventMap = {
    irrigation: 'IRRIGATION',
    spraying: 'SPRAY',
    pesticide: 'SPRAY',
    harvest: 'HARVEST',
  }
  const eventType = eventMap[activity.activityType] || 'NOTE'

  await FarmEvent.create({
    farmId: activity.farmId,
    fieldId: activity.fieldId ? String(activity.fieldId) : null,
    userId: getUserId(req),
    eventType,
    title: `Activity Logged: ${activity.activityType.toUpperCase()}`,
    description: activity.notes || `Recorded ${activity.activityType} on ${activity.crop || 'crop'}.`,
    severity: 'info',
    metadata: {
      quantity: activity.quantity,
      unit: activity.unit,
      cost: activity.cost,
    },
  }).catch(() => {})

  // If activity has cost, automatically create expense record
  if (activity.cost && activity.cost > 0) {
    const catMap = {
      fertilizer: 'fertilizer',
      spraying: 'pesticides',
      pesticide: 'pesticides',
      irrigation: 'irrigation',
      sowing: 'seeds',
      ploughing: 'machinery_rental',
    }
    await FarmFinance.create({
      farmId: activity.farmId,
      fieldId: activity.fieldId ? String(activity.fieldId) : null,
      userId: getUserId(req),
      type: 'expense',
      category: catMap[activity.activityType] || 'other',
      amount: activity.cost,
      crop: activity.crop,
      date: activity.date,
      notes: `Generated from activity: ${activity.activityType}`,
    }).catch(() => {})
  }

  res.status(201).json({ activity })
}

/* ---------------------------------------------------------------- FINANCE */

export async function listFinance(req, res) {
  const { farmId } = req.query
  const filter = {}
  if (farmId) filter.farmId = farmId
  if (req.user?.id) filter.userId = getUserId(req)

  const items = await FarmFinance.find(filter).sort({ date: -1 }).limit(150)

  // Aggregate stats
  let totalExpenses = 0
  let totalIncome = 0
  const byCategory = {}
  const byCrop = {}

  for (const it of items) {
    if (it.type === 'expense') {
      totalExpenses += it.amount
      byCategory[it.category] = (byCategory[it.category] || 0) + it.amount
      if (it.crop) {
        byCrop[it.crop] = (byCrop[it.crop] || 0) + it.amount
      }
    } else if (it.type === 'income') {
      totalIncome += it.amount
    }
  }

  res.json({
    items,
    summary: {
      totalExpenses,
      totalIncome,
      netResult: totalIncome - totalExpenses,
      byCategory,
      byCrop,
      disclaimer: 'Based strictly on recorded farm entries',
    },
  })
}

export async function createFinance(req, res) {
  const item = await FarmFinance.create({
    ...req.body,
    userId: getUserId(req),
    date: req.body.date ? new Date(req.body.date) : new Date(),
  })
  res.status(201).json({ item })
}

/* --------------------------------------------------------------- TIMELINE */

export async function listTimeline(req, res) {
  const { farmId } = req.query
  const filter = {}
  if (farmId) filter.farmId = farmId

  const events = await FarmEvent.find(filter).sort({ timestamp: -1 }).limit(60)
  res.json({ events })
}

/* -------------------------------------------------------------- LIVESTOCK */

export async function listLivestock(req, res) {
  const { farmId } = req.query
  const filter = {}
  if (farmId) filter.farmId = farmId
  if (req.user?.id) filter.userId = getUserId(req)

  const animals = await Livestock.find(filter).sort({ createdAt: -1 })
  res.json({ animals })
}

export async function createLivestock(req, res) {
  const animal = await Livestock.create({
    ...req.body,
    userId: getUserId(req),
  })
  res.status(201).json({ animal })
}

export async function updateLivestock(req, res) {
  const animal = await Livestock.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true },
  )
  if (!animal) throw notFound('Livestock record not found')
  res.json({ animal })
}

export async function deleteLivestock(req, res) {
  const animal = await Livestock.findByIdAndDelete(req.params.id)
  if (!animal) throw notFound('Livestock record not found')
  res.json({ ok: true })
}

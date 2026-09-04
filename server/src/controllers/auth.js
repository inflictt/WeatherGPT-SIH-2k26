import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { sign } from '../middleware/auth.js'
import { badRequest, unauthorized } from '../utils/AppError.js'

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  persona: z.enum(['general', 'farmer', 'traveller', 'official']).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const preferencesSchema = z.object({
  name: z.string().trim().max(80).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  persona: z.enum(['general', 'farmer', 'traveller', 'official']).optional(),
  notify: z
    .object({ severeOnly: z.boolean().optional(), voiceReplies: z.boolean().optional() })
    .optional(),
})

export async function register(req, res) {
  const { email, password, name, language, persona } = req.body
  if (await User.exists({ email: email.toLowerCase() })) {
    throw badRequest('An account with that email already exists')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ email, passwordHash, name, language, persona })
  res.status(201).json({ token: sign(user._id), user: user.toPublic() })
}

export async function login(req, res) {
  const { email, password } = req.body
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  // Compare regardless, so a missing account and a wrong password take the
  // same time and cannot be told apart.
  const ok = await bcrypt.compare(password, user?.passwordHash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
  if (!user || !ok) throw unauthorized('Incorrect email or password')
  res.json({ token: sign(user._id), user: user.toPublic() })
}

export async function me(req, res) {
  res.json({ user: req.user.toPublic() })
}

export async function updatePreferences(req, res) {
  Object.assign(req.user, req.body)
  if (req.body.notify) req.user.notify = { ...req.user.notify.toObject?.() ?? req.user.notify, ...req.body.notify }
  await req.user.save()
  res.json({ user: req.user.toPublic() })
}

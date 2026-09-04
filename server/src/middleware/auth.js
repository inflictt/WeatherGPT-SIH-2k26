import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { unauthorized } from '../utils/AppError.js'
import { User } from '../models/User.js'

export function sign(userId) {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiry })
}

function readToken(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

/** Hard gate. */
export async function requireAuth(req, _res, next) {
  try {
    const token = readToken(req)
    if (!token) throw unauthorized()
    const { sub } = jwt.verify(token, env.jwtSecret)
    const user = await User.findById(sub)
    if (!user) throw unauthorized()
    req.user = user
    next()
  } catch (err) {
    next(err.status ? err : unauthorized('Invalid or expired token'))
  }
}

/** Soft gate — personalises when signed in, still works when not. */
export async function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (!token) return next()
  try {
    const { sub } = jwt.verify(token, env.jwtSecret)
    req.user = await User.findById(sub)
  } catch {
    /* an invalid token is treated as anonymous, not as an error */
  }
  next()
}

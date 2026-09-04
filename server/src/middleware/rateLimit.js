import rateLimit from 'express-rate-limit'

/** Protects us and, more importantly, the free upstream APIs we depend on. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
})

/**
 * The conversational route fans out to three upstreams and may call a language
 * model, so it gets its own budget. Sharing one with cheap reads would let a
 * burst of chat traffic lock a user out of `/warnings/active` — which is the
 * one endpoint that must never be unavailable.
 */
export const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many questions in a row. Give it a moment.' },
})

import { badRequest } from '../utils/AppError.js'

/** Validate req[source] against a zod schema and replace it with the parsed value. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    return next(
      badRequest('Invalid request', result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))),
    )
  }
  req[source === 'query' ? 'validQuery' : source] = result.data
  next()
}

export class AppError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
    this.expected = true
  }
}
export const badRequest = (m, d) => new AppError(400, m, d)
export const unauthorized = (m = 'Not authenticated') => new AppError(401, m)
export const notFound = (m = 'Not found') => new AppError(404, m)
export const upstream = (m, d) => new AppError(502, m, d)

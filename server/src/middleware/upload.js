import multer from 'multer'
import { AppError } from '../utils/AppError.js'

/**
 * Image upload — PRD §45.
 *
 * In memory, never to disk. A crop photo is a farmer's field and there is no
 * reason for it to outlive the request that classified it: nothing here
 * writes a file, so nothing has to remember to delete one.
 *
 * The size and MIME limits are enforced twice — here, cheaply, before the
 * body is read, and again in the controller against the *actual* buffer.
 * Multer trusts the client's Content-Type header, which a client can lie
 * about; the controller does not have to.
 */
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    // Enough for farmId, lat, lon, crop — and not enough to smuggle a payload
    // through a text field.
    fields: 12,
    fieldSize: 4096,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new AppError(400, `That file is ${file.mimetype}. Send a JPEG, PNG or WebP photo.`))
      return
    }
    cb(null, true)
  },
})

/** One image, on the field named `image`, with multer's errors made readable. */
export function singleImage(field = 'image') {
  const run = uploader.single(field)
  return (req, res, next) =>
    run(req, res, (err) => {
      if (!err) return next()
      if (err instanceof AppError) return next(err)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, `That photo is over ${MAX_IMAGE_BYTES / 1048576} MB. Most phones can send a smaller copy.`))
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError(400, `Send the photo as multipart field "${field}".`))
      }
      return next(new AppError(400, `Upload failed: ${err.message}`))
    })
}

export default { singleImage, MAX_IMAGE_BYTES }

import mongoose from 'mongoose'

/**
 * Farm Finance entity (Expenses and Income tracking).
 */
const farmFinanceSchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    fieldId: { type: String, default: null },
    userId: { type: String, default: 'anonymous', index: true },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    category: {
      type: String,
      enum: [
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
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    crop: { type: String, trim: true, maxlength: 80, default: null },
    date: { type: Date, default: Date.now },
    buyerOrVendor: { type: String, trim: true, maxlength: 100, default: null },
    quantityKg: { type: Number, default: null },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
  },
)

farmFinanceSchema.index({ farmId: 1, type: 1, date: -1 })

export const FarmFinance = mongoose.models.FarmFinance || mongoose.model('FarmFinance', farmFinanceSchema)
export default FarmFinance

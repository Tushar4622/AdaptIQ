const mongoose = require('mongoose');

const qrTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    tokenId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['student', 'teacher'], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'qr_tokens' }
);

qrTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
qrTokenSchema.index({ user: 1, expiresAt: -1 });

module.exports = mongoose.model('QRToken', qrTokenSchema);
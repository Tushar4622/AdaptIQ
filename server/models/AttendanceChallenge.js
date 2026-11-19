const mongoose = require('mongoose');

const attendanceChallengeSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    tokenId: { type: String, required: true, unique: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    issuedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['blink', 'turn-left', 'turn-right'], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'attendance_challenges' }
);

attendanceChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
attendanceChallengeSchema.index({ session: 1, issuedTo: 1, expiresAt: -1 });

module.exports = mongoose.model('AttendanceChallenge', attendanceChallengeSchema);
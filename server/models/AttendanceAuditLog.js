const mongoose = require('mongoose');

const attendanceAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      enum: [
        'session_opened',
        'session_closed',
        'record_marked',
        'record_edited',
        'face_enrollment_consented',
        'face_enrollment_removed',
      ],
      required: true,
    },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'audit_log' }
);

attendanceAuditLogSchema.index({ actor: 1, createdAt: -1 });
attendanceAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AttendanceAuditLog', attendanceAuditLogSchema);
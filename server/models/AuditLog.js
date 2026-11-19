const mongoose = require('mongoose');

/**
 * AuditLog — Phase 5 Governance
 * Records every significant faculty/admin action for accountability and compliance.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
      type: String,
      required: true,
      enum: [
        'question_approved',
        'question_rejected',
        'question_flagged',
        'quiz_published',
        'user_toggled',
        'user_role_changed',
        'competency_created',
        'competency_updated',
        'competency_deleted',
      ],
    },
    targetType: { type: String, required: true }, // e.g. 'Quiz', 'User', 'Competency'
    targetId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra context (notes, old/new values)
  },
  { timestamps: true }
);

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;

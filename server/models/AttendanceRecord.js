const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subjectRole: { type: String, enum: ['student', 'teacher'], required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    status: { type: String, enum: ['present', 'late', 'absent'], required: true },
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    method: { type: String, enum: ['qr_face', 'manual_override'], required: true },
    faceConfidence: { type: Number, min: 0, max: 1, default: null },
    overrideReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true, collection: 'attendance_records' }
);

attendanceRecordSchema.index({ session: 1, subject: 1 }, { unique: true });
attendanceRecordSchema.index({ course: 1, subjectRole: 1, markedAt: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
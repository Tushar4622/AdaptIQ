const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    targetRole: { type: String, enum: ['student', 'teacher'], required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    startedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'attendance_sessions' }
);

attendanceSessionSchema.index({ targetRole: 1, course: 1, startedAt: -1 });
attendanceSessionSchema.index({ teacher: 1, status: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
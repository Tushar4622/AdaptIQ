const mongoose = require('mongoose');

// ── Learner Mastery Schema ────────────────────────────────────────────────────
// Tracks continuous concept-level mastery evidence across multiple assessments
const learnerMasterySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    concept: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Concept',
      required: true,
      index: true,
    },
    competency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    // Dynamic mastery estimate (0 to 100)
    masteryScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Statistical confidence in the mastery estimate (0.0 to 1.0)
    confidence: {
      type: Number,
      min: 0,
      max: 1.0,
      default: 0.1,
    },
    status: {
      type: String,
      enum: ['unmet', 'in-progress', 'mastered'],
      default: 'unmet',
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    correctAttempts: {
      type: Number,
      default: 0,
    },
    // Average response time in seconds across assessed items
    avgResponseLatency: {
      type: Number,
      default: 0,
    },
    lastAssessedAt: {
      type: Date,
      default: Date.now,
    },
    // History audit trail of formative evaluation signals
    history: [
      {
        attemptId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'QuizAttempt',
        },
        quizId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Quiz',
        },
        questionIndex: Number,
        isCorrect: Boolean,
        responseTime: Number,
        cognitiveLevel: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

learnerMasterySchema.index({ student: 1, concept: 1 }, { unique: true });
learnerMasterySchema.index({ student: 1, course: 1, status: 1 });

// Helper to derive mastery status from score
learnerMasterySchema.statics.deriveStatus = function (score) {
  if (score >= 80) return 'mastered';
  if (score >= 50) return 'in-progress';
  return 'unmet';
};

const LearnerMastery = mongoose.model('LearnerMastery', learnerMasterySchema);

module.exports = LearnerMastery;

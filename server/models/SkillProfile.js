const mongoose = require('mongoose');

const topicMasterySchema = new mongoose.Schema({
  topicName: { type: String, required: true },
  skillArea: { type: String, required: true },
  masteryScore: { type: Number, min: 0, max: 100, default: 0 }, // 0 to 100
  status: {
    type: String,
    enum: ['Weak', 'Average', 'Strong'],
    default: 'Weak',
  },
  attemptsCount: { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },
  totalQuestionsAttempted: { type: Number, default: 0 },
  lastScore: { type: Number, default: 0 },
  lastAssessedAt: { type: Date, default: Date.now },
  history: [
    {
      quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
      score: Number,
      weight: { type: Number, default: 1.0 },
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const skillProfileSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    topicMasteries: [topicMasterySchema],
    hotScore: { type: Number, default: 0 }, // Higher-Order Thinking % (Analyze, Evaluate, Create)
    lotScore: { type: Number, default: 0 }, // Lower-Order Thinking % (Remember, Understand, Apply)
    hotVerdict: {
      type: String,
      default: 'Needs Assessment',
      // e.g. "Strong memorization (LOT: 88%) but struggles with multi-step reasoning (HOT: 42%). Needs scenario and debugging practice."
    },
    questionTypeAccuracy: {
      mcq: { type: Number, default: 0 },
      scenario: { type: Number, default: 0 },
      case_study: { type: Number, default: 0 },
      short_answer: { type: Number, default: 0 },
    },
    mistakePatterns: [
      {
        pattern: String, // e.g. "Confuses symmetric encryption with asymmetric digital signatures"
        detectedAt: { type: Date, default: Date.now },
        frequency: { type: Number, default: 1 },
      },
    ],
    overallAccuracy: { type: Number, default: 0 },
    quizzesCompletedCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

skillProfileSchema.index({ student: 1, course: 1 }, { unique: true });

// Helper to derive status based on mastery score
skillProfileSchema.statics.deriveTopicStatus = function (score) {
  if (score >= 75) return 'Strong';
  if (score >= 50) return 'Average';
  return 'Weak';
};

const SkillProfile = mongoose.model('SkillProfile', skillProfileSchema);

module.exports = SkillProfile;

const mongoose = require('mongoose');

const resourceLinkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: {
    type: String,
    enum: ['video', 'article', 'documentation', 'practice', 'course'],
    default: 'article',
  },
  source: {
    type: String,
    enum: ['Teacher Notes', 'NPTEL', 'SWAYAM', 'iGOT Karmayogi', 'Official Docs', 'YouTube Education'],
    default: 'Official Docs',
  },
  verified: { type: Boolean, default: true },
});

const adaptedTopicSchema = new mongoose.Schema({
  topicName: { type: String, required: true },
  skillArea: { type: String, required: true },
  originalUnitNumber: { type: Number, default: 1 },
  originalTopicOrder: { type: Number, default: 1 },
  priorityRank: { type: Number, required: true }, // 1 = highest priority (weakest)
  status: {
    type: String,
    enum: ['Weak', 'Average', 'Strong'],
    required: true,
  },
  adaptationType: {
    type: String,
    enum: [
      'expanded_remediation', // Weak: expanded with prerequisites & revision
      'standard',             // Average: normal path with practice
      'compressed_advanced',  // Strong: compressed, only advanced & challenges
    ],
    required: true,
  },
  addedPrerequisites: [{ type: String }], // Detected missing foundational topics inserted before this topic
  reason: { type: String, required: true }, // e.g., "Added because you scored 35% on Network Security"
  aiExplanationSummary: { type: String, default: '' }, // Simple conceptual explanation
  studySchedule: {
    dailyMinutes: { type: Number, default: 30 },
    durationWeeks: { type: Number, default: 2 },
    recommendedDaysPerWeek: { type: Number, default: 5 },
  },
  curatedResources: [resourceLinkSchema],
  practiceItems: [
    {
      questionStem: String,
      difficulty: String,
      thinkingLevel: String,
    },
  ],
  advancedChallenges: [String], // For strong topics
  isCompleted: { type: Boolean, default: false },
});

const personalizedPlanSchema = new mongoose.Schema(
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
    masterSyllabus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterSyllabus',
      required: true,
    },
    masterVersion: { type: Number, default: 1 },
    planTitle: { type: String, default: 'Personalized Adaptive Syllabus' },
    summaryNarrative: { type: String, default: '' },
    adaptedTopics: [adaptedTopicSchema],
    teacherApproved: { type: Boolean, default: true }, // Guardrail: teacher can inspect
    teacherOverrides: { type: String, default: null },
    lastEvaluatedQuiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

personalizedPlanSchema.index({ student: 1, course: 1 }, { unique: true });

const PersonalizedPlan = mongoose.model('PersonalizedPlan', personalizedPlanSchema);

module.exports = PersonalizedPlan;

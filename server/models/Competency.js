const mongoose = require('mongoose');

// ── Concept Schema ────────────────────────────────────────────────────────────
// Atomic unit of learning within a competency (e.g., "Big-O Notation", "F1 Score")
const conceptSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Concept name is required'],
      trim: true,
      maxlength: [100, 'Concept name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Concept code is required'],
      trim: true,
      uppercase: true,
      maxlength: [30, 'Concept code cannot exceed 30 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    competency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Competency',
      required: [true, 'Competency reference is required'],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    moduleIndex: {
      type: Number,
      default: 0,
    },
    lessonIndex: {
      type: Number,
      default: 0,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    difficultyWeight: {
      type: Number,
      min: 0.1,
      max: 3.0,
      default: 1.0,
    },
    // Directed Acyclic Graph (DAG) prerequisite dependencies
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Concept',
      },
    ],
    tags: [String],
  },
  { timestamps: true }
);

conceptSchema.index({ competency: 1, name: 1 }, { unique: true });
conceptSchema.index({ code: 1 }, { unique: true });

const Concept = mongoose.model('Concept', conceptSchema);

// ── Competency Schema ─────────────────────────────────────────────────────────
// Higher-level academic competency (e.g., "Supervised Model Evaluation & Validation")
const competencySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Competency title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    code: {
      type: String,
      required: [true, 'Competency code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [30, 'Competency code cannot exceed 30 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    domain: {
      type: String,
      required: true,
      enum: [
        'Computer Science',
        'Data Science & AI',
        'Software Engineering',
        'Mathematics',
        'Business & Management',
        'General Engineering',
        'Other',
      ],
      default: 'Computer Science',
    },
    targetAudience: {
      type: String,
      enum: ['Undergraduate', 'Postgraduate', 'Professional Certification', 'Foundational'],
      default: 'Undergraduate',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    learningOutcomes: [
      {
        type: String,
        trim: true,
      },
    ],
    // High-level competency prerequisite chain
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Competency',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

competencySchema.virtual('concepts', {
  ref: 'Concept',
  localField: '_id',
  foreignField: 'competency',
});

const Competency = mongoose.model('Competency', competencySchema);

module.exports = {
  Competency,
  Concept,
};

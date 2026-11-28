const mongoose = require('mongoose');

// Topic Sub-Schema
const topicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  code: { type: String, trim: true, uppercase: true, maxlength: 40 },
  skillArea: {
    type: String,
    required: true,
    enum: [
      'Cybersecurity',
      'Full Stack',
      'Databases',
      'Cloud & DevOps',
      'Data Science & AI',
      'Computer Networks',
      'Software Engineering',
      'General Computing',
    ],
    default: 'General Computing',
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Moderate', 'Tough'],
    default: 'Moderate',
  },
  description: { type: String, default: '', maxlength: 4000 },
  prerequisites: {
    type: [{ type: String, trim: true, maxlength: 160 }],
    validate: [(items) => items.length <= 100, 'A topic cannot have more than 100 prerequisites.'],
  },
  subtopics: {
    type: [{ type: String, trim: true, maxlength: 160 }],
    validate: [(items) => items.length <= 100, 'A topic cannot have more than 100 subtopics.'],
  },
  estimatedHours: { type: Number, default: 4, min: 0, max: 500 },
});

// Unit Sub-Schema
const unitSchema = new mongoose.Schema({
  unitNumber: { type: Number, required: true, min: 1, max: 100 },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 4000 },
  topics: {
    type: [topicSchema],
    validate: [(items) => items.length <= 100, 'A unit cannot contain more than 100 topics.'],
  },
});

// Master Syllabus Schema
// Crucial rule: The Master Syllabus is owned by the teacher and is NEVER mutated by AI.
const masterSyllabusSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    version: { type: Number, default: 1, min: 1 },
    isMaster: { type: Boolean, default: true },
    units: {
      type: [unitSchema],
      validate: [(items) => items.length <= 100, 'A syllabus cannot contain more than 100 units.'],
    },
    rawSourceText: { type: String, default: '', maxlength: 100_000 },
    parsedByAI: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    versionHistory: [
      {
        versionNumber: { type: Number, min: 1 },
        updatedAt: { type: Date, default: Date.now },
        changeLog: { type: String, maxlength: 2000 },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

masterSyllabusSchema.path('versionHistory').validate(
  (history) => Array.isArray(history) && history.length <= 50,
  'A syllabus cannot retain more than 50 versions.'
);
masterSyllabusSchema.index({ course: 1, isMaster: 1 });

const MasterSyllabus = mongoose.model('MasterSyllabus', masterSyllabusSchema);

module.exports = {
  MasterSyllabus,
  topicSchema,
  unitSchema,
};

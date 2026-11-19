const mongoose = require('mongoose');

// Topic Sub-Schema
const topicSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, uppercase: true },
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
  description: { type: String, default: '' },
  prerequisites: [{ type: String, trim: true }], // Prerequisite topic names or codes
  subtopics: [{ type: String, trim: true }],
  estimatedHours: { type: Number, default: 4 },
});

// Unit Sub-Schema
const unitSchema = new mongoose.Schema({
  unitNumber: { type: Number, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  topics: [topicSchema],
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
    title: { type: String, required: true, trim: true },
    version: { type: Number, default: 1 },
    isMaster: { type: Boolean, default: true },
    units: [unitSchema],
    rawSourceText: { type: String, default: '' },
    parsedByAI: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    versionHistory: [
      {
        versionNumber: Number,
        updatedAt: { type: Date, default: Date.now },
        changeLog: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

masterSyllabusSchema.index({ course: 1, isMaster: 1 });

const MasterSyllabus = mongoose.model('MasterSyllabus', masterSyllabusSchema);

module.exports = {
  MasterSyllabus,
  topicSchema,
  unitSchema,
};

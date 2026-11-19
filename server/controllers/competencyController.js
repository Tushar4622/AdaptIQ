const mongoose = require('mongoose');
const { Competency, Concept } = require('../models/Competency');
const LearnerMastery = require('../models/LearnerMastery');
const Course = require('../models/Course');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

// Helper: Ensure teacher owns the course linked to the competency
const ensureTeacherAuthorized = async (courseId, user) => {
  if (user.role === 'admin') return true;
  if (!courseId) return true; // generic university competency
  const course = await Course.findById(courseId).select('instructor');
  if (!course) return false;
  return String(course.instructor) === String(user._id);
};

// GET /api/competencies
exports.getCompetencies = async (req, res, next) => {
  try {
    const { courseId, domain, audience } = req.query;
    const filter = { isActive: true };

    if (courseId && isValidObjectId(courseId)) {
      filter.course = courseId;
    }
    if (domain) {
      filter.domain = domain;
    }
    if (audience) {
      filter.targetAudience = audience;
    }

    const competencies = await Competency.find(filter)
      .populate('concepts')
      .populate('prerequisites', 'title code domain')
      .populate('course', 'title category')
      .populate('createdBy', 'name email')
      .sort('domain title');

    res.json({ count: competencies.length, competencies });
  } catch (err) {
    next(err);
  }
};

// GET /api/competencies/:id
exports.getCompetencyById = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid competency ID' });
    }

    const competency = await Competency.findById(req.params.id)
      .populate({
        path: 'concepts',
        populate: {
          path: 'prerequisites',
          select: 'name code difficulty',
        },
      })
      .populate('prerequisites', 'title code domain')
      .populate('course', 'title category difficulty modules')
      .populate('createdBy', 'name email');

    if (!competency) {
      return res.status(404).json({ error: 'Competency not found' });
    }

    res.json({ competency });
  } catch (err) {
    next(err);
  }
};

// POST /api/competencies
exports.createCompetency = async (req, res, next) => {
  try {
    const {
      title,
      code,
      description,
      domain,
      targetAudience,
      course: courseId,
      learningOutcomes,
      prerequisites,
    } = req.body;

    if (!title || !code) {
      return res.status(400).json({ error: 'Title and code are required' });
    }

    if (courseId && isValidObjectId(courseId)) {
      const authorized = await ensureTeacherAuthorized(courseId, req.user);
      if (!authorized) {
        return res.status(403).json({ error: 'Not authorized to attach competencies to this course' });
      }
    }

    const existing = await Competency.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: `Competency code ${code.toUpperCase()} is already in use` });
    }

    const competency = await Competency.create({
      title: title.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
      domain: domain || 'Computer Science',
      targetAudience: targetAudience || 'Undergraduate',
      course: courseId && isValidObjectId(courseId) ? courseId : undefined,
      learningOutcomes: Array.isArray(learningOutcomes) ? learningOutcomes : [],
      prerequisites: Array.isArray(prerequisites) ? prerequisites.filter(isValidObjectId) : [],
      createdBy: req.user._id,
    });

    // If attached to a course, add to course.competencies
    if (courseId && isValidObjectId(courseId)) {
      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { competencies: competency._id },
      });
    }

    res.status(201).json({ competency });
  } catch (err) {
    next(err);
  }
};

// PUT /api/competencies/:id
exports.updateCompetency = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid competency ID' });
    }

    const competency = await Competency.findById(req.params.id);
    if (!competency) {
      return res.status(404).json({ error: 'Competency not found' });
    }

    if (req.user.role !== 'admin' && String(competency.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to update this competency' });
    }

    const allowedUpdates = [
      'title',
      'description',
      'domain',
      'targetAudience',
      'learningOutcomes',
      'prerequisites',
      'isActive',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        competency[field] = req.body[field];
      }
    });

    await competency.save();
    const updated = await Competency.findById(competency._id)
      .populate('concepts')
      .populate('prerequisites');

    res.json({ competency: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/competencies/:id
exports.deleteCompetency = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid competency ID' });
    }

    const competency = await Competency.findById(req.params.id);
    if (!competency) {
      return res.status(404).json({ error: 'Competency not found' });
    }

    if (req.user.role !== 'admin' && String(competency.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to delete this competency' });
    }

    // Soft delete or remove references
    await Competency.findByIdAndDelete(req.params.id);
    await Concept.deleteMany({ competency: req.params.id });
    await Course.updateMany(
      { competencies: req.params.id },
      { $pull: { competencies: req.params.id } }
    );

    res.json({ message: 'Competency and its associated concepts deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// POST /api/competencies/concept
exports.createConcept = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      competency: competencyId,
      course: courseId,
      moduleIndex,
      lessonIndex,
      difficulty,
      difficultyWeight,
      prerequisites,
      tags,
    } = req.body;

    if (!name || !code || !competencyId) {
      return res.status(400).json({ error: 'Concept name, code, and competency ID are required' });
    }

    if (!isValidObjectId(competencyId)) {
      return res.status(400).json({ error: 'Invalid competency ID' });
    }

    const competency = await Competency.findById(competencyId);
    if (!competency) {
      return res.status(404).json({ error: 'Competency not found' });
    }

    const existing = await Concept.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: `Concept code ${code.toUpperCase()} is already in use` });
    }

    const concept = await Concept.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
      competency: competencyId,
      course: courseId && isValidObjectId(courseId) ? courseId : competency.course,
      moduleIndex: Number(moduleIndex) || 0,
      lessonIndex: Number(lessonIndex) || 0,
      difficulty: difficulty || 'beginner',
      difficultyWeight: Number(difficultyWeight) || 1.0,
      prerequisites: Array.isArray(prerequisites) ? prerequisites.filter(isValidObjectId) : [],
      tags: Array.isArray(tags) ? tags : [],
    });

    // Tag the lesson in Course if moduleIndex and lessonIndex provided
    if (courseId && isValidObjectId(courseId)) {
      const course = await Course.findById(courseId);
      if (
        course &&
        course.modules[moduleIndex] &&
        course.modules[moduleIndex].lessons[lessonIndex]
      ) {
        course.modules[moduleIndex].lessons[lessonIndex].concepts =
          course.modules[moduleIndex].lessons[lessonIndex].concepts || [];
        if (!course.modules[moduleIndex].lessons[lessonIndex].concepts.includes(concept._id)) {
          course.modules[moduleIndex].lessons[lessonIndex].concepts.push(concept._id);
          await course.save();
        }
      }
    }

    res.status(201).json({ concept });
  } catch (err) {
    next(err);
  }
};

// GET /api/competencies/graph/:courseId
// Returns nodes and edges representing the prerequisite DAG
exports.getCompetencyGraph = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    let competencies;

    if (courseId && isValidObjectId(courseId)) {
      competencies = await Competency.find({ course: courseId }).populate('concepts');
    } else {
      competencies = await Competency.find({ isActive: true }).limit(20).populate('concepts');
    }

    const nodes = [];
    const edges = [];
    const conceptIds = new Set();

    competencies.forEach((comp) => {
      nodes.push({
        id: String(comp._id),
        code: comp.code,
        label: comp.title,
        type: 'competency',
        domain: comp.domain,
      });

      if (comp.prerequisites && comp.prerequisites.length > 0) {
        comp.prerequisites.forEach((prereqId) => {
          edges.push({
            id: `comp-${prereqId}-${comp._id}`,
            source: String(prereqId),
            target: String(comp._id),
            label: 'requires',
            type: 'competency-prereq',
          });
        });
      }

      if (comp.concepts && comp.concepts.length > 0) {
        comp.concepts.forEach((concept) => {
          conceptIds.add(String(concept._id));
          nodes.push({
            id: String(concept._id),
            code: concept.code,
            label: concept.name,
            type: 'concept',
            difficulty: concept.difficulty,
            competencyId: String(comp._id),
            moduleIndex: concept.moduleIndex,
            lessonIndex: concept.lessonIndex,
          });

          // Edge from Competency to Concept
          edges.push({
            id: `has-${comp._id}-${concept._id}`,
            source: String(comp._id),
            target: String(concept._id),
            label: 'includes',
            type: 'contains',
          });
        });
      }
    });

    // Fetch prerequisite links between concepts
    const concepts = await Concept.find({ _id: { $in: Array.from(conceptIds) } });
    concepts.forEach((concept) => {
      if (concept.prerequisites && concept.prerequisites.length > 0) {
        concept.prerequisites.forEach((prereqId) => {
          edges.push({
            id: `concept-${prereqId}-${concept._id}`,
            source: String(prereqId),
            target: String(concept._id),
            label: 'prerequisite',
            type: 'concept-prereq',
          });
        });
      }
    });

    res.json({
      courseId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      graph: { nodes, edges },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/competencies/learner/mastery
// Returns concept-level mastery probabilities, detected gaps, and remedial recommendations
exports.getLearnerMastery = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { courseId } = req.query;

    const filter = { student: studentId };
    if (courseId && isValidObjectId(courseId)) {
      filter.course = courseId;
    }

    const records = await LearnerMastery.find(filter)
      .populate({
        path: 'concept',
        select: 'name code difficulty moduleIndex lessonIndex prerequisites course',
        populate: { path: 'competency', select: 'title code domain' },
      })
      .sort('-lastAssessedAt');

    const mastered = [];
    const inProgress = [];
    const gaps = [];

    records.forEach((record) => {
      const item = {
        _id: record._id,
        conceptId: record.concept?._id,
        conceptName: record.concept?.name,
        conceptCode: record.concept?.code,
        competencyTitle: record.concept?.competency?.title,
        masteryScore: record.masteryScore,
        confidence: record.confidence,
        status: record.status,
        totalAttempts: record.totalAttempts,
        correctAttempts: record.correctAttempts,
        avgResponseLatency: record.avgResponseLatency,
        lastAssessedAt: record.lastAssessedAt,
      };

      if (record.status === 'mastered') {
        mastered.push(item);
      } else if (record.status === 'in-progress') {
        inProgress.push(item);
      } else {
        gaps.push(item);
      }
    });

    // Generate remedial recommendations for detected gaps
    const recommendations = gaps.map((gap) => ({
      conceptId: gap.conceptId,
      conceptName: gap.conceptName,
      conceptCode: gap.conceptCode,
      urgency: gap.masteryScore < 30 ? 'high' : 'medium',
      suggestedAction: `Review foundational concepts for ${gap.conceptName} before attempting next assessment.`,
      moduleIndex: gap.concept?.moduleIndex || 0,
      lessonIndex: gap.concept?.lessonIndex || 0,
    }));

    res.json({
      summary: {
        totalTracked: records.length,
        masteredCount: mastered.length,
        inProgressCount: inProgress.length,
        gapsCount: gaps.length,
        overallMasteryPct: records.length
          ? Math.round(records.reduce((acc, r) => acc + r.masteryScore, 0) / records.length)
          : 0,
      },
      mastered,
      inProgress,
      gaps,
      recommendations,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/competencies/cohort-gaps/:courseId
// Returns aggregated cohort-wide concept mastery and gap rates for faculty/instructors
exports.getCohortGaps = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId).select('title instructor competencies');
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role === 'teacher' && String(course.instructor) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only view cohort analytics for your own courses.' });
    }

    // Find all concepts linked to this course
    const concepts = await Concept.find({ course: courseId }).populate('competency', 'title code');

    // Aggregate LearnerMastery across all students for these concepts
    const conceptIds = concepts.map((c) => c._id);
    const masteryRecords = await LearnerMastery.find({ concept: { $in: conceptIds } })
      .populate('student', 'name email avatar');

    // Group by concept
    const statsByConcept = new Map();
    concepts.forEach((concept) => {
      statsByConcept.set(String(concept._id), {
        conceptId: concept._id,
        conceptName: concept.name,
        conceptCode: concept.code,
        competencyTitle: concept.competency?.title || 'General',
        difficulty: concept.difficulty,
        studentsAssessed: 0,
        totalScoreSum: 0,
        gapCount: 0,
        inProgressCount: 0,
        masteredCount: 0,
        totalLatencySum: 0,
      });
    });

    masteryRecords.forEach((record) => {
      const stat = statsByConcept.get(String(record.concept));
      if (!stat) return;
      stat.studentsAssessed += 1;
      stat.totalScoreSum += record.masteryScore;
      stat.totalLatencySum += record.avgResponseLatency || 0;
      if (record.status === 'unmet') stat.gapCount += 1;
      else if (record.status === 'in-progress') stat.inProgressCount += 1;
      else if (record.status === 'mastered') stat.masteredCount += 1;
    });

    const cohortBreakdown = Array.from(statsByConcept.values()).map((stat) => {
      const avgScore = stat.studentsAssessed > 0
        ? Math.round(stat.totalScoreSum / stat.studentsAssessed)
        : 0;
      const gapPercentage = stat.studentsAssessed > 0
        ? Math.round((stat.gapCount / stat.studentsAssessed) * 100)
        : 0;
      const avgLatency = stat.studentsAssessed > 0
        ? Math.round(stat.totalLatencySum / stat.studentsAssessed)
        : 0;

      return {
        conceptId: stat.conceptId,
        conceptName: stat.conceptName,
        conceptCode: stat.conceptCode,
        competencyTitle: stat.competencyTitle,
        difficulty: stat.difficulty,
        studentsAssessed: stat.studentsAssessed,
        averageMastery: avgScore,
        gapPercentage,
        gapCount: stat.gapCount,
        inProgressCount: stat.inProgressCount,
        masteredCount: stat.masteredCount,
        avgLatencySeconds: avgLatency,
        riskLevel: gapPercentage > 40 ? 'critical' : gapPercentage > 20 ? 'moderate' : 'low',
      };
    });

    // High risk concepts needing faculty intervention
    const highRiskConcepts = cohortBreakdown
      .filter((c) => c.riskLevel === 'critical' || (c.studentsAssessed > 0 && c.averageMastery < 50))
      .sort((a, b) => b.gapPercentage - a.gapPercentage);

    res.json({
      course: { id: course._id, title: course.title },
      totalAssessedStudents: new Set(masteryRecords.map((r) => String(r.student?._id || r.student))).size,
      cohortBreakdown,
      highRiskConcepts,
    });
  } catch (err) {
    next(err);
  }
};

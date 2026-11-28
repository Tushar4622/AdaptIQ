const { MasterSyllabus } = require('../models/Syllabus');
const PersonalizedPlan = require('../models/PersonalizedPlan');
const SkillProfile = require('../models/SkillProfile');
const Course = require('../models/Course');
const llmEngine = require('../services/llmEngine');

/**
 * POST /api/syllabus/parse
 * Teacher uploads syllabus text / notes -> AI parses into Master Syllabus structure
 */
exports.parseAndCreateMasterSyllabus = async (req, res, next) => {
  try {
    const { courseId, syllabusText, title } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // RBAC check: only course instructor or admin
    if (req.user.role === 'teacher' && String(course.instructor) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only manage syllabi for your own courses.' });
    }

    // Call AI parsing engine
    const parsedData = await llmEngine.parseSyllabus({
      courseTitle: course.title,
      rawText: syllabusText,
    });

    let masterSyllabus = await MasterSyllabus.findOne({ course: courseId, isMaster: true });

    if (!masterSyllabus) {
      masterSyllabus = new MasterSyllabus({
        course: courseId,
        title: title || `${course.title} — Master Syllabus`,
        version: 1,
        isMaster: true,
        units: parsedData.units || [],
        rawSourceText: syllabusText || '',
        parsedByAI: true,
        createdBy: req.user._id,
        versionHistory: [
          {
            versionNumber: 1,
            changeLog: 'Initial master syllabus parsed and published by instructor.',
            updatedBy: req.user._id,
            updatedAt: new Date(),
          },
        ],
      });
    } else {
      // Create version snapshot before updating
      const nextVersion = masterSyllabus.version + 1;
      masterSyllabus.versionHistory.push({
        versionNumber: masterSyllabus.version,
        changeLog: `Updated via instructor upload. Upgraded to version ${nextVersion}.`,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });
      masterSyllabus.version = nextVersion;
      masterSyllabus.units = parsedData.units || [];
      masterSyllabus.rawSourceText = syllabusText || masterSyllabus.rawSourceText;
    }

    await masterSyllabus.save();

    res.status(201).json({
      message: 'Master syllabus parsed and created successfully.',
      masterSyllabus,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/master/:courseId
 * Retrieve the course master syllabus (immutable by students)
 */
exports.getMasterSyllabus = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    let master = await MasterSyllabus.findOne({ course: courseId, isMaster: true });

    if (!master) {
      // Auto-create initial default master syllabus from course metadata if none exists
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ error: 'Course not found.' });

      const parsed = await llmEngine.parseSyllabus({
        courseTitle: course.title,
        rawText: course.description + ' ' + (course.content || ''),
      });

      master = await MasterSyllabus.create({
        course: courseId,
        title: `${course.title} — Master Syllabus`,
        version: 1,
        isMaster: true,
        units: parsed.units,
        createdBy: course.instructor,
        versionHistory: [
          {
            versionNumber: 1,
            changeLog: 'Default master syllabus generated from course curriculum.',
            updatedAt: new Date(),
          },
        ],
      });
    }

    res.json({ masterSyllabus: master });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/syllabus/master/:courseId
 * Teacher manually updates Master Syllabus units/topics with version history
 */
exports.updateMasterSyllabus = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { units, changeLog } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (req.user.role === 'teacher' && String(course.instructor) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const master = await MasterSyllabus.findOne({ course: courseId, isMaster: true });
    if (!master) return res.status(404).json({ error: 'Master syllabus not found.' });

    const newVersion = master.version + 1;
    master.versionHistory.push({
      versionNumber: master.version,
      changeLog: changeLog || `Instructor manual update to version ${newVersion}.`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });
    master.version = newVersion;
    if (Array.isArray(units)) master.units = units;

    await master.save();

    res.json({
      message: `Master syllabus updated to version ${master.version}.`,
      masterSyllabus: master,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/personalized/:courseId
 * Retrieve the current student's personalized syllabus (or teacher viewing student's plan)
 */
exports.getPersonalizedSyllabus = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const targetStudentId = req.targetStudentId || req.user._id;

    let plan = await PersonalizedPlan.findOne({
      course: courseId,
      student: targetStudentId,
    });

    if (!plan) {
      // Auto-generate initial plan using student's SkillProfile and Master Syllabus
      const master = await MasterSyllabus.findOne({ course: courseId, isMaster: true });
      if (!master) {
        return res.status(404).json({ error: 'Master syllabus does not exist for this course yet.' });
      }

      let profile = await SkillProfile.findOne({ course: courseId, student: targetStudentId });
      if (!profile) {
        profile = { topicMasteries: [] };
      }

      const generatedPlan = await llmEngine.generatePersonalizedSyllabus({
        masterSyllabus: master,
        skillProfile: profile,
      });

      plan = await PersonalizedPlan.create({
        student: targetStudentId,
        course: courseId,
        masterSyllabus: master._id,
        masterVersion: master.version,
        planTitle: generatedPlan.planTitle,
        summaryNarrative: generatedPlan.summaryNarrative,
        adaptedTopics: generatedPlan.adaptedTopics,
      });
    }

    res.json({ personalizedPlan: plan });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/syllabus/personalized/:planId/override
 * Teacher reviews, approves, or overrides student's personalized syllabus
 */
exports.teacherOverridePersonalizedSyllabus = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { teacherApproved, teacherOverrides, adaptedTopics } = req.body;

    const plan = await PersonalizedPlan.findById(planId).populate('course');
    if (!plan) return res.status(404).json({ error: 'Personalized plan not found.' });

    // Ensure teacher owns course
    if (req.user.role === 'teacher' && String(plan.course.instructor) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only override plans for your own courses.' });
    }

    if (typeof teacherApproved === 'boolean') plan.teacherApproved = teacherApproved;
    if (teacherOverrides) plan.teacherOverrides = String(teacherOverrides).trim();
    if (Array.isArray(adaptedTopics)) plan.adaptedTopics = adaptedTopics;

    await plan.save();

    res.json({
      message: 'Student personalized plan updated and verified by instructor.',
      personalizedPlan: plan,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/syllabus/plans/:courseId
 * Retrieve all student personalized plans for a course (Teacher view)
 */
exports.getCoursePersonalizedPlans = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const plans = await PersonalizedPlan.find({ course: courseId })
      .populate('student', 'name email avatar xp')
      .sort('-updatedAt');
    res.json({ plans });
  } catch (err) {
    next(err);
  }
};

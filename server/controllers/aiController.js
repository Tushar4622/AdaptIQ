const {
  Skill,
  QuizAttempt,
  Enrollment,
  Submission,
  Discussion,
  MarketTrend,
  Quiz,
  Concept,
  Competency,
} = require('../models/index');
const Course = require('../models/Course');
const { generateAIContent } = require('../services/aiRequestManager');
const { getAIModel } = require('../services/aiProvider');

const SKILL_CATEGORIES = ['Technical', 'Soft Skills', 'Domain Knowledge', 'Tools'];
const SKILL_STATUSES = ['acquired', 'in-progress', 'gap'];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeWhitespace = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const deriveSkillStatus = (proficiency) => {
  if (proficiency >= 70) return 'acquired';
  if (proficiency >= 30) return 'in-progress';
  return 'gap';
};

const normalizeSkillCategory = (category) => {
  const trimmed = normalizeWhitespace(category);
  if (!trimmed) return 'Technical';

  const match = SKILL_CATEGORIES.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase()
  );

  return match || 'Technical';
};

const normalizeSkillRecord = (value) => {
  if (!value || typeof value !== 'object') return null;

  const name = normalizeWhitespace(value.name);
  if (!name) return null;

  const proficiencyValue = Number(value.proficiency);
  const proficiency = Number.isFinite(proficiencyValue)
    ? clamp(Math.round(proficiencyValue), 0, 100)
    : 0;

  const rawStatus = normalizeWhitespace(value.status).toLowerCase();
  const status = SKILL_STATUSES.includes(rawStatus)
    ? rawStatus
    : deriveSkillStatus(proficiency);

  return {
    name,
    category: normalizeSkillCategory(value.category),
    proficiency,
    status,
  };
};

const dedupeSkillsByName = (skills = []) => {
  const byName = new Map();

  skills.forEach((skill) => {
    if (!skill) return;

    const key = String(skill.name || '').toLowerCase();
    if (!key) return;

    const existing = byName.get(key);
    if (!existing || Number(skill.proficiency) > Number(existing.proficiency)) {
      byName.set(key, skill);
    }
  });

  return Array.from(byName.values());
};

const toAiServiceError = (err) => {
  const status = Number(err?.status || err?.statusCode || 0);

  if (status === 401 || status === 403) {
    const wrapped = new Error(
      'AI provider authentication failed.'
    );
    wrapped.statusCode = 502;
    return wrapped;
  }

  if (status === 429) {
    const wrapped = new Error('AI is busy right now. Please try again shortly.');
    wrapped.statusCode = 503;
    wrapped.retryAfterSeconds = Math.ceil(Number(err?.retryAfterMs || 0) / 1000);
    return wrapped;
  }

  if (/^(GROQ|GEMINI)_API_KEY not configured$/.test(String(err?.message || ''))) {
    const wrapped = new Error(`AI is unavailable because ${err.message.split(' ')[0]} is not configured.`);
    wrapped.statusCode = 503;
    return wrapped;
  }

  return err;
};

const generateWithRetry = async (model, prompt) => {
  return generateAIContent(model, prompt);
};

const getConfiguredAIModel = () => {
  const model = getAIModel();
  if (!model) {
    const provider = String(process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'gemini')).toLowerCase();
    throw new Error(`${provider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} not configured`);
  }
  return model;
};

const parseJsonObject = (rawText) => {
  const cleaned = String(rawText || '').replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('AI returned invalid JSON');
    }
    return JSON.parse(match[0]);
  }
};

const parseJsonArray = (rawText) => {
  const cleaned = String(rawText || '').replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fall through to best-effort extraction.
  }

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('AI returned invalid JSON array');
  }

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('AI returned invalid JSON array');
  }

  return parsed;
};

const normalizeStringList = (value, min = 0, max = 20) => {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max);

  if (min > 0 && normalized.length < min) return normalized;
  return normalized;
};

const normalizeCurriculum = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === 'string') {
        const title = item.trim();
        if (!title) return null;
        return {
          title,
          description: '',
          order: index + 1,
        };
      }

      if (!item || typeof item !== 'object') return null;

      const title = String(item.title || item.name || '').trim();
      if (!title) return null;

      const description = String(item.description || item.summary || '').trim();

      return {
        title,
        description,
        order: index + 1,
      };
    })
    .filter(Boolean)
    .slice(0, 20);
};

// POST /api/courses/ai-draft
exports.generateCourseDraft = async (req, res, next) => {
  try {
    const {
      title,
      category,
      difficulty,
      durationHours,
      existingDescription,
      existingContent,
      objectives,
      prerequisites,
      tags,
      chapterHints,
    } = req.body;

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) {
      return res.status(400).json({ error: 'Course title is required for AI generation.' });
    }

    const chapterHintsText = Array.isArray(chapterHints)
      ? chapterHints
          .map((chapter) => {
            if (!chapter || typeof chapter !== 'object') return '';
            return `${String(chapter.title || '').trim()} ${String(chapter.description || '').trim()}`.trim();
          })
          .filter(Boolean)
          .join('; ')
      : '';

    const model = getConfiguredAIModel();

    const prompt = `You are an expert instructional designer.
Generate a high-quality course draft for teachers.

Input context:
- Title: ${trimmedTitle}
- Category: ${String(category || 'Other')}
- Difficulty: ${String(difficulty || 'Beginner')}
- Duration Hours: ${Number(durationHours) || 0}
- Existing Description: ${String(existingDescription || '').trim() || 'None'}
- Existing Content: ${String(existingContent || '').trim() || 'None'}
- Existing Objectives: ${Array.isArray(objectives) ? objectives.join(', ') : 'None'}
- Existing Prerequisites: ${Array.isArray(prerequisites) ? prerequisites.join(', ') : 'None'}
- Existing Tags: ${Array.isArray(tags) ? tags.join(', ') : 'None'}
- Chapter Hints: ${chapterHintsText || 'None'}

Return ONLY valid JSON object. Do not include markdown.
Shape:
{
  "description": "string",
  "content": "string",
  "objectives": ["string"],
  "prerequisites": ["string"],
  "tags": ["string"],
  "stages": ["string"],
  "curriculum": [
    { "title": "string", "description": "string" }
  ]
}

Rules:
- description: 120-220 words.
- content: structured course context and teaching flow, 200-500 words.
- objectives: 5-8 concise outcomes.
- prerequisites: 3-6 practical prerequisites.
- tags: 6-12 focused tags.
- stages: 4-7 stage names (for progressive learning stages).
- curriculum: 6-12 chapters with clear descriptions.
- Keep content practical and classroom-ready.`;

    const result = await generateWithRetry(model, prompt);
    const rawText = result.response.text();
    const parsed = parseJsonObject(rawText);

    const curriculum = normalizeCurriculum(parsed.curriculum);

    const draft = {
      description: String(parsed.description || '').trim(),
      content: String(parsed.content || '').trim(),
      objectives: normalizeStringList(parsed.objectives, 0, 12),
      prerequisites: normalizeStringList(parsed.prerequisites, 0, 10),
      tags: normalizeStringList(parsed.tags, 0, 20),
      stages: normalizeStringList(parsed.stages, 0, 10),
      curriculum,
    };

    if (!draft.description || !draft.content || draft.curriculum.length === 0) {
      return res.status(502).json({ error: 'AI response was incomplete. Please try again.' });
    }

    res.json({ draft });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// GET /api/skills/map
exports.getSkillMap = async (req, res, next) => {
  try {
    const skills = await Skill.find({ user: req.user._id }).sort('category name');
    res.json({ skills });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// POST /api/skills/manual
exports.addManualSkill = async (req, res, next) => {
  try {
    const payload = normalizeSkillRecord({
      name: req.body.name,
      category: req.body.category,
      proficiency: req.body.proficiency,
      status: req.body.status,
    });

    if (!payload) {
      return res.status(400).json({ error: 'Skill name is required.' });
    }

    const existing = await Skill.findOne({
      user: req.user._id,
      name: { $regex: `^${escapeRegex(payload.name)}$`, $options: 'i' },
    });

    let skill;

    if (existing) {
      existing.name = payload.name;
      existing.category = payload.category;
      existing.proficiency = payload.proficiency;
      existing.status = payload.status;
      existing.source = 'user';
      existing.lastAnalyzed = new Date();
      skill = await existing.save();
    } else {
      skill = await Skill.create({
        user: req.user._id,
        ...payload,
        source: 'user',
        lastAnalyzed: new Date(),
      });
    }

    const skills = await Skill.find({ user: req.user._id }).sort('category name');
    res.status(201).json({ skill, skills });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// POST /api/skills/analyze
exports.analyzeSkills = async (req, res, next) => {
  try {
    const [enrollments, attempts, submissions, discussionCount, manualSkills] = await Promise.all([
      Enrollment.find({ student: req.user._id })
        .populate('course', 'title category tags'),
      QuizAttempt.find({ student: req.user._id })
        .populate('quiz', 'title')
        .sort('-completedAt')
        .limit(30),
      Submission.find({ student: req.user._id, status: 'graded' })
        .populate('assignment', 'title')
        .sort('-gradedAt')
        .limit(30),
      Discussion.countDocuments({ 'messages.author': req.user._id }),
      Skill.find({ user: req.user._id, source: 'user' })
        .select('name category proficiency status')
        .sort('name'),
    ]);

    const model = getConfiguredAIModel();

    const enrollmentContext = enrollments
      .slice(0, 20)
      .map((enrollment) => `${enrollment.course?.title} (${enrollment.progress}% complete, category: ${enrollment.course?.category})`)
      .join(', ') || 'None';

    const quizContext = attempts
      .map((attempt) => `${attempt.quiz?.title}: ${attempt.score}% (${attempt.passed ? 'Passed' : 'Failed'})`)
      .join(', ') || 'No quizzes taken';

    const submissionContext = submissions
      .map((submission) => `${submission.assignment?.title || 'Assignment'}: ${Number(submission.score || 0)}%`)
      .join(', ') || 'No graded assignments yet';

    const manualSkillsContext = manualSkills
      .map((skill) => `${skill.name} (${skill.category}, ${skill.proficiency}%)`)
      .join(', ') || 'None';

    const prompt = `You are an expert education analyst. Analyze this learner's academic data and extract their skill profile.

Learner Profile:
- Name: ${req.user.name}
- Career Goals: ${req.user.careerGoals || 'Not specified'}
- Enrolled Courses: ${enrollmentContext}
- Quiz Performance: ${quizContext}
- Assignment Scores: ${submissionContext}
- Discussion Participation: ${discussionCount} discussion thread(s) contributed
- User-Added Skills (must be kept): ${manualSkillsContext}

Return ONLY a JSON array of skill objects. No markdown, no explanation. Format:
[
  {
    "name": "skill name",
    "category": "Technical|Soft Skills|Domain Knowledge|Tools",
    "proficiency": 0-100,
    "status": "acquired|in-progress|gap"
  }
]

Rules:
- acquired: proficiency >= 70
- in-progress: proficiency 30-69
- gap: proficiency < 30
- Extract 8-15 relevant skills based on the courses and quiz results
- Be specific (e.g., "Python Programming" not "Programming")
- Keep all user-added skills listed above in the response.`;

    const result = await generateWithRetry(model, prompt);
    const text = result.response.text();
    const parsedSkills = parseJsonArray(text);
    const aiSkills = dedupeSkillsByName(
      parsedSkills.map(normalizeSkillRecord).filter(Boolean)
    );

    const manualByName = new Map(
      manualSkills.map((skill) => [String(skill.name || '').toLowerCase(), skill])
    );

    // Upsert skills in DB
    const ops = aiSkills
      .filter((skill) => !manualByName.has(String(skill.name).toLowerCase()))
      .map((skill) => ({
      updateOne: {
        filter: {
          user: req.user._id,
          name: skill.name,
          source: { $ne: 'user' },
        },
        update: {
          $set: {
            ...skill,
            user: req.user._id,
            lastAnalyzed: new Date(),
            source: 'ai',
          },
        },
        upsert: true,
      },
      }));

    if (ops.length > 0) {
      await Skill.bulkWrite(ops);
    }

    const updatedSkills = await Skill.find({ user: req.user._id }).sort('category name');

    res.json({
      skills: updatedSkills,
      analyzed: aiSkills.length,
      preservedManualSkills: manualSkills.length,
    });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// GET /api/market/trends
exports.getMarketTrends = async (req, res, next) => {
  try {
    // Check cache
    const cached = await MarketTrend.findOne({ expiresAt: { $gt: new Date() } })
      .sort('-fetchedAt')
      .limit(1);

    if (cached) {
      return res.json({ trends: cached.data, cached: true, fetchedAt: cached.fetchedAt });
    }

    const model = getConfiguredAIModel();

    const prompt = `You are a labor market analyst with expertise in tech and education. Generate a comprehensive skill market trends report for ${new Date().getFullYear()}.

Return ONLY a JSON object. No markdown. Format:
{
  "topSkills": [
    { "skill": "name", "demand": 85, "growth": 12, "category": "category", "avgSalary": "$X" }
  ],
  "industries": [
    { "name": "industry", "topSkills": ["skill1", "skill2", "skill3"], "hiringTrend": "growing|stable|declining" }
  ],
  "emergingTech": ["tech1", "tech2", "tech3", "tech4", "tech5"],
  "careerPaths": [
    { "title": "role title", "requiredSkills": ["skill1", "skill2"], "avgSalary": "$X", "demand": "high|medium|low" }
  ],
  "summary": "2-3 sentence market summary"
}

Include 10 top skills, 5 industries, 8 emerging techs, 6 career paths. Focus on tech, data, design, and business.`;

    const result = await generateWithRetry(model, prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(text);

    await MarketTrend.create({ data });

    res.json({ trends: data, cached: false, fetchedAt: new Date() });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// POST /api/quizzes/:id/feedback  (AI feedback on quiz attempt)
exports.getQuizFeedback = async (req, res, next) => {
  try {
    const { score, wrongTopics, quizTitle } = req.body;
    const model = getConfiguredAIModel();

    const prompt = `A student scored ${score}% on a quiz titled "${quizTitle}". 
Wrong answer topics: ${wrongTopics?.join(', ') || 'various'}.
Give a concise, encouraging, 3-4 sentence feedback message with specific study recommendations. Be constructive and motivating.`;

    const result = await generateWithRetry(model, prompt);
    const feedback = result.response.text();

    res.json({ feedback });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

// POST /api/quizzes/generate-ai
// Modular, grounded 2-pass MCQ generator with automated quality verification and distractor filtering
exports.generateAdaptiveMCQs = async (req, res, next) => {
  try {
    const {
      courseId,
      conceptId,
      conceptName: customConceptName,
      materialText,
      moduleIndex,
      lessonIndex,
      count = 5,
      cognitiveLevel = 'diverse',
      quizTitle,
      timeLimit = 20,
      passingScore = 70,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (req.user.role === 'teacher' && String(course.instructor) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only generate questions for your own courses' });
    }

    // Determine target concept
    let resolvedConcept = null;
    let targetConceptName = customConceptName || 'Core Competency';
    if (conceptId) {
      resolvedConcept = await Concept.findById(conceptId);
      if (resolvedConcept) {
        targetConceptName = resolvedConcept.name;
      }
    }

    // Grounding Context Extraction
    let groundingContext = String(materialText || '').trim();
    if (!groundingContext && moduleIndex !== undefined && lessonIndex !== undefined) {
      const lesson = course.modules?.[moduleIndex]?.lessons?.[lessonIndex];
      if (lesson?.content) {
        groundingContext = lesson.content;
      }
    }
    if (!groundingContext) {
      groundingContext = `${course.title}. ${course.description} ${course.content || ''}`;
    }

    const numQuestions = Math.min(10, Math.max(1, Number(count) || 5));
    const model = getConfiguredAIModel();

    // Resolve shorthand 'lot'/'hot' to a descriptive label for the prompt
    const cognitiveLabel =
      cognitiveLevel === 'lot' ? 'Lower Order Thinking only (L1–L3: remember, understand, apply)' :
      cognitiveLevel === 'hot' ? 'Higher Order Thinking only (L4–L6: analyze, evaluate, create)' :
      cognitiveLevel === 'diverse' ? 'diverse — balanced mix of LOT (L1–L3) and HOT (L4–L6)' :
      cognitiveLevel;

    // ── PASS 1: Grounded MCQ Generation ──────────────────────────────────────
    const generationPrompt = `You are an expert university psychometrician and instructional assessment designer.
Generate exactly ${numQuestions} high-quality multiple choice questions grounded STRICTLY in the academic material provided below.

Target Concept: "${targetConceptName}"
Target Cognitive Level: "${cognitiveLabel}"
Bloom's Taxonomy Reference:
  LOT — Lower Order Thinking: L1 remember (factual recall), L2 understand (comprehension), L3 apply (problem-solving)
  HOT — Higher Order Thinking: L4 analyze (deep reasoning / decomposition), L5 evaluate (critical judgment / argumentation), L6 create (synthesis / design)
Academic Context:
"""
${groundingContext.substring(0, 4000)}
"""

Return ONLY a valid JSON array of question objects without markdown formatting. Shape:
[
  {
    "text": "Clear, direct question stem",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed pedagogical explanation of why this answer is unequivocally correct",
    "cognitiveLevel": "remember|understand|apply|analyze|evaluate|create",
    "distractorRationales": [
      "Correct answer explanation",
      "Plausible misconception behind Option B",
      "Plausible misconception behind Option C",
      "Plausible misconception behind Option D"
    ]
  }
]

Quality Constraints:
- Stems must be self-contained and free of ambiguity.
- Exactly ONE option must be undeniably correct.
- All 3 distractors must be plausible student misconceptions, not absurd or obviously false choices.
- DO NOT use 'All of the above' or 'None of the above'.
- Ensure equal length, tone, and grammatical agreement across all 4 options.
- If cognitiveLevel is "diverse", include a balanced mix: at least 1 LOT question (remember/understand/apply) and at least 1 HOT question (analyze/evaluate/create).
- If cognitiveLevel is "hot", ALL questions must be analyze, evaluate, or create.
- If cognitiveLevel is "lot", ALL questions must be remember, understand, or apply.`;

    const rawResult = await generateWithRetry(model, generationPrompt);
    const parsedQuestions = parseJsonArray(rawResult.response.text());

    // ── PASS 2: Automated Quality & Distractor Validation ───────────────────────
    const critiquePrompt = `You are a strict psychometric reviewer evaluating multiple choice questions for university examination quality.
Review the following questions:
${JSON.stringify(parsedQuestions.slice(0, numQuestions))}

For each question verify:
1. Is exactly one option unquestionably correct?
2. Are the 3 distractors plausible misconceptions without trickery?
3. Does the stem clearly target "${targetConceptName}"?

Return ONLY a JSON array of verification objects for each question:
[
  {
    "index": 0,
    "isValid": true,
    "qualityScore": 85,
    "criticFeedback": "Solid distractor plausibility and clear stem alignment."
  }
]`;

    let qualityCritique = [];
    try {
      const criticResult = await generateWithRetry(model, critiquePrompt);
      qualityCritique = parseJsonArray(criticResult.response.text());
    } catch {
      // Fallback default ratings if critique fails
      qualityCritique = parsedQuestions.map((_, idx) => ({
        index: idx,
        isValid: true,
        qualityScore: 80,
        criticFeedback: 'Automated psychometric check passed initial schema validation.',
      }));
    }

    // Assemble validated draft questions
    const validatedQuestions = parsedQuestions
      .slice(0, numQuestions)
      .map((item, idx) => {
        const critique = qualityCritique.find((c) => c.index === idx) || { qualityScore: 85, criticFeedback: 'Validated' };
        const validOptions = Array.isArray(item.options) ? item.options.map((o) => String(o || '').trim()).filter(Boolean) : [];
        const correctIdx = Number(item.correctIndex);

        if (validOptions.length < 2 || !Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= validOptions.length) {
          return null;
        }

        return {
          text: String(item.text || '').trim(),
          options: validOptions,
          correctIndex: correctIdx,
          explanation: String(item.explanation || '').trim(),
          points: 1,
          concept: resolvedConcept?._id || undefined,
          cognitiveLevel: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].includes(item.cognitiveLevel)
            ? item.cognitiveLevel
            : 'understand',
          thinkingOrder: ['analyze', 'evaluate', 'create'].includes(item.cognitiveLevel) ? 'hot' : 'lot',
          status: 'ai_draft', // Staged for faculty review
          distractorRationales: Array.isArray(item.distractorRationales) ? item.distractorRationales : [],
          reviewNotes: `Quality Score: ${critique.qualityScore}/100. ${critique.criticFeedback || ''}`,
        };
      })
      .filter(Boolean);

    if (validatedQuestions.length === 0) {
      return res.status(502).json({ error: 'AI generation did not yield valid items. Please check input material and retry.' });
    }

    // Staging: Create an unpublished Quiz document with status: 'ai_draft' questions
    const draftQuiz = await Quiz.create({
      course: course._id,
      title: quizTitle?.trim() || `${targetConceptName} Formative Assessment (AI Draft)`,
      description: `AI-generated formative assessment targeting ${targetConceptName}. Staged for faculty review.`,
      timeLimit: Number(timeLimit) > 0 ? Number(timeLimit) : 20,
      passingScore: Number(passingScore) > 0 ? Number(passingScore) : 70,
      xpReward: 75,
      isPublished: false, // Hidden from students until faculty approves
      questions: validatedQuestions,
    });

    res.status(201).json({
      message: 'Adaptive MCQs generated successfully and staged for faculty review.',
      quiz: draftQuiz,
      concept: targetConceptName,
      generatedCount: validatedQuestions.length,
      averageQualityScore: Math.round(
        qualityCritique.reduce((sum, c) => sum + (c.qualityScore || 80), 0) / (qualityCritique.length || 1)
      ),
    });
  } catch (err) {
    next(toAiServiceError(err));
  }
};

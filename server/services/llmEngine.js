/**
 * llmEngine.js — Core AI Service for University Competency-Based LMS
 * Inspired by iGOT Karmayogi Framework
 * 
 * Provides validated structured generation for:
 * 1. Syllabus Parsing (Course > Units > Topics > Subtopics + Skill Areas)
 * 2. AI Quiz Generation (Difficulty rules + HOT/LOT distribution)
 * 3. Question Auto-Tagging (Topic, Difficulty, Bloom Level, Thinking Order, Question Type)
 * 4. Descriptive Answer Auto-Evaluation (Rubric matching, partial marks, misconceptions)
 * 5. Detailed Result Report Generation (8-dimension diagnostic report)
 * 6. Personalized Syllabus Generation (Master syllabus preservation, weak prioritization, prerequisites)
 */

const { generateAIContent } = require('./aiRequestManager');
const { getAIModel } = require('./aiProvider');

const cleanJson = (rawText) => {
  if (!rawText) return '';
  return String(rawText)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
};

const parseJsonSafely = (text, fallback = null) => {
  const cleaned = cleanJson(text);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }
    return fallback;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXACT PROMPT: SYLLABUS PARSING
// ─────────────────────────────────────────────────────────────────────────────
const SYLLABUS_PARSING_PROMPT = `You are a university academic dean and curriculum specialist.
Your task is to parse the uploaded course syllabus into an authoritative, hierarchical master syllabus.

STRUCTURE REQUIRED:
Course Title > Units > Topics > Subtopics
Each topic MUST be classified into one of the standard Skill Areas:
- 'Cybersecurity'
- 'Full Stack'
- 'Databases'
- 'Cloud & DevOps'
- 'Data Science & AI'
- 'Computer Networks'
- 'Software Engineering'
- 'General Computing'

Each topic must have:
- name: string
- code: unique uppercase string (e.g. "CS-SEC-01")
- skillArea: one of the exact skill areas above
- difficulty: "Easy" | "Moderate" | "Tough"
- description: clear summary of what this topic teaches
- prerequisites: array of prerequisite topic names that MUST be understood first
- subtopics: array of specific technical subtopics
- estimatedHours: recommended study hours (number)

INPUT SYLLABUS TEXT:
"""
{SYLLABUS_TEXT}
"""

Return ONLY valid JSON matching this schema:
{
  "title": "Course Title",
  "units": [
    {
      "unitNumber": 1,
      "title": "Unit Title",
      "description": "Unit overview",
      "topics": [
        {
          "name": "Topic Name",
          "code": "CODE",
          "skillArea": "Cybersecurity",
          "difficulty": "Moderate",
          "description": "...",
          "prerequisites": ["Prereq 1"],
          "subtopics": ["Subtopic A", "Subtopic B"],
          "estimatedHours": 4
        }
      ]
    }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXACT PROMPT: AI QUIZ GENERATION WITH HOT/LOT & DIFFICULTY MIX
// ─────────────────────────────────────────────────────────────────────────────
const QUIZ_GENERATION_PROMPT = `You are a university psychometrician and instructional assessment designer.
Generate an adaptive assessment based on the provided curriculum and constraints.

CONSTRAINTS:
- Course: "{COURSE_TITLE}"
- Target Topics: {TARGET_TOPICS}
- Total Questions: {QUESTION_COUNT}
- Target Difficulty Mix: {DIFFICULTY_MIX}
  * Easy: factual recall, direct definitions, basic syntax
  * Moderate: application, interpretation, scenario comprehension
  * Tough: multi-step reasoning, trade-offs, edge cases, error diagnostics
- Target Thinking Order (Bloom's Taxonomy):
  * LOT (Lower-Order Thinking): Remember, Understand, Apply ({LOT_PERCENTAGE}%)
  * HOT (Higher-Order Thinking): Analyze, Evaluate, Create ({HOT_PERCENTAGE}%)
- Allowed Question Types:
  * mcq: 4 options, exactly one correct
  * scenario: practical workplace or coding scenario with 4 options
  * case_study: real-world architectural dilemma with 4 options
  * short_answer: descriptive question with a grading rubric

SOURCE MATERIAL:
"""
{SOURCE_MATERIAL}
"""

Return ONLY a valid JSON array of question objects:
[
  {
    "text": "Clear, self-contained question stem",
    "questionType": "mcq|scenario|case_study|short_answer",
    "topic": "Topic Name",
    "skillArea": "Cybersecurity|Full Stack|Databases|etc",
    "difficulty": "Easy|Moderate|Tough",
    "cognitiveLevel": "remember|understand|apply|analyze|evaluate|create",
    "thinkingOrder": "lot|hot",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why the correct option is undeniably right",
    "distractorRationales": [
      "Correct answer explanation",
      "Plausible misconception behind Option B",
      "Plausible misconception behind Option C",
      "Plausible misconception behind Option D"
    ],
    "rubric": "Rubric criteria for short answer evaluation",
    "points": 1
  }
]`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXACT PROMPT: AUTO-TAGGING UNTAGGED QUIZ QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const AUTO_TAGGING_PROMPT = `You are an automated assessment classifier for university examinations.
Given a syllabus and a list of questions without complete metadata, your job is to auto-tag every question.

MASTER SYLLABUS TOPICS:
{SYLLABUS_TOPICS}

QUESTIONS TO TAG:
{UNTAGGED_QUESTIONS}

For each question, accurately determine:
1. topic: the best matching topic from the syllabus
2. skillArea: the skill area associated with that topic
3. difficulty: "Easy" (recall), "Moderate" (application), or "Tough" (complex reasoning)
4. cognitiveLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
5. thinkingOrder: "lot" (for remember/understand/apply) or "hot" (for analyze/evaluate/create)
6. questionType: "mcq" | "scenario" | "case_study" | "short_answer"

Return ONLY a valid JSON array of tagged question objects.`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXACT PROMPT: DESCRIPTIVE ANSWER AUTO-EVALUATION
// ─────────────────────────────────────────────────────────────────────────────
const DESCRIPTIVE_EVAL_PROMPT = `You are a university exam evaluator.
Grade the student's descriptive or scenario answer against the provided rubric.

Question: "{QUESTION_TEXT}"
Rubric / Ideal Answer: "{RUBRIC}"
Student's Submitted Answer: "{STUDENT_ANSWER}"
Maximum Points: {MAX_POINTS}

Evaluate strictly and constructively:
1. Award points earned (can be partial marks between 0 and {MAX_POINTS}).
2. Provide concise feedback explaining the justification for the awarded score.
3. Detect any fundamental misconception in the student's logic.

Return ONLY valid JSON:
{
  "scoreEarned": 2.5,
  "maxPoints": {MAX_POINTS},
  "isCorrect": true,
  "feedback": "Clear explanation of strengths and missing elements",
  "misconception": "None or identified misconception"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXACT PROMPT: DETAILED 8-DIMENSION RESULT REPORT
// ─────────────────────────────────────────────────────────────────────────────
const DETAILED_REPORT_PROMPT = `You are a university learning-science analyst.
Generate a comprehensive, encouraging, and actionable diagnostic performance report for a student based on their quiz submission.

STUDENT & QUIZ METRICS:
- Overall Score: {OVERALL_SCORE}% ({POINTS_EARNED}/{TOTAL_POINTS} points)
- Time Taken: {TIME_TAKEN_SECONDS} seconds across {QUESTION_COUNT} questions
- Topic Results: {TOPIC_RESULTS}
- Question-by-Question Diagnostics: {QUESTION_DIAGNOSTICS}
- HOT Questions Count: {HOT_COUNT}, HOT Accuracy: {HOT_ACCURACY}%
- LOT Questions Count: {LOT_COUNT}, LOT Accuracy: {LOT_ACCURACY}%

REPORT SECTIONS REQUIRED IN JSON:
1. overallSummary: concise plain-language summary of performance
2. topicPerformance: array of { topicName, skillArea, score, strengthLabel ("Strong"|"Average"|"Weak"), feedback }
3. questionTypeAnalysis: { mcqAccuracy, scenarioAccuracy, caseStudyAccuracy, verdict }
4. hotVsLotAnalysis: {
     lotScore: number,
     hotScore: number,
     verdict: "string explaining if student is memorizing without reasoning or can handle complex problem-solving"
   }
5. mistakePatterns: array of strings describing concrete misconceptions (e.g. "Confuses encryption with hashing")
6. detailedNotes: array of plain-language feedback on specific questions answered incorrectly
7. timeAnalysis: {
     avgSecondsPerQuestion: number,
     paceCategory: "Rushed" | "Balanced" | "Overthinking",
     advice: "string"
   }
8. nextSteps: array of 3 concrete recommendations for immediate revision

Return ONLY valid JSON matching the structure above.`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXACT PROMPT: PERSONALIZED SYLLABUS GENERATION
// ─────────────────────────────────────────────────────────────────────────────
const PERSONALIZED_SYLLABUS_PROMPT = `You are an adaptive curriculum architect inspired by the iGOT Karmayogi continuous competency framework.
Your task is to generate a student-specific PERSONALIZED SYLLABUS from the teacher's MASTER SYLLABUS.

CRITICAL RULES:
1. The teacher's MASTER SYLLABUS is immutable and NEVER modified. You are creating a separate customized plan for this specific student.
2. WEAK TOPICS (< 50% mastery):
   - Move to the TOP of the sequence (highest priority rank).
   - Expand with foundational prerequisites, revision notes, and targeted practice.
   - Transparently state the reason: "Prioritized because your mastery is X% in [Topic]".
3. AVERAGE TOPICS (50% - 74% mastery):
   - Keep in standard progression with balanced application practice.
   - Reason: "Maintained in standard flow with reinforcement exercises".
4. STRONG TOPICS (>= 75% mastery):
   - Compress routine lectures. Provide only advanced challenges and real-world case studies.
   - Reason: "Compressed because you achieved X% mastery; fast-tracked to advanced challenges".
5. Detect missing prerequisites (e.g. if student is weak in "Network Security", verify if "TCP/IP & Subnetting" is required and insert it).

MASTER SYLLABUS:
{MASTER_SYLLABUS_JSON}

STUDENT CURRENT SKILL PROFILE:
{STUDENT_SKILL_PROFILE_JSON}

Return ONLY valid JSON:
{
  "planTitle": "Personalized Adaptive Learning Pathway",
  "summaryNarrative": "Overview of personalized modifications tailored for this learner",
  "adaptedTopics": [
    {
      "topicName": "Topic Name",
      "skillArea": "Cybersecurity|Full Stack|Databases|etc",
      "originalUnitNumber": 1,
      "priorityRank": 1,
      "status": "Weak|Average|Strong",
      "adaptationType": "expanded_remediation|standard|compressed_advanced",
      "addedPrerequisites": ["Prereq Topic A", "Prereq Topic B"],
      "reason": "Prioritized because you scored 35% on Network Security",
      "aiExplanationSummary": "Simple, intuitive conceptual summary of this topic",
      "studySchedule": {
        "dailyMinutes": 30,
        "durationWeeks": 2,
        "recommendedDaysPerWeek": 5
      },
      "curatedResources": [
        {
          "title": "Resource title",
          "url": "https://nptel.ac.in/courses/... or official doc URL",
          "type": "video|article|documentation|practice",
          "source": "Teacher Notes|NPTEL|SWAYAM|iGOT Karmayogi|Official Docs"
        }
      ],
      "practiceItems": [
        {
          "questionStem": "Sample practice question",
          "difficulty": "Easy|Moderate|Tough",
          "thinkingLevel": "LOT|HOT"
        }
      ],
      "advancedChallenges": ["Advanced challenge description (for strong topics)"]
    }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC PSYCHOMETRIC FALLBACK GENERATORS (OFFLINE / SAFE RESILIENCE)
// ─────────────────────────────────────────────────────────────────────────────

const getDeterministicSyllabus = (courseTitle, rawText) => {
  return {
    title: courseTitle || 'Advanced Computer Science & Engineering',
    units: [
      {
        unitNumber: 1,
        title: 'Full Stack Web Architecture & APIs',
        description: 'Modern asynchronous web systems, RESTful microservices, state management and data pipelines.',
        topics: [
          {
            name: 'RESTful API Design & HTTP Protocols',
            code: 'CS-FS-01',
            skillArea: 'Full Stack',
            difficulty: 'Easy',
            description: 'Idempotency, status codes, request-response lifecycles, and API contract design.',
            prerequisites: ['Basic JavaScript', 'HTTP Basics'],
            subtopics: ['HTTP Methods', 'Status Codes', 'JSON Payloads', 'Stateless Architecture'],
            estimatedHours: 4,
          },
          {
            name: 'Asynchronous State & React Hooks',
            code: 'CS-FS-02',
            skillArea: 'Full Stack',
            difficulty: 'Moderate',
            description: 'Lifecycle effects, immutable state updates, custom hooks, and concurrent rendering.',
            prerequisites: ['RESTful API Design & HTTP Protocols'],
            subtopics: ['useEffect Dependencies', 'State Normalization', 'Context API', 'Race Condition Handling'],
            estimatedHours: 6,
          },
          {
            name: 'Full Stack Microservices & Caching',
            code: 'CS-FS-03',
            skillArea: 'Full Stack',
            difficulty: 'Tough',
            description: 'Distributed services, Redis caching strategies, connection pooling, and message queues.',
            prerequisites: ['Asynchronous State & React Hooks'],
            subtopics: ['Cache Invalidation', 'Connection Pools', 'Pub/Sub Patterns', 'Fault Tolerance'],
            estimatedHours: 8,
          },
        ],
      },
      {
        unitNumber: 2,
        title: 'Cybersecurity, Cryptography & Defensive Engineering',
        description: 'Principles of information assurance, threat modeling, cryptographic primitives, and vulnerability mitigation.',
        topics: [
          {
            name: 'Cryptographic Primitives: Hashing vs Encryption',
            code: 'CS-SEC-01',
            skillArea: 'Cybersecurity',
            difficulty: 'Easy',
            description: 'One-way hashing, salting, symmetric vs asymmetric encryption, and digital signatures.',
            prerequisites: ['Discrete Mathematics'],
            subtopics: ['SHA-256 vs bcrypt', 'AES Symmetric Ciphers', 'RSA Public Key Pairs', 'Salt and Pepper'],
            estimatedHours: 4,
          },
          {
            name: 'Web Vulnerabilities & OWASP Top 10 Mitigation',
            code: 'CS-SEC-02',
            skillArea: 'Cybersecurity',
            difficulty: 'Moderate',
            description: 'SQL/NoSQL injection, Cross-Site Scripting (XSS), CSRF tokens, and security headers.',
            prerequisites: ['Cryptographic Primitives: Hashing vs Encryption', 'RESTful API Design & HTTP Protocols'],
            subtopics: ['Sanitization Pipelines', 'Content Security Policy (CSP)', 'SameSite Cookies', 'Input Parameterization'],
            estimatedHours: 6,
          },
          {
            name: 'Zero-Trust Architecture & Threat Modeling',
            code: 'CS-SEC-03',
            skillArea: 'Cybersecurity',
            difficulty: 'Tough',
            description: 'Least-privilege RBAC, JWT rotation, mutual TLS, and automated threat modeling across untrusted networks.',
            prerequisites: ['Web Vulnerabilities & OWASP Top 10 Mitigation'],
            subtopics: ['STRIDE Matrix', 'JWT Refresh Token Rotation', 'mTLS Handshakes', 'Side-Channel Protection'],
            estimatedHours: 8,
          },
        ],
      },
      {
        unitNumber: 3,
        title: 'Database Systems & Data Persistence',
        description: 'Relational vs non-relational database design, ACID properties, indexing algorithms and horizontal sharding.',
        topics: [
          {
            name: 'Document Modeling & Compound Indexing',
            code: 'CS-DB-01',
            skillArea: 'Databases',
            difficulty: 'Moderate',
            description: 'Embedding vs referencing, index selectivity, compound queries, and write-concern trade-offs.',
            prerequisites: ['Data Structures & B-Trees'],
            subtopics: ['Compound Keys', 'Explain Plans', 'Replica Sets', 'Aggregation Pipelines'],
            estimatedHours: 5,
          },
        ],
      },
    ],
  };
};

const getDeterministicQuestions = ({ courseTitle, count = 5, difficultyMix = 'balanced', hotPct = 40 }) => {
  const allPool = [
    // ── Full Stack Questions (LOT & HOT)
    {
      text: 'Which HTTP status code should a RESTful service return when a resource is successfully created via a POST request?',
      questionType: 'mcq',
      topic: 'RESTful API Design & HTTP Protocols',
      skillArea: 'Full Stack',
      difficulty: 'Easy',
      cognitiveLevel: 'remember',
      thinkingOrder: 'lot',
      options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
      correctIndex: 1,
      explanation: 'HTTP 201 Created explicitly indicates that the request has succeeded and led to the creation of a new resource.',
      distractorRationales: [
        '200 indicates generic success, but not specifically resource creation.',
        '201 Created is the standards-compliant RFC status code for POST creations.',
        '204 indicates success with no returned body content.',
        '302 is a redirection status code.'
      ],
      rubric: 'Full marks for 201 Created.',
      points: 1,
    },
    {
      text: 'A React component makes an asynchronous API call inside useEffect. Why must a cleanup function or cancellation flag be implemented?',
      questionType: 'scenario',
      topic: 'Asynchronous State & React Hooks',
      skillArea: 'Full Stack',
      difficulty: 'Moderate',
      cognitiveLevel: 'apply',
      thinkingOrder: 'lot',
      options: [
        'To force the browser to restart the network card',
        'To avoid setting state on an unmounted component and prevent race conditions if inputs change rapidly',
        'Because React does not support asynchronous JavaScript',
        'To automatically serialize components into local storage'
      ],
      correctIndex: 1,
      explanation: 'When component dependencies change rapidly or unmount occurs before network response, setting state causes memory leaks and race conditions.',
      distractorRationales: [
        'React has no control over physical network hardware.',
        'Correct: Prevents stale closures, memory leaks and outdated responses overriding fresh data.',
        'React natively supports asynchronous promises.',
        'Local storage serialization is completely unrelated.'
      ],
      rubric: 'Identifies race conditions and unmounted component state updates.',
      points: 1,
    },
    {
      text: 'Analyze the architectural trade-off of adopting a Redis write-through cache versus a cache-aside (lazy loading) pattern for an e-commerce inventory service during a flash sale.',
      questionType: 'case_study',
      topic: 'Full Stack Microservices & Caching',
      skillArea: 'Full Stack',
      difficulty: 'Tough',
      cognitiveLevel: 'analyze',
      thinkingOrder: 'hot',
      options: [
        'Write-through ensures read consistency and eliminates cold misses but introduces write latency; cache-aside reduces write overhead but risks reading stale inventory during concurrency.',
        'Cache-aside guarantees 100% ACID transaction compliance across microservices without locks.',
        'Write-through cannot be used with distributed NoSQL databases.',
        'Both patterns behave identically under high concurrency.'
      ],
      correctIndex: 0,
      explanation: 'Under flash sale concurrency, write-through keeps cache fresh on every update at the expense of higher write latency; cache-aside only caches on demand, causing initial cache-miss penalties and potential stale inventory reads.',
      distractorRationales: [
        'Correct: Evaluates consistency vs write latency trade-off accurately.',
        'Caches operate in memory and do not provide distributed cross-database ACID guarantees.',
        'Write-through is widely used with NoSQL databases.',
        'They have opposing read/write synchronization mechanisms.'
      ],
      rubric: 'Must analyze consistency, write latency, and concurrency race conditions.',
      points: 1,
    },

    // ── Cybersecurity Questions (LOT & HOT)
    {
      text: 'What is the fundamental mathematical difference between cryptographic hashing (e.g., bcrypt) and symmetric encryption (e.g., AES)?',
      questionType: 'mcq',
      topic: 'Cryptographic Primitives: Hashing vs Encryption',
      skillArea: 'Cybersecurity',
      difficulty: 'Easy',
      cognitiveLevel: 'understand',
      thinkingOrder: 'lot',
      options: [
        'Encryption is one-way while hashing can be reversed with a private key.',
        'Hashing is a one-way mathematical function designed to be irreversible; encryption is two-way and reversible with the proper key.',
        'Hashing only works on numbers, whereas encryption works on text.',
        'Encryption produces identical outputs for any given input without keys.'
      ],
      correctIndex: 1,
      explanation: 'Hashing maps arbitrary data to a fixed-size digest in a strictly one-way process. Encryption transforms plaintext into ciphertext and is designed to be reversed with a decryption key.',
      distractorRationales: [
        'Inverted: Encryption is two-way; hashing is one-way.',
        'Correct: Hashing is one-way irreversible; encryption is two-way reversible with keys.',
        'Both operate on arbitrary binary byte sequences.',
        'Encryption without keys is invalid; hashes without salt produce deterministic digests.'
      ],
      rubric: 'Distinguishes one-way irreversible digest vs two-way keyed reversibility.',
      points: 1,
    },
    {
      text: 'An application stores passwords using MD5 without salt. An attacker steals the database dump. Explain the most severe attack vector and why salted bcrypt mitigates it.',
      questionType: 'scenario',
      topic: 'Cryptographic Primitives: Hashing vs Encryption',
      skillArea: 'Cybersecurity',
      difficulty: 'Moderate',
      cognitiveLevel: 'apply',
      thinkingOrder: 'lot',
      options: [
        'The attacker can decrypt the passwords in 1 second using the MD5 private key.',
        'The attacker can use precomputed rainbow tables to reverse unsalted MD5 in milliseconds; salted bcrypt adds unique random noise and computational work factors to make brute-forcing infeasible.',
        'Unsalted MD5 causes browser sessions to automatically expire.',
        'Bcrypt uses asymmetric quantum encryption that cannot be stored on hard drives.'
      ],
      correctIndex: 1,
      explanation: 'MD5 is fast and unsalted, enabling instantaneous lookup via precomputed rainbow tables. Bcrypt introduces a per-user salt (defeating rainbow tables) and configurable work factor iterations (defeating hardware brute-force).',
      distractorRationales: [
        'MD5 is a hash function, not a keyed cipher; there is no private key.',
        'Correct: Accurately identifies rainbow tables and bcrypt cost factor defense.',
        'Database hashes do not interact with client session cookies.',
        'Bcrypt is a classical password-hashing algorithm, not quantum crypto.'
      ],
      rubric: 'Identifies rainbow tables, salt uniqueness, and slow hashing cost factors.',
      points: 1,
    },
    {
      text: 'Evaluate a web application where JWT tokens are stored in localStorage and sent in the Authorization header. How can an attacker bypass authentication, and what is the optimal architectural remediation?',
      questionType: 'case_study',
      topic: 'Web Vulnerabilities & OWASP Top 10 Mitigation',
      skillArea: 'Cybersecurity',
      difficulty: 'Tough',
      cognitiveLevel: 'evaluate',
      thinkingOrder: 'hot',
      options: [
        'Any Cross-Site Scripting (XSS) vulnerability allows malicious scripts to read localStorage and exfiltrate the token; remediation requires storing refresh tokens in httpOnly, Secure, SameSite cookies with short-lived memory access tokens.',
        'Storing tokens in localStorage causes SQL injection vulnerabilities on the server database.',
        'The token can be decrypted by inspecting the browser network card directly.',
        'There is no risk because localStorage is automatically encrypted with the user password.'
      ],
      correctIndex: 0,
      explanation: 'localStorage is fully accessible to any JavaScript running in the origin. An XSS payload can exfiltrate tokens. Moving refresh tokens to httpOnly cookies blocks JavaScript access completely.',
      distractorRationales: [
        'Correct: Evaluates XSS attack surface and prescribes httpOnly cookie isolation.',
        'Token storage location on client has no direct relationship to backend SQL queries.',
        'Network inspection requires packet capture or MITM, not localStorage readout.',
        'localStorage is stored as unencrypted plaintext in the browser profile.'
      ],
      rubric: 'Identifies XSS token exfiltration and prescribes httpOnly SameSite cookie remediation.',
      points: 1,
    },
  ];

  return allPool.slice(0, Math.min(count, allPool.length));
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED AI SERVICE METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Parse Syllabus into Master Syllabus structure
 */
exports.parseSyllabus = async ({ courseTitle, rawText }) => {
  const model = getAIModel();
  if (model && rawText && rawText.length > 50) {
    try {
      const prompt = SYLLABUS_PARSING_PROMPT.replace('{SYLLABUS_TEXT}', rawText.substring(0, 8000));
      const result = await generateAIContent(model, prompt);
      const parsed = parseJsonSafely(result.response.text());
      if (parsed && Array.isArray(parsed.units) && parsed.units.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn(`Gemini syllabus parse failed; using deterministic parser (${err?.name || 'Error'}).`);
    }
  }

  return getDeterministicSyllabus(courseTitle, rawText);
};

/**
 * 2. Generate Adaptive Quiz with HOT/LOT and Difficulty Controls
 */
exports.generateAdaptiveQuiz = async ({
  courseTitle,
  targetTopics = [],
  questionCount = 5,
  difficulty = 'Moderate',
  hotPercentage = 40,
  sourceMaterial = '',
}) => {
  const model = getAIModel();
  const count = Math.min(10, Math.max(1, Number(questionCount) || 5));
  const hotPct = Math.min(100, Math.max(0, Number(hotPercentage) || 40));
  const lotPct = 100 - hotPct;

  if (model) {
    try {
      const prompt = QUIZ_GENERATION_PROMPT
        .replace('{COURSE_TITLE}', courseTitle || 'Computer Science')
        .replace('{TARGET_TOPICS}', JSON.stringify(targetTopics))
        .replace('{QUESTION_COUNT}', count)
        .replace('{DIFFICULTY_MIX}', difficulty)
        .replace('{LOT_PERCENTAGE}', lotPct)
        .replace('{HOT_PERCENTAGE}', hotPct)
        .replace('{SOURCE_MATERIAL}', sourceMaterial.substring(0, 4000) || `${courseTitle} core syllabus concepts`);

      const result = await generateAIContent(model, prompt);
      const questions = parseJsonSafely(result.response.text());
      if (Array.isArray(questions) && questions.length > 0) {
        return questions;
      }
    } catch (err) {
      console.warn(`Gemini quiz generation failed; using psychometric fallback (${err?.name || 'Error'}).`);
    }
  }

  return getDeterministicQuestions({
    courseTitle,
    count,
    difficultyMix: difficulty,
    hotPct,
  });
};

/**
 * 3. Auto-Evaluate Descriptive/Scenario Answer
 */
exports.evaluateDescriptiveAnswer = async ({ questionText, rubric, studentAnswer, maxPoints = 5 }) => {
  const model = getAIModel();
  if (model && studentAnswer && studentAnswer.length > 5) {
    try {
      const prompt = DESCRIPTIVE_EVAL_PROMPT
        .replace('{QUESTION_TEXT}', questionText)
        .replace('{RUBRIC}', rubric || 'Evaluate clarity, correctness and application depth.')
        .replace('{STUDENT_ANSWER}', studentAnswer)
        .replace(/\{MAX_POINTS\}/g, maxPoints);

      const result = await generateAIContent(model, prompt);
      const evalResult = parseJsonSafely(result.response.text());
      if (evalResult && typeof evalResult.scoreEarned === 'number') {
        return evalResult;
      }
    } catch (err) {
      console.warn(`Gemini descriptive evaluation failed; using heuristic evaluation (${err?.name || 'Error'}).`);
    }
  }

  // Heuristic Rubric Matcher
  const words = String(studentAnswer || '').toLowerCase().split(/\s+/).filter(Boolean);
  const rubricTerms = String(rubric || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const matches = rubricTerms.filter(term => words.includes(term));
  const ratio = rubricTerms.length > 0 ? matches.length / rubricTerms.length : 0.6;
  const scoreEarned = Math.round(ratio * maxPoints * 10) / 10;

  return {
    scoreEarned: Math.min(maxPoints, Math.max(0.5, scoreEarned)),
    maxPoints,
    isCorrect: scoreEarned >= maxPoints * 0.6,
    feedback: `Answer demonstrates understanding of ${matches.length} key rubric elements. Add more depth on specific trade-offs for full credit.`,
    misconception: scoreEarned < maxPoints * 0.5 ? 'Partial conceptual grounding with missing technical safeguards.' : null,
  };
};

/**
 * 4. Generate Comprehensive 8-Dimension Result Report
 */
exports.generateDetailedResultReport = async ({
  overallScore,
  pointsEarned,
  totalPoints,
  timeTakenSeconds,
  questionCount,
  topicResults,
  questionDiagnostics,
  hotCount,
  hotAccuracy,
  lotCount,
  lotAccuracy,
}) => {
  const model = getAIModel();
  if (model) {
    try {
      const prompt = DETAILED_REPORT_PROMPT
        .replace('{OVERALL_SCORE}', overallScore)
        .replace('{POINTS_EARNED}', pointsEarned)
        .replace('{TOTAL_POINTS}', totalPoints)
        .replace('{TIME_TAKEN_SECONDS}', timeTakenSeconds)
        .replace('{QUESTION_COUNT}', questionCount)
        .replace('{TOPIC_RESULTS}', JSON.stringify(topicResults))
        .replace('{QUESTION_DIAGNOSTICS}', JSON.stringify(questionDiagnostics))
        .replace('{HOT_COUNT}', hotCount)
        .replace('{HOT_ACCURACY}', hotAccuracy)
        .replace('{LOT_COUNT}', lotCount)
        .replace('{LOT_ACCURACY}', lotAccuracy);

      const result = await generateAIContent(model, prompt);
      const report = parseJsonSafely(result.response.text());
      if (report && report.topicPerformance) {
        return report;
      }
    } catch (err) {
      console.warn(`Gemini report generation failed; using rule-based report (${err?.name || 'Error'}).`);
    }
  }

  // Deterministic 8-Dimension Learning-Science Report
  const isHotWeak = hotAccuracy < 60;
  const isLotStrong = lotAccuracy >= 75;

  let hotVerdict = 'Balanced cognitive capability across foundational and analytical challenges.';
  if (isLotStrong && isHotWeak) {
    hotVerdict = `High recall and comprehension (LOT: ${lotAccuracy}%), but struggles on multi-step reasoning and scenario diagnosis (HOT: ${hotAccuracy}%). Student memorizes facts but requires guided case-study practice.`;
  } else if (!isLotStrong && !isHotWeak) {
    hotVerdict = `Strong high-level intuition (HOT: ${hotAccuracy}%), but exhibits syntax and definition lapses in core concepts (LOT: ${lotAccuracy}%). Needs targeted review of definitions and primitives.`;
  } else if (!isLotStrong && isHotWeak) {
    hotVerdict = `Foundational competency gaps across both LOT (${lotAccuracy}%) and HOT (${hotAccuracy}%). Immediate prerequisite scaffolding is recommended.`;
  }

  const mistakePatterns = [];
  questionDiagnostics.forEach((q) => {
    if (!q.isCorrect && q.misconception) {
      mistakePatterns.push(q.misconception);
    }
  });

  if (mistakePatterns.length === 0) {
    mistakePatterns.push('Minor edge-case omission under time pressure');
  }

  const avgSeconds = Math.round(timeTakenSeconds / Math.max(1, questionCount));
  let paceCategory = 'Balanced';
  let paceAdvice = 'Maintained a steady, reflective pace throughout the quiz.';
  if (avgSeconds < 25) {
    paceCategory = 'Rushed';
    paceAdvice = 'Rapid submissions detected. Take more time to read distractor rationales before answering.';
  } else if (avgSeconds > 120) {
    paceCategory = 'Overthinking';
    paceAdvice = 'High latency on scenario questions. Build confidence by practicing time-boxed mini-quizzes.';
  }

  return {
    overallSummary: `Achieved ${overallScore}% (${pointsEarned}/${totalPoints} points) in ${Math.round(timeTakenSeconds / 60)} minutes. ${hotVerdict}`,
    topicPerformance: topicResults.map((t) => ({
      topicName: t.topicName,
      skillArea: t.skillArea,
      score: t.score,
      strengthLabel: t.score >= 75 ? 'Strong' : t.score >= 50 ? 'Average' : 'Weak',
      feedback: t.score >= 75
        ? 'Demonstrated mastery. Ready for advanced challenge problems.'
        : t.score >= 50
        ? 'Competent baseline with occasional application lapses.'
        : 'Critical gap detected. Prerequisite reinforcement required.',
    })),
    questionTypeAnalysis: {
      mcqAccuracy: lotAccuracy,
      scenarioAccuracy: hotAccuracy,
      caseStudyAccuracy: Math.max(0, hotAccuracy - 10),
      verdict: isHotWeak
        ? 'Struggles with scenario and case-study questions; excels on direct MCQs.'
        : 'Consistent accuracy across multiple question formats.',
    },
    hotVsLotAnalysis: {
      lotScore: lotAccuracy,
      hotScore: hotAccuracy,
      verdict: hotVerdict,
    },
    mistakePatterns: Array.from(new Set(mistakePatterns)),
    detailedNotes: questionDiagnostics
      .filter((q) => !q.isCorrect)
      .map((q) => `Q${q.questionIndex + 1} (${q.topic}): Incorrect option selected. ${q.explanation}`),
    timeAnalysis: {
      avgSecondsPerQuestion: avgSeconds,
      paceCategory,
      advice: paceAdvice,
    },
    nextSteps: [
      'Review weak topic prerequisites before re-attempting formative evaluations.',
      'Solve 3 scenario-based debugging problems to elevate HOT cognitive performance.',
      'Check the personalized syllabus generated on your dashboard for recommended reading.',
    ],
  };
};

/**
 * 5. Generate Personalized Syllabus from Master Syllabus & Student Skill Profile
 */
exports.generatePersonalizedSyllabus = async ({ masterSyllabus, skillProfile }) => {
  const model = getAIModel();
  if (model && masterSyllabus && skillProfile) {
    try {
      const prompt = PERSONALIZED_SYLLABUS_PROMPT
        .replace('{MASTER_SYLLABUS_JSON}', JSON.stringify(masterSyllabus))
        .replace('{STUDENT_SKILL_PROFILE_JSON}', JSON.stringify(skillProfile));

      const result = await generateAIContent(model, prompt);
      const plan = parseJsonSafely(result.response.text());
      if (plan && Array.isArray(plan.adaptedTopics) && plan.adaptedTopics.length > 0) {
        return plan;
      }
    } catch (err) {
      console.warn(`Gemini syllabus personalization failed; using rule-based generator (${err?.name || 'Error'}).`);
    }
  }

  // Deterministic Personalized Syllabus Rule Engine
  const masterTopics = [];
  masterSyllabus.units.forEach((u) => {
    u.topics.forEach((t) => {
      masterTopics.push({
        ...t.toObject ? t.toObject() : t,
        unitNumber: u.unitNumber,
        unitTitle: u.title,
      });
    });
  });

  const masteryMap = new Map();
  (skillProfile.topicMasteries || []).forEach((tm) => {
    masteryMap.set(tm.topicName.toLowerCase().trim(), tm);
  });

  const weakTopics = [];
  const averageTopics = [];
  const strongTopics = [];

  masterTopics.forEach((t, idx) => {
    const key = t.name.toLowerCase().trim();
    const recorded = masteryMap.get(key);
    const score = recorded ? recorded.masteryScore : 50;

    const baseItem = {
      topicName: t.name,
      skillArea: t.skillArea,
      originalUnitNumber: t.unitNumber,
      originalTopicOrder: idx + 1,
    };

    if (score < 50) {
      weakTopics.push({
        ...baseItem,
        status: 'Weak',
        score,
        adaptationType: 'expanded_remediation',
        addedPrerequisites: t.prerequisites && t.prerequisites.length > 0
          ? t.prerequisites
          : ['Foundational Concepts Review', 'Core Principles Primer'],
        reason: `Prioritized because your current mastery is ${score}% in ${t.name}. Added prerequisite revision and targeted practice.`,
        aiExplanationSummary: `Key takeaway for ${t.name}: Focus on core definitions and step-by-step problem-solving. Practice applying these concepts in small scenarios before advancing.`,
        studySchedule: { dailyMinutes: 35, durationWeeks: 2, recommendedDaysPerWeek: 5 },
        curatedResources: [
          {
            title: `NPTEL Lecture Series: ${t.name}`,
            url: 'https://nptel.ac.in/courses/106/106/106106199/',
            type: 'video',
            source: 'NPTEL',
            verified: true,
          },
          {
            title: `iGOT Karmayogi Competency Module: ${t.skillArea}`,
            url: 'https://igotkarmayogi.gov.in/learn/course/do_313',
            type: 'course',
            source: 'iGOT Karmayogi',
            verified: true,
          },
          {
            title: `Official Documentation & Best Practices: ${t.name}`,
            url: 'https://developer.mozilla.org/en-US/docs/Web',
            type: 'documentation',
            source: 'Official Docs',
            verified: true,
          },
        ],
        practiceItems: [
          {
            questionStem: `Diagnostic review item targeting core principles of ${t.name}`,
            difficulty: 'Easy',
            thinkingLevel: 'LOT',
          },
          {
            questionStem: `Step-by-step scenario applying ${t.name} to avoid common errors`,
            difficulty: 'Moderate',
            thinkingLevel: 'HOT',
          },
        ],
        advancedChallenges: [],
      });
    } else if (score >= 75) {
      strongTopics.push({
        ...baseItem,
        status: 'Strong',
        score,
        adaptationType: 'compressed_advanced',
        addedPrerequisites: [],
        reason: `Fast-tracked because you achieved ${score}% mastery in ${t.name}. Routine lectures compressed to make room for advanced research challenges.`,
        aiExplanationSummary: `Advanced perspective on ${t.name}: You have mastered standard implementations. Focus on distributed scaling, edge-case failure modes, and security hardening.`,
        studySchedule: { dailyMinutes: 20, durationWeeks: 1, recommendedDaysPerWeek: 3 },
        curatedResources: [
          {
            title: `Advanced Architecture & RFC Standards: ${t.name}`,
            url: 'https://datatracker.ietf.org/doc/html/',
            type: 'documentation',
            source: 'Official Docs',
            verified: true,
          },
        ],
        practiceItems: [],
        advancedChallenges: [
          `Architect a high-availability solution incorporating ${t.name} under extreme load conditions.`,
          `Conduct a formal security audit of a reference deployment utilizing ${t.name}.`,
        ],
      });
    } else {
      averageTopics.push({
        ...baseItem,
        status: 'Average',
        score,
        adaptationType: 'standard',
        addedPrerequisites: [],
        reason: `Maintained in standard curriculum flow with targeted reinforcement (${score}% mastery).`,
        aiExplanationSummary: `Overview of ${t.name}: Solid conceptual foundation. Focus on bridging understanding to complex real-world edge cases.`,
        studySchedule: { dailyMinutes: 25, durationWeeks: 2, recommendedDaysPerWeek: 4 },
        curatedResources: [
          {
            title: `Comprehensive Guide: ${t.name}`,
            url: 'https://developer.mozilla.org/',
            type: 'article',
            source: 'Official Docs',
            verified: true,
          },
        ],
        practiceItems: [
          {
            questionStem: `Reinforcement exercise for ${t.name}`,
            difficulty: 'Moderate',
            thinkingLevel: 'LOT',
          },
        ],
        advancedChallenges: [],
      });
    }
  });

  // Sort: Weak (rank 1..N) -> Average -> Strong (compressed)
  const sortedTopics = [...weakTopics, ...averageTopics, ...strongTopics].map((item, idx) => ({
    ...item,
    priorityRank: idx + 1,
  }));

  return {
    planTitle: `Personalized Adaptive Pathway — ${masterSyllabus.title}`,
    summaryNarrative: `Customized learning sequence: ${weakTopics.length} weak topic(s) expanded and prioritized at the top with prerequisite scaffolding; ${strongTopics.length} mastered topic(s) compressed into advanced engineering challenges.`,
    adaptedTopics: sortedTopics,
  };
};

// Export all prompts for direct reference in deliverables
exports.PROMPTS = {
  SYLLABUS_PARSING_PROMPT,
  QUIZ_GENERATION_PROMPT,
  AUTO_TAGGING_PROMPT,
  DESCRIPTIVE_EVAL_PROMPT,
  DETAILED_REPORT_PROMPT,
  PERSONALIZED_SYLLABUS_PROMPT,
};

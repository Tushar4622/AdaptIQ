require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const { Badge, Quiz, Competency, Concept, LearnerMastery, MasterSyllabus, SkillProfile, PersonalizedPlan, Enrollment } = require('../models/index');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Badge.deleteMany({}),
    Quiz.deleteMany({}),
    Competency.deleteMany({}),
    Concept.deleteMany({}),
    LearnerMastery.deleteMany({}),
    MasterSyllabus.deleteMany({}),
    SkillProfile.deleteMany({}),
    PersonalizedPlan.deleteMany({}),
    Enrollment.deleteMany({}),
  ]);
  console.log('Cleared collections');

  // Create users
  const [admin, teacher1, teacher2, student1, student2] = await User.create([
    { name: 'Platform Admin', email: 'admin@adaptiq.com', password: 'Admin@1234', role: 'admin', institution: 'AdaptIQ', xp: 9999 },
    { name: 'Dr. Sarah Mitchell', email: 'sarah@adaptiq.com', password: 'Teacher@1234', role: 'teacher', institution: 'MIT OpenCourseWare', bio: 'Expert in Data Science and Machine Learning with 10+ years of industry experience.' },
    { name: 'Prof. James Carter', email: 'james@adaptiq.com', password: 'Teacher@1234', role: 'teacher', institution: 'Stanford Online', bio: 'Full-stack development expert and open-source contributor.' },
    { name: 'Arjun Sharma', email: 'arjun@adaptiq.com', password: 'Student@1234', role: 'student', institution: 'IIT Delhi', course: 'B.Tech Computer Science', careerGoals: 'Become a Machine Learning Engineer at a top tech company', xp: 850, streak: 7 },
    { name: 'Priya Patel', email: 'priya@adaptiq.com', password: 'Student@1234', role: 'student', institution: 'BITS Pilani', course: 'B.E. Computer Science', careerGoals: 'Frontend Developer at a product startup', xp: 1200, streak: 14 },
  ]);
  console.log('✅ Users created');

  // Create courses
  const courses = await Course.create([
    {
      title: 'Machine Learning Fundamentals',
      description: 'A comprehensive introduction to machine learning algorithms, model evaluation, and real-world applications using Python and scikit-learn. Covers supervised, unsupervised, and reinforcement learning.',
      instructor: teacher1._id,
      category: 'Data Science',
      difficulty: 'Intermediate',
      tags: ['ML', 'Python', 'scikit-learn', 'AI'],
      objectives: ['Understand core ML algorithms', 'Build and evaluate models', 'Apply ML to real datasets'],
      prerequisites: ['Python basics', 'Linear algebra fundamentals'],
      duration: 40,
      isPublished: true,
      enrollmentCount: 847,
      rating: 4.8,
      ratingCount: 203,
      modules: [
        {
          title: 'Introduction to Machine Learning',
          order: 1,
          lessons: [
            { title: 'What is Machine Learning?', type: 'text', content: 'Machine learning is a subset of AI that enables systems to learn from data...', order: 1, duration: 15 },
            { title: 'Types of ML: Supervised, Unsupervised, Reinforcement', type: 'text', content: 'There are three main types of machine learning...', order: 2, duration: 20 },
          ],
        },
        {
          title: 'Linear Regression',
          order: 2,
          lessons: [
            { title: 'Simple Linear Regression', type: 'text', content: 'Linear regression models the relationship between variables...', order: 1, duration: 25 },
            { title: 'Multiple Regression', type: 'text', content: 'Multiple regression extends linear regression to multiple features...', order: 2, duration: 30 },
          ],
        },
      ],
    },
    {
      title: 'Full-Stack Web Development with React & Node.js',
      description: 'Build production-grade web applications from scratch. Learn React 18, Node.js, Express, MongoDB, REST APIs, authentication, and deployment on AWS.',
      instructor: teacher2._id,
      category: 'Programming',
      difficulty: 'Intermediate',
      tags: ['React', 'Node.js', 'MongoDB', 'Express', 'JavaScript'],
      objectives: ['Build full-stack applications', 'Design RESTful APIs', 'Deploy to cloud platforms'],
      prerequisites: ['JavaScript fundamentals', 'HTML/CSS basics'],
      duration: 60,
      isPublished: true,
      enrollmentCount: 1230,
      rating: 4.9,
      ratingCount: 341,
      modules: [
        {
          title: 'React Fundamentals',
          order: 1,
          lessons: [
            { title: 'Components & JSX', type: 'text', content: 'React components are the building blocks...', order: 1, duration: 20 },
            { title: 'State and Props', type: 'text', content: 'State is mutable data managed by a component...', order: 2, duration: 25 },
            { title: 'Hooks Deep Dive', type: 'text', content: 'React Hooks allow you to use state in functional components...', order: 3, duration: 35 },
          ],
        },
        {
          title: 'Node.js & Express API',
          order: 2,
          lessons: [
            { title: 'RESTful API Design', type: 'text', content: 'REST APIs use HTTP methods and resource-based URLs...', order: 1, duration: 30 },
            { title: 'Authentication with JWT', type: 'text', content: 'JSON Web Tokens provide stateless authentication...', order: 2, duration: 40 },
          ],
        },
      ],
    },
    {
      title: 'UI/UX Design Principles',
      description: 'Master the art and science of user interface and user experience design. From wireframing to high-fidelity prototypes using Figma.',
      instructor: teacher1._id,
      category: 'Design',
      difficulty: 'Beginner',
      tags: ['Figma', 'UX', 'Wireframing', 'Prototyping'],
      objectives: ['Apply design thinking methodology', 'Create wireframes and prototypes', 'Conduct user research'],
      prerequisites: ['None'],
      duration: 25,
      isPublished: true,
      enrollmentCount: 562,
      rating: 4.7,
      ratingCount: 156,
      modules: [
        {
          title: 'Design Thinking',
          order: 1,
          lessons: [
            { title: 'Empathize & Define', type: 'text', content: 'The first two stages of design thinking...', order: 1, duration: 20 },
          ],
        },
      ],
    },
    {
      title: 'Data Structures & Algorithms',
      description: 'Master fundamental data structures and algorithmic thinking. Essential preparation for technical interviews at top tech companies.',
      instructor: teacher2._id,
      category: 'Programming',
      difficulty: 'Advanced',
      tags: ['DSA', 'Python', 'Interview Prep', 'Algorithms'],
      objectives: ['Implement core data structures', 'Analyze time/space complexity', 'Solve LeetCode-style problems'],
      prerequisites: ['Programming in any language', 'Basic math'],
      duration: 50,
      isPublished: true,
      enrollmentCount: 993,
      rating: 4.9,
      ratingCount: 278,
      modules: [],
    },
  ]);
  console.log('✅ Courses created');

  // Create badges
  await Badge.create([
    { name: 'First Steps', description: 'Complete your first lesson', icon: '🎯', criteria: 'complete_first_lesson', xpValue: 50, rarity: 'common' },
    { name: 'Quiz Master', description: 'Score 100% on any quiz', icon: '🏆', criteria: 'perfect_quiz', xpValue: 200, rarity: 'rare' },
    { name: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: '🔥', criteria: 'streak_7', xpValue: 150, rarity: 'rare' },
    { name: 'Course Champion', description: 'Complete your first course', icon: '🎓', criteria: 'complete_course', xpValue: 500, rarity: 'epic' },
    { name: 'Knowledge Seeker', description: 'Enroll in 5 courses', icon: '📚', criteria: 'enroll_5', xpValue: 300, rarity: 'rare' },
    { name: 'Legend', description: 'Reach Expert level (5000 XP)', icon: '⭐', criteria: 'reach_expert', xpValue: 1000, rarity: 'legendary' },
    { name: 'Discussion Leader', description: 'Start 10 discussions', icon: '💬', criteria: 'discussions_10', xpValue: 250, rarity: 'rare' },
    { name: 'Night Owl', description: 'Study after midnight', icon: '🦉', criteria: 'study_late', xpValue: 75, rarity: 'common' },
  ]);
  console.log('✅ Badges created');

  // Create University Competencies & Concepts for ML Fundamentals Course
  const comp1 = await Competency.create({
    title: 'Foundations of Machine Learning Paradigms',
    code: 'COMP-ML-01',
    description: 'Understand the fundamental categories of ML algorithms, training objectives, and basic predictive modeling.',
    domain: 'Data Science & AI',
    targetAudience: 'Undergraduate',
    course: courses[0]._id,
    learningOutcomes: [
      'Distinguish between supervised, unsupervised, and reinforcement learning',
      'Explain model generalization, underfitting, and overfitting',
      'Implement linear and logistic classification pipelines',
    ],
    createdBy: teacher1._id,
  });

  const comp2 = await Competency.create({
    title: 'Model Validation & Evaluation Metrics',
    code: 'COMP-ML-02',
    description: 'Rigorous empirical evaluation of machine learning models using cross-validation and classification metrics.',
    domain: 'Data Science & AI',
    targetAudience: 'Undergraduate',
    course: courses[0]._id,
    learningOutcomes: [
      'Implement k-fold cross-validation strategies',
      'Analyze precision, recall, and F1 tradeoffs in imbalanced datasets',
    ],
    prerequisites: [comp1._id],
    createdBy: teacher1._id,
  });

  // Concepts
  const concSupervised = await Concept.create({
    name: 'Supervised vs. Unsupervised Learning',
    code: 'CONC-ML-SUPERVISED',
    description: 'Differences between labeled target prediction and unlabeled pattern clustering.',
    competency: comp1._id,
    course: courses[0]._id,
    moduleIndex: 0,
    lessonIndex: 0,
    difficulty: 'beginner',
    difficultyWeight: 1.0,
    tags: ['Supervised', 'Unsupervised', 'Labels'],
  });

  const concOverfit = await Concept.create({
    name: 'Overfitting & Generalization',
    code: 'CONC-ML-OVERFIT',
    description: 'Mechanisms of high variance, training loss vs test loss divergence, and generalization error.',
    competency: comp1._id,
    course: courses[0]._id,
    moduleIndex: 0,
    lessonIndex: 1,
    difficulty: 'intermediate',
    difficultyWeight: 1.3,
    prerequisites: [concSupervised._id],
    tags: ['Overfitting', 'Variance', 'Generalization'],
  });

  const concLogReg = await Concept.create({
    name: 'Logistic Regression Classification',
    code: 'CONC-ML-LOGREG',
    description: 'Binary classification using sigmoid link function and log-loss optimization.',
    competency: comp1._id,
    course: courses[0]._id,
    moduleIndex: 1,
    lessonIndex: 0,
    difficulty: 'intermediate',
    difficultyWeight: 1.2,
    prerequisites: [concSupervised._id],
    tags: ['Classification', 'Logistic Regression'],
  });

  const concCrossVal = await Concept.create({
    name: 'K-Fold Cross-Validation',
    code: 'CONC-ML-CROSSVAL',
    description: 'Partitioning datasets into k folds to reliably estimate out-of-sample error.',
    competency: comp2._id,
    course: courses[0]._id,
    moduleIndex: 1,
    lessonIndex: 1,
    difficulty: 'intermediate',
    difficultyWeight: 1.4,
    prerequisites: [concOverfit._id],
    tags: ['Validation', 'Resampling', 'Cross-Validation'],
  });

  const concMetrics = await Concept.create({
    name: 'Precision, Recall & F1 Evaluation',
    code: 'CONC-ML-METRICS',
    description: 'Confusion matrix derivations and harmonic mean metrics for skewed distributions.',
    competency: comp2._id,
    course: courses[0]._id,
    moduleIndex: 1,
    lessonIndex: 1,
    difficulty: 'advanced',
    difficultyWeight: 1.5,
    prerequisites: [concLogReg._id],
    tags: ['Metrics', 'F1-Score', 'Precision', 'Recall'],
  });

  // Link competencies to course
  await Course.findByIdAndUpdate(courses[0]._id, {
    $set: {
      competencies: [comp1._id, comp2._id],
      'modules.0.lessons.0.concepts': [concSupervised._id],
      'modules.0.lessons.1.concepts': [concOverfit._id],
      'modules.1.lessons.0.concepts': [concLogReg._id],
      'modules.1.lessons.1.concepts': [concCrossVal._id, concMetrics._id],
    },
  });
  console.log('✅ Competencies & Concepts created and linked to Course');

  // Create a quiz with concept-level tagging
  await Quiz.create({
    course: courses[0]._id,
    title: 'ML Fundamentals Quiz',
    description: 'Test your understanding of core machine learning concepts',
    timeLimit: 20,
    passingScore: 70,
    isPublished: true,
    xpReward: 100,
    questions: [
      {
        text: 'Which type of machine learning uses labeled training data?',
        options: ['Unsupervised Learning', 'Supervised Learning', 'Reinforcement Learning', 'Transfer Learning'],
        correctIndex: 1,
        explanation: 'Supervised learning uses input-output pairs (labeled data) to train models.',
        points: 1,
        concept: concSupervised._id,
        cognitiveLevel: 'remember',
        status: 'approved',
        distractorRationales: [
          'Unsupervised learning works on unlabeled data',
          'Correct answer',
          'Reinforcement learning uses reward signals, not static labeled pairs',
          'Transfer learning is a technique rather than the paradigm definition',
        ],
      },
      {
        text: 'What does overfitting mean in ML?',
        options: ['Model performs poorly on training data', 'Model performs well on training but poorly on new data', 'Model is too simple', 'Model uses too little data'],
        correctIndex: 1,
        explanation: 'Overfitting occurs when a model memorizes training data but fails to generalize.',
        points: 1,
        concept: concOverfit._id,
        cognitiveLevel: 'understand',
        status: 'approved',
        distractorRationales: [
          'This describes underfitting or poor optimization',
          'Correct answer',
          'Too simple indicates high bias (underfitting)',
          'Small data may exacerbate overfitting, but is not its definition',
        ],
      },
      {
        text: 'Which algorithm is best suited for binary classification?',
        options: ['Linear Regression', 'K-Means', 'Logistic Regression', 'PCA'],
        correctIndex: 2,
        explanation: 'Logistic Regression is designed for binary (two-class) classification problems.',
        points: 1,
        concept: concLogReg._id,
        cognitiveLevel: 'apply',
        status: 'approved',
      },
      {
        text: 'What is the purpose of cross-validation?',
        options: ['Speed up training', 'Evaluate model generalization', 'Reduce dataset size', 'Increase model complexity'],
        correctIndex: 1,
        explanation: 'Cross-validation estimates how well a model will generalize to unseen data.',
        points: 1,
        concept: concCrossVal._id,
        cognitiveLevel: 'understand',
        status: 'approved',
      },
      {
        text: 'Which metric is most appropriate for imbalanced classification?',
        options: ['Accuracy', 'Precision', 'F1 Score', 'Mean Squared Error'],
        correctIndex: 2,
        explanation: 'F1 Score balances precision and recall, making it suitable for imbalanced datasets.',
        points: 1,
        concept: concMetrics._id,
        cognitiveLevel: 'analyze',
        status: 'approved',
      },
    ],
  });
  console.log('✅ Quizzes created with Concept-Level Quality Tags');

  // ── Enrollments for Student A & B in Course 2 (Full-Stack & Security) ────────
  const fullStackCourse = courses[1];
  await Enrollment.create([
    { student: student1._id, course: fullStackCourse._id, progress: 45 },
    { student: student2._id, course: fullStackCourse._id, progress: 50 },
  ]);
  console.log('✅ Enrolled Student A (Arjun) and Student B (Priya) in Full-Stack Course');

  // ── Master Syllabus (Owned by Teacher, Immutable by Students) ────────────────
  const masterSyllabus = await MasterSyllabus.create({
    course: fullStackCourse._id,
    title: 'Full-Stack Web Architecture & Cybersecurity — Master Syllabus',
    version: 1,
    isMaster: true,
    createdBy: teacher2._id,
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
        title: 'Database Systems & Cloud Persistence',
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
    versionHistory: [
      {
        versionNumber: 1,
        changeLog: 'Initial approved master syllabus uploaded by faculty.',
        updatedBy: teacher2._id,
        updatedAt: new Date(),
      },
    ],
  });
  console.log('✅ Master Syllabus Created for Course 2 (Version 1)');

  // ── Seed Adaptive Quiz for Course 2 with HOT/LOT & Difficulty Mix ───────────
  const fullStackQuiz = await Quiz.create({
    course: fullStackCourse._id,
    title: 'Adaptive Assessment: Full-Stack Architecture & Cryptographic Security',
    description: 'Covers core web architecture and information security with a 60% LOT / 40% HOT cognitive distribution.',
    timeLimit: 20,
    passingScore: 70,
    xpReward: 75,
    isPublished: true,
    questions: [
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
        status: 'approved',
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
          'To automatically serialize components into local storage',
        ],
        correctIndex: 1,
        explanation: 'When component dependencies change rapidly or unmount occurs before network response, setting state causes memory leaks and race conditions.',
        status: 'approved',
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
          'Both patterns behave identically under high concurrency.',
        ],
        correctIndex: 0,
        explanation: 'Under flash sale concurrency, write-through keeps cache fresh on every update at the expense of higher write latency; cache-aside only caches on demand, causing initial cache-miss penalties and potential stale inventory reads.',
        status: 'approved',
        points: 1,
      },
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
          'Encryption produces identical outputs for any given input without keys.',
        ],
        correctIndex: 1,
        explanation: 'Hashing maps arbitrary data to a fixed-size digest in a strictly one-way process. Encryption transforms plaintext into ciphertext and is designed to be reversed with a decryption key.',
        status: 'approved',
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
          'There is no risk because localStorage is automatically encrypted with the user password.',
        ],
        correctIndex: 0,
        explanation: 'localStorage is fully accessible to any JavaScript running in the origin. An XSS payload can exfiltrate tokens. Moving refresh tokens to httpOnly cookies blocks JavaScript access completely.',
        status: 'approved',
        points: 1,
      },
    ],
  });
  console.log('✅ Adaptive Assessment Quiz Created with HOT/LOT & Difficulty Tags');

  // ── STUDENT A (Arjun): Strong in Full Stack (95%), Weak in Cybersecurity (30%) ──
  await SkillProfile.create({
    student: student1._id,
    course: fullStackCourse._id,
    topicMasteries: [
      { topicName: 'RESTful API Design & HTTP Protocols', skillArea: 'Full Stack', masteryScore: 95, status: 'Strong', attemptsCount: 2, lastScore: 100 },
      { topicName: 'Asynchronous State & React Hooks', skillArea: 'Full Stack', masteryScore: 92, status: 'Strong', attemptsCount: 2, lastScore: 95 },
      { topicName: 'Full Stack Microservices & Caching', skillArea: 'Full Stack', masteryScore: 90, status: 'Strong', attemptsCount: 2, lastScore: 90 },
      { topicName: 'Cryptographic Primitives: Hashing vs Encryption', skillArea: 'Cybersecurity', masteryScore: 25, status: 'Weak', attemptsCount: 2, lastScore: 20 },
      { topicName: 'Web Vulnerabilities & OWASP Top 10 Mitigation', skillArea: 'Cybersecurity', masteryScore: 35, status: 'Weak', attemptsCount: 2, lastScore: 40 },
      { topicName: 'Zero-Trust Architecture & Threat Modeling', skillArea: 'Cybersecurity', masteryScore: 20, status: 'Weak', attemptsCount: 1, lastScore: 20 },
    ],
    hotScore: 50,
    lotScore: 65,
    hotVerdict: 'High recall on web syntax (LOT: 65%), but exhibits severe vulnerability diagnosis lapses in security (HOT: 50%). Prerequisite scaffolding required.',
    overallAccuracy: 60,
    quizzesCompletedCount: 1,
  });

  await PersonalizedPlan.create({
    student: student1._id,
    course: fullStackCourse._id,
    masterSyllabus: masterSyllabus._id,
    masterVersion: 1,
    planTitle: 'Personalized Adaptive Syllabus — Arjun Sharma',
    summaryNarrative: 'Customized learning sequence: Cybersecurity topics prioritized at the top with prerequisite scaffolding; Full Stack topics compressed to advanced engineering challenges.',
    teacherApproved: true,
    adaptedTopics: [
      {
        topicName: 'Cryptographic Primitives: Hashing vs Encryption',
        skillArea: 'Cybersecurity',
        originalUnitNumber: 2,
        priorityRank: 1,
        status: 'Weak',
        adaptationType: 'expanded_remediation',
        addedPrerequisites: ['Discrete Mathematics', 'Modular Arithmetic Primer'],
        reason: 'Prioritized because your current mastery is 25% in Cryptographic Primitives. Added prerequisite revision and targeted practice.',
        aiExplanationSummary: 'Focus on one-way mathematical trapdoor functions versus keyed reversible ciphers. Practice distinguishing password salting from symmetric encryption.',
        studySchedule: { dailyMinutes: 35, durationWeeks: 2, recommendedDaysPerWeek: 5 },
        curatedResources: [
          { title: 'NPTEL: Applied Cryptography Lecture Series', url: 'https://nptel.ac.in/courses/106/106/106106199/', type: 'video', source: 'NPTEL' },
          { title: 'iGOT Karmayogi: Information Assurance Foundations', url: 'https://igotkarmayogi.gov.in/learn/course/do_313', type: 'course', source: 'iGOT Karmayogi' },
          { title: 'RFC 2898: Password-Based Cryptography (PBKDF2 / bcrypt)', url: 'https://datatracker.ietf.org/doc/html/rfc2898', type: 'documentation', source: 'Official Docs' },
        ],
      },
      {
        topicName: 'Web Vulnerabilities & OWASP Top 10 Mitigation',
        skillArea: 'Cybersecurity',
        originalUnitNumber: 2,
        priorityRank: 2,
        status: 'Weak',
        adaptationType: 'expanded_remediation',
        addedPrerequisites: ['Cryptographic Primitives: Hashing vs Encryption', 'HTTP State & Cookies'],
        reason: 'Prioritized because your current mastery is 35% in Web Vulnerabilities. Added XSS and cookie-defense modules.',
        studySchedule: { dailyMinutes: 35, durationWeeks: 2, recommendedDaysPerWeek: 5 },
        curatedResources: [
          { title: 'OWASP Top 10 Web Application Security Risks', url: 'https://owasp.org/www-project-top-ten/', type: 'article', source: 'Official Docs' },
        ],
      },
      {
        topicName: 'Document Modeling & Compound Indexing',
        skillArea: 'Databases',
        originalUnitNumber: 3,
        priorityRank: 3,
        status: 'Average',
        adaptationType: 'standard',
        addedPrerequisites: [],
        reason: 'Maintained in standard curriculum flow with targeted reinforcement (50% mastery).',
      },
      {
        topicName: 'RESTful API Design & HTTP Protocols',
        skillArea: 'Full Stack',
        originalUnitNumber: 1,
        priorityRank: 4,
        status: 'Strong',
        adaptationType: 'compressed_advanced',
        addedPrerequisites: [],
        reason: 'Fast-tracked because you achieved 95% mastery. Routine lectures compressed to make room for advanced research challenges.',
        advancedChallenges: ['Design an asynchronous, distributed GraphQL gateway with circuit-breaker fault tolerance.'],
      },
      {
        topicName: 'Asynchronous State & React Hooks',
        skillArea: 'Full Stack',
        originalUnitNumber: 1,
        priorityRank: 5,
        status: 'Strong',
        adaptationType: 'compressed_advanced',
        addedPrerequisites: [],
        reason: 'Fast-tracked because you achieved 92% mastery.',
        advancedChallenges: ['Implement a concurrent custom state machine with Web Worker offloading.'],
      },
    ],
  });
  console.log('✅ Student A (Arjun) Personalized Plan Created (Cybersecurity Expanded at Top)');

  // ── STUDENT B (Priya): Weak in Full Stack (35%), Strong in Cybersecurity (92%) ──
  await SkillProfile.create({
    student: student2._id,
    course: fullStackCourse._id,
    topicMasteries: [
      { topicName: 'RESTful API Design & HTTP Protocols', skillArea: 'Full Stack', masteryScore: 35, status: 'Weak', attemptsCount: 2, lastScore: 30 },
      { topicName: 'Asynchronous State & React Hooks', skillArea: 'Full Stack', masteryScore: 30, status: 'Weak', attemptsCount: 2, lastScore: 30 },
      { topicName: 'Full Stack Microservices & Caching', skillArea: 'Full Stack', masteryScore: 40, status: 'Weak', attemptsCount: 2, lastScore: 40 },
      { topicName: 'Cryptographic Primitives: Hashing vs Encryption', skillArea: 'Cybersecurity', masteryScore: 95, status: 'Strong', attemptsCount: 2, lastScore: 100 },
      { topicName: 'Web Vulnerabilities & OWASP Top 10 Mitigation', skillArea: 'Cybersecurity', masteryScore: 90, status: 'Strong', attemptsCount: 2, lastScore: 95 },
      { topicName: 'Zero-Trust Architecture & Threat Modeling', skillArea: 'Cybersecurity', masteryScore: 88, status: 'Strong', attemptsCount: 2, lastScore: 90 },
    ],
    hotScore: 50,
    lotScore: 65,
    hotVerdict: 'Demonstrates deep architectural judgment in defensive security (HOT: 88%), but struggles on web state and asynchronous API design (LOT: 35%).',
    overallAccuracy: 60,
    quizzesCompletedCount: 1,
  });

  await PersonalizedPlan.create({
    student: student2._id,
    course: fullStackCourse._id,
    masterSyllabus: masterSyllabus._id,
    masterVersion: 1,
    planTitle: 'Personalized Adaptive Syllabus — Priya Patel',
    summaryNarrative: 'Customized learning sequence: Full Stack topics prioritized at the top with prerequisite scaffolding; Cybersecurity topics compressed to advanced exploit defense.',
    teacherApproved: true,
    adaptedTopics: [
      {
        topicName: 'RESTful API Design & HTTP Protocols',
        skillArea: 'Full Stack',
        originalUnitNumber: 1,
        priorityRank: 1,
        status: 'Weak',
        adaptationType: 'expanded_remediation',
        addedPrerequisites: ['Basic JavaScript Event Loop', 'HTTP Protocol Request-Response RFC'],
        reason: 'Prioritized because your current mastery is 35% in RESTful API Design. Added prerequisite revision and targeted practice.',
        studySchedule: { dailyMinutes: 35, durationWeeks: 2, recommendedDaysPerWeek: 5 },
        curatedResources: [
          { title: 'MDN Web Docs: HTTP Overview & Methods', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', type: 'documentation', source: 'Official Docs' },
          { title: 'SWAYAM / NPTEL: Web Development Fundamentals', url: 'https://swayam.gov.in/explorer', type: 'course', source: 'SWAYAM' },
        ],
      },
      {
        topicName: 'Asynchronous State & React Hooks',
        skillArea: 'Full Stack',
        originalUnitNumber: 1,
        priorityRank: 2,
        status: 'Weak',
        adaptationType: 'expanded_remediation',
        addedPrerequisites: ['RESTful API Design & HTTP Protocols', 'JavaScript Promises & Async/Await'],
        reason: 'Prioritized because your current mastery is 30% in Asynchronous State. Added memory leak & race condition cleanup labs.',
        studySchedule: { dailyMinutes: 35, durationWeeks: 2, recommendedDaysPerWeek: 5 },
      },
      {
        topicName: 'Full Stack Microservices & Caching',
        skillArea: 'Full Stack',
        originalUnitNumber: 1,
        priorityRank: 3,
        status: 'Weak',
        adaptationType: 'expanded_remediation',
        addedPrerequisites: ['Asynchronous State & React Hooks'],
        reason: 'Prioritized because your current mastery is 40% in Microservices & Caching. Added Redis cache-aside vs write-through labs.',
        studySchedule: { dailyMinutes: 30, durationWeeks: 2, recommendedDaysPerWeek: 4 },
      },
      {
        topicName: 'Cryptographic Primitives: Hashing vs Encryption',
        skillArea: 'Cybersecurity',
        originalUnitNumber: 2,
        priorityRank: 4,
        status: 'Strong',
        adaptationType: 'compressed_advanced',
        addedPrerequisites: [],
        reason: 'Fast-tracked because you achieved 95% mastery. Routine lectures compressed to make room for advanced research challenges.',
        advancedChallenges: ['Implement zero-knowledge proofs (zk-SNARKs) for privacy-preserving authentication.'],
      },
      {
        topicName: 'Web Vulnerabilities & OWASP Top 10 Mitigation',
        skillArea: 'Cybersecurity',
        originalUnitNumber: 2,
        priorityRank: 5,
        status: 'Strong',
        adaptationType: 'compressed_advanced',
        addedPrerequisites: [],
        reason: 'Fast-tracked because you achieved 90% mastery.',
        advancedChallenges: ['Construct an automated taint-analysis scanner to detect prototype pollution and SSRF in CI/CD pipelines.'],
      },
    ],
  });
  console.log('✅ Student B (Priya) Personalized Plan Created (Full Stack Expanded at Top)');

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────');
  console.log('Test Credentials:');
  console.log('  Admin:   admin@adaptiq.com   / Admin@1234');
  console.log('  Teacher: sarah@adaptiq.com   / Teacher@1234');
  console.log('  Student: arjun@adaptiq.com   / Student@1234');
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
};

seed().catch((err) => { console.error(err); process.exit(1); });

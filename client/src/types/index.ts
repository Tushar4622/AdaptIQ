// src/types/index.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string;
  bio?: string;
  institution?: string;
  course?: string;
  careerGoals?: string;
  xp: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  streak: number;
  isActive: boolean;
  createdAt: string;
}

export interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  instructor: Pick<User, '_id' | 'name' | 'avatar' | 'bio'>;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  banner?: string;
  tags: string[];
  thumbnail?: string;
  objectives: string[];
  prerequisites: string[];
  competencies?: string[] | Competency[];
  curriculum?: CurriculumItem[];
  stages?: string[];
  duration: number;
  isPublished: boolean;
  enrollmentCount: number;
  rating: number;
  ratingCount: number;
  modules?: Module[];
  createdAt: string;
}

export interface Module {
  _id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  _id: string;
  title: string;
  type: 'video' | 'text' | 'document';
  content?: string;
  videoUrl?: string;
  duration?: number;
  order: number;
  concepts?: string[] | Concept[];
}

export interface CurriculumItem {
  _id?: string;
  title: string;
  description?: string;
  order: number;
}

export interface Enrollment {
  _id: string;
  student: string | User;
  course: string | Course;
  progress: number;
  completedLessons: string[];
  completedAt?: string;
  grade?: string;
  createdAt: string;
}

export interface Quiz {
  _id: string;
  course: string | Course;
  title: string;
  description?: string;
  timeLimit: number;
  passingScore: number;
  questions: Question[];
  isPublished: boolean;
  xpReward: number;
}

// Bloom's Taxonomy — thinking order classification
export type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type ThinkingOrder = 'lot' | 'hot';

/** Lower Order Thinking levels (L1–L3) */
export const LOT_LEVELS: CognitiveLevel[] = ['remember', 'understand', 'apply'];
/** Higher Order Thinking levels (L4–L6) */
export const HOT_LEVELS: CognitiveLevel[] = ['analyze', 'evaluate', 'create'];

export const getThinkingOrder = (level?: CognitiveLevel | string): ThinkingOrder =>
  HOT_LEVELS.includes(level as CognitiveLevel) ? 'hot' : 'lot';

export interface Question {
  _id?: string;
  text: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  points: number;
  concept?: string | Concept;
  cognitiveLevel?: CognitiveLevel;
  /** Derived from cognitiveLevel — 'lot' for L1–L3, 'hot' for L4–L6 */
  thinkingOrder?: ThinkingOrder;
  status?: 'ai_draft' | 'flagged' | 'approved' | 'rejected';
  reviewNotes?: string;
  distractorRationales?: string[];
}

export interface ConceptBreakdown {
  concept: string;
  conceptName: string;
  correctCount: number;
  totalCount: number;
  masteryScore: number;
  status: 'unmet' | 'in-progress' | 'mastered';
}

export interface QuizAttempt {
  _id: string;
  student: string;
  quiz: string | Quiz;
  score: number;
  passed: boolean;
  timeTaken?: number;
  aiFeedback?: string;
  completedAt: string;
  details?: { questionIndex: number; selectedIndex: number; isCorrect: boolean; responseTime?: number; concept?: string }[];
  conceptBreakdown?: ConceptBreakdown[];
  detectedGaps?: ConceptBreakdown[];
  totalQuestions?: number;
  correct?: number;
}

export interface Assignment {
  _id: string;
  course: string | Course;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  xpReward: number;
  attachments?: string[];
  isClosed?: boolean;
}

export interface Submission {
  _id: string;
  assignment: string | Assignment;
  student: string | User;
  content?: string;
  attachments?: string[];
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
  gradedAt?: string;
  createdAt: string;
}

export interface Concept {
  _id: string;
  name: string;
  code: string;
  description?: string;
  competency: string | Competency;
  course?: string;
  moduleIndex?: number;
  lessonIndex?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficultyWeight?: number;
  prerequisites?: (string | Concept)[];
  tags?: string[];
  createdAt?: string;
}

export interface Competency {
  _id: string;
  title: string;
  code: string;
  description?: string;
  domain: string;
  targetAudience?: string;
  course?: string | Course;
  learningOutcomes?: string[];
  prerequisites?: (string | Competency)[];
  concepts?: Concept[];
  isActive?: boolean;
  createdAt?: string;
}

export interface LearnerMasteryRecord {
  _id: string;
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  competencyTitle?: string;
  masteryScore: number;
  confidence: number;
  status: 'unmet' | 'in-progress' | 'mastered';
  totalAttempts: number;
  correctAttempts: number;
  avgResponseLatency: number;
  lastAssessedAt: string;
}

export interface CompetencyGraphNode {
  id: string;
  code: string;
  label: string;
  type: 'competency' | 'concept';
  domain?: string;
  difficulty?: string;
  competencyId?: string;
  moduleIndex?: number;
  lessonIndex?: number;
}

export interface CompetencyGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
}

export interface CompetencyGraphResponse {
  courseId?: string;
  nodesCount: number;
  edgesCount: number;
  graph: {
    nodes: CompetencyGraphNode[];
    edges: CompetencyGraphEdge[];
  };
}

export interface RemedialRecommendation {
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  urgency: 'high' | 'medium';
  suggestedAction: string;
  moduleIndex: number;
  lessonIndex: number;
}

export interface RemedialStep {
  step: number;
  type: 'foundational_prerequisite' | 'core_remediation' | 'practice_assessment';
  priority: 'high' | 'medium' | 'low';
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  competencyTitle?: string;
  currentMastery?: number;
  title: string;
  courseId?: string;
  courseTitle?: string;
  moduleIndex?: number;
  lessonIndex?: number;
  lessonTitle?: string;
  lessonType?: string;
  duration?: number;
  quizId?: string;
  passingScore?: number;
  timeLimit?: number;
  route: string;
  rationale: string;
}

export interface RemedialPathResponse {
  hasGaps: boolean;
  message?: string;
  weakConceptsCount?: number;
  totalRemedialSteps?: number;
  path: RemedialStep[];
}

export interface LearnerMasteryResponse {
  summary: {
    totalTracked: number;
    masteredCount: number;
    inProgressCount: number;
    gapsCount: number;
    overallMasteryPct: number;
  };
  mastered: LearnerMasteryRecord[];
  inProgress: LearnerMasteryRecord[];
  gaps: LearnerMasteryRecord[];
  recommendations: RemedialRecommendation[];
}

export interface CohortConceptBreakdown {
  conceptId: string;
  conceptName: string;
  conceptCode: string;
  competencyTitle: string;
  difficulty: string;
  studentsAssessed: number;
  averageMastery: number;
  gapPercentage: number;
  gapCount: number;
  inProgressCount: number;
  masteredCount: number;
  avgLatencySeconds: number;
  riskLevel: 'critical' | 'moderate' | 'low';
}

export interface CohortGapsResponse {
  course: { id: string; title: string };
  totalAssessedStudents: number;
  cohortBreakdown: CohortConceptBreakdown[];
  highRiskConcepts: CohortConceptBreakdown[];
}

export interface Skill {
  _id: string;
  user: string;
  name: string;
  category: string;
  proficiency: number;
  status: 'acquired' | 'in-progress' | 'gap';
  source?: 'ai' | 'user';
  lastAnalyzed: string;
}

export interface Badge {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  criteria: string;
  xpValue: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earned?: boolean;
  earnedAt?: string;
}

export interface AwardedBadge {
  _id: string;
  name: string;
  icon?: string;
  criteria: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpValue: number;
}

export interface Discussion {
  _id: string;
  course: string;
  title: string;
  messages: Message[];
  isLocked: boolean;
  createdAt: string;
}

export interface Message {
  _id: string;
  author: Pick<User, '_id' | 'name' | 'avatar' | 'role'>;
  content: string;
  isPinned: boolean;
  likes: string[];
  replies: Reply[];
  createdAt: string;
}

export interface Reply {
  _id?: string;
  author: Pick<User, '_id' | 'name' | 'avatar'>;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  sender: Pick<User, '_id' | 'name' | 'avatar' | 'role'>;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  course?: Pick<Course, '_id' | 'title' | 'banner' | 'thumbnail'> | null;
  participants: Pick<User, '_id' | 'name' | 'avatar' | 'role'>[];
  otherParticipant?: Pick<User, '_id' | 'name' | 'avatar' | 'role'>;
  messages: ChatMessage[];
  lastMessageAt: string;
  createdAt: string;
}

export interface MarketTrend {
  topSkills: { skill: string; demand: number; growth: number; category: string; avgSalary: string }[];
  industries: { name: string; topSkills: string[]; hiringTrend: string }[];
  emergingTech: string[];
  careerPaths: { title: string; requiredSkills: string[]; avgSalary: string; demand: string }[];
  summary: string;
}

export interface LiveClassParticipant {
  student: Pick<User, '_id' | 'name' | 'avatar'>;
  registeredAt: string;
  joinedAt?: string | null;
  cameraApproved?: boolean;
  cameraApprovedAt?: string | null;
}

export interface LiveClass {
  _id: string;
  course: Pick<Course, '_id' | 'title' | 'banner' | 'thumbnail'>;
  teacher: Pick<User, '_id' | 'name' | 'avatar'>;
  title: string;
  agenda?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meetingCode: string;
  participants: LiveClassParticipant[];
  registeredCount: number;
  joinedCount: number;
  isRegistered: boolean;
  canJoin: boolean;
  currentUserCameraApproved?: boolean;
  spotlightStudent?: Pick<User, '_id' | 'name' | 'avatar' | 'role'> | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  payload?: {
    liveClassId?: string;
    courseId?: string;
    assignmentId?: string;
    quizId?: string;
    submissionId?: string;
    route?: string;
    meetingCode?: string;
    scheduledAt?: string;
    status?: string;
  };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface CourseAnalyticsOverview {
  totalStudents: number;
  completedCourseStudents: number;
  courseCompletionRate: number;
  totalAssignments: number;
  totalQuizzes: number;
  totalAssignmentSubmissions: number;
  totalQuizAttempts: number;
  uniqueAssignmentCompleters: number;
  uniqueQuizCompleters: number;
  averageQuizScore: number;
}

export interface CourseAssignmentAnalytics {
  _id: string;
  title: string;
  dueDate: string;
  submissions: number;
  gradedSubmissions: number;
  uniqueStudents: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
}

export interface CourseQuizAnalytics {
  _id: string;
  title: string;
  passingScore: number;
  attempts: number;
  passedAttempts: number;
  uniqueStudents: number;
  averageScore: number;
}

export interface CourseAnalyticsPayload {
  course: {
    _id: string;
    title: string;
  };
  overview: CourseAnalyticsOverview;
  assignments: CourseAssignmentAnalytics[];
  quizzes: CourseQuizAnalytics[];
}

export interface ApiError {
  error: string;
  errors?: { msg: string; path: string }[];
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// ── Master Syllabus & Personalized Curriculum Types ─────────────────────────
export interface SyllabusTopic {
  _id?: string;
  name: string;
  code?: string;
  skillArea: string;
  difficulty: 'Easy' | 'Moderate' | 'Tough';
  description: string;
  prerequisites: string[];
  subtopics: string[];
  estimatedHours: number;
}

export interface SyllabusUnit {
  _id?: string;
  unitNumber: number;
  title: string;
  description: string;
  topics: SyllabusTopic[];
}

export interface MasterSyllabus {
  _id: string;
  course: string;
  title: string;
  version: number;
  isMaster: boolean;
  units: SyllabusUnit[];
  rawSourceText?: string;
  versionHistory?: { versionNumber: number; changeLog: string; updatedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CuratedResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'practice' | 'course';
  source: string;
  verified?: boolean;
}

export interface AdaptedTopic {
  _id?: string;
  topicName: string;
  skillArea: string;
  originalUnitNumber: number;
  originalTopicOrder: number;
  priorityRank: number;
  status: 'Weak' | 'Average' | 'Strong';
  adaptationType: 'expanded_remediation' | 'standard' | 'compressed_advanced';
  addedPrerequisites: string[];
  reason: string;
  aiExplanationSummary?: string;
  studySchedule?: {
    dailyMinutes: number;
    durationWeeks: number;
    recommendedDaysPerWeek: number;
  };
  curatedResources?: CuratedResource[];
  practiceItems?: { questionStem: string; difficulty: string; thinkingLevel: string }[];
  advancedChallenges?: string[];
  isCompleted?: boolean;
}

export interface PersonalizedPlan {
  _id: string;
  student: string | User;
  course: string | Course;
  masterSyllabus: string | MasterSyllabus;
  masterVersion: number;
  planTitle: string;
  summaryNarrative: string;
  adaptedTopics: AdaptedTopic[];
  teacherApproved: boolean;
  teacherOverrides?: string;
  generatedAt: string;
}

export interface DetailedQuizReport {
  overallSummary: string;
  topicPerformance: {
    topicName: string;
    skillArea: string;
    score: number;
    strengthLabel: 'Strong' | 'Average' | 'Weak';
    feedback: string;
  }[];
  questionTypeAnalysis: {
    mcqAccuracy: number;
    scenarioAccuracy: number;
    caseStudyAccuracy: number;
    verdict: string;
  };
  hotVsLotAnalysis: {
    lotScore: number;
    hotScore: number;
    verdict: string;
  };
  mistakePatterns: string[];
  detailedNotes: string[];
  timeAnalysis: {
    avgSecondsPerQuestion: number;
    paceCategory: 'Rushed' | 'Balanced' | 'Overthinking';
    advice: string;
  };
  nextSteps: string[];
}


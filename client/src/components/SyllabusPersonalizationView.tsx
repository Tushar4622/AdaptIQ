import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { retryAiRequest } from '@/lib/aiRequest';
import { Card, CardHeader, CardBody, Button, StatusBadge, Alert, Skeleton, ProgressBar } from '@/components/ui';
import {
  BookOpen, Sparkles, AlertTriangle, CheckCircle, Clock,
  ArrowRight, Shield, Layers, FileText, ExternalLink, RefreshCw, Check,
  BarChart3, Users, Edit3, UserCheck, AlertCircle
} from 'lucide-react';
import type { MasterSyllabus, PersonalizedPlan, User } from '@/types';

interface SyllabusPersonalizationViewProps {
  courseId: string;
  currentUser: User | null;
}

interface ClassAnalyticsData {
  totalStudentsTracked: number;
  totalQuizSubmissions: number;
  weakestTopics: {
    topicName: string;
    skillArea: string;
    avgMastery: number;
    studentsAssessed: number;
  }[];
  allTopicRankings: {
    topicName: string;
    skillArea: string;
    avgMastery: number;
    studentsAssessed: number;
  }[];
  atRiskStudents: {
    studentId: string;
    name: string;
    email: string;
    weakTopicsCount: number;
    averageMastery: number;
    hotScore: number;
    lotScore: number;
    needsAttention: boolean;
  }[];
}

export const SyllabusPersonalizationView: React.FC<SyllabusPersonalizationViewProps> = ({
  courseId,
  currentUser,
}) => {
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [masterSyllabus, setMasterSyllabus] = useState<MasterSyllabus | null>(null);
  const [personalizedPlan, setPersonalizedPlan] = useState<PersonalizedPlan | null>(null);

  // Teacher specific state
  const [teacherViewTab, setTeacherViewTab] = useState<'master' | 'analytics' | 'studentPlans'>('master');
  const [classAnalytics, setClassAnalytics] = useState<ClassAnalyticsData | null>(null);
  const [studentPlansList, setStudentPlansList] = useState<PersonalizedPlan[]>([]);
  const [selectedStudentPlan, setSelectedStudentPlan] = useState<PersonalizedPlan | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  // Teacher Syllabus Upload / Parser State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [parsingSyllabus, setParsingSyllabus] = useState(false);

  // View toggle for student
  const [viewMode, setViewMode] = useState<'personalized' | 'master'>('personalized');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const masterRes = await api.get(`/syllabus/master/${courseId}`).catch(() => ({ data: { masterSyllabus: null } }));
      setMasterSyllabus(masterRes.data.masterSyllabus || null);

      if (isTeacher) {
        // Fetch class analytics and all student plans
        const [analyticsRes, plansRes] = await Promise.all([
          api.get(`/quizzes/class-analytics/${courseId}`).catch(() => ({ data: null })),
          api.get(`/syllabus/plans/${courseId}`).catch(() => ({ data: { plans: [] } })),
        ]);
        if (analyticsRes.data) setClassAnalytics(analyticsRes.data);
        if (plansRes.data?.plans) {
          setStudentPlansList(plansRes.data.plans);
          if (plansRes.data.plans.length > 0 && !selectedStudentPlan) {
            setSelectedStudentPlan(plansRes.data.plans[0]);
            setTeacherNotes(plansRes.data.plans[0].teacherOverrides || '');
          }
        }
      } else {
        const planRes = await api.get(`/syllabus/personalized/${courseId}`);
        setPersonalizedPlan(planRes.data.personalizedPlan || null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load syllabus information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const handleParseSyllabus = async () => {
    if (!uploadText.trim()) return;
    setParsingSyllabus(true);
    setError('');
    try {
      const { data } = await retryAiRequest(
        () => api.post('/syllabus/parse', {
          courseId,
          syllabusText: uploadText,
        }, { timeout: 90000 }),
        () => setError('AI is busy, retrying...')
      );
      setMasterSyllabus(data.masterSyllabus);
      setShowUploadModal(false);
      setUploadText('');
      setSuccessMsg('Master Syllabus successfully parsed and updated with AI!');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to parse syllabus with AI.');
    } finally {
      setParsingSyllabus(false);
    }
  };

  const handleSelectStudentPlan = (plan: PersonalizedPlan) => {
    setSelectedStudentPlan(plan);
    setTeacherNotes(plan.teacherOverrides || '');
  };

  const handleSaveTeacherOverride = async (approved: boolean) => {
    if (!selectedStudentPlan) return;
    setSavingOverride(true);
    setError('');
    try {
      const { data } = await api.put(`/syllabus/personalized/${selectedStudentPlan._id}/override`, {
        teacherApproved: approved,
        teacherOverrides: teacherNotes,
      });
      setSelectedStudentPlan(data.personalizedPlan);
      // Update in list
      setStudentPlansList((prev) =>
        prev.map((p) => (p._id === data.personalizedPlan._id ? data.personalizedPlan : p))
      );
      setSuccessMsg(approved ? 'Student plan approved and verified!' : 'Instructor overrides recorded.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save instructor override.');
    } finally {
      setSavingOverride(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Active plan to render for the adaptive pathway
  const activePlan = isTeacher ? selectedStudentPlan : personalizedPlan;

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {/* Top Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
        <CardBody className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <BookOpen size={18} />
              </span>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {isTeacher ? 'Course Master Syllabus & Curriculum Governance' : 'AI Adaptive Personalized Learning Pathway'}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary font-bold">
                iGOT Karmayogi Framework
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              {isTeacher
                ? "The Master Syllabus is the authoritative academic contract. AI will never mutate it; personalization occurs dynamically in separate per-student plans."
                : "Your personal learning sequence is adapted based on your diagnostic quiz performance. Weak topics are prioritized with prerequisite revision, while mastered skills are compressed."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isTeacher ? (
              <div className="flex items-center gap-2">
                {/* Teacher Tab Toggle */}
                <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => setTeacherViewTab('master')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                      teacherViewTab === 'master'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Master Syllabus
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewTab('analytics')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                      teacherViewTab === 'analytics'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <BarChart3 size={13} /> Class Analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherViewTab('studentPlans')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                      teacherViewTab === 'studentPlans'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users size={13} /> Student Plans ({studentPlansList.length})
                  </button>
                </div>
                <Button size="sm" onClick={() => setShowUploadModal(true)} className="gap-1.5">
                  <Sparkles size={14} /> Parse / Update
                </Button>
              </div>
            ) : (
              <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode('personalized')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                    viewMode === 'personalized'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Adaptive Plan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('master')}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                    viewMode === 'master'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Master Syllabus
                </button>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={fetchData} title="Refresh">
              <RefreshCw size={14} />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TEACHER: CLASS-WIDE COMPETENCY ANALYTICS & GAPS                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isTeacher && teacherViewTab === 'analytics' && classAnalytics && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Stat Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardBody className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Students Assessed</p>
                  <p className="text-xl font-bold text-foreground">{classAnalytics.totalStudentsTracked}</p>
                </div>
              </CardBody>
            </Card>

            <Card className="border-border">
              <CardBody className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Diagnostic Submissions</p>
                  <p className="text-xl font-bold text-foreground">{classAnalytics.totalQuizSubmissions}</p>
                </div>
              </CardBody>
            </Card>

            <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10">
              <CardBody className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">At-Risk Learners</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {classAnalytics.atRiskStudents?.length || 0}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Class Weakest Topics Ranking */}
          <Card>
            <CardHeader className="flex items-center justify-between pb-3">
              <div className="space-y-0.5">
                <h4 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  Class-Wide Weakest Topics Ranking
                </h4>
                <p className="text-xs text-muted-foreground">
                  Topics where the cohort demonstrates the lowest average mastery score.
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-muted">
                Ranked by Lowest Mastery
              </span>
            </CardHeader>
            <CardBody className="space-y-3 pt-0">
              {classAnalytics.allTopicRankings && classAnalytics.allTopicRankings.length > 0 ? (
                classAnalytics.allTopicRankings.map((topic, idx) => (
                  <div
                    key={topic.topicName}
                    className="p-3 rounded-lg border border-border flex items-center justify-between flex-wrap gap-2 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold w-5 text-muted-foreground">#{idx + 1}</span>
                        <p className="text-sm font-semibold text-foreground">{topic.topicName}</p>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-primary/10 text-primary">
                          {topic.skillArea}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">
                        {topic.studentsAssessed} student(s) evaluated
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 flex items-center gap-2">
                        <ProgressBar
                          value={topic.avgMastery}
                          className="flex-1"
                          color={
                            topic.avgMastery >= 75
                              ? 'bg-emerald-500'
                              : topic.avgMastery >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }
                        />
                        <span className="text-xs font-semibold w-8 text-right">{topic.avgMastery}%</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          topic.avgMastery >= 75
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : topic.avgMastery >= 50
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {topic.avgMastery >= 75 ? 'Strong' : topic.avgMastery >= 50 ? 'Average' : 'Needs Action'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No topic performance data recorded yet.
                </p>
              )}
            </CardBody>
          </Card>

          {/* At-Risk Students List */}
          <Card className="border-amber-200 dark:border-amber-900/40">
            <CardHeader className="flex items-center justify-between pb-3">
              <h4 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
                <Users size={16} className="text-amber-600" /> Students Requiring Immediate Attention
              </h4>
              <span className="text-xs text-muted-foreground">&lt; 50% Avg Mastery or ≥ 2 Weak Competencies</span>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {classAnalytics.atRiskStudents && classAnalytics.atRiskStudents.length > 0 ? (
                  classAnalytics.atRiskStudents.map((st) => (
                    <div key={st.studentId} className="p-4 flex items-center justify-between flex-wrap gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{st.name}</p>
                          <span className="text-xs text-muted-foreground">({st.email})</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="text-red-600 font-semibold">{st.weakTopicsCount} Weak Topic(s)</span>
                          <span>·</span>
                          <span>Avg Mastery: <strong>{st.averageMastery}%</strong></span>
                          <span>·</span>
                          <span>LOT: {st.lotScore}% | HOT: {st.hotScore}%</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          const plan = studentPlansList.find(
                            (p) => String((p.student as any)?._id || p.student) === String(st.studentId)
                          );
                          if (plan) {
                            setSelectedStudentPlan(plan);
                            setTeacherNotes(plan.teacherOverrides || '');
                            setTeacherViewTab('studentPlans');
                          }
                        }}
                      >
                        <Edit3 size={13} /> Inspect &amp; Guide Plan
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    All students are currently performing above the risk threshold.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TEACHER: STUDENT PERSONALIZED PLAN INSPECTION & OVERRIDE                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {isTeacher && teacherViewTab === 'studentPlans' && (
        <div className="space-y-6 animate-fade-in">
          {/* Student Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span className="text-xs font-semibold text-foreground">Select Student to Inspect:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {studentPlansList.map((plan) => {
                const studentName = (plan.student as any)?.name || 'Student';
                const isSelected = selectedStudentPlan?._id === plan._id;
                return (
                  <button
                    key={plan._id}
                    type="button"
                    onClick={() => handleSelectStudentPlan(plan)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/40'
                    }`}
                  >
                    <span>{studentName}</span>
                    {plan.teacherApproved && <CheckCircle size={12} className={isSelected ? 'text-white' : 'text-emerald-500'} />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedStudentPlan ? (
            <div className="space-y-6">
              {/* Teacher Governance Box */}
              <Card className="border-primary/40 bg-gradient-to-r from-primary/5 via-card to-card">
                <CardHeader className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-primary" />
                    <h4 className="font-serif text-base font-semibold text-foreground">
                      Instructor Plan Review &amp; Override
                    </h4>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      selectedStudentPlan.teacherApproved
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}
                  >
                    {selectedStudentPlan.teacherApproved ? 'Plan Verified by Teacher' : 'Pending Faculty Review'}
                  </span>
                </CardHeader>
                <CardBody className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Review the AI-generated topic sequence for{' '}
                    <strong className="text-foreground">
                      {(selectedStudentPlan.student as any)?.name || 'this student'}
                    </strong>
                    . You may add specific faculty guidance notes or override priority sequences.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      Teacher Override / Guidance Notes:
                    </label>
                    <textarea
                      rows={3}
                      value={teacherNotes}
                      onChange={(e) => setTeacherNotes(e.target.value)}
                      placeholder="e.g. Approved. Focus on Discrete Mathematics foundations before starting Cryptographic Primitives."
                      className="w-full text-xs p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={savingOverride}
                      onClick={() => handleSaveTeacherOverride(false)}
                      className="gap-1.5 text-xs"
                    >
                      <Edit3 size={13} /> Save Custom Notes Only
                    </Button>
                    <Button
                      size="sm"
                      loading={savingOverride}
                      onClick={() => handleSaveTeacherOverride(true)}
                      className="gap-1.5 text-xs"
                    >
                      <CheckCircle size={13} /> Approve &amp; Verify Plan
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Render Adaptive Sequence for selected student */}
              <AdaptiveTopicsList plan={selectedStudentPlan} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-8 text-center">
              No student personalized plans generated yet. Have students take a diagnostic quiz to trigger adaptive personalization.
            </p>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TEACHER MASTER SYLLABUS VIEW (OR STUDENT MASTER SYLLABUS TAB)           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {((isTeacher && teacherViewTab === 'master') || (!isTeacher && viewMode === 'master')) && masterSyllabus && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Authoritative Master Syllabus · Version {masterSyllabus.version} · {masterSyllabus.units?.length || 0} Units
            </span>
            <span>Immutable Master Copy (Owned by Instructor)</span>
          </div>

          {masterSyllabus.units?.map((unit) => (
            <Card key={unit.unitNumber} className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold">
                    {unit.unitNumber}
                  </span>
                  <h4 className="font-serif text-base font-semibold text-foreground">{unit.unitTitle}</h4>
                </div>
                <span className="text-xs text-muted-foreground">
                  {unit.topics?.length || 0} Topics
                </span>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-border">
                  {unit.topics?.map((topic) => (
                    <div key={topic.topicCode} className="p-4 hover:bg-muted/10 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {topic.topicCode}
                          </span>
                          <span className="font-medium text-sm text-foreground">{topic.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                            {topic.skillArea}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-muted capitalize text-muted-foreground">
                            Bloom: {topic.bloomLevel}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              topic.difficulty === 'Easy'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : topic.difficulty === 'Moderate'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
                            {topic.difficulty}
                          </span>
                        </div>
                      </div>

                      {topic.description && (
                        <p className="text-xs text-muted-foreground pl-1">{topic.description}</p>
                      )}

                      {/* Subtopics */}
                      {topic.subtopics && topic.subtopics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                          {topic.subtopics.map((st, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-card text-muted-foreground"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. STUDENT PERSONALIZED ADAPTIVE SYLLABUS VIEW                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {!isTeacher && viewMode === 'personalized' && (
        <div className="space-y-6 animate-fade-in">
          {activePlan ? (
            <AdaptiveTopicsList plan={activePlan} />
          ) : (
            <Card className="border-dashed p-8 text-center space-y-3">
              <Sparkles size={32} className="mx-auto text-primary/60" />
              <h4 className="font-serif text-lg font-semibold text-foreground">
                Diagnostic Evaluation Required
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Take a diagnostic quiz for this course. AdaptIQ's AI engine will evaluate your cognitive HOT/LOT profile,
                detect prerequisite gaps, and construct an inverted personalized syllabus.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. UPLOAD / PARSE MASTER SYLLABUS MODAL                                    */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-primary" /> Parse Course Syllabus with AI
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Paste your course syllabus outline or lecture topics. The AI will extract a structured Master Syllabus
              broken down into Course &gt; Units &gt; Topics &gt; Subtopics, tagged with standardized Skill Areas.
            </p>

            <textarea
              rows={8}
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              placeholder="e.g. Unit 1: Full Stack Architecture (REST, Async Hooks, Microservices)... Unit 2: Cybersecurity (Hashing, XSS, Zero Trust)..."
              className="w-full text-xs font-mono p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={parsingSyllabus}
                disabled={!uploadText.trim() || parsingSyllabus}
                onClick={handleParseSyllabus}
                className="gap-1.5"
              >
                <Sparkles size={14} /> Parse &amp; Publish Master Syllabus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Sub-component to render the adapted topics list with badges, reasons, prerequisites, and resources
 */
const AdaptiveTopicsList: React.FC<{ plan: PersonalizedPlan }> = ({ plan }) => {
  return (
    <div className="space-y-4">
      {/* Plan Summary Banner */}
      <Card className="border-border bg-card">
        <CardBody className="p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-semibold text-foreground">{plan.planTitle}</h4>
              <p className="text-xs text-muted-foreground">
                Synchronized with Master Syllabus v{plan.masterVersion} · {plan.adaptedTopics?.length || 0} Adapted Learning Units
              </p>
            </div>
            {plan.teacherApproved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle size={13} /> Verified by Instructor
              </span>
            )}
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed border-t border-border pt-2">
            {plan.summaryNarrative}
          </p>
          {plan.teacherOverrides && (
            <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground space-y-0.5">
              <span className="font-semibold text-primary block">Faculty Guidance Note:</span>
              <p className="text-muted-foreground italic">"{plan.teacherOverrides}"</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Adapted Topics Cards */}
      <div className="space-y-3">
        {plan.adaptedTopics?.map((topic) => {
          const isWeak = topic.status === 'Weak';
          const isStrong = topic.status === 'Strong';

          return (
            <Card
              key={topic.topicName}
              className={`border transition-all ${
                isWeak
                  ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                  : isStrong
                  ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-border'
              }`}
            >
              <CardBody className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full font-mono text-xs font-bold bg-muted text-foreground">
                      #{topic.priorityRank}
                    </span>
                    <h5 className="font-semibold text-sm text-foreground">{topic.topicName}</h5>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                      {topic.skillArea}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isWeak && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle size={11} /> EXPANDED REMEDIATION
                      </span>
                    )}
                    {isStrong && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle size={11} /> COMPRESSED ADVANCED
                      </span>
                    )}
                    {!isWeak && !isStrong && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        STANDARD PROGRESSION
                      </span>
                    )}
                  </div>
                </div>

                {/* Transparent AI Reason */}
                <div className="text-xs p-2.5 rounded-lg bg-card/80 border border-border/80 text-foreground/90 space-y-1">
                  <span className="font-semibold text-primary block">Why this was adapted:</span>
                  <p className="text-muted-foreground">{topic.reason}</p>
                </div>

                {/* Prerequisite Scaffolding */}
                {topic.addedPrerequisites?.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Detected Prerequisite Scaffolding:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {topic.addedPrerequisites.map((prereq) => (
                        <span
                          key={prereq}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200 font-medium"
                        >
                          <ArrowRight size={10} /> {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intuitive Conceptual Summary */}
                {topic.aiExplanationSummary && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2.5 py-0.5">
                    "{topic.aiExplanationSummary}"
                  </p>
                )}

                {/* Curated Resources */}
                {topic.curatedResources && topic.curatedResources.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Curated Learning Materials:
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {topic.curatedResources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-xs group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText size={13} className="text-primary shrink-0" />
                            <span className="font-medium text-foreground truncate">{res.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-muted">{res.source}</span>
                            <ExternalLink size={11} className="group-hover:text-primary transition-colors" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Challenges for Strong Topics */}
                {isStrong && topic.advancedChallenges && topic.advancedChallenges.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Advanced Engineering Challenges:
                    </span>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                      {topic.advancedChallenges.map((ch, cIdx) => (
                        <li key={cIdx}>{ch}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Study Schedule Footer */}
                {topic.studySchedule && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {topic.studySchedule.dailyMinutes} mins/day
                    </span>
                    <span>·</span>
                    <span>{topic.studySchedule.durationWeeks} weeks planned</span>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

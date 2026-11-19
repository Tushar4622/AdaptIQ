import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardBody, CardFooter, Button, Alert, Skeleton, EmptyState, ProgressBar, toast } from '@/components/ui';
import { ClipboardList, Clock, CheckCircle, XCircle, ChevronRight, Trophy, Brain, AlertCircle, Target, Sparkles, BookOpen } from 'lucide-react';
import type { Quiz, QuizAttempt, AwardedBadge, DetailedQuizReport } from '@/types';

const showAwardedBadgeToasts = (badges: AwardedBadge[] = []) => {
  badges.forEach((badge) => {
    toast(`🏅 Badge earned: ${badge.icon ? `${badge.icon} ` : ''}${badge.name}`, 'success');
  });
};

// ── Quiz List (for a course) ───────────────────────────────────────────────────
export const QuizListPage: React.FC = () => {
  const { courseId } = useParams();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      api.get(`/quizzes/course/${courseId}`)
        .then(r => setQuizzes(r.data.quizzes || []))
        .finally(() => setLoading(false));
    }
  }, [courseId]);

  if (loading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {quizzes.length === 0 ? (
        <EmptyState icon={<ClipboardList size={40} />} title="No quizzes yet" description="The instructor hasn't published any quizzes for this course." />
      ) : quizzes.map(q => (
        <Card key={q._id}>
          <CardBody className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ClipboardList size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{q.title}</h3>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={12} /> {q.timeLimit} min</span>
                <span>{q.questions.length} questions</span>
                <span>Pass: {q.passingScore}%</span>
                <span className="text-amber-600 font-medium">+{q.xpReward} XP</span>
              </div>
            </div>
            <Link to={`/quizzes/${q._id}`}>
              <Button variant="secondary" size="sm" className="gap-1">Start Quiz <ChevronRight size={14} /></Button>
            </Link>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

// ── Quiz Taking Page ──────────────────────────────────────────────────────────
export const QuizPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [detailedReport, setDetailedReport] = useState<DetailedQuizReport | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.get(`/quizzes/${id}`).then(r => {
      setQuiz(r.data.quiz);
      setTimeLeft(r.data.quiz.timeLimit * 60);
    }).finally(() => setLoading(false));
  }, [id]);

  // Timer
  useEffect(() => {
    if (started && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (started && timeLeft === 0 && !result) {
      handleSubmit();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [started, timeLeft]);

  const handleStart = () => {
    setAnswers(new Array(quiz!.questions.length).fill(-1));
    setStarted(true);
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers(prev => { const a = [...prev]; a[currentQ] = optionIndex; return a; });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true); setError('');
    const timeTaken = quiz.timeLimit * 60 - timeLeft;
    try {
      let finalAttempt: any = null;
      let finalReport: DetailedQuizReport | null = null;

      try {
        const { data } = await api.post(`/quizzes/${id}/submit-advanced`, {
          answers: answers.map((selectedIndex, questionIndex) => ({ questionIndex, selectedIndex })),
          timeTaken,
        });
        finalAttempt = {
          _id: data.attemptId,
          score: data.overallScore,
          passed: data.passed,
          details: data.evaluatedAnswers,
        };
        finalReport = data.detailedReport;
      } catch {
        const { data } = await api.post(`/quizzes/${id}/attempt`, {
          answers: answers.map((selectedIndex, questionIndex) => ({ questionIndex, selectedIndex })),
          timeTaken,
        });
        finalAttempt = data.attempt;
        if (data.attempt?.detailedReport) {
          finalReport = data.attempt.detailedReport;
        }
      }

      setResult(finalAttempt);
      if (finalReport) setDetailedReport(finalReport);
      toast(finalAttempt?.passed ? '🎉 Quiz passed!' : 'Quiz completed', finalAttempt?.passed ? 'success' : 'info');

      await refreshUser();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timePercent = quiz ? (timeLeft / (quiz.timeLimit * 60)) * 100 : 100;
  const answeredCount = answers.filter(a => a !== -1).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!quiz) return null;

  // Results screen
  if (result) {
    const correct = result.correct ?? 0;
    const total = result.totalQuestions ?? quiz.questions.length;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardBody className="py-8 text-center space-y-4">
            <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center text-4xl ${result.passed ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              {result.passed ? '🎉' : '📖'}
            </div>
            <div>
              <h1 className="font-serif text-3xl font-normal">{result.passed ? 'Quiz Passed!' : 'Keep Practising'}</h1>
              <p className="text-muted-foreground mt-1">You scored <strong className="text-foreground">{result.score}%</strong> ({correct}/{total} correct)</p>
            </div>
            <div className="max-w-xs mx-auto">
              <ProgressBar value={result.score} color={result.passed ? 'bg-emerald-500' : 'bg-red-400'} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span className="text-amber-600 font-medium">Pass: {quiz.passingScore}%</span>
                <span>100%</span>
              </div>
            </div>
            {result.passed && (
              <div className="flex items-center justify-center gap-2 text-amber-600 font-medium">
                <Trophy size={18} /> +{quiz.xpReward} XP Earned!
              </div>
            )}
          </CardBody>
        </Card>

        {/* Concept Competency Breakdown */}
        {result.conceptBreakdown && result.conceptBreakdown.length > 0 && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-normal inline-flex items-center gap-2">
                <Target size={18} className="text-primary" /> Concept Competency Breakdown
              </h2>
              <span className="text-xs text-muted-foreground">Continuous Learner Model Update</span>
            </CardHeader>
            <CardBody className="space-y-3">
              {result.conceptBreakdown.map((item) => (
                <div key={item.concept} className="p-3 rounded-lg border border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{item.conceptName}</p>
                    <p className="text-xs text-muted-foreground">{item.correctCount}/{item.totalCount} questions correct</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-28 flex items-center gap-2">
                      <ProgressBar
                        value={item.masteryScore}
                        className="flex-1"
                        color={item.status === 'mastered' ? 'bg-emerald-500' : item.status === 'in-progress' ? 'bg-amber-500' : 'bg-red-400'}
                      />
                      <span className="text-xs font-semibold w-8 text-right">{item.masteryScore}%</span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        item.status === 'mastered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : item.status === 'in-progress'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {item.status === 'unmet' ? 'Gap Detected' : item.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Targeted Adaptive Remediation Recommendation */}
        {result.detectedGaps && result.detectedGaps.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20">
            <CardHeader className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-600" />
              <h2 className="font-serif text-lg font-normal text-foreground">Targeted Adaptive Remediation</h2>
            </CardHeader>
            <CardBody className="space-y-3 pt-0">
              <p className="text-xs text-muted-foreground">
                Gaps were detected in <strong className="text-foreground">{result.detectedGaps.map(g => g.conceptName).join(', ')}</strong>.
                The competency engine recommends reviewing the foundational materials before retaking this quiz.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/skill-map')}
                  className="gap-1.5"
                >
                  <Target size={14} /> View Remedial Pathway in Skill Map
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Question breakdown */}
        {detailedReport && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
            <CardHeader className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-primary" />
                <h2 className="font-serif text-lg font-semibold text-foreground">Diagnostic Result Report</h2>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Learning Science Analytics
              </span>
            </CardHeader>
            <CardBody className="space-y-4 pt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {detailedReport.overallSummary}
              </p>

              {/* HOT vs LOT Analysis */}
              {detailedReport.hotVsLotAnalysis && (
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Brain size={14} className="text-primary" /> Cognitive Taxonomy (Bloom's HOT vs LOT)
                    </span>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-sky-600 dark:text-sky-400">LOT: {detailedReport.hotVsLotAnalysis.lotScore}%</span>
                      <span className="text-orange-600 dark:text-orange-400">HOT: {detailedReport.hotVsLotAnalysis.hotScore}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-muted-foreground mb-1">
                        <span>Lower-Order (Recall & Apply)</span>
                        <span>{detailedReport.hotVsLotAnalysis.lotScore}%</span>
                      </div>
                      <ProgressBar value={detailedReport.hotVsLotAnalysis.lotScore} color="bg-sky-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-muted-foreground mb-1">
                        <span>Higher-Order (Analyze & Evaluate)</span>
                        <span>{detailedReport.hotVsLotAnalysis.hotScore}%</span>
                      </div>
                      <ProgressBar value={detailedReport.hotVsLotAnalysis.hotScore} color="bg-orange-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                    💡 {detailedReport.hotVsLotAnalysis.verdict}
                  </p>
                </div>
              )}

              {/* Topic-Wise Performance & Strength Labels */}
              {detailedReport.topicPerformance?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">Topic-Wise Mastery & Strength Status</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {detailedReport.topicPerformance.map((tp, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border bg-card/60 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground truncate">{tp.topicName}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            tp.strengthLabel === 'Strong'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : tp.strengthLabel === 'Average'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {tp.strengthLabel} ({tp.score}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{tp.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mistake Patterns */}
              {detailedReport.mistakePatterns?.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Detected Misconception Patterns:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detailedReport.mistakePatterns.map((pattern, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                        ⚠️ {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pacing & Next Steps */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Clock size={13} />
                  <span>Pace: <strong>{detailedReport.timeAnalysis?.paceCategory || 'Balanced'}</strong> ({detailedReport.timeAnalysis?.avgSecondsPerQuestion || 30}s/q)</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const courseTarget = (quiz.course as any)?._id || quiz.course;
                    navigate(`/courses/${courseTarget}?tab=syllabus`);
                  }}
                  className="gap-1.5"
                >
                  <BookOpen size={14} /> Open Your Adapted Personalized Syllabus
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Question breakdown */}
        <Card>
          <CardHeader><h2 className="font-serif text-lg font-normal">Question Breakdown</h2></CardHeader>
          <CardBody className="space-y-3">
            {quiz.questions.map((q, i) => {
              const detail = result.details?.[i];
              const isCorrect = detail?.isCorrect;
              return (
                <div key={i} className={`p-4 rounded-lg border ${isCorrect ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10' : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'}`}>
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{q.text}</p>
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, oi) => {
                          const selected = detail?.selectedIndex === oi;
                          const correct = quiz.questions[i].correctIndex === oi;
                          return (
                            <div key={oi} className={`text-xs px-3 py-1.5 rounded flex items-center gap-2
                              ${correct ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium' :
                                selected && !correct ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                'text-muted-foreground'}`}>
                              {correct && <CheckCircle size={12} />}
                              {selected && !correct && <XCircle size={12} />}
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setStarted(false); setCurrentQ(0); setAnswers([]); setTimeLeft(quiz.timeLimit * 60); }}>
            Retake Quiz
          </Button>
          <Button className="flex-1" onClick={() => navigate('/courses')}>Browse Courses</Button>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!started) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <Card>
          <CardBody className="py-8 text-center space-y-5">
            <div className="h-16 w-16 rounded-xl bg-primary/10 mx-auto flex items-center justify-center text-primary">
              <ClipboardList size={30} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-normal">{quiz.title}</h1>
              {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Questions', value: quiz.questions.length },
                { label: 'Time Limit', value: `${quiz.timeLimit} min` },
                { label: 'Pass Score', value: `${quiz.passingScore}%` },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-lg bg-muted text-center">
                  <div className="font-semibold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <Alert variant="warning"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>Once started, the timer cannot be paused. Ensure you have a stable connection.</span></Alert>
            <Button className="w-full" variant="secondary" size="lg" onClick={handleStart}>Start Quiz</Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Quiz in progress
  const question = quiz.questions[currentQ];
  const answered = answers[currentQ];
  const allAnswered = answers.every(a => a !== -1);

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Header bar */}
      <Card>
        <CardBody className="py-3 flex items-center gap-4">
          <div className={`font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : timeLeft < 180 ? 'text-amber-600' : 'text-foreground'}`}>
            <Clock size={16} className="inline mr-1" />
            {formatTime(timeLeft)}
          </div>
          <div className="flex-1">
            <ProgressBar value={timePercent} color={timeLeft < 60 ? 'bg-red-500' : timeLeft < 180 ? 'bg-amber-500' : 'bg-primary'} />
          </div>
          <span className="text-sm text-muted-foreground">{answeredCount}/{quiz.questions.length} answered</span>
        </CardBody>
      </Card>

      {/* Question navigation pills */}
      <div className="flex flex-wrap gap-1.5">
        {quiz.questions.map((_, i) => (
          <button key={i} onClick={() => setCurrentQ(i)}
            className={`h-8 w-8 rounded-md text-xs font-medium transition-all ${i === currentQ ? 'bg-primary text-primary-foreground' : answers[i] !== -1 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Question {currentQ + 1} of {quiz.questions.length}</span>
            <span className="text-xs text-amber-600 font-medium">{question.points} pt{question.points !== 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-base font-medium text-foreground">{question.text}</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {question.options.map((opt, oi) => (
            <button key={oi} onClick={() => handleAnswer(oi)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${answered === oi ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-muted-foreground hover:bg-muted/50'}`}>
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border mr-3 text-xs font-medium
                border-current opacity-60">{String.fromCharCode(65 + oi)}</span>
              {opt}
            </button>
          ))}
        </CardBody>
        <CardFooter className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={currentQ === 0} onClick={() => setCurrentQ(c => c - 1)}>← Previous</Button>
          {currentQ < quiz.questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentQ(c => c + 1)}>Next →</Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleSubmit} loading={submitting} disabled={!allAnswered && answers.some(a => a !== -1)}>
              Submit Quiz
            </Button>
          )}
        </CardFooter>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
};

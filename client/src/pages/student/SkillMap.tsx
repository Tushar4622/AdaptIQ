import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { retryAiRequest } from '@/lib/aiRequest';
import {
  Card, CardHeader, CardBody, Button, StatusBadge,
  Skeleton, EmptyState, ProgressBar, Alert, toast
} from '@/components/ui';
import {
  Brain, RefreshCw, TrendingUp, CheckCircle, Circle, AlertCircle,
  Network, Target, Clock, ArrowRight, ShieldAlert, Sparkles, BookOpen
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import type {
  Skill,
  LearnerMasteryRecord,
  LearnerMasteryResponse,
  CompetencyGraphResponse,
  CompetencyGraphNode,
  CompetencyGraphEdge
} from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  Technical: '#3b82f6',
  'Soft Skills': '#8b5cf6',
  'Domain Knowledge': '#f59e0b',
  Tools: '#10b981',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'acquired' || status === 'mastered') return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === 'in-progress') return <Circle size={14} className="text-amber-500" />;
  return <AlertCircle size={14} className="text-red-400" />;
};

export const SkillMapPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'graph' | 'skills'>('concepts');

  // Macro Skills State
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Concept-Level Mastery & Gap Detection State
  const [masteryData, setMasteryData] = useState<LearnerMasteryResponse | null>(null);
  const [masteryLoading, setMasteryLoading] = useState(true);
  const [conceptFilter, setConceptFilter] = useState<'all' | 'unmet' | 'in-progress' | 'mastered'>('all');

  // Competency Graph State
  const [graphData, setGraphData] = useState<CompetencyGraphResponse | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      const { data } = await api.get('/skills/map');
      setSkills(data.skills || []);
    } catch {
      // ignore
    } finally {
      setSkillsLoading(false);
    }
  };

  const fetchMastery = async () => {
    setMasteryLoading(true);
    try {
      const { data } = await api.get('/competencies/learner/mastery');
      setMasteryData(data);
    } catch {
      // ignore
    } finally {
      setMasteryLoading(false);
    }
  };

  const fetchGraph = async () => {
    setGraphLoading(true);
    try {
      const { data } = await api.get('/competencies/graph');
      setGraphData(data);
    } catch {
      // ignore
    } finally {
      setGraphLoading(false);
    }
  };

  useEffect(() => {
    fetchMastery();
    fetchSkills();
  }, []);

  useEffect(() => {
    if (activeTab === 'graph' && !graphData) {
      fetchGraph();
    }
  }, [activeTab, graphData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const { data } = await retryAiRequest(
        () => api.post('/skills/analyze', {}, { timeout: 90000 }),
        () => setError('AI is busy, retrying...')
      );
      setSkills(data.skills || []);
      await fetchMastery();
      toast(`Analyzed ${data.analyzed} skills successfully`, 'success');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Analysis failed. Check your server-side AI provider key.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Calculations for Macro Skills
  const categories = ['All', ...Array.from(new Set(skills.map(s => s.category)))];
  const filteredSkills = activeCategory === 'All' ? skills : skills.filter(s => s.category === activeCategory);

  const radarData = skills.slice(0, 8).map(s => ({
    subject: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
    proficiency: s.proficiency,
  }));

  const barData = skills
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 10)
    .map(s => ({ name: s.name.length > 16 ? s.name.slice(0, 16) + '…' : s.name, proficiency: s.proficiency, category: s.category }));

  // Filtered concepts
  const allConceptRecords: LearnerMasteryRecord[] = [
    ...(masteryData?.gaps || []),
    ...(masteryData?.inProgress || []),
    ...(masteryData?.mastered || []),
  ];

  const filteredConcepts = allConceptRecords.filter(item => {
    if (conceptFilter === 'all') return true;
    return item.status === conceptFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Competency & Skill Intelligence</h1>
          <p className="page-subtitle">Continuous multi-signal mastery estimation, concept-level gap detection, and prerequisite tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleAnalyze} loading={analyzing} className="gap-2">
            {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <Brain size={16} />}
            {analyzing ? 'Analyzing…' : 'Run AI Analysis'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error"><AlertCircle size={16} />{error}</Alert>}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('concepts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'concepts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Target size={16} />
          Concept Mastery & Gaps
          {masteryData && masteryData.summary.gapsCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
              {masteryData.summary.gapsCount} gaps
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'graph'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network size={16} />
          Prerequisite Knowledge Graph
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'skills'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Brain size={16} />
          Macro Skill Overview
        </button>
      </div>

      {/* ─────────────────── TAB 1: CONCEPT MASTERY & GAP DETECTION ─────────────────── */}
      {activeTab === 'concepts' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          {masteryLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 shrink-0">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{masteryData?.summary.masteredCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Concepts Mastered (≥80%)</div>
                </div>
              </div>

              <div className="stat-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 dark:bg-amber-900/20 shrink-0">
                  <Circle size={20} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{masteryData?.summary.inProgressCount || 0}</div>
                  <div className="text-xs text-muted-foreground">In-Progress (50-79%)</div>
                </div>
              </div>

              <div className="stat-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-red-50 text-red-500 dark:bg-red-900/20 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{masteryData?.summary.gapsCount || 0}</div>
                  <div className="text-xs text-muted-foreground">Active Skill Gaps (&lt;50%)</div>
                </div>
              </div>

              <div className="stat-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground">{masteryData?.summary.overallMasteryPct || 0}%</div>
                  <div className="text-xs text-muted-foreground">Overall Progression</div>
                </div>
              </div>
            </div>
          )}

          {/* Remedial Recommendations Banner */}
          {!masteryLoading && masteryData && masteryData.recommendations.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40">
              <CardHeader className="flex items-center gap-2 pb-2">
                <Sparkles size={18} className="text-amber-600" />
                <h3 className="text-base font-semibold text-foreground">Targeted Remedial Action Plan</h3>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="text-xs text-muted-foreground mb-4">
                  The continuous competency engine detected foundational deficits. Complete these remedial steps to close gaps before taking advanced quizzes.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {masteryData.recommendations.map(rec => (
                    <div key={rec.conceptId} className="p-3 rounded-lg border border-amber-200 bg-card dark:border-amber-900/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-sm text-foreground">{rec.conceptName}</div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {rec.urgency} priority
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rec.suggestedAction}</p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-primary font-medium">
                        <BookOpen size={14} />
                        <span>Module {rec.moduleIndex + 1}, Lesson {rec.lessonIndex + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Detailed Concept Mastery Table */}
          <Card>
            <CardHeader className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-serif text-lg font-normal">Concept-Level Mastery Evidence</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Updated in real-time from multi-signal quiz responses, latency, and error patterns.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'unmet', 'in-progress', 'mastered'] as const).map(tabKey => (
                  <button
                    key={tabKey}
                    onClick={() => setConceptFilter(tabKey)}
                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                      conceptFilter === tabKey
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tabKey === 'all' ? 'All Concepts' : tabKey === 'unmet' ? 'Gaps (<50%)' : tabKey}
                  </button>
                ))}
              </div>
            </CardHeader>

            {masteryLoading ? (
              <CardBody className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </CardBody>
            ) : filteredConcepts.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={<Target size={40} />}
                  title="No concept evaluations recorded"
                  description="Take a quiz or complete course assessments to generate concept-level mastery evidence."
                />
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Concept</th>
                      <th>Competency Goal</th>
                      <th>Multi-Signal Evidence</th>
                      <th className="w-48">Mastery Estimate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConcepts.map(record => (
                      <tr key={record._id}>
                        <td>
                          <div>
                            <div className="font-medium text-foreground">{record.conceptName}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{record.conceptCode}</div>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs text-foreground font-medium">
                            {record.competencyTitle || 'General Core'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{record.correctAttempts}/{record.totalAttempts} correct</span>
                            {record.avgResponseLatency > 0 && (
                              <span className="flex items-center gap-1 font-mono">
                                <Clock size={12} />
                                {record.avgResponseLatency}s avg
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <ProgressBar
                              value={record.masteryScore}
                              className="flex-1"
                              color={
                                record.status === 'mastered'
                                  ? 'bg-emerald-500'
                                  : record.status === 'in-progress'
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                              }
                            />
                            <span className="text-xs font-semibold w-10 text-right">{record.masteryScore}%</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                              record.status === 'mastered'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : record.status === 'in-progress'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            }`}
                          >
                            <StatusIcon status={record.status} />
                            {record.status === 'unmet' ? 'Gap Detected' : record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─────────────────── TAB 2: PREREQUISITE KNOWLEDGE GRAPH ─────────────────── */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-serif text-lg font-normal">Prerequisite Dependency Map</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hierarchical Directed Acyclic Graph (DAG) enforcing outcome-based concept progression.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchGraph} loading={graphLoading} className="gap-1.5">
                <RefreshCw size={14} /> Refresh DAG
              </Button>
            </CardHeader>

            <CardBody>
              {graphLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </div>
              ) : !graphData || graphData.nodesCount === 0 ? (
                <EmptyState
                  icon={<Network size={40} />}
                  title="No competency graph found"
                  description="Create competencies and concepts with prerequisite links in your courses to view the DAG."
                />
              ) : (
                <div className="space-y-6">
                  {/* Competencies Breakdown */}
                  {graphData.graph.nodes
                    .filter(n => n.type === 'competency')
                    .map(compNode => {
                      const childConcepts = graphData.graph.nodes.filter(
                        n => n.type === 'concept' && n.competencyId === compNode.id
                      );

                      return (
                        <div key={compNode.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary">
                                {compNode.code}
                              </span>
                              <h3 className="font-semibold text-base text-foreground">{compNode.label}</h3>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{compNode.domain}</span>
                          </div>

                          {/* Concepts Sequence */}
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                            {childConcepts.map(concept => {
                              // Find incoming prerequisites
                              const prereqEdges = graphData.graph.edges.filter(
                                e => e.target === concept.id && e.type === 'concept-prereq'
                              );
                              const prereqNames = prereqEdges
                                .map(e => graphData.graph.nodes.find(n => n.id === e.source)?.label)
                                .filter(Boolean);

                              // Find user's mastery if available
                              const mastery = allConceptRecords.find(r => r.conceptId === concept.id);

                              return (
                                <div
                                  key={concept.id}
                                  className={`p-3 rounded-lg border transition-all ${
                                    mastery?.status === 'mastered'
                                      ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/30'
                                      : mastery?.status === 'unmet'
                                      ? 'border-red-200 bg-red-50/20 dark:border-red-900/30'
                                      : 'border-border bg-muted/30'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-xs font-semibold text-foreground">{concept.label}</span>
                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {concept.difficulty || 'beginner'}
                                    </span>
                                  </div>

                                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                                    {concept.code}
                                  </div>

                                  {prereqNames.length > 0 && (
                                    <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1 flex-wrap">
                                      <ArrowRight size={10} className="text-primary shrink-0" />
                                      <span className="font-medium text-foreground">Requires:</span>
                                      <span className="italic">{prereqNames.join(', ')}</span>
                                    </div>
                                  )}

                                  {mastery && (
                                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Mastery:</span>
                                      <span className={`font-semibold ${
                                        mastery.status === 'mastered'
                                          ? 'text-emerald-600'
                                          : mastery.status === 'unmet'
                                          ? 'text-red-500'
                                          : 'text-amber-600'
                                      }`}>
                                        {mastery.masteryScore}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─────────────────── TAB 3: MACRO SKILL OVERVIEW ─────────────────── */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Charts Row */}
          {!skillsLoading && skills.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><h2 className="font-serif text-lg font-normal">Skill Radar</h2></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} cx="50%" cy="50%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="proficiency" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Proficiency']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader><h2 className="font-serif text-lg font-normal">Top Skills by Proficiency</h2></CardHeader>
                <CardBody>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={110} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Proficiency']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="proficiency" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Skills Table */}
          <Card>
            <CardHeader className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-serif text-lg font-normal">All High-Level Skills</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </CardHeader>

            {skillsLoading ? (
              <CardBody className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </CardBody>
            ) : filteredSkills.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon={<Brain size={40} />}
                  title="No skills analyzed yet"
                  description="Click 'Run AI Analysis' to generate your personalized skill map based on your courses and quiz performance."
                  action={<Button variant="secondary" onClick={handleAnalyze} loading={analyzing}>Run AI Analysis</Button>}
                />
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th className="w-48">Proficiency</th>
                      <th>Last Analyzed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkills.map(skill => (
                      <tr key={skill._id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <StatusIcon status={skill.status} />
                            <span className="font-medium">{skill.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge-pill bg-muted text-muted-foreground" style={{ borderLeft: `3px solid ${CATEGORY_COLORS[skill.category] || '#94a3b8'}` }}>
                            {skill.category}
                          </span>
                        </td>
                        <td><StatusBadge status={skill.status} /></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <ProgressBar value={skill.proficiency} className="flex-1" color={skill.status === 'acquired' ? 'bg-emerald-500' : skill.status === 'in-progress' ? 'bg-amber-500' : 'bg-red-400'} />
                            <span className="text-xs font-medium text-muted-foreground w-10 text-right">{skill.proficiency}%</span>
                          </div>
                        </td>
                        <td className="text-muted-foreground text-xs">
                          {new Date(skill.lastAnalyzed).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

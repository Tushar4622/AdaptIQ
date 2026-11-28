import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button, Input, Alert, Card, CardBody } from '@/components/ui';
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, Building } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { AuthFlowResult, MfaSetupCompletion, MfaSetupData } from '@/context/AuthContext';

const AuthShell: React.FC<{ children: React.ReactNode; title: string; subtitle: string }> = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-background flex">
    {/* Left — branding panel */}
    <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <GraduationCap size={22} className="text-slate-900" />
          </div>
          <span className="font-serif text-2xl text-white">AdaptIQ</span>
        </div>
      </div>
      <div className="relative z-10 space-y-6">
        <blockquote className="font-serif text-4xl leading-snug text-white font-normal">
          "The capacity to learn is a gift; the ability to learn is a skill."
        </blockquote>
        <div className="grid grid-cols-3 gap-4 pt-4">
          {[['12,000+', 'Active Learners'], ['240+', 'Expert Courses'], ['94%', 'Completion Rate']].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-semibold text-amber-400">{n}</div>
              <div className="text-sm text-white/60 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Right — form */}
    <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap size={16} className="text-primary-foreground" />
            </div>
            <span className="font-serif text-xl text-foreground">AdaptIQ</span>
          </div>
          <h1 className="font-serif text-3xl font-normal text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  </div>
);

type MfaFlowState = Exclude<AuthFlowResult, { status: 'authenticated' }>;

const MfaFlow: React.FC<{ flow: MfaFlowState }> = ({ flow }) => {
  const { startMfaSetup, verifyMfaSetup, completeMfaSetup, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [completion, setCompletion] = useState<MfaSetupCompletion | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (flow.status !== 'mfa_setup_required') return undefined;
    let active = true;
    startMfaSetup(flow.setupToken)
      .then((data) => {
        if (active) setSetupData(data);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        const message = (requestError as { response?: { data?: { error?: string } } })
          ?.response?.data?.error;
        setError(message || 'Could not start MFA setup. Please try signing in again.');
      });
    return () => { active = false; };
  }, [flow, startMfaSetup]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (flow.status === 'mfa_setup_required') {
        setCompletion(await verifyMfaSetup(flow.setupToken, code.trim()));
      } else {
        const suppliedCode = code.trim();
        await verifyMfa(
          flow.challengeToken,
          /^\d{6}$/.test(suppliedCode)
            ? { code: suppliedCode }
            : { recoveryCode: suppliedCode.toUpperCase() }
        );
        navigate('/dashboard');
      }
    } catch (requestError: unknown) {
      const message = (requestError as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(message || 'MFA verification failed. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (completion) {
    return (
      <div className="space-y-4">
        <Alert variant="success">MFA is enabled. Save these recovery codes somewhere safe; each can only be used once.</Alert>
        <div className="rounded-md border border-border bg-muted/40 p-4 font-mono text-sm grid grid-cols-2 gap-2">
          {completion.recoveryCodes.map((recoveryCode) => <span key={recoveryCode}>{recoveryCode}</span>)}
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            completeMfaSetup(completion.session);
            navigate('/dashboard');
          }}
        >
          I saved my recovery codes
        </Button>
      </div>
    );
  }

  const isSetup = flow.status === 'mfa_setup_required';
  return (
    <div className="space-y-4">
      <Alert variant="warning">
        {isSetup
          ? 'Teacher and admin accounts must enable authenticator-based MFA before continuing.'
          : 'Enter a current authenticator code or one unused recovery code.'}
      </Alert>
      {isSetup && setupData && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border p-4">
          <QRCodeSVG value={setupData.otpauthUri} size={180} level="M" includeMargin />
          <p className="text-xs text-muted-foreground text-center">
            Scan with an authenticator app, or enter this secret manually:
          </p>
          <code className="select-all break-all text-center text-sm">{setupData.secret}</code>
        </div>
      )}
      {isSetup && !setupData && !error && (
        <p className="text-sm text-muted-foreground">Preparing your authenticator setup…</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Input
          label={isSetup ? '6-digit authenticator code' : 'Authenticator or recovery code'}
          value={code}
          onChange={(inputEvent) => setCode(inputEvent.target.value)}
          autoComplete="one-time-code"
          maxLength={27}
        />
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!code.trim() || (isSetup && !setupData)}
        >
          {isSetup ? 'Verify and enable MFA' : 'Verify and sign in'}
        </Button>
      </form>
    </div>
  );
};

// ── Login Page ────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaFlow, setMfaFlow] = useState<MfaFlowState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('All fields are required.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await login(form.email, form.password);
      if (result.status === 'authenticated') navigate('/dashboard');
      else setMfaFlow(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your AdaptIQ account">
      {mfaFlow ? (
        <MfaFlow flow={mfaFlow} />
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <Input label="Email address" type="email" placeholder="you@example.com" icon={<Mail size={16} />}
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  autoComplete="current-password"
                  className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">Create one</Link>
            </p>
          </div>
        </>
      )}
    </AuthShell>
  );
};

// ── Register Page ─────────────────────────────────────────────────────────────
export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'student' as 'student' | 'teacher', institution: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaFlow, setMfaFlow] = useState<MfaFlowState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields are required.'); return; }
    const passwordBytes = new TextEncoder().encode(form.password).length;
    if (
      form.password.length < 12 ||
      passwordBytes > 72 ||
      !/[a-z]/.test(form.password) ||
      !/[A-Z]/.test(form.password) ||
      !/\d/.test(form.password) ||
      !/[^A-Za-z0-9]/.test(form.password)
    ) {
      setError('Use 12+ characters with uppercase, lowercase, a number, and a symbol (72 UTF-8 bytes max).');
      return;
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await register({ name: form.name, email: form.email, password: form.password, role: form.role, institution: form.institution });
      if (result.status === 'authenticated') navigate('/dashboard');
      else setMfaFlow(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed.';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join thousands of learners on AdaptIQ">
      {mfaFlow ? (
        <MfaFlow flow={mfaFlow} />
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <Input label="Full Name" placeholder="Your full name" icon={<User size={16} />}
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <Input label="Email Address" type="email" placeholder="you@example.com" icon={<Mail size={16} />}
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            <Input label="Password" type="password" placeholder="12+ chars with upper/lower/number/symbol" icon={<Lock size={16} />}
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
            <Input label="Confirm Password" type="password" placeholder="Repeat password" icon={<Lock size={16} />}
              value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} autoComplete="new-password" />
            <Input label="Institution (optional)" placeholder="University or company" icon={<Building size={16} />}
              value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">I am a…</label>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'teacher'] as const).map((r) => (
                  <button key={r} type="button"
                    className={`flex items-center justify-center gap-2 h-10 rounded-md border text-sm font-medium transition-all ${form.role === r ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-border hover:text-foreground'}`}
                    onClick={() => setForm(p => ({ ...p, role: r }))}>
                    {r === 'student' ? <GraduationCap size={16} /> : <User size={16} />}
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full mt-2" loading={loading}>Create Account</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </>
      )}
    </AuthShell>
  );
};

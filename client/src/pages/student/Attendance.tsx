import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, CameraOff, Download, RefreshCw, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, CardBody, Input, Select, Spinner, toast } from '@/components/ui';

type AttendanceSession = {
  _id: string;
  name: string;
  targetRole: 'student' | 'teacher';
  course?: { _id: string; title: string } | string | null;
  status: 'open' | 'closed';
  startedAt: string;
};

type AttendancePerson = { _id: string; name: string; email: string; role: string };
type AttendanceRecord = {
  _id: string;
  subject: AttendancePerson;
  status: 'present' | 'late' | 'absent';
  markedAt: string;
  method: 'qr_face' | 'manual_override';
  overrideReason: string;
};

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safeText = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, rows: unknown[][]) => {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const FaceEnrollmentPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/attendance/face/status')
      .then(({ data }) => { if (active) setEnrolled(Boolean(data.enrolled)); })
      .catch(() => { if (active) setError('Face enrollment status is unavailable.'); });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [cameraOpen]);

  const startCamera = async () => {
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera access requires HTTPS or localhost.');
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCameraOpen(true);
    } catch {
      setError('Camera permission was denied or the camera is unavailable.');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || photos.length >= 5) return;
    const scale = Math.min(1, 640 / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhotos((current) => [...current, canvas.toDataURL('image/jpeg', 0.65)]);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const submitEnrollment = async () => {
    if (!consent || photos.length < 3) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/attendance/face/enroll', { consent: true, photos }, { timeout: 90000 });
      setEnrolled(true);
      setPhotos([]);
      stopCamera();
      toast('Encrypted face enrollment saved.', 'success');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Face enrollment could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  const removeEnrollment = async () => {
    setBusy(true);
    try {
      await api.delete('/attendance/face/enroll');
      setEnrolled(false);
      toast('Face enrollment removed.', 'success');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Face enrollment could not be removed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card><CardBody className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-semibold">Face enrollment</h2><p className="text-sm text-muted-foreground">Encrypted face embeddings are stored; captures are sent to the configured server model and discarded after processing.</p></div>
        {enrolled && <Button variant="danger" size="sm" loading={busy} onClick={removeEnrollment}><Trash2 size={15} /> Remove</Button>}
      </div>
      {enrolled ? <p className="text-sm text-emerald-700">Face verification is enrolled for this account.</p> : <>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
          <span>I consent to enrollment of an encrypted face embedding for attendance verification. I understand this can be removed later.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={startCamera}><Camera size={15} /> Open camera</Button>
          {cameraOpen ? <Button variant="outline" size="sm" onClick={stopCamera}><CameraOff size={15} /> Close camera</Button> : <Button variant="outline" size="sm" onClick={startCamera}><Camera size={15} /> Open camera</Button>}
          <Button variant="outline" size="sm" disabled={!cameraOpen || photos.length >= 5} onClick={captureFrame}><Camera size={15} /> Capture ({photos.length}/5)</Button>
          <Button variant="ghost" size="sm" onClick={() => setPhotos([])} disabled={!photos.length}><CameraOff size={15} /> Clear captures</Button>
          <Button size="sm" loading={busy} disabled={!consent || photos.length < 3} onClick={submitEnrollment}>Enroll</Button>
        </div>
        {cameraOpen && <video ref={videoRef} className="aspect-video w-full max-w-md rounded-md bg-black object-cover" muted playsInline />}
        <p className="text-xs text-muted-foreground">Capture 3–5 different angles. Camera access requires HTTPS or localhost. Photos remain only in memory until enrollment completes.</p>
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </CardBody></Card>
  );
};

const StudentAttendance: React.FC = () => {
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get('/attendance/qr-token');
        if (!active) return;
        setToken(data.token);
        setExpiresAt(data.expiresAt);
        setError('');
      } catch (requestError) {
        if (active) setError(errorMessage(requestError, 'Could not refresh your attendance QR code.'));
      }
    };
    const loadRecords = async () => {
      try {
        const { data } = await api.get('/attendance/records/me');
        if (active) setRecords(data.records || []);
      } catch {
        if (active) setError('Attendance history is temporarily unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();
    loadRecords();
    const timer = window.setInterval(refresh, 45000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">My Attendance</h1>
        <p className="page-subtitle">Your rotating attendance code and course history.</p>
      </header>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardBody className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-semibold">Personal QR code</h2>
            {token ? <QRCodeSVG value={token} size={220} level="M" includeMargin /> : <Spinner />}
            <p className="text-sm text-muted-foreground">
              Refreshes every 45 seconds. Each token is signed, short-lived, and single-use.
            </p>
            {expiresAt && <p className="text-xs text-muted-foreground">Valid until {new Date(expiresAt).toLocaleTimeString()}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              Face verification is currently unavailable until the college configures its approved server-side verifier.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent records</h2>
              <Button variant="outline" size="sm" disabled={!records.length} onClick={() => downloadCsv('my-attendance.csv', [
                ['Course', 'Session', 'Date', 'Status'],
                ...records.map((record) => [
                  typeof (record as any).course === 'object' ? (record as any).course?.title : '',
                  typeof (record as any).session === 'object' ? (record as any).session?.name : '',
                  new Date(record.markedAt).toLocaleString(),
                  record.status,
                ]),
              ])}>
                <Download size={15} /> Export CSV
              </Button>
            </div>
            {loading ? <Spinner /> : records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="py-2">Session</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>{records.map((record) => (
                    <tr key={record._id} className="border-b last:border-0">
                      <td className="py-3">{(record as any).session?.name || 'Class session'}</td>
                      <td>{(record as any).course?.title || '—'}</td>
                      <td>{new Date(record.markedAt).toLocaleDateString()}</td>
                      <td className="capitalize">{record.status}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
      <FaceEnrollmentPanel />
    </div>
  );
};

const QrCameraScanner: React.FC<{ active: boolean; action: string; onRead: (token: string, images: string[]) => void }> = ({ active, action, onRead }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onReadRef = useRef(onRead);
  const [message, setMessage] = useState('');

  useEffect(() => { onReadRef.current = onRead; }, [onRead]);

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let timer = 0;
    let stream: MediaStream | null = null;
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;

    const start = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setMessage('Camera access requires HTTPS or localhost.');
        return;
      }
      if (!Detector) {
        setMessage('This browser does not support QR camera scanning. Use a current Chrome or Edge browser.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({ formats: ['qr_code'] });
        let scannedToken = '';
        const faceImages: string[] = [];
        const captureFrame = () => {
          const currentVideo = videoRef.current;
          if (!currentVideo?.videoWidth || !currentVideo.videoHeight) return '';
          const canvas = document.createElement('canvas');
          canvas.width = currentVideo.videoWidth;
          canvas.height = currentVideo.videoHeight;
          canvas.getContext('2d')?.drawImage(currentVideo, 0, 0);
          return canvas.toDataURL('image/jpeg', 0.82);
        };
        const scan = async () => {
          const video = videoRef.current;
          if (cancelled || !video || video.readyState < 2) return;
          try {
            if (scannedToken) {
              const frame = captureFrame();
              if (frame) faceImages.push(frame);
              if (faceImages.length >= 5) {
                onReadRef.current(scannedToken, faceImages);
                setMessage('Camera sequence captured. Waiting for verification...');
                return;
              }
            } else {
              const [barcode] = await detector.detect(video);
              if (barcode?.rawValue) {
                scannedToken = barcode.rawValue;
                setMessage(`QR found. Please ${action.replace('-', ' ')} while facing the camera.`);
              }
            }
          } catch {
            setMessage('Could not read the QR code. Adjust the camera and try again.');
          }
          timer = window.setTimeout(scan, 350);
        };
        scan();
      } catch {
        setMessage('Camera permission was denied or the camera is unavailable.');
      }
    };

    start();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active, action]);

  if (!active) return null;
  return (
    <div className="space-y-2">
      <video ref={videoRef} className="aspect-video w-full max-w-xl rounded-md bg-black object-cover" muted playsInline />
      <p className="text-sm text-muted-foreground">{message || 'Point the camera at the attendee QR code.'}</p>
    </div>
  );
};

const TeacherQrCard: React.FC = () => {
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.get('/attendance/qr-token');
        if (!active) return;
        setToken(data.token);
        setExpiresAt(data.expiresAt);
        setError('');
      } catch (requestError) {
        if (active) setError(errorMessage(requestError, 'Could not refresh your QR code.'));
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 45000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <Card><CardBody className="flex items-center gap-4">
    {token ? <QRCodeSVG value={token} size={112} level="M" includeMargin /> : <Spinner />}
    <div><h2 className="font-semibold">Your teacher QR code</h2><p className="text-sm text-muted-foreground">Rotates every 45 seconds for admin attendance.</p>
      {expiresAt && <p className="mt-1 text-xs text-muted-foreground">Valid until {new Date(expiresAt).toLocaleTimeString()}</p>}
      {error && <p role="alert" className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  </CardBody></Card>;
};

const StaffAttendance: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [courseId, setCourseId] = useState('');
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [eligibleSubjects, setEligibleSubjects] = useState<AttendancePerson[]>([]);
  const [summary, setSummary] = useState<{ totalSessions: number; students: (AttendancePerson & { attended: number; totalSessions: number; percentage: number; lowAttendance: boolean })[] } | null>(null);
  const [report, setReport] = useState<{ sessions: AttendanceSession[]; records: AttendanceRecord[] } | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [manualStatus, setManualStatus] = useState<Record<string, string>>({});
  const [manualReason, setManualReason] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [livenessChallenge, setLivenessChallenge] = useState<{ token: string; action: string } | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadSessions = async () => {
    try {
      const { data } = await api.get('/attendance/sessions', {
        params: {
          ...(!isAdmin && courseId ? { courseId } : {}),
          ...(fromDate ? { from: fromDate } : {}),
          ...(toDate ? { to: toDate } : {}),
        },
      });
      setSessions(data.sessions || []);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load attendance sessions.'));
    }
  };

  const loadSessionRecords = async (id: string) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/attendance/sessions/${id}/records`);
      setSession(data.session);
      setRecords(data.records || []);
      setEligibleSubjects(data.eligibleSubjects || []);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load session records.'));
    }
  };

  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      if (isAdmin) return;
      try {
        const { data } = await api.get('/courses/my-courses');
        if (!active) return;
        const nextCourses = data.courses || [];
        setCourses(nextCourses);
        setCourseId((current) => current || nextCourses[0]?._id || '');
      } catch (loadError) {
        if (active) setError(errorMessage(loadError, 'Could not load your courses.'));
      }
    };
    loadCourses();
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => { loadSessions(); }, [courseId, isAdmin, fromDate, toDate]);

  useEffect(() => {
    if (selectedSessionId) loadSessionRecords(selectedSessionId);
  }, [selectedSessionId]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/attendance/reports/teachers', { params: { from: fromDate || undefined, to: toDate || undefined } })
        .then(({ data }) => setReport(data))
        .catch((loadError) => setError(errorMessage(loadError, 'Could not load teacher attendance report.')));
      return;
    }
    if (courseId) {
      api.get(`/attendance/courses/${courseId}/summary`, { params: { from: fromDate || undefined, to: toDate || undefined } })
        .then(({ data }) => setSummary(data))
        .catch((loadError) => setError(errorMessage(loadError, 'Could not load attendance percentages.')));
    }
  }, [courseId, isAdmin, fromDate, toDate]);

  const createSession = async () => {
    if (!sessionName.trim() || (!isAdmin && !courseId)) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/attendance/sessions', {
        name: sessionName.trim(),
        ...(isAdmin ? {} : { courseId }),
      });
      setSessionName('');
      await loadSessions();
      setSelectedSessionId(data.session._id);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not open attendance session.'));
    } finally {
      setBusy(false);
    }
  };

  const markManual = async (personId: string) => {
    if (!selectedSessionId) return;
    try {
      await api.post(`/attendance/sessions/${selectedSessionId}/manual`, {
        userId: personId,
        status: manualStatus[personId] || 'present',
        reason: manualReason[personId] || '',
      });
      setManualReason((current) => ({ ...current, [personId]: '' }));
      await loadSessionRecords(selectedSessionId);
      toast('Attendance saved and audit logged.', 'success');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not save manual attendance.'));
    }
  };

  const handleQrRead = async (token: string, images: string[]) => {
    if (!selectedSessionId) return;
    setScanning(false);
    setError('Checking QR and live face...');
    try {
      await api.post(`/attendance/sessions/${selectedSessionId}/scan`, {
        token,
        faceImages: images,
        challengeToken: livenessChallenge?.token,
      });
      setError('');
      await loadSessionRecords(selectedSessionId);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Automatic verification is unavailable. Use a reasoned manual override.'));
    } finally {
      setLivenessChallenge(null);
    }
  };

  const toggleQrScan = async () => {
    if (scanning) {
      setScanning(false);
      setLivenessChallenge(null);
      return;
    }
    if (!selectedSessionId) return;
    try {
      const { data } = await api.get(`/attendance/sessions/${selectedSessionId}/challenge`);
      setLivenessChallenge(data);
      setError('');
      setScanning(true);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Face verification is not configured. Manual override is available.'));
    }
  };

  const closeSession = async () => {
    if (!selectedSessionId) return;
    try {
      await api.post(`/attendance/sessions/${selectedSessionId}/close`);
      await loadSessionRecords(selectedSessionId);
      await loadSessions();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Could not close the session.'));
    }
  };

  const exportSelected = () => {
    if (!session) return;
    downloadCsv(`${session.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-attendance.csv`, [
      ['Name', 'Email', 'Status', 'Marked at', 'Method', 'Override reason'],
      ...records.map((record) => [record.subject?.name, record.subject?.email, record.status, new Date(record.markedAt).toLocaleString(), record.method, record.overrideReason]),
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="page-header">
        <h1 className="page-title">{isAdmin ? 'Teacher Attendance' : 'Course Attendance'}</h1>
        <p className="page-subtitle">{isAdmin ? 'Review and export teacher attendance.' : 'Take attendance and review course attendance rates.'}</p>
      </header>

      {!isAdmin && <><TeacherQrCard /><FaceEnrollmentPanel /></>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {!isAdmin && <Select label="Course" value={courseId} onChange={(event) => { setCourseId(event.target.value); setSelectedSessionId(''); }}>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
        </Select>}
        <Input label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <Input label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <Input label="Session name" value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="e.g. Data Structures, Week 4" />
        <div className="flex items-end"><Button loading={busy} onClick={createSession}>Open session</Button></div>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <section className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)]">
        <Card><CardBody>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Sessions</h2><Button title="Refresh sessions" aria-label="Refresh sessions" variant="ghost" size="sm" onClick={loadSessions}><RefreshCw size={16} /></Button></div>
          <div className="space-y-2">
            {sessions.length === 0 && <p className="text-sm text-muted-foreground">No attendance sessions yet.</p>}
            {sessions.map((item) => <button key={item._id} type="button" onClick={() => setSelectedSessionId(item._id)} className={`w-full rounded-md border p-3 text-left ${selectedSessionId === item._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{new Date(item.startedAt).toLocaleString()} · {item.status}</span>
            </button>)}
          </div>
        </CardBody></Card>

        <div className="space-y-6">
          {session && <Card><CardBody>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold">{session.name}</h2><p className="text-sm text-muted-foreground">{session.status === 'open' ? 'Open' : 'Closed'} · {new Date(session.startedAt).toLocaleString()}</p></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportSelected}><Download size={15} /> CSV</Button>
                {session.status === 'open' && <Button variant="secondary" size="sm" onClick={closeSession}>Close session</Button>}
                {session.status === 'open' && <Button variant="outline" size="sm" onClick={toggleQrScan}><Camera size={15} /> {scanning ? 'Stop scan' : 'Scan QR'}</Button>}
              </div>
            </div>
            <QrCameraScanner active={scanning} action={livenessChallenge?.action || 'blink'} onRead={(token, images) => { void handleQrRead(token, images); }} />
            {scanning && livenessChallenge && <p className="mb-2 text-sm font-medium">Liveness check: {livenessChallenge.action.replace('-', ' ')}</p>}
            {scanning && <p className="mt-2 text-xs text-muted-foreground">Camera access requires HTTPS or localhost. Automatic marking remains disabled until a server-side face and liveness verifier is configured.</p>}
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-semibold">Manual override</h3>
              <p className="text-xs text-muted-foreground">Every override requires a reason and is added to the audit log.</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead><tr className="border-b text-muted-foreground"><th className="py-2">Attendee</th><th>Status</th><th>Reason</th><th>Action</th></tr></thead>
                  <tbody>{eligibleSubjects.map((person) => {
                    const record = records.find((item) => item.subject?._id === person._id);
                    return <tr key={person._id} className="border-b last:border-0">
                      <td className="py-3"><span className="block font-medium">{person.name}</span><span className="text-xs text-muted-foreground">{person.email}</span></td>
                      <td><Select aria-label={`Attendance status for ${person.name}`} value={manualStatus[person._id] || record?.status || 'present'} onChange={(event) => setManualStatus((current) => ({ ...current, [person._id]: event.target.value }))}>
                        <option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option>
                      </Select></td>
                      <td><input aria-label={`Override reason for ${person.name}`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs" value={manualReason[person._id] || ''} onChange={(event) => setManualReason((current) => ({ ...current, [person._id]: event.target.value }))} placeholder="Required, min. 8 chars" /></td>
                      <td><Button size="sm" disabled={session.status !== 'open'} onClick={() => markManual(person._id)}>{record ? 'Update' : 'Mark'}</Button></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              {eligibleSubjects.length === 0 && <p className="text-sm text-muted-foreground">No eligible attendees were found.</p>}
            </div>
          </CardBody></Card>}

          {!isAdmin && summary && <Card><CardBody>
            <h2 className="mb-3 font-semibold">Attendance percentage</h2>
            <p className="mb-3 text-xs text-muted-foreground">Calculated from {summary.totalSessions} closed sessions. Warnings are shown below 75%.</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-2">Student</th><th>Present</th><th>Rate</th><th>Alert</th></tr></thead><tbody>
              {summary.students.map((student) => <tr key={student._id} className="border-b last:border-0"><td className="py-3">{student.name}</td><td>{student.percentage}%</td><td>{student.attended}/{student.totalSessions}</td><td>{student.lowAttendance ? <span className="text-destructive">Below 75%</span> : '—'}</td></tr>)}
            </tbody></table></div>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => downloadCsv('course-attendance-summary.csv', [['Student', 'Email', 'Rate', 'Attended', 'Sessions'], ...summary.students.map((student) => [student.name, student.email, `${student.percentage}%`, student.attended, student.totalSessions])])}><Download size={15} /> Export CSV</Button>
          </CardBody></Card>}

          {isAdmin && report && <Card><CardBody>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Teacher records</h2><Button variant="outline" size="sm" onClick={() => downloadCsv('teacher-attendance.csv', [['Teacher', 'Email', 'Session', 'Date', 'Status', 'Method', 'Override reason'], ...report.records.map((record) => [record.subject?.name, record.subject?.email, (record as any).session?.name, new Date(record.markedAt).toLocaleString(), record.status, record.method, record.overrideReason])])}><Download size={15} /> Export CSV</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="py-2">Teacher</th><th>Session</th><th>Date</th><th>Status</th><th>Method</th></tr></thead><tbody>
              {report.records.map((record) => <tr key={record._id} className="border-b last:border-0"><td className="py-3">{record.subject?.name}</td><td>{(record as any).session?.name}</td><td>{new Date(record.markedAt).toLocaleDateString()}</td><td className="capitalize">{record.status}</td><td>{record.method === 'manual_override' ? 'Manual override' : 'QR + face'}</td></tr>)}
            </tbody></table></div>
            {report.records.length === 0 && <p className="text-sm text-muted-foreground">No teacher attendance records for this period.</p>}
          </CardBody></Card>}
        </div>
      </section>
    </div>
  );
};

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'student') return <StudentAttendance />;
  if (user?.role === 'teacher') return <StaffAttendance isAdmin={false} />;
  if (user?.role === 'admin') return <StaffAttendance isAdmin />;
  return <div className="flex min-h-40 items-center justify-center"><Spinner /></div>;
};
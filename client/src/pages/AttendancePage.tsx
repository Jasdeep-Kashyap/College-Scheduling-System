import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, resourceApi } from '../api/analytics.api';
import { useAuth } from '../context/AuthContext';
import {
  QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Clock, UserCheck,
  BookOpen, Star, MessageSquare, Zap, BarChart2, ChevronRight, X,
} from 'lucide-react';
import { Session, Attendance } from '../types';
import { timetableApi } from '../api/timetable.api';
import toast from 'react-hot-toast';

// ─── QR Projector ─────────────────────────────────────────────────────────────
const QrProjector = ({ sessionId }: { sessionId: string }) => {
  const [qrData, setQrData] = useState<{ qrToken: string; expiresAt: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const fetchQr = useCallback(async () => {
    try {
      const res = await attendanceApi.startQr(sessionId);
      setQrData(res.data);
      setTimeLeft(30);
    } catch { toast.error('Failed to generate QR'); }
  }, [sessionId]);

  useEffect(() => { fetchQr(); const interval = setInterval(fetchQr, 30000); return () => clearInterval(interval); }, [fetchQr]);
  useEffect(() => { const tick = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000); return () => clearInterval(tick); }, [qrData]);

  const progress = (timeLeft / 30) * 100;

  return (
    <div className="card text-center">
      <h3 className="font-semibold text-white mb-4 flex items-center justify-center gap-2">
        <QrCode className="w-5 h-5 text-indigo-400" /> Live QR Check-in Code
      </h3>

      <div className="relative inline-block mb-4">
        {/* QR visual */}
        <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg shadow-black/30">
          <QrCode className="w-28 h-28 text-slate-900" />
          <div className="text-xs font-mono mt-2 text-slate-500 break-all">
            {qrData?.qrToken?.slice(0, 10)}…
          </div>
        </div>
        {/* Countdown ring */}
        <div
          className="absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-colors"
          style={{
            borderColor: timeLeft <= 5 ? '#ef4444' : '#6366f1',
            background: `conic-gradient(${timeLeft <= 5 ? '#ef4444' : '#6366f1'} ${progress * 3.6}deg, #1e293b 0deg)`,
          }}
        >
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
            <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
        <Clock className="w-4 h-4" /> Auto-refreshes every 30s
      </div>
      <button onClick={fetchQr} className="btn-secondary btn-sm flex items-center gap-2 mx-auto">
        <RefreshCw className="w-3.5 h-3.5" /> Refresh Now
      </button>
    </div>
  );
};

// ─── Poll Launcher (Teacher) ──────────────────────────────────────────────────
const PollLauncher = ({ sessionId }: { sessionId: string }) => {
  const [question, setQuestion] = useState('');
  const [pollSent, setPollSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const presets = [
    'Did you understand the topic covered today?',
    'Was the pace of today\'s lecture appropriate?',
    'How confident do you feel about the concepts?',
    'Would you like a quick revision next class?',
  ];

  const sendPoll = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      await attendanceApi.submitEngagement({ sessionId, type: 'POLL', score: 0, totalPrompt: question });
      setPollSent(true);
      toast.success('Poll launched! Students can now respond.');
    } catch {
      toast.error('Failed to launch poll');
    } finally {
      setLoading(false);
    }
  };

  if (pollSent) return (
    <div className="card text-center py-8">
      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
      <div className="text-white font-semibold">Poll Active!</div>
      <div className="text-slate-400 text-sm mt-1">Students will see the poll on their Attendance screen</div>
      <button onClick={() => { setPollSent(false); setQuestion(''); }} className="btn-secondary btn-sm mt-4 mx-auto flex items-center gap-2">
        <Zap className="w-3.5 h-3.5" /> New Poll
      </button>
    </div>
  );

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-white flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" /> Launch Engagement Poll
      </h3>
      <div className="space-y-2">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setQuestion(p)}
            className={`w-full text-left text-sm p-3 rounded-lg border transition-all ${
              question === p ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5 inline mr-1.5 opacity-60" />{p}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Or type a custom question</label>
        <input
          className="input"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Any question to check class understanding..."
        />
      </div>
      <button
        onClick={sendPoll}
        disabled={!question.trim() || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Launch Poll
      </button>
    </div>
  );
};

// ─── Roll Call Table (Teacher) ────────────────────────────────────────────────
const RollCall = ({ sessionId }: { sessionId: string }) => {
  const { data: attendanceData, refetch } = useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: () => attendanceApi.getSessionAttendance(sessionId),
    enabled: !!sessionId,
  });

  const records: any[] = attendanceData?.data || [];
  const presentCount = records.filter(r => r.status === 'PRESENT').length;

  const bulkMarkMutation = useMutation({
    mutationFn: (status: string) => attendanceApi.bulkMark(
      sessionId,
      records.map(r => ({ studentId: r.studentId, status }))
    ),
    onSuccess: () => { toast.success('All students marked!'); refetch(); },
  });

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" /> Roll Call
        </h3>
        <span className="badge badge-success">{presentCount}/{records.length} present</span>
      </div>
      {records.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">No students have checked in via QR yet.</div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {records.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
              <span className="text-slate-300 text-sm">{r.student?.user?.name || 'Student'}</span>
              <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : r.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => bulkMarkMutation.mutate('PRESENT')} className="btn-primary btn-sm flex-1 text-xs">Mark All Present</button>
        <button onClick={() => bulkMarkMutation.mutate('ABSENT')} className="btn-danger btn-sm flex-1 text-xs">Mark All Absent</button>
      </div>
    </div>
  );
};

// ─── Student Feedback Modal ───────────────────────────────────────────────────
const FeedbackModal = ({ sessionId, onClose }: { sessionId: string; onClose: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const allTags = ['Clear explanation', 'Too fast', 'Good examples', 'Need more practice', 'Interesting topic', 'Difficult content'];

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const submit = async () => {
    if (!rating) { toast.error('Please give a star rating'); return; }
    setLoading(true);
    try {
      await attendanceApi.submitFeedback({ sessionId, rating, tags, comment });
      toast.success('Feedback submitted! Thank you.');
      onClose();
    } catch { toast.error('Failed to submit feedback'); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Exit Ticket
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="label">How was today's lecture?</label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={`w-8 h-8 transition-colors ${star <= (hovered || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-amber-400 text-sm ml-2 self-center">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="label">Quick tags (optional)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    tags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Any comments? (optional)</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What would make future lectures better?"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary flex-1">Skip</button>
          <button onClick={submit} disabled={loading || !rating} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Student View ─────────────────────────────────────────────────────────────
const StudentAttendanceView = () => {
  const { data } = useQuery({ queryKey: ['my-attendance'], queryFn: attendanceApi.getMyAttendance });
  const records = data?.data || [];
  const [showFeedback, setShowFeedback] = useState<string | null>(null);

  const presentCount = records.filter((r: Attendance) => r.status === 'PRESENT').length;
  const percentage = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: records.length, color: 'text-white' },
          { label: 'Present', value: presentCount, color: 'text-emerald-400' },
          { label: 'Attendance Rate', value: `${percentage}%`, color: percentage >= 75 ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="card-sm text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Overall Attendance</span>
          <span className={`font-bold ${percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{percentage}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {percentage < 75 && (
          <p className="text-red-400 text-xs mt-2">⚠ Below 75% minimum attendance requirement</p>
        )}
      </div>

      {/* Exit ticket prompt */}
      {records.length > 0 && (
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-white font-medium">Exit Ticket</div>
              <div className="text-slate-400 text-sm">Share feedback on your most recent lecture</div>
            </div>
          </div>
          <button
            onClick={() => setShowFeedback(records[0]?.sessionId || '')}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            <Star className="w-3.5 h-3.5" /> Give Feedback
          </button>
        </div>
      )}

      {/* Recent records */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Attendance History</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {records.slice(0, 20).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40">
              <div>
                <div className="text-sm text-white font-medium">{r.session?.course?.name || 'Course'}</div>
                <div className="text-xs text-slate-400">{r.session?.date?.split('T')[0]} · Slot {r.session?.timeSlot?.slotNumber}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : r.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>
                  {r.status}
                </span>
              </div>
            </div>
          ))}
          {records.length === 0 && <div className="text-center text-slate-500 py-8">No attendance records yet</div>}
        </div>
      </div>

      {showFeedback && <FeedbackModal sessionId={showFeedback} onClose={() => setShowFeedback(null)} />}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AttendancePage = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedSession, setSelectedSession] = useState('');
  const [activeTab, setActiveTab] = useState<'qr' | 'poll' | 'rollcall'>('qr');

  const { data: ttData } = useQuery({
    queryKey: ['timetable', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => timetableApi.getTimetable(now.getMonth() + 1, now.getFullYear()),
  });

  const sessions: Session[] = ttData?.data?.sessions || [];
  const todaySessions = sessions.filter(s => s.date.split('T')[0] === now.toISOString().split('T')[0]);

  const teacherTabs = [
    { key: 'qr', label: 'QR Projector', icon: QrCode },
    { key: 'poll', label: 'Poll', icon: Zap },
    { key: 'rollcall', label: 'Roll Call', icon: BarChart2 },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-indigo-400" />
          Attendance
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {user?.role === 'TEACHER' ? 'Manage QR check-ins, polls, and roll call' :
           user?.role === 'ADMIN' ? 'Monitor session check-ins and engagement' :
           'View your attendance history and submit feedback'}
        </p>
      </div>

      {/* Student View */}
      {user?.role === 'STUDENT' && <StudentAttendanceView />}

      {/* Teacher / Admin View */}
      {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session selector */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Today's Sessions
            </h3>
            {todaySessions.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No sessions scheduled for today.</p>
                <p className="text-slate-600 text-xs mt-1">Generate a timetable first in the Timetable tab.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSession(s.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedSession === s.id
                        ? 'bg-indigo-600/20 border-indigo-500/50'
                        : 'bg-slate-700/40 border-slate-600/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium text-sm">{s.course.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{s.batch.name} · {s.room.name}</div>
                      </div>
                      <span className="badge badge-info text-xs">{s.timeSlot.startTime}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: tabs */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSession ? (
              <>
                {/* Tab selector */}
                <div className="flex gap-2">
                  {teacherTabs.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>

                {activeTab === 'qr' && <QrProjector sessionId={selectedSession} />}
                {activeTab === 'poll' && <PollLauncher sessionId={selectedSession} />}
                {activeTab === 'rollcall' && <RollCall sessionId={selectedSession} />}
              </>
            ) : (
              <div className="card flex items-center justify-center text-center py-16">
                <div>
                  <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">Select a session to begin</p>
                  <p className="text-slate-600 text-sm mt-1">Then use QR codes, polls, or roll call</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

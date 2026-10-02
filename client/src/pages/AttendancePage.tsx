import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { attendanceApi, resourceApi } from '../api/analytics.api';
import { useAuth } from '../context/AuthContext';
import { QrCode, CheckCircle2, XCircle, Loader2, RefreshCw, Clock, UserCheck, BookOpen } from 'lucide-react';
import { Session, Attendance } from '../types';
import { timetableApi } from '../api/timetable.api';
import toast from 'react-hot-toast';

// ─── QR Projector (Teacher View) ───────────────────────────────────────────────
const QrProjector = ({ sessionId }: { sessionId: string }) => {
  const [qrData, setQrData] = useState<{ qrToken: string; expiresAt: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const fetchQr = useCallback(async () => {
    try {
      const res = await attendanceApi.startQr(sessionId);
      setQrData(res.data);
      setTimeLeft(30);
    } catch {
      toast.error('Failed to generate QR');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchQr();
    const interval = setInterval(fetchQr, 30000);
    return () => clearInterval(interval);
  }, [fetchQr]);

  useEffect(() => {
    const tick = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, [qrData]);

  return (
    <div className="card text-center max-w-sm mx-auto">
      <h3 className="font-semibold text-white mb-4 flex items-center justify-center gap-2">
        <QrCode className="w-5 h-5 text-indigo-400" />
        Live QR Code
      </h3>

      {/* Visual QR representation */}
      <div className="relative inline-block">
        <div className="w-48 h-48 mx-auto bg-white rounded-xl p-4 mb-4 flex items-center justify-center">
          <div className="text-slate-800 text-center">
            <QrCode className="w-24 h-24 text-slate-800" />
            <div className="text-xs font-mono mt-2 break-all text-slate-500">
              {qrData?.qrToken?.slice(0, 8)}...
            </div>
          </div>
        </div>
        {/* Timer ring */}
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center">
          <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
            {timeLeft}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-4">
        <Clock className="w-4 h-4" />
        Auto-refreshes every 30 seconds
      </div>
      <button onClick={fetchQr} className="btn-secondary btn-sm flex items-center gap-2 mx-auto">
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh Now
      </button>
    </div>
  );
};

// ─── Student View ───────────────────────────────────────────────────────────────
const StudentAttendanceView = () => {
  const { data } = useQuery({ queryKey: ['my-attendance'], queryFn: attendanceApi.getMyAttendance });
  const records = data?.data || [];

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

      {/* Recent records */}
      <div className="card">
        <h3 className="font-semibold text-white mb-4">Recent Attendance</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {records.slice(0, 20).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40">
              <div>
                <div className="text-sm text-white font-medium">{r.session?.course?.name || 'Course'}</div>
                <div className="text-xs text-slate-400">{r.session?.date?.split('T')[0]} · Slot {r.session?.timeSlot?.slotNumber}</div>
              </div>
              <span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : r.status === 'LATE' ? 'badge-warning' : 'badge-danger'}`}>
                {r.status}
              </span>
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center text-slate-500 py-8">No attendance records yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────────
export const AttendancePage = () => {
  const { user } = useAuth();
  const now = new Date();
  const [selectedSession, setSelectedSession] = useState('');

  const { data: ttData } = useQuery({
    queryKey: ['timetable', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => timetableApi.getTimetable(now.getMonth() + 1, now.getFullYear()),
  });

  const sessions: Session[] = ttData?.data?.sessions || [];
  const todaySessions = sessions.filter(
    (s) => s.date.split('T')[0] === now.toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-indigo-400" />
          Attendance
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {user?.role === 'TEACHER' ? 'Generate QR codes and manage roll call' : "View your attendance history"}
        </p>
      </div>

      {/* Student View */}
      {user?.role === 'STUDENT' && <StudentAttendanceView />}

      {/* Teacher / Admin View */}
      {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session selector */}
          <div className="card space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Today's Sessions
            </h3>
            {todaySessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No sessions scheduled for today.
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
                      <span className="badge badge-info text-xs">
                        {s.timeSlot.startTime}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QR Projector */}
          {selectedSession ? (
            <QrProjector sessionId={selectedSession} />
          ) : (
            <div className="card flex items-center justify-center text-center py-12">
              <div>
                <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Select a session to generate the QR code</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

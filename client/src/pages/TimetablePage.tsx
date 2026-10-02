import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '../api/timetable.api';
import { resourceApi } from '../api/analytics.api';
import { useAuth } from '../context/AuthContext';
import { Session, Batch, TimeSlot } from '../types';
import {
  Calendar, RefreshCw, Send, ChevronLeft, ChevronRight,
  Loader2, AlertTriangle, CheckCircle, Info, Settings2, X, Sparkles,
  Award, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const COURSE_COLORS = [
  'bg-indigo-600/20 border-indigo-500/50 text-indigo-300',
  'bg-emerald-600/20 border-emerald-500/50 text-emerald-300',
  'bg-amber-600/20 border-amber-500/50 text-amber-300',
  'bg-blue-600/20 border-blue-500/50 text-blue-300',
  'bg-purple-600/20 border-purple-500/50 text-purple-300',
  'bg-pink-600/20 border-pink-500/50 text-pink-300',
  'bg-cyan-600/20 border-cyan-500/50 text-cyan-300',
  'bg-orange-600/20 border-orange-500/50 text-orange-300',
];

const getSlotBorderColor = (score: number) => {
  if (score >= 4.5) return 'slot-prime';
  if (score >= 3.5) return 'slot-good';
  if (score >= 2.5) return 'slot-moderate';
  return 'slot-poor';
};

// ─── Slider Component ─────────────────────────────────────────────────────────
const WeightSlider = ({
  label, description, value, onChange, min = 1, max = 20,
}: { label: string; description: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <span className="text-indigo-400 font-bold text-lg w-8 text-right">{value}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
    />
    <div className="flex justify-between text-xs text-slate-600">
      <span>Low</span><span>High</span>
    </div>
  </div>
);

// ─── Generation Modal ─────────────────────────────────────────────────────────
const GenerateModal = ({
  onClose, onGenerate, generating,
}: { onClose: () => void; onGenerate: (weights: Record<string, number>) => void; generating: boolean }) => {
  const [fairnessWeight, setFairnessWeight] = useState(10);
  const [teacherPreferenceWeight, setTeacherPreferenceWeight] = useState(5);
  const [attendancePredictionWeight, setAttendancePredictionWeight] = useState(8);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Timetable Optimizer</h2>
              <p className="text-slate-400 text-xs">CP-SAT constraint solver — tune your optimization weights</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-sm text-blue-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>The optimizer enforces all hard constraints (no double-booking, lab-room matching) automatically. These sliders tune the <em>soft</em> objective function.</span>
          </div>

          {/* Sliders */}
          <div className="space-y-5">
            <WeightSlider
              label="Teacher Fairness"
              description="Balance undesirable early/late slots across faculty"
              value={fairnessWeight}
              onChange={setFairnessWeight}
            />
            <WeightSlider
              label="Teacher Slot Preference"
              description="Respect individual faculty preferred time windows"
              value={teacherPreferenceWeight}
              onChange={setTeacherPreferenceWeight}
            />
            <WeightSlider
              label="Attendance Maximization"
              description="Place important courses in high-attendance time slots"
              value={attendancePredictionWeight}
              onChange={setAttendancePredictionWeight}
            />
          </div>

          {/* Hard constraint summary */}
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Hard Constraints (Always Active)</p>
            {[
              'No teacher double-booking in any slot',
              'No room double-booking — room capacity respected',
              'No batch attending two lectures simultaneously',
              'Lab courses assigned only to lab rooms',
              'Mandatory lunch break block (12:45–1:45 PM)',
            ].map(c => (
              <div key={c} className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {c}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-700">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => onGenerate({ fairnessWeight, teacherPreferenceWeight, attendancePredictionWeight })}
            disabled={generating}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Optimizing...' : 'Run Optimizer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Session Detail Popup ────────────────────────────────────────────────────
const SessionTooltip = ({ session }: { session: Session }) => (
  <div className="absolute z-30 bottom-full left-0 mb-1 w-52 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs pointer-events-none">
    <div className="font-semibold text-white mb-1">{session.course.name}</div>
    <div className="text-slate-400">👤 {session.teacher.user.name}</div>
    <div className="text-slate-400">🏫 {session.room.name} ({session.room.capacity} seats)</div>
    <div className="text-slate-400">👥 {session.batch.name}</div>
    <div className="flex items-center gap-1 mt-1">
      <Clock className="w-3 h-3 text-indigo-400" />
      <span className="text-slate-400">{session.timeSlot.startTime} – {session.timeSlot.endTime}</span>
    </div>
  </div>
);

export const TimetablePage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedBatch, setSelectedBatch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  const { data: ttData, isLoading } = useQuery({
    queryKey: ['timetable', month, year, selectedBatch],
    queryFn: () => timetableApi.getTimetable(month, year, selectedBatch ? { batchId: selectedBatch } : {}),
  });

  const { data: batchesData } = useQuery({ queryKey: ['batches'], queryFn: resourceApi.getBatches });
  const { data: slotsData } = useQuery({ queryKey: ['timeslots'], queryFn: resourceApi.getTimeSlots });
  const { data: deptData } = useQuery({
    queryKey: ['departments'], queryFn: resourceApi.getDepartments,
    enabled: user?.role === 'ADMIN',
  });

  const publishMutation = useMutation({
    mutationFn: (scheduleId: string) => timetableApi.publishSchedule(scheduleId),
    onSuccess: () => { toast.success('Schedule published!'); qc.invalidateQueries({ queryKey: ['timetable'] }); },
    onError: () => toast.error('Failed to publish'),
  });

  const sessions: Session[] = ttData?.data?.sessions || [];
  const schedule = ttData?.data?.schedule;
  const batches: Batch[] = batchesData?.data || [];
  const slots: TimeSlot[] = slotsData?.data || [];
  const uniqueSlots = slots.filter((s) => s.dayOfWeek === 1);

  const getDatesForMonth = () => {
    const dates: Date[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
      if (d.getDay() >= 1 && d.getDay() <= 5) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };
  const workingDays = getDatesForMonth();

  const sessionMap = sessions.reduce<Record<string, Session>>((acc, s) => {
    acc[`${s.date.split('T')[0]}_${s.timeSlotId}`] = s;
    return acc;
  }, {});

  const courseColorMap: Record<string, string> = {};
  let colorIdx = 0;
  sessions.forEach((s) => {
    if (!courseColorMap[s.courseId]) courseColorMap[s.courseId] = COURSE_COLORS[colorIdx++ % COURSE_COLORS.length];
  });

  const handleGenerate = async (weights: Record<string, number>) => {
    const deptId = deptData?.data?.[0]?.id;
    if (!deptId) { toast.error('No department found'); return; }
    setGenerating(true);
    setShowGenerateModal(false);
    try {
      const res = await timetableApi.generateTimetable({ month, year, departmentId: deptId, solverWeights: weights });
      toast.success(
        `✅ Generated ${res.data.totalSessionsGenerated} sessions!\n` +
        `Status: ${res.data.solverStatus} · Gini: ${res.data.fairnessGini?.toFixed(3) ?? 'N/A'}`
      );
      qc.invalidateQueries({ queryKey: ['timetable'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            Timetable
          </h1>
          <p className="text-slate-400 text-sm mt-1">Monthly view with desirability indicators</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month Navigator */}
          <div className="flex items-center gap-2 glass rounded-lg px-3 py-2">
            <button onClick={prevMonth} className="text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-medium min-w-[140px] text-center text-sm">{monthName}</span>
            <button onClick={nextMonth} className="text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="input w-auto text-sm">
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={generating}
                className="btn-primary btn-sm flex items-center gap-2"
                id="generate-timetable-btn"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                {generating ? 'Optimizing...' : 'AI Generate'}
              </button>
              {schedule?.status === 'DRAFT' && (
                <button
                  onClick={() => publishMutation.mutate(schedule.id)}
                  disabled={publishMutation.isPending}
                  className="btn-primary btn-sm flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  id="publish-schedule-btn"
                >
                  <Send className="w-4 h-4" />
                  Publish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats bar when schedule exists */}
      {schedule && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Schedule Status', value: schedule.status, color: schedule.status === 'PUBLISHED' ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Sessions', value: sessions.length, color: 'text-white' },
            { label: 'Fairness Gini', value: schedule.fairnessGini?.toFixed(3) ?? 'N/A', color: (schedule.fairnessGini ?? 1) < 0.15 ? 'text-emerald-400' : 'text-amber-400' },
            { label: 'Working Days', value: workingDays.length, color: 'text-white' },
          ].map(s => (
            <div key={s.label} className="glass rounded-lg p-3 text-center">
              <div className={`font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
        <span className="font-medium text-slate-300">Desirability:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Prime (4.5+)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Good (3.5–4.5)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Moderate (2.5–3.5)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Poor (&lt;2.5)</span>
        {schedule && (
          <span className={`ml-auto badge ${schedule.status === 'PUBLISHED' ? 'badge-success' : 'badge-warning'}`}>
            {schedule.status === 'PUBLISHED' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
            {schedule.status}
            {schedule.fairnessGini != null && ` · Gini: ${schedule.fairnessGini.toFixed(3)}`}
          </span>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : sessions.length === 0 && !schedule ? (
        <div className="card text-center py-16">
          <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Schedule Generated</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            {user?.role === 'ADMIN'
              ? 'Click "AI Generate" to launch the CP-SAT optimizer. You can tune fairness and preference weights before running.'
              : 'The administrator has not generated a schedule for this month yet.'}
          </p>
          {user?.role === 'ADMIN' && (
            <button onClick={() => setShowGenerateModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generate Schedule
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Slot header */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-slate-500 text-xs text-center py-2 font-medium">Date</div>
              {uniqueSlots.slice(0, 7).map((slot) => (
                <div key={slot.id} className="text-center py-2">
                  <div className="text-slate-300 text-xs font-medium">{slot.startTime}</div>
                  <div className="text-slate-500 text-xs">{slot.endTime}</div>
                  <div className={`mt-1 h-1 rounded-full mx-2 ${
                    slot.desirabilityScore >= 4.5 ? 'bg-emerald-500' :
                    slot.desirabilityScore >= 3.5 ? 'bg-blue-500' :
                    slot.desirabilityScore >= 2.5 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                </div>
              ))}
            </div>

            {/* Date rows */}
            {workingDays.map((date) => {
              const iso = date.toISOString().split('T')[0];
              const dayName = DAY_NAMES[date.getDay()];
              const isToday = iso === now.toISOString().split('T')[0];
              return (
                <div key={iso} className={`grid grid-cols-8 gap-1 mb-1 group ${isToday ? 'ring-1 ring-indigo-500/30 rounded-lg' : ''}`}>
                  <div className={`flex flex-col items-center justify-center py-2 text-xs rounded ${isToday ? 'bg-indigo-600/10' : ''}`}>
                    <span className="text-slate-500 font-medium">{dayName}</span>
                    <span className={`font-bold ${isToday ? 'text-indigo-400' : 'text-slate-300'}`}>{date.getDate()}</span>
                    {isToday && <span className="text-indigo-400 text-xs">Today</span>}
                  </div>
                  {uniqueSlots.slice(0, 7).map((templateSlot) => {
                    const daySlot = slots.find(s => s.dayOfWeek === date.getDay() && s.slotNumber === templateSlot.slotNumber);
                    if (!daySlot) return <div key={templateSlot.id} className="timetable-cell opacity-30" />;
                    const session = sessionMap[`${iso}_${daySlot.id}`];
                    return (
                      <div
                        key={daySlot.id}
                        className={`timetable-cell ${getSlotBorderColor(daySlot.desirabilityScore)}`}
                        onMouseEnter={() => session && setHoveredSession(session.id)}
                        onMouseLeave={() => setHoveredSession(null)}
                      >
                        {session && (
                          <div className="relative">
                            <div
                              className={`session-card border h-full ${courseColorMap[session.courseId] || COURSE_COLORS[0]}`}
                              title={`${session.course.name} | ${session.teacher.user.name} | ${session.room.name}`}
                            >
                              <div className="font-semibold truncate">{session.course.code}</div>
                              <div className="text-slate-400 truncate mt-0.5">{session.teacher.user.name.split(' ')[0]}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{session.room.name}</div>
                              {session.course.type === 'LAB' && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" title="Lab" />
                              )}
                            </div>
                            {hoveredSession === session.id && <SessionTooltip session={session} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 text-blue-400" />
        Hover over session cards for full details. Lab courses have a green dot indicator. Today's date is highlighted in indigo.
        {user?.role === 'ADMIN' && ' Admins can run the AI optimizer multiple times — each run archives the previous draft.'}
      </div>

      {/* Generation Modal */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
          generating={generating}
        />
      )}
    </div>
  );
};

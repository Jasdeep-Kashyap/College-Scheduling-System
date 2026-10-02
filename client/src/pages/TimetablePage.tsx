import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '../api/timetable.api';
import { resourceApi } from '../api/analytics.api';
import { useAuth } from '../context/AuthContext';
import { Session, Batch, TimeSlot } from '../types';
import {
  Calendar, RefreshCw, Send, ChevronLeft, ChevronRight,
  Loader2, AlertTriangle, CheckCircle, Info,
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

export const TimetablePage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedBatch, setSelectedBatch] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: ttData, isLoading } = useQuery({
    queryKey: ['timetable', month, year, selectedBatch],
    queryFn: () => timetableApi.getTimetable(month, year, selectedBatch ? { batchId: selectedBatch } : {}),
  });

  const { data: batchesData } = useQuery({
    queryKey: ['batches'],
    queryFn: resourceApi.getBatches,
  });

  const { data: slotsData } = useQuery({
    queryKey: ['timeslots'],
    queryFn: resourceApi.getTimeSlots,
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: resourceApi.getDepartments,
    enabled: user?.role === 'ADMIN',
  });

  const publishMutation = useMutation({
    mutationFn: (scheduleId: string) => timetableApi.publishSchedule(scheduleId),
    onSuccess: () => {
      toast.success('Schedule published successfully!');
      qc.invalidateQueries({ queryKey: ['timetable'] });
    },
    onError: () => toast.error('Failed to publish schedule'),
  });

  const sessions: Session[] = ttData?.data?.sessions || [];
  const schedule = ttData?.data?.schedule;
  const batches: Batch[] = batchesData?.data || [];
  const slots: TimeSlot[] = slotsData?.data || [];

  // Get unique slots for current filter (Mon-Fri)
  const uniqueSlots = slots.filter((s) => s.dayOfWeek === 1); // Use Mon slots as template

  // Get dates for the month grouped by week
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

  // Build a map: date_iso + slotId → session[]
  const sessionMap = sessions.reduce<Record<string, Session>>((acc, s) => {
    const key = `${s.date.split('T')[0]}_${s.timeSlotId}`;
    acc[key] = s;
    return acc;
  }, {});

  // Course colors
  const courseColorMap: Record<string, string> = {};
  let colorIdx = 0;
  sessions.forEach((s) => {
    if (!courseColorMap[s.courseId]) {
      courseColorMap[s.courseId] = COURSE_COLORS[colorIdx % COURSE_COLORS.length];
      colorIdx++;
    }
  });

  const handleGenerate = async () => {
    const deptId = deptData?.data?.[0]?.id;
    if (!deptId) { toast.error('No department found'); return; }
    setGenerating(true);
    try {
      const res = await timetableApi.generateTimetable({ month, year, departmentId: deptId });
      toast.success(`Generated ${res.data.totalSessionsGenerated} sessions! Gini: ${res.data.fairnessGini?.toFixed(3) ?? 'N/A'}`);
      qc.invalidateQueries({ queryKey: ['timetable'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

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

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Admin Controls */}
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary btn-sm flex items-center gap-2"
                id="generate-timetable-btn"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate AI'}
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
            {schedule.fairnessGini !== null && schedule.fairnessGini !== undefined && ` · Gini: ${schedule.fairnessGini.toFixed(3)}`}
          </span>
        )}
      </div>

      {/* Timetable Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : sessions.length === 0 && !schedule ? (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Schedule Generated</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {user?.role === 'ADMIN'
              ? 'Click "Generate AI" to run the CP-SAT optimizer and create an optimal timetable.'
              : 'The administrator has not generated a schedule for this month yet.'}
          </p>
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
              return (
                <div key={iso} className="grid grid-cols-8 gap-1 mb-1 group">
                  <div className="flex flex-col items-center justify-center py-2 text-xs">
                    <span className="text-slate-500 font-medium">{dayName}</span>
                    <span className="text-slate-300 font-bold">{date.getDate()}</span>
                  </div>
                  {uniqueSlots.slice(0, 7).map((templateSlot) => {
                    // Find the actual slot with this slot number for this day of week
                    const daySlot = slots.find(
                      (s) => s.dayOfWeek === date.getDay() && s.slotNumber === templateSlot.slotNumber
                    );
                    if (!daySlot) {
                      return <div key={templateSlot.id} className="timetable-cell opacity-30" />;
                    }

                    const session = sessionMap[`${iso}_${daySlot.id}`];
                    return (
                      <div
                        key={daySlot.id}
                        className={`timetable-cell ${getSlotBorderColor(daySlot.desirabilityScore)}`}
                      >
                        {session ? (
                          <div
                            className={`session-card border h-full ${courseColorMap[session.courseId] || COURSE_COLORS[0]}`}
                            title={`${session.course.name} | ${session.teacher.user.name} | ${session.room.name}`}
                          >
                            <div className="font-semibold truncate">{session.course.code}</div>
                            <div className="text-slate-400 truncate mt-0.5">{session.teacher.user.name.split(' ')[0]}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{session.room.name}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 text-blue-400" />
        Hover over a session card to see full details. Drag-and-drop reassignment available to Admins. Collision detection runs automatically.
      </div>
    </div>
  );
};

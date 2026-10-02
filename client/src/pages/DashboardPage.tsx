import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics.api';
import { useAuth } from '../context/AuthContext';
import {
  Users, BookOpen, Calendar, CheckCircle2, TrendingUp,
  Award, Clock, AlertTriangle, BarChart3, Sparkles,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const StatCard = ({
  label, value, icon: Icon, color, subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) => (
  <div className="stat-card animate-slide-up">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const SLOT_LABELS: Record<number, string> = {
  1: '8:30 AM', 2: '9:30 AM', 3: '10:45 AM',
  4: '11:45 AM', 5: '1:45 PM', 6: '2:45 PM', 7: '3:45 PM',
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: analyticsApi.getStats,
    enabled: user?.role === 'ADMIN',
  });

  const { data: fairnessData } = useQuery({
    queryKey: ['fairness', month, year],
    queryFn: () => analyticsApi.getFairness(month, year),
    enabled: user?.role === 'ADMIN',
  });

  const { data: trendsData } = useQuery({
    queryKey: ['attendance-trends'],
    queryFn: analyticsApi.getAttendanceTrends,
    enabled: user?.role !== 'STUDENT',
  });

  const stats = statsData?.data;
  const fairness = fairnessData?.data;
  const trends = trendsData?.data || [];

  const chartData = trends.map((t: { slotNumber: number; attendanceRate: number }) => ({
    slot: SLOT_LABELS[t.slotNumber] || `Slot ${t.slotNumber}`,
    attendance: t.attendanceRate,
  }));

  const fairnessBarData = fairness?.teacherDistribution?.map((t: any) => ({
    name: t.teacherName.split(' ').slice(-1)[0], // Last name only for chart
    undesirable: t.undesirableSlotCount,
    desirability: t.desirabilityIndexAverage,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            {user?.role === 'ADMIN'
              ? 'Admin Dashboard'
              : user?.role === 'TEACHER'
              ? 'Teacher Dashboard'
              : 'My Dashboard'}
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome back, <span className="text-indigo-300 font-medium">{user?.name}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-slate-300 font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          <div className="text-slate-500 text-sm">{new Date().getFullYear()}</div>
        </div>
      </div>

      {/* Admin Stats Row */}
      {user?.role === 'ADMIN' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Faculty" value={stats.totalTeachers} icon={Users} color="bg-indigo-600" subtitle="Registered teachers" />
          <StatCard label="Students" value={stats.totalStudents} icon={Users} color="bg-emerald-600" subtitle="Total enrolled" />
          <StatCard label="Courses" value={stats.totalCourses} icon={BookOpen} color="bg-blue-600" subtitle="Active courses" />
          <StatCard label="Sessions" value={stats.totalSessions} icon={Calendar} color="bg-amber-600" subtitle="Scheduled this term" />
          <StatCard label="Published" value={stats.publishedSchedules} icon={CheckCircle2} color="bg-purple-600" subtitle="Live schedules" />
        </div>
      )}

      {/* Fairness Index Card */}
      {user?.role === 'ADMIN' && fairness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Fairness Index</h3>
                <p className="text-slate-400 text-xs">Gini coefficient (lower = more equitable)</p>
              </div>
            </div>
            <div className="text-4xl font-bold mb-2">
              <span className={fairness.overallGini !== null && fairness.overallGini < 0.15
                ? 'text-emerald-400'
                : fairness.overallGini < 0.25
                ? 'text-amber-400'
                : 'text-red-400'
              }>
                {fairness.overallGini !== null ? fairness.overallGini.toFixed(3) : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${
                  (fairness.overallGini || 0) < 0.15 ? 'bg-emerald-500' :
                  (fairness.overallGini || 0) < 0.25 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((fairness.overallGini || 0) * 200, 100)}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm">
              Avg. undesirable slots: <span className="text-white font-medium">{fairness.averageUndesirableSlots}</span>
            </p>
          </div>

          {/* Fairness Bar Chart */}
          <div className="lg:col-span-2 card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Faculty Undesirable Slot Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fairnessBarData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="undesirable" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Undesirable Slots" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Attendance Trends */}
      {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && chartData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Student Attendance by Time Slot
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="slot" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value: any) => [`${value}%`, 'Attendance']}
              />
              <Line type="monotone" dataKey="attendance" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Slots 1 (8:30 AM) and 7 (3:45 PM) show historically low attendance. The AI scheduler avoids placing core subjects here.</span>
          </div>
        </div>
      )}

      {/* Student quick info */}
      {user?.role === 'STUDENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card flex items-start gap-4">
            <div className="p-3 bg-indigo-600/20 rounded-xl">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Today's Schedule</h3>
              <p className="text-slate-400 text-sm mt-1">View your class timetable and room locations on the Timetable tab.</p>
            </div>
          </div>
          <div className="card flex items-start gap-4">
            <div className="p-3 bg-emerald-600/20 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Attendance Check-in</h3>
              <p className="text-slate-400 text-sm mt-1">Scan QR codes during lectures on the Attendance tab.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics.api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Award, Target, Info, Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-lg p-3 text-sm">
        <p className="text-white font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SLOT_LABELS: Record<number, string> = {
  1: '8:30 AM', 2: '9:30 AM', 3: '10:45 AM',
  4: '11:45 AM', 5: '1:45 PM', 6: '2:45 PM', 7: '3:45 PM',
};

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const AnalyticsPage = () => {
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const { data: fairnessData, isLoading: fLoading } = useQuery({
    queryKey: ['fairness', month, year],
    queryFn: () => analyticsApi.getFairness(month, year),
  });

  const { data: trendsData, isLoading: tLoading } = useQuery({
    queryKey: ['attendance-trends'],
    queryFn: analyticsApi.getAttendanceTrends,
  });

  const { data: productivityData, isLoading: pLoading } = useQuery({
    queryKey: ['productivity'],
    queryFn: () => analyticsApi.getProductivity(),
  });

  const fairness = fairnessData?.data;
  const trends: any[] = trendsData?.data || [];
  const productivity: any[] = productivityData?.data || [];

  const trendChartData = trends.map((t) => ({
    slot: SLOT_LABELS[t.slotNumber] || `Slot ${t.slotNumber}`,
    rate: t.attendanceRate,
  }));

  const fairnessBarData = fairness?.teacherDistribution?.map((t: any) => ({
    name: t.teacherName.split(' ').pop(),
    undesirable: t.undesirableSlotCount,
    avgDesirability: t.desirabilityIndexAverage,
  })) || [];

  const productivityRadar = productivity.slice(0, 5).map((p: any) => ({
    session: p.session?.course?.code || 'Session',
    attendance: p.attendanceRate * 100,
    engagement: p.engagementScore * 100,
    learning: p.learningScore * 100,
    feedback: p.feedbackScore * 100,
    composite: p.compositeScore,
  }));

  const isLoading = fLoading || tLoading || pLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          Institutional Analytics
        </h1>
        <p className="text-slate-400 text-sm mt-1">Deep-dive reports on fairness, attendance patterns, and productivity</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Fairness Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gini Card */}
            <div className="card flex flex-col items-center justify-center text-center py-8">
              <div className="p-4 bg-amber-600/10 rounded-2xl mb-3">
                <Award className="w-8 h-8 text-amber-400" />
              </div>
              <div className="text-5xl font-bold mb-2">
                <span className={
                  (fairness?.overallGini || 0) < 0.15 ? 'text-emerald-400' :
                  (fairness?.overallGini || 0) < 0.30 ? 'text-amber-400' : 'text-red-400'
                }>
                  {fairness?.overallGini?.toFixed(3) ?? 'N/A'}
                </span>
              </div>
              <div className="text-white font-semibold text-lg">Gini Coefficient</div>
              <div className="text-slate-400 text-sm mt-1">Teacher slot equity</div>
              <div className="mt-4 grid grid-cols-3 gap-2 w-full text-xs">
                <div className="text-center p-2 bg-emerald-900/30 rounded-lg">
                  <div className="text-emerald-400 font-bold">&lt;0.15</div>
                  <div className="text-slate-500">Excellent</div>
                </div>
                <div className="text-center p-2 bg-amber-900/30 rounded-lg">
                  <div className="text-amber-400 font-bold">0.15–0.30</div>
                  <div className="text-slate-500">Good</div>
                </div>
                <div className="text-center p-2 bg-red-900/30 rounded-lg">
                  <div className="text-red-400 font-bold">&gt;0.30</div>
                  <div className="text-slate-500">Poor</div>
                </div>
              </div>
            </div>

            {/* Fairness bar chart */}
            <div className="lg:col-span-2 card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Undesirable Slot Distribution by Faculty
              </h3>
              {fairnessBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fairnessBarData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="undesirable" radius={[4, 4, 0, 0]} name="Undesirable Slots">
                      {fairnessBarData.map((_: any, i: number) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                  Generate a timetable first to see fairness data.
                </div>
              )}
            </div>
          </div>

          {/* Attendance Trends */}
          <div className="card">
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Time-of-Day Attendance Curve
            </h3>
            <p className="text-slate-500 text-xs mb-4">Shows the natural attendance drop-off at early morning and end-of-day slots.</p>
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="slot" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis domain={[40, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                No attendance data available. Mark attendance in completed sessions.
              </div>
            )}
          </div>

          {/* Productivity Section */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Lecture Productivity Breakdown
            </h3>
            {productivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-header">
                    <tr>
                      <th className="px-4 py-3 text-left">Course</th>
                      <th className="px-4 py-3 text-left">Teacher</th>
                      <th className="px-4 py-3 text-left">Attendance</th>
                      <th className="px-4 py-3 text-left">Engagement</th>
                      <th className="px-4 py-3 text-left">Learning</th>
                      <th className="px-4 py-3 text-left">Feedback</th>
                      <th className="px-4 py-3 text-left">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivity.slice(0, 20).map((p: any) => (
                      <tr key={p.id} className="table-row">
                        <td className="px-4 py-3 text-white font-medium">{p.session?.course?.code}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{p.session?.teacher?.user?.name?.split(' ')[0]}</td>
                        <td className="px-4 py-3 text-slate-300">{(p.attendanceRate * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-300">{(p.engagementScore * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-300">{(p.learningScore * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-300">{(p.feedbackScore * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            p.compositeScore >= 85 ? 'badge-success' :
                            p.compositeScore >= 70 ? 'badge-info' :
                            p.compositeScore >= 55 ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {p.compositeScore.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                No productivity scores computed yet. Use the attendance workflow to generate data.
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Score = 100 × (0.4 × Attendance + 0.3 × Engagement + 0.2 × Learning + 0.1 × Feedback)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

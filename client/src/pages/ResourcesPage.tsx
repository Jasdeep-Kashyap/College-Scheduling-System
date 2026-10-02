import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '../api/analytics.api';
import { Teacher, Batch, Course, Room } from '../types';
import { BookOpen, Users, DoorOpen, GraduationCap, Trash2, Plus, Loader2, X } from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

type Tab = 'teachers' | 'batches' | 'courses' | 'rooms';

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export const ResourcesPage = () => {
  const [tab, setTab] = useState<Tab>('teachers');
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: teachersData, isLoading: tLoading } = useQuery({ queryKey: ['teachers'], queryFn: resourceApi.getTeachers });
  const { data: batchesData, isLoading: bLoading } = useQuery({ queryKey: ['batches'], queryFn: resourceApi.getBatches });
  const { data: coursesData, isLoading: cLoading } = useQuery({ queryKey: ['courses'], queryFn: resourceApi.getCourses });
  const { data: roomsData, isLoading: rLoading } = useQuery({ queryKey: ['rooms'], queryFn: resourceApi.getRooms });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      apiClient.delete(`/${type}/${id}`).then((r) => r.data),
    onSuccess: (_, { type }) => {
      toast.success('Deleted successfully');
      qc.invalidateQueries({ queryKey: [type] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const teachers: Teacher[] = teachersData?.data || [];
  const batches: Batch[] = batchesData?.data || [];
  const courses: Course[] = coursesData?.data || [];
  const rooms: Room[] = roomsData?.data || [];

  const isLoading = tLoading || bLoading || cLoading || rLoading;

  const renderTeachers = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="table-header">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Designation</th>
            <th className="px-4 py-3 text-left">Max Load (hrs/wk)</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="table-row">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-300 text-sm font-bold">
                    {t.user.name[0]}
                  </div>
                  <span className="text-white font-medium">{t.user.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-400 text-sm">{t.user.email}</td>
              <td className="px-4 py-3 text-slate-300 text-sm">{t.designation || '—'}</td>
              <td className="px-4 py-3">
                <span className="badge badge-info">{t.maxWeeklyLoad}h</span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => deleteMutation.mutate({ type: 'teachers', id: t.id })}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBatches = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="table-header">
          <tr>
            <th className="px-4 py-3 text-left">Batch Name</th>
            <th className="px-4 py-3 text-left">Semester</th>
            <th className="px-4 py-3 text-left">Strength</th>
            <th className="px-4 py-3 text-left">Students</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="table-row">
              <td className="px-4 py-3 text-white font-medium">{b.name}</td>
              <td className="px-4 py-3"><span className="badge badge-info">Sem {b.semester}</span></td>
              <td className="px-4 py-3 text-slate-300">{b.size}</td>
              <td className="px-4 py-3 text-slate-400">{b._count?.students ?? 0} enrolled</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCourses = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="table-header">
          <tr>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Credits</th>
            <th className="px-4 py-3 text-left">Weekly Hrs</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="table-row">
              <td className="px-4 py-3 text-indigo-300 font-mono text-sm font-medium">{c.code}</td>
              <td className="px-4 py-3 text-white">{c.name}</td>
              <td className="px-4 py-3">
                <span className={`badge ${c.type === 'LAB' ? 'badge-success' : c.type === 'THEORY' ? 'badge-info' : 'badge-warning'}`}>
                  {c.type}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-300">{c.credits}</td>
              <td className="px-4 py-3 text-slate-300">{c.weeklyHours}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderRooms = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((r) => (
        <div key={r.id} className="card-sm hover:border-slate-600 transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-white text-lg">{r.name}</div>
              <span className={`badge mt-1 ${r.type.includes('LAB') ? 'badge-success' : r.type === 'AUDITORIUM' ? 'badge-warning' : 'badge-neutral'}`}>
                {r.type.replace('_', ' ')}
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{r.capacity}</div>
              <div className="text-slate-500 text-xs">seats</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Academic Resources
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage teachers, batches, courses, and classrooms</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'teachers'} onClick={() => setTab('teachers')} icon={Users} label={`Faculty (${teachers.length})`} />
        <TabButton active={tab === 'batches'} onClick={() => setTab('batches')} icon={GraduationCap} label={`Batches (${batches.length})`} />
        <TabButton active={tab === 'courses'} onClick={() => setTab('courses')} icon={BookOpen} label={`Courses (${courses.length})`} />
        <TabButton active={tab === 'rooms'} onClick={() => setTab('rooms')} icon={DoorOpen} label={`Rooms (${rooms.length})`} />
      </div>

      {/* Content */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {tab === 'teachers' && renderTeachers()}
            {tab === 'batches' && renderBatches()}
            {tab === 'courses' && renderCourses()}
            {tab === 'rooms' && renderRooms()}
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceApi } from '../api/analytics.api';
import { Teacher, Batch, Course, Room } from '../types';
import {
  BookOpen, Users, DoorOpen, GraduationCap, Trash2, Plus,
  Loader2, X, Calendar, Settings,
} from 'lucide-react';
import { apiClient } from '../api/client';
import toast from 'react-hot-toast';

type Tab = 'teachers' | 'batches' | 'courses' | 'rooms' | 'holidays';

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

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// ─── Add Teacher Form ─────────────────────────────────────────────────────────
const AddTeacherForm = ({ deptId, onSuccess, onClose }: { deptId: string; onSuccess: () => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: '', email: '', designation: 'Assistant Professor', maxWeeklyLoad: 18 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Register user
      const userRes = await apiClient.post('/auth/register', {
        name: form.name, email: form.email, password: 'TeacherPass123!', role: 'TEACHER',
      });
      const userId = userRes.data.data.user.id;
      // 2. Create teacher profile
      await apiClient.post('/teachers', { userId, departmentId: deptId, designation: form.designation, maxWeeklyLoad: form.maxWeeklyLoad });
      toast.success(`Teacher ${form.name} created! Default password: TeacherPass123!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Jane Smith" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@college.edu" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Designation</label>
          <select className="input" value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}>
            <option>Assistant Professor</option>
            <option>Associate Professor</option>
            <option>Professor</option>
            <option>HOD</option>
            <option>Lecturer</option>
          </select>
        </div>
        <div>
          <label className="label">Max Weekly Load (hrs)</label>
          <input className="input" type="number" min={1} max={30} value={form.maxWeeklyLoad} onChange={e => setForm(f => ({ ...f, maxWeeklyLoad: Number(e.target.value) }))} />
        </div>
      </div>
      <p className="text-xs text-slate-500">Default password will be <code className="text-indigo-400">TeacherPass123!</code> — share this with the faculty member.</p>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Teacher
        </button>
      </div>
    </form>
  );
};

// ─── Add Course Form ──────────────────────────────────────────────────────────
const AddCourseForm = ({ deptId, onSuccess, onClose }: { deptId: string; onSuccess: () => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: '', code: '', credits: 3, weeklyHours: 3, type: 'THEORY' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/courses', { ...form, departmentId: deptId });
      toast.success(`Course ${form.code} created!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Course Name</label>
          <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Data Structures" />
        </div>
        <div>
          <label className="label">Course Code</label>
          <input className="input" required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CS301" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="THEORY">Theory</option>
            <option value="LAB">Lab</option>
            <option value="TUTORIAL">Tutorial</option>
            <option value="SEMINAR">Seminar</option>
          </select>
        </div>
        <div>
          <label className="label">Credits</label>
          <input className="input" type="number" min={1} max={6} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Weekly Hours</label>
          <input className="input" type="number" min={1} max={10} value={form.weeklyHours} onChange={e => setForm(f => ({ ...f, weeklyHours: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Course
        </button>
      </div>
    </form>
  );
};

// ─── Add Room Form ────────────────────────────────────────────────────────────
const AddRoomForm = ({ deptId, onSuccess, onClose }: { deptId: string; onSuccess: () => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: '', capacity: 60, type: 'LECTURE_HALL' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/rooms', { ...form, departmentId: deptId });
      toast.success(`Room ${form.name} created!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Room Name</label>
          <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="LH-301" />
        </div>
        <div>
          <label className="label">Capacity (seats)</label>
          <input className="input" type="number" min={10} max={500} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
        </div>
      </div>
      <div>
        <label className="label">Room Type</label>
        <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="LECTURE_HALL">Lecture Hall</option>
          <option value="COMPUTER_LAB">Computer Lab</option>
          <option value="SCIENCE_LAB">Science Lab</option>
          <option value="SEMINAR_ROOM">Seminar Room</option>
          <option value="AUDITORIUM">Auditorium</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Room
        </button>
      </div>
    </form>
  );
};

// ─── Add Batch Form ───────────────────────────────────────────────────────────
const AddBatchForm = ({ deptId, onSuccess, onClose }: { deptId: string; onSuccess: () => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: '', semester: 1, size: 60 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/batches', { ...form, departmentId: deptId });
      toast.success(`Batch ${form.name} created!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Batch Name</label>
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CS-Year2-A" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Semester</label>
          <input className="input" type="number" min={1} max={8} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="label">Batch Strength</label>
          <input className="input" type="number" min={10} max={200} value={form.size} onChange={e => setForm(f => ({ ...f, size: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Batch
        </button>
      </div>
    </form>
  );
};

// ─── Add Holiday Form ─────────────────────────────────────────────────────────
const AddHolidayForm = ({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) => {
  const [form, setForm] = useState({ name: '', date: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/holidays', form);
      toast.success(`Holiday "${form.name}" added!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Holiday Name</label>
        <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Diwali" />
      </div>
      <div>
        <label className="label">Date</label>
        <input className="input" type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Holiday
        </button>
      </div>
    </form>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ResourcesPage = () => {
  const [tab, setTab] = useState<Tab>('teachers');
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: teachersData, isLoading: tLoading } = useQuery({ queryKey: ['teachers'], queryFn: resourceApi.getTeachers });
  const { data: batchesData, isLoading: bLoading } = useQuery({ queryKey: ['batches'], queryFn: resourceApi.getBatches });
  const { data: coursesData, isLoading: cLoading } = useQuery({ queryKey: ['courses'], queryFn: resourceApi.getCourses });
  const { data: roomsData, isLoading: rLoading } = useQuery({ queryKey: ['rooms'], queryFn: resourceApi.getRooms });
  const { data: holidaysData, isLoading: hLoading } = useQuery({ queryKey: ['holidays'], queryFn: resourceApi.getHolidays });
  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: resourceApi.getDepartments });

  const deptId = deptData?.data?.[0]?.id || '';

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
  const holidays: any[] = holidaysData?.data || [];

  const isLoading = tLoading || bLoading || cLoading || rLoading || hLoading;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['teachers'] });
    qc.invalidateQueries({ queryKey: ['batches'] });
    qc.invalidateQueries({ queryKey: ['courses'] });
    qc.invalidateQueries({ queryKey: ['rooms'] });
    qc.invalidateQueries({ queryKey: ['holidays'] });
  };

  const tabConfig: Record<Tab, { label: string; icon: any; count: number }> = {
    teachers: { label: 'Faculty', icon: Users, count: teachers.length },
    batches: { label: 'Batches', icon: GraduationCap, count: batches.length },
    courses: { label: 'Courses', icon: BookOpen, count: courses.length },
    rooms: { label: 'Rooms', icon: DoorOpen, count: rooms.length },
    holidays: { label: 'Holidays', icon: Calendar, count: holidays.length },
  };

  const getAddLabel = () => {
    const map: Record<Tab, string> = {
      teachers: 'Add Teacher', batches: 'Add Batch',
      courses: 'Add Course', rooms: 'Add Room', holidays: 'Add Holiday',
    };
    return map[tab];
  };

  const renderContent = () => {
    if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;

    if (tab === 'teachers') return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Designation</th>
              <th className="px-4 py-3 text-left">Max Load</th>
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
                <td className="px-4 py-3"><span className="badge badge-info">{t.maxWeeklyLoad}h/wk</span></td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteMutation.mutate({ type: 'teachers', id: t.id })}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20"
                    title="Delete teacher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No teachers added yet</td></tr>}
          </tbody>
        </table>
      </div>
    );

    if (tab === 'batches') return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3 text-left">Batch Name</th>
              <th className="px-4 py-3 text-left">Semester</th>
              <th className="px-4 py-3 text-left">Strength</th>
              <th className="px-4 py-3 text-left">Students</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="table-row">
                <td className="px-4 py-3 text-white font-medium">{b.name}</td>
                <td className="px-4 py-3"><span className="badge badge-info">Sem {b.semester}</span></td>
                <td className="px-4 py-3 text-slate-300">{b.size}</td>
                <td className="px-4 py-3 text-slate-400">{b._count?.students ?? 0} enrolled</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteMutation.mutate({ type: 'batches', id: b.id })} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {batches.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No batches added yet</td></tr>}
          </tbody>
        </table>
      </div>
    );

    if (tab === 'courses') return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Credits</th>
              <th className="px-4 py-3 text-left">Hrs/Wk</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="table-row">
                <td className="px-4 py-3 text-indigo-300 font-mono text-sm font-medium">{c.code}</td>
                <td className="px-4 py-3 text-white text-sm">{c.name}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${c.type === 'LAB' ? 'badge-success' : c.type === 'THEORY' ? 'badge-info' : 'badge-warning'}`}>
                    {c.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{c.credits}</td>
                <td className="px-4 py-3 text-slate-300">{c.weeklyHours}h</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteMutation.mutate({ type: 'courses', id: c.id })} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-500">No courses added yet</td></tr>}
          </tbody>
        </table>
      </div>
    );

    if (tab === 'rooms') return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.id} className="card-sm hover:border-slate-600 transition-colors group relative">
            <button
              onClick={() => deleteMutation.mutate({ type: 'rooms', id: r.id })}
              className="absolute top-3 right-3 text-slate-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-start justify-between pr-6">
              <div>
                <div className="font-bold text-white text-lg">{r.name}</div>
                <span className={`badge mt-1 ${r.type.includes('LAB') ? 'badge-success' : r.type === 'AUDITORIUM' ? 'badge-warning' : 'badge-neutral'}`}>
                  {r.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{r.capacity}</div>
                <div className="text-slate-500 text-xs">seats</div>
              </div>
            </div>
          </div>
        ))}
        {rooms.length === 0 && <div className="col-span-3 text-center py-10 text-slate-500">No rooms added yet</div>}
      </div>
    );

    if (tab === 'holidays') return (
      <div className="space-y-2">
        {holidays.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-700/40 border border-slate-700/50 hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-white font-medium">{h.name}</div>
                <div className="text-slate-400 text-sm">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {h.isGazetted && <span className="badge badge-warning">Gazetted</span>}
              <button onClick={() => deleteMutation.mutate({ type: 'holidays', id: h.id })} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {holidays.length === 0 && <div className="text-center py-10 text-slate-500">No holidays defined</div>}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            Academic Resources
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage faculty, batches, courses, classrooms, and academic calendar</p>
        </div>
        <button
          id="add-resource-btn"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {getAddLabel()}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(Object.entries(tabConfig) as [Tab, any][]).map(([key, cfg]) => (
          <TabButton
            key={key}
            active={tab === key}
            onClick={() => setTab(key)}
            icon={cfg.icon}
            label={`${cfg.label} (${cfg.count})`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="card min-h-[300px]">
        {renderContent()}
      </div>

      {/* Modals */}
      {showForm && tab === 'teachers' && (
        <Modal title="Add New Faculty Member" onClose={() => setShowForm(false)}>
          <AddTeacherForm deptId={deptId} onSuccess={invalidate} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      {showForm && tab === 'courses' && (
        <Modal title="Add New Course" onClose={() => setShowForm(false)}>
          <AddCourseForm deptId={deptId} onSuccess={invalidate} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      {showForm && tab === 'rooms' && (
        <Modal title="Add New Room / Lab" onClose={() => setShowForm(false)}>
          <AddRoomForm deptId={deptId} onSuccess={invalidate} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      {showForm && tab === 'batches' && (
        <Modal title="Add New Batch" onClose={() => setShowForm(false)}>
          <AddBatchForm deptId={deptId} onSuccess={invalidate} onClose={() => setShowForm(false)} />
        </Modal>
      )}
      {showForm && tab === 'holidays' && (
        <Modal title="Declare Holiday" onClose={() => setShowForm(false)}>
          <AddHolidayForm onSuccess={invalidate} onClose={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
};

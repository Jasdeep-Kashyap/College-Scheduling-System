import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, BookOpen, BarChart3, QrCode,
  GraduationCap, LogOut, School, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { href: '/timetable', label: 'Timetable', icon: Calendar, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { href: '/resources', label: 'Resources', icon: BookOpen, roles: ['ADMIN'] },
  { href: '/attendance', label: 'Attendance', icon: QrCode, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN', 'TEACHER'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = allNavItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const getRoleBadgeColor = (role: string) => {
    if (role === 'ADMIN') return 'badge-danger';
    if (role === 'TEACHER') return 'badge-info';
    return 'badge-success';
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 transition-colors">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">CMS Platform</div>
            <div className="text-slate-500 text-xs">Scheduling System</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-link ${active ? 'active' : ''}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">{user?.name}</div>
            <span className={`badge text-xs ${getRoleBadgeColor(user?.role || '')}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

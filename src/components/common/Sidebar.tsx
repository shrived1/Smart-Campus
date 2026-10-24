import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  BookOpen,
  Award,
  FileText,
  CreditCard,
  GraduationCap,
  ClipboardList,
  Sparkles,
  Users,
  Radio,
  BarChart3,
  CheckSquare,
  HelpCircle,
  FileCheck,
  Send,
  Cpu,
  Shield,
  Activity,
  QrCode,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Define navigation groups per role
  const getNavItems = () => {
    switch (user?.role) {
      case 'STUDENT':
        return [
          { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          { name: 'My Details', path: '/student/details', icon: UserCheck },
          { name: 'My Attendance', path: '/student/attendance', icon: Calendar },
          { name: 'Timetable', path: '/student/timetable', icon: Calendar },
          { name: 'Subjects', path: '/student/subjects', icon: BookOpen },
          { name: 'College Events', path: '/student/events', icon: Sparkles },
          { name: 'E-Documents', path: '/student/documents', icon: FileText },
          { name: 'E-Certificates', path: '/student/certificates', icon: Award },
          { name: 'Fees & Balance', path: '/student/fees', icon: CreditCard },
          { name: 'Marks & Results', path: '/student/marks', icon: GraduationCap },
          { name: 'Assignments', path: '/student/assignments', icon: ClipboardList },
          { name: 'Help & Support', path: '/student/help', icon: HelpCircle },
        ];

      case 'FACULTY':
        return [
          { name: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
          { name: 'Student Directory', path: '/faculty/students', icon: Users },
          { name: 'Live Attendance', path: '/faculty/live-attendance', icon: Radio },
          { name: 'Attendance Analytics', path: '/faculty/attendance-analytics', icon: BarChart3 },
          { name: 'Assignments & Grading', path: '/faculty/assignments', icon: ClipboardList },
          { name: 'Marks Entry', path: '/faculty/marks', icon: GraduationCap },
        ];

      case 'PARENT':
        return [
          { name: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
          { name: 'My Child Profile', path: '/parent/child', icon: UserCheck },
          { name: 'Child Attendance', path: '/parent/attendance', icon: Calendar },
          { name: 'Marks & Results', path: '/parent/marks', icon: GraduationCap },
          { name: 'Fees & Invoices', path: '/parent/fees', icon: CreditCard },
          { name: 'Assignments', path: '/parent/assignments', icon: ClipboardList },
          { name: 'College Events', path: '/parent/events', icon: Sparkles },
          { name: 'Contact Faculty', path: '/parent/contact-faculty', icon: Send },
        ];

      case 'ADMISSION':
        return [
          { name: 'Staff Dashboard', path: '/admission/dashboard', icon: LayoutDashboard },
          { name: 'New Application', path: '/admission/apply', icon: FileText },
          { name: 'Track Application', path: '/admission/track', icon: FileCheck },
        ];

      case 'ADMIN':
        return [
          { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Student Management', path: '/admin/students', icon: Users },
          { name: 'ESP32 Device Monitor', path: '/admin/devices', icon: Cpu },
          { name: 'Attendance & Override', path: '/admin/attendance', icon: Calendar },
          { name: 'QR Code Hub', path: '/admin/qr', icon: QrCode },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: Shield },
          { name: 'System Health', path: '/admin/system-health', icon: Activity },
          { name: 'System Settings', path: '/admin/settings', icon: Settings },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#050505] border-r border-[#2a1e45] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#2a1e45]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3B0A6B] to-[#00E5FF]/40 border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <span className="font-mono font-extrabold text-[#00E5FF] text-sm">SC</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Smart<span className="text-[#00E5FF]">Campus</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">Enterprise ERP</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest font-mono">
            {user?.role} PORTAL
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
                  isActive
                    ? 'text-white bg-[#3B0A6B]/50 border border-[#3B0A6B]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141021]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#00E5FF] rounded-r-full shadow-[0_0_8px_#00E5FF]" />
                )}
                <Icon
                  size={16}
                  className={isActive ? 'text-[#00E5FF]' : 'text-slate-400'}
                />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info: Campus connection status */}
        <div className="p-4 border-t border-[#2a1e45] bg-[#0d0a14]">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              Connected
            </span>
            <span className="font-mono text-[10px]">AIST v2.4</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

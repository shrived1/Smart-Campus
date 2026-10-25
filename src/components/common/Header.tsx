import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { 
  Bell, 
  QrCode, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  Radio,
  ChevronDown
} from 'lucide-react';
import QRModal from './QRModal.js';
import ThemeToggle from './ThemeToggle.js';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  portalTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen,
  portalTitle,
}) => {
  const { user, logout } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'ESP32 Nodes Synchronized', time: 'Just now', type: 'system' },
    { id: 2, title: 'Semester 5 Schedule Finalized', time: '2 hours ago', type: 'academic' },
    { id: 3, title: 'Campus Gate Scanner v2.4.1 Online', time: '4 hours ago', type: 'iot' }
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#050505]/95 backdrop-blur-md border-b border-[#2a1e45] px-4 lg:px-8 flex items-center justify-between">
      {/* Left side: Hamburger + Portal Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#141021] border border-[#2a1e45]"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-8 w-1 bg-gradient-to-b from-[#00E5FF] to-[#3B0A6B] rounded-full hidden sm:block" />
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              {portalTitle}
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium tracking-normal border border-[#3B0A6B] bg-[#3B0A6B]/25 text-[#00E5FF]">
                {user?.role}
              </span>
            </h1>
          </div>
        </div>
      </div>

      {/* Right side: Hardware status, QR, Notifications, User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* ESP32 Hardware Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d0a14] border border-[#2a1e45] text-xs">
          <Radio size={14} className="text-[#00E5FF] animate-pulse" />
          <span className="text-slate-400">BLE Gateway:</span>
          <span className="text-[#00E5FF] font-mono font-medium">4 Nodes Active</span>
        </div>

        {/* Theme Mode Switcher (Default Dark <-> High-Contrast Light) */}
        <ThemeToggle />

        {/* Workflow QR Code Modal Button */}
        <button
          onClick={() => setShowQR(true)}
          className="p-2 text-slate-300 hover:text-[#00E5FF] hover:bg-[#141021] rounded-lg border border-[#2a1e45] transition-colors"
          title="Campus QR Workflow Hub"
        >
          <QrCode size={18} />
        </button>

        {/* Notifications dropdown trigger */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-300 hover:text-[#00E5FF] hover:bg-[#141021] rounded-lg border border-[#2a1e45] transition-colors relative"
            title="Campus Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00E5FF] ring-2 ring-[#050505]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#141021] border border-[#2a1e45] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[#2a1e45] flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Campus Alerts</span>
                <span className="text-[10px] text-[#00E5FF]">3 New</span>
              </div>
              <div className="divide-y divide-[#2a1e45]/50 max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-[#1c162f] transition-colors text-xs">
                    <p className="font-medium text-slate-200">{n.title}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User profile and logout dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg border border-[#2a1e45] hover:bg-[#141021] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B0A6B] to-[#120524] border border-[#5c14a3] flex items-center justify-center font-bold text-xs text-[#00E5FF]">
              {user?.name?.slice(0, 2).toUpperCase() || 'SC'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">{user?.email}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-[#141021] border border-[#2a1e45] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[#2a1e45]">
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
                {user?.studentId && (
                  <p className="text-[10px] text-[#00E5FF] mt-1 font-mono">ID: {user.studentId}</p>
                )}
                {user?.facultyId && (
                  <p className="text-[10px] text-[#00E5FF] mt-1 font-mono">FAC: {user.facultyId}</p>
                )}
                {user?.linkedStudentId && (
                  <p className="text-[10px] text-[#00E5FF] mt-1 font-mono">Linked Child: {user.linkedStudentId}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </header>
  );
};

export default Header;

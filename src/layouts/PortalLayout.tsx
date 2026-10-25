import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types/index.js';
import Sidebar from '../components/common/Sidebar.js';
import Header from '../components/common/Header.js';
import { ShieldAlert } from 'lucide-react';

interface PortalLayoutProps {
  allowedRoles: UserRole[];
  portalTitle: string;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ allowedRoles, portalTitle }) => {
  const { user, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">Verifying cryptographically signed session...</p>
      </div>
    );
  }

  // 1. Unauthenticated visitors must be redirected to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role-based guard check
  if (!allowedRoles.includes(user.role)) {
    let targetHome = '/student/dashboard';
    if (user.role === 'ADMIN') targetHome = '/admin/dashboard';
    else if (user.role === 'FACULTY') targetHome = '/faculty/dashboard';
    else if (user.role === 'PARENT') targetHome = '/parent/dashboard';
    else if (user.role === 'ADMISSION') targetHome = '/admission/dashboard';

    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="bg-[#141021] border border-[#3B0A6B] p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_30px_rgba(59,10,107,0.3)]">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Unauthorized Portal Access</h2>
          <p className="text-xs text-slate-400 mb-6">
            Your current account role is <span className="text-[#00E5FF] font-mono">{user.role}</span>. You do not have permission to access the <span className="text-white font-medium">{portalTitle}</span>.
          </p>
          <Link
            to={targetHome}
            className="inline-block py-2.5 px-6 rounded-xl text-xs font-semibold bg-[#3B0A6B] hover:bg-[#5c14a3] text-white transition-all border border-[#5c14a3]"
          >
            Go to My {user.role} Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header
          portalTitle={portalTitle}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  X
} from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle.js';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const resolveDestination = (serverRedirectUrl: string): string => {
    const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    if (requestedPath && serverRedirectUrl) {
      const portalPrefix = `/${serverRedirectUrl.split('/')[1]}/`;
      if (requestedPath.startsWith(portalPrefix)) {
        return requestedPath;
      }
    }
    return serverRedirectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please provide your institutional email, student ID, or faculty ID.');
      return;
    }

    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Login returns the backend-authoritative redirect URL
      const redirectUrl = await login(identifier.trim(), password);
      // Navigate to the server-determined destination
      navigate(resolveDestination(redirectUrl), { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication request failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotNotice(res.message);
    } catch (err: any) {
      setForgotNotice(err.message || 'Password reset request failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-[#00E5FF]/30">
      {/* Top-right theme switcher preserving login card layout */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[#3B0A6B]/25 blur-[120px] pointer-events-none rounded-full" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B0A6B] to-[#00E5FF]/40 border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.25)] group-hover:scale-105 transition-transform">
            <span className="font-mono font-extrabold text-[#00E5FF] text-base">SC</span>
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">
            Smart<span className="text-[#00E5FF]">Campus</span>
          </span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-white">
          Institutional Single Sign-On
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your authorized credentials to access your portal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="bg-[#141021] py-8 px-6 sm:px-8 border border-[#2a1e45] rounded-2xl shadow-2xl space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email, Student ID, or User ID
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. alex.rivers@smartcampus.edu or CS2023-042"
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00E5FF] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[#00E5FF] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00E5FF] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#3B0A6B] to-[#5c14a3] hover:from-[#4a0d85] hover:to-[#6d18c2] border border-[#5c14a3] shadow-[0_0_20px_rgba(59,10,107,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Authoritative Role...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Smart Campus</span>
                  <ArrowRight size={14} className="text-[#00E5FF]" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Prospective student?{' '}
          <Link to="/admission/apply" className="text-[#00E5FF] hover:underline font-semibold">
            Submit an admission application
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Password Recovery</h3>
              <button onClick={() => setShowForgotModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter your registered campus email address to receive cryptographic password reset instructions.
            </p>

            {forgotNotice ? (
              <div className="p-3 bg-[#050505] border border-[#3B0A6B] text-xs text-[#00E5FF] rounded-xl">
                {forgotNotice}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@smartcampus.edu"
                  className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-[#3B0A6B] hover:bg-[#5c14a3] text-white"
                >
                  Send Recovery Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

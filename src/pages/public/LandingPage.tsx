import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  Radio, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Calendar, 
  Cpu, 
  GraduationCap,
  QrCode,
  FileText
} from 'lucide-react';
import QRModal from '../../components/common/QRModal.js';
import ThemeToggle from '../../components/common/ThemeToggle.js';

export const LandingPage: React.FC = () => {
  const [collegeInfo, setCollegeInfo] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    api.getCollegeInfo().then(res => {
      if (res.success) setCollegeInfo(res);
    }).catch(console.error);
  }, []);

  const collegeName = collegeInfo?.settings?.collegeName || "Apex Institute of Science & Technology";
  const collegeCode = collegeInfo?.settings?.collegeShortCode || "AIST";

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col selection:bg-[#00E5FF]/30 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 border-b border-[#2a1e45] px-6 lg:px-12 flex items-center justify-between bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3B0A6B] to-[#00E5FF]/40 border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.25)]">
            <span className="font-mono font-extrabold text-[#00E5FF] text-base">{collegeCode}</span>
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">
              Smart<span className="text-[#00E5FF]">Campus</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono block -mt-1">
              {collegeName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <ThemeToggle />

          <button
            onClick={() => setShowQR(true)}
            className="hidden sm:flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all"
          >
            <QrCode size={15} className="text-[#00E5FF]" />
            Workflow QR
          </button>

          <Link
            to="/admission/apply"
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all"
          >
            Admissions
          </Link>

          <Link
            to="/login"
            className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#3B0A6B] to-[#5c14a3] hover:from-[#4a0d85] hover:to-[#6d18c2] border border-[#5c14a3] shadow-[0_0_20px_rgba(59,10,107,0.5)] transition-all flex items-center gap-2"
          >
            Sign In
            <ArrowRight size={14} className="text-[#00E5FF]" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6 lg:px-12 border-b border-[#2a1e45]">
        {/* Ambient subtle royal amethyst glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#3B0A6B]/20 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[200px] bg-[#00E5FF]/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141021] border border-[#3B0A6B] text-xs font-mono text-slate-300">
            <Radio size={14} className="text-[#00E5FF] animate-pulse" />
            <span>Smart ESP32 BLE Attendance &amp; Unified Campus ERP</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            The Autonomous Operating System for Modern <span className="bg-gradient-to-r from-white via-slate-200 to-[#00E5FF] bg-clip-text text-transparent">Colleges</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Enterprise management engineered with sub-second BLE gate detection, zero-proxy attendance logs, verified academic credentials, and segregated portals for Students, Faculty, Parents, and Leadership.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/login"
              className="py-3 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#3B0A6B] to-[#5c14a3] hover:from-[#4a0d85] hover:to-[#6d18c2] border border-[#5c14a3] shadow-[0_0_25px_rgba(59,10,107,0.6)] transition-all flex items-center gap-2"
            >
              Access Portal
              <ArrowRight size={16} className="text-[#00E5FF]" />
            </Link>

            <Link
              to="/admission/apply"
              className="py-3 px-7 rounded-xl text-sm font-semibold text-slate-200 hover:text-white bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-2"
            >
              <FileText size={16} className="text-[#00E5FF]" />
              Start 2026-27 Application
            </Link>
          </div>
        </div>
      </section>

      {/* 5 Portals Feature Grid */}
      <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#00E5FF] mb-2">
            Five Purpose-Built Portals
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Tailored Experiences. Zero Cross-Role Bleed.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Student Portal */}
          <div className="p-6 rounded-2xl bg-[#0d0a14] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF] mb-4 group-hover:scale-105 transition-transform">
              <GraduationCap size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Student Portal</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Live BLE attendance percentage, daily turnstile entry/exit times, interactive timetables, verified marksheets, fee breakdown, and assignments.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Route: /student/dashboard</div>
          </div>

          {/* Faculty Portal */}
          <div className="p-6 rounded-2xl bg-[#0d0a14] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF] mb-4 group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Faculty Portal</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Assigned classes directory, real-time live attendance feed, automated low-attendance warnings (&lt;75%), assignment creator, and marks publishing.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Route: /faculty/dashboard</div>
          </div>

          {/* Parent Portal */}
          <div className="p-6 rounded-2xl bg-[#0d0a14] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF] mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Parent Portal</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Strictly verified parent-child relationship. Real-time campus entry/exit notifications, academic grade monitoring, and direct faculty inquiries.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Route: /parent/dashboard</div>
          </div>

          {/* Admission Portal */}
          <div className="p-6 rounded-2xl bg-[#0d0a14] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF] mb-4 group-hover:scale-105 transition-transform">
              <FileText size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Admission Portal</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Public applicant registration with reference number generation, document verification queues, status transitions, and acknowledgement receipts.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Route: /admission/dashboard</div>
          </div>

          {/* Admin Portal */}
          <div className="p-6 rounded-2xl bg-[#0d0a14] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF] mb-4 group-hover:scale-105 transition-transform">
              <Cpu size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Admin Portal</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Institutional command center: ESP32 hardware beacon monitor, manual attendance overrides with immutable audit logs, settings, and user management.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Route: /admin/dashboard</div>
          </div>

          {/* Smart BLE Node Architecture */}
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#00E5FF]/30 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] mb-4">
              <Radio size={22} className="animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">ESP32 &amp; BLE Telemetry</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Decentralized hardware nodes at entrance turnstiles. Deduplication windows, RSSI proximity thresholds, and sub-second webhook ingestion.
            </p>
            <div className="text-[11px] font-mono text-[#00E5FF]">Automated Gate Processing</div>
          </div>
        </div>
      </section>

      {/* College Announcements & Events Section */}
      <section className="py-16 px-6 lg:px-12 border-t border-[#2a1e45] bg-[#0c0a13]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <p className="text-xs font-mono font-semibold uppercase tracking-widest text-[#00E5FF] mb-1">
                Official Bulletins
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Campus Notices &amp; Public Events</h2>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-[#00E5FF] hover:underline flex items-center gap-1"
            >
              Sign in to view all records <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
              <span className="text-[10px] font-mono uppercase text-[#00E5FF] block mb-2">Notice</span>
              <h4 className="text-sm font-bold text-white mb-2">ESP32 Smart Attendance Node Firmware Update</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gate scanners have been upgraded to v2.4.1. Students must ensure Bluetooth is active upon approach.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
              <span className="text-[10px] font-mono uppercase text-[#00E5FF] block mb-2">Admissions</span>
              <h4 className="text-sm font-bold text-white mb-2">Spring 2027 Admissions Application Cycle Active</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Online application portal open for undergraduate engineering and postgraduate programs.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
              <span className="text-[10px] font-mono uppercase text-[#00E5FF] block mb-2">Flagship Event</span>
              <h4 className="text-sm font-bold text-white mb-2">HackCampus 2026: AI &amp; IoT Smart Systems</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Annual 36-hour hackathon focusing on edge computing, BLE telematics, and LLM autonomous agents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#2a1e45] py-8 px-6 lg:px-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SmartCampus</span>
            <span>&copy; 2026 {collegeName}. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Z Black &middot; Royal Amethyst &middot; Electric Cyan</span>
            <span className="font-mono text-[#00E5FF]">WCAG AA Compliant</span>
          </div>
        </div>
      </footer>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </div>
  );
};

export default LandingPage;

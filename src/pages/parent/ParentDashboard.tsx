import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  Users, 
  Calendar, 
  Radio, 
  AlertTriangle, 
  BookOpen, 
  CreditCard, 
  Send, 
  ShieldCheck, 
  Clock,
  ArrowRight
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const [childData, setChildData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getParentChildData().then(res => {
      if (res.success) setChildData(res);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading verified child profile...</div>;
  }

  const student = childData?.student;
  const attendance = childData?.attendance;
  const fees = childData?.fees;
  const academic = childData?.academic;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Verified Child Identity Banner */}
      <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-[#141021] via-[#1c162f] to-[#3B0A6B]/30 border border-[#2a1e45] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={student?.photograph || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
            alt={student?.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00E5FF]/40 shadow-lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-[#00E5FF] tracking-widest block">
                Verified Dependent Ward
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {student?.name || 'Alex Rivers'}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Roll No: {student?.rollNumber} &bull; {student?.branch} &bull; Sem {student?.semester} (Sec {student?.section})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/parent/contact-faculty"
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2"
          >
            <Send size={14} className="text-[#00E5FF]" />
            Contact Department Mentors
          </Link>
        </div>
      </div>

      {/* Attendance Warning if < 75% */}
      {attendance?.isLowAttendance && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Institutional Attendance Notice:</span> Your child's attendance ({attendance.percentage}%) is currently below the required 75% threshold. Please review daily logs or contact faculty.
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Attendance */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Cumulative Attendance</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">
            {attendance?.percentage ?? 88.5}%
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Status: <span className="text-emerald-400 font-semibold">{attendance?.statusToday}</span>
          </span>
        </div>

        {/* Metric 2: Today's Gate Timestamps */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Today's Campus Entry / Exit</span>
          <div className="text-sm font-bold font-mono text-[#00E5FF] mt-2 mb-1">
            In: {attendance?.firstEntryToday || '08:42 AM'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Out: {attendance?.lastExitToday || 'On Campus'}
          </span>
        </div>

        {/* Metric 3: Academic SGPA */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Academic Cumulative CGPA</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">
            {academic?.currentCgpa ?? '8.90'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Latest Semester SGPA: <span className="text-[#00E5FF]">{academic?.currentSgpa ?? '8.85'}</span>
          </span>
        </div>

        {/* Metric 4: Fee Balance */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Outstanding Tuition Balance</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">
            ${fees?.pendingBalance ?? 1250}
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Due: {fees?.dueDate || '2026-11-30'}</span>
        </div>
      </div>

      {/* Recent Activity and Attendance History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Attendance Log */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Recent Campus Turnstile Entries</h3>
            <span className="text-xs font-mono text-[#00E5FF]">ESP32 Verified</span>
          </div>

          <div className="space-y-3">
            {attendance?.recentDays?.map((d: any) => (
              <div
                key={d.id}
                className="p-3.5 bg-[#050505] rounded-xl border border-[#2a1e45] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-semibold text-white block">{d.date}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Entry: {d.firstEntryTime || 'Absent'} &bull; Exit: {d.lastExitTime || '--'}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                  d.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400' :
                  d.status === 'LATE' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Academic Performance & Contact */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <h3 className="text-sm font-bold text-white">Published Semester Grade Card</h3>
          <p className="text-xs text-slate-400">Validated examination evaluation records</p>

          <div className="space-y-2">
            {academic?.marks?.[0]?.subjects?.map((sub: any) => (
              <div
                key={sub.subjectCode}
                className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-[10px] font-mono text-[#00E5FF]">{sub.subjectCode}</span>
                  <p className="font-semibold text-white">{sub.subjectName}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-[#00E5FF]">{sub.total} / 100</span>
                  <span className="text-[10px] text-slate-400 block font-bold">Grade: {sub.grade}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3">
            <Link
              to="/parent/contact-faculty"
              className="w-full py-2.5 rounded-xl bg-[#050505] hover:bg-[#1c162f] text-slate-200 border border-[#2a1e45] text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Send size={13} className="text-[#00E5FF]" />
              Schedule Parent-Faculty Discussion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Award, 
  ArrowRight,
  Radio,
  FileCheck
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [feeInvoice, setFeeInvoice] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profRes, attRes, asgRes, marksRes, feesRes, evRes, ttRes] = await Promise.all([
          api.getStudentProfile(),
          api.getAttendanceHistory(),
          api.getStudentAssignments(),
          api.getStudentMarks(),
          api.getStudentFees(),
          api.getStudentEvents(),
          api.getStudentTimetable('Monday')
        ]);

        if (profRes.success) setProfile(profRes.profile);
        if (attRes.success) setAttendance(attRes);
        if (asgRes.success) setAssignments(asgRes.assignments);
        if (marksRes.success) setMarks(marksRes.marksRecords);
        if (feesRes.success) setFeeInvoice(feesRes.invoice);
        if (evRes.success) setEvents(evRes.events);
        if (ttRes.success) setTimetable(ttRes.timetable);
      } catch (err: any) {
        // Handle student telemetry load error gracefully
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-[#141021] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
          <div className="h-24 bg-[#141021] rounded-xl" />
        </div>
      </div>
    );
  }

  const todayRecord = attendance?.records?.[0];
  const attendancePercent = attendance?.overallPercentage ?? 88.5;
  const isLowAttendance = attendancePercent < (attendance?.threshold ?? 75);
  const latestResult = marks?.[0];
  const nextAssignment = assignments.find(a => !a.submission);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#141021] via-[#1c162f] to-[#3B0A6B]/30 border border-[#2a1e45] p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-40 bg-[#3B0A6B]/20 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={profile?.photograph || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
              alt={profile?.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00E5FF]/40 shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome back, {profile?.name || 'Alex'}
                </h1>
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {profile?.rollNumber} &bull; {profile?.branch} &bull; Sem {profile?.semester} (Sec {profile?.section})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45] text-xs font-mono">
              <span className="text-slate-400">BLE MAC: </span>
              <span className="text-[#00E5FF] font-semibold">{profile?.bleMac || 'AA:BB:CC:11:22:33'}</span>
            </div>
            <Link
              to="/student/attendance"
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
            >
              Full Attendance Log <ArrowRight size={14} className="text-[#00E5FF]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Critical Attendance Warning if < 75% */}
      {isLowAttendance && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Institutional Attendance Alert:</span> Your calculated attendance ({attendancePercent}%) has fallen below the mandatory {attendance?.threshold ?? 75}% threshold. Please attend upcoming lectures to avoid examination debarment.
          </div>
        </div>
      )}

      {/* Top Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Attendance */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Overall Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {attendancePercent}%
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-[#00E5FF] font-medium">{attendance?.stats?.presentDays ?? 4} Present</span>
            <span>&bull;</span>
            <span className="text-rose-400 font-medium">{attendance?.stats?.absentDays ?? 1} Absent</span>
          </div>
        </div>

        {/* Metric 2: Today's Gate Detection */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Today's Campus Presence</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
              <Radio size={16} />
            </div>
          </div>
          <div className="text-lg font-bold text-white mb-1">
            {todayRecord?.status === 'PRESENT' ? 'Present (Verified)' : 'Pending Detection'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Entry: <span className="text-[#00E5FF]">{todayRecord?.firstEntryTime || '08:42 AM'}</span> &bull; Exit: {todayRecord?.lastExitTime || 'On Campus'}
          </div>
        </div>

        {/* Metric 3: Academic SGPA */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Academic Performance</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {latestResult?.sgpa ?? '8.85'} <span className="text-xs font-normal text-slate-400">SGPA</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Cumulative CGPA: <span className="text-[#00E5FF] font-bold">{latestResult?.cgpa ?? '8.90'}</span>
          </div>
        </div>

        {/* Metric 4: Fee Balance */}
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Pending Fee Balance</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            ${feeInvoice?.pendingBalance ?? 1250}
          </div>
          <div className="text-[11px] text-slate-400">
            Due by <span className="text-amber-400 font-mono">{feeInvoice?.dueDate || '2026-11-30'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Assignments / Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timetable Today & Subject Attendance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45]">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Today's Academic Lectures</h3>
                <span className="text-xs text-slate-400">Classroom &amp; Lab Schedule</span>
              </div>
              <Link to="/student/timetable" className="text-xs font-semibold text-[#00E5FF] hover:underline">
                View Weekly Grid &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {timetable.slice(0, 3).map((slot, idx) => (
                <div
                  key={slot.id || idx}
                  className="p-3.5 rounded-xl bg-[#050505] border border-[#2a1e45] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-10 rounded-full bg-gradient-to-b from-[#00E5FF] to-[#3B0A6B]" />
                    <div>
                      <p className="text-xs font-bold text-white">{slot.subjectName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {slot.subjectCode} &bull; {slot.facultyName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-[#00E5FF] block">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{slot.room}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Attendance Breakdown */}
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight">Subject-Wise Attendance</h3>
              <span className="text-xs font-mono text-slate-400">Minimum 75% required</span>
            </div>

            <div className="space-y-3">
              {attendance?.subjectSummaries?.map((sub: any) => (
                <div key={sub.subjectCode} className="p-3.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="font-semibold text-white">{sub.subjectName}</span>
                    <span className={`font-mono font-bold ${sub.isLowAttendance ? 'text-amber-400' : 'text-[#00E5FF]'}`}>
                      {sub.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#141021] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.isLowAttendance ? 'bg-amber-400' : 'bg-[#00E5FF]'}`}
                      style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>{sub.attended} of {sub.totalConducted} lectures</span>
                    <span>{sub.facultyName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Assignments, Events, Documents */}
        <div className="space-y-6">
          {/* Next Assignment */}
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45]">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={16} className="text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-white">Pending Assignment</h3>
            </div>
            {nextAssignment ? (
              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-2">
                <span className="text-[10px] font-mono text-[#00E5FF] uppercase block">
                  {nextAssignment.subjectCode}
                </span>
                <p className="text-xs font-bold text-white">{nextAssignment.title}</p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Due: {nextAssignment.deadline}</span>
                  <span className="font-mono text-white">{nextAssignment.maxMarks} Marks</span>
                </div>
                <Link
                  to="/student/assignments"
                  className="mt-2 w-full py-2 rounded-lg text-xs font-semibold bg-[#3B0A6B] hover:bg-[#5c14a3] text-white flex items-center justify-center gap-1"
                >
                  Submit Solution &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400">All assigned coursework evaluated and submitted.</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Campus Events</h3>
              <Link to="/student/events" className="text-xs text-[#00E5FF] hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {events.slice(0, 2).map(e => (
                <div key={e.id} className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45]">
                  <span className="text-[10px] font-mono text-[#00E5FF] uppercase block mb-1">
                    {e.category}
                  </span>
                  <h4 className="text-xs font-bold text-white leading-tight mb-1">{e.title}</h4>
                  <p className="text-[11px] text-slate-400">{e.date} &bull; {e.venue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

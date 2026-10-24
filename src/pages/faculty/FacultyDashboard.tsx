import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  Users, 
  Radio, 
  AlertTriangle, 
  ClipboardList, 
  GraduationCap, 
  Plus, 
  ArrowRight,
  Clock
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFacultyOverview(),
      api.getLiveBleEvents()
    ]).then(([ovRes, liveRes]) => {
      if (ovRes.success) setOverview(ovRes);
      if (liveRes.success) setLiveEvents(liveRes.events);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading faculty academic workspace...</div>;
  }

  const faculty = overview?.faculty;
  const stats = overview?.stats;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-[#141021] via-[#1c162f] to-[#3B0A6B]/30 border border-[#2a1e45] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div>
          <span className="text-[10px] font-mono uppercase text-[#00E5FF] tracking-widest block mb-1">
            Faculty Academic Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {faculty?.name || 'Dr. Ramesh Sharma'}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {faculty?.designation} &bull; {faculty?.department} &bull; Room {faculty?.officeLocation}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/faculty/assignments"
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Create Assignment
          </Link>
          <Link
            to="/faculty/marks"
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all"
          >
            Marks Entry
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Assigned Classes</span>
            <Users size={16} className="text-[#00E5FF]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {stats?.assignedClassesCount ?? 2} <span className="text-xs font-normal text-slate-400">Sections</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Groups: {faculty?.assignedClasses?.join(', ')}</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Enrolled Students</span>
            <GraduationCap size={16} className="text-[#00E5FF]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {stats?.totalStudentsCount ?? 3}
          </div>
          <span className="text-[11px] text-[#00E5FF] font-mono">B.Tech CSE - Sem 5</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Low Attendance Alert</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mb-1">
            {stats?.lowAttendanceCount ?? 1}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Students &lt; 75% threshold</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-slate-400 font-medium">Pending Evaluations</span>
            <ClipboardList size={16} className="text-[#00E5FF]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-1">
            {stats?.pendingEvaluations ?? 1}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Submissions to grade</span>
        </div>
      </div>

      {/* Main Section: Assigned Subjects & Live ESP32 Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Assigned Courses &amp; Modules</h3>
                <p className="text-xs text-slate-400">Current Semester Teaching Responsibilities</p>
              </div>
              <Link to="/faculty/students" className="text-xs text-[#00E5FF] hover:underline">
                Student Directory &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {overview?.assignedSubjects?.map((sub: any) => (
                <div
                  key={sub.code}
                  className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-mono text-[#00E5FF]">{sub.code}</span>
                    <h4 className="text-xs font-bold text-white">{sub.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                      Room: {sub.lectureRoom} &bull; {sub.weeklyHours} hrs/week
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/faculty/assignments"
                      className="py-1 px-3 rounded-lg bg-[#141021] hover:bg-[#1c162f] text-slate-300 border border-[#2a1e45] text-xs"
                    >
                      Assignments
                    </Link>
                    <Link
                      to="/faculty/marks"
                      className="py-1 px-3 rounded-lg bg-[#3B0A6B] hover:bg-[#5c14a3] text-white text-xs font-medium"
                    >
                      Enter Marks
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Live BLE Detections Feed */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-[#00E5FF] animate-pulse" />
              <h3 className="text-sm font-bold text-white">Live Gate Telemetry</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Real-Time</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {liveEvents.slice(0, 5).map(evt => (
              <div
                key={evt.id}
                className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">{evt.studentName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    evt.nodeType === 'ENTRY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-cyan-400 bg-cyan-500/10'
                  }`}>
                    {evt.nodeType}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{evt.nodeId}</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;

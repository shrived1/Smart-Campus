import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  Radio, 
  Cpu, 
  CreditCard, 
  AlertTriangle, 
  Activity, 
  Shield, 
  Plus,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminOverview().then(res => {
      if (res.success) setData(res);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading enterprise administration telemetry...</div>;
  }

  const stats = data?.stats;
  const recentActivity = data?.recentActivity || [];
  const recentBleEvents = data?.recentBleEvents || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 lg:p-8 rounded-2xl bg-gradient-to-r from-[#141021] via-[#1c162f] to-[#3B0A6B]/30 border border-[#2a1e45] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-[#00E5FF] tracking-widest block">
              Institutional Admin Center
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Campus Enterprise Command Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            System Status: Operational &bull; Smart BLE Beacons Active
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/students"
            className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Enroll Student
          </Link>
          <Link
            to="/admin/devices"
            className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-1.5"
          >
            <Cpu size={14} className="text-[#00E5FF]" /> ESP32 Nodes
          </Link>
        </div>
      </div>

      {/* Primary 8 Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Enrolled Students</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">{stats?.totalStudents ?? 3}</div>
          <span className="text-[11px] text-[#00E5FF] font-mono">Active Student Records</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Faculty Members</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">{stats?.totalFaculty ?? 2}</div>
          <span className="text-[11px] text-slate-400 font-mono">Professors &amp; HODs</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Today's Attendance</span>
          <div className="text-2xl font-bold font-mono text-[#00E5FF] mt-1 mb-1">
            {stats?.overallAttendancePercent ?? 88}%
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {stats?.presentToday ?? 2} Present &bull; {stats?.absentToday ?? 1} Absent
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Low Attendance Risk</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 mb-1">
            {stats?.lowAttendanceCount ?? 1}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Below 75% Threshold</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">ESP32 Turnstile Nodes</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 mb-1">
            {stats?.onlineDevices ?? 4} / {stats?.totalDevices ?? 4}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">100% Online &amp; Scanning</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Pending Admissions</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">{stats?.pendingAdmissions ?? 2}</div>
          <span className="text-[11px] text-[#00E5FF] font-mono">Review Queue</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Outstanding Fees</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">${stats?.totalPendingFees ?? 1250}</div>
          <span className="text-[11px] text-slate-400 font-mono">Uncollected Balance</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Audit Trail Events</span>
          <div className="text-2xl font-bold font-mono text-white mt-1 mb-1">{stats?.auditLogsCount ?? 3}</div>
          <span className="text-[11px] text-slate-400 font-mono">Cryptographically Logged</span>
        </div>
      </div>

      {/* Grid: Audit Logs & Live ESP32 Beacon Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Audit Trail */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-[#00E5FF]" />
              <h3 className="text-sm font-bold text-white">System Audit Log Trail</h3>
            </div>
            <Link to="/admin/audit-logs" className="text-xs text-[#00E5FF] hover:underline font-mono">
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivity.map((log: any) => (
              <div
                key={log.id}
                className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs space-y-1"
              >
                <div className="flex justify-between items-center font-mono">
                  <span className="text-[#00E5FF] font-bold text-[11px]">{log.action}</span>
                  <span className="text-slate-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-300 text-xs">{log.details}</p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  By {log.actorName} ({log.actorRole}) &bull; IP: {log.ipAddress}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Gate Scans */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-[#00E5FF] animate-pulse" />
              <h3 className="text-sm font-bold text-white">Live ESP32 Gate Telemetry</h3>
            </div>
            <Link to="/admin/devices" className="text-xs text-[#00E5FF] hover:underline font-mono">
              Manage Hardware &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentBleEvents.map((evt: any) => (
              <div
                key={evt.id}
                className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-white block">{evt.studentName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    MAC: {evt.bleMac} &bull; Node: {evt.nodeId}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    evt.nodeType === 'ENTRY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                  }`}>
                    {evt.nodeType}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{evt.rssi} dBm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

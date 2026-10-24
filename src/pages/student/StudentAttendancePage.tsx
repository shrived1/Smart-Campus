import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { 
  Calendar, 
  Radio, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Filter
} from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('ALL');

  useEffect(() => {
    api.getAttendanceHistory().then(res => {
      if (res.success) setData(res);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-[#141021] rounded-2xl" />
        <div className="h-64 bg-[#141021] rounded-2xl" />
      </div>
    );
  }

  const records = data?.records || [];
  const subjectSummaries = data?.subjectSummaries || [];
  const overallPercent = data?.overallPercentage ?? 88.5;
  const isLow = overallPercent < (data?.threshold ?? 75);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="p-6 lg:p-8 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[#00E5FF] animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">Smart Attendance &amp; ESP32 Telemetry</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated turnstile verification via physical campus BLE beacons. No proxy, cryptographic timestamps.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-[#050505] rounded-xl border border-[#2a1e45] text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Overall Ratio</span>
            <span className={`text-xl font-bold font-mono ${isLow ? 'text-amber-400' : 'text-[#00E5FF]'}`}>
              {overallPercent}%
            </span>
          </div>
          <div className="px-4 py-2 bg-[#050505] rounded-xl border border-[#2a1e45] text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Threshold</span>
            <span className="text-xl font-bold font-mono text-white">75.0%</span>
          </div>
        </div>
      </div>

      {/* Threshold Warning Banner */}
      {isLow && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <span>
            Warning: Your attendance has dropped below 75%. Continued absenteeism may require academic dean clearance.
          </span>
        </div>
      )}

      {/* Subject-Wise Attendance Cards */}
      <div>
        <h2 className="text-sm font-bold text-white mb-4">Subject-Wise Attendance Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectSummaries.map((sub: any) => (
            <div key={sub.subjectCode} className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#00E5FF]">{sub.subjectCode}</span>
                  <h3 className="text-xs font-bold text-white leading-snug">{sub.subjectName}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  sub.isLowAttendance ? 'bg-amber-500/20 text-amber-400' : 'bg-[#00E5FF]/20 text-[#00E5FF]'
                }`}>
                  {sub.percentage}%
                </span>
              </div>

              <div className="w-full h-1.5 bg-[#050505] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sub.isLowAttendance ? 'bg-amber-400' : 'bg-[#00E5FF]'}`}
                  style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Attended: {sub.attended} / {sub.totalConducted}</span>
                <span>{sub.facultyName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Detailed Attendance Log Table */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">Daily Campus Entry &amp; Exit Log</h2>
            <p className="text-xs text-slate-400">Captured via ESP32 BLE Scanner nodes</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Filter:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#050505] border border-[#2a1e45] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Recorded Days</option>
              <option value="10">October 2026</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">First Valid Entry</th>
                <th className="pb-3 px-3">Last Valid Exit</th>
                <th className="pb-3 px-3">Duration On Campus</th>
                <th className="pb-3 px-3">Verification Node</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1e45]/50">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-[#1c162f]/40 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-medium text-white">{r.date}</td>
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      r.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      r.status === 'LATE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {r.status === 'PRESENT' && <CheckCircle size={12} />}
                      {r.status === 'LATE' && <Clock size={12} />}
                      {r.status === 'ABSENT' && <XCircle size={12} />}
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#00E5FF]">{r.firstEntryTime || '--:--'}</td>
                  <td className="py-3.5 px-3 font-mono text-slate-300">{r.lastExitTime || '--:--'}</td>
                  <td className="py-3.5 px-3 text-slate-400">
                    {r.totalMinutesCampus ? `${Math.floor(r.totalMinutesCampus / 60)}h ${r.totalMinutesCampus % 60}m` : '0 min'}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                    {r.verificationMethod} ({r.notes || 'ESP32 Node'})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendancePage;

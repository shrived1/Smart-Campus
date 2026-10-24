import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Calendar, Radio, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';

export const ParentAttendancePage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getParentChildData().then(res => {
      if (res.success) setData(res);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading child attendance logs...</div>;
  }

  const attendance = data?.attendance;
  const recentDays = attendance?.recentDays || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Child Campus Attendance Log</h1>
          <p className="text-xs text-slate-400 mt-1">Student: {data?.student?.name} &bull; Roll: {data?.student?.rollNumber}</p>
        </div>
        <div className="px-4 py-2 bg-[#050505] rounded-xl border border-[#2a1e45] text-right font-mono">
          <span className="text-[10px] text-slate-400 uppercase block">Total Ratio</span>
          <span className="text-lg font-bold text-[#00E5FF]">{attendance?.percentage}%</span>
        </div>
      </div>

      {attendance?.isLowAttendance && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
          <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          <span>Warning: Attendance is below 75%. Please ensure regular class attendance.</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <h2 className="text-sm font-bold text-white">Daily Gate Turnstile History</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Entry Recorded</th>
                <th className="pb-3 px-3">Exit Recorded</th>
                <th className="pb-3 px-3">Verification Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1e45]/50">
              {recentDays.map((d: any) => (
                <tr key={d.id} className="hover:bg-[#1c162f]/40">
                  <td className="py-3 px-3 font-mono font-medium text-white">{d.date}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      d.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400' :
                      d.status === 'LATE' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {d.status === 'PRESENT' && <CheckCircle size={12} />}
                      {d.status === 'LATE' && <Clock size={12} />}
                      {d.status === 'ABSENT' && <XCircle size={12} />}
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#00E5FF]">{d.firstEntryTime || '--'}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">{d.lastExitTime || '--'}</td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{d.verificationMethod} (Node Scanner)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParentAttendancePage;

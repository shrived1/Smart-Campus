import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Calendar, ShieldAlert, CheckCircle, Clock, XCircle, Search, Edit3, X } from 'lucide-react';

export const AdminAttendancePage: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      const res = await api.getAttendanceHistory();
      if (res.success) setRecords(res.records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setSaving(true);
    try {
      const res = await api.manualAttendanceCorrection({
        studentId: selectedRecord.studentId,
        date: selectedRecord.date,
        status: newStatus,
        notes: overrideNotes
      });
      if (res.success) {
        setSuccessNotice(`Attendance for ${selectedRecord.studentId} on ${selectedRecord.date} updated to ${newStatus}. Logged in immutable audit trail.`);
        setSelectedRecord(null);
        await fetchRecords();
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading attendance ledger...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Institutional Attendance Management</h1>
          <p className="text-xs text-slate-400 mt-1">Audit daily turnstile logs and perform authorized manual corrections.</p>
        </div>
        <div className="text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
          Audit-Trail Enforced
        </div>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={16} />
          {successNotice}
        </div>
      )}

      {/* Records Table */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
              <th className="pb-3 px-3">Date</th>
              <th className="pb-3 px-3">Student ID</th>
              <th className="pb-3 px-3">Status</th>
              <th className="pb-3 px-3">First Valid Entry</th>
              <th className="pb-3 px-3">Last Valid Exit</th>
              <th className="pb-3 px-3">Verification Source</th>
              <th className="pb-3 px-3 text-right">Manual Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a1e45]/50">
            {records.map(rec => (
              <tr key={rec.id} className="hover:bg-[#1c162f]/40">
                <td className="py-3 px-3 font-mono font-medium text-white">{rec.date}</td>
                <td className="py-3 px-3 font-mono text-[#00E5FF] font-semibold">{rec.studentId}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    rec.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400' :
                    rec.status === 'LATE' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {rec.status}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">{rec.firstEntryTime || '--:--'}</td>
                <td className="py-3 px-3 font-mono text-slate-300">{rec.lastExitTime || '--:--'}</td>
                <td className="py-3 px-3 text-[11px] text-slate-400 font-mono">
                  {rec.verificationMethod} {rec.notes ? `(${rec.notes})` : ''}
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => {
                      setSelectedRecord(rec);
                      setNewStatus(rec.status);
                      setOverrideNotes(rec.notes || 'Authorized medical or institutional leave');
                    }}
                    className="py-1 px-2.5 rounded-lg bg-[#3B0A6B] hover:bg-[#5c14a3] text-white text-xs font-medium flex items-center gap-1.5 ml-auto"
                  >
                    <Edit3 size={12} /> Correct
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Override Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Manual Attendance Override</h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs">
              <span className="text-slate-400">Target Student: </span>
              <span className="font-mono text-[#00E5FF] font-bold">{selectedRecord.studentId}</span>
              <span className="text-slate-400 block mt-1">Date: {selectedRecord.date}</span>
            </div>

            <form onSubmit={handleManualOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                >
                  <option value="PRESENT">PRESENT (Full Day Attended)</option>
                  <option value="LATE">LATE (Entered with grace permit)</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Justification Reason (Logged to Audit Trail)</label>
                <textarea
                  rows={3}
                  required
                  value={overrideNotes}
                  onChange={e => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Official collegiate sports representation permit approved by Dean..."
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {saving ? 'Recording Override...' : 'Commit to Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendancePage;

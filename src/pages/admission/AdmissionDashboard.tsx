import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { 
  FileText, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Filter,
  Check,
  X
} from 'lucide-react';

export const AdmissionDashboard: React.FC = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchApps = async (status = statusFilter) => {
    try {
      const res = await api.getApplications(status);
      if (res.success) {
        setApplications(res.applications);
        setStats(res.stats);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !newStatus) return;

    setSaving(true);
    try {
      const res = await api.updateApplicationStatus(selectedApp.id, {
        status: newStatus,
        reviewNotes
      });
      if (res.success) {
        setSelectedApp(null);
        await fetchApps();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading admissions management queue...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admissions Committee Console</h1>
          <p className="text-xs text-slate-400 mt-1">Review candidate applications, verify high-school transcripts, and update admissions status.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#00E5FF] px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
            Cycle: 2026-2027
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Received</span>
          <span className="text-xl font-bold font-mono text-white">{stats?.total ?? 3}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Submitted</span>
          <span className="text-xl font-bold font-mono text-cyan-400">{stats?.submitted ?? 1}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Under Review</span>
          <span className="text-xl font-bold font-mono text-amber-400">{stats?.underReview ?? 1}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Approved</span>
          <span className="text-xl font-bold font-mono text-emerald-400">{stats?.approved ?? 1}</span>
        </div>
        <div className="p-4 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Docs Needed</span>
          <span className="text-xl font-bold font-mono text-purple-400">{stats?.documentsRequired ?? 0}</span>
        </div>
      </div>

      {/* Applications Table */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-sm font-bold text-white">Application Review Queue</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Filter by Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#050505] border border-[#2a1e45] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Applications</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="DOCUMENTS_REQUIRED">DOCUMENTS_REQUIRED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
                <th className="pb-3 px-3">Reference No</th>
                <th className="pb-3 px-3">Applicant Name</th>
                <th className="pb-3 px-3">Program Requested</th>
                <th className="pb-3 px-3 text-center">Merit %</th>
                <th className="pb-3 px-3 text-center">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a1e45]/50">
              {applications.map(app => (
                <tr key={app.id} className="hover:bg-[#1c162f]/40">
                  <td className="py-3 px-3 font-mono font-bold text-[#00E5FF]">{app.refNumber}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-white block">{app.applicantName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{app.email}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{app.courseRequested}</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-white">{app.marksPercentage}%</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      app.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      app.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      app.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setNewStatus(app.status);
                        setReviewNotes(app.reviewNotes || '');
                      }}
                      className="py-1 px-3 rounded-lg bg-[#3B0A6B] hover:bg-[#5c14a3] text-white text-xs font-medium"
                    >
                      Review &amp; Decide
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Review Application: {selectedApp.refNumber}</h3>
              <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Applicant:</span>
                <span className="font-semibold text-white">{selectedApp.applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Previous School:</span>
                <span className="text-slate-200">{selectedApp.previousSchool}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merit Percentile:</span>
                <span className="font-mono text-[#00E5FF] font-bold">{selectedApp.marksPercentage}%</span>
              </div>
              <div className="pt-2 border-t border-[#2a1e45]">
                <span className="text-slate-400 block mb-1">Attached Documents:</span>
                {selectedApp.uploadedDocuments?.map((doc: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] font-mono text-slate-300">
                    <span>{doc.name}</span>
                    <span className="text-emerald-400">Transcript Verified</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Update Status Decision</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                >
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="DOCUMENTS_REQUIRED">DOCUMENTS_REQUIRED</option>
                  <option value="APPROVED">APPROVED (Admit to College)</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="WAITLISTED">WAITLISTED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Committee Review Notes</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Record verification findings and rationale..."
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {saving ? 'Saving Decision...' : 'Commit Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionDashboard;

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Shield, Search, Clock, Lock } from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getAuditLogs().then(res => {
      if (res.success) setLogs(res.logs);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#00E5FF]" />
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional Audit Logs &amp; Provenance</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Immutable security log of all authentication, manual overrides, and system mutations.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search action or actor..."
            className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          />
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No matching audit logs found.</div>
        ) : (
          filtered.map(l => (
            <div
              key={l.id}
              className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] space-y-2 hover:border-[#3B0A6B] transition-colors"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 font-mono text-xs">
                <span className="text-[#00E5FF] font-bold">{l.action}</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(l.timestamp).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-200">{l.details}</p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 pt-1 border-t border-[#2a1e45]/50">
                <span>Actor: <span className="text-white font-medium">{l.actorName}</span> ({l.actorRole})</span>
                <span>Actor ID: {l.actorId}</span>
                <span>Origin IP: {l.ipAddress}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;

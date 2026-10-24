import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { Send, CheckCircle2, Phone, Mail, User } from 'lucide-react';

export const ParentContactPage: React.FC = () => {
  const [facultyId, setFacultyId] = useState('FAC-101');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phoneCallback, setPhoneCallback] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setSubmitting(true);
    try {
      const res = await api.contactFaculty({
        facultyId,
        subject,
        message,
        phoneCallbackRequested: phoneCallback
      });
      if (res.success) {
        setSuccessNotice(res.message);
        setSubject('');
        setMessage('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45]">
        <h1 className="text-xl font-bold text-white tracking-tight">Contact Faculty &amp; Academic Counselors</h1>
        <p className="text-xs text-slate-400 mt-1">
          Direct communication channel with your child's course instructors and department dean.
        </p>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Select Faculty Member / Mentor</label>
          <select
            value={facultyId}
            onChange={e => setFacultyId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          >
            <option value="FAC-101">Dr. Ramesh Sharma (Associate Professor &amp; HOD - CSE)</option>
            <option value="FAC-102">Prof. Priya Nair (Assistant Professor - DBMS)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Discussion Subject / Topic</label>
          <input
            type="text"
            required
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Inquiring regarding midterm exam preparation and attendance record"
            className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Message Details</label>
          <textarea
            rows={4}
            required
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Please detail your query or request for guidance regarding your ward..."
            className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          />
        </div>

        <div className="flex items-center gap-2 p-3 bg-[#050505] rounded-xl border border-[#2a1e45]">
          <input
            type="checkbox"
            id="callback"
            checked={phoneCallback}
            onChange={e => setPhoneCallback(e.target.checked)}
            className="rounded border-[#2a1e45] bg-[#141021] text-[#00E5FF] focus:ring-[#00E5FF]"
          />
          <label htmlFor="callback" className="text-xs text-slate-300 cursor-pointer">
            Request official telephone callback during departmental office hours
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#3B0A6B] to-[#5c14a3] hover:from-[#4a0d85] hover:to-[#6d18c2] border border-[#5c14a3] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={14} className="text-[#00E5FF]" />
            {submitting ? 'Transmitting inquiry...' : 'Transmit Inquiry to Faculty'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ParentContactPage;

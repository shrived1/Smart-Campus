import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Users, Plus, Search, Shield, X, CheckCircle2 } from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // New Student Form
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [branch, setBranch] = useState('B.Tech CSE');
  const [bleMac, setBleMac] = useState('DD:EE:FF:44:55:66');

  const fetchStudents = async () => {
    try {
      const res = await api.getAdminStudents();
      if (res.success) setStudents(res.students);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rollNumber || !email) return;

    setEnrolling(true);
    try {
      const res = await api.enrollStudent({
        name,
        rollNumber,
        email,
        department,
        branch,
        bleMac,
        year: 1,
        semester: 1,
        section: 'A'
      });
      if (res.success) {
        setShowEnrollModal(false);
        setEnrollSuccess(true);
        setName('');
        setRollNumber('');
        setEmail('');
        await fetchStudents();
        setTimeout(() => setEnrollSuccess(false), 3000);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Student Roster Management</h1>
          <p className="text-xs text-slate-400 mt-1">Enroll students, bind BLE MAC hardware addresses, and manage access.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, roll, or email..."
              className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <button
            onClick={() => setShowEnrollModal(true)}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Enroll New Student
          </button>
        </div>
      </div>

      {enrollSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          Student successfully enrolled and provisioned with institutional credentials!
        </div>
      )}

      {/* Students Table */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
              <th className="pb-3 px-3">Student Name</th>
              <th className="pb-3 px-3">Roll Number</th>
              <th className="pb-3 px-3">Program &amp; Department</th>
              <th className="pb-3 px-3">Semester</th>
              <th className="pb-3 px-3">Registered BLE MAC</th>
              <th className="pb-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a1e45]/50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-[#1c162f]/40">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <img src={s.photograph} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                    <div>
                      <span className="font-semibold text-white block">{s.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-[#00E5FF]">{s.rollNumber}</td>
                <td className="py-3 px-3 text-slate-300">
                  <span className="block">{s.branch}</span>
                  <span className="text-[10px] text-slate-400">{s.department}</span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300">Sem {s.semester} ({s.section})</td>
                <td className="py-3 px-3 font-mono text-xs text-[#00E5FF]">{s.bleMac}</td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Enroll New Student</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Taylor Swift"
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Roll Number</label>
                <input
                  type="text"
                  required
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="CS2026-112"
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campus Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="taylor.s@smartcampus.edu"
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bluetooth BLE MAC Address</label>
                <input
                  type="text"
                  required
                  value={bleMac}
                  onChange={e => setBleMac(e.target.value.toUpperCase())}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-[#00E5FF] font-mono focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentsPage;

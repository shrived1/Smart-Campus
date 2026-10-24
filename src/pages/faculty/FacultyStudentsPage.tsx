import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Users, Search, AlertTriangle, ShieldCheck, Mail, Phone } from 'lucide-react';

export const FacultyStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getFacultyStudents().then(res => {
      if (res.success) setStudents(res.students);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Class Student Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Assigned Section: CS-3A &bull; Semester 5</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search student or roll no..."
            className="w-full pl-9 pr-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading student roster...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#141021] rounded-2xl border border-[#2a1e45]">
            No matching students found.
          </div>
        ) : (
          filtered.map(student => (
            <div
              key={student.id}
              className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="flex items-center gap-4">
                <img
                  src={student.photograph}
                  alt={student.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#2a1e45]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{student.name}</h3>
                    {student.isLowAttendance && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle size={11} /> Low Attendance
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#00E5FF]">{student.rollNumber}</span>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Mail size={12} /> {student.email}
                    </span>
                    <span className="font-mono text-slate-400">
                      BLE: {student.bleMac}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Attendance</span>
                  <span className={`text-sm font-mono font-bold ${
                    student.isLowAttendance ? 'text-amber-400' : 'text-[#00E5FF]'
                  }`}>
                    {student.attendancePercentage}%
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FacultyStudentsPage;

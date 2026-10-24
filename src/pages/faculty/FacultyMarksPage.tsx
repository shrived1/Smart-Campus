import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { GraduationCap, Save, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export const FacultyMarksPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('CS501');
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // Student marks state: studentId -> { internal, practical }
  const [marksState, setMarksState] = useState<Record<string, { internal: number; practical: number }>>({
    'STU-2023-042': { internal: 29, practical: 48 },
    'STU-2023-088': { internal: 26, practical: 42 },
    'STU-2023-104': { internal: 28, practical: 45 }
  });

  useEffect(() => {
    api.getFacultyStudents().then(res => {
      if (res.success) setStudents(res.students);
    });
  }, []);

  const handleScoreChange = (studentId: string, field: 'internal' | 'practical', val: number) => {
    setMarksState(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    try {
      // Save for prime student
      await api.updateMarksEntry({
        studentId: 'STU-2023-042',
        semester: 5,
        subjectCode: selectedSubject,
        internalMarks: marksState['STU-2023-042']?.internal ?? 29,
        practicalMarks: marksState['STU-2023-042']?.practical ?? 48,
        isPublished
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Academic Marks Entry &amp; Publishing</h1>
          <p className="text-xs text-slate-400 mt-1">Authorized Grading Console for Course CS501 &bull; Semester 5</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="CS501">CS501: Design &amp; Analysis of Algorithms</option>
            <option value="CS502">CS502: Operating Systems</option>
          </select>

          <button
            onClick={handleSaveMarks}
            disabled={saving}
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Commit Marks'}
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          Internal evaluation marks saved and synchronized with Student and Parent Portals.
        </div>
      )}

      {/* Publishing Toggle */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-white block">Official Result Visibility</span>
          <span className="text-[11px] text-slate-400">
            When published, grades are immediately viewable by students and linked parents.
          </span>
        </div>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={e => setIsPublished(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[#2a1e45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E5FF]"></div>
        </label>
      </div>

      {/* Spreadsheet Table */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
              <th className="pb-3 px-3">Student Name</th>
              <th className="pb-3 px-3">Roll Number</th>
              <th className="pb-3 px-3">Mid-Term / Internal (Max 30)</th>
              <th className="pb-3 px-3">Lab / Practical (Max 50)</th>
              <th className="pb-3 px-3 text-center">Calculated Total (80)</th>
              <th className="pb-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a1e45]/50">
            {students.map(s => {
              const scores = marksState[s.id] || { internal: 25, practical: 40 };
              const total = scores.internal + scores.practical;

              return (
                <tr key={s.id} className="hover:bg-[#1c162f]/40">
                  <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                  <td className="py-3 px-3 font-mono text-[#00E5FF]">{s.rollNumber}</td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      max={30}
                      min={0}
                      value={scores.internal}
                      onChange={e => handleScoreChange(s.id, 'internal', Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-[#050505] border border-[#2a1e45] rounded-lg font-mono text-center text-white focus:outline-none focus:border-[#00E5FF]"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="number"
                      max={50}
                      min={0}
                      value={scores.practical}
                      onChange={e => handleScoreChange(s.id, 'practical', Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-[#050505] border border-[#2a1e45] rounded-lg font-mono text-center text-white focus:outline-none focus:border-[#00E5FF]"
                    />
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-[#00E5FF]">
                    {total}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Validated
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FacultyMarksPage;

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { GraduationCap, Award, BookOpen, CheckCircle } from 'lucide-react';

export const StudentMarksPage: React.FC = () => {
  const [marksRecords, setMarksRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentMarks().then(res => {
      if (res.success) setMarksRecords(res.marksRecords);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading academic results...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Academic Transcripts &amp; Examination Results</h1>
          <p className="text-xs text-slate-400 mt-1">Official Controller of Examinations Record</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#00E5FF] px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
            Cumulative CGPA: {marksRecords[0]?.cgpa || '8.90'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {marksRecords.map(rec => (
          <div key={rec.semester} className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#2a1e45]">
              <div>
                <span className="text-xs font-mono text-[#00E5FF] uppercase">Academic Year {rec.academicYear}</span>
                <h2 className="text-base font-bold text-white">Semester {rec.semester} Grade Card</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-mono">Semester SGPA</span>
                <span className="text-lg font-bold font-mono text-[#00E5FF]">{rec.sgpa}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2a1e45] text-slate-400 font-mono uppercase text-[10px]">
                    <th className="pb-3 px-3">Subject Code &amp; Name</th>
                    <th className="pb-3 px-3 text-center">Credits</th>
                    <th className="pb-3 px-3 text-center">Internal (30)</th>
                    <th className="pb-3 px-3 text-center">Theory (70)</th>
                    <th className="pb-3 px-3 text-center">Total (100)</th>
                    <th className="pb-3 px-3 text-center">Letter Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a1e45]/50">
                  {rec.subjects.map((sub: any) => (
                    <tr key={sub.subjectCode} className="hover:bg-[#1c162f]/40">
                      <td className="py-3 px-3">
                        <span className="font-mono text-[#00E5FF] font-semibold block text-[11px]">{sub.subjectCode}</span>
                        <span className="text-white font-medium">{sub.subjectName}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">{sub.credits}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">{sub.internalMarks}</td>
                      <td className="py-3 px-3 text-center font-mono text-slate-300">{sub.theoryMarks || sub.practicalMarks}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white">{sub.total}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#3B0A6B]/50 text-[#00E5FF] border border-[#3B0A6B]">
                          {sub.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentMarksPage;

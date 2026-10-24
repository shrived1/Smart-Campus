import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { 
  ClipboardList, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText,
  X
} from 'lucide-react';

export const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsg, setSelectedAsg] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      const res = await api.getStudentAssignments();
      if (res.success) setAssignments(res.assignments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleOpenSubmitModal = (asg: any) => {
    setSelectedAsg(asg);
    setFileName(`AlexRivers_${asg.subjectCode}_Solution.zip`);
    setSubmitError(null);
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsg || !fileName) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.submitAssignment(selectedAsg.id, { fileName });
      if (res.success) {
        setSelectedAsg(null);
        await fetchAssignments();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please check file format and deadline.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading assignments directory...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Coursework &amp; Assignment Submissions</h1>
          <p className="text-xs text-slate-400 mt-1">Submit digital deliverables for grading and faculty review.</p>
        </div>
        <span className="text-xs font-mono text-[#00E5FF] px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
          {assignments.length} Coursework Tasks
        </span>
      </div>

      <div className="space-y-4">
        {assignments.map(asg => {
          const sub = asg.submission;
          const isSubmitted = !!sub;

          return (
            <div
              key={asg.id}
              className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-[10px] font-mono text-[#00E5FF] uppercase block">
                    {asg.subjectCode} &bull; {asg.subjectName}
                  </span>
                  <h3 className="text-base font-bold text-white">{asg.title}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Issued by: {asg.facultyName} &bull; Max Marks: {asg.maxMarks}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isSubmitted ? (
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 ${
                      sub.status === 'EVALUATED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      sub.status === 'LATE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      <CheckCircle2 size={13} />
                      {sub.status}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                      <Clock size={13} />
                      Pending Submission
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-200 block mb-1">Instructions:</span>
                {asg.instructions}
                <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-slate-400 pt-2 border-t border-[#2a1e45]">
                  <span>Deadline: <span className="text-white font-semibold">{asg.deadline}</span></span>
                  <span>Allowed Formats: <span className="text-[#00E5FF]">{asg.allowedFormats.join(', ')}</span></span>
                </div>
              </div>

              {/* Submission / Evaluation Feedback Result */}
              {isSubmitted && (
                <div className="p-4 bg-[#0c0a13] rounded-xl border border-[#3B0A6B]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-[#00E5FF]" />
                    <div className="text-xs">
                      <p className="font-semibold text-white">{sub.fileName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">Submitted on {new Date(sub.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {sub.status === 'EVALUATED' && (
                    <div className="text-right">
                      <div className="text-xs font-mono text-emerald-400 font-bold">
                        Score: {sub.marksObtained} / {asg.maxMarks}
                      </div>
                      {sub.feedback && (
                        <p className="text-[11px] text-slate-300 italic max-w-xs">{sub.feedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenSubmitModal(asg)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
                >
                  <Upload size={14} />
                  {isSubmitted ? 'Resubmit Solution' : 'Submit Assignment File'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Modal */}
      {selectedAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Upload Assignment Submission</h3>
              <button onClick={() => setSelectedAsg(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div>
              <span className="text-xs font-mono text-[#00E5FF]">{selectedAsg.subjectCode}</span>
              <h4 className="text-xs font-bold text-white">{selectedAsg.title}</h4>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitSolution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Submission File Name
                </label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="Solution_file.zip"
                  className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Allowed extensions: {selectedAsg.allowedFormats.join(', ')}
                </span>
              </div>

              <div className="p-4 bg-[#050505] border border-dashed border-[#2a1e45] rounded-xl text-center">
                <Upload size={22} className="mx-auto text-[#00E5FF] mb-1" />
                <span className="text-xs text-slate-300 block font-medium">Digital Solution File Ready</span>
                <span className="text-[10px] text-slate-400 font-mono">Verified SHA-256 Checksum</span>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAsg(null)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {submitting ? 'Uploading...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsPage;

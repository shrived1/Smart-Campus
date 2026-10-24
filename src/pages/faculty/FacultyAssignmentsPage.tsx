import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { ClipboardList, Plus, CheckCircle, Clock, FileText, X, AlertCircle } from 'lucide-react';

export const FacultyAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  // New assignment form
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('CS501');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('2026-11-15');
  const [maxMarks, setMaxMarks] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  // Evaluation form
  const [gradeMarks, setGradeMarks] = useState<number>(45);
  const [feedback, setFeedback] = useState('Good structural design and thorough algorithmic documentation.');
  const [evaluating, setEvaluating] = useState(false);

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

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectCode) return;

    setSubmitting(true);
    try {
      const res = await api.createAssignment({
        title,
        subjectCode,
        instructions,
        deadline,
        maxMarks: Number(maxMarks),
        allowedFormats: ['PDF', 'ZIP'],
        classGroup: 'CS-3A'
      });
      if (res.success) {
        setShowCreateModal(false);
        setTitle('');
        setInstructions('');
        await fetchAssignments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setEvaluating(true);
    try {
      const res = await api.gradeSubmission(selectedSub.assignmentId, selectedSub.id, {
        marksObtained: Number(gradeMarks),
        feedback
      });
      if (res.success) {
        setSelectedSub(null);
        await fetchAssignments();
      }
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading assignments &amp; submissions...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Assignment Management &amp; Evaluation</h1>
          <p className="text-xs text-slate-400 mt-1">Publish coursework problem sets and review student submissions.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2"
        >
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {/* Assignments and Submissions List */}
      <div className="space-y-6">
        {assignments.map(asg => (
          <div key={asg.id} className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-[10px] font-mono text-[#00E5FF] uppercase block">{asg.subjectCode}</span>
                <h3 className="text-base font-bold text-white">{asg.title}</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Deadline: {asg.deadline} &bull; Max Marks: {asg.maxMarks}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#050505] p-3 rounded-xl border border-[#2a1e45]">
              {asg.instructions}
            </p>

            {/* Submissions by Students */}
            <div className="pt-2">
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Student Submissions</h4>
              {asg.submissions && asg.submissions.length > 0 ? (
                <div className="space-y-2">
                  {asg.submissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-[#00E5FF]" />
                        <div>
                          <span className="font-semibold text-white block">{sub.studentName} ({sub.rollNumber})</span>
                          <span className="text-[10px] text-slate-400 font-mono">{sub.fileName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {sub.status === 'EVALUATED' ? (
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-400">
                              {sub.marksObtained} / {asg.maxMarks}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">Graded</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedSub({ ...sub, assignmentId: asg.id, maxMarks: asg.maxMarks });
                              setGradeMarks(asg.maxMarks * 0.9);
                            }}
                            className="py-1 px-3 rounded-lg bg-[#3B0A6B] hover:bg-[#5c14a3] text-white text-xs font-medium"
                          >
                            Evaluate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No submissions received yet for this assignment.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Create New Coursework Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <select
                  value={subjectCode}
                  onChange={e => setSubjectCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                >
                  <option value="CS501">CS501 - Design &amp; Analysis of Algorithms</option>
                  <option value="CS502">CS502 - Operating Systems</option>
                  <option value="CS503">CS503 - Database Management Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Inverted Page Table Simulation"
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Enter detailed problem specification and deliverable guidelines..."
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={e => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {submitting ? 'Creating...' : 'Publish to Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evaluation Drawer Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#2a1e45] pb-3">
              <h3 className="text-sm font-bold text-white">Evaluate Student Submission</h3>
              <button onClick={() => setSelectedSub(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-[#050505] rounded-xl border border-[#2a1e45] text-xs">
              <p className="font-bold text-white">{selectedSub.studentName} ({selectedSub.rollNumber})</p>
              <p className="text-slate-400 font-mono mt-1">File: {selectedSub.fileName}</p>
            </div>

            <form onSubmit={handleGradeSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Marks Awarded (out of {selectedSub.maxMarks})
                </label>
                <input
                  type="number"
                  required
                  max={selectedSub.maxMarks}
                  min={0}
                  value={gradeMarks}
                  onChange={e => setGradeMarks(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Faculty Feedback</label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  className="py-2 px-4 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={evaluating}
                  className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3]"
                >
                  {evaluating ? 'Grading...' : 'Save & Publish Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAssignmentsPage;

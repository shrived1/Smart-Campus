import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { 
  FileText, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload, 
  ArrowRight, 
  Download,
  GraduationCap
} from 'lucide-react';

export const AdmissionApplyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const trackParam = searchParams.get('track');

  const [activeTab, setActiveTab] = useState<'apply' | 'track'>(trackParam ? 'track' : 'apply');
  const [formData, setFormData] = useState({
    applicantName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dob: '2006-05-15',
    courseRequested: 'B.Tech Computer Science & AI',
    department: 'Computer Science & Engineering',
    previousSchool: '',
    previousQualification: 'High School Diploma (12th Grade)',
    marksPercentage: '92.5',
    documentFileName: 'Senior_Secondary_Transcripts.pdf'
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracking state
  const [trackRef, setTrackRef] = useState(trackParam || 'SC-ADM-2026-7842');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    if (trackParam) {
      handleTrackQuery(trackParam);
    }
  }, [trackParam]);

  const handleTrackQuery = async (ref: string) => {
    if (!ref.trim()) return;
    setTrackingLoading(true);
    setTrackError(null);
    try {
      const res = await api.trackApplication(ref);
      if (res.success) {
        setTrackingResult(res.application);
      }
    } catch (err: any) {
      setTrackError(err.message || 'No application found with this reference code.');
      setTrackingResult(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.applicantName || !formData.email || !formData.previousSchool) {
      setError('Please fill in all mandatory fields (Name, Email, Previous School).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitApplication({
        ...formData,
        marksPercentage: parseFloat(formData.marksPercentage),
        documents: [
          { name: formData.documentFileName, fileUrl: '#', verified: false }
        ]
      });

      if (res.success) {
        setSubmittedApp(res.application);
      }
    } catch (err: any) {
      setError(err.message || 'Application submission failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-[#00E5FF]/30">
      {/* Header */}
      <header className="h-16 border-b border-[#2a1e45] px-6 lg:px-12 flex items-center justify-between bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3B0A6B] to-[#00E5FF]/40 border border-[#00E5FF]/40 flex items-center justify-center">
            <span className="font-mono font-extrabold text-[#00E5FF] text-xs">SC</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            Smart<span className="text-[#00E5FF]">Campus</span> Admissions
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-xs text-slate-300 hover:text-white py-1.5 px-3 rounded-lg border border-[#2a1e45] hover:bg-[#141021]"
          >
            Staff Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2a1e45] mb-8">
          <button
            onClick={() => setActiveTab('apply')}
            className={`py-3 px-6 text-xs font-bold transition-all relative ${
              activeTab === 'apply'
                ? 'text-[#00E5FF] border-b-2 border-[#00E5FF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Start New Application
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`py-3 px-6 text-xs font-bold transition-all relative ${
              activeTab === 'track'
                ? 'text-[#00E5FF] border-b-2 border-[#00E5FF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Track Existing Application
          </button>
        </div>

        {activeTab === 'apply' ? (
          submittedApp ? (
            /* Success Acknowledgement Card */
            <div className="bg-[#141021] border border-[#3B0A6B] p-8 rounded-2xl shadow-2xl space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] mx-auto">
                <CheckCircle size={32} />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-[#00E5FF] tracking-widest block mb-1">
                  Application Successfully Lodged
                </span>
                <h2 className="text-2xl font-bold text-white">
                  Welcome to Apex Institute of Science &amp; Technology
                </h2>
                <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto">
                  Your academic application has been recorded in the central admissions queue. Save your application reference code to track admission committee decisions.
                </p>
              </div>

              <div className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] max-w-md mx-auto text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Reference Number:</span>
                  <span className="font-mono font-bold text-[#00E5FF] text-sm">{submittedApp.refNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Applicant:</span>
                  <span className="text-white font-medium">{submittedApp.applicantName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Program:</span>
                  <span className="text-slate-300">{submittedApp.courseRequested}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-400 font-mono font-medium">{submittedApp.status}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => {
                    setTrackRef(submittedApp.refNumber);
                    setActiveTab('track');
                    handleTrackQuery(submittedApp.refNumber);
                  }}
                  className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all"
                >
                  Track in Real-Time
                </button>
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-6 rounded-xl text-xs font-semibold text-slate-200 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] transition-all flex items-center gap-2"
                >
                  <Download size={14} />
                  Print Acknowledgement
                </button>
              </div>
            </div>
          ) : (
            /* Application Form */
            <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Undergraduate &amp; Engineering Application 2026-27</h2>
                <p className="text-xs text-slate-400">All fields marked with an asterisk are required for merit list ranking.</p>
              </div>

              {error && (
                <div className="p-3 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">1. Personal &amp; Contact Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.applicantName}
                        onChange={e => setFormData({ ...formData, applicantName: e.target.value })}
                        placeholder="e.g. Jordan Blake"
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="applicant@example.com"
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Qualifications */}
                <div className="pt-4 border-t border-[#2a1e45]">
                  <h3 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">2. Previous Academic Qualifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Previous School / College *</label>
                      <input
                        type="text"
                        required
                        value={formData.previousSchool}
                        onChange={e => setFormData({ ...formData, previousSchool: e.target.value })}
                        placeholder="e.g. Horizon High School"
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Marks / Percentile *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formData.marksPercentage}
                        onChange={e => setFormData({ ...formData, marksPercentage: e.target.value })}
                        placeholder="92.5"
                        className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Selection */}
                <div className="pt-4 border-t border-[#2a1e45]">
                  <h3 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">3. Course &amp; Department Preference</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select Academic Program *</label>
                    <select
                      value={formData.courseRequested}
                      onChange={e => setFormData({ ...formData, courseRequested: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                    >
                      <option value="B.Tech Computer Science & AI">B.Tech Computer Science &amp; Artificial Intelligence</option>
                      <option value="B.Tech Computer Science & Engineering">B.Tech Computer Science &amp; Engineering</option>
                      <option value="B.Tech Electronics & Communication">B.Tech Electronics &amp; Communication Engineering</option>
                      <option value="B.Tech Data Science & Analytics">B.Tech Data Science &amp; Analytics</option>
                      <option value="M.Tech Intelligent Systems">M.Tech Intelligent Autonomous Systems</option>
                    </select>
                  </div>
                </div>

                {/* Document Attachment */}
                <div className="pt-4 border-t border-[#2a1e45]">
                  <h3 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">4. Document Upload</h3>
                  <div className="p-4 bg-[#050505] border border-dashed border-[#2a1e45] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#3B0A6B]/30 border border-[#3B0A6B] flex items-center justify-center text-[#00E5FF]">
                        <Upload size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{formData.documentFileName}</p>
                        <span className="text-[10px] text-slate-400">PDF, PNG, or JPG (Max 10MB)</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#00E5FF]">Attached</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-6 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#3B0A6B] to-[#5c14a3] hover:from-[#4a0d85] hover:to-[#6d18c2] border border-[#5c14a3] shadow-[0_0_20px_rgba(59,10,107,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Application to Admissions Committee'}
                  <ArrowRight size={14} className="text-[#00E5FF]" />
                </button>
              </form>
            </div>
          )
        ) : (
          /* Application Tracker Tab */
          <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Track Application Status</h2>
              <p className="text-xs text-slate-400">Enter your application reference number (e.g., SC-ADM-2026-7842) to check verification progress.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={trackRef}
                onChange={e => setTrackRef(e.target.value)}
                placeholder="SC-ADM-2026-XXXX"
                className="flex-1 px-4 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-[#00E5FF]"
              />
              <button
                onClick={() => handleTrackQuery(trackRef)}
                disabled={trackingLoading}
                className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2"
              >
                <Search size={14} />
                Lookup
              </button>
            </div>

            {trackError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                {trackError}
              </div>
            )}

            {trackingResult && (
              <div className="p-6 bg-[#050505] border border-[#2a1e45] rounded-xl space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2a1e45] gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Application Reference</span>
                    <h3 className="text-base font-bold text-white font-mono text-[#00E5FF]">
                      {trackingResult.refNumber}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Status:</span>
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      trackingResult.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      trackingResult.status === 'UNDER_REVIEW' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                      trackingResult.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    }`}>
                      {trackingResult.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applicant Name:</span>
                    <span className="text-white font-semibold">{trackingResult.applicantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Requested Course:</span>
                    <span className="text-white font-semibold">{trackingResult.courseRequested}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Previous School:</span>
                    <span className="text-slate-300">{trackingResult.previousSchool}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Merit Percentage:</span>
                    <span className="text-slate-300 font-mono">{trackingResult.marksPercentage}%</span>
                  </div>
                </div>

                {trackingResult.reviewNotes && (
                  <div className="p-3 bg-[#141021] border border-[#3B0A6B]/50 rounded-lg text-xs">
                    <span className="font-semibold text-[#00E5FF] block mb-1">Admissions Committee Notes:</span>
                    <p className="text-slate-300">{trackingResult.reviewNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdmissionApplyPage;

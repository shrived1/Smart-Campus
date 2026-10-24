import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Settings, Save, CheckCircle2, Sliders, Shield } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  // Form fields
  const [collegeName, setCollegeName] = useState('');
  const [collegeShortCode, setCollegeShortCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [attendanceThreshold, setAttendanceThreshold] = useState(75);
  const [bleWindow, setBleWindow] = useState(300);

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.success && res.settings) {
        setSettings(res.settings);
        setCollegeName(res.settings.collegeName);
        setCollegeShortCode(res.settings.collegeShortCode);
        setAcademicYear(res.settings.academicYear);
        setAttendanceThreshold(res.settings.attendanceThresholdPercent);
        setBleWindow(res.settings.bleDetectionWindowSeconds);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSettings({
        collegeName,
        collegeShortCode,
        academicYear,
        attendanceThresholdPercent: Number(attendanceThreshold),
        bleDetectionWindowSeconds: Number(bleWindow)
      });
      if (res.success) {
        setSettings(res.settings);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[#00E5FF]" />
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional System Configuration</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Configure college branding, attendance thresholds, and BLE node parameters.</p>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          Configuration parameters updated and broadcast across all portals.
        </div>
      )}

      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-6">
        <div>
          <h2 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">1. University Branding</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official College Name</label>
              <input
                type="text"
                required
                value={collegeName}
                onChange={e => setCollegeName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Short Code</label>
              <input
                type="text"
                required
                value={collegeShortCode}
                onChange={e => setCollegeShortCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2a1e45]">
          <h2 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">2. Attendance &amp; BLE Telemetry Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mandatory Attendance Threshold (%)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={attendanceThreshold}
                onChange={e => setAttendanceThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-[#00E5FF] font-mono font-bold focus:outline-none focus:border-[#00E5FF]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 75%. Students falling below this receive automated warnings.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                BLE Beacon Deduplication Window (Seconds)
              </label>
              <input
                type="number"
                min={30}
                max={1800}
                value={bleWindow}
                onChange={e => setBleWindow(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Repeated scans within this window are safely deduplicated.</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2a1e45]">
          <h2 className="text-xs font-mono uppercase text-[#00E5FF] tracking-wider mb-3">3. Current Academic Session</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Active Academic Year</label>
            <input
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-2"
          >
            <Save size={14} />
            {saving ? 'Updating parameters...' : 'Save Institutional Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;

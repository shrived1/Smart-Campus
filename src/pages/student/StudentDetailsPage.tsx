import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { UserCheck, Shield, Phone, MapPin, Radio, CheckCircle2, Lock } from 'lucide-react';

export const StudentDetailsPage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bleMac, setBleMac] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    api.getStudentProfile().then(res => {
      if (res.success && res.profile) {
        setProfile(res.profile);
        setPhone(res.profile.phone);
        setAddress(res.profile.address);
        setBleMac(res.profile.bleMac);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await api.updateStudentContact({ phone, address, bleMac });
      if (res.success) {
        setProfile(res.profile);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading student directory profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Student Identity &amp; Academic Registry</h1>
          <p className="text-xs text-slate-400 mt-1">Official University Enrollment Record</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <Shield size={14} />
          <span>Active Enrollment</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Photo & Academic ID */}
        <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] text-center space-y-4">
          <img
            src={profile.photograph}
            alt={profile.name}
            className="w-32 h-32 rounded-2xl object-cover mx-auto border-2 border-[#00E5FF]/40 shadow-xl"
          />
          <div>
            <h2 className="text-base font-bold text-white">{profile.name}</h2>
            <p className="text-xs font-mono text-[#00E5FF] mt-0.5">{profile.rollNumber}</p>
            <span className="text-[11px] text-slate-400 font-mono block mt-1">ID: {profile.id}</span>
          </div>
          <div className="pt-4 border-t border-[#2a1e45] text-left text-xs space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Department</span>
              <span className="text-white font-medium">{profile.department}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Program</span>
              <span className="text-white font-medium">{profile.branch}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Academic Status</span>
              <span className="text-white font-medium">Year {profile.year} &bull; Semester {profile.semester} (Sec {profile.section})</span>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Details & Editable Contact Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Read-Only Official Information notice */}
          <div className="p-4 rounded-xl bg-[#050505] border border-[#2a1e45] flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Lock size={14} className="text-[#00E5FF]" />
              Official academic fields are locked to registrar staff.
            </span>
            <span className="text-[10px] font-mono text-[#00E5FF]">Reg. No. Verified</span>
          </div>

          <form onSubmit={handleSave} className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Student Contact &amp; Smart Attendance BLE MAC</h3>

            {savedNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} />
                Contact information updated successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Institutional Email</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-3.5 py-2.5 bg-[#050505]/50 border border-[#2a1e45] rounded-xl text-xs text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registered Smartphone BLE MAC Address (for Turnstile Scanner)
              </label>
              <input
                type="text"
                value={bleMac}
                onChange={e => setBleMac(e.target.value.toUpperCase())}
                placeholder="AA:BB:CC:11:22:33"
                className="w-full px-3.5 py-2.5 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-[#00E5FF] font-mono focus:outline-none focus:border-[#00E5FF]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                The ESP32 turnstile node identifies your phone through this Bluetooth beacon MAC.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all"
              >
                {saving ? 'Saving...' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsPage;

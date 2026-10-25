import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { QrCode, Download, ExternalLink, ShieldCheck, Copy, Check } from 'lucide-react';

export const AdminQRPage: React.FC = () => {
  const [activeType, setActiveType] = useState('ADMISSION');
  const [refVal, setRefVal] = useState('SC-ADM-2026-7842');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const workflows = [
    { id: 'ADMISSION', label: 'Public Admission Portal', defaultRef: 'SC-ADM-2026-7842', desc: 'Allows prospective applicants to start applications or lookup admission status directly on mobile.' },
    { id: 'LOGIN', label: 'Student Single Sign-On', defaultRef: '', desc: 'Direct secure link to the institutional login portal.' },
    { id: 'EVENT', label: 'HackCampus Registration', defaultRef: 'evt-01', desc: 'Direct registration link for HackCampus 2026 flagship hackathon.' },
    { id: 'DOCUMENT', label: 'Verifiable Credential Check', defaultRef: 'SHA256:d8a9f3e4b7c1265fae34', desc: 'Public cryptographic validation for issued diplomas and ID badges.' },
    { id: 'DEVICE', label: 'ESP32 Node Onboarding', defaultRef: 'ESP32-GATE-MAIN-01', desc: 'Secure heartbeat provisioning endpoint for registered edge gateways.' }
  ];

  const fetchQR = async (type: string, ref: string) => {
    setLoading(true);
    try {
      const res = await api.generateQR(type, ref);
      if (res.success) {
        setQrDataUrl(res.qrDataUrl);
        setTargetUrl(res.targetUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR(activeType, refVal);
  }, [activeType, refVal]);

  const handleSelectWorkflow = (wf: any) => {
    setActiveType(wf.id);
    setRefVal(wf.defaultRef);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `SmartCampus_QR_${activeType}.png`;
    a.click();
  };

  const handleCopyLink = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentWf = workflows.find(w => w.id === activeType);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-[#00E5FF]" />
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional QR Code Generation Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate verifiable, cryptographic workflow QR codes for admissions, credential validation, and device onboarding.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Workflow Selector */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
            Select Workflow Target
          </span>
          {workflows.map(wf => (
            <button
              key={wf.id}
              onClick={() => handleSelectWorkflow(wf)}
              className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                activeType === wf.id
                  ? 'bg-[#3B0A6B]/50 border-[#3B0A6B] text-white shadow-md'
                  : 'bg-[#141021] border-[#2a1e45] text-slate-300 hover:bg-[#1c162f]'
              }`}
            >
              <span className="font-bold block">{wf.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block line-clamp-1">{wf.desc}</span>
            </button>
          ))}
        </div>

        {/* Right 2 Cols: QR Preview & Download Panel */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">{currentWf?.label}</h3>
            <p className="text-xs text-slate-400 mt-1">{currentWf?.desc}</p>

            {currentWf?.defaultRef !== undefined && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reference Identifier / Target Parameter
                </label>
                <input
                  type="text"
                  value={refVal}
                  onChange={e => setRefVal(e.target.value)}
                  placeholder="Optional reference parameter..."
                  className="w-full px-3.5 py-2 bg-[#050505] border border-[#2a1e45] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[#050505] rounded-2xl border border-[#2a1e45]">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <div className="sc-qr-frame p-3 bg-[#050505] rounded-2xl border border-[#3B0A6B] shadow-[0_0_20px_rgba(59,10,107,0.3)] shrink-0">
                <img src={qrDataUrl} alt="Workflow QR" className="w-44 h-44 object-contain" />
              </div>
            ) : (
              <div className="text-xs text-rose-400">QR Generation failed</div>
            )}

            <div className="space-y-3 flex-1 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Target Encoded Destination</span>
                <span className="font-mono text-white text-xs break-all block mt-0.5">{targetUrl}</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>&bull; No raw authentication tokens or passwords exposed in QR payload.</p>
                <p>&bull; High error-correction level (M) for fast smartphone camera acquisition.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleDownload}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] transition-all flex items-center gap-1.5"
                >
                  <Download size={13} />
                  Download PNG
                </button>
                <button
                  onClick={handleCopyLink}
                  className="py-2 px-3 rounded-xl text-xs text-slate-300 bg-[#141021] hover:bg-[#1c162f] border border-[#2a1e45] flex items-center gap-1.5"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQRPage;

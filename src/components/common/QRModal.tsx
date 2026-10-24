import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { X, Download, ExternalLink, QrCode } from 'lucide-react';

interface QRModalProps {
  onClose: () => void;
  defaultType?: string;
  defaultRef?: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  onClose,
  defaultType = 'ADMISSION',
  defaultRef = '',
}) => {
  const [activeType, setActiveType] = useState<string>(defaultType);
  const [refVal, setRefVal] = useState<string>(defaultRef);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const qrTypes = [
    { id: 'ADMISSION', label: 'Admission Portal' },
    { id: 'LOGIN', label: 'Student Login' },
    { id: 'EVENT', label: 'Hackathon Event' },
    { id: 'DOCUMENT', label: 'Verify Credentials' },
    { id: 'DEVICE', label: 'ESP32 Provision' },
  ];

  const fetchQR = async (type: string, ref: string) => {
    setLoading(true);
    try {
      const res = await api.generateQR(type, ref);
      if (res.success) {
        setQrDataUrl(res.qrDataUrl);
        setTargetUrl(res.targetUrl);
      }
    } catch (err) {
      console.error('Failed to generate QR code', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR(activeType, refVal);
  }, [activeType, refVal]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `SmartCampus_QR_${activeType}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141021] border border-[#2a1e45] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a1e45] bg-[#0d0a14]">
          <div className="flex items-center gap-2">
            <QrCode className="text-[#00E5FF]" size={20} />
            <h3 className="text-sm font-bold text-white tracking-tight">Campus Verified QR Workflows</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Workflow Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-[#050505] p-1 rounded-xl border border-[#2a1e45]">
            {qrTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={`py-1.5 px-2 text-[11px] font-medium rounded-lg transition-all text-center truncate ${
                  activeType === t.id
                    ? 'bg-[#3B0A6B] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* QR Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#050505] rounded-xl border border-[#2a1e45]">
            {loading ? (
              <div className="w-56 h-56 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <div className="p-3 bg-[#050505] rounded-xl border border-[#3B0A6B] shadow-[0_0_20px_rgba(59,10,107,0.3)]">
                <img
                  src={qrDataUrl}
                  alt="Workflow QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            ) : (
              <div className="text-xs text-rose-400">Failed to render QR Code</div>
            )}

            <div className="mt-4 text-center">
              <span className="text-[11px] text-slate-400 font-mono block max-w-xs truncate">
                {targetUrl}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">
                Cryptographically signed for zero-trust campus identity verification.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-[#3B0A6B] hover:bg-[#5c14a3] text-white flex items-center justify-center gap-2 transition-all border border-[#5c14a3]"
            >
              <Download size={14} />
              Save QR Image
            </button>
            <a
              href={targetUrl}
              target="_blank"
              rel="noreferrer"
              className="py-2 px-4 rounded-xl text-xs font-semibold bg-[#141021] hover:bg-[#1c162f] text-slate-200 flex items-center justify-center gap-2 transition-all border border-[#2a1e45]"
            >
              <ExternalLink size={14} />
              Open Link
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRModal;

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { FileText, Award, Download, CheckCircle, ShieldCheck, ExternalLink } from 'lucide-react';

export const StudentDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStudentDocuments(),
      api.getStudentCertificates()
    ]).then(([docRes, certRes]) => {
      if (docRes.success) setDocuments(docRes.documents);
      if (certRes.success) setCertificates(certRes.certificates);
    }).finally(() => setLoading(false));
  }, []);

  const handleDownload = (name: string) => {
    // Generate simulated secure download
    const blob = new Blob([`Apex Institute of Science & Technology - Certified Document: ${name}\nVerification Hash Verified via SHA-256`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading verifiable documents...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">E-Documents &amp; Verified Certificates</h1>
          <p className="text-xs text-slate-400 mt-1">Tamper-evident credentials cryptographically hashed for institutional verification.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#00E5FF] font-mono">
          <ShieldCheck size={16} />
          <span>PKI Signatures Valid</span>
        </div>
      </div>

      {/* Official Institutional E-Documents */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText size={16} className="text-[#00E5FF]" />
          Official Academic Records &amp; ID Cards
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono uppercase text-[#00E5FF]">{doc.category}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Verified
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{doc.title}</h3>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  File: {doc.fileName} &bull; {doc.fileSize}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-2 truncate">
                  Hash: {doc.verificationHash}
                </span>
              </div>

              <div className="pt-2 border-t border-[#2a1e45] flex justify-between items-center text-xs">
                <span className="text-slate-400">Issued: {doc.issuedDate}</span>
                <button
                  onClick={() => handleDownload(doc.fileName)}
                  className="py-1.5 px-3 rounded-lg bg-[#3B0A6B] hover:bg-[#5c14a3] text-white flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* E-Certificates & Achievements */}
      <div className="space-y-4 pt-4 border-t border-[#2a1e45]">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Award size={16} className="text-[#00E5FF]" />
          E-Certificates, Hackathon Medals &amp; Honors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {certificates.map(cert => (
            <div
              key={cert.id}
              className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#3B0A6B]/50 text-[#00E5FF] border border-[#3B0A6B] inline-block mb-2">
                  {cert.badge}
                </span>
                <h3 className="text-xs font-bold text-white leading-snug">{cert.title}</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{cert.description}</p>
                <div className="mt-3 pt-2 border-t border-[#2a1e45] text-[10px] font-mono text-slate-400">
                  <span className="block text-slate-300">Issuer: {cert.issuer}</span>
                  <span className="text-[#00E5FF] block mt-0.5">ID: {cert.verificationId}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownload(`${cert.title}.pdf`)}
                className="w-full py-1.5 rounded-lg bg-[#050505] hover:bg-[#1c162f] text-slate-300 border border-[#2a1e45] text-xs flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                Download Certificate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDocumentsPage;

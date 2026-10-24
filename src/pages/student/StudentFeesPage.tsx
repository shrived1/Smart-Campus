import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { CreditCard, AlertCircle, CheckCircle2, Download, Receipt } from 'lucide-react';

export const StudentFeesPage: React.FC = () => {
  const [invoice, setInvoice] = useState<any>(null);
  const [gatewayStatus, setGatewayStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStudentFees().then(res => {
      if (res.success) {
        setInvoice(res.invoice);
        setGatewayStatus(res.paymentGatewayStatus);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading fee accounts ledger...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Institutional Fee Statement &amp; Invoices</h1>
          <p className="text-xs text-slate-400 mt-1">Official Student Bursar &amp; Accounts Ledger</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45] text-xs font-mono">
          Status: <span className="text-amber-400 font-bold">{invoice?.status || 'PARTIAL'}</span>
        </div>
      </div>

      {/* Payment Gateway Compliance Warning */}
      <div className="p-4 rounded-xl bg-[#0d0a14] border border-[#3B0A6B] flex items-start gap-3 text-xs">
        <AlertCircle size={18} className="text-[#00E5FF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white">Payment Gateway Integration Notice:</span>
          <p className="text-slate-400">
            {gatewayStatus?.notice || 'Direct simulated payments are strictly disabled per institutional compliance rules. Please remit pending balances via verified institutional bank wire or at the campus finance bursar counter.'}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Total Assessed Fees</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">${invoice?.totalFee ?? 6250}</div>
          <span className="text-[10px] text-slate-400 font-mono">Academic Year 2025-26</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Paid To Date</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">${invoice?.paidAmount ?? 5000}</div>
          <span className="text-[10px] text-slate-400 font-mono">Verified via ACH wire</span>
        </div>

        <div className="p-5 rounded-xl bg-[#141021] border border-[#2a1e45]">
          <span className="text-xs text-slate-400 font-medium">Pending Balance</span>
          <div className="text-2xl font-bold font-mono text-[#00E5FF] mt-1">${invoice?.pendingBalance ?? 1250}</div>
          <span className="text-[10px] text-amber-400 font-mono">Due: {invoice?.dueDate || '2026-11-30'}</span>
        </div>
      </div>

      {/* Fee Breakdown Card */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <h2 className="text-sm font-bold text-white">Semester 5 Fee Schedule Breakdown</h2>
        <div className="divide-y divide-[#2a1e45]/50 text-xs">
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-300">Tuition &amp; Academic Instruction Fee</span>
            <span className="font-mono text-white font-semibold">${invoice?.tuitionFee ?? 4800}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-300">Computer Science &amp; AI Lab Consumables</span>
            <span className="font-mono text-white font-semibold">${invoice?.labFee ?? 800}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-300">Central Digital Library &amp; Journal Subscriptions</span>
            <span className="font-mono text-white font-semibold">${invoice?.libraryFee ?? 350}</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-slate-300">Sports &amp; Student Wellness Board</span>
            <span className="font-mono text-white font-semibold">${invoice?.sportsFee ?? 300}</span>
          </div>
        </div>
      </div>

      {/* Transaction & Receipt History */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] space-y-4">
        <h2 className="text-sm font-bold text-white">Payment Receipts &amp; Transaction History</h2>
        <div className="space-y-3">
          {invoice?.payments?.map((pay: any) => (
            <div
              key={pay.id}
              className="p-4 bg-[#050505] rounded-xl border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div className="flex items-center gap-3">
                <Receipt className="text-[#00E5FF]" size={20} />
                <div className="text-xs">
                  <span className="font-mono font-bold text-white block">{pay.receiptNumber}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{pay.method} &bull; Ref: {pay.transactionRef}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <span className="text-xs font-mono font-bold text-emerald-400">+${pay.amount}</span>
                <button
                  onClick={() => window.print()}
                  className="py-1 px-3 rounded-lg bg-[#141021] hover:bg-[#1c162f] text-slate-300 border border-[#2a1e45] text-xs flex items-center gap-1.5"
                >
                  <Download size={12} />
                  Print Receipt
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentFeesPage;

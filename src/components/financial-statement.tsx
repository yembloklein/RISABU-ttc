"use client"

import React from 'react';
import { GraduationCap, Landmark, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface FinancialStatementProps {
  student: any;
  ledger: any[];
  stats: any;
}

export const FinancialStatement = React.forwardRef<HTMLDivElement, FinancialStatementProps>(({ student, ledger, stats }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div ref={ref} className="bg-white p-12 max-w-[850px] mx-auto text-slate-800 font-sans shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-slate-900">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
            <GraduationCap size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Risabu TTC</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Nairobi, Kenya • Financial Affairs</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-400">Fee Statement</h2>
          <p className="text-xs font-bold text-slate-900 uppercase">Generated: {today}</p>
        </div>
      </div>

      {/* Student Summary */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Student Account</p>
            <p className="text-lg font-bold text-slate-900">{student?.firstName} {student?.lastName}</p>
            <p className="text-sm font-semibold text-slate-600">ADM: {student?.admissionNumber || 'N/A'}</p>
            <p className="text-sm font-medium text-slate-500">{student?.appliedCourse}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Total Billed</p>
              <p className="text-lg font-black text-slate-900">KES {stats.totalInvoiced.toLocaleString()}</p>
           </div>
           <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-[9px] font-bold text-emerald-600 uppercase mb-1">Total Paid</p>
              <p className="text-lg font-black text-emerald-900">KES {stats.totalPaid.toLocaleString()}</p>
           </div>
           <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 col-span-2 flex justify-between items-center">
              <p className="text-[9px] font-bold text-rose-600 uppercase">Outstanding Balance</p>
              <p className="text-xl font-black text-rose-900">KES {stats.balance.toLocaleString()}</p>
           </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="mb-12">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Landmark size={14} /> Transaction History
        </h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 font-sans text-[10px] font-black uppercase text-slate-500 tracking-widest">
              <th className="p-3 pl-4 rounded-tl-lg">Date</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Debit</th>
              <th className="p-3 text-right pr-4 rounded-tr-lg">Credit</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {ledger.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="p-3 pl-4 font-medium text-slate-500">
                  {new Date(item.date).toLocaleDateString('en-GB')}
                </td>
                <td className="p-3 font-mono text-[11px] font-bold">
                  {item.transactionReference || item.invoiceNumber}
                </td>
                <td className="p-3 font-semibold text-slate-900">
                  {item.description || (item.ledgerType === 'invoice' ? 'Tuition Fee' : 'Payment')}
                </td>
                <td className="p-3 text-right text-rose-600 font-bold">
                  {item.ledgerType === 'invoice' ? `KES ${Number(item.amount).toLocaleString()}` : ''}
                </td>
                <td className="p-3 text-right text-emerald-600 font-bold pr-4">
                  {item.ledgerType === 'payment' ? `KES ${Number(item.amount).toLocaleString()}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-8 border-t border-slate-100 flex justify-between items-end">
        <div className="text-[10px] text-slate-400 font-medium italic">
          * This statement is an official record of all financial transactions with Risabu TTC. 
          For any discrepancies, please contact the finance office immediately.
        </div>
        <div className="text-right">
           <div className="h-12 w-48 border-b border-slate-900 mb-2" />
           <p className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Finance Director</p>
        </div>
      </div>
    </div>
  );
});

FinancialStatement.displayName = 'FinancialStatement';

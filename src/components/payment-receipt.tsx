"use client"

import React from 'react';
import { GraduationCap, ShieldCheck, CheckCircle2, MapPin, Phone } from 'lucide-react';

interface PaymentReceiptProps {
  student: any;
  payment: any;
}

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(({ student, payment }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div ref={ref} className="bg-white p-10 max-w-[600px] mx-auto text-slate-800 font-sans shadow-lg border border-slate-100 relative overflow-hidden">
      {/* Header with Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50" />
      
      <div className="flex justify-between items-start mb-8 relative">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-emerald-900 tracking-tight uppercase leading-none">Risabu TTC</h1>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Official Payment Receipt</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt No</p>
          <p className="text-sm font-black text-emerald-600">{payment.transactionReference || 'N/A'}</p>
        </div>
      </div>

      {/* Success Badge */}
      <div className="flex items-center gap-2 mb-8 bg-emerald-50 w-fit px-4 py-1.5 rounded-full border border-emerald-100">
        <CheckCircle2 size={16} className="text-emerald-600" />
        <span className="text-xs font-black text-emerald-800 uppercase tracking-tight">Payment Successful</span>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10 pb-8 border-b border-slate-100">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Student Details</p>
          <p className="text-sm font-bold text-slate-900">{student?.firstName} {student?.lastName}</p>
          <p className="text-[11px] text-slate-500 font-medium">ADM: {student?.admissionNumber || 'N/A'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
          <p className="text-sm font-bold text-slate-900">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : today}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Method</p>
          <p className="text-sm font-bold text-slate-900">{payment.paymentMethod || 'M-Pesa Online'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</p>
          <p className="text-sm font-bold text-slate-900">{payment.description || 'Fee Payment'}</p>
        </div>
      </div>

      {/* Amount Section */}
      <div className="bg-slate-900 rounded-2xl p-6 mb-8 flex justify-between items-center text-white shadow-xl shadow-slate-200">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Paid</p>
          <h2 className="text-3xl font-black tracking-tight">KES {Number(payment.amount).toLocaleString()}</h2>
        </div>
        <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={24} className="text-emerald-400" />
        </div>
      </div>

      {/* Footer Notice */}
      <div className="space-y-4">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
          This receipt is valid only for the transaction specified above. All payments are non-refundable. 
          Please keep this for your records.
        </p>
        
        <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            <p className="flex items-center gap-1"><MapPin size={10} /> Nairobi, Kenya</p>
            <p className="flex items-center gap-1"><Phone size={10} /> +254 700 000 000</p>
        </div>
      </div>
    </div>
  );
});

PaymentReceipt.displayName = 'PaymentReceipt';

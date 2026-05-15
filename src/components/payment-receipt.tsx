"use client"

import React from 'react';
import { ShieldCheck, CheckCircle2, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface PaymentReceiptProps {
  student: any;
  payment: any;
  templateImageUrl?: string;
}

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(({ student, payment, templateImageUrl }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const parsedPaymentDate = payment.paymentDate?.toDate 
    ? new Date(payment.paymentDate.toDate()).toLocaleDateString('en-GB')
    : payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-GB') : today;

  if (templateImageUrl) {
    return (
      <div ref={ref} className="relative w-[793px] h-[1122px] mx-auto bg-white overflow-hidden text-slate-900 font-sans print:m-0">
        <img 
          src={templateImageUrl} 
          alt="Official Template" 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          crossOrigin="anonymous"
        />
        
        <div className="absolute z-10 top-[28%] left-[12%] right-[12%] text-lg leading-relaxed text-slate-800">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="font-bold">Receipt No: {payment.transactionReference || 'N/A'}</p>
            </div>
            <div>
              <p className="font-bold">Date: {parsedPaymentDate}</p>
            </div>
          </div>
          
          <h2 className="font-black text-2xl mb-8 uppercase text-center underline underline-offset-4 decoration-2">Official Payment Receipt</h2>
          
          <div className="space-y-6">
            <div className="flex border-b border-slate-300 pb-2">
              <span className="w-1/3 font-bold text-slate-500 uppercase text-sm tracking-wider">Received From:</span>
              <span className="w-2/3 font-black text-slate-900">{student?.firstName} {student?.lastName} (ADM: {student?.admissionNumber || 'N/A'})</span>
            </div>
            
            <div className="flex border-b border-slate-300 pb-2">
              <span className="w-1/3 font-bold text-slate-500 uppercase text-sm tracking-wider">The Sum Of:</span>
              <span className="w-2/3 font-black text-slate-900">KES {Number(payment.amount).toLocaleString()}</span>
            </div>
            
            <div className="flex border-b border-slate-300 pb-2">
              <span className="w-1/3 font-bold text-slate-500 uppercase text-sm tracking-wider">Payment Method:</span>
              <span className="w-2/3 font-black text-slate-900">{payment.paymentMethod || 'M-Pesa Online'}</span>
            </div>

            <div className="flex border-b border-slate-300 pb-2">
              <span className="w-1/3 font-bold text-slate-500 uppercase text-sm tracking-wider">Description:</span>
              <span className="w-2/3 font-black text-slate-900">{payment.description || 'Fee Payment'}</span>
            </div>
          </div>

          <div className="mt-16 flex justify-between">
            <div className="text-center w-48">
              <div className="h-10 border-b border-slate-900 mb-2 relative">
                <span className="absolute bottom-1 left-2 font-cursive text-2xl text-emerald-800 opacity-40 select-none">Valid</span>
              </div>
              <p className="font-black text-sm uppercase tracking-widest text-emerald-900">Finance Officer</p>
            </div>
            <div className="text-center w-48 opacity-20 grayscale">
              <Logo size={64} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-10 max-w-[600px] mx-auto text-slate-800 font-sans shadow-lg border border-slate-100 relative overflow-hidden">
      {/* Header with Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 opacity-50" />
      
      <div className="flex justify-between items-start mb-8 relative">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <Logo size={48} />
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

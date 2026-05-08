"use client"

import React from 'react';
import { GraduationCap, MapPin, Phone, Mail, Globe } from 'lucide-react';

interface AdmissionLetterProps {
  student: any;
  program: any;
}

export const AdmissionLetter = React.forwardRef<HTMLDivElement, AdmissionLetterProps>(({ student, program }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div ref={ref} className="bg-white p-12 max-w-[800px] mx-auto text-slate-800 font-serif leading-relaxed shadow-lg border border-slate-100">
      {/* Letterhead */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-900 rounded-xl flex items-center justify-center text-white">
            <GraduationCap size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Risabu Technical</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Training College - Nairobi</p>
          </div>
        </div>
        <div className="text-right text-[10px] space-y-0.5 font-sans font-bold text-slate-500 uppercase">
          <p className="flex items-center justify-end gap-1"><MapPin size={10} /> P.O. Box 12345-00100, Nairobi, Kenya</p>
          <p className="flex items-center justify-end gap-1"><Phone size={10} /> +254 700 000 000</p>
          <p className="flex items-center justify-end gap-1"><Mail size={10} /> admissions@risabu.ac.ke</p>
          <p className="flex items-center justify-end gap-1"><Globe size={10} /> www.risabu.ac.ke</p>
        </div>
      </div>

      {/* Date and Ref */}
      <div className="flex justify-between mb-8 font-sans text-sm font-bold">
        <p>Ref: <span className="text-blue-600">{student.admissionNumber || 'RTTC/TEMP/' + student.id?.substring(0,4)}</span></p>
        <p>Date: {today}</p>
      </div>

      {/* Recipient */}
      <div className="mb-8">
        <p className="font-bold uppercase text-xs text-slate-400 mb-1">To:</p>
        <p className="text-lg font-bold text-slate-900">{student.firstName} {student.lastName}</p>
        <p className="text-sm">{student.contactEmail}</p>
        <p className="text-sm">{student.contactPhone}</p>
      </div>

      {/* Subject */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-black uppercase underline decoration-2 underline-offset-4 tracking-tight">Subject: Letter of Admission</h2>
      </div>

      {/* Content */}
      <div className="space-y-4 text-[15px]">
        <p>Dear <strong>{student.firstName}</strong>,</p>
        
        <p>
          We are pleased to inform you that you have been offered admission to <strong>Risabu Technical Training College</strong> to pursue a 
          <strong> {student.appliedCourse}</strong>.
        </p>

        <p>
          Your admission is based on the academic credentials provided during your application. You are expected to report to the college on 
          <strong> {student.admissionDate || today}</strong> for orientation and registration.
        </p>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 my-6">
          <h3 className="font-sans font-black uppercase text-xs tracking-widest text-slate-400 mb-4">Admission Details</h3>
          <div className="grid grid-cols-2 gap-y-3 font-sans text-sm">
            <p className="text-slate-500 font-bold uppercase text-[10px]">Admission Number:</p>
            <p className="font-bold text-slate-900">{student.admissionNumber || 'Pending Finalization'}</p>
            
            <p className="text-slate-500 font-bold uppercase text-[10px]">Department:</p>
            <p className="font-bold text-slate-900">{program?.department || 'Academic Affairs'}</p>
            
            <p className="text-slate-500 font-bold uppercase text-[10px]">Course Duration:</p>
            <p className="font-bold text-slate-900">{program?.duration || 'TBD'}</p>
            
            <p className="text-slate-500 font-bold uppercase text-[10px]">Reporting Date:</p>
            <p className="font-bold text-slate-900">{student.admissionDate}</p>
          </div>
        </div>

        <p>
          Please note that this offer is subject to the verification of your original certificates and payment of the required tuition fees 
          as per the attached fee structure. You are required to maintain high standards of discipline and academic performance throughout your stay.
        </p>

        <p>
          We look forward to welcoming you to our vibrant academic community and helping you achieve your professional goals.
        </p>
      </div>

      {/* Signature */}
      <div className="mt-16 flex flex-col items-start">
        <div className="border-b border-slate-900 w-48 mb-2 h-12 flex items-end">
           <span className="font-cursive italic text-2xl text-slate-400 opacity-50">Registrar</span>
        </div>
        <p className="font-black uppercase text-xs tracking-widest">Office of the Registrar</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase">Risabu Technical Training College</p>
      </div>

      {/* Footer Notice */}
      <div className="mt-12 pt-6 border-t border-slate-100 text-[10px] text-center text-slate-400 font-sans font-bold uppercase italic">
        This is a computer-generated document and does not require a physical signature.
      </div>
    </div>
  );
});

AdmissionLetter.displayName = 'AdmissionLetter';

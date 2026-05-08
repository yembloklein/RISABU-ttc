"use client"

import React from 'react';
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  User, 
  BookOpen, 
  ShieldCheck,
  Award
} from 'lucide-react';

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

  // Theme Color: Deep Emerald Green
  const themeGreen = "#059669";
  const lightGreen = "#ecfdf5";

  return (
    <div ref={ref} className="bg-white p-12 max-w-[850px] mx-auto text-slate-800 font-serif leading-relaxed shadow-2xl relative overflow-hidden">
      {/* Decorative Border */}
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-emerald-600" />
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10 pb-8 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
            <GraduationCap size={48} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase leading-none">Risabu Technical</h1>
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">Training College • Excellence</p>
          </div>
        </div>
        
        <div className="text-right space-y-1.5">
          <div className="flex items-center justify-end gap-2 text-[11px] font-sans font-bold text-slate-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Accredited Institution</span>
          </div>
          <div className="text-[10px] font-sans font-medium text-slate-400 leading-tight">
            <p className="flex items-center justify-end gap-1"><MapPin size={10} className="text-emerald-600" /> P.O. Box 12345-00100, Nairobi</p>
            <p className="flex items-center justify-end gap-1"><Phone size={10} className="text-emerald-600" /> +254 700 000 000</p>
            <p className="flex items-center justify-end gap-1"><Mail size={10} className="text-emerald-600" /> admissions@risabu.ac.ke</p>
          </div>
        </div>
      </div>

      {/* Title Card */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-emerald-600 font-sans font-black text-[10px] uppercase tracking-widest mb-1">Official Document</p>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Admission Notification</h2>
        </div>
        <div className="text-right font-sans">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Ref</p>
          <p className="text-sm font-black text-emerald-600">{student.admissionNumber || 'RTTC/ADM/TEMP'}</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-10">
        {/* Sidebar info */}
        <div className="col-span-4 space-y-6">
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
              <Award size={24} />
            </div>
            <h3 className="font-sans font-black text-emerald-900 text-xs uppercase tracking-wider mb-4 border-b border-emerald-200 pb-2">Student Profile</h3>
            <div className="space-y-4 font-sans">
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Full Name</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">National ID</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.nationalId || 'Verified'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Course Code</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{program?.code || 'REG-ICT-01'}</p>
              </div>
            </div>
          </div>

          <div className="px-6 space-y-4">
             <div className="flex items-center gap-3">
                <Calendar size={16} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Issue Date</p>
                  <p className="text-xs font-bold text-slate-700">{today}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Department</p>
                  <p className="text-xs font-bold text-slate-700">{program?.department || 'Main Campus'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Letter Body */}
        <div className="col-span-8 text-[15px] space-y-5 text-slate-700">
          <p className="font-bold text-slate-900">Dear {student.firstName},</p>
          
          <p>
            On behalf of the Board of Governors and the Academic Board, I am delighted to offer you admission to 
            <strong> Risabu Technical Training College</strong> for the 2026 Academic Year.
          </p>

          <p>
            You have been selected to pursue a <strong>{student.appliedCourse}</strong>. Your performance 
            and application demonstrated a commitment to excellence that aligns with our college values.
          </p>

          <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 italic text-sm">
            "Your journey to technical expertise and professional growth begins here. Welcome to the Risabu family."
          </div>

          <p>
            You are required to report for orientation and registration on <strong>{student.admissionDate || today}</strong>. 
            Please ensure you have your original academic certificates and the first semester fee receipt as per the fee structure provided.
          </p>

          <p>
            Congratulations on your admission, and we look forward to seeing you excel in your chosen field of study.
          </p>

          <div className="pt-10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-12 w-48 border-b border-slate-900 relative overflow-hidden">
                <span className="absolute bottom-1 left-2 font-cursive text-3xl text-emerald-800 opacity-40 select-none">Registrar</span>
              </div>
              <p className="text-[11px] font-black uppercase text-emerald-900 tracking-widest">Office of the Registrar</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Risabu Technical Training College</p>
            </div>
            
            <div className="h-20 w-20 opacity-10 grayscale">
               <GraduationCap size={80} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1 italic">
          <ShieldCheck size={12} className="text-emerald-400" />
          Verified Digital Document • ID: {student.id?.substring(0,12)}
        </p>
        <p className="text-[10px] font-sans font-black text-emerald-700 uppercase tracking-widest">
          Build Your Future
        </p>
      </div>
    </div>
  );
});

AdmissionLetter.displayName = 'AdmissionLetter';
